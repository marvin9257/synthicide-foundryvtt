import SynthicideFeature from './item-feature.mjs';
import SYNTHICIDE from '../helpers/config.mjs';

/**
 * A concrete subclass representing an "aspect" feature.
 * Most behaviour is inherited from the generic feature class; we only
 * need to ensure the discriminator field is set appropriately and
 * provide a distinct localization prefix for any aspect-specific
 * translation keys that may be added later.
 */
export default class SynthicideAspect extends SynthicideFeature {
  static DEFAULT_ASPECT = Object.keys(SYNTHICIDE.aspectTypes ?? {})[0] ?? 'brainiac';

  static LOCALIZATION_PREFIXES = [
    'SYNTHICIDE.Item.base',
    'SYNTHICIDE.Item.Aspect'
  ];

  /**
   * Extend the schema with fields that are unique to aspects.  These
   * correspond roughly to the design notes provided by the user:
   * attribute increases/penalties, level‑one abilities, and a place to
   * stash miscellaneous notes or rules text.
   */
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.aspectType = new fields.StringField({
      required: true,
      choices: SYNTHICIDE.aspectTypes,
      initial: this.DEFAULT_ASPECT
    });

    // default trait list corresponding to the chosen aspect subtype
    const aspectDefaults = this.getDefaultTraits({
      featureType: 'aspect',
      aspectType: this.DEFAULT_ASPECT
    });
    schema.traits.initial = foundry.utils.deepClone(aspectDefaults);

    // A list of special abilities granted by this aspect.  Stored as simple
    // strings for now; the UI may later render these as more structured
    // entries or link to power documents.
    schema.abilities = new fields.ArrayField(
      new fields.StringField({ required: true, initial: '' }),
      { initial: [] }
    );

    return schema;
  }

  /**
   * Ensure newly created aspects default to the correct subtype.
   * The legacy `bioclass` class relied on a separate item type; here
   * we simply enforce the `featureType` field value.
   */
  static async create(data = {}, options = {}) {
    data = foundry.utils.mergeObject({ system: { featureType: 'aspect' } }, data, { inplace: false });
    return super.create(data, options);
  }

  /**
   * When the aspect type changes we need to repopulate traits and
   * abilities from the preset.  Keeping this in the data model means
   * sheets stay simple.
   */
  async _preUpdate(changes, options, user) {
    const allowed = await super._preUpdate?.(changes, options, user);
    if (allowed === false) return false;

    if (changes.system?.aspectType) {
      const preset = SYNTHICIDE.getFeaturePreset('aspect', changes.system.aspectType);
      // refresh traits using shared helper
      const traitDefaults = SynthicideFeature.getDefaultTraits({
        featureType: 'aspect',
        aspectType: changes.system.aspectType
      });
      foundry.utils.setProperty(changes, 'system.traits', foundry.utils.deepClone(traitDefaults));
      foundry.utils.setProperty(changes, 'system.abilities', foundry.utils.deepClone(preset.abilities || []));
    }
    return allowed;
  }

  // future custom logic (default attributes, trait presets, etc.)
  // can be added here without touching the shared base.
}
