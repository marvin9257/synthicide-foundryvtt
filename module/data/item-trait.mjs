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

    // Trait categories/types (bioclass, attack skill, knowledge focus, etc.)
    // This replaces the old `bioClassLink` boolean and allows for future
    // differentiation. Level is only meaningful for non-bioclass traits.
    schema.traitType = new fields.StringField({
      required: true,
      choices: [
        'bioclass',
        'attackSkill',
        'knowledgeFocus',
        'psychicPower',
        'tacticalPower',
        'mutation',
        'generalTalent',
        'naturalTalent',
        // legacy placeholder for converted spells
        'spell'
      ],
      initial: 'generalTalent',
    });

    // Optional level for traits. Bioclass traits will usually leave this
    // undefined; other trait types should set it. We keep the same range
    // that spellLevel previously used.
    schema.level = new fields.NumberField({
      required: false,
      nullable: true,
      integer: true,
      min: 0,
      max: 9,
    });

    // (legacy) Bioclass-linked trait flag – kept for backward compatibility
    // but will be inferred from traitType === 'bioclass'.
    schema.bioClassLink = new fields.BooleanField({ initial: false });

    return schema;
  }

  /**
   * When the traitType changes, update the legacy bioClassLink flag so
   * existing code that still checks it continues to work.
   * @override
   */
  async _preUpdate(changed, options, user) {
    if (changed.system?.traitType !== undefined) {
      changed.system = changed.system || {};
      changed.system.bioClassLink = changed.system.traitType === 'bioclass';
    }
    return super._preUpdate(changed, options, user);
  }
}
