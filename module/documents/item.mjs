import SYNTHICIDE from '../helpers/config.mjs';

/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class SynthicideItem extends Item {
    /**
     * Central method for item application to actor.
     * Bioclass logic is handled in SynthicideBioclass via typeClasses.
     * @param {Actor} actor - The actor to apply item effects to.
     */
    async applyBioclassToActor(_actor) {
      // No-op for base item. Bioclass logic is in SynthicideBioclass.
    }
  /** @override */
  async _preCreate(data, options, user) {
    // Only allow one bioclass per actor. UI should warn if duplicate is attempted.
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;
    if (this.type !== 'bioclass') return;
    // If a bioclass already exists, delete it before allowing the new one
    if (this.actor?.itemTypes.bioclass?.length) {
      const existing = this.actor.itemTypes.bioclass[0];
      if (existing && existing.id !== this.id) {
        await existing.delete();
        console.log('Deleted existing bioclass to allow replacement:', existing);
      }
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
      // --- Bioclass trait creation (persisted) ---
      const traits = data.system?.traits ?? [];
      if (Array.isArray(traits) && traits.length && this.actor) {
        const traitItems = traits.map(trait => ({
          name: trait.name || 'Trait',
          type: 'trait',
          system: { ...trait, bioClassLink: true }
        }));
        await this.actor.createEmbeddedDocuments('Item', traitItems);
        console.log('Bioclass: Traits created via createEmbeddedDocuments', traits);
      }
      // --- Attribute sync (bulk update) ---
      const starting = data.system?.startingAttributes ?? {};
      const actorAttributes = this.actor?.system?.attributes ?? {};
      const updates = Object.entries(starting).reduce((acc, [key, value]) => {
        const mappedKey = key in actorAttributes ? key : SYNTHICIDE.bioclassToActorAttributeMap?.[key];
        if (!mappedKey || !(mappedKey in actorAttributes)) return acc;
        acc[`system.attributes.${mappedKey}.base`] = Number(value ?? 0);
        return acc;
      }, {});
      if ('hp' in starting) updates['system.hitPoints.base'] = Number(starting.hp ?? 0);
      if ('hpPerLevel' in starting) updates['system.hitPoints.perLevel'] = Number(starting.hpPerLevel ?? 0);
      if (Object.keys(updates).length && this.actor) {
        await this.actor.update(updates);
        console.log('Bioclass: Actor updated with', updates);
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
    if (bioclassTraits.length) {
      // Only delete traits that still exist in the collection
      const existingTraitIds = bioclassTraits
        .map(t => t.id)
        .filter(id => this.parent.items.has(id));
      if (existingTraitIds.length) {
        await this.parent.deleteEmbeddedDocuments('Item', existingTraitIds);
        console.log('Bioclass: Traits removed via deleteEmbeddedDocuments', existingTraitIds);
      }
    }
    // --- Re-apply traits if replacement bioclass exists ---
    const replacement = this.parent.itemTypes.bioclass?.[0];
    if (replacement && typeof replacement.applyBioclassToActor === 'function') {
      void replacement.applyBioclassToActor(this.parent);
    }
  }

  /** @override */
  async _preUpdate(changed, options, user) {
    await super._preUpdate(changed, options, user);
    if (this.type !== 'bioclass') return;
    // If bioclass traits or starting attributes change, sync actor
    const touchesTraits = foundry.utils.hasProperty(changed, 'system.traits');
    const touchesStartingAttributes = foundry.utils.hasProperty(changed, 'system.startingAttributes');
    if (touchesTraits && this.actor) {
      // Remove old traits
      const bioclassTraits = this.actor.items.filter(i => i.type === 'trait' && i.system?.bioClassLink === true);
      const traitIds = bioclassTraits.map(t => t.id).filter(id => this.actor.items.has(id));
      if (traitIds.length) {
        await this.actor.deleteEmbeddedDocuments('Item', traitIds);
        console.log('Bioclass: Old traits removed via deleteEmbeddedDocuments', traitIds);
      }
      // Add new traits
      const newTraits = changed.system?.traits ?? [];
      if (Array.isArray(newTraits) && newTraits.length) {
        const traitItems = newTraits.map(trait => ({
          name: trait.name || 'Trait',
          type: 'trait',
          system: { ...trait, bioClassLink: true }
        }));
        await this.actor.createEmbeddedDocuments('Item', traitItems);
        console.log('Bioclass: New traits created via createEmbeddedDocuments', newTraits);
      }
    }
    if (touchesStartingAttributes && this.actor) {
      const starting = changed.system?.startingAttributes ?? {};
      const actorAttributes = this.actor.system?.attributes ?? {};
      const updates = Object.entries(starting).reduce((acc, [key, value]) => {
        const mappedKey = key in actorAttributes ? key : SYNTHICIDE.bioclassToActorAttributeMap?.[key];
        if (!mappedKey || !(mappedKey in actorAttributes)) return acc;
        acc[`system.attributes.${mappedKey}.base`] = Number(value ?? 0);
        return acc;
      }, {});
      if ('hp' in starting) updates['system.hitPoints.base'] = Number(starting.hp ?? 0);
      if ('hpPerLevel' in starting) updates['system.hitPoints.perLevel'] = Number(starting.hpPerLevel ?? 0);
      if (Object.keys(updates).length) {
        await this.actor.update(updates);
        console.log('Bioclass: Actor updated with', updates);
      }
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
