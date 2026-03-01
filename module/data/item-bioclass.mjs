import SynthicideFeature from './item-feature.mjs';
import SYNTHICIDE from '../helpers/config.mjs';

const BIOCLASS_TYPES = SYNTHICIDE.bioclassTypes || ['skinbag'];
const DEFAULT_BIOCLASS = 'skinbag';

export default class SynthicideBioclass extends SynthicideFeature {
  static LOCALIZATION_PREFIXES = [
    'SYNTHICIDE.Item.base',
    'SYNTHICIDE.Item.Bioclass',
  ];

  static defineSchema() {
    const { fields } = foundry.data;
    const schema = super.defineSchema();
    const defaultPreset = SYNTHICIDE.getBioclassPreset(DEFAULT_BIOCLASS);

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

    const bioclassType = changes.system?.bioclassType;
    if (bioclassType) {
      const preset = SYNTHICIDE.getFeaturePreset('bioclass', bioclassType);
      foundry.utils.setProperty(changes, 'system.startingAttributes', foundry.utils.deepClone(preset.startingAttributes));
      foundry.utils.setProperty(changes, 'system.bodySlots', preset.bodySlots);
      foundry.utils.setProperty(changes, 'system.brainSlots', preset.brainSlots);

      const traitDefaults = SynthicideFeature.getDefaultTraits({
        featureType: 'bioclass',
        bioclassType
      });
      foundry.utils.setProperty(changes, 'system.traits', foundry.utils.deepClone(traitDefaults));
    }
    return allowed;
  }

  /**
   * Convenience wrapper retained for backwards compatibility.  The
   * base class now exposes generic `applyToActor` which handles traits
   * and attributes for any feature type.
   */
  async applyBioclassToActor(actor) {
    return this.applyToActor(actor);
  }

  /**
   * Bioclass‑specific attribute sync.  We maintain a separate method so that
   * the generic feature class stays small (calling this only when needed).
   * This more closely mirrors the old implementation the user provided.
   *
   * @param {Actor} owningActor
   * @param {Array} [debugReport] Optional array to push debug entries into.
   */
  async _syncBioclassAttributes(owningActor, debugReport) {
    if (!owningActor) return;

    const debugBioclass = Boolean(SYNTHICIDE.debug?.synthicideBioclass);
    const itemName = this.parent?.name ?? '(unnamed item)';
    const sourceStarting = this.startingAttributes || {};
    const type = this.bioclassType || DEFAULT_BIOCLASS;
    const presetStarting = SYNTHICIDE.getFeaturePreset('bioclass', type).startingAttributes || {};
    const starting = Object.keys(sourceStarting).length ? sourceStarting : presetStarting;

    const actorAttributes = owningActor.system?.attributes || {};
    const updates = {};

    for (const [key, value] of Object.entries(starting)) {
      const mappedKey = key in actorAttributes ? key : SYNTHICIDE.bioclassToActorAttributeMap?.[key];
      if (!mappedKey || !(mappedKey in actorAttributes)) continue;
      const num = Number(value ?? 0);
      updates[`system.attributes.${mappedKey}.base`] = num;
    }
    if (foundry.utils.hasProperty(starting, 'hp')) {
      const num = Number(starting.hp ?? 0);
      updates['system.hitPoints.base'] = num;
    }
    if (foundry.utils.hasProperty(starting, 'hpPerLevel')) {
      updates['system.hitPoints.perLevel'] = Number(starting.hpPerLevel ?? 0);
    }
    if (Object.keys(updates).length) {
      await owningActor.update(updates);
      if (debugBioclass && Array.isArray(debugReport)) {
        debugReport.push({
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
   * Bioclass-specific delete cleanup: clear the actor base values that were
   * sourced from this bioclass.
   * @param {Actor} owningActor
   * @protected
   */
  async _cleanupOnDelete(owningActor) {
    if (!owningActor) return;

    const updates = {
      'system.hitPoints.base': 0,
      'system.hitPoints.perLevel': 0,
    };
    const attributeMap = SYNTHICIDE.bioclassToActorAttributeMap ?? {};
    for (const mappedKey of Object.values(attributeMap)) {
      if (owningActor.system?.attributes?.[mappedKey]) {
        updates[`system.attributes.${mappedKey}.base`] = 0;
      }
    }
    await owningActor.update(updates);
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
