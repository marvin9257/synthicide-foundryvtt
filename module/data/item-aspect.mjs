import SynthicideFeature from './item-feature.mjs';
import SYNTHICIDE from '../helpers/config.mjs';

/**
 * A concrete subclass representing an "aspect" feature.
 * Most behavior is inherited from the generic feature class; this
 * subclass only defines aspect-specific schema fields.
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
   * Extend the schema with fields that are unique to aspects.
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

    // Persistent per-attribute bonuses applied during actor derived-data prep.
    schema.attributeBonuses = new fields.SchemaField(
      Object.keys(SYNTHICIDE.attributes).reduce((obj, attribute) => {
        obj[attribute] = new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 });
        return obj;
      }, {})
    );

    // Flat bonus added directly to hitPoints.max.
    schema.hitPointsMaxBonus = new fields.NumberField({
      required: true,
      nullable: false,
      integer: true,
      initial: 0,
    });

    // When enabled, add owning bioclass hpPerLevel to hitPoints.max.
    schema.useBioclassHpPerLevelAsMaxBonus = new fields.BooleanField({
      required: true,
      nullable: false,
      initial: false,
    });

    // A list of special abilities granted by this aspect. Each is an object with a description property.
    schema.abilities = new fields.ArrayField(
      new fields.SchemaField({
        description: new fields.StringField({ required: true, initial: '' })
      }),
      { initial: [] }
    );

    return schema;
  }

  // Future aspect-specific logic can be added here without touching the shared base.
}
