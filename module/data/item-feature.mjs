import SYNTHICIDE from '../helpers/config.mjs';
import SynthicideItemBase from './base-item.mjs';

export default class SynthicideFeature extends SynthicideItemBase {
  static LOCALIZATION_PREFIXES = [
    'SYNTHICIDE.Item.base',
    'SYNTHICIDE.Item.Feature',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    // Modifiers: array of { target, value, type, condition }
    schema.modifiers = new fields.ArrayField(
      new fields.SchemaField({
        target: new fields.StringField({
          required: true,
          choices: Object.keys(SYNTHICIDE.attributes),
        }),
        value: new fields.NumberField({ required: true }),
        type: new fields.StringField({
          required: false,
          initial: 'bonus',
          choices: ['bonus', 'penalty', 'set'],
        }),
        condition: new fields.StringField({ required: false, blank: true }),
        source: new fields.StringField({ required: false, blank: true }),
      })
    );

    return schema;
  }
}
