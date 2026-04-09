import SYNTHICIDE from '../helpers/config.mjs';

const ATTRIBUTE_COMBAT = 'combat';

export function getStandardizedRollData(message) {
  const flags = message.getFlag('synthicide', 'actionRoll') ?? {};
  let data = {};
  if (flags.subtype === 'attack' && flags.attack) data = flags.attack;
  else if (flags.subtype === 'challenge' && flags.challenge) data = flags.challenge;
  else if (flags.subtype === 'damage' && flags.damage) data = flags.damage;
  else if (flags.subtype === 'demolition' && flags.demolition) data = flags.demolition;
  return {
    subtype: flags.subtype,
    ...data,
    actorUuid: flags.actorUuid,
    userId: flags.userId,
    messageMode: flags.messageMode,
    sourceItemUuid: flags.sourceItemUuid,
    sourceMessageId: flags.sourceMessageId,
  };
}

export function localize(key, data) {
  return game.i18n.format(key, data);
}

export function formatSignedNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '0';
  if (numeric > 0) return `+${numeric}`;
  return `${numeric}`;
}

export function normalizeAttributeKey(attributeKey) {
  return attributeKey && SYNTHICIDE.attributes?.[attributeKey] ? attributeKey : ATTRIBUTE_COMBAT;
}

export function buildEquationTerms({ subtype, attributeKey, rollData }) {
  const isDamage = subtype === 'damage';
  const isAttack = subtype === 'attack';

  const terms = [
    { label: localize('SYNTHICIDE.Roll.Card.Attribute'), valueHtml: getAttributeValueHtml(attributeKey) },
    { label: localize('SYNTHICIDE.Roll.Card.AttributeValue'), value: rollData.attributeValue ?? rollData.attribute },
  ];

  if (isDamage) {
    terms.push({ label: localize('SYNTHICIDE.Roll.Card.DamageBonus'), value: rollData.damageBonus ?? 0 });
    return terms;
  }

  terms.push({ label: localize('SYNTHICIDE.Roll.Card.MiscModifier'), value: rollData.misc });

  if (isAttack) {
    terms.push({ label: localize('SYNTHICIDE.Roll.Card.AttackBonus'), value: rollData.attackBonus });
  }

  terms.push({ label: localize('SYNTHICIDE.Roll.Dialog.RollModifiers'), value: rollData.actorModifierTotal ?? 0 });

  if (isAttack) {
    terms.push({ label: localize('SYNTHICIDE.Roll.Card.RangeModifier'), value: Number(rollData.rangeModifier ?? 0) });
  }

  return terms;
}

export function getAttributeLabel(attributeKey) {
  const key = normalizeAttributeKey(attributeKey);
  return game.i18n.localize(SYNTHICIDE.attributes[key]) || key;
}

export function getAttributeValueHtml(attributeKey) {
  const key = normalizeAttributeKey(attributeKey);
  const label = foundry.utils.escapeHTML(getAttributeLabel(key));
  return `<span class="synthicide-attr-pill"><img class="synthicide-attr-icon" src="/systems/synthicide/assets/icons/attributes/${key}.png" alt="" /> ${label}</span>`;
}

export function getDegreeLabel(effect) {
  const bands = SYNTHICIDE.rolls?.degreeBands ?? [];
  const match = bands.find((band) => effect >= Number(band.min)) ?? bands.at(-1);
  return match ? game.i18n.localize(match.label) : game.i18n.localize('SYNTHICIDE.Roll.Degree.Failure');
}

export function getDifficultyLabel(difficulty) {
  const normalized = Number(difficulty);
  const list = SYNTHICIDE.rolls?.challengeDifficulties ?? [];
  const match = list.find((entry) => Number(entry.value) === normalized);
  return match ? localize(match.label) : String(difficulty);
}

export function getChallengeOutcomeClass(effect) {
  if (effect < 0) return 'outcome-failure';
  if (effect >= 10) return 'outcome-superb';
  if (effect >= 5) return 'outcome-excellent';
  return 'outcome-standard';
}

export function getDieClass(dieValue, sides = 10) {
  const value = Number(dieValue);
  if (!Number.isFinite(value)) return '';
  if (value <= 1) return 'min';
  if (value >= sides) return 'max';
  return '';
}

export function getRollResultSummary(rollResult) {
  const d10 = Number(rollResult?.dice?.[0]?.results?.[0]?.result ?? 0);
  const total = Number(rollResult?.total ?? 0);
  return {
    d10,
    total,
    equation: String(rollResult?.result ?? ''),
    dieClass: getDieClass(d10, 10),
  };
}

export function buildBaseActionCardData({
  title,
  subtype,
  rollResult,
  total,
  equation,
  dieValue,
  dieClass,
  attributeKey,
  equationTerms,
  showEffectOutcomeRow = false,
  showDamageButton = false,
  showOpposedButton = false,
  flavor,
  subtitle,
  effectText,
  effectClass,
  outcomeLabel,
  outcomeClass,
  metadataRows = [],
} = {}) {
  return {
    title,
    subtype,
    equation: equation ?? String(rollResult?.result ?? ''),
    total: Number(total ?? rollResult?.total ?? 0),
    dieValue: Number(dieValue ?? rollResult?.dice?.[0]?.results?.[0]?.result ?? 0),
    dieClass: dieClass ?? getDieClass(dieValue ?? rollResult?.dice?.[0]?.results?.[0]?.result ?? 0, 10),
    attributeKey,
    equationTerms,
    showEffectOutcomeRow,
    showDamageButton,
    showOpposedButton,
    flavor,
    subtitle,
    effectText,
    effectClass,
    outcomeLabel,
    outcomeClass,
    metadataRows,
  };
}

export function buildBaseActionFlags({
  subtype,
  actorUuid,
  sourceItemUuid = null,
  sourceMessageId = null,
  messageMode,
  userId,
  payloadKey,
  payload,
} = {}) {
  const flags = {
    version: 2,
    subtype,
    actorUuid,
    userId: userId ?? game.user.id,
    sourceItemUuid,
    messageMode,
    [payloadKey]: payload,
  };

  if (sourceMessageId) flags.sourceMessageId = sourceMessageId;
  return flags;
}