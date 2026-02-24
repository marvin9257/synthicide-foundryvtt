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

    // Synthicide attributes only current values which are editiable for npc
    schema.attributes = new fields.SchemaField(
      Object.keys(SYNTHICIDE.attributes).reduce((obj, attribute) => {
        obj[attribute] = new fields.SchemaField({
          current: new fields.NumberField({ ...requiredInteger, initial: 0 }),
        });
        return obj;
      }, {})
    );

    return schema;
  }

  prepareDerivedData() {
    this.hitPoints.max = this.hitPoints.base ?? 0;  //Need to use .base as the entered max so datamodel is consistent
  }
}
