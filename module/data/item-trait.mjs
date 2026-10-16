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
      choices: [...Object.keys(SYNTHICIDE.traitTypes), ...SYNTHICIDE.legacyTraitTypes],
      initial: 'generalTalent',
    });

    schema.specializationKey = new fields.StringField({
      required: false,
      blank: true,
      choices: Object.keys(SYNTHICIDE.WEAPON_SPECIALIZATIONS),
      initial: '',
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
    schema.range = new fields.StringField({...requiredBlankString});
    schema.usesLimit = new fields.StringField({...requiredBlankString});
    schema.overchargeCost = new fields.StringField({...requiredBlankString});
    schema.traitPoints = new fields.NumberField({...requiredInteger, initial: 0});
    schema.addsKnowledgePoints = new fields.BooleanField({ required: true, nullable: false, initial: false });
    
    schema.powersKnown = new fields.SetField(
      new fields.StringField({ required: true, blank: false }),
      { initial: [] }
    );

    schema.powerUses = new fields.ObjectField({
      initial: {}, 
      required: true
    });
    return schema;
  }

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();

    if (this.traitType === 'knowledgeArea') {
      this.knownPowerCount = Object.keys(this.powerUses || {}).length;
    }
  }

  /**
   * @param {object} source
   * @returns {object}
   */
  static migrateData(source) {
    if ("traitType" in source) {
      if (source.traitType === "battlePowers") {
        source.traitType = "battlePower";
      }

      if (source.traitType === "knowledgeAreas") {
        source.traitType = "knowledgeArea";
      }
    }
    return super.migrateData(source);
  }

  /**
   * Foundry hook: Called before the item is created.
   * Auto-updates addsKnowledgePoints.
   *
   * @param {object} data - The item data being applied to the item
   * @param {object} options - Additional update options
   * @param {string} userId - The ID of the user making the update
   * @returns {Promise<boolean|void>} - Return false to prevent the update
   * @override
   */
  async _preCreate(data, options, userId) {
    const allowed = await super._preCreate(data, options, userId);
    if (allowed === false) return false;

    if (this.traitType === 'knowledgeArea') {
        this.updateSource({ addsKnowledgePoints: true });
    }

    return allowed;
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
    if (changed?.system && foundry.utils.hasProperty(changed.system, 'level')) {
      const lvl = Number(changed.system.level);
      if (!SYNTHICIDE.ALLOWED_TRAIT_LEVELS.includes(lvl)) {
        console.warn(`[Synthicide] Rejected invalid trait level update: ${lvl}`);
        return false; // cancel the update
      }
    }

    // Weapon Specialization normalization logic
    if (changed?.system) {
      const nextTraitType = changed.system.traitType ?? this.traitType;
      const nextSpecializationKey = String(changed.system.specializationKey ?? this.specializationKey ?? '').trim();
      const defaultSpecialization = Object.keys(SYNTHICIDE.WEAPON_SPECIALIZATIONS)[0] ?? '';

      if (foundry.utils.hasProperty(changed.system, 'specializationKey')
        && nextSpecializationKey
        && !foundry.utils.hasProperty(SYNTHICIDE.WEAPON_SPECIALIZATIONS, nextSpecializationKey)) {
        console.warn(`[Synthicide] Rejected invalid weapon specialization update: ${nextSpecializationKey}`);
        return false;
      }

      if (nextTraitType === 'weaponProficiency' && !nextSpecializationKey) {
        changed.system.specializationKey = defaultSpecialization;
      }

      if (nextTraitType !== 'weaponProficiency' && nextSpecializationKey) {
        changed.system.specializationKey = '';
      }
    }

    // Update addsKnowledgePoints
    if (foundry.utils.hasProperty(changed, "system.traitType")) {
      const nextTraitType = changed.system.traitType;
      
      if (nextTraitType !== this.traitType) {
        // A REAL change to traitType is occurring right now
        if (nextTraitType === 'knowledgeArea') {
          changed.system.addsKnowledgePoints = true;
        } else {
          changed.system.addsKnowledgePoints = false;
          changed.system.powersKnown = [];
          changed.system.powerUses = {};
        }
      }
    }

    // Synchronize powerUses map whenever powersKnown changes
    if (changed?.system && foundry.utils.hasProperty(changed.system, 'powersKnown')) {
      const incomingKeys = changed.system.powersKnown;
      const nextKnownArray = incomingKeys instanceof Set ? Array.from(incomingKeys) : (Array.isArray(incomingKeys) ? incomingKeys : []);
      const currentUses = changed.system.powerUses ?? this.powerUses ?? {};
      const synchronizedUses = {};

      for (const key of nextKnownArray) {
        // Enforce the 0 floor floor boundary directly during setup initialization
        synchronizedUses[key] = Math.max(0, Number(currentUses[key] ?? 0));
      }
      changed.system.powerUses = synchronizedUses;
    }

    // Clean Counter Floor Safety: Catch all flat or nested primitive update entries
    if (changed && typeof changed === 'object') {
      const flatPatch = foundry.utils.flattenObject(changed);
      for (const [keyPath, rawValue] of Object.entries(flatPatch)) {
        // Targets simple paths like "system.powerUses.slug" directly without trailing ".value" string checks
        if (keyPath.startsWith('system.powerUses.') && !keyPath.endsWith('.')) {
          const validValue = Math.max(0, Math.floor(Number(rawValue) || 0));
          foundry.utils.setProperty(changed, keyPath, validValue);
        }
      }
    }

    return super._preUpdate(changed, options, user);
  }
}
