// DataModels for Synthicide ChatMessage card types (v14+)
const fields = foundry.data.fields;
const requiredInteger = { required: true, nullable: false, integer: true };
const requiredBlankString = { required: true, blank: true, initial: '' };

function createSpecializationSchema() {
  return new fields.SchemaField({
    key: new fields.StringField({ required: false, blank: true, initial: '' }),
    level: new fields.NumberField({ required: false, nullable: false, integer: true, initial: 0 }),
    attackBonus: new fields.NumberField({ required: false, nullable: false, integer: true, initial: 0 }),
    damageBonus: new fields.NumberField({ required: false, nullable: false, integer: true, initial: 0 }),
    lethalBonus: new fields.NumberField({ required: false, nullable: false, integer: true, initial: 0 }),
    shockRdBonus: new fields.NumberField({ required: false, nullable: false, integer: true, initial: 0 }),
    demolitionThrow: new fields.NumberField({ required: false, nullable: false, integer: true, initial: 0 }),
    demolitionPlacement: new fields.NumberField({ required: false, nullable: false, integer: true, initial: 0 }),
    description: new fields.StringField({ required: false, blank: true, initial: '' }),
  });
}

export class BaseCardSystemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const schema = {};
    schema.actorUuid = new fields.StringField({ required: false, nullable: true, blank: true, initial: '' });
    schema.sourceItemUuid = new fields.StringField({ required: false, blank: true, initial: '' });
    schema.sourceMessageId = new fields.StringField({ required: false, blank: true, initial: '' });
    return schema;
  }
}

export class CombatCardSystemData extends BaseCardSystemData {
  static defineSchema() {
    const schema = super.defineSchema();
    schema.lethal = new fields.NumberField({...requiredInteger, initial: 0});
    schema.shockRdBonus = new fields.NumberField({ required: false, nullable: false, integer: true, initial: 0 });
    schema.hideAttributeRow = new fields.BooleanField({ required: false, initial: false });
    schema.specialization = createSpecializationSchema();
    return schema;
  }
}

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

export class ChallengeCardSystemData extends BaseCardSystemData {
  static defineSchema() {
    const schema = super.defineSchema();
    schema.attribute = new fields.StringField({...requiredBlankString});
    schema.difficulty = new fields.NumberField({...requiredInteger, initial: 0});
    schema.total = new fields.NumberField({...requiredInteger, initial: 0});
    return schema;
  }
}

export class DamageCardSystemData extends CombatCardSystemData {
  static defineSchema() {
    const schema = super.defineSchema();
    schema.total = new fields.NumberField({...requiredInteger, initial: 0});
    schema.extraDamageDice = new fields.NumberField({ required: false, nullable: false, integer: true, initial: 0 });
    schema.attributeValue = new fields.NumberField({...requiredInteger, initial: 0});
    schema.sourceItemUuid = new fields.StringField({ required: false, blank: true, initial: '' });
    schema.sourceMessageId = new fields.StringField({ required: false, blank: true, initial: '' });
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

export class ShockCardSystemData extends BaseCardSystemData {
  static defineSchema() {
    const schema = super.defineSchema();
    schema.damageRemaining = new fields.NumberField({...requiredInteger, initial: 0});
    schema.shockThreshold = new fields.NumberField({...requiredInteger, initial: 0});
    schema.rd = new fields.NumberField({...requiredInteger, initial: 0});
    schema.toughnessValue = new fields.NumberField({...requiredInteger, initial: 0});
    schema.outcome = new fields.StringField({...requiredBlankString});
    schema.lethal = new fields.NumberField({...requiredInteger, initial: 0});
    schema.rollTotal = new fields.NumberField({ required: false, initial: 0 });
    schema.d10 = new fields.NumberField({ required: false, initial: 0 });
    return schema;
  }
}
