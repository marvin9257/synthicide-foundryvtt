import SYNTHICIDE from "../helpers/config.mjs";
/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class SynthicideActor extends Actor {

  /** @override */
  async _preUpdate(changed, options, user) {
    const allowed = await super._preUpdate(changed, options, user);
    if (allowed === false) return false;
    return allowed;
  }

  /**
   * @override
   */
  prepareDerivedData() {
    super.prepareDerivedData();
    // Only calculate derived data here; aggregation is triggered by item changes
    // Derived data for sharper actors is now handled in the data model.
    // ...existing code for other derived data...
  }

  /**
   * Queue item-modifier aggregation on the next event-loop turn.
   *
   * Why this exists:
   * - Item hooks (_onCreate/_onUpdate/_onDelete) can fire several times in a row.
   * - Running aggregation for each hook causes redundant actor updates.
   *
   * What this does:
   * 1) First call creates one scheduled aggregation task and one shared Promise.
   * 2) Additional calls before that task runs DO NOT schedule again.
   * 3) All callers receive the same Promise.
   * 4) Debug mode is sticky for the queued run: if any caller requests debug,
   *    the queued execution runs with debug enabled.
   *
   * This is a coalescing/debouncing boundary (0ms timeout), not a long delay.
   * @param {Object} [options]
   * @param {boolean} [options.debug=false]
   * @returns {Promise<void>}
   */
  scheduleModifierAggregation({ debug = false } = {}) {
    // Once debug is requested for the pending run, keep it enabled.
    this._modifierAggregationDebug = Boolean(this._modifierAggregationDebug || debug);

    // If already queued, return the same promise to all callers.
    if (this._modifierAggregationPromise) return this._modifierAggregationPromise;

    this._modifierAggregationPromise = new Promise((resolve) => {
      this._modifierAggregationResolver = resolve;
    });

    // Queue for the next task so multiple synchronous hook calls collapse.
    setTimeout(async () => {
      const shouldDebug = this._modifierAggregationDebug;
      try {
        await this.aggregateAndApplyItemModifiers({ debug: shouldDebug });
      } catch (error) {
        console.error('[Synthicide] Modifier aggregation failed', error);
      } finally {
        const resolve = this._modifierAggregationResolver;
        this._modifierAggregationDebug = false;
        this._modifierAggregationResolver = null;
        this._modifierAggregationPromise = null;
        resolve?.();
      }
    }, 0);

    return this._modifierAggregationPromise;
  }

  /**
   * Aggregate all item modifiers and apply to this actor.
   *
   * This method sums up all attribute and non-attribute modifiers from the actor's owned items,
   * applies the aggregated attribute modifiers to the actor's attributes (persisting .modifier if changed),
   * recalculates .current in memory, and applies non-attribute modifiers to arbitrary system paths.
   *
   * This should be called from item data model hooks (e.g., _onCreate, _onUpdate, _onDelete) when item changes
   * may affect actor attributes or other system data.
   *
   * @async
   * @param {Object} [options] - Options for aggregation.
   * @param {boolean} [options.debug=false] - If true, collects and outputs debug information about modifier aggregation.
   * @returns {Promise<void>} Resolves when aggregation and updates are complete.
   */
  async aggregateAndApplyItemModifiers({ debug = false } = {}) {
    const attributeKeys = Object.keys(SYNTHICIDE.attributes);
    const attributeModifiers = Object.fromEntries(attributeKeys.map(key => [key, 0]));
    const nonAttributeModifiers = [];
    let debugItemContrib = [];

    for (const item of this.items) {
      const { system: dataModel } = item || {};
      if (typeof dataModel?.aggregateAttributeModifiers !== "function") continue;
      const debugArr = debug ? [] : undefined;
      const { attributeModifiers: itemAttrMods, nonAttributeModifiers: itemNonAttrMods } =
        dataModel.aggregateAttributeModifiers(attributeKeys, debugArr);

      for (const [key, val] of Object.entries(itemAttrMods)) {
        attributeModifiers[key] += Number(val ?? 0);
      }
      if (Array.isArray(itemNonAttrMods)) nonAttributeModifiers.push(...itemNonAttrMods);
      if (debugArr && debugArr.length) debugItemContrib.push(...debugArr);
    }

    // Prepare update object for changed modifiers/current
    const updatedAttributes = {};
    for (const key of attributeKeys) {
      const attr = this.system?.attributes?.[key];
      if (!attr) continue;
      const newModifier = Number(attributeModifiers[key] ?? 0);
      const oldModifier = Number(attr.modifier ?? 0);
      if (oldModifier !== newModifier) {
        updatedAttributes[key] = { ...attr, modifier: newModifier };
      }
    }
    if (Object.keys(updatedAttributes).length > 0) {
      await this.update({ "system.attributes": updatedAttributes });
    }

    // Always recalculate current in memory after aggregation
    for (const key of attributeKeys) {
      const attr = this.system?.attributes?.[key];
      if (!attr) continue;
      attr.current = attr.base + attr.modifier + attr.increase;
    }
    if (debug) {
      this.debugModifierAggregation(attributeKeys, attributeModifiers, debugItemContrib);
    }
    this.applyNonAttributeModifiers(nonAttributeModifiers);
  }

  /**
   * @override
   * Augment the actor's default getRollData() method by appending the data object
   * generated by the its DataModel's getRollData(), or null. This polymorphic
   * approach is useful when you have actors & items that share a parent Document,
   * but have slightly different data preparation needs.
   */
  getRollData() {
    return { ...super.getRollData(), ...(this.system.getRollData?.() ?? null) };
  }

  /**
   * Output debug information for modifier aggregation.
   * @param {Array<string>} attributeKeys - The list of attribute keys.
   * @param {Object} attributeModifiers - The aggregated attribute modifiers.
   * @param {Array<Object>} debugItemContrib - The debug info array.
   */
  debugModifierAggregation(attributeKeys, attributeModifiers, debugItemContrib) {
    console.groupCollapsed(`[Synthicide] Modifier aggregation: ${this.name}`);
    console.table(
      attributeKeys.map((key) => ({
        attribute: key,
        preparedModifier: Number(
          this.system?.attributes?.[key]?.modifier - Number(attributeModifiers[key] ?? 0)
        ),
        aggregatedDelta: Number(attributeModifiers[key] ?? 0),
        finalModifier: Number(this.system?.attributes?.[key]?.modifier ?? 0),
        current: Number(this.system?.attributes?.[key]?.current ?? 0),
      }))
    );
    if (debugItemContrib.length) console.table(debugItemContrib);
    console.groupEnd();
  }

  /**
   * Apply non-attribute modifiers to any system path on the actor.
   * @param {Array<Object>} nonAttributeModifiers - The non-attribute modifiers to apply.
   */
  applyNonAttributeModifiers(nonAttributeModifiers) {
    for (const mod of nonAttributeModifiers) {
      if (!mod.target) continue;
      let path = mod.target;
      if (!path.startsWith('system.')) path = `system.${path}`;
      let current = foundry.utils.getProperty(this, path);
      if (current === undefined) current = 0;
      let newValue = current;
      if (mod.type === 'set') {
        newValue = mod.value;
      } else if (mod.type === 'penalty') {
        newValue -= mod.value ?? 0;
      } else {
        newValue += mod.value ?? 0;
      }
      foundry.utils.setProperty(this, path, newValue);
    }
  }
  
}
