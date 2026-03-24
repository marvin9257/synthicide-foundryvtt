import SynthicideGear from './item-gear.mjs';

/**
 * Weapon item system model.
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
    'SYNTHICIDE.Item.Weapon'
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    
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
