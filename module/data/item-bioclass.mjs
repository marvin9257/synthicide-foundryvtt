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
   * @param {Actor} actor - The actor to apply bioclass traits and attributes to.
   */
  async applyBioclassToActor(actor) {
    console.log('SynthicideBioclass.applyBioclassToActor called', this, actor);
    if (!(actor instanceof Actor)) return;
    // --- Bioclass trait creation ---
    if (this.type === 'bioclass') {
      const traits = this.system?.traits ?? [];
      if (Array.isArray(traits) && traits.length) {
        const traitDocs = traits.map(trait => ({
          type: 'trait',
          name: trait.name || 'Trait',
          system: { ...trait, bioClassLink: true }
        }));
        traitDocs.forEach(doc => doc.system.bioClassLink = true);
        await actor.createEmbeddedDocuments('Item', traitDocs);
        console.log('SynthicideBioclass: Traits created', traitDocs);
      }
      // --- Attribute sync ---
      const starting = this.system?.startingAttributes ?? {};
      const updates = {};
      const actorAttributes = actor.system?.attributes ?? {};
      for (const [key, value] of Object.entries(starting)) {
        const mappedKey = key in actorAttributes ? key : SYNTHICIDE.bioclassToActorAttributeMap?.[key];
        if (!mappedKey || !(mappedKey in actorAttributes)) continue;
        updates[`system.attributes.${mappedKey}.base`] = Number(value ?? 0);
      }
      if (Object.prototype.hasOwnProperty.call(starting, 'hp')) {
        updates['system.hitPoints.base'] = Number(starting.hp ?? 0);
      }
      if (Object.prototype.hasOwnProperty.call(starting, 'hpPerLevel')) {
        updates['system.hitPoints.perLevel'] = Number(starting.hpPerLevel ?? 0);
      }
      if (Object.keys(updates).length) {
        await actor.update(updates);
        console.log('SynthicideBioclass: Actor updated with', updates);
      }
    }
  }

  /** @override */
  async _onCreate(data, options, userId) {
    console.log('SynthicideBioclass._onCreate called', this, data, options, userId);
    // Bioclass logic must run before super._onCreate, or the item may be invalidated
    // Debug: check prototype and method existence
    console.log('SynthicideBioclass._onCreate prototype:', Object.getPrototypeOf(this));
    console.log('SynthicideBioclass._onCreate typeof applyBioclassToActor:', typeof this.applyBioclassToActor);
    if (!this.actor) {
      console.warn('SynthicideBioclass._onCreate: actor not ready, delaying trait/attribute update');
      setTimeout(async () => {
        if (this.actor) {
          console.log('SynthicideBioclass._onCreate (delayed): about to call applyBioclassToActor', this.actor, this);
          try {
            await this.applyBioclassToActor(this.actor);
            console.log('SynthicideBioclass._onCreate (delayed): applyBioclassToActor finished');
          } catch (e) {
            console.error('SynthicideBioclass._onCreate (delayed): applyBioclassToActor error', e);
          }
        } else {
          console.warn('SynthicideBioclass._onCreate (delayed): this.actor still not set');
        }
      }, 100);
    } else {
      console.log('SynthicideBioclass._onCreate: about to call applyBioclassToActor (immediate)', this.actor, this);
      try {
        await this.applyBioclassToActor(this.actor);
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
    if (this.type !== 'bioclass') return;
    if (!this.actor) {
      console.warn('SynthicideBioclass._onCreate: actor not ready, delaying trait/attribute update');
      setTimeout(async () => {
        if (this.actor) {
          console.log('SynthicideBioclass._onCreate (delayed): about to call applyBioclassToActor', this.actor, this);
          try {
            await this.applyBioclassToActor(this.actor);
            console.log('SynthicideBioclass._onCreate (delayed): applyBioclassToActor finished');
          } catch (e) {
            console.error('SynthicideBioclass._onCreate (delayed): applyBioclassToActor error', e);
          }
        } else {
          console.warn('SynthicideBioclass._onCreate (delayed): this.actor still not set');
        }
      }, 100);
    } else {
      console.log('SynthicideBioclass._onCreate: about to call applyBioclassToActor (immediate)', this.actor, this);
      try {
        await this.applyBioclassToActor(this.actor);
        console.log('SynthicideBioclass._onCreate: applyBioclassToActor finished');
      } catch (e) {
        console.error('SynthicideBioclass._onCreate: applyBioclassToActor error', e);
      }
    }
  }

  /**
   * Prepare derived data for bioclass item.
   * Sets localized labels and slot types for display and sheet use.
   */
  prepareDerivedData() {
    super.prepareDerivedData && super.prepareDerivedData();
    const bioclassType = this.system?.bioclassType ?? 'skinbag';
    const preset = SYNTHICIDE.getBioclassPreset(bioclassType);
    const bodyTypeKey = preset.bodyType;
    const brainTypeKey = preset.brainType;
    this.bodyType = game.i18n.localize(`SYNTHICIDE.Item.BodyType.${bodyTypeKey}`);
    this.brainType = game.i18n.localize(`SYNTHICIDE.Item.BodyType.${brainTypeKey}`);
    this.bioclassTypeLabel = game.i18n.localize(`SYNTHICIDE.Item.Bioclass.${bioclassType.charAt(0).toUpperCase() + bioclassType.slice(1)}`);
    // Add more derived fields as needed for sheet display
  }
}
