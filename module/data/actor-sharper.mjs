/**
 * DataModel for Sharper (player character) actors in the Synthicide system.
 * Defines schema, derived data, and roll data preparation for sharper actors.
 * @extends {SynthicideActorBaseData}
 */
import SynthicideActorBaseData from './base-actor.mjs';
import SYNTHICIDE from '../helpers/config.mjs';
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
          modifier: new fields.NumberField({ ...requiredInteger, initial: 0 }),
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
    });

    schema.rollModifiers = new fields.SchemaField({
      starvationPenalty: new fields.NumberField({ ...requiredInteger, initial: 0}, {persisted: false}),
    });
    
    return schema;
  }

  /**
   * Clamp certain system values before update (e.g., cynicism, resolve, hitPoints.value).
   * @override
   * @this {SynthicideSharperData}
   * @param {Object} changed - The changed data.
   * @param {Object} options - Update options.
   * @param {string} user - The user ID performing the update.
   * @returns {Promise<boolean|undefined>} False to prevent update, otherwise undefined.
   */
  async _preUpdate(changed, options, user) {
    const allowed = await super._preUpdate?.(changed, options, user);
    if (allowed === false) return false;

    // Constrain hitPoints.value to not exceed hitPoints.max, but allow
    // negative HP values (e.g., -1) per updated rules/schema. Previously we
    // clamped a lower bound of 0 here; that prevented representing negative HP.
    if (foundry.utils.hasProperty(changed, 'system.hitPoints.value')) {
      const nextHP = Number(foundry.utils.getProperty(changed, 'system.hitPoints.value') ?? 0);
      // Try to get max from changed or from this
      let maxHP = Number(foundry.utils.getProperty(changed, 'system.hitPoints.max'));
      if (isNaN(maxHP)) maxHP = Number(this.hitPoints?.max ?? 0);
      foundry.utils.setProperty(changed, 'system.hitPoints.value', Math.min(maxHP, nextHP));
    }
    return allowed;
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
    //Get worn armor values
    foundry.utils.mergeObject(this.armorValues, getCurrentArmorValues(this.parent?.actor));

    // Constrain speed.value to armor worn (guarding in case attributes are missing)
    if (this.attributes?.speed && Number.isFinite(this.armorValues?.speedMax)) {
      this.attributes.speed.value = Math.min(this.attributes.speed.value, this.armorValues.speedMax);
    }

    // Calculate foodDays.min as derived data for sharper actors
    this.rollModifiers.starvationPenalty = this.foodDays?.value < 0 ? -2 : 0;
    if (this.foodDays && this.attributes?.toughness) {
      this.foodDays.min = -(6 + (this.attributes.toughness.value ?? 0));
    }
    const level = this.level.value ?? 1;
    
    //Dervived data calculated a bit differently for NPC's so make it sharper specicifc
    this.hitPoints.max = (this.hitPoints.base ?? 32) + (this.hitPoints.perLevel ?? 0) * Math.max(0, level - 1);
    this.actionPoints.value = Math.floor(this.attributes.speed.value / 2) + this.actionPoints.modifier + 3;
    this.battleReflex.value = this.attributes.awareness.value + this.attributes.speed.value + this.battleReflex.modifier;
    this.toughnessDefense.value = this.attributes.toughness.value + 5 + this.toughnessDefense.modifier
    this.armorDefense.value = this.armorValues.armorBonus + this.attributes.toughness.value + 5 + this.armorDefense.modifier;
    this.shockThreshold.value = 10 + this.armorValues.stBonus + this.armorDefense.value + this.shockThreshold.modifier;
    this.nerveDefense.value = this.attributes.nerve.value + 5 + this.nerveDefense.modifier;
  }

  /**
   * Prepare flattened roll data for sharper actors, exposing attributes at the top level.
   * @override
   * @this {SynthicideSharperData}
   * @returns {Object} The roll data object.
   */
  getRollData() {
    // Start with base class roll data
    const data = super.getRollData ? super.getRollData() : {};

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
    speedMax: 10
  }
  if (!actor) return returnValues;

  const wornArmor = actor.itemTypes?.armor?.find(arm => arm.system.equipped);
  if (!wornArmor) return returnValues;

  returnValues = {
    armorBonus: wornArmor.armorBonus,
    stBonus: wornArmor.stBonus,
    speedMax: wornArmor.speedMax
  }
  return returnValues;
}
