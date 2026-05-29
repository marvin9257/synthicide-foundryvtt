// Attack card data preparation for Synthicide
// Extracted from action-rolls.mjs for modularity and clarity

import { localize, getAttributeLabel, buildEquationTerms, buildBaseActionCardData, getRollResultSummary } from './roll-utils.mjs';
import { buildWeaponSpecializationMetadataRows, normalizeSpecialization } from './weapon-proficiency-rules.mjs';
/**
 * Prepare cardData for an attack roll.
 * @param {object} params
 * @param {object} params.input - User input from dialog
 * @param {object} params.actor - The actor performing the roll
 * @param {object} params.sourceItem - The weapon/item used (optional)
 * @param {object} params.rollResult - The evaluated Roll object
 * @param {number} params.attributeValue - The resolved attribute value
 */
export function prepareAttackCardData({ input, actor, sourceItem, rollResult, attributeValue, rollData = {} }) {
  const { d10, total, equation, dieClass } = getRollResultSummary(rollResult);
  const armor = Number(input.armor ?? 0);
  const shieldBonus = Number(input.shieldBonus ?? 0);
  const effectiveArmor = armor + shieldBonus;
  const damageBonus = Number(input.damageBonus ?? 0);
  const rangeDistance = Number.isFinite(Number(input.rangeDistance)) ? Number(input.rangeDistance) : null;
  const rangeIncrement = Number.isFinite(Number(input.rangeIncrement)) ? Number(input.rangeIncrement) : null;
  const hit = total >= effectiveArmor;
  const attributeKey = input.attribute;
  const lethalOverride = input.lethalOverride;
  const specialization = normalizeSpecialization(input);
  const shockRdBonus = Number(input.shockRdBonus ?? 0);
  const lethal = Number.isFinite(lethalOverride)
    ? lethalOverride
    : Number(sourceItem?.system?.bonuses.lethal ?? 0) + Number(specialization.lethalBonus ?? 0);
  const extraDamageDice = Number(input.extraDamageDice ?? 0);
  const baneDamageBonus = Number(input.baneDamageBonus ?? 0);
  const slugShotActive = isSlugShotActive({ input, sourceItem });
  const specialAmmoUsed = String(input.specialAmmoUsed ?? sourceItem?.system?.specialAmmo ?? 'none');

  // Data for strict DataModel validation
  const system = {
    armor: effectiveArmor,
    damageBonus,
    baseAttackBonus: Number(input.baseAttackBonus ?? sourceItem?.system?.bonuses?.attack ?? 0),
    baseDamageBonus: Number(input.baseDamageBonus ?? sourceItem?.system?.bonuses?.damage ?? 0),
    attribute: attributeKey,
    attributeValue,
    d10,
    hit,
    lethal,
    shockRdBonus,
    extraDamageDice,
    baneDamageBonus,
    slugShotActive,
    specialization,
    actorUuid: actor?.uuid ?? null,
    specialAmmoUsed,
    isPlantedDemolitionAttack: Boolean(input.isPlantedDemolitionAttack),
    // Propagate a planted marker for UI/derived-damage flows. Some handlers
    // detect planted devices from `hideAttributeRow`, so mirror that flag on
    // attack cards generated from planted demolition.
    hideAttributeRow: Boolean(input.isPlantedDemolitionAttack),
  };

  // Native ChatMessage fields
  const title = localize('SYNTHICIDE.Roll.Card.TitleAttack');
  const flavor = buildAttackFlavor({ attributeKey, armor: effectiveArmor, sourceItem });

  // Extra card rendering fields (for handlebars, etc.)
  const cardExtras = buildBaseActionCardData({
    subtype: 'attack',
    equation,
    total,
    dieValue: d10,
    dieClass,
    rollResult,
    attributeKey,
    equationTerms: buildEquationTerms({ subtype: 'attack', attributeKey, rollData: { ...rollData, attributeValue } }),
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
  const baseAttackBonus = Number(sourceItem?.system?.bonuses?.attack ?? 0);
  const overrideAttackBonus = Number(input.attackBonus ?? baseAttackBonus);
  const showBaseAttackBonus = baseAttackBonus !== 0 && overrideAttackBonus === baseAttackBonus;
  const rows = [
    { label: localize('SYNTHICIDE.Roll.Card.Armor'), value: armor },
  ];

  if (showBaseAttackBonus) {
    rows.push({
      label: localize('SYNTHICIDE.Roll.Card.BaseAttackBonus'),
      value: baseAttackBonus,
    });
  }

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

  rows.push(
    ...buildWeaponSpecializationMetadataRows({
      input,
      includeAttackBonus: true,
      includeDamageBonus: true,
      includeLethalBonus: true,
      includeShockRdBonus: true,
    })
  );

  return rows;
}

function isSlugShotActive({ input, sourceItem }) {
  if (!input?.slugShotActive) return false;
  const modifications = sourceItem?.system?.modifications;
  if (modifications instanceof Set) return modifications.has('slugShot');
  if (Array.isArray(modifications)) return modifications.includes('slugShot');
  return false;
}
