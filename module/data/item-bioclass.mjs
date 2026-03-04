import SynthicideFeature from './item-feature.mjs';
import SYNTHICIDE from '../helpers/config.mjs';

/**
 * Bioclass feature system model.
 *
 * DataModel context: instance methods execute on the bioclass system model
 * (`item.system`), not on the Item document.
 *
 * @extends {SynthicideFeature}
 */
export default class SynthicideBioclass extends SynthicideFeature {
  static LOCALIZATION_PREFIXES = [
    'SYNTHICIDE.Item.base',
    'SYNTHICIDE.Item.Bioclass',
  ];

  static defineSchema() {
    const { fields } = foundry.data;
    const schema = super.defineSchema();

    schema.featureType = new fields.StringField({
      required: true,
      choices: ['bioclass'],
      initial: 'bioclass'
    });


    schema.bodySlots = new fields.NumberField({ required: true, initial: 0 });
    schema.brainSlots = new fields.NumberField({ required: true, initial: 0 });
    schema.bodyType = new fields.StringField({ required: true, initial: 'Organic' });
    schema.brainType = new fields.StringField({ required: true, initial: 'Organic' });

    // Add startingAttributes for manual entry, using config for core attributes
    const attrFields = {};
    for (const key of Object.keys(SYNTHICIDE.attributes)) {
      attrFields[key] = new fields.NumberField({ required: true, initial: 0 });
    }
    attrFields.hp = new fields.NumberField({ required: true, initial: 0 });
    attrFields.hpPerLevel = new fields.NumberField({ required: true, initial: 0 });
    schema.startingAttributes = new fields.SchemaField(attrFields);

    return schema;
  }

  /**
   * A small _preUpdate stub if needed
   *
    * @this {SynthicideBioclass}
    * @param {object} changes
    * @param {object} options
    * @param {string} user
    * @returns {Promise<boolean|void>}
   * @override
   */
  async _preUpdate(changes, options, user) {
    const allowed = await super._preUpdate?.(changes, options, user);
    if (allowed === false) return false;

    // If bodyType is being changed to Organic, set bodySlots to zero
    const nextBodyType = changes.system?.bodyType ?? this.bodyType;
    if (nextBodyType === 'Organic') {
      foundry.utils.setProperty(changes, 'system.bodySlots', 0);
    }

    // If brainType is being changed to Organic, set brainSlots to zero
    const nextBrainType = changes.system?.brainType ?? this.brainType;
    if (nextBrainType === 'Organic') {
      foundry.utils.setProperty(changes, 'system.brainSlots', 0);
    }

    return allowed;
  }



  /**
   * Bioclass‑specific attribute sync.  We maintain a separate method so that
   * the generic feature class stays small (calling this only when needed).
   *
   * @this {SynthicideBioclass}
   * @param {Actor} owningActor
   * @param {{render?: boolean}} [options]
   * @returns {Promise<void>}
   */
  async _syncSubtypeAttributes(owningActor, { render = true } = {}) {
    if (!owningActor) return;

    const debugBioclass = Boolean(SYNTHICIDE.debug?.synthicideBioclass);
    const itemName = this.parent?.name ?? '(unnamed item)';
    const starting = this.startingAttributes || {};

    const actorAttributes = owningActor.system?.attributes || {};
    const updates = {};

    for (const [key, value] of Object.entries(starting)) {
      if (!(key in actorAttributes)) continue;
      const num = Number(value ?? 0);
      updates[`system.attributes.${key}.base`] = num;
    }
    if (foundry.utils.hasProperty(starting, 'hp')) {
      const num = Number(starting.hp ?? 0);
      updates['system.hitPoints.base'] = num;
    }
    if (foundry.utils.hasProperty(starting, 'hpPerLevel')) {
      updates['system.hitPoints.perLevel'] = Number(starting.hpPerLevel ?? 0);
    }
    if (Object.keys(updates).length) {
      await owningActor.update(updates, { render });
      if (debugBioclass) {
        console.groupCollapsed(`[Synthicide] bioclass actor sync: ${itemName}`);
        console.log('actor:', owningActor?.name);
        console.log('updates:', updates);
        console.groupEnd();
      }
    }
  }

  /**
   * Bioclass-specific delete cleanup: clear the actor base values that were
   * sourced from this bioclass.
   * @this {SynthicideBioclass}
   * @param {Actor} owningActor
   * @param {{render?: boolean}} [options]
   * @returns {Promise<void>}
   * @protected
   */
  async _cleanupOnDelete(owningActor, { render = true } = {}) {
    if (!owningActor) return;

    const updates = {};
    const actorAttributes = owningActor.system?.attributes || {};
    const starting = this.startingAttributes || {};

    for (const key of Object.keys(starting)) {
      if (!(key in actorAttributes)) continue;
      updates[`system.attributes.${key}.base`] = 0;
    }

    updates['system.hitPoints.base'] = 0;
    updates['system.hitPoints.perLevel'] = 0;

    if (foundry.utils.hasProperty(owningActor.system, 'bodySlots')) {
      updates['system.bodySlots'] = 0;
    }
    if (foundry.utils.hasProperty(owningActor.system, 'brainSlots')) {
      updates['system.brainSlots'] = 0;
    }

    await owningActor.update(updates, { render });
  }

  /**
   * @this {SynthicideBioclass}
   * Prepare derived data for bioclass item.
   * Sets localized labels and slot types for display and sheet use.
   */
  prepareDerivedData() {
    super.prepareDerivedData();
  }
}
