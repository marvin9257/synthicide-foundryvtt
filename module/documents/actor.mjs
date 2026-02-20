/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class SynthicideActor extends Actor {
  /**
   * @override
   */
  prepareDerivedData() {
    super.prepareDerivedData();
    const debugModifiers = Boolean(CONFIG?.debug?.synthicideModifiers);

    // --- 1. Aggregate all modifiers from items and effects ---
    const attributeKeys = Object.keys(CONFIG.SYNTHICIDE.attributes);
    const attributeModifiers = {};
    for (const key of attributeKeys) attributeModifiers[key] = 0;
    const nonAttributeModifiers = [];
    const debugItemContrib = [];
    const debugEffectContrib = [];

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

    // Gather attribute modifiers from Active Effects (actor + item-origin)
    const applicableEffects = this.allApplicableEffects?.() ?? this.effects ?? [];
    for (const effect of applicableEffects) {
      if (effect.disabled) continue;
      const changes = effect.changes || [];
      for (const change of changes) {
        const match = change.key?.match(/^system\.attributes\.(\w+)\.modifier$/);
        if (match && attributeKeys.includes(match[1])) {
          const effectType = change.type ?? 'add';
          if (effectType !== 'add') {
            if (debugModifiers) {
              console.warn(
                `[Synthicide] Ignored non-add AE type on ${effect.name}:`,
                change.key,
                effectType,
                change.value
              );
            }
            continue;
          }
          attributeModifiers[match[1]] += Number(change.value ?? 0);
          if (debugModifiers) {
            debugEffectContrib.push({
              effect: effect.name,
              key: change.key,
              type: effectType,
              value: Number(change.value ?? 0),
              running: attributeModifiers[match[1]],
            });
          }
        }
      }
    }

    // --- 2. Apply attribute modifiers ---
    for (const key of attributeKeys) {
      if (!this.system?.attributes?.[key]) continue;
      const sourceModifier = Number(
        foundry.utils.getProperty(this._source, `system.attributes.${key}.modifier`) ?? 0
      );
      this.system.attributes[key].modifier = sourceModifier + Number(attributeModifiers[key] ?? 0);
      // Optionally, recalculate .current here if not handled by DataModel
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
          sourceModifier: Number(
            foundry.utils.getProperty(this._source, `system.attributes.${key}.modifier`) ?? 0
          ),
          aggregatedDelta: Number(attributeModifiers[key] ?? 0),
          finalModifier: Number(this.system?.attributes?.[key]?.modifier ?? 0),
          current: Number(this.system?.attributes?.[key]?.current ?? 0),
        }))
      );
      if (debugItemContrib.length) console.table(debugItemContrib);
      if (debugEffectContrib.length) console.table(debugEffectContrib);
      console.groupEnd();
    }

    // --- 3. Calculate derived data (base class or your own logic) ---
    // If you have custom derived data, do it here. Otherwise, rely on DataModel.

    // --- 4. Apply non-attribute modifiers to any system path ---
    for (const mod of nonAttributeModifiers) {
      if (!mod.target) continue;
      // Only operate on system-relative paths
      let path = mod.target;
      // Support both "health.max" and "system.health.max"
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
