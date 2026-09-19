import { getDieClass } from "../../rolls/roll-utils.mjs";

// DataModels for Synthicide ChatMessage card types (v14+)
const fields = foundry.data.fields;

export class BaseCardSystemData extends foundry.abstract.TypeDataModel {
  constructor(data, options) {
    super(data, options);
    this._initializeCalculations();
  }

  _initializeCalculations() {
    // Left completely blank because base-card requires no custom calculations.
  }

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

  /**
   * Assembles the base baseline visual properties shared by ALL card templates.
   * Subclasses will override and extend this method.
   * @returns {object}
   */
  get templateContext() {
    return {
      type: this.subtype ?? this.type,
      title: this.title ?? "",
      flavor: this.flavor ?? "",
      equation: this.equation ?? "",
      equationTerms: this.equationTerms ?? [],
      metadataRows: this.metadataRows ?? [],
      showTotalRow: this.showTotalRow ?? true,
      total: this.total ?? 0,
      actorName: this.actorName ?? "",
      dieValue: this.d10 ?? 0,
      dieClass: getDieClass(this.d10, 10)
    };
  }
}