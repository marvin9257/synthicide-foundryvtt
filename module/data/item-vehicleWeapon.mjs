import SynthicideGear from './item-gear.mjs';
import SYNTHICIDE from '../helpers/config.mjs';

/**
 * Ship weapon item system model.
 *
 * DataModel context: instance methods execute on the ship weapon system model
 * (`item.system`), not on the Item document.
 *
 * @extends {SynthicideGear}
 */
export default class SynthicideVehicleWeapon extends SynthicideGear {
  static LOCALIZATION_PREFIXES = [
    'SYNTHICIDE.Item.base',
    'SYNTHICIDE.Item.Gear',
    'SYNTHICIDE.Item.VehicleWeapon',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    schema.range = new fields.StringField({
      required: true,
      choices: SYNTHICIDE.VEHICLE_WEAPON_RANGES,
      initial: 'far',
    });
    schema.dmgMultiplier = new fields.NumberField({ ...requiredInteger, initial: 1, min: 1 });
    schema.ammoUnitCost = new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 });
    schema.isMissile = new fields.BooleanField({initial: false});

    return schema;
  }
}
