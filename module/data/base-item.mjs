import SYNTHICIDE from "../helpers/config.mjs";

/**
 * Base item system model.
 *
 * DataModel context: instance methods execute on the item system model
 * (`item.system`), not on the Item document.
 */
export default class SynthicideItemBase extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = {};
    schema.description = new fields.HTMLField();
    return schema;
  }

  /**
   * Aggregate attribute modifiers from this item's modifiers.
   * @this {SynthicideItemBase}
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
    * @this {SynthicideItemBase}
    * @param {{render?: boolean}} [options]
    * @returns {void}
   */
  async triggerActorModifierAggregation({ render = true } = {}) {
    const actor = this.parent?.actor;
    if (!actor) return;
    const debug = Boolean(SYNTHICIDE.debug?.synthicideModifiers);
    await actor.aggregateAndApplyItemModifiers({ debug, render });
  }

  /**
   * Foundry hook: Called when the item is created.
    * @this {SynthicideItemBase}
    * @param {object} data
    * @param {object} options
    * @param {string} userId
    * @returns {Promise<void>}
   */
  async _onCreate(data, options, userId) {
    super._onCreate(data, options, userId);
    if (game.userId !== userId) return;
    // render: false because Foundry's item-creation pipeline already re-renders
    // the owning actor sheet. For explicit drop flows (_handleGenericItemDrop),
    // aggregation is awaited separately before the sheet is rendered.
    await this.triggerActorModifierAggregation({ render: false });
  }

  /**
   * Foundry hook: Called when the item is updated.
    * @this {SynthicideItemBase}
    * @param {object} changed
    * @param {object} options
    * @param {string} userId
    * @returns {Promise<void>}
   */
  async _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);
    if (game.userId !== userId) return;
    // Only trigger aggregation if system.modifiers changed.
    // Use render:true so actor sheets reflect updated aggregated modifiers immediately.
    const changedFlat = foundry.utils.flattenObject(changed ?? {});
    const modifierChanged = Object.keys(changedFlat).some(
      (path) => path === 'system.modifiers' || path.startsWith('system.modifiers.')
    );
    if (modifierChanged) {
      await this.triggerActorModifierAggregation({ render: true });
    }
  }

  /**
   * Foundry hook: Called when the item is deleted.
    * @this {SynthicideItemBase}
    * @param {object} options
    * @param {string} userId
    * @returns {Promise<void>}
   */
  async _onDelete(options, userId) {
    super._onDelete(options, userId);
    if (game.userId !== userId) return;
    // render: false because Foundry's item-deletion pipeline already re-renders
    // the owning actor sheet; letting the actor.update() also render would cause
    // a redundant second refresh of the sheet.
    await this.triggerActorModifierAggregation({ render: false });
  }
}
