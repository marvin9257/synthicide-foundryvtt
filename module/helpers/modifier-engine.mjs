/**
 * Small deterministic modifier formula evaluator for actor-prep.
 * Designed to be synchronous where possible using Roll.evaluateSync.
 */
export function evaluateFormulaSync(formula, actor = null) {
  if (!formula && formula !== 0) return NaN;
  const expr = String(formula).trim();

  // Prefer actor.getRollData(), but fall back to actor.system for simple context
  let data = {};
  if (actor) {
    data = actor.getRollData() ?? actor.system ?? {};
  }

  let roll;
  try {
    roll = new foundry.dice.Roll(expr, data);
  } catch (err) {
    console.warn('[Synthicide] Failed to construct Roll for modifier formula:', expr, err);
    return NaN;
  }

  // Check determinism before attempting synchronous evaluation.
  const deterministic = roll.isDeterministic;
  if (!deterministic) {
    console.warn('[Synthicide] Modifier formula is not deterministic; skipping sync eval:', expr);
    return NaN;
  }

  try {
    roll.evaluateSync();
  } catch (err) {
    console.warn('[Synthicide] Failed to evaluate modifier formula synchronously:', expr, err);
    return NaN;
  }

  const total = Number(roll.total ?? roll.result ?? 0);
  return Number.isFinite(total) ? total : NaN;
}

/**
 * Evaluate a single modifier object for actor-prep context.
 * Returns an object { value: Number, type: String }
 */
export function evaluateModifierForActor(mod = {}, actor = null) {
  if (!mod) return { value: 0, type: 'bonus' };
  // Require an authored formula string. Do not support legacy numeric `value` authoring.
  const formula = mod.formula ?? null;
  if (!formula) return { value: 0, type: mod.type ?? 'bonus' };

  const numeric = evaluateFormulaSync(formula, actor);
  const type = mod.type ?? (numeric < 0 ? 'penalty' : 'bonus');
  return { value: Number.isFinite(numeric) ? numeric : 0, type };
}

/**
 * Resolve stacking and priority for an array of evaluated modifiers targeting the same path.
 * Each entry should be { value, type, stacking, priority, source, condition, rawTarget }
 * Returns { value, type, applied: Array }
 */
export function resolveStacking(mods = []) {
  if (!Array.isArray(mods) || mods.length === 0) return { value: 0, type: 'bonus', applied: [] };

  // Determine group stacking mode from the first explicit stacking value found
  const explicit = mods.find((m) => m && m.stacking !== undefined && m.stacking !== null);
  const stacking = explicit?.stacking ?? 'stack';

  if (stacking === 'stack') {
    const value = mods.reduce((s, m) => s + Number(m.value ?? 0), 0);
    const type = value < 0 ? 'penalty' : 'bonus';
    return { value, type, applied: mods };
  }

  if (stacking === 'highest') {
    let chosen = mods[0];
    for (const m of mods) {
      if (Number(m.value ?? 0) > Number(chosen.value ?? 0)) chosen = m;
    }
    return { value: Number(chosen.value ?? 0), type: chosen.type ?? (chosen.value < 0 ? 'penalty' : 'bonus'), applied: [chosen] };
  }

  // Default 'replace' behavior: choose highest priority, tie-breaker by last-in
  let best = mods[0];
  for (let i = 1; i < mods.length; i++) {
    const m = mods[i];
    const pr = Number(m.priority ?? 0);
    const bpr = Number(best.priority ?? 0);
    if (pr > bpr) {
      best = m;
    } else if (pr === bpr) {
      // tie-breaker: later overrides earlier
      best = m;
    }
  }
  return { value: Number(best.value ?? 0), type: best.type ?? (best.value < 0 ? 'penalty' : 'bonus'), applied: [best] };
}

export default { evaluateFormulaSync, evaluateModifierForActor, resolveStacking };
