import SYNTHICIDE from "../helpers/config.mjs";
import { createActionMessage } from "../rolls/action-rolls.mjs";
import { buildShockCardData, resolveShockOutcome } from "../rolls/shock-card-data.mjs";

const DAMAGEABLE_ACTOR_TYPES = new Set(['sharper', 'npc']);
const FLAG_DEAD = 'flags.synthicide.dead';


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
   * Equip one item of a given exclusive type, unequipping all others of that same type.
   * In order to prevent an infinite loop with Item._onUpdate, an option flag
   * (`_fromEquipLogic`) is passed to updateEmbeddedDocuments when other items are
   * being unequipped.
   * @param {string} itemType - The exclusive item type to enforce.
   * @param {string} itemId - The ID of the item to equip.
   */
  async equipExclusiveItemType(itemType, itemId) {
    const exclusiveItems = this.items.filter((item) => item.type === itemType);
    const updates = [];
    let newBarrierHP = undefined;
    for (const item of exclusiveItems) {
      if (item.id === itemId) {
        if (itemType === 'armor') newBarrierHP = item.system.forceBarrier.max;
        if (!item.system.equipped) {
          updates.push({ _id: item.id, "system.equipped": true });
        }
      } else {
        if (item.system.equipped) {
          updates.push({ _id: item.id, "system.equipped": false });
        }
      }
    }
    if (updates.length) {
      await this.updateEmbeddedDocuments("Item", updates, {render: false, _fromEquipLogic: true});
    }
    if (itemType === 'armor' && isFinite(newBarrierHP)) {
      await this.update({"system.armorValues.forceBarrier.value": newBarrierHP}, {render: false});
    }
    if (this.sheet && (updates.length || isFinite(newBarrierHP))) await this.sheet?.render(true);
  }

  /**
   * Backward-compatible armor equip wrapper.
   * @param {string} armorItemId - The ID of the armor item to equip.
   */
  async equipArmor(armorItemId) {
    return this.equipExclusiveItemType('armor', armorItemId);
  }

  /**
   * Aggregate all item modifiers and apply to this actor.
   *
   * This method sums up all attribute and non-attribute modifiers from the actor's owned items,
   * applies the aggregated attribute modifiers to the actor's attributes (persisting .modifier if changed),
   * recalculates .value in memory, and applies non-attribute modifiers to arbitrary system paths.
   *
   * This should be called from item data model hooks (e.g., _onCreate, _onUpdate, _onDelete) when item changes
   * may affect actor attributes or other system data.
   *
   * @async
   * @param {Object} [options] - Options for aggregation.
   * @param {boolean} [options.debug=false] - If true, collects and outputs debug information about modifier aggregation.
   * @returns {Promise<void>} Resolves when aggregation and updates are complete.
   */
  async aggregateAndApplyItemModifiers({ debug = false, render = true } = {}) {
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

    // Persist any modifier values that changed
    // so Foundry merges individual fields rather than replacing the whole attributes object.
    const updates = {};
    for (const key of attributeKeys) {
      const attr = this.system?.attributes?.[key];
      if (!attr) continue;
      const newModifier = Number(attributeModifiers[key] ?? 0);
      if (Number(attr.modifier ?? 0) !== newModifier) {
        updates[`system.attributes.${key}.modifier`] = newModifier;
      }
    }
    Object.assign(updates, this.buildNonAttributeModifierUpdates(nonAttributeModifiers));
    if (Object.keys(updates).length > 0) {
      await this.update(updates, { render });
    }

    // Always recalculate value in memory after aggregation
    for (const key of attributeKeys) {
      const attr = this.system?.attributes?.[key];
      if (!attr) continue;
      attr.value = attr.base + attr.modifier + attr.increase;
    }
    if (debug) {
      this.debugModifierAggregation(attributeKeys, attributeModifiers, debugItemContrib);
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
    const rollData = foundry.utils.mergeObject(
      super.getRollData(),
      this.system.getRollData?.() ?? {},
      { inplace: false, recursive: true }
    );
    return rollData;
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
        value: Number(this.system?.attributes?.[key]?.value ?? 0),
      }))
    );
    if (debugItemContrib.length) console.table(debugItemContrib);
    console.groupEnd();
  }

  /**
   * Build update payload for non-attribute modifiers.
   * @param {Array<Object>} nonAttributeModifiers - The non-attribute modifiers to apply.
   * @returns {Object} flat update payload compatible with Actor.update
   */
  buildNonAttributeModifierUpdates(nonAttributeModifiers) {
    const updates = {};
    for (const mod of nonAttributeModifiers) {
      if (!mod.target) continue;
      let path = mod.target;
      if (!path.startsWith('system.')) path = `system.${path}`;

      const stagedValue = updates[path];
      let current = stagedValue;
      if (current === undefined) current = foundry.utils.getProperty(this, path);
      if (current === undefined) current = 0;

      const numericCurrent = Number(current);
      const baseValue = Number.isFinite(numericCurrent) ? numericCurrent : 0;
      const numericModValue = Number(mod.value ?? 0);

      const newValue = mod.type === 'set'
        ? mod.value
        : mod.type === 'penalty'
          ? baseValue - numericModValue
          : baseValue + numericModValue;

      updates[path] = newValue;
    }
    return updates;
  }

  async damageActor(damage, options = {}) {
    if (!damage || !DAMAGEABLE_ACTOR_TYPES.has(this.type)) return;
    const updates = {};
    let damageRemaining = damage;
    // Apply force barrier first.
    let barrierAbsorbed = 0;
    if (this.system.armorValues?.forceBarrier.value > 0) {
      barrierAbsorbed = Math.min(this.system.armorValues.forceBarrier.value, damageRemaining);
      if (barrierAbsorbed > 0) {
        damageRemaining -= barrierAbsorbed;
        updates['system.armorValues.forceBarrier.value'] = Math.max(this.system.armorValues.forceBarrier.value - barrierAbsorbed, 0);
      }
    }

    // Compute outcomes against pre-damage HP before persisting updates.
    const preHP = Number(this.system.hitPoints.value ?? 0);
    if (damageRemaining > 0) {
      const hpDamage = Math.min(preHP, damageRemaining);
      if (hpDamage > 0) {
        updates['system.hitPoints.value'] = preHP - hpDamage;
      }
      if (game.settings.get('synthicide', SYNTHICIDE.USE_SHOCKING_STRIKE_KEY)) {
        await this._handleShockingStrike(damageRemaining, preHP, updates, { ...options, barrierAbsorbed });
      }
    }

    await this.update(updates);
  }

  async healActor(healing) {
    if (!healing || !DAMAGEABLE_ACTOR_TYPES.has(this.type)) return;
    const updates = {};
    updates['system.hitPoints.value'] = Math.min(this.system.hitPoints.value + healing, this.system.hitPoints.max);
    await this.update(updates);
  }

  /**
   * Handle shocking-strike resolution: calculates RD, performs toughness roll,
   * applies HP/death outcomes by mutating the passed `updates` object, and
   * posts the appropriate chat message and flags.
   * @param {number} damageRemaining - damage reaching HP after barriers
   * @param {number} preHitPoints - HP value before applying this damage
   * @param {Object} updates - the update payload being built by damageActor
   */
  async _handleShockingStrike(damageRemaining, preHitPoints, updates, options = {}) {
    if (!(damageRemaining > 0)) return;
    const shockThreshold = Number(this.system.shockThreshold?.value ?? 0);

    //Get attack context variables:
    //armor - target's armor value (AD - attack difficulty)
    //barrier abosorbed - amount damange barrier absorbed
    //lethal - the lethality rating of weapon making the attack
    const { armor, barrierAbsorbed, lethal } = this._resolveShockContext(options);

    // Barrier-absorbed attacks only trigger shocking strike at 2x AD.
    if (barrierAbsorbed > 0 && !(damageRemaining >= 2 * armor)) return;

    //If damage remaining does not exceed shock threshold for actor, no shocking strike
    if (!(shockThreshold > 0 && damageRemaining > shockThreshold)) return;

    const shockRollDifficulty = Math.floor(damageRemaining / 5);
    const wouldDropBelowZero = damageRemaining > preHitPoints;
    const isLethal = Number.isFinite(lethal) && lethal > 0 && armor <= lethal;

    const toughnessValue = Number(this.system.attributes?.toughness?.value ?? 0);
    let roll = null;
    let rollTotal = null;
    let success = false;

    if (!isLethal) {
      roll = await new Roll('1d10 + @attribute', { attribute: toughnessValue }).evaluate();
      rollTotal = Number(roll.total ?? 0);
      success = rollTotal > shockRollDifficulty;
    }

    const outcome = resolveShockOutcome({ isLethal, success, wouldDropBelowZero });

    // Use modular builder for shock card data
    const cardData = buildShockCardData({
      actor: this,
      options: {
        roll,
        rollTotal,
        damageRemaining,
        shockThreshold,
        rd: shockRollDifficulty,
        toughnessValue,
        outcome,
        lethal,
        armor,
        barrierAbsorbed,
      }
    });

    const { preferredMode, whisper } = this._resolveShockMessageOptions({ options, cardData });
    await createActionMessage({ actor: this, roll, cardData, messageMode: preferredMode, whisper });

    this._applyShockOutcomeUpdates({ updates, outcome });
  }

  /**
   * Resolve shock-processing context from message options and actor fallback.
   * Message attack difficulty, AD, is authoritative when present; if missing, fall back to
   * the target actor's current AD.
   * @private
   */
  _resolveShockContext(options = {}) {
    const messageArmor = Number(options?.attack?.armor ?? options?.armor ?? NaN);
    const actorArmor = Number(this.system?.armorDefense?.value ?? NaN);
    const armor = Number.isFinite(messageArmor)
      ? messageArmor
      : (Number.isFinite(actorArmor) ? actorArmor : 0);

    const barrierAbsorbed = Number(options?.barrierAbsorbed ?? 0);
    let lethal = Number(options?.attack?.lethal ?? 0);
    if (barrierAbsorbed > 0) lethal = 0;

    return { armor, barrierAbsorbed, lethal };
  }



  /**
   * Apply post-roll/non-roll shocking-strike outcomes to the pending update payload.
   * @private
   */
  _applyShockOutcomeUpdates({ updates, outcome } = {}) {
    if (outcome === SYNTHICIDE.SHOCK_OUTCOMES.SUCCESS) {
      return;
    }

    // Any failed shocking strike outcome forces HP to -1.
    updates['system.hitPoints.value'] = -1;

    if (outcome === SYNTHICIDE.SHOCK_OUTCOMES.LETHAL || outcome === SYNTHICIDE.SHOCK_OUTCOMES.DEATH) {
      updates[FLAG_DEAD] = true;
      return;
    }
  }

  /**
   * Resolve chat visibility options for shocking-strike messages.
   * @private
   */
  _resolveShockMessageOptions({ options = {}, cardData } = {}) {
    return {
      preferredMode: options?.messageMode ?? cardData?.flags?.messageMode ?? game.settings.get('core', 'messageMode'),
      whisper: options?.whisper ?? cardData?.flags?.whisper ?? undefined,
    };
  }



  /**
   * Build localized outcome flavor text for shocking strike cards.
   * @private
   */
  _buildShockOutcomeFlavor({ outcome, lethal, rollTotal, rd } = {}) {
    const key = SYNTHICIDE.SHOCK_FLAVOR_KEYS[outcome] ?? SYNTHICIDE.SHOCK_FLAVOR_KEYS[SYNTHICIDE.SHOCK_OUTCOMES.MINUS_ONE];
    if (outcome === SYNTHICIDE.SHOCK_OUTCOMES.LETHAL) {
      return game.i18n.format(key, { lethal });
    }
    return game.i18n.format(key, { roll: rollTotal, rd });
  }
}
