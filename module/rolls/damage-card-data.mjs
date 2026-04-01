// module/rolls/damage-card-data.js
// Modular function to prepare card data for derived damage rolls

import { localize, getDieClass, buildEquationTerms } from './roll-utils.mjs';
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
}) {
  // Extract values from input and item
  const d10 = input.d10 ?? 0;
  const damageBonus = input.damageBonus ?? item?.system?.damageBonus ?? 0;
  const damageType = input.damageType ?? item?.system?.damageType ?? '';
  const baseDamage = input.baseDamage ?? item?.system?.baseDamage ?? 0;
  const source = input.source ?? item?.name ?? '';
  const total = input.total ?? d10 + attributeValue + damageBonus;
  const messageMode = input.messageMode ?? 'public';
  const lethal = input.flags?.damage?.lethal ?? item?.system?.lethal ?? 0;
  const sourceMessageId = input.sourceMessageId ?? null;
  const sourceItemUuid = input.sourceItemUuid ?? null;
  const userId = input.userId ?? (typeof game !== 'undefined' ? game.user.id : null);
  const actorUuid = actor?.uuid ?? null;

  return {
    actorId: actor?.id,
    itemId: item?.id,
    source,
    baseDamage,
    damageBonus,
    damageType,
    title: localize('SYNTHICIDE.Roll.Card.TitleDamage'),
    subtype: 'damage',
    flavor: localize('SYNTHICIDE.Roll.Card.DerivedFromAttack'),
    equation: `${d10} + ${attributeValue} + ${damageBonus}`,
    total,
    showEffectOutcomeRow: false,
    dieValue: d10,
    dieClass: getDieClass(d10, 10),
    equationTerms: buildEquationTerms({ subtype: 'damage', attributeKey: 'combat', rollData: { ...input, attributeValue, damageBonus } }),
    metadataRows: [
      { label: localize('SYNTHICIDE.Roll.Card.SourceAttack'), value: source },
    ],
    showDamageButton: false,
    showOpposedButton: false,
    flags: {
      version: 2,
      subtype: 'damage',
      actorUuid,
      userId,
      sourceMessageId,
      sourceItemUuid,
      messageMode,
      damage: {
        sourceMessageId,
        d10,
        attributeValue,
        damageBonus,
        total,
        lethal,
      },
    },
  };
}
