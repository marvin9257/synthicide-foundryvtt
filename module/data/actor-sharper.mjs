/**
 * DataModel for Sharper (player character) actors in the Synthicide system.
 * Defines schema, derived data, and roll data preparation for sharper actors.
 * @extends {SynthicideActorBaseData}
 */
import SynthicideActorBaseData from './base-actor.mjs';
import SYNTHICIDE from '../helpers/config.mjs';
import { makeForceBarrierField } from './commonSchemaUtils.mjs';
const fields = foundry.data.fields;
const requiredInteger = { required: true, nullable: false, integer: true };

export default class SynthicideSharperData extends SynthicideActorBaseData {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    'SYNTHICIDE.Actor.Character',
  ];

  static defineSchema() {
    const schema = super.defineSchema();

    // Synthicide attributes: base and derived value fields, min -1
    schema.attributes = new fields.SchemaField(
      Object.keys(SYNTHICIDE.attributes).reduce((obj, attribute) => {
        obj[attribute] = new fields.SchemaField({
          base: new fields.NumberField({...requiredInteger, initial: 0}),
          modifier: new fields.NumberField({ ...requiredInteger, initial: 0 }, {persisted: false}),
          increase: new fields.NumberField({ ...requiredInteger, initial: 0, max: 5 }),
          value: new fields.NumberField({ ...requiredInteger, initial: 0 }, {persisted: false}),
        });
        return obj;
      }, {})
    );

    schema.cynicism = new fields.NumberField({ ...requiredInteger, initial: 0, min: 0, max: 10 });
    schema.resolve = new fields.NumberField({ ...requiredInteger, initial: 2, min: 0, max: 5 });

    schema.motivation = new fields.StringField({ 
      required: true, 
      choices: Object.keys(SYNTHICIDE.motivations),
      initial: "proveStrength"
    }); 

    schema.foodDays = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 0}),
      min: new fields.NumberField({ ...requiredInteger, initial: 0}, {persisted: false})

    });

    schema.lurans = new fields.NumberField({ ...requiredInteger, initial: 0 });

    schema.armorValues = new fields.SchemaField({
      armorBonus: new fields.NumberField({ ...requiredInteger, initial: 0}, {persisted: false}),
      stBonus: new fields.NumberField({ ...requiredInteger, initial: 0}, {persisted: false}),
      speedMax: new fields.NumberField({ ...requiredInteger, initial: 5}, {persisted: false}),
      forceBarrier: makeForceBarrierField({
        valueInitial: 0,
        maxInitial: 0,
        recoveryRateInitial: 0,
        maxFieldOptions: { persisted: false },
        recoveryRateFieldOptions: { persisted: false },
      }),
    });

    schema.rollModifiers = new fields.TypedObjectField(
      new fields.NumberField({ required: true, nullable: false, integer: true }, {persisted: false}),
      { initial: { starvationPenalty: 0 }}
    );
    
    return schema;
  }

  /**
  * Calculate and assign derived data for sharper actors (e.g., .value, foodDays.min, hitPoints.max).
   * @override
   * @this {SynthicideSharperData}
   */
  prepareDerivedData() {
    super.prepareDerivedData();

    if (this.attributes) {
      for (const attr of Object.values(this.attributes)) {
        attr.value = (attr.base ?? 0) + (attr.modifier ?? 0) + (attr.increase ?? 0);
      }
    }
    // Get worn armor values and apply armor-only modification effects.
    const currentArmorValues = getCurrentArmorValues(this.parent);
    foundry.utils.mergeObject(this.armorValues, {
      armorBonus: currentArmorValues.armorBonus,
      stBonus: currentArmorValues.stBonus,
      speedMax: currentArmorValues.speedMax,
      forceBarrier: currentArmorValues.forceBarrier,
    });

    // Constrain speed.value to armor worn (guarding in case attributes are missing)
    if (this.attributes?.speed && Number.isFinite(this.armorValues.speedMax)) {
      this.attributes.speed.value = Math.min(this.attributes.speed.value, this.armorValues.speedMax);
    }

    // Calculate foodDays.min as derived data for sharper actors
    this.rollModifiers.starvationPenalty = this.foodDays?.value < 0 ? -2 : 0;
    if (this.foodDays && this.attributes?.toughness) {
      this.foodDays.min = -(6 + (this.attributes.toughness.value ?? 0));
    }
    const level = this.level.value ?? 1;
    
    //Derived data calculated a bit differently for player characters; include any modifiers
    this.hitPoints.max = (this.hitPoints.base ?? 32)
      + (this.hitPoints.perLevel ?? 0) * Math.max(0, level - 1)
      + (this.hitPoints?.modifier ?? 0);
    this.actionPoints.value = Math.floor(this.attributes.speed.value / 2) + this.actionPoints.modifier + 3;
    this.battleReflex.value = this.attributes.awareness.value + this.attributes.speed.value + this.battleReflex.modifier;
    const toughnessValue = this.attributes.toughness.value;
    const toughnessForArmorDefense = Math.max(toughnessValue, currentArmorValues.endoPlatingGrade ?? 0);
    const armorDefenseForShockThreshold = 5 + this.armorValues.armorBonus + toughnessValue + this.armorDefense.modifier;  //ENDO Plating mod does not change ST value
    this.toughnessDefense.value = 5 + toughnessValue + this.toughnessDefense.modifier;
    this.armorDefense.value = 5 + this.armorValues.armorBonus + toughnessForArmorDefense + this.armorDefense.modifier;
    this.shockThreshold.value = 10 + this.armorValues.stBonus + armorDefenseForShockThreshold + this.shockThreshold.modifier;
    this.nerveDefense.value = 5 + this.attributes.nerve.value + this.nerveDefense.modifier;
  }

  /**
   * Prepare flattened roll data for sharper actors, exposing attributes at the top level.
   * @override
   * @this {SynthicideSharperData}
   * @returns {Object} The roll data object.
   */
  getRollData() {
    // Start with base class roll data and merge with this to get derived data (deep merge)
    const data = foundry.utils.mergeObject(
      super.getRollData ? super.getRollData() : {},
      this,
      { inplace: false, recursive: true }
    );

    // Copy the attribute scores to the top level, so that rolls can use
    // formulas like `@str.mod + 4`.
    if (this.attributes) {
      for (let [k, v] of Object.entries(this.attributes)) {
        data[k] = foundry.utils.duplicate(v);
      }
    }
    data.lvl = this.level.value;
    return data;
  }
}

