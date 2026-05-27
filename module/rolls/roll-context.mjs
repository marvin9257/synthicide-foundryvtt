// Lightweight RollContext class for action/attack flows
// Encapsulates roll inputs, computed rollData, range context, and outcome
import { resolveAndApplySpecialization, getActorAttributeValue, getActorRollModifiers, hasWeaponModification, applyAttackModeAdjustments, applyAmmoAttackAdjustments, parseNumeric, ATTRIBUTE_COMBAT } from './modifiers.mjs';
import { resolveAmmoAttackEffects } from './ammo-effects.mjs';



/**
 * @typedef {Object} RollContextOptions
 * @property {Actor|null} actor
 * @property {Token|null} actorToken
 * @property {Item|null} sourceItem
 * @property {string} subtype
 * @property {string|null} attributeKey
 * @property {Object} input
 */

export class RollContext {
  /**
   * @param {RollContextOptions} opts
   */
  constructor({ actor = null, actorToken = null, sourceItem = null, subtype = 'attack', attributeKey = null, input = {} } = {}) {
    this.actor = actor;
    this.actorToken = actorToken;
    this.sourceItem = sourceItem;
    this.subtype = subtype;
    this.attributeKey = attributeKey;

    // Inputs provided by dialog / caller (bonuses, options, flags)
    this.input = Object.assign({}, input);

    // Normalized roll data used by roll computation (attack/damage values)
    this.rollData = {
      attribute: null,
      attackBonus: 0,
      damageBonus: 0,
      misc: 0,
      modifiers: 0,
      modifierDetails: [],
      actorModifierTotal: 0,
      rangeModifier: 0,
    };

    // Computed attack range context (distance, increment, modifiers)
    this.attackRangeContext = null;

    // Specialization or other resolved rule state
    this.specialization = null;

    // Free-form metadata for cards / templates
    this.metadata = {};

    // Outcome filled after roll evaluation
    this.outcome = {};
  }

  // Derived total attack value based on rollData
  get totalAttack() {
    const rd = this.rollData || {};
    return (rd.attribute || 0) + (rd.attackBonus || 0) + (rd.misc || 0) + (rd.actorModifierTotal || 0) + (rd.rangeModifier || 0);
  }

  // Add a modifier object {key, label, value}
  addModifier(mod) {
    if (!mod || typeof mod !== 'object') return;
    this.rollData.modifierDetails = this.rollData.modifierDetails || [];
    this.rollData.modifierDetails.push({
      key: String(mod?.key ?? ''),
      label: mod?.label ?? String(mod?.key ?? ''),
      value: Number(mod?.value ?? 0),
    });
    this._recomputeModifierTotals();
  }

  // Replace modifier details wholesale and recompute totals.
  setModifiers(mods = []) {
    this.rollData.modifierDetails = Array.isArray(mods)
      ? mods.map((mod) => ({
        key: String(mod?.key ?? ''),
        label: mod?.label ?? String(mod?.key ?? ''),
        value: Number(mod?.value ?? 0),
      }))
      : [];
    this._recomputeModifierTotals();
  }

  _recomputeModifierTotals() {
    const mods = this.rollData.modifierDetails || [];
    let total = 0;
    for (const m of mods) {
      const v = Number(m?.value ?? 0);
      if (!Number.isNaN(v)) total += v;
    }
    this.rollData.actorModifierTotal = total;
    this.rollData.modifiers = total + Number(this.rollData.rangeModifier ?? 0);
  }

  applyModifiers(mods) {
    if (!mods) return this;
    if (Array.isArray(mods)) this.setModifiers((this.rollData.modifierDetails || []).concat(mods));
    else if (typeof mods === 'object') this.addModifier(mods);
    return this;
  }

  /**
   * Normalize `this.input` by applying defaults and coercing numeric fields.
   * @param {Object} defaults
   */
  normalizeInput(defaults = {}) {
    this.input = Object.assign({}, defaults, this.input || {});
    // Coerce common numeric keys
    const nums = ['attackBonus', 'damageBonus', 'misc', 'rangeModifier'];
    for (const k of nums) {
      if (k in this.input) this.input[k] = Number(this.input[k]) || 0;
    }
    return this;
  }

