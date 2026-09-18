import { CombatCardSystemData } from "./cards/combat-card.mjs";

// DataModels for Synthicide ChatMessage card types (v14+)
const fields = foundry.data.fields;
const requiredInteger = { required: true, nullable: false, integer: true };


export class DemolitionCardSystemData extends CombatCardSystemData {
  static defineSchema() {
    const schema = super.defineSchema();
    schema.d10 = new fields.NumberField({...requiredInteger, initial: 0});
    schema.total = new fields.NumberField({...requiredInteger, initial: 0});
    schema.damageBonus = new fields.NumberField({...requiredInteger, initial: 0});
    schema.placedTemplateUuid = new fields.StringField({ required: false, blank: true, initial: '' });
    schema.mode = new fields.StringField({ required: false, blank: true, initial: '' });
    schema.damageAttributeValue = new fields.NumberField({ required: false, nullable: false, integer: true, initial: 0 });
    return schema;
  }
}
