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

    // Modifiers are provided by the Modifiable mixin (standardized schema)

    // Trait categories/types (bioclass, attack skill, knowledge focus, etc.)
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
    // undefined; other trait types should set it.
    schema.level = new fields.NumberField({
      choices: SYNTHICIDE.ALLOWED_TRAIT_LEVELS,
      initial: 1,
      required: false,
      nullable: true,
      integer: true,
      min: 1,
      max: 7,
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
    if (changed?.system && Object.prototype.hasOwnProperty.call(changed.system, 'level')) {
      const lvl = Number(changed.system.level);
      if (!SYNTHICIDE.ALLOWED_TRAIT_LEVELS.includes(lvl)) {
        console.warn(`[Synthicide] Rejected invalid trait level update: ${lvl}`);
        return false; // cancel the update
      }
    }
    return super._preUpdate(changed, options, user);
  }
}
