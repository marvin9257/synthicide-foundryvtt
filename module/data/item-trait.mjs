import SYNTHICIDE from '../helpers/config.mjs';
import SynthicideItemBase from './base-item.mjs';

/**
 * Trait item system model.
 *
 * DataModel context: instance methods execute on the trait system model
 * (`item.system`), not on the Item document.
 *
 * @extends {SynthicideItemBase}
 */
export default class SynthicideTrait extends SynthicideItemBase {
  static LOCALIZATION_PREFIXES = [
    'SYNTHICIDE.Item.base',
    'SYNTHICIDE.Item.Trait',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredBlankString = { required: true, blank: true, initial: "" };
    const requiredInteger = { required: true, nullable: false, integer: true };
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
        'aspect',
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

    schema.requirements = new fields.StringField({...requiredBlankString});
    schema.apCost = new fields.StringField({...requiredBlankString});
    schema.range = new fields.NumberField({...requiredInteger, initial: 0});
    schema.usesLimit = new fields.NumberField({...requiredInteger, initial: 0}, {persisted: false});
    schema.overchargeCost = new fields.NumberField({...requiredInteger, initial: 0}, {persisted: false});

    return schema;
  }

  /**
   * DataModel pre-update hook for trait normalization logic.
   * @this {SynthicideTrait}
   * @param {object} changed
   * @param {object} options
   * @param {string} user
   * @returns {Promise<boolean|void>}
   * @override
   */
  async _preUpdate(changed, options, user) {
    // Strict validation: reject updates attempting to set an invalid trait level.
    const allowed = [1, 4, 7];
    if (changed?.system && Object.prototype.hasOwnProperty.call(changed.system, 'level')) {
      const lvl = Number(changed.system.level);
      if (!allowed.includes(lvl)) {
        console.warn(`[Synthicide] Rejected invalid trait level update: ${lvl}`);
        return false; // cancel the update
      }
    }
    return super._preUpdate(changed, options, user);
  }
}
