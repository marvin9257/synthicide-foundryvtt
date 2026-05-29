import { resolveWeaponSpecializationContext, getDemolitionSpecializationBonus } from './weapon-proficiency-rules.mjs';
import { normalizeAttributeKey } from './roll-utils.mjs';

/*
 * NOTE: The functions in this module implement the low-level modifier
 * calculation details. Prefer using `RollContext` and its
 * `applyInputAdjustments()` method for roll flows — it centralizes
 * when and how modifiers are applied and keeps callers consistent.
 *
 * The helpers below are kept exported for backward compatibility but
 * are considered internal implementation details and may be adjusted
 * or removed in future refactors.
 */

export const ATTRIBUTE_COMBAT = 'combat';
export const FORMULA_CHALLENGE = '1d10 + @attribute + @misc + @modifiers';
export const FORMULA_ATTACK = '1d10 + @attribute + @misc + @attackBonus + @modifiers';

export function parseNumeric(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getActorRollModifiers(actor) {
  const rollModifiers = actor?.system?.rollModifiers;
  if (!rollModifiers || typeof rollModifiers !== 'object') return [];

  return Object.entries(rollModifiers).reduce((modifiers, [key, value]) => {
    const numericValue = parseNumeric(value, 0);
    if (numericValue !== 0) modifiers.push({ key, value: numericValue });
    return modifiers;
  }, []);
}

/**
 * Compute persistent + situational roll modifiers for an actor.
 * @internal Use `RollContext` for full roll computation where possible.
 */
export function computeRollModifiers(actor, situational = []) {
  const persistent = getActorRollModifiers(actor);
  let situationalList = [];
  if (Array.isArray(situational)) {
    situationalList = situational.map((s) => ({ key: s.key, value: parseNumeric(s.value, 0) }));
  } else if (situational && typeof situational === 'object') {
    situationalList = Object.entries(situational).map(([key, value]) => ({ key, value: parseNumeric(value, 0) }));
  }

  const raw = [...persistent, ...situationalList];
  const total = raw.reduce((sum, m) => sum + parseNumeric(m.value, 0), 0);
  return { modifiers: raw, total };
}

/**
 * Apply attack-mode specific adjustments (slug-shot etc.) to an input object.
 * @internal Called by `applyModifiersToRollData` and `RollContext`.
 */
export function applyAttackModeAdjustments({ input, sourceItem }) {
  const slugShotActive = Boolean(input?.slugShotActive) && hasWeaponModification(sourceItem, 'slugShot');
  if (!slugShotActive) {
    return {
      ...input,
      slugShotActive: false,
    };
  }

  return {
    ...input,
    slugShotActive: true,
    attackBonus: parseNumeric(input?.attackBonus, 0) - 2,
    damageBonus: parseNumeric(input?.damageBonus, 0) + 2,
  };
}

/**
 * Apply ammo-derived adjustments to an input object.
 * @internal Called by `applyModifiersToRollData` and `RollContext`.
 */
export function applyAmmoAttackAdjustments({ input, ammoAttack }) {
  const ammoLethalOverride = ammoAttack?.lethalOverride;
  return {
    ...input,
    attackBonus: parseNumeric(input?.attackBonus, 0) + parseNumeric(ammoAttack?.attackBonusDelta, 0),
    damageBonus: parseNumeric(input?.damageBonus, 0) + parseNumeric(ammoAttack?.damageBonusDelta, 0),
    rangeModifier: parseNumeric(input?.rangeModifier, 0) + parseNumeric(ammoAttack?.rangeModifierDelta, 0),
    extraDamageDice: parseNumeric(ammoAttack?.extraDamageDice, 0),
    lethalOverride: Number.isFinite(ammoLethalOverride) ? ammoLethalOverride : null,
  };
}

/**
 * Resolve weapon specialization context and (optionally) apply demolition-specific
 * bonuses into `rollData` when provided.
 *
 * @internal This is a low-level helper. Do not call this directly from
 * external flows — prefer calling `ctx.applyRollAdjustments()` on a
 * `RollContext` instance so specialization and input adjustments are applied
 * in one canonical step.
 */
export function resolveAndApplySpecialization({ actor, sourceItem, subtype, attributeKey = ATTRIBUTE_COMBAT, rollData = null }) {
  const specializationContext = resolveWeaponSpecializationContext({
    actor,
    sourceItem,
    subtype,
    attributeKey,
  });
  if (rollData) {
    if (subtype === 'demolition') {
      const bonus = parseNumeric(getDemolitionSpecializationBonus({ specializationContext, subtype, attributeKey }), 0);
      if (bonus !== 0) {
        // Ensure modifierDetails exists and record the specialization as a modifier
        rollData.modifierDetails = Array.isArray(rollData.modifierDetails) ? rollData.modifierDetails : [];
        rollData.modifierDetails.push({ key: 'specialization', label: 'specialization', value: Number(bonus) });
        // Recompute actorModifierTotal from details for consistency
        rollData.actorModifierTotal = (rollData.modifierDetails || []).reduce((s, m) => s + parseNumeric(m.value, 0), 0);
        // Keep rollData.modifiers as the numeric total used in formulas (actor total + range)
        rollData.modifiers = Number(rollData.actorModifierTotal ?? 0) + Number(rollData.rangeModifier ?? 0);
      }
    }
    if (subtype === 'attack') {
      rollData.attackBonus = parseNumeric(rollData.attackBonus, 0) + parseNumeric(specializationContext.attackBonus, 0);
      rollData.damageBonus = parseNumeric(rollData.damageBonus, 0) + parseNumeric(specializationContext.damageBonus, 0);
    }
  }
  return specializationContext;
}

/**
 * Central modifier application: adjusts `input` for modes/ammo and
 * mutates `rollData` with attack/damage/range modifiers.
 * @internal Callers should generally use `RollContext.applyRollAdjustments()`.
 */
// NOTE: `applyModifiersToRollData` has been moved into `roll-context.mjs`
// so that `RollContext` is the canonical owner of modifier application
// behavior. Callers should prefer `buildRollContext()` and
// `RollContext.applyRollAdjustments()` instead.

export function getActionAttributeKey(subtype, requestedAttribute) {
  return subtype === 'attack'
    ? ATTRIBUTE_COMBAT
    : normalizeAttributeKey(requestedAttribute);
}

/**
 * Build baseline roll data for actions (attack/challenge) using actor
 * attribute and persistent modifiers.
 * @internal For full roll adjustments use `RollContext.applyRollAdjustments()`.
 */
// `buildActionRollData` was removed: prefer `RollContext` +
// `applyRollAdjustments()` for constructing and normalizing roll data.

export function getActorAttributeValue(actor, attributeKey) {
  return Number(actor?.system?.attributes?.[attributeKey]?.value ?? 0);
}

export function hasWeaponModification(sourceItem, modificationKey) {
  const modifications = sourceItem?.system?.modifications;
  if (modifications instanceof Set) return modifications.has(modificationKey);
  if (Array.isArray(modifications)) return modifications.includes(modificationKey);
  return false;
}
