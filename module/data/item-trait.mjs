import SYNTHICIDE from '../helpers/config.mjs';
import SynthicideItemBase from './base-item.mjs';
import { parseKnowledgePowerOptions } from './commonSchemaUtils.mjs';

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

    // 1. Enforce default fallbacks for non-knowledge area traits
    this.knownPowerCount = 0;
    this.powerCountersList = null;

    // --- KNOWLEDGE AREA MULTI-TRACKING ---
    if (this.traitType === 'knowledgeArea') {
      const activeKeys = Array.from(this.powersKnown || []);
      this.knownPowerCount = activeKeys.length;

      // 2. Filter and rebuild powerUses in-memory to strip away phantom database keys
      const rawUses = this.powerUses || {};

      // 3. Derived UI View-Model: Drive labels directly out of the description options dictionary
      // Access description string from the parent Item document wrapper context safely
      const descriptionText = this.description || "";
      const dynamicTextLabels = parseKnowledgePowerOptions(descriptionText);

      this.powerCountersList = activeKeys.map(key => ({
        key: key,
        label: dynamicTextLabels[key] || key,
        count: Math.max(0, Math.floor(Number(rawUses[key] ?? 0))),
        isUnlimited: true,
        isDirectTrait: false
      }));
    }

    // --- PSYCHIC POWER SINGLE-TRAIT TRACKING ---
    else if (this.traitType === 'psychicPower') {
      const traitKey = "direct_use";
      const rawUses = this.powerUses || {};
      const currentUses = Math.max(0, Math.floor(Number(rawUses[traitKey] ?? 0)));

      this.powerCountersList = [{
        key: traitKey,
        label: this.parent?.name || "Uses",
        count: currentUses,
        max: Infinity,
        isUnlimited: true,
        isDirectTrait: true
      }];
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
    // 1. Strict validation: reject updates attempting to set an invalid trait level.
    if (changed?.system && foundry.utils.hasProperty(changed.system, 'level')) {
      const lvl = Number(changed.system.level);
      if (!SYNTHICIDE.ALLOWED_TRAIT_LEVELS.includes(lvl)) {
        console.warn(`[Synthicide] Rejected invalid trait level update: ${lvl}`);
        return false;
      }
    }

    // 2. Weapon Specialization normalization logic
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

    // 3. Update addsKnowledgePoints and clear data structures during trait conversions
    if (foundry.utils.hasProperty(changed, "system.traitType")) {
      const nextTraitType = changed.system.traitType;
      
      if (nextTraitType !== this.traitType) {
        if (nextTraitType === 'knowledgeArea') {
          changed.system.addsKnowledgePoints = true;
        } else {
          changed.system.addsKnowledgePoints = false;
          changed.system.powersKnown = [];
          changed.system.powerUses = {};
        }
      }
    }

    // 4. CLEAN FLOOR SANITATION LAYER (With ForcedDeletion Safety Guard)
    if (changed && typeof changed === 'object') {
      const flatPatch = foundry.utils.flattenObject(changed);
      for (const [keyPath, rawValue] of Object.entries(flatPatch)) {
        if (keyPath.startsWith('system.powerUses.') && !keyPath.endsWith('.')) {
          // Skip flattening paths if they contain a pre-injected _del operator instance
          if (rawValue === globalThis._del) continue;

          const validValue = Math.max(0, Math.floor(Number(rawValue) || 0));
          foundry.utils.setProperty(changed, keyPath, validValue);
        }
      }
    }

    // 5. THE FORCEDDELETION INJECTION LAYER (Executes last on safe, flattened data structures)
    if (foundry.utils.hasProperty(changed, "system.powersKnown")) {
      const currentKeys = Array.from(this.powersKnown || []);
      const incomingKeys = Array.from(changed.system.powersKnown || []);
      
      const deletedKeys = currentKeys.filter(key => !incomingKeys.includes(key));
      
      if (deletedKeys.length > 0) {
        // Safe decoupled patch initialization prevents reference leakage
        const usesPatch = { ...foundry.utils.getProperty(changed, "system.powerUses") };
        
        for (const key of deletedKeys) {
          usesPatch[key] = globalThis._del;
        }
        
        foundry.utils.setProperty(changed, "system.powerUses", usesPatch);
      }
    }

    return super._preUpdate(changed, options, user);
  }

}
