  
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
        name: new fields.StringField({ required: true, initial: "" }),
        description: new fields.HTMLField({ required: true, initial: "" }),
      }),
      {
        initial: foundry.utils.deepClone(
          defaultPreset.traits.map(trait => ({
            sort: trait.sort,
            key: trait.key ?? "",
            name: trait.key ? game.i18n.localize(`SYNTHICIDE.Item.Bioclass.Trait.${trait.key}.Name`) : "",
            description: trait.key ? game.i18n.localize(`SYNTHICIDE.Item.Bioclass.Trait.${trait.key}.Description`) : ""
          }))
        )
      }
    );

    // Bioclass slots
    schema.bodySlots = new fields.NumberField({ required: true, initial: defaultPreset.bodySlots });
    schema.brainSlots = new fields.NumberField({ required: true, initial: defaultPreset.brainSlots });


    return schema;
  }

  /**
   * Central method for bioclass application to actor.
   * Handles trait creation and attribute sync. UI should never call trait logic directly.
   * @this {SynthicideBioclass}
   * @param {Actor} [actor] - (Optional) The actor to apply bioclass traits and attributes to. Defaults to this.parent?.actor.
   */
  async applyBioclassToActor(actor) {
    // Use this.parent.actor for the owning actor
    const debugBioclass = Boolean(SYNTHICIDE.debug?.synthicideBioclass);
    const debugReport = [];
    const owningActor = actor ?? this.parent?.actor;
    if (this.parent?.type !== 'bioclass') return;
    const itemName = this.parent?.name ?? '(unnamed item)';
    if (!owningActor) {
      if (debugBioclass) {
        debugReport.push({
          stage: 'applyBioclassToActor',
          item: itemName,
          actor: null,
          message: 'No owning actor found, cannot apply bioclass.'
        });
        console.groupCollapsed(`[Synthicide] Bioclass apply: (no actor)`);
        console.table(debugReport);
        console.groupEnd();
      }
      return;
    }
    debugReport.push({
      stage: 'applyBioclassToActor',
      item: itemName,
      actor: owningActor?.name,
      message: 'Starting bioclass application.'
    });
    await this._createBioclassTraits(owningActor, debugReport);
    await this._syncBioclassAttributes(owningActor, debugReport);
    if (debugBioclass) {
      console.groupCollapsed(`[Synthicide] Bioclass apply: ${owningActor.name ?? '(unnamed actor)'}`);
      console.table(debugReport);
      console.groupEnd();
    }
  }

  /**
   * Create and embed trait items for this bioclass on the owning actor.
   * @this {SynthicideBioclass}
   * @param {Actor} owningActor - The actor to receive the bioclass traits.
   * @private
   */
  async _createBioclassTraits(owningActor) {
    // Accept debugReport array for consolidated reporting
    const debugBioclass = Boolean(SYNTHICIDE.debug?.synthicideBioclass);
    const itemName = this.parent?.name ?? '(unnamed item)';
    const traits = this.traits ?? [];
    if (Array.isArray(traits) && traits.length) {
      // Localize trait name/description on creation if key is present
      const traitDocs = traits.map(trait => {
        let name = trait.name;
        let description = trait.description;
        // If this trait has a key (from preset), localize
        if (trait.key) {
          name = game.i18n.localize(`SYNTHICIDE.Item.Bioclass.Trait.${trait.key}.Name`);
          description = game.i18n.localize(`SYNTHICIDE.Item.Bioclass.Trait.${trait.key}.Description`);
        }
        return {
          type: 'trait',
          name: name || 'Trait',
          system: {
            ...trait,
            name,
            description,
            traitType: 'bioclass',
            // level is intentionally left undefined
            bioClassLink: true // keep for backwards compatibility
          }
        };
      });
      await owningActor.createEmbeddedDocuments('Item', traitDocs);
      // no longer track associated ids explicitly
      if (debugBioclass && arguments.length > 1 && Array.isArray(arguments[1])) {
        arguments[1].push({
          stage: '_createBioclassTraits',
          item: itemName,
          actor: owningActor?.name,
          traits: traitDocs.map(t => t.name).join(', '),
          message: 'Traits created and associated.'
        });
      }
    } else {
      // no traits to create; nothing to track
      if (debugBioclass && arguments.length > 1 && Array.isArray(arguments[1])) {
        arguments[1].push({
          stage: '_createBioclassTraits',
          item: itemName,
          actor: owningActor?.name,
          traits: 'none',
          traitIds: '',
          message: 'No traits found.'
        });
      }
    }
  }

  /**
   * Synchronize the actor's base attributes to match this bioclass's starting attributes.
   * @this {SynthicideBioclass}
   * @param {Actor} owningActor - The actor whose attributes will be updated.
   * @private
   */
  async _syncBioclassAttributes(owningActor) {
    // Accept debugReport array for consolidated reporting
    const debugBioclass = Boolean(SYNTHICIDE.debug?.synthicideBioclass);
    const itemName = this.parent?.name ?? '(unnamed item)';
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
      if (debugBioclass && arguments.length > 1 && Array.isArray(arguments[1])) {
        arguments[1].push({
          stage: '_syncBioclassAttributes',
          item: itemName,
          actor: owningActor?.name,
          updates: JSON.stringify(updates),
          message: 'Actor updated with bioclass attributes.'
        });
      }
    }
  }

  /** 
  * @override
  * @this {SynthicideBioclass}
  */
  async _onCreate(data, options, userId) {
    // First allow the base model to handle creation for every client.
    super._onCreate(data, options, userId);

    // Only execute our custom bioclass logic on the originating client.
    if (game.userId !== userId) return;

    // Use this.parent.actor for the owning actor
    const owningActor = this.parent?.actor;
    if (!owningActor) {
      // Optionally keep a minimal warning for missing actor
      if (SYNTHICIDE.debug?.synthicideBioclass) console.warn('No parent actor found, cannot apply bioclass logic.');
    } else {
      try {
        await this.applyBioclassToActor();
      } catch (e) {
        if (SYNTHICIDE.debug?.synthicideBioclass) console.error('applyBioclassToActor error', e);
      }
    }
  }

  /**
   * @this {SynthicideBioclass}
   * Prepare derived data for bioclass item.
   * Sets localized labels and slot types for display and sheet use.
   */
  prepareDerivedData() {
    super.prepareDerivedData();
    const bioclassType = this.bioclassType ?? 'skinbag';
    const preset = SYNTHICIDE.getBioclassPreset(bioclassType);
    this.bodyType = `SYNTHICIDE.Item.BodyType.${preset.bodyType}`;
    this.brainType = `SYNTHICIDE.Item.BodyType.${preset.brainType}`;
    this.bioclassTypeLabel = `SYNTHICIDE.Item.Bioclass.${bioclassType.charAt(0).toUpperCase() + bioclassType.slice(1)}`;
    // Add more derived fields as needed for sheet display
  }

  /**
 * @override
 * @this {SynthicideBioclass}
 * Custom deletion logic for SynthicideBioclass.
 * IMPORTANT: Cleanup logic runs before super._onDelete.
 * @param {object} options - Deletion options
 * @param {string} userId - The user performing the deletion
 */
  async _onDelete(options, userId) {
    // Always run the base delete logic so Foundry clears the object everywhere.
    super._onDelete(options, userId);

    // Only perform our cleanup on the originating client.
    if (game.userId !== userId) return;
    const debugBioclass = Boolean(SYNTHICIDE.debug?.synthicideBioclass);

    // Clean up any bioclass trait items on the actor
    const owningActor = this.parent?.actor;
    if (!owningActor) return;
    const toDelete = owningActor.items
      .filter(i => i.type === 'trait' && i.system.traitType === 'bioclass')
      .map(i => i.id);
    if (toDelete.length > 0) {
      await owningActor.deleteEmbeddedDocuments('Item', toDelete);
      if (debugBioclass) {
        console.groupCollapsed(`[Synthicide] Bioclass traits deleted: ${this.parent.name}`);
        console.table(toDelete);
        console.groupEnd();
      }
    }
  }

  async _preUpdate(changes, options, user) {
    const allowed = await super._preUpdate?.(changes, options, user);
    if (allowed === false) return false;
    // Check if bioclassType is being changed
    if (changes.system?.bioclassType) {
      const newType = changes.system.bioclassType;
      const preset = SYNTHICIDE.getBioclassPreset(newType);
      changes.system.traits = preset.traits.map(trait => ({
        sort: trait.sort,
        key: trait.key ?? "",
        name: trait.key ? game.i18n.localize(`SYNTHICIDE.Item.Bioclass.Trait.${trait.key}.Name`) : "",
        description: trait.key ? game.i18n.localize(`SYNTHICIDE.Item.Bioclass.Trait.${trait.key}.Description`) : ""
      }));
    }
    return allowed;
  }
}
