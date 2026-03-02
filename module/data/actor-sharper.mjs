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

    // Synthicide attributes: base and current values, min -1
    schema.attributes = new fields.SchemaField(
      Object.keys(SYNTHICIDE.attributes).reduce((obj, attribute) => {
        obj[attribute] = new fields.SchemaField({
          base: new fields.NumberField({...requiredInteger, initial: 0}),
          modifier: new fields.NumberField({ ...requiredInteger, initial: 0 }),
          increase: new fields.NumberField({ ...requiredInteger, initial: 0, max: 5 }),
          current: new fields.NumberField({ ...requiredInteger, initial: 0 }, {persisted: false}),
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

    // Clamp hitPoints.value to hitPoints.max
    // (cynicism/resolve are clamped by their schema field min/max; hitPoints.max
    //  is persisted:false so Foundry can't enforce it at update time, hence manual clamp)
    if (foundry.utils.hasProperty(changed, 'system.hitPoints.value')) {
      const nextHP = Number(foundry.utils.getProperty(changed, 'system.hitPoints.value') ?? 0);
      // Try to get max from changed or from this
      let maxHP = Number(foundry.utils.getProperty(changed, 'system.hitPoints.max'));
      if (isNaN(maxHP)) maxHP = Number(this.hitPoints?.max ?? 0);
      foundry.utils.setProperty(changed, 'system.hitPoints.value', Math.max(0, Math.min(maxHP, nextHP)));
    }
    return allowed;
  }

  /**
   * Calculate and assign derived data for sharper actors (e.g., .current, foodDays.min, hitPoints.max).
   * @override
   * @this {SynthicideSharperData}
   */
  prepareDerivedData() {
    super.prepareDerivedData();
    // For sharper actors, .current is always derived
    if (this.attributes) {
      for (const attr of Object.values(this.attributes)) {
        attr.current = (attr.base ?? 0) + (attr.modifier ?? 0) + (attr.increase ?? 0);
      }
    }
    // Calculate foodDays.min as derived data for sharper actors
    if (this.foodDays && this.attributes?.toughness) {
      this.foodDays.min = -(6 + (this.attributes.toughness.current ?? 0));
    }
    const level = this.level.value ?? 1;
    this.hitPoints.max = (this.hitPoints.base ?? 0) + (this.hitPoints.perLevel ?? 0) * Math.max(0, level - 1);
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
