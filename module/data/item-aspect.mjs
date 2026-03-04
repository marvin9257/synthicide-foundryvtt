import SynthicideFeature from './item-feature.mjs';

/**
 * A concrete subclass representing an "aspect" feature.
 * Most behaviour is inherited from the generic feature class; we only
 * need to ensure the discriminator field is set appropriately and
 * provide a distinct localization prefix for any aspect-specific
 * translation keys that may be added later.
 *
 * DataModel context: instance methods execute on the aspect system model
 * (`item.system`), not on the Item document.
 *
 * @extends {SynthicideFeature}
 */
export default class SynthicideAspect extends SynthicideFeature {
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

    schema.featureType = new fields.StringField({
      required: true,
      choices: ['aspect'],
      initial: 'aspect'
    });

    schema.traits.initial = [];

    // A list of special abilities granted by this aspect. Each is an object with a description property.
    schema.abilities = new fields.ArrayField(
      new fields.SchemaField({
        description: new fields.StringField({ required: true, initial: '' })
      }),
      { initial: [] }
    );

    return schema;
  }

  // future custom logic (default attributes, trait presets, etc.)
  // can be added here without touching the shared base.
}
