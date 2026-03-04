import SynthicideItemBase from './base-item.mjs';

/**
 * Gear item system model.
 *
 * DataModel context: instance methods execute on the gear system model
 * (`item.system`), not on the Item document.
 *
 * @extends {SynthicideItemBase}
 */
export default class SynthicideGear extends SynthicideItemBase {
  static LOCALIZATION_PREFIXES = [
    'SYNTHICIDE.Item.base',
    'SYNTHICIDE.Item.Gear',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    schema.quantity = new fields.NumberField({
      ...requiredInteger,
      initial: 1,
      min: 1,
    });
    schema.weight = new fields.NumberField({
      required: true,
      nullable: false,
      initial: 0,
      min: 0,
    });

    // Break down roll formula into three independent fields
    schema.roll = new fields.SchemaField({
      diceNum: new fields.NumberField({
        ...requiredInteger,
        initial: 1,
        min: 1,
      }),
      diceSize: new fields.StringField({ initial: 'd10' }),
      diceBonus: new fields.StringField({
        initial: '+ @attributes.combat.current',
      }),
    });

    // Derived in prepareDerivedData — never needs to be stored in the database.
    schema.formula = new fields.StringField({ blank: true, initial: '' }, { persisted: false });

    return schema;
  }

  /**
   * Compose the derived roll formula from structured roll fields.
   * @this {SynthicideGear}
   * @returns {void}
   */
  prepareDerivedData() {
    // Build the formula dynamically using string interpolation
    const roll = this.roll;

    this.formula = `${roll.diceNum}${roll.diceSize}${roll.diceBonus}`;
  }
}
