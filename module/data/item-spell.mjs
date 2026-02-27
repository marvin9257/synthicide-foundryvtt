// Deprecated: spells have been merged into traits.  This class remains
// to ensure any existing worlds with spell items still load, but new
// content should be created as type "trait".
import SynthicideTrait from './item-trait.mjs';

export default class SynthicideSpell extends SynthicideTrait {
  static LOCALIZATION_PREFIXES = [
    'SYNTHICIDE.Item.base',
    'SYNTHICIDE.Item.Spell',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    // legacy field; mirror into `level` for compatibility
    schema.spellLevel = new fields.NumberField({
      required: false,
      nullable: true,
      integer: true,
      initial: 1,
      min: 0,
      max: 9,
    });

    return schema;
  }

  /** @override */
  async _preUpdate(changed, options, user) {
    // if the old spellLevel field is set, propagate to level
    if (changed.system?.spellLevel !== undefined) {
      changed.system = changed.system || {};
      changed.system.level = changed.system.spellLevel;
    }
    return super._preUpdate(changed, options, user);
  }

  /** @override */
  async _onCreate(data, options, userId) {
    // migrate any new spell to trait type and set traitType
    if (this.parent?.type === 'spell') {
      await this.update({ type: 'trait', 'system.traitType': 'spell' });
    }
    super._onCreate(data, options, userId);
  }
}
