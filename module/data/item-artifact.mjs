import SynthicideGear from './item-gear.mjs';

/**
 * Artifact item system model.
 *
 * DataModel context: instance methods execute on the shield system model
 * (`item.system`), not on the Item document.
 *
 * Artifacts are special gear items that are historic relics and quite valuable and difficult to obtain.
 *
 * @extends {SynthicideGear}
 */
export default class SynthicideArtifact extends SynthicideGear {
  static LOCALIZATION_PREFIXES = [
    'SYNTHICIDE.Item.base',
    'SYNTHICIDE.Item.Gear',
    'SYNTHICIDE.Item.Artifact',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    schema.level = new fields.NumberField({...requiredInteger, initial: 1});
    schema.uses = new fields.SchemaField({
      unlimited: new fields.BooleanField({ required: true, nullable: false, initial: false }),
      rechargeable: new fields.BooleanField({ required: true, nullable: false, initial: false }),
      value: new fields.NumberField({ ...requiredInteger, initial: 1, min: 0 }),
      max: new fields.NumberField({ ...requiredInteger, initial: 1, min: 1 })
    });

    return schema;
  }

  prepareDerivedData() {
    super.prepareDerivedData();
  }
}