function getCurrentArmorValues(actor) {
  let returnValues = {
    armorBonus: 0,
    stBonus: 0,
    speedMax: 10,
    endoPlatingGrade: 0,
    forceBarrier: {
      max: 0,
      recoveryRate: 0
    }
  }
  if (!actor) return returnValues;

  const wornArmor = actor.itemTypes?.armor?.find(arm => arm.system.equipped);
  if (!wornArmor) return returnValues;

  const armorSystem = wornArmor.system ?? {};
  const modifications = getModificationSet(armorSystem.modifications);
  const superiorCraftingBonus = getSuperiorCraftingBonus(modifications);
  const reinforcedHelmetBonus = modifications.has('reinforcedHelmet') ? 1 : 0;
  const lighterMaterialsBonus = modifications.has('lighterMaterials') ? 2 : 0;
  const endoPlatingGrade = getEndoPlatingGrade(modifications);

  returnValues = {
    armorBonus: Number(armorSystem.armorBonus ?? 0),
    stBonus: Number(armorSystem.stBonus ?? 0) + superiorCraftingBonus + reinforcedHelmetBonus,
    speedMax: Number(armorSystem.speedMax ?? 10) + lighterMaterialsBonus,
    endoPlatingGrade,
    forceBarrier: {
      max: Number(armorSystem.forceBarrier?.max ?? 0),
      recoveryRate: Number(armorSystem.forceBarrier?.recoveryRate ?? 0)
    }
  }
  return returnValues;
}

function getModificationSet(modifications) {
  if (modifications instanceof Set) return modifications;
  if (Array.isArray(modifications)) return new Set(modifications);
  return new Set();
}

function getSuperiorCraftingBonus(modifications) {
  if (modifications.has('superiorCrafting2')) return 2;
  if (modifications.has('superiorCrafting1')) return 1;
  return 0;
}

function getEndoPlatingGrade(modifications) {
  if (modifications.has('endoPlating3')) return 3;
  if (modifications.has('endoPlating2')) return 2;
  if (modifications.has('endoPlating1')) return 1;
  return 0;
}
