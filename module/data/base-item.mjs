
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
   * @param {Array<Object>} [debugArr] - Optional array that will be pushed with debug entries when debugging.
   * @returns {{ attributeModifiers: Object, nonAttributeModifiers: Array }}
   */
  aggregateAttributeModifiers(attributeKeys, debugArr) {
    const attributeModifiers = Object.fromEntries(attributeKeys.map(k => [k, 0]));
    const nonAttributeModifiers = [];
    const mods = this.modifiers;
    if (!Array.isArray(mods)) return { attributeModifiers, nonAttributeModifiers };

    for (const { target, value = 0, type } of mods) {
      if (!target) continue;
      const normalizedTarget = String(target).replace(/^system\./, '');
      const attrKey = normalizedTarget.replace(/^attributes\./, '');
      if (attributeKeys.includes(attrKey)) {
        const modValue = Number(value);
        switch (type) {
          case 'set':
            attributeModifiers[attrKey] = modValue;
            break;
          case 'penalty':
            attributeModifiers[attrKey] -= modValue;
            break;
          default:
            attributeModifiers[attrKey] += modValue;
        }
      } else {
        nonAttributeModifiers.push({ target, value, type });
      }

      if (debugArr) {
        debugArr.push({ target, value, type, attrKey });
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
    if (!actor) return;
    const debug = Boolean(SYNTHICIDE.debug?.synthicideModifiers);
    actor.aggregateAndApplyItemModifiers({ debug });
  }


  /**
   * Foundry hook: Called when the item is created.
   */
  async _onCreate(data, options, userId) {
    super._onCreate(data, options, userId);
    if (game.userId !== userId) return;
    this.triggerActorModifierAggregation();
  }


  /**
   * Foundry hook: Called when the item is updated.
   */
  async _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);
    if (game.userId !== userId) return;
    // Only trigger aggregation if system.modifiers changed
    if (changed?.system?.modifiers) {
      this.triggerActorModifierAggregation();
    }
  }


  /**
   * Foundry hook: Called when the item is deleted.
   */
  async _onDelete(options, userId) {
    super._onDelete(options, userId);
    if (game.userId !== userId) return;
    this.triggerActorModifierAggregation();
  }
}
