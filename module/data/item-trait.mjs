import SYNTHICIDE from '../helpers/config.mjs';
import SynthicideItemBase from './base-item.mjs';

export default class SynthicideTrait extends SynthicideItemBase {
  static LOCALIZATION_PREFIXES = [
    'SYNTHICIDE.Item.base',
    'SYNTHICIDE.Item.Trait',
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
          required: true,
          choices: ['bonus', 'penalty', 'set'],
        }),
        condition: new fields.StringField({ required: false }),
      })
    );

    // Bioclass-linked trait flag
    schema.bioClassLink = new fields.BooleanField({ initial: false });

    return schema;
  }
}
