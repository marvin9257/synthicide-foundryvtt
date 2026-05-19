// Attack card data preparation for Synthicide
// Extracted from action-rolls.mjs for modularity and clarity

import { localize, getAttributeLabel, buildEquationTerms, buildBaseActionCardData, getRollResultSummary } from './roll-utils.mjs';
/**
 * Prepare cardData for an attack roll.
 * @param {object} params
 * @param {object} params.input - User input from dialog
 * @param {object} params.actor - The actor performing the roll
 * @param {object} params.sourceItem - The weapon/item used (optional)
 * @param {object} params.rollResult - The evaluated Roll object
 * @param {number} params.attributeValue - The resolved attribute value
 */
export function prepareAttackCardData({ input, actor, sourceItem, rollResult, attributeValue }) {
  const { d10, total, equation, dieClass } = getRollResultSummary(rollResult);
  const armor = Number(input.armor ?? 0);
  const shieldBonus = Number(input.shieldBonus ?? 0);
  const effectiveArmor = armor + shieldBonus;
  const damageBonus = Number(input.damageBonus ?? 0);
  const rangeDistance = Number.isFinite(Number(input.rangeDistance)) ? Number(input.rangeDistance) : null;
  const rangeIncrement = Number.isFinite(Number(input.rangeIncrement)) ? Number(input.rangeIncrement) : null;
  const hit = total >= effectiveArmor;
  const attributeKey = input.attribute;
  const lethal = Number(sourceItem?.system?.bonuses.lethal ?? 0);
  const baneDamageBonus = Number(input.baneDamageBonus ?? 0);
  const slugShotActive = isSlugShotActive({ input, sourceItem });

  // Data for strict DataModel validation
  const system = {
    armor: effectiveArmor,
    damageBonus,
    attribute: attributeKey,
    attributeValue,
    d10,
    hit,
    lethal,
    baneDamageBonus,
    slugShotActive,
    actorUuid: actor?.uuid ?? null,
  };

  // Native ChatMessage fields
  const title = localize('SYNTHICIDE.Roll.Card.TitleAttack');
  const flavor = buildAttackFlavor({ attributeKey, armor: effectiveArmor, sourceItem });

  // Extra card rendering fields (for handlebars, etc.)
  const cardExtras = buildBaseActionCardData({
    equation,
    total,
    dieValue: d10,
    dieClass,
    rollResult,
    attributeKey,
    equationTerms: buildEquationTerms({ subtype: 'attack', attributeKey, rollData: { ...input, attributeValue } }),
    showEffectOutcomeRow: false,
    showDamageButton: hit,
    showOpposedButton: false,
    effectText: hit ? localize('SYNTHICIDE.Roll.Outcome.Hit') : localize('SYNTHICIDE.Roll.Outcome.Miss'),
    effectClass: hit ? 'outcome-success' : 'outcome-failure',
    metadataRows: buildAttackMetadataRows({
      armor,
      shieldBonus,
      effectiveArmor,
      rangeDistance,
      rangeIncrement,
      input,
      actor,
      sourceItem,
      attributeValue,
    })
  });

  return {
    type: 'attack',
    system,
    ...cardExtras,
    title,
    flavor,
    showTotalRow: false
  };
}

function buildAttackFlavor({ attributeKey, armor, sourceItem }) {
  return localize('SYNTHICIDE.Roll.Card.DefaultFlavorAttack', {
    attribute: getAttributeLabel(attributeKey),
    armor,
    item: sourceItem?.name || localize('SYNTHICIDE.Roll.Subtype.Attack'),
  });
}

function buildAttackMetadataRows({
  armor,
  shieldBonus,
  effectiveArmor,
  rangeDistance,
  rangeIncrement,
  input,
  actor,
  sourceItem,
  attributeValue,
}) {
  const rows = [
    { label: localize('SYNTHICIDE.Roll.Card.Armor'), value: armor },
  ];
  if (shieldBonus !== 0) {
    rows.push({ label: localize('SYNTHICIDE.Roll.Card.ShieldBonus'), value: shieldBonus > 0 ? `+${shieldBonus}` : String(shieldBonus) });
    rows.push({ label: localize('SYNTHICIDE.Roll.Card.EffectiveArmor'), value: effectiveArmor });
  }
  rows.push(
    { label: localize('SYNTHICIDE.Roll.Card.Distance'), value: rangeDistance ?? 'n/a' },
    { label: localize('SYNTHICIDE.Roll.Card.RangeIncrement'), value: rangeIncrement ?? 'n/a' }
  );

  if (isSlugShotActive({ input, sourceItem })) {
    rows.push({
      label: localize('SYNTHICIDE.Roll.Card.SlugShotMode'),
      value: '-2 ATT, +2 DMG',
    });
  }

  const battleAssistValue = Number(sourceItem?.system?.bonuses?.battleAssistValue ?? 0);
  const actorCombatValue = Number(actor?.system?.attributes?.combat?.value ?? 0);
  const battleAssistApplied = String(input?.attribute ?? '') === 'combat'
    && battleAssistValue > actorCombatValue
    && Number(attributeValue ?? 0) === battleAssistValue;
  if (battleAssistApplied) {
    rows.push({
      label: localize('SYNTHICIDE.Roll.Card.BattleAssist'),
      value: `${actorCombatValue} -> ${battleAssistValue}`,
    });
  }

  return rows;
}

function isSlugShotActive({ input, sourceItem }) {
  if (!input?.slugShotActive) return false;
  const modifications = sourceItem?.system?.modifications;
  if (modifications instanceof Set) return modifications.has('slugShot');
  if (Array.isArray(modifications)) return modifications.includes('slugShot');
  return false;
}
