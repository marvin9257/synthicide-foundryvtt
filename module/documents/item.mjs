import SYNTHICIDE from '../helpers/config.mjs';

/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class SynthicideItem extends Item {
    /**
     * Central method for bioclass application to actor.
     * Handles trait creation and attribute sync. UI should never call trait logic directly.
     * @param {Actor} actor - The actor to apply bioclass traits and attributes to.
     */
    async applyBioclassToActor(actor) {
      if (!(actor instanceof Actor)) return;
      // --- Bioclass trait creation ---
      const traits = this.system?.traits ?? [];
      if (Array.isArray(traits) && traits.length) {
        const traitDocs = traits.map(trait => ({
          type: 'trait',
          name: trait.name || 'Trait',
          system: { ...trait, bioClassLink: true }
        }));
        // Ensure bioClassLink is always true for bioclass traits
        traitDocs.forEach(doc => doc.system.bioClassLink = true);
        await actor.createEmbeddedDocuments('Item', traitDocs);
      }
      // --- Attribute sync ---
      const starting = this.system?.startingAttributes ?? {};
      const updates = {};
      const actorAttributes = actor.system?.attributes ?? {};
      for (const [key, value] of Object.entries(starting)) {
        const mappedKey =
          key in actorAttributes
            ? key
            : SYNTHICIDE.bioclassToActorAttributeMap?.[key];
        if (!mappedKey || !(mappedKey in actorAttributes)) continue;
        updates[`system.attributes.${mappedKey}.base`] = Number(value ?? 0);
      }
      if (Object.prototype.hasOwnProperty.call(starting, 'hp')) {
        updates['system.hitPoints.base'] = Number(starting.hp ?? 0);
      }
      if (Object.prototype.hasOwnProperty.call(starting, 'hpPerLevel')) {
        updates['system.hitPoints.perLevel'] = Number(starting.hpPerLevel ?? 0);
      }
      if (Object.keys(updates).length) await actor.update(updates);
    }
  /** @override */
  async _preCreate(data, options, user) {
    // Only allow one bioclass per actor. UI should warn if duplicate is attempted.
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;
    if (this.type !== 'bioclass') return;
    if (this.actor?.itemTypes.bioclass?.length) {
      if (game.userId === user) {
        ui.notifications.warn(
          game.i18n.localize('SYNTHICIDE.Actor.Bioclass.OnlyOneWarning')
        );
      }
      return false;
    }
    // Fill missing bioclass fields from preset
    const bioclassType =
      foundry.utils.getProperty(data, 'system.bioclassType') ??
      this.system.bioclassType ??
      'skinbag';
    const preset = SYNTHICIDE.getBioclassPreset(bioclassType);
    const updateData = {};
    if (!foundry.utils.hasProperty(data, 'system.bioclassType')) {
      updateData['system.bioclassType'] = bioclassType;
    }
    if (!foundry.utils.hasProperty(data, 'system.startingAttributes')) {
      updateData['system.startingAttributes'] = foundry.utils.deepClone(
        preset.startingAttributes
      );
    }
    if (!foundry.utils.hasProperty(data, 'system.bodySlots')) {
      updateData['system.bodySlots'] = preset.bodySlots;
    }
    if (!foundry.utils.hasProperty(data, 'system.brainSlots')) {
      updateData['system.brainSlots'] = preset.brainSlots;
    }
    if (!foundry.utils.hasProperty(data, 'system.traits')) {
      updateData['system.traits'] = foundry.utils.deepClone(preset.traits);
    }
    if (Object.keys(updateData).length > 0) {
      this.updateSource(updateData);
    }
  }

  /** @override */
  _onCreate(data, options, userId) {
    // Only apply bioclass traits if actor is clean (no other bioclass)
    super._onCreate(data, options, userId);
    if (this.type !== 'bioclass') return;
    if (userId !== game.userId) return;
    const bioclassCount = this.actor?.itemTypes?.bioclass?.length || 0;
    if (bioclassCount <= 1) {
      void this.applyBioclassToActor(this.actor);
    }
  }

  /** @override */
  _onUpdate(changed, options, userId) {
    // Re-apply bioclass traits if starting attributes or bioclass type change
    super._onUpdate(changed, options, userId);
    if (this.type !== 'bioclass') return;
    if (userId !== game.userId) return;
    const touchesStartingAttributes =
      foundry.utils.hasProperty(changed, 'system.startingAttributes') ||
      foundry.utils.hasProperty(changed, 'system.bioclassType');
    if (!touchesStartingAttributes) return;
    void this.applyBioclassToActor(this.actor);
  }

  /** @override */
  async _onDelete(options, userId) {
    // Remove bioclass-linked traits and re-apply if replacement bioclass exists
    super._onDelete(options, userId);
    if (this.type !== 'bioclass') return;
    if (userId !== game.userId) return;
    if (!(this.parent instanceof Actor)) return;
    // --- Remove bioclass-linked traits ---
    const bioclassTraits = this.parent.items.filter(i => i.type === 'trait' && i.system?.bioClassLink === true);
    const validTraitIds = bioclassTraits.map(i => i.id).filter(id => this.parent.items.has(id));
    if (validTraitIds.length) {
      await this.parent.deleteEmbeddedDocuments('Item', validTraitIds);
    }
    // --- Re-apply traits if replacement bioclass exists ---
    const replacement = this.parent.itemTypes.bioclass?.[0];
    if (replacement && typeof replacement.applyBioclassToActor === 'function') {
      void replacement.applyBioclassToActor(this.parent);
    }
  }

  /**
   * Sync actor base values from a bioclass item's starting attributes.
   * @param {Actor|null} actor
   * @param {Item} bioclassItem
   * @returns {Promise<void>}
   * @private
   */
  async _syncActorFromBioclass() {
    // Deprecated: use applyBioclassToActor instead
    return;
  }

  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    // As with the actor class, items are documents that can have their data
    // preparation methods overridden (such as prepareBaseData()).
    super.prepareData();
  }

  /**
   * Prepare a data object which defines the data schema used by dice roll commands against this Item
   * @override
   */
  getRollData() {
    // Starts off by populating the roll data with a shallow copy of `this.system`
    const rollData = { ...this.system };

    // Quit early if there's no parent actor
    if (!this.actor) return rollData;

    // If present, add the actor's roll data
    rollData.actor = this.actor.getRollData();

    return rollData;
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  async roll(_event) {
    const item = this;

    // Initialize chat data.
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const rollMode = game.settings.get('core', 'rollMode');
    const label = `[${item.type}] ${item.name}`;

    // If there's no roll data, send a chat message.
    if (!this.system.formula) {
      ChatMessage.create({
        speaker: speaker,
        rollMode: rollMode,
        flavor: label,
        content: item.system.description ?? '',
      });
    }
    // Otherwise, create a roll and send a chat message from it.
    else {
      // Retrieve roll data.
      const rollData = this.getRollData();

      // Invoke the roll and submit it to chat.
      const roll = new Roll(rollData.formula, rollData.actor);
      // If you need to store the value first, uncomment the next line.
      // const result = await roll.evaluate();
      roll.toMessage({
        speaker: speaker,
        rollMode: rollMode,
        flavor: label,
      });
      return roll;
    }
  }
}
