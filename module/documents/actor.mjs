import SYNTHICIDE from "../helpers/config.mjs";
import { createActionMessage } from "../rolls/action-rolls.mjs";
import { buildShockCardData, resolveShockOutcome } from "../rolls/shock-card-data.mjs";

const DAMAGEABLE_ACTOR_TYPES = new Set(['sharper', 'npc']);


/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class SynthicideActor extends foundry.documents.Actor {

  /** @override */
  async _preUpdate(changed, options, user) {
    const allowed = await super._preUpdate(changed, options, user);
    if (allowed === false) return false;

    if (foundry.utils.hasProperty(changed, 'system.hitPoints.value')) {
      const nextHP = Number(foundry.utils.getProperty(changed, 'system.hitPoints.value') ?? 0);
      let maxHP = Number(foundry.utils.getProperty(changed, 'system.hitPoints.max'));
      if (isNaN(maxHP)) maxHP = Number(this.system?.hitPoints?.max ?? 0);
      foundry.utils.setProperty(changed, 'system.hitPoints.value', Math.min(maxHP, nextHP));
      foundry.utils.setProperty(changed, 'system.hitPoints.previous', this.system.hitPoints.value);
    }

    const hasBarrierValue = foundry.utils.hasProperty(changed, 'system.armorValues.forceBarrier.value');
    const hasBarrierMax = foundry.utils.hasProperty(changed, 'system.armorValues.forceBarrier.max');
    if (hasBarrierValue || hasBarrierMax) {
      let maxBarrier = Number(foundry.utils.getProperty(changed, 'system.armorValues.forceBarrier.max'));
      if (isNaN(maxBarrier)) maxBarrier = Number(this.system?.armorValues?.forceBarrier?.max ?? 0);
      maxBarrier = Math.max(0, maxBarrier);
      if (hasBarrierMax) {
        foundry.utils.setProperty(changed, 'system.armorValues.forceBarrier.max', maxBarrier);
      }

      const nextBarrier = hasBarrierValue
        ? Number(foundry.utils.getProperty(changed, 'system.armorValues.forceBarrier.value') ?? 0)
        : Number(this.system?.armorValues?.forceBarrier?.value ?? 0);
      const clampedBarrier = Math.clamp(Number.isFinite(nextBarrier) ? nextBarrier : 0, 0, maxBarrier);
      foundry.utils.setProperty(changed, 'system.armorValues.forceBarrier.value', clampedBarrier);
    }
    return allowed;
  }

  /** @override */
  async _onUpdate(changed, options, user) {
    await super._onUpdate?.(changed, options, user);

    // Only the client that initiated the change should apply actor-level toggles
    if (user !== game.user.id) return;

    const hpPath = "system.hitPoints.value";

    // If HP isn't part of the change, nothing more to do here.
    if (!foundry.utils.hasProperty(changed, hpPath)) return;

    const currHP = foundry.utils.getProperty(changed, hpPath);
    const prevHP = this.system.hitPoints.previous;
    if (prevHP === currHP) return;

    const actorIsDead = this.statuses?.has("dead");
    const actorIsBleeding = this.statuses?.has("bleeding");

    // Recovery: above 0 clears downed/dead
    if (currHP > 0) {
      if (actorIsBleeding) await this.toggleStatusEffect("bleeding", { active: false });
      if (actorIsDead) await this.toggleStatusEffect("dead", { active: false });
      return;
    }

    // Immediate death: was already bleeding and took additional damage (HP dropped further)
    if (prevHP <= 0 && currHP < prevHP /* && actorIsBleeding*/) {
      if (actorIsBleeding) await this.toggleStatusEffect("bleeding", { active: false });
      if (!actorIsDead) await this.toggleStatusEffect("dead", { active: true });
      return;
    }

    // Otherwise, ensure bleeding is applied when HP <= 0 (but don't auto-kill)
    if (currHP <= 0 && !actorIsBleeding && !actorIsDead) {
      await this.toggleStatusEffect("bleeding", { active: true });
    }
  }

  /**
   * @param {string} attribute    The characteristic attribute (full name) being changed or generic "hits" attribute
   * @param {number} value  The change to the attribute (either a delta or direct value)
   * @param {boolean} isDelta Whether the value is a delta or an absolute number
   * @param {boolean} isBar Whether the value is a bar on token
   * @returns {Promise}
   */
  async modifyTokenAttribute(attribute, value, isDelta, isBar) {
    //Must override hipPoints to allow negative values, super clamps a min at zero
    if (attribute === 'hitPoints') {
      const attr = foundry.utils.getProperty(this.system, attribute);
      const current = isBar ? attr.value : attr;
      const update = isDelta ? current + value : value;
      if ( update === current ) return this;

      // Determine the updates to make to the actor data
      let updates;
      //override clamp preventing negative values
      if ( isBar ) updates = {[`system.${attribute}.value`]: Math.min(update, attr.max)};
      else updates = {[`system.${attribute}`]: update};

      this.update(updates);
    } else {
      return super.modifyTokenAttribute(attribute, value, isDelta, isBar);
    }
    
  }

  /**
   * @override
   */
  prepareDerivedData() {
    // Delegates to the DataModel; in-memory aggregation now occurs in
    // `BaseData.prepareDerivedData` to ensure derived calculations see
    // modifiers during the data-model lifecycle.
    super.prepareDerivedData();
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
   * @override
   * Augment the actor's default getRollData() method by appending the data object
   * generated by the its DataModel's getRollData(), or null. This polymorphic
   * approach is useful when you have actors & items that share a parent Document,
   * but have slightly different data preparation needs.
   */
  getRollData() {
    // Deep clone both sources to ensure all properties are mutable
    const base = foundry.utils.duplicate(super.getRollData());
    const system = foundry.utils.duplicate(this.system.getRollData?.() ?? {});
    const rollData = foundry.utils.mergeObject(
      base,
      system,
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
  // debugModifierAggregation removed: aggregation is no longer supported.

  /**
   * Build update payload for non-attribute modifiers.
   * @param {Array<Object>} nonAttributeModifiers - The non-attribute modifiers to apply.
   * @returns {Object} flat update payload compatible with Actor.update
   */
  // buildNonAttributeModifierUpdates removed: aggregation is no longer supported.

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

    // Compute outcomes if not dead.
    const preHP = Number(this.system.hitPoints.value ?? 0);

    if (damageRemaining > 0 && !this.statuses?.has("dead")) {
      updates['system.hitPoints.value'] = preHP - damageRemaining;

      if (game.settings.get('synthicide', SYNTHICIDE.USE_SHOCKING_STRIKE_KEY)) {
        const outcome = await this._handleShockingStrike(damageRemaining, preHP, updates, { ...options, barrierAbsorbed });
        if (outcome === SYNTHICIDE.SHOCK_OUTCOMES.LETHAL || outcome === SYNTHICIDE.SHOCK_OUTCOMES.DEATH) {
          if (!this.statuses?.has("dead")) {
            await this.toggleStatusEffect("dead", { active: true });
          }
        }
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

    // Return the computed outcome so callers can apply client-only visuals.
    return outcome;
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
    let lethal = Number( options?.attack?.lethal ?? options?.lethal ?? 0);
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
