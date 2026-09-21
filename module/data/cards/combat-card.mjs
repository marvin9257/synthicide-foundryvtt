import { BaseCardSystemData } from "./base-card.mjs";

const fields = foundry.data.fields;
const requiredInteger = { required: true, nullable: false, integer: true };

/**
 * Clean Schema Factory to mirror structural requirements from core configuration.
 * Aligns specialization payloads cleanly with internal helper maps.
 * @private
 */
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

/**
 * MIDDLE-TIER MODEL: CombatCardSystemData
 * Bridges the gap between Base Cards and all tactical combat variants (Attack, Damage, Demolition).
 * Natively provides lethal and weapon proficiency specialization layers.
 */
export class CombatCardSystemData extends BaseCardSystemData {
  prepareDerivedData() {
    super.prepareDerivedData();
  }

  /** @override */
  async getHTML(html, options = {}) {
    // Pass execution cleanly up to BaseCardSystemData
    await super.getHTML(html, options);
  }

  static defineSchema() {
    const schema = super.defineSchema(); // Inherits actorUuid, actorName, total, subtype, d10, etc.
    
    schema.lethal = new fields.NumberField({...requiredInteger, initial: 0});
    schema.shockRdBonus = new fields.NumberField({ required: false, nullable: false, integer: true, initial: 0 });
    schema.hideAttributeRow = new fields.BooleanField({ required: false, initial: false });
    schema.specialization = createSpecializationSchema(); // Keep your existing sub-schema layout
    
    // Core shared transient parameters inherited safely by Attack and Demolition
    schema.misc = new fields.NumberField({ required: false, integer: true, initial: 0 });
    schema.modifiers = new fields.NumberField({ required: false, integer: true, initial: 0 });
    schema.rangeModifier = new fields.NumberField({ required: false, integer: true, initial: 0 });
    schema.attackBonus = new fields.NumberField({ required: false, integer: true, initial: 0 });
    schema.attribute = new fields.StringField({ required: false, blank: true, initial: 'combat' });
    schema.attributeValue = new fields.NumberField({ required: false, integer: true, initial: 0 });
    
    return schema;
  }

}
