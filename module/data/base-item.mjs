
import SYNTHICIDE from "../helpers/config.mjs";

export default class SynthicideItemBase extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = {};
    schema.description = new fields.HTMLField();
    return schema;
  }

  /**
   * Aggregate attribute modifiers from this item's modifiers.
   * @param {Array<string>} attributeKeys - The list of attribute keys.
   * @returns {{ attributeModifiers: Object, nonAttributeModifiers: Array }}
   */
  aggregateAttributeModifiers(attributeKeys) {
    const attributeModifiers = Object.fromEntries(attributeKeys.map(key => [key, 0]));
    const nonAttributeModifiers = [];
    if (!Array.isArray(this.modifiers)) return { attributeModifiers, nonAttributeModifiers };
    for (const mod of this.modifiers) {
      if (!mod || !mod.target) continue;
      const normalizedTarget = String(mod.target).replace(/^system\./, '');
      const attrKey = normalizedTarget.replace(/^attributes\./, '');
      if (attributeKeys.includes(attrKey)) {
        const modValue = Number(mod.value ?? 0);
        if (mod.type === 'set') attributeModifiers[attrKey] = modValue;
        else if (mod.type === 'penalty') attributeModifiers[attrKey] -= modValue;
        else attributeModifiers[attrKey] += modValue;
      } else {
        nonAttributeModifiers.push(mod);
      }
    }
    return { attributeModifiers, nonAttributeModifiers };
  }


  /**
   * Trigger aggregation and application of all item modifiers on the parent actor.
   * This should be called in item hooks when an item changes.
   */
  triggerActorModifierAggregation() {
    const actor = this.parent?.actor;
    if (!actor || typeof actor.aggregateAndApplyItemModifiers !== "function") return;
    const debug = Boolean(SYNTHICIDE.debug?.synthicideModifiers);
    actor.aggregateAndApplyItemModifiers({ debug });
  }


  /**
   * Foundry hook: Called when the item is created.
   */
  async _onCreate(data, options, userId) {
    if (game.userId !== userId) return;
    await super._onCreate(data, options, userId);
    this.triggerActorModifierAggregation();
  }


  /**
   * Foundry hook: Called when the item is updated.
   */
  async _onUpdate(changed, options, userId) {
    if (game.userId !== userId) return;
    await super._onUpdate(changed, options, userId);
    // Only trigger aggregation if system.modifiers changed
    if (changed?.system?.modifiers) {
      this.triggerActorModifierAggregation();
    }
  }


  /**
   * Foundry hook: Called when the item is deleted.
   */
  async _onDelete(options, userId) {
    if (game.userId !== userId) return;
    await super._onDelete(options, userId);
    this.triggerActorModifierAggregation();
  }
}
