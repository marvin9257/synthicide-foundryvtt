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
    return schema;
  }

  prepareDerivedData() {
    // note attribute.X.current is updated as part of actor document, so no derived data based on current 
    super.prepareDerivedData();
    
    const level = this.level.value ?? 1;
    this.hitPoints.max = (this.hitPoints.base ?? 0) + (this.hitPoints.perLevel ?? 0) * Math.max(0, level - 1);
  }

  getRollData() {
    // Start with base class roll data
    const data = super.getRollData ? super.getRollData() : {};

    // Copy the attribute scores to the top level, so that rolls can use
    // formulas like `@str.mod + 4`.
    if (this.attributes) {
      for (let [k, v] of Object.entries(this.attributes)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }
    data.lvl = this.level.value;
    return data;
  }
}
