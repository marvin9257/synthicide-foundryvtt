import SYNTHICIDE from '../helpers/config.mjs';
export default class SynthicideActorBaseData extends foundry.abstract
  .TypeDataModel {
  static LOCALIZATION_PREFIXES = ["SYNTHICIDE.Actor.base"];
  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = {};

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

    schema.hitPoints = new fields.SchemaField({
      value: new fields.NumberField({...requiredInteger, initial: 10, min: 0}),
      max: new fields.NumberField({ ...requiredInteger, initial: 10 }, {persisted: false}),
      base: new fields.NumberField({ ...requiredInteger, initial: 20 }),
      perLevel: new fields.NumberField({ ...requiredInteger, initial: 5 })
    });

    schema.power = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 5, min: 0 }),
      max: new fields.NumberField({ ...requiredInteger, initial: 5 })
    });

    schema.biography = new fields.HTMLField();

    return schema;
  }

  prepareDerivedData() {
  // Loop through attribute scores, and add their modifiers to our sheet output.
    super.prepareDerivedData();
    for (const key in this.attributes) {
      // Calculatation of attributes current handled in actor prepared data to addresess features modifiying.
      //this.attributes[key].current = this.attributes[key].base + this.attributes[key].modifier + this.attributes[key].increase;

      // Handle attribute label localization.
      this.attributes[key].label =
        game.i18n.localize(SYNTHICIDE.attributes[key]) ?? key;
    }
  }
}
