  
import SynthicideItemBase from './base-item.mjs';
import SYNTHICIDE from '../helpers/config.mjs';

export default class SynthicideBioclass extends SynthicideItemBase {
  static LOCALIZATION_PREFIXES = [
    'SYNTHICIDE.Item.base',
    'SYNTHICIDE.Item.Bioclass',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();
    const defaultPreset = SYNTHICIDE.getBioclassPreset('skinbag');

    // Bioclass type: Skinbag, Scraphead, Hardshell, Rigfiend
    schema.bioclassType = new fields.StringField({
      required: true,
      choices: SYNTHICIDE.bioclassTypes,
      initial: 'skinbag',
    });

    // Starting attributes
    schema.startingAttributes = new fields.SchemaField({
      actions: new fields.NumberField({ required: true, initial: defaultPreset.startingAttributes.actions }),
      awareness: new fields.NumberField({ required: true, initial: defaultPreset.startingAttributes.awareness }),
      combat: new fields.NumberField({ required: true, initial: defaultPreset.startingAttributes.combat }),
      nerve: new fields.NumberField({ required: true, initial: defaultPreset.startingAttributes.nerve }),
      speed: new fields.NumberField({ required: true, initial: defaultPreset.startingAttributes.speed }),
      toughness: new fields.NumberField({ required: true, initial: defaultPreset.startingAttributes.toughness }),
      will: new fields.NumberField({ required: true, initial: defaultPreset.startingAttributes.will }),
      hp: new fields.NumberField({ required: true, initial: defaultPreset.startingAttributes.hp }),
      hpPerLevel: new fields.NumberField({ required: true, initial: defaultPreset.startingAttributes.hpPerLevel }),
    });

    // Bioclass traits
    schema.traits = new fields.ArrayField(
      new fields.SchemaField({
        sort: new fields.NumberField({ required: true, integer: true, initial: 0 }),
        name: new fields.StringField({ required: true }),
        description: new fields.HTMLField({ required: true }),
      }),
      { initial: foundry.utils.deepClone(defaultPreset.traits) }
    );

    // Bioclass slots
    schema.bodySlots = new fields.NumberField({ required: true, initial: defaultPreset.bodySlots });
    schema.brainSlots = new fields.NumberField({ required: true, initial: defaultPreset.brainSlots });

    // Associated trait IDs (bioclass-linked traits)
    schema.associatedTraitIds = new fields.ArrayField(new fields.StringField(), { initial: [] });

    return schema;
  }

  /**
   * Central method for bioclass application to actor.
   * Handles trait creation and attribute sync. UI should never call trait logic directly.
   * @param {Actor} [actor] - (Optional) The actor to apply bioclass traits and attributes to. Defaults to this.parent?.actor.
   */
  async applyBioclassToActor(actor) {
    // Use this.parent.actor for the owning actor
    const owningActor = actor ?? this.parent?.actor;
    if (this.parent?.type !== 'bioclass') return;
    console.log('SynthicideBioclass.applyBioclassToActor called', this, owningActor);
    if (!owningActor) return;

    await this._createBioclassTraits(owningActor);
    await this._syncBioclassAttributes(owningActor);
  }

  /**
   * Create and embed trait items for this bioclass on the owning actor.
   * Updates associatedTraitIds for future cleanup.
   * @param {Actor} owningActor - The actor to receive the bioclass traits.
   * @private
   */
  async _createBioclassTraits(owningActor) {
    const traits = this.traits ?? [];
    if (Array.isArray(traits) && traits.length) {
      const traitDocs = traits.map(trait => ({
        type: 'trait',
        name: trait.name || 'Trait',
        system: { ...trait, bioClassLink: true }
      }));
      const created = await owningActor.createEmbeddedDocuments('Item', traitDocs);
      const createdTraitIds = Array.isArray(created) ? created.map(t => t.id) : [];
      // Store new associated trait IDs for future deletion
      if (this.parent && typeof this.parent.update === 'function') {
        await this.parent.update({ 'system.associatedTraitIds': createdTraitIds });
      }
      this.associatedTraitIds = createdTraitIds;
      console.log('SynthicideBioclass: Traits created', traitDocs, 'IDs:', createdTraitIds);
    } else {
      // If no traits, clear associatedTraitIds
      if (this.parent && typeof this.parent.update === 'function') {
        await this.parent.update({ 'system.associatedTraitIds': [] });
      }
      this.associatedTraitIds = [];
    }
  }

