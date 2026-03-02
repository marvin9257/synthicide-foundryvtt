import SynthicideFeature from './item-feature.mjs';
import SYNTHICIDE from '../helpers/config.mjs';

const BIOCLASS_TYPES = SYNTHICIDE.bioclassTypes || { skinbag: 'SYNTHICIDE.Item.Bioclass.Skinbag' };
const DEFAULT_BIOCLASS = 'skinbag';

export default class SynthicideBioclass extends SynthicideFeature {
  static LOCALIZATION_PREFIXES = [
    'SYNTHICIDE.Item.base',
    'SYNTHICIDE.Item.Bioclass',
  ];

  static defineSchema() {
    const { fields } = foundry.data;
    const schema = super.defineSchema();
    const defaultPreset = SYNTHICIDE.getFeaturePreset('bioclass', DEFAULT_BIOCLASS);

    schema.featureType = new fields.StringField({
      required: true,
      choices: ['bioclass'],
      initial: 'bioclass'
    });

    // Seed traits so the sheet shows them immediately
    const defaultTraits = this.getDefaultTraits({
      featureType: 'bioclass',
      bioclassType: defaultPreset?.bioclassType || DEFAULT_BIOCLASS
    });
    schema.traits.initial = foundry.utils.deepClone(defaultTraits);

    schema.bioclassType = new fields.StringField({
      required: true,
      choices: BIOCLASS_TYPES,
      initial: DEFAULT_BIOCLASS,
    });

    schema.startingAttributes = new fields.SchemaField(
      Object.fromEntries(
        Object.entries(defaultPreset.startingAttributes).map(([k,v]) => [k, new fields.NumberField({ required: true, initial: v })])
      )
    );

    schema.bodySlots = new fields.NumberField({ required: true, initial: defaultPreset.bodySlots });
    schema.brainSlots = new fields.NumberField({ required: true, initial: defaultPreset.brainSlots });

    return schema;
  }

  /**
   * A small _preUpdate hook to keep start attributes/slots in sync with the
   * selected bioclass type whenever that field changes.  This moves logic out
   * of the sheet and into the data model, simplifying the UI code.
   *
   * @override
   */
  async _preUpdate(changes, options, user) {
    const allowed = await super._preUpdate?.(changes, options, user);
    if (allowed === false) return false;

    const nextBioclassType = changes.system?.bioclassType;
    if (nextBioclassType && nextBioclassType !== this.bioclassType) {
      const preset = SYNTHICIDE.getFeaturePreset('bioclass', nextBioclassType);
      foundry.utils.setProperty(changes, 'system.startingAttributes', foundry.utils.deepClone(preset.startingAttributes));
      foundry.utils.setProperty(changes, 'system.bodySlots', preset.bodySlots);
      foundry.utils.setProperty(changes, 'system.brainSlots', preset.brainSlots);
    }
    return allowed;
  }

  /**
   * Resolve the effective bioclass starting attributes.
   *
   * Precedence:
   * 1) Use explicit attributes stored on this item (`this.startingAttributes`)
   *    when present.
   * 2) Otherwise, fall back to the current bioclass preset defaults.
   *
   * This keeps apply (`_syncSubtypeAttributes`) and delete cleanup
   * (`_cleanupOnDelete`) aligned on the same source of truth.
   *
   * @returns {object} Effective starting-attribute map for this bioclass.
   * @private
   */
  _getEffectiveStartingAttributes() {
    const sourceStarting = this.startingAttributes || {};
    if (Object.keys(sourceStarting).length) return sourceStarting;
    const type = this.bioclassType || DEFAULT_BIOCLASS;
    return SYNTHICIDE.getFeaturePreset('bioclass', type).startingAttributes || {};
  }

  
  /**
   * Bioclass‑specific attribute sync.  We maintain a separate method so that
   * the generic feature class stays small (calling this only when needed).
   * This more closely mirrors the old implementation the user provided.
   *
   * @param {Actor} owningActor
   */
  async _syncSubtypeAttributes(owningActor, { render = true } = {}) {
    if (!owningActor) return;

    const debugBioclass = Boolean(SYNTHICIDE.debug?.synthicideBioclass);
    const itemName = this.parent?.name ?? '(unnamed item)';
    const starting = this._getEffectiveStartingAttributes();

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
   * @param {Actor} owningActor
   * @protected
   */
  async _cleanupOnDelete(owningActor, { render = true } = {}) {
    if (!owningActor) return;

    const updates = {};
    const actorAttributes = owningActor.system?.attributes || {};
    const starting = this._getEffectiveStartingAttributes();

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
    const type = this.bioclassType || DEFAULT_BIOCLASS;
    const preset = SYNTHICIDE.getFeaturePreset('bioclass', type);
    this.bodyType = `SYNTHICIDE.Item.BodyType.${preset.bodyType}`;
    this.brainType = `SYNTHICIDE.Item.BodyType.${preset.brainType}`;
    this.bioclassTypeLabel = `SYNTHICIDE.Item.Bioclass.${type.charAt(0).toUpperCase() + type.slice(1)}`;
  }
}
