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

    const cynicismPath = 'system.cynicism';
    if (foundry.utils.hasProperty(changed, cynicismPath)) {
      const nextCynicism = Number(foundry.utils.getProperty(changed, cynicismPath) ?? 0);
      foundry.utils.setProperty(changed, cynicismPath, Math.max(0, Math.min(10, nextCynicism)));
    }

    const resolvePath = 'system.resolve';
    if (foundry.utils.hasProperty(changed, resolvePath)) {
      const nextResolve = Number(foundry.utils.getProperty(changed, resolvePath) ?? 0);
      foundry.utils.setProperty(changed, resolvePath, Math.max(0, Math.min(5, nextResolve)));
    }
  }

  /**
   * @override
   */
  prepareDerivedData() {
    super.prepareDerivedData();
    const debugModifiers = Boolean(SYNTHICIDE.debug?.synthicideModifiers);

    // --- 1. Aggregate modifiers from item-defined custom modifiers ---
    const attributeKeys = Object.keys(SYNTHICIDE.attributes);
    const attributeModifiers = {};
    for (const key of attributeKeys) attributeModifiers[key] = 0;
    const nonAttributeModifiers = [];
    const debugItemContrib = [];

    // Gather modifiers from items
    for (const item of this.items) {
      if (!Array.isArray(item.system?.modifiers)) continue;
      for (const mod of item.system.modifiers) {
        if (!mod || !mod.target) continue;
        const normalizedTarget = String(mod.target).replace(/^system\./, '');
        const attrKey = normalizedTarget.replace(/^attributes\./, '');
        // Attribute modifier (supports "awareness" and "attributes.awareness")
        if (attributeKeys.includes(attrKey)) {
          const modValue = Number(mod.value ?? 0);
          // Only process attribute mods here
          if (mod.type === 'set') {
            attributeModifiers[attrKey] = modValue;
          } else if (mod.type === 'penalty') {
            attributeModifiers[attrKey] -= modValue;
          } else {
            attributeModifiers[attrKey] += modValue;
          }
          if (debugModifiers) {
            debugItemContrib.push({
              item: item.name,
              target: attrKey,
              type: mod.type ?? 'bonus',
              value: modValue,
              running: attributeModifiers[attrKey],
            });
          }
        } else {
          // Non-attribute mods handled later
          nonAttributeModifiers.push(mod);
        }
      }
    }

    // --- 2. Apply item attribute modifiers on top of prepared data ---
    for (const key of attributeKeys) {
      if (!this.system?.attributes?.[key]) continue;
      const existingModifier = Number(this.system.attributes[key].modifier ?? 0);
      this.system.attributes[key].modifier = existingModifier + Number(attributeModifiers[key] ?? 0);
      this.system.attributes[key].current =
        this.system.attributes[key].base +
        this.system.attributes[key].modifier +
        this.system.attributes[key].increase;
    }

    if (debugModifiers) {
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

    // --- 3. Calculate derived data (base class or your own logic) ---
    // Put formula-style derived values here (for example: health.max from attributes/level).
    // This runs after item attribute modifiers are applied above, so formulas can use final
    // attribute values. If a derived value should also include direct non-attribute overrides
    // from item modifiers (section 4), do a final recompute after section 4.
    if (this.type === "sharper") {
      this.system.foodDays.min = -(6 + (this.system.attributes.toughness.current ?? 0));
    }
    
    // --- 4. Apply non-attribute modifiers to any system path ---
    // Use this for direct path mutations like "health.max", "power.value", etc.
    // These are applied after section 3 and may overwrite/adjust values calculated there.
    for (const mod of nonAttributeModifiers) {
      if (!mod.target) continue;
      // Only operate on system-relative paths
      let path = mod.target;
      // Support both "health.max" and "system.hitPoints.max"
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
}
