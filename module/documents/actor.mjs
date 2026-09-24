import SYNTHICIDE from "../helpers/config.mjs";
import { resolveAmmoOnHitEffects } from "../rolls/ammo-effects.mjs";
import { SynthicideChatMessage } from "./synthicide-chat-message.mjs";

const DAMAGEABLE_ACTOR_TYPES = new Set(['sharper', 'npc', 'vehicle']);


/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class SynthicideActor extends foundry.documents.Actor {

    /** @override */
  async _preUpdate(changed, options, user) {
    const allowed = await super._preUpdate(changed, options, user);
    if (allowed === false) return false;

    // 1. Clamp and normalize Hit Points
    if (foundry.utils.hasProperty(changed, 'system.hitPoints.value')) {
      const nextHP = Number(foundry.utils.getProperty(changed, 'system.hitPoints.value') ?? 0);
      let maxHP = Number(foundry.utils.getProperty(changed, 'system.hitPoints.max'));
      if (!Number.isFinite(maxHP)) maxHP = Number(this.system.hitPoints.max ?? 0);
      maxHP = Math.max(0, maxHP);
      foundry.utils.setProperty(changed, 'system.hitPoints.value', Math.min(maxHP, nextHP));
      foundry.utils.setProperty(changed, 'system.hitPoints.previous', this.system.hitPoints.value);
    }

    // 2. Clamp and normalize Force Barrier values and Knowledge Points
    if (['sharper', 'npc'].includes(this.type)) {
      this._clampResourceInUpdate(changed, 'system.armorValues.forceBarrier.value', 'system.armorValues.forceBarrier.max');
      this._clampResourceInUpdate(changed, 'system.knowledgePoints.value', 'system.knowledgePoints.max');
    }
    
    return allowed;
  }

  /**
   * Clamp a resource value against its effective max while preserving the update payload.
   *
   * @param {object} changed The partial update payload being applied to the actor.
   * @param {string} valuePath Full system path to the current resource value, e.g. `system.knowledgePoints.value`.
   * @param {string} maxPath Full system path to the resource max, e.g. `system.knowledgePoints.max`.
   * @returns {void}
   */
  _clampResourceInUpdate(changed, valuePath, maxPath) {
    const hasValue = foundry.utils.hasProperty(changed, valuePath);
    const hasMax = foundry.utils.hasProperty(changed, maxPath);
    if (!hasValue && !hasMax) return;

    const currentMax = Number(foundry.utils.getProperty(this, maxPath) ?? 0);
    const resolvedMax = Number(foundry.utils.getProperty(changed, maxPath) ?? currentMax);
    const max = Math.max(0, Number.isFinite(resolvedMax) ? resolvedMax : 0);
    if (hasMax) foundry.utils.setProperty(changed, maxPath, max);

    const currentValue = Number(foundry.utils.getProperty(this, valuePath) ?? 0);
    const next = Number(foundry.utils.getProperty(changed, valuePath) ?? currentValue);
    const clamped = Math.clamp(Number.isFinite(next) ? next : 0, 0, max);

    foundry.utils.setProperty(changed, valuePath, clamped);
  }

      /** @override */
  async _onUpdate(changed, options, user) {
    await super._onUpdate?.(changed, options, user);

    if (user !== game.user.id) return;
    if (!['sharper', 'npc'].includes(this.type)) return;

    const hpPath = "system.hitPoints.value";
    if (!foundry.utils.hasProperty(changed, hpPath)) return;

    //skip processing if already processed by damageActor method
    if (options.fromDamageActor === true) return;

    const currHP = foundry.utils.getProperty(changed, hpPath);
    const prevHP = Number(this.system.hitPoints.previous ?? 0);
    
    // Safety check: Exit if values match, UNLESS an execution shot option is present
    if (prevHP === currHP) return;

    const actorIsDead = this.statuses?.has("dead");
    const actorIsBleeding = this.statuses?.has("bleeding");

    // =========================================================================
    // MANUAL TOKEN INPUT RULE A: RECOVERY
    // =========================================================================
    if (currHP > 0) {
      if (actorIsBleeding) await this.toggleStatusEffect("bleeding", { active: false });
      if (actorIsDead) await this.toggleStatusEffect("dead", { active: false });
      return;
    }

    // =========================================================================
    // MANUAL TOKEN INPUT RULE B: FIRST-TIME NATURAL INCAPACITATION
    // =========================================================================
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
    const isVehicle = this.type === 'vehicle';
    const isNpcOrSharper = ['sharper', 'npc'].includes(this.type);

    if (attribute === 'hitPoints' && (isNpcOrSharper || isVehicle)) {
      const attr = foundry.utils.getProperty(this.system, attribute);
      const current = isBar ? attr.value : attr;
      const rawUpdate = isDelta ? current + value : value;
      if ( rawUpdate === current ) return this;

      let updates;
      
      if ( isBar ) {
        const damageWasDealt = rawUpdate < current;

        // =====================================================================
        // TOKEN BAR EXCLUSION: IMMEDIATE DEATH FROM SUBSEQUENT DAMAGE
        // If they are already at or below 0, and new damage is typed in,
        // instantly execute them using native, standalone toggles.
        // =====================================================================
        if (isNpcOrSharper && current <= 0 && damageWasDealt) {
          // Clamp health pool safely to -1
          updates = {[`system.${attribute}.value`]: -1};
          await this.update(updates);

          await this._clearAllStatusesExceptDead();

          if (!this.statuses?.has("dead")) {
            await this.toggleStatusEffect("dead", { active: true });
          }
          return this; // Exit early! 
        }

        // Standard first-time knockdown clamp boundaries
        const minFloor = isVehicle ? 0 : -1;
        const clampedUpdate = Math.min(Math.max(rawUpdate, minFloor), attr.max);
        updates = {[`system.${attribute}.value`]: clampedUpdate};
      } else {
        updates = {[`system.${attribute}`]: rawUpdate};
      }

      // Execute standard database write transaction
      await this.update(updates);
    } else {
      return super.modifyTokenAttribute(attribute, value, isDelta, isBar);
    }
    return this;
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
  //async equipArmor(armorItemId) {
  //  return this.equipExclusiveItemType('armor', armorItemId);
  //}

  /**
   * @override
   * Return a mutable roll-data snapshot while invoking system roll-data shaping
   * only once.
   */
  getRollData() { 
    const data = foundry.utils.duplicate(super.getRollData()); // plain obj via core
    foundry.utils.mergeObject(data, this.system);
    if (['sharper', 'npc'].includes(this.type)) {
      
      // Attribute convenience keys (long names)
      try {
        const attrMap = SYNTHICIDE.attributes ?? {};
        for (const [key, attr] of Object.entries(data.attributes ?? {})) {
          const longKey = game.i18n.localize(attrMap[key]);
          data[key] = Number(attr?.value ?? 0);
          if (typeof longKey === 'string' && attr?.value !== undefined)
            data[longKey] = attr.value;
        }
      } catch (err) { console.error('getRollData: attribute keys failed', err); }

      // Derived stat shorthands
      data.AD = data.armorDefense?.value;
      data.TD = data.toughnessDefense?.value;
      data.ND = data.nerveDefense?.value;
      data.BR = data.battleReflex?.value;
      data.AP = data.actionPoints?.value;
      data.ST = data.shockThreshold?.value;
      data.lvl = data.level?.value;
    } else if (['vehicle'].includes(this.type)) {
      data.DT = data.damageThreshold;
    }
    
    return data;
  }

    /**
   * Processes incoming damage against the actor, accounting for Force Barriers,
   * standard health reduction, vehicle rules, and conditional Shocking Strike mechanics.
   * @param {number} damage - The raw incoming damage total.
   * @param {object} options - Roll contexts, ammo modifications, and system triggers.
   * @returns {Promise<SynthicideActor|null>}
   */
  async damageActor(damage, options = {}) {
    if (!damage || !DAMAGEABLE_ACTOR_TYPES.has(this.type)) return this;

    // A. CALCULATE CUMULATIVE DAMAGE FIRST (Before any state transitions or database locks)
    let totalDamage = damage;
    const specialAmmo = String(options?.specialAmmoUsed ?? 'none');
    const onHitEffects = resolveAmmoOnHitEffects({ ammoKey: specialAmmo });

    // Extract the extra ammo dice roll out of the inner loop and evaluate it upfront
    if (onHitEffects?.immediateDamageDice > 0) {
      const roll = await new Roll(`${onHitEffects.immediateDamageDice}d10`).evaluate();
      totalDamage += Number(roll.total ?? 0);
    }

    const updates = {};
    const isVehicle = this.type === 'vehicle';
    const isNpcOrSharper = ['sharper', 'npc'].includes(this.type);
    const isFlashAmmo = specialAmmo === 'flash';
    const forceBarrier = Number(this.system.armorValues?.forceBarrier?.value ?? 0);

    // 1. Process Force Barrier Absorption
    let damageRemaining = totalDamage;
    if (!isFlashAmmo && forceBarrier > 0) {
      const absorbed = Math.min(forceBarrier, damageRemaining);
      damageRemaining -= absorbed;
      updates['system.armorValues.forceBarrier.value'] = forceBarrier - absorbed;
    }

    const preHP = Number(this.system.hitPoints.value ?? 0);

    // =========================================================================
    // BRANCH A: Dedicated Vehicle Damage Path (Early Return)
    // =========================================================================
    if (isVehicle) {
      if (!isFlashAmmo && damageRemaining > 0) {
        updates['system.hitPoints.value'] = preHP - damageRemaining;
      }
      await this.update(updates);
      
      if (damageRemaining > 0 || isFlashAmmo) {
        await this._applySpecialAmmoOnHitEffects({ ...options, specialAmmoUsed: specialAmmo });
      }
      return this;
    }

    // =========================================================================
    // BRANCH B: Living Character Path (NPC / Sharper)
    // =========================================================================
    if (isNpcOrSharper) {
      const isDead = this.statuses?.has("dead");
      const isBleeding = this.statuses?.has("bleeding");
      let statusToApply = null;

      if (!isFlashAmmo && damageRemaining > 0 && !isDead) {
        const baselineHP = preHP - damageRemaining;
        const useShockingStrike = game.settings.get('synthicide', SYNTHICIDE.USE_SHOCKING_STRIKE_KEY);
        const shockThreshold = Number(this.system.shockThreshold?.value ?? 0);
        const breachesThreshold = damageRemaining > shockThreshold;

        // Rule 1: Execution Clause (Already down, subsequent damage kills)
        if (preHP <= 0) {
          updates['system.hitPoints.value'] = -1;
          statusToApply = "dead";
        }
        // Rule 2: Natural Incapacitation
        else if (baselineHP < 0) {
          updates['system.hitPoints.value'] = -1;
          statusToApply = "bleeding";
        } 
        // Rule 3: Shocking Strike Trauma Check
        else if (useShockingStrike && breachesThreshold) {
          const shockArgs = { ...options, specialAmmoUsed: specialAmmo, barrierAbsorbed: damage - damageRemaining };
          const shockOutcome = await this._handleShockingStrike(damageRemaining, preHP, updates, shockArgs);
          
          if (shockOutcome === SYNTHICIDE.SHOCK_OUTCOMES.SUCCESS) {
            updates['system.hitPoints.value'] = baselineHP; 
          } else {
            updates['system.hitPoints.value'] = -1; 
            
            const isLethal = [SYNTHICIDE.SHOCK_OUTCOMES.LETHAL, SYNTHICIDE.SHOCK_OUTCOMES.DEATH].includes(shockOutcome);
            statusToApply = isLethal ? "dead" : "bleeding";
          }
        } 
        // Rule 4: Standard Damage Taken
        else {
          updates['system.hitPoints.value'] = baselineHP;
        }
      }

      // Step 1: Lock health pools into the database first
      await this.update(updates, { fromDamageActor: true });

      // Step 2: Use your standard toggleStatusEffect methods sequentially
      if (statusToApply === "dead" && !isDead) {
        await this._clearAllStatusesExceptDead();
        await this.toggleStatusEffect("dead", { active: true });
        return this;
      } 
      else if (statusToApply === "bleeding" && !isBleeding && !isDead) {
        await this.toggleStatusEffect("bleeding", { active: true });
       
      }
      //if (this.statuses?.has("dead") || statusToApply === "dead") {
      //  return this;
      //}
       
      if (damageRemaining > 0 || isFlashAmmo) {
        await this._applySpecialAmmoOnHitEffects({ ...options, specialAmmoUsed: specialAmmo });
      }
    }
    return this;
  }

  async healActor(healing) {
    if (!healing || !DAMAGEABLE_ACTOR_TYPES.has(this.type)) return;
    const updates = {};
    updates['system.hitPoints.value'] = Math.min(this.system.hitPoints.value + healing, this.system.hitPoints.max);
    await this.update(updates);
  }

  async _applySpecialAmmoOnHitEffects(options = {}) {
    if (this.statuses?.has("dead")) return;

    const onHit = resolveAmmoOnHitEffects({ ammoKey: options?.specialAmmoUsed });
    if (!onHit.statusToggles.length) return;

    //if (this.statuses?.has("dead") || this.system.hitPoints.value <= -1) return;

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
    /**
   * Handle shocking-strike resolution using unified Document-Driven DataModels.
   * Calculates RD, evaluates auto-lethal thresholds, performs toughness checks,
   * and maps data straight into the schema pipeline.
   * @param {number} damageRemaining - damage reaching HP after barriers
   * @param {number} preHitPoints - HP value before applying this damage
   * @param {Object} updates - the update payload being built by damageActor
   * @param {Object} options - live incoming action context adjustments
   */
  async _handleShockingStrike(damageRemaining, preHitPoints, updates, options = {}) {
    if (!(damageRemaining > 0)) return;
    const shockThreshold = Number(this.system.shockThreshold?.value ?? 0);

    // 1. Resolve attack context variables safely using your clean fallbacks helper
    const { armorDefense, barrierAbsorbed, lethal, shockRdBonus } = this._resolveShockContext(options);

    // Barrier-absorbed attacks only trigger shocking strike at 2x AD.
    if (barrierAbsorbed > 0 && !(damageRemaining >= 2 * armorDefense)) return;

    // If damage remaining does not exceed shock threshold for actor, no shocking strike
    if (!(shockThreshold > 0 && damageRemaining > shockThreshold)) return;

    const shockRollDifficulty = Math.floor(damageRemaining / 5) + shockRdBonus;
    const wouldDropBelowZero = damageRemaining > preHitPoints;
    const isLethal = Number.isFinite(lethal) && lethal > 0 && armorDefense <= lethal;

    const toughnessValue = Number(this.system.attributes?.toughness?.value ?? 0);
    let roll = null;
    let rollTotal = null;
    let success = false;
    let d10Value = 0;

    // 2. Perform the localized dice roll evaluation if the attack wasn't an auto-bypass
    if (!isLethal) {
      roll = await new Roll('1d10 + @attribute', { attribute: toughnessValue }).evaluate();
      rollTotal = Number(roll.total ?? 0);
      success = rollTotal > shockRollDifficulty;
      d10Value = Number(roll.dice[0]?.results?.[0]?.result ?? 0);
    }

    // FIXED: Calculate the outcome variable FIRST before attempting to build your data model payload!
    const shockModelClass = CONFIG.ChatMessage.dataModels.shock;
    const outcome = shockModelClass.resolveShockOutcome({ isLethal, success, wouldDropBelowZero });

    // 3. Pack up raw database fields to match your new strict schema model layout
    const systemData = {
      subtype: "shock", // Direct map to register subclass context type selection
      damageRemaining,
      shockThreshold,
      rd: shockRollDifficulty,
      toughnessValue,
      outcome, // Safely defined and evaluated
      lethal,
      armorDefense,
      d10: d10Value,
      rollTotal: isLethal ? damageRemaining : rollTotal,
      actorUuid: this.uuid,
      actorName: this.name,
      total: isLethal ? damageRemaining : rollTotal,
      sourceItemUuid: options?.sourceItemUuid ?? options?.attack?.sourceItemUuid ?? "",
      sourceMessageId: options?.sourceMessageId ?? options?.attack?.sourceMessageId ?? ""
    };

    const { preferredMode, whisper } = this._resolveShockMessageOptions({ options });
    
    // 4. Fire off the updated messaging engine cleanly passing our structured schema bundle
    await SynthicideChatMessage.createActionMessage({ 
      actor: this, 
      roll, 
      systemData, 
      messageMode: preferredMode, 
      whisper 
    });
    
    // Apply health state overrides to updates object literal
    //this._applyShockOutcomeUpdates({ updates, outcome, preHitPoints, damageRemaining });

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
    // Keep fallbacks active for backward compatibility with legacy attack/damage cards
    const incomingArmor = options?.attack?.armorDefense ?? options?.armorDefense 
                       ?? options?.attack?.armor        ?? options?.armor;
                       
    const actorArmorFallback = this.system.armorDefense?.value ?? 0;

    // Use a clean ternary to select our single, definitive armorDefense number
    const armorDefense = Number.isFinite(Number(incomingArmor)) 
      ? Number(incomingArmor) 
      : Number(actorArmorFallback);

    const barrierAbsorbed = Number(options?.barrierAbsorbed ?? 0);
    
    let lethal = Number(options?.attack?.lethal ?? options?.lethal ?? 0);
    if (barrierAbsorbed > 0) lethal = 0;

    const shockRdBonus = Number(options?.attack?.shockRdBonus ?? options?.shockRdBonus ?? 0);

    return { armorDefense, barrierAbsorbed, lethal, shockRdBonus };
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
   * Disables all active combat condition overlays on the actor document
   * except for the definitive "dead" status icon in a single batch delete.
   * @private
   */
  async _clearAllStatusesExceptDead() {
    // Find the unique IDs of all ActiveEffect sub-documents driving conditions
    const idsToDelete = this.effects
      .filter(e => {
        // Collect any effects linked to combat tracking statuses, skipping "dead"
        const statuses = Array.from(e.statuses ?? []);
        return statuses.length > 0 && !statuses.includes("dead");
      })
      .map(e => e.id);

    // Delete every single active hazard effect in one atomic database operation
    if (idsToDelete.length) {
      await this.deleteEmbeddedDocuments("ActiveEffect", idsToDelete);
    }
  }

}
