// DataModels for Synthicide ChatMessage card types (v14+)
const fields = foundry.data.fields;
const requiredInteger = { required: true, nullable: false, integer: true };
const requiredBlankString = { required: true, blank: true, initial: '' };

export class AttackCardSystemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const schema = {};
    schema.armor = new fields.NumberField({...requiredInteger, initial: 0});
    schema.damageBonus = new fields.NumberField({...requiredInteger, initial: 0});
    schema.attribute = new fields.StringField({...requiredBlankString});
    schema.attributeValue = new fields.NumberField({...requiredInteger, initial: 0});
    schema.d10 = new fields.NumberField({...requiredInteger, initial: 0});
    schema.hit = new fields.BooleanField({ required: true, initial: false });
    schema.lethal = new fields.NumberField({...requiredInteger, initial: 0});
    schema.actorUuid = new fields.StringField({ required: true, blank: false, initial: '' });
    return schema;
  }
}

export class ChallengeCardSystemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const schema = {};
    schema.attribute = new fields.StringField({...requiredBlankString});
    schema.difficulty = new fields.NumberField({...requiredInteger, initial: 0});
    schema.total = new fields.NumberField({...requiredInteger, initial: 0});
    schema.actorUuid = new fields.StringField({ required: true, blank: false, initial: '' });
    return schema;
  }
}

export class DamageCardSystemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const schema = {};
    schema.total = new fields.NumberField({...requiredInteger, initial: 0});
    schema.lethal = new fields.NumberField({...requiredInteger, initial: 0});
    schema.sourceItemUuid = new fields.StringField({ required: false, blank: true, initial: '' });
    schema.sourceMessageId = new fields.StringField({ required: false, blank: true, initial: '' });
    return schema;
  }
}

export class DemolitionCardSystemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const schema = {};
    schema.d10 = new fields.NumberField({...requiredInteger, initial: 0});
    schema.total = new fields.NumberField({...requiredInteger, initial: 0});
    schema.damageBonus = new fields.NumberField({...requiredInteger, initial: 0});
    schema.lethal = new fields.NumberField({...requiredInteger, initial: 0});
    schema.actorUuid = new fields.StringField({ required: true, blank: false, initial: '' });
    schema.sourceItemUuid = new fields.StringField({ required: false, blank: true, initial: '' });
    schema.sourceMessageId = new fields.StringField({ required: false, blank: true, initial: '' });
    return schema;
  }
}

export class ShockCardSystemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const schema = {};
    schema.damageRemaining = new fields.NumberField({...requiredInteger, initial: 0});
    schema.shockThreshold = new fields.NumberField({...requiredInteger, initial: 0});
    schema.rd = new fields.NumberField({...requiredInteger, initial: 0});
    schema.toughnessValue = new fields.NumberField({...requiredInteger, initial: 0});
    schema.outcome = new fields.StringField({...requiredBlankString});
    schema.lethal = new fields.NumberField({...requiredInteger, initial: 0});
    schema.rollTotal = new fields.NumberField({ required: false, initial: 0 });
    schema.d10 = new fields.NumberField({ required: false, initial: 0 });
    schema.actorUuid = new fields.StringField({ required: true, blank: false, initial: '' });
    schema.sourceItemUuid = new fields.StringField({ required: false, blank: true, initial: '' });
    schema.sourceMessageId = new fields.StringField({ required: false, blank: true, initial: '' });
    return schema;
  }
}