  /**
   * Synchronize the actor's base attributes to match this bioclass's starting attributes.
   * @param {Actor} owningActor - The actor whose attributes will be updated.
   * @private
   */
  async _syncBioclassAttributes(owningActor) {
    const starting = this.startingAttributes ?? {};
    const updates = {};
    const actorAttributes = owningActor.system?.attributes ?? {};
    for (const [key, value] of Object.entries(starting)) {
      const mappedKey = key in actorAttributes ? key : SYNTHICIDE.bioclassToActorAttributeMap?.[key];
      if (!mappedKey || !(mappedKey in actorAttributes)) continue;
      updates[`system.attributes.${mappedKey}.base`] = Number(value ?? 0);
    }
    if (foundry.utils.hasProperty(starting, 'hp')) {
      updates['system.hitPoints.base'] = Number(starting.hp ?? 0);
    }
    if (foundry.utils.hasProperty(starting, 'hpPerLevel')) {
      updates['system.hitPoints.perLevel'] = Number(starting.hpPerLevel ?? 0);
    }
    if (Object.keys(updates).length) {
      await owningActor.update(updates);
      console.log('SynthicideBioclass: Actor updated with', updates);
    }
  }

  /** @override */
  async _onCreate(data, options, userId) {
    if (game.userId !== userId) return;
    console.log('SynthicideBioclass._onCreate called', this, data, options, userId);
    // Use this.parent.actor for the owning actor
    const owningActor = this.parent?.actor;
    if (!owningActor) {
      console.warn('SynthicideBioclass._onCreate: No parent actor found, cannot apply bioclass logic.');
    } else {
      console.log('SynthicideBioclass._onCreate: about to call applyBioclassToActor (immediate)', owningActor, this);
      try {
        await this.applyBioclassToActor();
        console.log('SynthicideBioclass._onCreate: applyBioclassToActor finished');
      } catch (e) {
        console.error('SynthicideBioclass._onCreate: applyBioclassToActor error', e);
      }
    }
    try {
      await super._onCreate(data, options, userId);
    } catch (e) {
      console.error('SynthicideBioclass._onCreate: super._onCreate error', e);
    }
  }

  /**
   * Prepare derived data for bioclass item.
   * Sets localized labels and slot types for display and sheet use.
   */
  prepareDerivedData() {
    super.prepareDerivedData && super.prepareDerivedData();
    const bioclassType = this.bioclassType ?? 'skinbag';
    const preset = SYNTHICIDE.getBioclassPreset(bioclassType);
    const bodyTypeKey = preset.bodyType;
    const brainTypeKey = preset.brainType;
    this.bodyType = game.i18n.localize(`SYNTHICIDE.Item.BodyType.${bodyTypeKey}`);
    this.brainType = game.i18n.localize(`SYNTHICIDE.Item.BodyType.${brainTypeKey}`);
    this.bioclassTypeLabel = game.i18n.localize(`SYNTHICIDE.Item.Bioclass.${bioclassType.charAt(0).toUpperCase() + bioclassType.slice(1)}`);
    // Add more derived fields as needed for sheet display
  }

  /** @override */
  async _onDelete(options, userId) {
    if (game.userId !== userId) return;
    // Clean up associated trait items when this bioclass is deleted
    const owningActor = this.parent?.actor;
    if (!owningActor) return;
      const associatedIds = Array.isArray(this.associatedTraitIds) ? this.associatedTraitIds : [];
    if (associatedIds.length > 0) {
      // Only delete traits that still exist in the collection
      const toDelete = associatedIds.filter(id => owningActor.items.has(id));
      if (toDelete.length > 0) {
        await owningActor.deleteEmbeddedDocuments('Item', toDelete);
        console.log('SynthicideBioclass: Associated traits deleted on bioclass delete', toDelete);
      }
    }
    // Call parent delete logic
    if (super._onDelete) await super._onDelete(options, userId);
  }
}
