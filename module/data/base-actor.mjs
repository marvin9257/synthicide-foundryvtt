import SYNTHICIDE from '../helpers/config.mjs';
import { makeValueField, makeDerivedField } from './commonSchemaUtils.mjs';
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
      value: new fields.NumberField({...requiredInteger, initial: 20}),
      max: new fields.NumberField({ ...requiredInteger, initial: 20 }, {persisted: false}),
      base: new fields.NumberField({ ...requiredInteger, initial: 20 }),
      perLevel: new fields.NumberField({ ...requiredInteger, initial: 5 })
    });

    schema.forceBarrier = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 5, min: 0 }),
      max: new fields.NumberField({ ...requiredInteger, initial: 5 }, {persisted: false}),
      recoveryRate: new fields.NumberField({ ...requiredInteger, initial: 5, min: 0 }, {persisted: false})
    });

    schema.actionPoints = makeDerivedField();
    schema.toughnessDefense = makeDerivedField();
    schema.armorDefense = makeDerivedField();
    schema.nerveDefense = makeDerivedField();
    schema.shockThreshold = makeDerivedField();
    schema.battleReflex = makeDerivedField();

    schema.biography = new fields.HTMLField();

    return schema;
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    if (this.attributes) {
      for (const key in this.attributes) {
        this.attributes[key].label =
          game.i18n.localize(SYNTHICIDE.attributes[key]) ?? key;
      }
    }

    
  }
}
