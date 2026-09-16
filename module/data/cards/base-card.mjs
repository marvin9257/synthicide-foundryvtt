// DataModels for Synthicide ChatMessage card types (v14+)
const fields = foundry.data.fields;

export class BaseCardSystemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const schema = {};
    schema.actorUuid = new fields.StringField({ required: false, nullable: true, blank: true, initial: '' });
    schema.sourceItemUuid = new fields.StringField({ required: false, blank: true, initial: '' });
    schema.sourceMessageId = new fields.StringField({ required: false, blank: true, initial: '' });
    schema.subtype = new fields.StringField({ required: false, blank: true, initial: '' });
    schema.total = new fields.NumberField({ required: false, integer: true, initial: 0 });
    schema.actorName = new fields.StringField({ required: false, blank: true, initial: '' });
    schema.d10 = new fields.NumberField({ required: false, integer: true, initial: 0 });
    return schema;
  }

  get templatePath() {
    return "systems/synthicide/templates/chat/action-roll-card.hbs";
  }
}