  /**
   * Compute a lightweight attackRangeContext from distance and increment.
   * This is intentionally conservative; callers can replace with domain logic.
   * @param {Object} opts
   * @param {number} opts.distance
   * @param {number} opts.rangeIncrement
   * @param {number|null} opts.maxRange
   */
  computeRangeContext({ distance = 0, rangeIncrement = 0, maxRange = null } = {}) {
    const ctx = { distance: Number(distance || 0), rangeIncrement: Number(rangeIncrement || 0), increments: 0, rangeModifier: 0, isImpossible: false };
    if (ctx.rangeIncrement > 0) {
      ctx.increments = Math.floor(ctx.distance / ctx.rangeIncrement);
      // Simple rule: -1 attack per increment beyond first
      ctx.rangeModifier = -Math.max(0, ctx.increments - 1);
    }
    if (typeof maxRange === 'number' && maxRange >= 0) ctx.isImpossible = ctx.distance > maxRange;
    this.attackRangeContext = ctx;
    this.rollData.rangeModifier = ctx.rangeModifier;
    return ctx;
  }

  /**
   * Apply a specialization object to the context, mutating rollData appropriately.
   * Expected spec shape: { attackBonus?: number, damageBonus?: number, lethal?: boolean }
   * @param {Object} spec
   */
  applySpecialization(spec = {}) {
    if (!spec || typeof spec !== 'object') return this;
    this.specialization = Object.assign({}, this.specialization || {}, spec);
    if (Number.isFinite(spec.attackBonus)) this.rollData.attackBonus = (this.rollData.attackBonus || 0) + Number(spec.attackBonus);
    if (Number.isFinite(spec.damageBonus)) this.rollData.damageBonus = (this.rollData.damageBonus || 0) + Number(spec.damageBonus);
    return this;
  }

  /**
   * Apply current `this.input` adjustments (attack modes, ammo effects) and
   * recompute `this.rollData` using shared modifiers logic.
   * This delegates to `applyModifiersToRollData` from `modifiers.mjs` so
   * behavior stays consistent with existing rule helpers.
   */
  applyInputAdjustments() {
    const res = applyModifiersToRollData({
      actor: this.actor,
      rollData: this.rollData,
      input: this.input,
      sourceItem: this.sourceItem,
      attributeKey: this.attributeKey,
      attackRangeContext: this.attackRangeContext,
    });
    this.input = res.input ?? this.input;
    this.rollData = res.rollData ?? this.rollData;
    this.specialization = res.specializationContext ?? this.specialization;
    return this;
  }

  /**
   * Resolve and apply specialization context (weapon or demolition) to `rollData`.
   *
   * This is the canonical method to apply specialization bonuses. Callers
   * should prefer `ctx.resolveSpecialization()` so specialization is applied
   * exactly once; avoid calling the low-level helper `resolveAndApplySpecialization`
   * directly from flows.
   *
   * Returns the resolved specialization context.
   */
  resolveSpecialization() {
    const spec = resolveAndApplySpecialization({ actor: this.actor, sourceItem: this.sourceItem, subtype: this.subtype, attributeKey: this.attributeKey, rollData: this.rollData });
    this.specialization = spec;
    return spec;
  }

  /**
   * Convenience accessor: whether slug-shot mode is currently active and
   * available on the source item.
   */
  isSlugShotActive() {
    return Boolean(this.input?.slugShotActive) && hasWeaponModification(this.sourceItem, 'slugShot');
  }

  /**
   * Return primary ammo keys/flags for the current source item + input.
   */
  getAmmoInfo() {
    // Synthicide tracks a weapon's special ammo type on the item (system.specialAmmo).
    // Expose it via a single `specialAmmoUsed` field for callers; UI/dialogs may
    // override this later by setting `input.specialAmmoUsed` if desired.
    const declared = String(this.sourceItem?.system?.specialAmmo ?? 'none');
    // Prefer any explicit per-roll override, otherwise return the declared value.
    const used = String(this.input?.specialAmmoUsed ?? declared);
    return { specialAmmoUsed: used };
  }

  /**
   * Read an effective attribute value from the actor and update rollData.attribute.
   */
  getEffectiveAttribute(attributeKey = this.attributeKey) {
    const val = Number(getActorAttributeValue(this.actor, attributeKey));
    this.rollData.attribute = val;
    return val;
  }

  /**
   * Return a serializable snapshot compiled for embedding into ChatMessage.system
   */
  toChatSystem() {
    return this.toJSON();
  }

