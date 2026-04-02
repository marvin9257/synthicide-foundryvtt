import SynthicideGear from './item-gear.mjs';

/**
 * Shield item system model.
 *
 * DataModel context: instance methods execute on the shield system model
 * (`item.system`), not on the Item document.
 *
 * Shields provide a situational AD bonus against either melee or ranged
 * attacks, chosen by the bearer at the start of each exchange. Only one
 * shield may be equipped at a time (same one-equipped enforcement as armor).
 *
 * @extends {SynthicideGear}
 */
export default class SynthicideShield extends SynthicideGear {
  static LOCALIZATION_PREFIXES = [
    'SYNTHICIDE.Item.base',
    'SYNTHICIDE.Item.Gear',
    'SYNTHICIDE.Item.Shield',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    schema.adBonus = new fields.NumberField({ ...requiredInteger, initial: 0 });
    schema.modifications = new fields.SetField(new fields.StringField({ required: true, blank: false }));

    return schema;
  }

  prepareDerivedData() {
    super.prepareDerivedData();
  }
}
