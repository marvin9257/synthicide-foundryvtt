import SYNTHICIDE from '../helpers/config.mjs';

export default class SynthicideVehicleBaseData extends foundry.abstract
  .TypeDataModel {
  static LOCALIZATION_PREFIXES = ["SYNTHICIDE.Vehicle.base"];
  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = {};

    schema.hitPoints = new fields.SchemaField({
      value: new fields.NumberField({...requiredInteger, initial: 50}),
      max: new fields.NumberField({ ...requiredInteger, initial: 50 }),
      previous: new fields.NumberField({ ...requiredInteger, initial: 0 }, {persisted: false})
    });
    schema.isShip = new fields.BooleanField({ initial: false });
    schema.velocity = new fields.NumberField({ ...requiredInteger, initial: 10 });
    schema.price = new fields.NumberField({ ...requiredInteger, initial: 1000 });
    schema.damageThreshold = new fields.NumberField({ ...requiredInteger, initial: 10 });
    schema.capacity = new fields.SchemaField({
      characters: new fields.NumberField({ ...requiredInteger, initial: 1 }),
      crates: new fields.SchemaField({
        value: new fields.NumberField({...requiredInteger, initial: 0}, {persisted: false}),
        max: new fields.NumberField({...requiredInteger, initial: 3}),
      }),
      hasLivingQuarters: new fields.BooleanField({ initial: false })
    });
    schema.fuelUnits = new fields.SchemaField({
      value: new fields.NumberField({...requiredInteger, initial: 3}),
      max: new fields.NumberField({...requiredInteger, initial: 3}),
      cost: new fields.NumberField({ ...requiredInteger, initial: 20 }),
    });

    schema.customizations = new fields.SetField(new fields.StringField({ required: true, blank: false}));
    schema.flavor = new fields.SchemaField({
      origin: new fields.StringField({ required: true, choices: Object.keys(SYNTHICIDE.shipFlavors.origins), initial: "none"}), 
      appearance: new fields.StringField({ required: true, choices: Object.keys(SYNTHICIDE.shipFlavors.appearance), initial: "none"}),
      flaw: new fields.StringField({ required: true, choices: Object.keys(SYNTHICIDE.shipFlavors.flaws), initial: "none"}),
      mystery: new fields.StringField({ required: true, choices: Object.keys(SYNTHICIDE.shipFlavors.mysteries), initial: "none"}),
      upgrade: new fields.StringField({ required: true, choices: Object.keys(SYNTHICIDE.shipFlavors.upgrades), initial: "none"})
    });

    schema.description = new fields.HTMLField();

    return schema;
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    const cargoItems = this.parent?.itemTypes?.cargo ?? [];
    let totalCargo = 0;
    for (const cargoItem of cargoItems) {
      totalCargo += Number(cargoItem.system?.quantity) || 0;
    }
    this.capacity.crates.value = totalCargo;
  }
}
