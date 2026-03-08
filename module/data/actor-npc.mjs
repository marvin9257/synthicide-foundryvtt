import SynthicideActorBaseData from './base-actor.mjs'
//import {makeValueField} from './commonSchemaUtils.mjs'
import SYNTHICIDE from '../helpers/config.mjs';
const fields = foundry.data.fields;
const requiredInteger = { required: true, nullable: false, integer: true };
export default class SynthicideNPCData extends SynthicideActorBaseData {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    'SYNTHICIDE.Actor.NPC',
  ];

  static defineSchema() {
    const schema = super.defineSchema();

    // Synthicide attributes only value fields, which are editable for NPCs.
    schema.attributes = new fields.SchemaField(
      Object.keys(SYNTHICIDE.attributes).reduce((obj, attribute) => {
        obj[attribute] = new fields.SchemaField({
          value: new fields.NumberField({ ...requiredInteger, initial: 0 }),
        });
        return obj;
      }, {})
    );

    return schema;
  }

  prepareDerivedData() {
    // For NPCs, .value is editable and not derived. Only update hitPoints.max as needed.
    this.hitPoints.max = this.hitPoints.base ?? 0;
  }
}
