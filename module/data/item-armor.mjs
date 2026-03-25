import SynthicideGear from './item-gear.mjs';

/**
 * Armor item system model.
 *
 * DataModel context: instance methods execute on the armor system model
 * (`item.system`), not on the Item document.
 *
 * @extends {SynthicideGear}
 */
export default class SynthicideArmor extends SynthicideGear {
  static LOCALIZATION_PREFIXES = [
    'SYNTHICIDE.Item.base',
    'SYNTHICIDE.Item.Gear',
    'SYNTHICIDE.Item.Armor'
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    schema.armorBonus = new fields.NumberField({...requiredInteger, initial: 0});
    schema.stBonus = new fields.NumberField({...requiredInteger, initial: 0});
    schema.speedMax = new fields.NumberField({...requiredInteger, initial: 0});
    schema.forceBarrier= new fields.SchemaField({
      max: new fields.NumberField({...requiredInteger, initial: 0}),
      recoveryRate: new fields.NumberField({...requiredInteger, initial: 0}),
      rechargeTime: new fields.NumberField({...requiredInteger, initial: 0})
    });
    schema.modifications = new fields.SetField(new fields.StringField({ required: true, blank: false }));

    return schema;
  }

  /**
   * Compose the derived roll formula from structured roll fields.
   * @this {SynthicideArmor}
   * @returns {void}
   */
  prepareDerivedData() {
    super.prepareDerivedData();
  }
}