  /**
   * Minimal estimated damage helper (non-rolled): sum of damage bonuses and specialization.
   */
  getEstimatedDamage() {
    return (this.rollData.damageBonus || 0) + (this.specialization?.damageBonus || 0) + (this.input?.damageBonus || 0);
  }

  // Prepare a serializable snapshot suitable for embedding in ChatMessage.system
  toJSON() {
    return {
      subtype: this.subtype,
      attributeKey: this.attributeKey,
      input: foundry.utils.deepClone(this.input),
      rollData: foundry.utils.deepClone(this.rollData),
      attackRangeContext: foundry.utils.deepClone(this.attackRangeContext),
      specialization: foundry.utils.deepClone(this.specialization),
      metadata: foundry.utils.deepClone(this.metadata),
      outcome: foundry.utils.deepClone(this.outcome),
    };
  }

  // Shallow clone the context (useful for branching flows without mutating original)
  clone() {
    const c = new RollContext({ actor: this.actor, actorToken: this.actorToken, sourceItem: this.sourceItem, subtype: this.subtype, attributeKey: this.attributeKey, input: foundry.utils.deepClone(this.input) });
    c.rollData = foundry.utils.deepClone(this.rollData);
    c.attackRangeContext = foundry.utils.deepClone(this.attackRangeContext);
    c.specialization = foundry.utils.deepClone(this.specialization);
    c.metadata = foundry.utils.deepClone(this.metadata);
    c.outcome = foundry.utils.deepClone(this.outcome);
    return c;
  }
}

export function buildRollContext(opts) {
  return new RollContext(opts);
}

/**
 * Central modifier application moved here from `modifiers.mjs` so that
 * `RollContext` owns the canonical behavior for applying input-mode and
 * ammo-derived adjustments and mutating `rollData` accordingly.
 *
 * This is intentionally private to `roll-context.mjs` to make `RollContext`
 * self-contained; helper functions (modes, ammo resolution, specialization)
 * remain in `modifiers.mjs` as necessary.
 */
function applyModifiersToRollData({ actor, rollData, input = {}, sourceItem = null, attributeKey = ATTRIBUTE_COMBAT, attackRangeContext = null }) {
  const modeAdjusted = applyAttackModeAdjustments({ input, sourceItem });
  const ammoKey = String(input?.specialAmmoUsed ?? sourceItem?.system?.specialAmmo ?? 'none');
  const ammoAttack = resolveAmmoAttackEffects({ ammoKey });
  const ammoAdjusted = applyAmmoAttackAdjustments({ input: modeAdjusted, ammoAttack });

  const actorAttribute = Number(getActorAttributeValue(actor, attributeKey));
  rollData.attribute = actorAttribute;

  const actorModifiers = getActorRollModifiers(actor);
  rollData.modifierDetails = Array.isArray(actorModifiers) ? actorModifiers.slice() : [];
  rollData.actorModifierTotal = rollData.modifierDetails.reduce((sum, mod) => sum + parseNumeric(mod.value, 0), 0);

  const finalInput = {
    ...input,
    attackBonus: parseNumeric(ammoAdjusted.attackBonus, 0),
    damageBonus: parseNumeric(ammoAdjusted.damageBonus, 0),
    rangeModifier: parseNumeric(ammoAdjusted.rangeModifier, 0),
    extraDamageDice: Number(ammoAdjusted.extraDamageDice ?? 0),
    lethalOverride: ammoAdjusted.lethalOverride ?? null,
  };

  const computedRangeModifier = parseNumeric(attackRangeContext?.rangeModifier, 0);
  const rangeModifier = parseNumeric(finalInput.rangeModifier, computedRangeModifier);
  rollData.attackBonus = parseNumeric(finalInput.attackBonus, rollData.attackBonus ?? 0);
  rollData.rangeModifier = rangeModifier;
  rollData.modifiers = Number(rollData.actorModifierTotal ?? 0) + Number(rangeModifier);

  // Specialization must be applied explicitly by calling `ctx.resolveSpecialization()`.
  // `applyInputAdjustments()` does not apply specialization; flows (attack,
  // demolition) should call `ctx.resolveSpecialization()` when they need
  // specialization bonuses injected into `rollData`.
  return { input: finalInput, rollData, specializationContext: null };
}
