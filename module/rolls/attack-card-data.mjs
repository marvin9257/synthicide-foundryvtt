// Attack card data preparation for Synthicide
// Extracted from action-rolls.mjs for modularity and clarity

import { localize, getAttributeLabel, getDieClass, buildEquationTerms } from './roll-utils.mjs';
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
  const d10 = Number(rollResult.dice?.[0]?.results?.[0]?.result ?? 0);
  const total = Number(rollResult.total ?? 0);
  const armor = Number(input.armor ?? 0);
  const attackBonus = Number(input.attackBonus ?? 0);
  const damageBonus = Number(input.damageBonus ?? 0);
  const rangeModifier = Number(input.rangeModifier ?? 0);
  const rangeDistance = Number.isFinite(Number(input.rangeDistance)) ? Number(input.rangeDistance) : null;
  const rangeIncrement = Number.isFinite(Number(input.rangeIncrement)) ? Number(input.rangeIncrement) : null;
  const hit = total >= armor;
  const damageTotal = d10 + attributeValue + damageBonus;
  const attributeKey = input.attribute;
  const lethal = Number(sourceItem?.system?.lethal ?? 0);

  return {
    title: localize('SYNTHICIDE.Roll.Card.TitleAttack'),
    subtype: 'attack',
    equation: rollResult.result,
    total,
    dieValue: d10,
    dieClass: getDieClass(d10, 10),
    equationTerms: buildEquationTerms({ subtype: 'attack', attributeKey, rollData: { ...input, attributeValue } }),
    attributeKey,
    showEffectOutcomeRow: false,
    showDamageButton: hit,
    showOpposedButton: false,
    flavor: localize('SYNTHICIDE.Roll.Card.DefaultFlavorAttack', {
      attribute: getAttributeLabel(attributeKey),
      armor,
      item: sourceItem?.name || localize('SYNTHICIDE.Roll.Subtype.Attack'),
    }),
    effectText: hit ? localize('SYNTHICIDE.Roll.Outcome.Hit') : localize('SYNTHICIDE.Roll.Outcome.Miss'),
    effectClass: hit ? 'outcome-success' : 'outcome-failure',
    metadataRows: [
      { label: localize('SYNTHICIDE.Roll.Card.Armor'), value: armor },
      { label: localize('SYNTHICIDE.Roll.Card.Distance'), value: rangeDistance ?? 'n/a' },
      { label: localize('SYNTHICIDE.Roll.Card.RangeIncrement'), value: rangeIncrement ?? 'n/a' }
    ],
    flags: {
      version: 2, // Use your ACTION_ROLL_VERSION
      subtype: 'attack',
      actorUuid: actor.uuid,
      userId: game.user.id,
      sourceItemUuid: sourceItem?.uuid ?? null,
      messageMode: input.messageMode,
      attack: {
        armor,
        attackBonus,
        damageBonus,
        attribute: attributeKey,
        attributeValue,
        d10,
        attackTotal: total,
        hit,
        damageTotal,
        lethal,
        rangeModifier,
        rangeDistance,
        rangeIncrement,
        weaponClass: input.weaponClass ?? null,
        hasCloseFeature: Boolean(input.hasCloseFeature),
      },
    },
  };
}
