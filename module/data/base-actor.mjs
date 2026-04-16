import SYNTHICIDE from '../helpers/config.mjs';
import {
  makeValueField,
  makeDerivedField,
  makeImplantSlotsField,
  getImplantSlotSummary,
} from './commonSchemaUtils.mjs';
export default class SynthicideActorBaseData extends foundry.abstract
  .TypeDataModel {
  static LOCALIZATION_PREFIXES = ["SYNTHICIDE.Actor.base"];
  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = {};
    
    // Level field
    schema.level = makeValueField(1);

    schema.hitPoints = new fields.SchemaField({
      value: new fields.NumberField({...requiredInteger, initial: 20}), //barrier HP, left as 'value' to allow resource use for fvtt
      max: new fields.NumberField({ ...requiredInteger, initial: 20 }, {persisted: false}),
      base: new fields.NumberField({ ...requiredInteger, initial: 20 }),
      perLevel: new fields.NumberField({ ...requiredInteger, initial: 5 }),
      modifier: new fields.NumberField({ ...requiredInteger, initial: 0 })
    });

    schema.actionPoints = makeDerivedField();
    schema.toughnessDefense = makeDerivedField();
    schema.armorDefense = makeDerivedField();
    schema.nerveDefense = makeDerivedField();
    schema.shockThreshold = makeDerivedField();
    schema.battleReflex = makeDerivedField();
    schema.implantSlots = makeImplantSlotsField();

    schema.biography = new fields.HTMLField();

    return schema;
  }

  prepareDerivedData() {
    // Apply aggregated item modifiers into the DataModel in-memory before
    // running derived-data calculations so derived fields see up-to-date
    // modifiers on initial load.
    try {
      if (this.parent && typeof this.parent.computeAggregatedItemModifiers === 'function') {
        const attributeKeys = Object.keys(SYNTHICIDE.attributes);
        const { attributeModifiers, nonAttributeModifiers } = this.parent.computeAggregatedItemModifiers(attributeKeys, { debug: false });

        // Apply attribute modifiers into this DataModel (in-memory)
        for (const key of Object.keys(attributeModifiers)) {
          const newModifier = Number(attributeModifiers[key] ?? 0);
          if (this.attributes && Object.prototype.hasOwnProperty.call(this.attributes, key)) {
            if (Object.prototype.hasOwnProperty.call(this.attributes[key], 'modifier')) {
              this.attributes[key].modifier = newModifier;
            }
          }
        }

        // Recalculate attribute.value in-memory for attributes that use base/modifier/increase
        for (const key of attributeKeys) {
          const attr = this.attributes?.[key];
          if (!attr) continue;
          if (Object.hasOwn(attr, 'base') && Object.hasOwn(attr, 'modifier') && Object.hasOwn(attr, 'increase')) {
            attr.value = Number(attr.base ?? 0) + Number(attr.modifier ?? 0) + Number(attr.increase ?? 0);
          }
        }

        // Apply non-attribute modifier targets into this DataModel in-memory
        if (typeof this.parent.buildNonAttributeModifierUpdates === 'function') {
          const nonAttrUpdates = this.parent.buildNonAttributeModifierUpdates(nonAttributeModifiers);
          for (const [path, val] of Object.entries(nonAttrUpdates)) {
            let inner = path;
            if (inner.startsWith('system.')) inner = inner.slice(7);
            foundry.utils.setProperty(this, inner, val);
          }
        }
      }
    } catch (err) {
      console.warn('[Synthicide] Error applying aggregated modifiers in DataModel.prepareDerivedData', err);
    }

    super.prepareDerivedData();
    if (this.attributes) {
      for (const key in this.attributes) {
        this.attributes[key].label =
          game.i18n.localize(SYNTHICIDE.attributes[key]) ?? key;
      }
    }
    foundry.utils.mergeObject(this.implantSlots, getImplantSlotSummary(this.parent));
  }


  /**
   * Prepare flattened roll data, exposing attributes at the top level.
   * @override
   * @returns {Object} The roll data object.
   */
  getRollData() {
    // Return a plain, deeply cloned object to avoid read-only property assignment errors
    return foundry.utils.duplicate(this.toObject ? this.toObject() : this);
  }
}
