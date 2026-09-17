import { CombatCardSystemData } from "./cards/combat-card.mjs";

// DataModels for Synthicide ChatMessage card types (v14+)
const fields = foundry.data.fields;
const requiredInteger = { required: true, nullable: false, integer: true };
const requiredBlankString = { required: true, blank: true, initial: '' };

export class AttackCardSystemData extends CombatCardSystemData {
  static defineSchema() {
    const schema = super.defineSchema();
    schema.armor = new fields.NumberField({...requiredInteger, initial: 0});
    schema.damageBonus = new fields.NumberField({...requiredInteger, initial: 0});
    schema.attribute = new fields.StringField({...requiredBlankString});
    schema.attributeValue = new fields.NumberField({...requiredInteger, initial: 0});
    schema.d10 = new fields.NumberField({...requiredInteger, initial: 0});
    schema.hit = new fields.BooleanField({ required: true, initial: false });
    schema.isPlantedDemolitionAttack = new fields.BooleanField({ required: false, initial: false });
    schema.extraDamageDice = new fields.NumberField({ required: false, nullable: false, integer: true, initial: 0 });
    schema.baneDamageBonus = new fields.NumberField({ required: false, nullable: false, integer: true, initial: 0 });
    schema.slugShotActive = new fields.BooleanField({ required: false, initial: false });
    schema.specialAmmoUsed = new fields.StringField({ required: false, blank: true, initial: '' });
    return schema;
  }
}


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
