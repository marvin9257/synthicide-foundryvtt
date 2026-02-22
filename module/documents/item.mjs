import SYNTHICIDE from '../helpers/config.mjs';

/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class SynthicideItem extends Item {
  /** @override */
  async _preCreate(data, options, user) {
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
    super._onCreate(data, options, userId);
    if (this.type !== 'bioclass') return;
    if (userId !== game.userId) return;
    void this._syncActorFromBioclass(this.actor, this);
  }

  /** @override */
  _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);
    if (this.type !== 'bioclass') return;
    if (userId !== game.userId) return;

    const touchesStartingAttributes =
      foundry.utils.hasProperty(changed, 'system.startingAttributes') ||
      foundry.utils.hasProperty(changed, 'system.bioclassType');
    if (!touchesStartingAttributes) return;

    void this._syncActorFromBioclass(this.actor, this);
  }

  /** @override */
  _onDelete(options, userId) {
    super._onDelete(options, userId);
    if (this.type !== 'bioclass') return;
    if (userId !== game.userId) return;
    if (!(this.parent instanceof Actor)) return;

    // If a replacement bioclass exists (direct API usage), sync from that.
    const replacement = this.parent.itemTypes.bioclass?.[0];
    if (!replacement) return;
    void this._syncActorFromBioclass(this.parent, replacement);
  }

  /**
   * Sync actor base values from a bioclass item's starting attributes.
   * @param {Actor|null} actor
   * @param {Item} bioclassItem
   * @returns {Promise<void>}
   * @private
   */
  async _syncActorFromBioclass(actor, bioclassItem) {
    if (!(actor instanceof Actor)) return;
    if (!bioclassItem || bioclassItem.type !== 'bioclass') return;

    // 1. Sync base attributes and HP
    const starting = bioclassItem.system?.startingAttributes ?? {};
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

    // 2. Remove all existing trait items
    const traitItems = actor.items.filter(i => i.type === 'trait');
    if (traitItems.length) {
      await actor.deleteEmbeddedDocuments('Item', traitItems.map(i => i.id));
    }

    // 3. Create new trait items from bioclass's system.traits array
    const bioclassTraits = bioclassItem.system?.traits ?? [];
    if (Array.isArray(bioclassTraits) && bioclassTraits.length) {
      const traitDocs = bioclassTraits.map(trait => ({
        type: 'trait',
        name: trait.name || 'Trait',
        system: {
          description: trait.description || '',
          ...trait
        }
      }));
      await actor.createEmbeddedDocuments('Item', traitDocs);
    }
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
