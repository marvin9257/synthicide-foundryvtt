// Challenge card data preparation for Synthicide
// Extracted from action-rolls.mjs for modularity and clarity
import { localize, getAttributeLabel, getDegreeLabel, getDifficultyLabel, formatSignedNumber, getChallengeOutcomeClass, getDieClass, buildEquationTerms } from './action-rolls.mjs';

/**
 * Prepare cardData and flags for a challenge roll.
 * @param {object} params
 * @param {object} params.input - User input from dialog
 * @param {object} params.actor - The actor performing the roll
 * @param {object} params.rollResult - The evaluated Roll object
 * @param {number} params.attributeValue - The resolved attribute value
 * @param {number} params.difficulty - The challenge difficulty
 */
export function prepareChallengeCardData({ input, actor, rollResult, attributeValue, difficulty }) {
  const d10 = Number(rollResult.dice?.[0]?.results?.[0]?.result ?? 0);
  const total = Number(rollResult.total ?? 0);
  const attributeKey = input.attribute;
  const effect = total - difficulty;
  const degree = getDegreeLabel(effect);
  const difficultyLabel = getDifficultyLabel(difficulty);
  const effectValue = formatSignedNumber(effect);

  return {
    title: localize('SYNTHICIDE.Roll.Card.TitleChallenge'),
    subtype: 'challenge',
    equation: rollResult.result,
    total,
    dieValue: d10,
    dieClass: getDieClass(d10, 10),
    equationTerms: buildEquationTerms({ subtype: 'challenge', attributeKey, rollData: { ...input, attributeValue } }),
    attributeKey,
    showEffectOutcomeRow: true,
    showDamageButton: false,
    showOpposedButton: true,
    flavor: localize('SYNTHICIDE.Roll.Card.DefaultFlavorChallenge', {
      difficulty: difficultyLabel,
      attribute: getAttributeLabel(attributeKey),
    }),
    subtitle: difficultyLabel,
    effectText: effectValue,
    outcomeLabel: degree,
    outcomeClass: getChallengeOutcomeClass(effect),
    metadataRows: [
      { label: localize('SYNTHICIDE.Roll.Card.Difficulty'), value: difficultyLabel },
      { label: localize('SYNTHICIDE.Roll.Card.Effect'), value: effectValue },
    ],
    flags: {
      version: 2, // Use your ACTION_ROLL_VERSION
      subtype: 'challenge',
      actorUuid: actor.uuid,
      userId: game.user.id,
      messageMode: input.messageMode,
      challenge: {
        attribute: attributeKey,
        attributeValue,
        difficulty,
        d10,
        total,
        effect,
        degree,
      },
    },
  };
}
