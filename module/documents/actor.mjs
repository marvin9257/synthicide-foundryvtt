import SYNTHICIDE from "../helpers/config.mjs";
import { createActionMessage } from "../rolls/action-rolls.mjs";
import { buildShockCardData, resolveShockOutcome } from "../rolls/shock-card-data.mjs";
import { resolveAmmoOnHitEffects } from "../rolls/ammo-effects.mjs";

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
      if (!Number.isFinite(maxHP)) maxHP = Number(this.system.hitPoints.max ?? 0);
      maxHP = Math.max(0, maxHP);
      foundry.utils.setProperty(changed, 'system.hitPoints.value', Math.min(maxHP, nextHP));
      foundry.utils.setProperty(changed, 'system.hitPoints.previous', this.system.hitPoints.value);
    }

    const valuePath = 'system.armorValues.forceBarrier.value';
    const maxPath = 'system.armorValues.forceBarrier.max';
    const hasBarrierValue = foundry.utils.hasProperty(changed, valuePath);
    const hasBarrierMax = foundry.utils.hasProperty(changed, maxPath);
    if (hasBarrierValue || hasBarrierMax) {
      // Normalize max and persist the normalized max into the change payload
      let maxBarrier = Number(foundry.utils.getProperty(changed, maxPath));
      if (!Number.isFinite(maxBarrier)) maxBarrier = Number(this.system.armorValues?.forceBarrier?.max ?? 0);
      maxBarrier = Math.max(0, maxBarrier);
      if (hasBarrierMax) foundry.utils.setProperty(changed, maxPath, maxBarrier);

      // Resolve the current/next barrier value (prefer explicit changed value)
      const rawNext = foundry.utils.getProperty(changed, valuePath);
      const nextBarrier = Number(rawNext ?? this.system.armorValues?.forceBarrier?.value ?? 0);
      const clampedBarrier = Math.clamp(Number.isFinite(nextBarrier) ? nextBarrier : 0, 0, maxBarrier);

      // Always write the clamped value into the change payload so reductions to max
      // (for example unequipping armor) force the stored value to be clamped.
      foundry.utils.setProperty(changed, valuePath, clampedBarrier);
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
   * Return a mutable roll-data snapshot while invoking system roll-data shaping
   * only once.
   */
  getRollData() {
    // this.system is the fully prepared DataModel — no serialization needed
    const system = this.system;
    const data = foundry.utils.duplicate(super.getRollData()); // plain obj via core

    // Attribute convenience keys (long names)
    try {
      const attrMap = SYNTHICIDE.attributes ?? {};
      for (const [key, attr] of Object.entries(system.attributes ?? {})) {
        const longKey = game.i18n.localize(attrMap[key]);
        data[key] = { value: Number(attr?.value ?? 0) };
        if (typeof longKey === 'string' && attr?.value !== undefined)
          data[longKey] = attr.value;
      }
    } catch (err) { console.error('getRollData: attribute keys failed', err); }

    // Derived stat shorthands
    data.AD = system.armorDefense?.value;
    data.TD = system.toughnessDefense?.value;
    data.ND = system.nerveDefense?.value;
    data.BR = system.battleReflex?.value;
    data.AP = system.actionPoints?.value;
    data.ST = system.shockThreshold?.value;
    data.lvl = system.level?.value;

    return data;
  }

  async damageActor(damage, options = {}) {
    if (!damage || !DAMAGEABLE_ACTOR_TYPES.has(this.type)) return;
    const normalizedOptions = {
      ...options,
      specialAmmoUsed: String(options?.specialAmmoUsed ?? 'none'),
    };
    const isFlashAmmo = normalizedOptions.specialAmmoUsed === 'flash';
    const updates = {};
    let damageRemaining = damage;
    // Apply force barrier first.
    let barrierAbsorbed = 0;
    if (!isFlashAmmo && this.system.armorValues?.forceBarrier.value > 0) {
      barrierAbsorbed = Math.min(this.system.armorValues.forceBarrier.value, damageRemaining);
      if (barrierAbsorbed > 0) {
        damageRemaining -= barrierAbsorbed;
        updates['system.armorValues.forceBarrier.value'] = Math.max(this.system.armorValues.forceBarrier.value - barrierAbsorbed, 0);
      }
    }

    // Compute outcomes if not dead.
    const preHP = Number(this.system.hitPoints.value ?? 0);

    if (!isFlashAmmo && damageRemaining > 0 && !this.statuses?.has("dead")) {
      updates['system.hitPoints.value'] = preHP - damageRemaining;

      if (game.settings.get('synthicide', SYNTHICIDE.USE_SHOCKING_STRIKE_KEY)) {
        const outcome = await this._handleShockingStrike(damageRemaining, preHP, updates, { ...normalizedOptions, barrierAbsorbed });
        if (outcome === SYNTHICIDE.SHOCK_OUTCOMES.LETHAL || outcome === SYNTHICIDE.SHOCK_OUTCOMES.DEATH) {
          if (!this.statuses?.has("dead")) {
            await this.toggleStatusEffect("dead", { active: true });
          }
        }
      }
    }

    await this.update(updates);

    if (damageRemaining > 0 || isFlashAmmo) {
      await this._applySpecialAmmoOnHitEffects(normalizedOptions);
    }
  }

  async healActor(healing) {
    if (!healing || !DAMAGEABLE_ACTOR_TYPES.has(this.type)) return;
    const updates = {};
    updates['system.hitPoints.value'] = Math.min(this.system.hitPoints.value + healing, this.system.hitPoints.max);
    await this.update(updates);
  }

  async _applySpecialAmmoOnHitEffects(options = {}) {
    const onHit = resolveAmmoOnHitEffects({ ammoKey: options?.specialAmmoUsed });
    if (!(onHit.immediateDamageDice > 0) && !onHit.statusToggles.length) return;

    if (onHit.immediateDamageDice > 0) {
      const roll = await new Roll(`${onHit.immediateDamageDice}d10`).evaluate();
      const immediateDamage = Number(roll.total ?? 0);
      if (immediateDamage > 0) {
        await this.damageActor(immediateDamage, {
          ...options,
          specialAmmoUsed: 'none',
        });
      }
    }

    for (const effect of onHit.statusToggles) {
      const active = effect.active !== false;
      const alreadyActive = this.statuses?.has(effect.id) === true;
      if ((active && alreadyActive) || (!active && !alreadyActive)) continue;
      await this.toggleStatusEffect(effect.id, { active });
    }
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
    const { armor, barrierAbsorbed, lethal, shockRdBonus } = this._resolveShockContext(options);

    // Barrier-absorbed attacks only trigger shocking strike at 2x AD.
    if (barrierAbsorbed > 0 && !(damageRemaining >= 2 * armor)) return;

    //If damage remaining does not exceed shock threshold for actor, no shocking strike
    if (!(shockThreshold > 0 && damageRemaining > shockThreshold)) return;

    const shockRollDifficulty = Math.floor(damageRemaining / 5) + shockRdBonus;
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
    const actorArmor = Number(this.system.armorDefense?.value ?? NaN);
    const armor = Number.isFinite(messageArmor)
      ? messageArmor
      : (Number.isFinite(actorArmor) ? actorArmor : 0);

    const barrierAbsorbed = Number(options?.barrierAbsorbed ?? 0);
    let lethal = Number( options?.attack?.lethal ?? options?.lethal ?? 0);
    if (barrierAbsorbed > 0) lethal = 0;

    const shockRdBonus = Number(options?.attack?.shockRdBonus ?? options?.shockRdBonus ?? 0);

    return { armor, barrierAbsorbed, lethal, shockRdBonus };
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
      preferredMode: options?.messageMode ?? cardData?.messageMode ?? cardData?.flags?.messageMode ?? game.settings.get('core', 'messageMode'),
      whisper: options?.whisper ?? cardData?.whisper ?? cardData?.flags?.whisper ?? undefined,
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
