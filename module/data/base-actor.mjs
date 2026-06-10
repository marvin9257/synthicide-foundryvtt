import SYNTHICIDE from '../helpers/config.mjs';
import {
  makeValueField,
  makeDerivedField,
  makeImplantSlotsField,
  getImplantSlotSummary,
} from './commonSchemaUtils.mjs';
export default class SynthicideActorBaseData extends foundry.abstract
  .TypeDataModel {
  static LOCALIZATION_PREFIXES = ["SYNTHICIDE.Actor.base"];
  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = {};
    
    // Level field
    schema.level = makeValueField(1);

    schema.hitPoints = new fields.SchemaField({
      value: new fields.NumberField({...requiredInteger, initial: 20}), //barrier HP, left as 'value' to allow resource use for fvtt
      max: new fields.NumberField({ ...requiredInteger, initial: 20 }, {persisted: false}),
      previous: new fields.NumberField({ ...requiredInteger, initial: 0 }, {persisted: false}),
      base: new fields.NumberField({ ...requiredInteger, initial: 20 }),
      perLevel: new fields.NumberField({ ...requiredInteger, initial: 5 }),
      modifier: new fields.NumberField({ ...requiredInteger, initial: 0 }, { persisted: false })
    });

    schema.actionPoints = makeDerivedField();
    schema.toughnessDefense = makeDerivedField();
    schema.armorDefense = makeDerivedField();
    schema.nerveDefense = makeDerivedField();
    schema.shockThreshold = makeDerivedField();
    schema.battleReflex = makeDerivedField();
    schema.implantSlots = makeImplantSlotsField();
    schema.weaponProficiencies = new fields.TypedObjectField(
      new fields.NumberField({ ...requiredInteger, initial: 0 }, { persisted: false }),
      { initial: {}, persisted: false }
    );

    schema.biography = new fields.HTMLField();

    return schema;
  }

  prepareDerivedData() {
    // Modifier aggregation has been disabled as part of the refactor.
    // Previously this block applied aggregated item modifiers into the
    // DataModel prior to derived-data calculation. Modifiers are currently
    // inert/no-op; retaining this comment for historical context.

    super.prepareDerivedData();
    if (this.attributes) {
      for (const key in this.attributes) {
        this.attributes[key].label =
          game.i18n.localize(SYNTHICIDE.attributes[key]) ?? key;
      }
    }

    this.weaponProficiencies = this.buildWeaponProficiencyMap();
    foundry.utils.mergeObject(this.implantSlots, getImplantSlotSummary(this.parent));
  }

  /**
   * Build a weapon proficiency map from this actor's traits.
   * Duplicate proficiencies for the same weapon key do not stack;
   * the highest level is preserved.
   *
   * @returns {object}
   */
  buildWeaponProficiencyMap() {
    const result = {};
    const traits = this.parent?.itemTypes?.trait ?? [];
    for (const item of traits) {
      if (item?.system?.traitType !== 'weaponProficiency') continue;
      const key = String(item?.system?.specializationKey ?? '').trim();
      if (!key) continue;

      const level = Number(item?.system?.level ?? 0);
      if (!Number.isFinite(level) || level <= 0) continue;

      // Duplicate proficiencies for the same weapon key should not stack.
      // Use the highest level found for that specialization.
      result[key] = Math.max(Number(result[key] ?? 0), level);
    }
    return result;
  }


  /**
   * Prepare flattened roll data, exposing attributes at the top level.
   * @override
   * @returns {Object} The roll data object.
   */
  getRollData() {
    const data = foundry.utils.duplicate(this.toObject ? this.toObject(false) : this);

    // Provide convenience references for attributes using the
    // SYNTHICIDE attribute long-key as the property name and the
    // attribute `.value` as the value. Example key: 'SYNTHICIDE.Attribute.Awareness.long'
    try {
      const attrMap = SYNTHICIDE.attributes ?? {};
      const attrs = data.attributes ?? {};
      for (const attrKey of Object.keys(attrs)) {
        const longKey = game.i18n.localize(attrMap[attrKey]);
        const val = attrs[attrKey]?.value ?? undefined;
        if (typeof longKey === 'string' && val !== undefined) {
          data[longKey] = val;
        }
      }
    } catch (err) {
      // Defensive: do not prevent roll data from returning on unexpected shape
      console.error('getRollData: failed to attach attribute convenience keys', err);
    }

    //Conviences references to Major derived stats
    foundry.utils.mergeObject(data, {
      AD: this.armorDefense.value,
      TD: this.toughnessDefense.value,
      ND: this.nerveDefense.value,
      BR: this.battleReflex.value,
      AP: this.actionPoints.value,
      ST: this.shockThreshold.value
    });

    return data;
  }
}

