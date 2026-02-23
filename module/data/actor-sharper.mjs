import SynthicideActorBaseData from './base-actor.mjs';
import {makeValueField} from './commonSchemaUtils.mjs'
//const fields = foundry.data.fields;
//const requiredInteger = { required: true, nullable: false, integer: true };

export default class SynthicideSharperData extends SynthicideActorBaseData {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    'SYNTHICIDE.Actor.Character',
  ];

  static defineSchema() {
    
    const schema = super.defineSchema();

    // Level field (if needed)
    schema.level = makeValueField(1);

    return schema;
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    this.hitPoints.max = this.hitPoints.base + this.hitPoints.perLevel * Math.max(0, this.level.value - 1)
  }

  getRollData() {
    // Start with base class roll data
    const data = super.getRollData ? super.getRollData() : {};

    // Copy the attribute scores to the top level, so that rolls can use
    // formulas like `@str.mod + 4`.
    if (this.attributes) {
      for (let [k, v] of Object.entries(this.attributes)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }
    data.lvl = this.level;
    return data;
  }
}
