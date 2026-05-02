// Challenge card data preparation for Synthicide
// Extracted from action-rolls.mjs for modularity and clarity
import { localize, getAttributeLabel, getDegreeLabel, getDifficultyLabel, formatSignedNumber, getChallengeOutcomeClass, buildEquationTerms, buildBaseActionCardData, getRollResultSummary } from './roll-utils.mjs';

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
  const { d10, total, equation, dieClass } = getRollResultSummary(rollResult);
  const attributeKey = input.attribute;
  const effect = total - difficulty;
  const degree = getDegreeLabel(effect);
  const difficultyLabel = getDifficultyLabel(difficulty);
  const effectValue = formatSignedNumber(effect);

  // Data for strict DataModel validation
  const system = {
    attribute: attributeKey,
    difficulty,
    total,
    actorUuid: actor?.uuid ?? null,
  };

  const cardExtras = buildBaseActionCardData({
    subtype: 'challenge',
    equation,
    total,
    dieValue: d10,
    dieClass,
    rollResult,
    attributeKey,
    equationTerms: buildEquationTerms({ subtype: 'challenge', attributeKey, rollData: { ...input, attributeValue } }),
    showEffectOutcomeRow: true,
    showDamageButton: false,
    showOpposedButton: true,
    effectText: effectValue,
    outcomeLabel: degree,
    outcomeClass: getChallengeOutcomeClass(effect),
    metadataRows: buildChallengeMetadataRows({ difficultyLabel, effectValue })
  });

  return {
    type: 'challenge',
    system,
    ...cardExtras,
    title: localize('SYNTHICIDE.Roll.Card.TitleChallenge'),
    flavor: buildChallengeFlavor({ attributeKey, difficultyLabel }),
    showTotalRow: false
  };
}

function buildChallengeFlavor({ attributeKey, difficultyLabel }) {
  return localize('SYNTHICIDE.Roll.Card.DefaultFlavorChallenge', {
    difficulty: difficultyLabel,
    attribute: getAttributeLabel(attributeKey),
  });
}

function buildChallengeMetadataRows({ difficultyLabel, effectValue }) {
  return [
    { label: localize('SYNTHICIDE.Roll.Card.Difficulty'), value: difficultyLabel },
    { label: localize('SYNTHICIDE.Roll.Card.Effect'), value: effectValue },
  ];
}
