import { localize } from "../../rolls/roll-utils.mjs";
import { BaseCardSystemData } from "./base-card.mjs";

const fields = foundry.data.fields;

/**
 * Document-Driven card for non-weapon item rolls and plain item descriptions.
 * Subtype "itemDescription" renders only a flavor blurb; "itemRoll" renders a dice roll with equation terms.
 */
export class ItemCardSystemData extends BaseCardSystemData {
  static defineSchema() {
    const schema = super.defineSchema();
    schema.itemName = new fields.StringField({ required: false, blank: true, initial: '' });
    schema.itemType = new fields.StringField({ required: false, blank: true, initial: '' });
    schema.description = new fields.StringField({ required: false, blank: true, initial: '' });
    schema.formula = new fields.StringField({ required: false, blank: true, initial: '' });
    schema.storedEquationTerms = new fields.ArrayField(new fields.ObjectField(), { required: false, initial: [] });
    return schema;
  }

  get isDescriptionOnly() {
    return this.subtype === "itemDescription";
  }

  get title() {
    return this.isDescriptionOnly
      ? localize('SYNTHICIDE.Roll.Card.ItemDescription', { type: this.itemType, name: this.itemName })
      : localize('SYNTHICIDE.Roll.Card.ItemRoll', { type: this.itemType, name: this.itemName });
  }

  get flavor() {
    return this.isDescriptionOnly ? this.description : '';
  }

  get showTotalRow() {
    return !this.isDescriptionOnly;
  }

  get equation() {
    if (this.isDescriptionOnly) return '';
    return String(this.parent?.roll?.result || this.parent?.roll?.formula || '');
  }

  get equationTerms() {
    return this.storedEquationTerms ?? [];
  }

  get metadataRows() {
    if (this.isDescriptionOnly || !this.formula) return [];
    return [
      { label: 'Formula', valueHtml: `<code>${foundry.utils.escapeHTML(this.formula)}</code>` }
    ];
  }

  /** @override */
  get templateContext() {
    return {
      ...super.templateContext,
      showEffectOutcomeRow: false,
      showDamageButton: false,
      showOpposedButton: false
    };
  }
}
