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
        max: new fields.NumberField({...requiredInteger, initial: 3})
      }),
      hasLivingQuarters: new fields.BooleanField({ initial: false }),
      weapons: new fields.SchemaField({
        value: new fields.NumberField({...requiredInteger, initial: 0}, {persisted: false}),
        max: new fields.NumberField({...requiredInteger, initial: 0}, {persisted: false})
      })
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
  
    // 1. Calculate cargo capacity
    const cargoItems = this.parent?.itemTypes.cargo ?? [];
    this.capacity.crates.value = cargoItems.reduce((acc, item) => 
      acc + (Number(item.system.quantity) || 0), 0);

    // 2. Set weapon limits
    this.capacity.weapons.max = (this.price || 0) * 2;

    // 3. Calculate used weapon capacity (quantity * price)
    const weaponItems = this.parent?.itemTypes.vehicleWeapon ?? [];
    this.capacity.weapons.value = weaponItems.reduce((acc, item) => 
      acc + (Number(item.system.quantity * item.system.price) || 0), 0);
    }
}
