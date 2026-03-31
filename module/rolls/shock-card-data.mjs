// module/rolls/shock-card-data.mjs
import SYNTHICIDE from "../helpers/config.mjs";

/**
 * Resolve the final shocking-strike outcome from derived booleans.
 * @param {boolean} isLethal
 * @param {boolean} success
 * @param {boolean} wouldDropBelowZero
 * @returns {string} Outcome key
 */
export function resolveShockOutcome({ isLethal, success, wouldDropBelowZero } = {}) {
  if (isLethal) return SYNTHICIDE.SHOCK_OUTCOMES.LETHAL;
  if (success) return SYNTHICIDE.SHOCK_OUTCOMES.SUCCESS;
  return wouldDropBelowZero ? SYNTHICIDE.SHOCK_OUTCOMES.DEATH : SYNTHICIDE.SHOCK_OUTCOMES.MINUS_ONE;
}

/**
 * Build chat card data for a Shocking Strike toughness check.
 * @param {Actor} actor - The actor performing the shocking strike.
 * @param {object} options - Roll and context data:
 *   @param {Roll|null} options.roll - The evaluated roll object (or null if lethal).
 *   @param {number|null} options.rollTotal - The total of the roll (or null if lethal).
 *   @param {number} options.damageRemaining - Damage reaching HP after barriers.
 *   @param {number} options.shockThreshold - Actor's shock threshold.
 *   @param {number} options.rd - Roll difficulty (damage/5).
 *   @param {number} options.toughnessValue - Actor's toughness value.
 *   @param {string} options.outcome - Outcome key (from resolveShockOutcome).
 *   @param {number} options.lethal - Lethality rating of the attack.
 * @returns {object} Card data for chat message flags and rendering.
 */
export function buildShockCardData({ actor, options }) {
  const {
    roll,
    rollTotal,
    damageRemaining,
    shockThreshold,
    rd,
    toughnessValue,
    outcome,
    lethal
  } = options;
  const isLethal = outcome === SYNTHICIDE.SHOCK_OUTCOMES.LETHAL;
  const d10 = Number(roll?.dice?.[0]?.results?.[0]?.result ?? 0);
  const baseFlavor = game.i18n.format("SYNTHICIDE.Chat.Shock.Base", {
    actor: actor.name,
    damage: damageRemaining,
    threshold: shockThreshold
  });
  const outcomeFlavor = buildShockOutcomeFlavor({ outcome, lethal, rollTotal, rd });

  return {
    title: game.i18n.localize("SYNTHICIDE.Roll.Card.TitleShock"),
    subtype: 'shock',
    equation: roll?.result ?? '',
    total: isLethal ? damageRemaining : rollTotal,
    dieValue: d10,
    dieClass: '',
    equationTerms: [
      { label: game.i18n.localize(SYNTHICIDE.attributes.toughness), value: toughnessValue },
      { label: game.i18n.localize("SYNTHICIDE.Roll.Card.Difficulty"), value: rd },
      { label: game.i18n.localize("SYNTHICIDE.Roll.Card.DamageResultApplied"), value: damageRemaining },
    ],
    metadataRows: [
      { label: game.i18n.localize("SYNTHICIDE.Chat.Shock.Threshold"), value: shockThreshold },
    ],
    flavor: `${baseFlavor} ${outcomeFlavor}`,
    flags: {
      subtype: 'shock',
      actorUuid: actor.uuid,
      userId: game.user.id,
      messageMode: game.settings.get('core', 'messageMode'),
      shock: { damage: damageRemaining, rd, shockThreshold, roll: rollTotal, success: outcome === SYNTHICIDE.SHOCK_OUTCOMES.SUCCESS, lethal: isLethal ? lethal : 0 }
    },
    showEffectOutcomeRow: false,
  };
}

/**
 * Build localized outcome flavor text for shocking strike cards.
 * @param {string} outcome - Outcome key (from SYNTHICIDE.SHOCK_OUTCOMES).
 * @param {number} lethal - Lethality rating (used for lethal outcome).
 * @param {number|null} rollTotal - Roll total (used for non-lethal outcomes).
 * @param {number} rd - Roll difficulty.
 * @returns {string} Localized flavor text for the outcome.
 */
function buildShockOutcomeFlavor({ outcome, lethal, rollTotal, rd } = {}) {
  const key = SYNTHICIDE.SHOCK_FLAVOR_KEYS[outcome] ?? SYNTHICIDE.SHOCK_FLAVOR_KEYS[SYNTHICIDE.SHOCK_OUTCOMES.MINUS_ONE];
  if (outcome === SYNTHICIDE.SHOCK_OUTCOMES.LETHAL) {
    return game.i18n.format(key, { lethal });
  }
  return game.i18n.format(key, { roll: rollTotal, rd });
}
