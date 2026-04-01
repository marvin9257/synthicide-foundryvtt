// module/rolls/damage-card-data.js
// Modular function to prepare card data for derived damage rolls

import { localize, buildEquationTerms, buildBaseActionCardData, buildBaseActionFlags } from './roll-utils.mjs';
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
  const damageBonus = input.damageBonus ?? item?.system?.damageBonus ?? 0;
  const source = input.source ?? item?.name ?? '';
  const total = input.total ?? d10 + attributeValue + damageBonus;
  const messageMode = input.messageMode ?? 'public';
  const lethal = input.flags?.damage?.lethal ?? item?.system?.lethal ?? 0;
  const sourceMessageId = input.sourceMessageId ?? null;
  const sourceItemUuid = input.sourceItemUuid ?? null;
  const userId = input.userId ?? (typeof game !== 'undefined' ? game.user.id : null);
  const actorUuid = actor?.uuid ?? null;

  // Persist only fields needed by chat-log apply damage/healing actions.
  const payload = {
    total,
    lethal,
  };

  return {
    ...buildBaseActionCardData({
      title: overrides.title ?? localize('SYNTHICIDE.Roll.Card.TitleDamage'),
      subtype: 'damage',
      equation: `${d10} + ${attributeValue} + ${damageBonus}`,
      total,
      dieValue: d10,
      attributeKey: 'combat',
      equationTerms: buildEquationTerms({ subtype: 'damage', attributeKey: 'combat', rollData: { ...input, attributeValue, damageBonus } }),
      metadataRows: overrides.metadataRows ?? buildDamageMetadataRows({ source }),
      showEffectOutcomeRow: false,
      showDamageButton: false,
      showOpposedButton: false,
      flavor: overrides.flavor ?? localize('SYNTHICIDE.Roll.Card.DerivedFromAttack'),
    }),
    flags: buildBaseActionFlags({
      subtype: 'damage',
      actorUuid,
      sourceItemUuid,
      sourceMessageId,
      messageMode,
      userId,
      payloadKey: 'damage',
      payload,
    }),
  };
}

function buildDamageMetadataRows({ source }) {
  return [
    { label: localize('SYNTHICIDE.Roll.Card.SourceAttack'), value: source },
  ];
}
