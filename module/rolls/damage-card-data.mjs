// module/rolls/damage-card-data.js
// Modular function to prepare card data for derived damage rolls

import { localize, buildEquationTerms, buildBaseActionCardData, extractCardContext } from './roll-utils.mjs';
/**
 * Prepare cardData and flags for a derived damage roll.
 * @param {object} params
 * @param {object} params.input - Data from the attack roll/card
 * @param {object} params.actor - The actor performing the roll
 * @param {object} params.item - The item (weapon, etc.) involved in the roll (optional)
 * @param {number} params.attributeValue - The resolved attribute value
 * @returns {object} cardData
 */
export function prepareDamageCardData({
  input = {},
  actor,
  item,
  attributeValue = 0,
  overrides = {},
}) {
  // Extract values from input and item
  const d10 = input.d10 ?? 0;
  const damageBonus = input.damageBonus ?? item?.system?.bonuses?.damage ?? 0;
  const source = input.source ?? item?.name ?? '';
  const total = input.total ?? d10 + attributeValue + damageBonus;
  const lethal = input.lethal ?? item?.system?.bonuses?.lethal ?? 0;
  const actorUuid = actor?.uuid ?? null;
  const { messageMode, sourceItemUuid, sourceMessageId } = extractCardContext({ input, sourceItem: item });

  // Strict system data for DataModel validation
  const system = {
    total,
    lethal,
    actorUuid,
    sourceItemUuid,
    sourceMessageId,
  };

  const cardExtras = buildBaseActionCardData({
    subtype: 'damage',
    equation: `${d10} + ${attributeValue} + ${damageBonus}`,
    total,
    dieValue: d10,
    attributeKey: 'combat',
    equationTerms: buildEquationTerms({ subtype: 'damage', attributeKey: 'combat', rollData: { ...input, attributeValue, damageBonus } }),
    metadataRows: overrides.metadataRows ?? buildDamageMetadataRows({ source, lethal }),
    showEffectOutcomeRow: false,
    showDamageButton: false,
    showOpposedButton: false
  });

  return {
    type: 'damage',
    system,
    messageMode,
    ...cardExtras,
    title: overrides.title ?? localize('SYNTHICIDE.Roll.Card.TitleDamage'),
    flavor: overrides.flavor ?? localize('SYNTHICIDE.Roll.Card.DerivedFromAttack'),
    total,
    showTotalRow: true // Explicitly add showTotalRow for template context
  };
}

function buildDamageMetadataRows({ source, lethal }) {
  return [
    { label: localize('SYNTHICIDE.Roll.Card.SourceAttack'), value: source },
    { label: localize('SYNTHICIDE.Roll.Card.LethalValue'), value: lethal },
  ];
}
