//import SYNTHICIDE from "./config.mjs";

/**
 * Prepare the data structure for Active Effects which are currently embedded in an Actor or Item.
 * @param {ActiveEffect[]} effects    A collection or generator of Active Effect documents to prepare sheet data for
 * @return {object}                   Data for rendering
 */
export function prepareActiveEffectCategories(effects) {
  // Define effect header categories
  const categories = {
    temporary: {
      type: 'temporary',
      label: game.i18n.localize('SYNTHICIDE.Effect.Temporary'),
      effects: [],
    },
    passive: {
      type: 'passive',
      label: game.i18n.localize('SYNTHICIDE.Effect.Passive'),
      effects: [],
    },
    inactive: {
      type: 'inactive',
      label: game.i18n.localize('SYNTHICIDE.Effect.Inactive'),
      effects: [],
    },
  };

  // Iterate over active effects, classifying them into categories
  for (const e of effects) {
    if (e.disabled) categories.inactive.effects.push(e);
    else if (e.isTemporary) categories.temporary.effects.push(e);
    else categories.passive.effects.push(e);
  }

  // Sort each category
  for (const c of Object.values(categories)) {
    c.effects.sort((a, b) => (a.sort || 0) - (b.sort || 0));
  }
  return categories;
}

/**
 * Resolve an ActiveEffect change key to a canonical `system.*` path when possible.
 * - If `key` already starts with `system.` it is returned unchanged.
 * - If `key` matches a known suffix from `SYNTHICIDE.MODIFIER_TARGETS`, the matching
 *   canonical key (from SYNTHICIDE.MODIFIER_TARGETS) is returned.
 * - Otherwise the original `key` is returned unchanged.
 *
 * This helper is intentionally non-destructive: it does not modify documents,
 * only provides a resolved key for UI display and helper consumers.
 *
 * @param {string} key
 * @returns {string}
 */
/*export function resolveEffectKey(key) {
  if (!key || typeof key !== 'string') return key;
  if (key.startsWith('system.')) {
    return key;
  }
  const candidate = `system.${key}`;
  if (typeof SYNTHICIDE !== 'undefined' && SYNTHICIDE.MODIFIER_TARGETS?.[candidate]) return candidate;

  if (typeof SYNTHICIDE !== 'undefined') {
    for (const k of Object.keys(SYNTHICIDE.MODIFIER_TARGETS || {})) {
      if (k.endsWith(key)) return k;
    }
  }

  return key;
}*/
