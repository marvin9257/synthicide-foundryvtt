import SYNTHICIDE from '../helpers/config.mjs';
import SynthicideGear from './item-gear.mjs';

/**
 * Weapon item system model.
 *
 * DataModel context: instance methods execute on the armor system model
 * (`item.system`), not on the Item document.
 *
 * @extends {SynthicideGear}
 */
export default class SynthicideWeapon extends SynthicideGear {
  static LOCALIZATION_PREFIXES = [
    'SYNTHICIDE.Item.base',
    'SYNTHICIDE.Item.Gear',
    'SYNTHICIDE.Item.Weapon'
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();
    schema.weaponClass = new fields.StringField({
      required: true,
      choices: SYNTHICIDE.WEAPON_CLASSES,
      initial: Object.keys(SYNTHICIDE.WEAPON_CLASSES)[0]
    })
    schema.weaponType = new fields.StringField({
      required: true,
      choices: SYNTHICIDE.WEAPON_TYPES[schema.weaponClass],
      initial: Object.keys(SYNTHICIDE.WEAPON_TYPES[schema.weaponClass.initial])[0]
    });
    schema.attackBonus = new fields.NumberField({...requiredInteger, initial: 0});
    schema.damageBonus = new fields.NumberField({...requiredInteger, initial: 0});
    schema.lethal = new fields.NumberField({...requiredInteger, initial: 0});
    schema.hands = new fields.NumberField({...requiredInteger, initial: 0, min: 0, max: 2, step: 1});
    schema.rangeIncrement = new fields.NumberField({...requiredInteger, initial: 0});
    schema.spread = new fields.BooleanField({ required: true, nullable:false, initial: false });
    schema.close = new fields.BooleanField({ required: true, nullable:false, initial: false });
    schema.blast = new fields.NumberField({...requiredInteger, initial: 0, min: 0, max: 5, step: 1});
    
    return schema;
  }

  /**
   * Compose the derived roll formula from structured roll fields.
   * @this {SynthicideWeapon}
   * @returns {void}
   */
  prepareDerivedData() {
    super.prepareDerivedData();
  }
}
