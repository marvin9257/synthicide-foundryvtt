import SynthicideItemBase from './base-item.mjs';

/**
 * Cargo item system model.
 *
 * DataModel context: instance methods execute on the cargo system model
 * (`item.system`), not on the Item document.
 *
 * @extends {SynthicideItemBase}
 */
export default class SynthicideCargo extends SynthicideItemBase {
  static LOCALIZATION_PREFIXES = [
    'SYNTHICIDE.Item.base',
    'SYNTHICIDE.Item.Cargo',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    schema.quantity = new fields.NumberField({ ...requiredInteger, initial: 1, min: 1 });
    schema.unitPrice = new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 });
    return schema;
  }
}
