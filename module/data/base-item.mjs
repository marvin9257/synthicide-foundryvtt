import SYNTHICIDE from "../helpers/config.mjs";
import { evaluateModifierForActor, resolveStacking } from "../helpers/modifier-engine.mjs";

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

    // Group evaluated modifiers by normalized target path so we can resolve
    // stacking/priority per-target before applying to attributes or other paths.
    const grouped = Object.create(null);
    for (const rawMod of mods) {
      const { target } = rawMod ?? {};
      if (!target) continue;
      const normalizedTarget = String(target).replace(/^system\./, '');
      // attrKey should be the bare attribute key (e.g. 'awareness'),
      // so strip both the leading 'attributes.' and trailing '.modifier' if present.
      const attrKey = normalizedTarget.replace(/^attributes\./, '').replace(/\.modifier$/, '');

      // Require `formula` to be present for authored modifiers; skip legacy numeric-only entries
      if (!rawMod?.formula) continue;
      const actor = this.parent?.actor ?? null;
      const evaluated = evaluateModifierForActor(rawMod, actor);
      const modValue = Number(evaluated.value ?? 0);
      const modType = evaluated.type ?? rawMod?.type;

      const entry = {
        rawTarget: target,
        normalizedTarget,
        attrKey,
        value: modValue,
        type: modType,
        stacking: rawMod?.stacking,
        // context removed: modifiers are evaluated at actor-prepare and are actor-scoped
        priority: Number(rawMod?.priority ?? 0),
        source: rawMod?.source,
        condition: rawMod?.condition,
      };

      if (!grouped[normalizedTarget]) grouped[normalizedTarget] = [];
      grouped[normalizedTarget].push(entry);

      if (debugArr) debugArr.push({ target, formula: rawMod?.formula, value: modValue, type: modType, attrKey });
    }

    // Resolve each group and apply either to attributeModifiers or nonAttributeModifiers
    for (const group of Object.values(grouped)) {

      const resolved = resolveStacking(group);
      const example = group[0];
      const attrKey = example.attrKey;
      if (attributeKeys.includes(attrKey)) {
        switch (resolved.type) {
          case 'set':
            attributeModifiers[attrKey] = resolved.value;
            break;
          case 'penalty':
            attributeModifiers[attrKey] -= resolved.value;
            break;
          default:
            attributeModifiers[attrKey] += resolved.value;
        }
      } else {
        nonAttributeModifiers.push({
          target: example.rawTarget,
          value: resolved.value,
          type: resolved.type,
          source: group.map(g => g.source).filter(Boolean).join(', '),
          condition: group.map(g => g.condition).filter(Boolean).join('; '),
          stacking: group[0].stacking,
          priority: group.reduce((m, g) => Math.max(m, g.priority ?? 0), 0),
        });
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
    //render:true???????
    await this.triggerActorModifierAggregation({ render: true });
  }
}
