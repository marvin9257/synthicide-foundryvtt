// Attack card data preparation for Synthicide
// Extracted from action-rolls.mjs for modularity and clarity

import { localize, getAttributeLabel, buildEquationTerms, buildBaseActionCardData, buildBaseActionFlags, getRollResultSummary } from './roll-utils.mjs';
/**
 * Prepare cardData and flags for an attack roll.
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
  const damageBonus = Number(input.damageBonus ?? 0);
  const rangeDistance = Number.isFinite(Number(input.rangeDistance)) ? Number(input.rangeDistance) : null;
  const rangeIncrement = Number.isFinite(Number(input.rangeIncrement)) ? Number(input.rangeIncrement) : null;
  const hit = total >= armor;
  const attributeKey = input.attribute;
  const lethal = Number(sourceItem?.system?.lethal ?? 0);

  // Persist only fields needed by follow-up actions (damage, chat context shock resolution).
  const payload = {
    armor,
    damageBonus,
    attribute: attributeKey,
    attributeValue,
    d10,
    hit,
    lethal,
  };

  return {
    ...buildBaseActionCardData({
      title: localize('SYNTHICIDE.Roll.Card.TitleAttack'),
      subtype: 'attack',
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
      flavor: buildAttackFlavor({ attributeKey, armor, sourceItem }),
      effectText: hit ? localize('SYNTHICIDE.Roll.Outcome.Hit') : localize('SYNTHICIDE.Roll.Outcome.Miss'),
      effectClass: hit ? 'outcome-success' : 'outcome-failure',
      metadataRows: buildAttackMetadataRows({ armor, rangeDistance, rangeIncrement }),
    }),
    flags: buildBaseActionFlags({
      subtype: 'attack',
      actorUuid: actor.uuid,
      sourceItemUuid: sourceItem?.uuid ?? null,
      messageMode: input.messageMode,
      payloadKey: 'attack',
      payload,
    }),
  };
}

function buildAttackFlavor({ attributeKey, armor, sourceItem }) {
  return localize('SYNTHICIDE.Roll.Card.DefaultFlavorAttack', {
    attribute: getAttributeLabel(attributeKey),
    armor,
    item: sourceItem?.name || localize('SYNTHICIDE.Roll.Subtype.Attack'),
  });
}

function buildAttackMetadataRows({ armor, rangeDistance, rangeIncrement }) {
  return [
    { label: localize('SYNTHICIDE.Roll.Card.Armor'), value: armor },
    { label: localize('SYNTHICIDE.Roll.Card.Distance'), value: rangeDistance ?? 'n/a' },
    { label: localize('SYNTHICIDE.Roll.Card.RangeIncrement'), value: rangeIncrement ?? 'n/a' }
  ];
}
