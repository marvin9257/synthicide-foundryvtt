
import SYNTHICIDE from '../helpers/config.mjs';

const FLAG_PATH = 'actionRoll';
const DIALOG_TEMPLATE = 'systems/synthicide/templates/dialog/action-roll-dialog.hbs';
const CARD_TEMPLATE = 'systems/synthicide/templates/chat/action-roll-card.hbs';
const ACTION_ROLL_DIALOG_ICON = 'systems/synthicide/assets/synthicidePause.svg';
const ATTRIBUTE_COMBAT = 'combat';
const ACTION_ROLL_VERSION = 2;
const FORMULA_CHALLENGE = '1d10 + @attribute + @misc + @modifiers';
const FORMULA_ATTACK = '1d10 + @attribute + @misc + @attackBonus + @modifiers';

const SUBTYPES = {
  CHALLENGE: 'challenge',
  ATTACK: 'attack',
  DAMAGE: 'damage',
};

/* -------------------------------------------- */
/* Public API                                   */
/* -------------------------------------------- */

export async function openSynthicideActionRollDialog({
  actor,
  subtype = SUBTYPES.CHALLENGE,
  attribute = ATTRIBUTE_COMBAT,
  sourceItem = null,
  allowSubtypeChange = false,
} = {}) {
  if (!actor) return null;
  const attributeKey = getActionAttributeKey(subtype, attribute);
 
  const result = await renderActionRollDialog({
    title: localize('SYNTHICIDE.Roll.Dialog.Title'),
    defaults: {
      actor,
      subtype,
      attribute: attributeKey,
      difficulty: 6,
      misc: 0,
      armor: isAttackSubtype(subtype) ? getTargetArmor() : 0,
      attackBonus: 0,
      damageBonus: 0,
      messageMode: getDefaultMessageMode(),
      allowSubtypeChange,
    },
  });

  if (!result) return null;

  const subtypeToRun = result.subtype === SUBTYPES.ATTACK ? SUBTYPES.ATTACK : SUBTYPES.CHALLENGE;
  return executeActionRoll({ actor, input: result, sourceItem, subtype: subtypeToRun });
}

export function registerActionRollHooks() {
  Hooks.on('renderChatMessageHTML', activateActionRollChatListeners);
}

/* -------------------------------------------- */
/* Roll Execution                               */
/* -------------------------------------------- */

async function executeDerivedDamageRoll({ sourceMessage, userMessageMode }) {
  const flags = sourceMessage.getFlag('synthicide', FLAG_PATH);
  const attack = flags?.attack;

  if (!flags || flags.subtype !== SUBTYPES.ATTACK || !attack) {
    return ui.notifications.warn(localize('SYNTHICIDE.Roll.Warnings.AttackDataMissing'));
  }
  if (!attack.hit) {
    return ui.notifications.warn(localize('SYNTHICIDE.Roll.Warnings.DamageRequiresHit'));
  }

  const actor = game.actors?.get(flags.actorId);
  if (!actor) return ui.notifications.warn(localize('SYNTHICIDE.Roll.Warnings.ActorMissing'));

  // Ensure attributeValue is always set to combat
  const combatValue = getActorAttributeValue(actor, ATTRIBUTE_COMBAT);
  const messageMode = normalizeMessageMode(userMessageMode ?? flags.messageMode ?? flags.messageType ?? 'public');
  const summaryRoll = await new Roll(`${attack.d10} + ${combatValue} + ${attack.damageBonus}`).evaluate();
  const damageTotal = Number(summaryRoll.total ?? 0);

  return createActionMessage({
    actor,
    roll: summaryRoll,
    messageMode,
    cardData: {
      title: localize('SYNTHICIDE.Roll.Card.TitleDamage'),
      subtype: SUBTYPES.DAMAGE,
      flavor: localize('SYNTHICIDE.Roll.Card.DerivedFromAttack'),
      equation: `${attack.d10} + ${combatValue} + ${attack.damageBonus}`,
      total: damageTotal,
      showEffectOutcomeRow: false,
      dieValue: attack.d10,
      dieClass: getDieClass(attack.d10, 10),
      equationTerms: [
        { label: localize('SYNTHICIDE.Roll.Card.Attribute'), valueHtml: getAttributeValueHtml(ATTRIBUTE_COMBAT) },
        { label: localize('SYNTHICIDE.Roll.Card.AttributeValue'), value: combatValue },
        { label: localize('SYNTHICIDE.Roll.Card.DamageBonus'), value: attack.damageBonus },
      ],
      metadataRows: [
        { label: localize('SYNTHICIDE.Roll.Card.SourceAttack'), value: sourceMessage.speaker?.alias ?? sourceMessage.id },
      ],
      showDamageButton: false,
      showOpposedButton: false,
      flags: {
        version: ACTION_ROLL_VERSION,
        subtype: SUBTYPES.DAMAGE,
        actorId: actor.id,
        userId: game.user.id,
        sourceMessageId: sourceMessage.id,
        sourceItemUuid: flags.sourceItemUuid ?? null,
        messageMode,
        damage: {
          sourceMessageId: sourceMessage.id,
          d10: attack.d10,
          attributeValue: combatValue,
          damageBonus: attack.damageBonus,
          total: damageTotal,
        },
      },
    },
  });
}

async function executeOpposedChallengeRoll({ sourceMessage }) {
  const sourceFlags = sourceMessage.getFlag('synthicide', FLAG_PATH);
  const sourceChallenge = sourceFlags?.challenge;
  if (!sourceFlags || sourceFlags.subtype !== SUBTYPES.CHALLENGE || !sourceChallenge) {
    return ui.notifications.warn(localize('SYNTHICIDE.Roll.Warnings.ChallengeDataMissing'));
  }

  const actor = canvas?.tokens?.controlled?.[0]?.actor ?? game.user?.character ?? game.actors?.get(sourceFlags.actorId);
  if (!actor) return ui.notifications.warn(localize('SYNTHICIDE.Roll.Warnings.ActorMissing'));

  const sourceMode = normalizeMessageMode(sourceFlags.messageMode ?? sourceFlags.messageType ?? 'public');
  const result = await renderActionRollDialog({
    title: localize('SYNTHICIDE.Roll.Dialog.OpposedTitle'),
    defaults: {
      actor,
      subtype: SUBTYPES.CHALLENGE,
      attribute: sourceChallenge.attribute ?? ATTRIBUTE_COMBAT,
      difficulty: sourceChallenge.difficulty ?? 6,
      misc: parseNumeric(sourceChallenge.misc, 0),
      armor: 10,
      attackBonus: 0,
      damageBonus: 0,
      messageMode: sourceMode,
      allowSubtypeChange: false,
    },
  });

  if (!result) return null;

  const opposedRollMessage = await executeActionRoll({
    actor,
    input: result,
    sourceItem: null,
    subtype: SUBTYPES.CHALLENGE,
  });
  if (!opposedRollMessage) return null;

  const opposedFlags = opposedRollMessage.getFlag('synthicide', FLAG_PATH);
  const opposedTotal = Number(opposedFlags?.challenge?.total ?? 0);
  const sourceTotal = Number(sourceChallenge.total ?? 0);

  let winnerText;
  if (opposedTotal > sourceTotal) {
    winnerText = localize('SYNTHICIDE.Roll.Opposed.Result.ChallengerWins', {
      challenger: opposedRollMessage.speaker?.alias ?? localize('SYNTHICIDE.Roll.Opposed.Challenger'),
      total: opposedTotal,
      opposedTotal: sourceTotal,
    });
  } else if (sourceTotal > opposedTotal) {
    winnerText = localize('SYNTHICIDE.Roll.Opposed.Result.SourceWins', {
      source: sourceMessage.speaker?.alias ?? localize('SYNTHICIDE.Roll.Opposed.Source'),
      total: sourceTotal,
      opposedTotal,
    });
  } else {
    winnerText = localize('SYNTHICIDE.Roll.Opposed.Result.Tie', { total: sourceTotal });
  }

  await ChatMessage.create({
    content: `<div class="synthicide-opposed-summary"><strong>${localize('SYNTHICIDE.Roll.Opposed.SummaryTitle')}</strong><p>${winnerText}</p></div>`,
    speaker: ChatMessage.getSpeaker({ actor }),
    messageMode: sourceMode,
  });

  return opposedRollMessage;
}

/**
 * Generic action roll executor for challenge and attack.
 */
async function executeActionRoll({ actor, input, sourceItem, subtype }) {
  const attributeKey = getActionAttributeKey(subtype, input.attribute);
  const rollData = buildActionRollData({ actor, input, attributeKey });
  const armor = parseNumeric(input.armor, 0);
  const difficulty = parseNumeric(input.difficulty, 6);
  const damageBonus = parseNumeric(input.damageBonus, 0);
  const formula = isAttackSubtype(subtype) ? FORMULA_ATTACK : FORMULA_CHALLENGE;
  const evaluatedRoll = await new Roll(formula, rollData).evaluate();
  const total = Number(evaluatedRoll.total ?? 0);
  const d10 = Number(evaluatedRoll.dice?.[0]?.results?.[0]?.result ?? 0);
  const equationTerms = buildEquationTerms({ subtype, attributeKey, rollData });
  const messageMode = normalizeMessageMode(input.messageMode);
  const isAttack = isAttackSubtype(subtype);
  const isChallenge = subtype === SUBTYPES.CHALLENGE;

  let cardData = {
    title: isAttack ? localize('SYNTHICIDE.Roll.Card.TitleAttack') : localize('SYNTHICIDE.Roll.Card.TitleChallenge'),
    subtype,
    equation: evaluatedRoll.result,
    total,
    dieValue: d10,
    dieClass: getDieClass(d10, 10),
    equationTerms,
    showEffectOutcomeRow: isChallenge,
    showDamageButton: isAttack && total >= armor,
    showOpposedButton: isChallenge,
    flags: {
      version: ACTION_ROLL_VERSION,
      subtype,
      actorId: actor.id,
      userId: game.user.id,
      sourceItemUuid: sourceItem?.uuid ?? null,
      messageMode,
    },
    flavor: '',
    metadataRows: [],
  };

  if (isAttack) {
    const attributeValue = Number(rollData.attribute ?? 0);
    const hit = total >= armor;
    const damageTotal = d10 + attributeValue + damageBonus;
    cardData.flavor = localize('SYNTHICIDE.Roll.Card.DefaultFlavorAttack', {
      attribute: getAttributeLabel(attributeKey),
      armor,
      item: sourceItem?.name || localize('SYNTHICIDE.Roll.Subtype.Attack'),
    });
    cardData.effectText = hit ? localize('SYNTHICIDE.Roll.Outcome.Hit') : localize('SYNTHICIDE.Roll.Outcome.Miss');
    cardData.effectClass = hit ? 'outcome-success' : 'outcome-failure';
    cardData.metadataRows = [
      { label: localize('SYNTHICIDE.Roll.Card.Armor'), value: armor },
      { label: localize('SYNTHICIDE.Roll.Card.DamageBonus'), value: damageBonus },
    ];
    cardData.flags.attack = {
      attribute: attributeKey,
      attributeValue,
      armor,
      damageBonus,
      d10,
      attackTotal: total,
      hit,
      damageTotal,
    };
  } else {
    const effect = total - difficulty;
    const degree = getDegreeLabel(effect);
    const difficultyLabel = getDifficultyLabel(difficulty);
    const effectValue = formatSignedNumber(effect);
    cardData.flavor = localize('SYNTHICIDE.Roll.Card.DefaultFlavorChallenge', {
      difficulty: difficultyLabel,
      attribute: getAttributeLabel(attributeKey),
    });
    cardData.subtitle = difficultyLabel;
    cardData.effectText = effectValue;
    cardData.outcomeLabel = degree;
    cardData.outcomeClass = getChallengeOutcomeClass(effect);
    cardData.metadataRows = [
      { label: localize('SYNTHICIDE.Roll.Card.Difficulty'), value: difficultyLabel },
      { label: localize('SYNTHICIDE.Roll.Card.Effect'), value: effectValue },
    ];
    cardData.flags.challenge = {
      attribute: attributeKey,
      difficulty,
      d10,
      total,
      effect,
      degree,
    };
  }

  return createActionMessage({
    actor,
    roll: evaluatedRoll,
    messageMode,
    cardData,
  });
}

/* -------------------------------------------- */
/* Chat Cards                                   */
/* -------------------------------------------- */

async function createActionMessage({ actor, roll, cardData, messageMode }) {
  const rollHtml = await roll.render();
  const content = await foundry.applications.handlebars.renderTemplate(CARD_TEMPLATE, {
    ...cardData,
    rollHtml,
  });

  const chatData = await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    style: getChatMessageStyle(),
    flags: {
      synthicide: {
        [FLAG_PATH]: cardData.flags,
      },
    },
  }, {
    messageMode: normalizeMessageMode(messageMode),
    create: false,
  });

  return ChatMessage.create(chatData);
}

function activateActionRollChatListeners(message, htmlElement) {
  if (!htmlElement || typeof htmlElement.querySelectorAll !== 'function' || typeof htmlElement.addEventListener !== 'function') return;
  const flags = message?.getFlag?.('synthicide', FLAG_PATH);
  if (!flags || (flags.subtype !== SUBTYPES.ATTACK && flags.subtype !== SUBTYPES.CHALLENGE)) return;
  const root = htmlElement;
  const allowed = canExecuteFollowup(message);

  for (const button of root.querySelectorAll('[data-action="rollDamage"]')) {
    if (!allowed) button.disabled = true;
  }

  if (root.dataset.synthicideActionBound === 'true') return;
  root.dataset.synthicideActionBound = 'true';
  root.addEventListener('click', (event) => onActionRollCardClick(event, message));
}

async function onActionRollCardClick(event, message) {
  const button = event.target?.closest?.('[data-action]');
  if (!button) return;

  const action = button.dataset.action;
  if (action !== 'rollDamage' && action !== 'rollOpposed') return;

  event.preventDefault();
  if (button.disabled) return;

  if (action === 'rollDamage' && !canExecuteFollowup(message)) {
    ui.notifications.warn(localize('SYNTHICIDE.Roll.Warnings.NotPermitted'));
    return;
  }

  button.disabled = true;
  try {
    if (action === 'rollDamage') {
      await executeDerivedDamageRoll({ sourceMessage: message });
    } else {
      await executeOpposedChallengeRoll({ sourceMessage: message });
    }
  } finally {
    button.disabled = false;
  }
}

/* -------------------------------------------- */
/* Dialog Rendering                             */
/* -------------------------------------------- */

/**
 * Render and resolve the action-roll prompt.
 *
 * Uses DialogV2's `ok` callback to extract form values and return normalized
 * roll input, or `null` if the dialog is cancelled. Also applies the
 * Synthicide SVG to the dialog header icon on render.
 *
 * @param {object} params
 * @param {string} params.title
 * @param {object} params.defaults
 * @returns {Promise<object|null>}
 */
async function renderActionRollDialog({ title, defaults }) {
  const context = buildDialogContext(defaults);
  const content = await foundry.applications.handlebars.renderTemplate(DIALOG_TEMPLATE, context);

  try {
    return await foundry.applications.api.DialogV2.prompt({
      window: { title, icon: '' },
      content,
      ok: {
        label: localize('SYNTHICIDE.Roll.Dialog.RollButton'),
        callback: (event, button, dialog) => {
          const form = button?.form
            ?? event?.currentTarget?.form
            ?? event?.target?.form
            ?? dialog?.element?.querySelector?.('form.synthicide-action-roll-form')
            ?? null;
          if (!form) return null;
          return extractDialogData(form);
        },
      },
      render: (_event, dialog) => {
        const iconEl = dialog.window?.icon;
        if (!iconEl) return;

        const img = globalThis.document.createElement('img');
        img.src = ACTION_ROLL_DIALOG_ICON;
        img.alt = '';
        iconEl.className = 'window-icon synthicide-window-icon';
        iconEl.replaceChildren(img);
      },
    });
  } catch {
    return null;
  }
}

function buildDialogContext(defaults) {
  const subtype = defaults.subtype ?? SUBTYPES.CHALLENGE;
  const isAttack = isAttackSubtype(subtype);
  const difficultyList = getChallengeDifficulties();

  const actor = defaults.actor;
  const attributeKey = getActionAttributeKey(subtype, defaults.attribute ?? ATTRIBUTE_COMBAT);
  const rawRollModifiers = getActorRollModifiers(actor);
  const rollModifiers = rawRollModifiers.map((modifier) => ({
    ...modifier,
    label: formatModifierKey(modifier.key),
    valueDisplay: formatSignedNumber(modifier.value),
  }));
  const rollModifierTotalDisplay = formatSignedNumber(
    rawRollModifiers.reduce((sum, modifier) => sum + (Number(modifier.value) || 0), 0)
  );

  return {
    allowSubtypeChange: Boolean(defaults.allowSubtypeChange),
    defaultSubtype: subtype,
    isAttack,
    defaultArmor: defaults.armor ?? game.settings.get('synthicide', SYNTHICIDE.DEFAULT_TARGET_ARMOR_KEY) ?? 5,
    lockAttribute: isAttack,
    defaultAttackBonus: defaults.attackBonus ?? 0,
    defaultDamageBonus: defaults.damageBonus ?? 0,
    defaultMisc: defaults.misc ?? 0,
    subtypeOptions: [
      {
        value: SUBTYPES.CHALLENGE,
        label: localize('SYNTHICIDE.Roll.Subtype.Challenge'),
        selected: subtype === SUBTYPES.CHALLENGE,
      },
      {
        value: SUBTYPES.ATTACK,
        label: localize('SYNTHICIDE.Roll.Subtype.Attack'),
        selected: subtype === SUBTYPES.ATTACK,
      },
    ],
    messageModeOptions: getMessageModeOptions(defaults.messageMode),
    attributeOptions: getLocalizedAttributeOptions(attributeKey),
    difficultyOptions: difficultyList.map((entry) => ({
      value: entry.value,
      label: localize(entry.key),
      selected: Number(entry.value) === Number(defaults.difficulty ?? 6),
    })),
    rollModifiers,
    rollModifierTotalDisplay,
    actor,
    attributeKey,
  };
}

function extractDialogData(formElement) {
  const formData = new globalThis.FormData(formElement);
  return {
    subtype: String(formData.get('subtype') ?? SUBTYPES.CHALLENGE),
    messageMode: normalizeMessageMode(String(formData.get('messageMode') ?? 'public')),
    attribute: String(formData.get('attribute') ?? ATTRIBUTE_COMBAT),
    difficulty: parseNumeric(formData.get('difficulty'), 6),
    misc: parseNumeric(formData.get('misc'), 0),
    armor: parseNumeric(formData.get('armor'), 0),
    attackBonus: parseNumeric(formData.get('attackBonus'), 0),
    damageBonus: parseNumeric(formData.get('damageBonus'), 0),
  };
}

/* -------------------------------------------- */
/* Utilities                                    */
/* -------------------------------------------- */

function localize(key, data) {
  return game.i18n.format(key, data);
}

function parseNumeric(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatSignedNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '0';
  if (numeric > 0) return `+${numeric}`;
  return `${numeric}`;
}

function formatModifierKey(key) {
  return String(key ?? '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (char) => char.toUpperCase());
}

function normalizeAttributeKey(attributeKey) {
  return attributeKey && SYNTHICIDE.attributes?.[attributeKey] ? attributeKey : ATTRIBUTE_COMBAT;
}

function isAttackSubtype(subtype) {
  return subtype === SUBTYPES.ATTACK;
}

function getActionAttributeKey(subtype, requestedAttribute) {
  return isAttackSubtype(subtype) ? ATTRIBUTE_COMBAT : normalizeAttributeKey(requestedAttribute);
}

function buildActionRollData({ actor, input, attributeKey }) {
  const modifiers = getActorRollModifiers(actor);
  return {
    attribute: getActorAttributeValue(actor, attributeKey),
    attackBonus: parseNumeric(input.attackBonus, 0),
    misc: parseNumeric(input.misc, 0),
    modifiers: modifiers.reduce((sum, mod) => sum + (Number(mod.value) || 0), 0),
  };
}

function buildEquationTerms({ subtype, attributeKey, rollData }) {
  const terms = [
    { label: localize('SYNTHICIDE.Roll.Card.Attribute'), valueHtml: getAttributeValueHtml(attributeKey) },
    { label: localize('SYNTHICIDE.Roll.Card.AttributeValue'), value: rollData.attribute },
    { label: localize('SYNTHICIDE.Roll.Card.MiscModifier'), value: rollData.misc },
  ];

  if (isAttackSubtype(subtype)) {
    terms.push({ label: localize('SYNTHICIDE.Roll.Card.AttackBonus'), value: rollData.attackBonus });
  }

  terms.push({ label: localize('SYNTHICIDE.Roll.Dialog.RollModifiers'), value: rollData.modifiers });
  return terms;
}

function getActorAttributeValue(actor, attributeKey) {
  return Number(actor?.system?.attributes?.[attributeKey]?.current ?? 0);
}

function getAttributeLabel(attributeKey) {
  const key = normalizeAttributeKey(attributeKey);
  return game.i18n.localize(SYNTHICIDE.attributes[key]) || key;
}

function getAttributeValueHtml(attributeKey) {
  const key = normalizeAttributeKey(attributeKey);
  const label = foundry.utils.escapeHTML(getAttributeLabel(key));
  return `<span class="synthicide-attr-pill"><img class="synthicide-attr-icon" src="/systems/synthicide/assets/${key}.png" alt="" /> ${label}</span>`;
}

function getLocalizedAttributeOptions(selectedKey = 'combat') {
  return Object.entries(SYNTHICIDE.attributes ?? {}).map(([key, labelKey]) => ({
    value: key,
    label: game.i18n.localize(labelKey),
    selected: key === selectedKey,
  }));
}

function getChallengeDifficulties() {
  return SYNTHICIDE.rolls?.challengeDifficulties ?? [];
}

function getDegreeBands() {
  return SYNTHICIDE.rolls?.degreeBands ?? [];
}

function getDegreeLabel(effect) {
  const bands = getDegreeBands();
  const match = bands.find((band) => effect >= Number(band.min)) ?? bands.at(-1);
  return match ? game.i18n.localize(match.key) : game.i18n.localize('SYNTHICIDE.Roll.Degree.Failure');
}

function getDifficultyLabel(difficulty) {
  const normalized = Number(difficulty);
  const match = getChallengeDifficulties().find((entry) => Number(entry.value) === normalized);
  return match ? localize(match.key) : String(difficulty);
}

function getChallengeOutcomeClass(effect) {
  if (effect < 0) return 'outcome-failure';
  if (effect >= 10) return 'outcome-superb';
  if (effect >= 5) return 'outcome-excellent';
  return 'outcome-standard';
}

function getDieClass(dieValue, sides = 10) {
  const value = Number(dieValue);
  if (!Number.isFinite(value)) return '';
  if (value <= 1) return 'min';
  if (value >= sides) return 'max';
  return '';
}

function getDefaultMessageMode() {
  const modeFromCore = game.settings.get('core', 'messageMode');
  return normalizeMessageMode(modeFromCore);
}

function normalizeMessageMode(mode) {
  return CONFIG.ChatMessage.modes?.[mode] ? mode : 'public';
}

function getMessageModeOptions(selectedMode) {
  const normalized = normalizeMessageMode(selectedMode);
  return Object.entries(CONFIG.ChatMessage.modes ?? {}).map(([value, definition]) => ({
    value,
    label: game.i18n.localize(definition.label),
    selected: value === normalized,
  }));
}

function getChatMessageStyle() {
  const styles = CONST.CHAT_MESSAGE_STYLES;
  return styles.ROLL ?? styles.OTHER ?? 0;
}

function canExecuteFollowup(message, user = game.user) {
  if (!message || !user) return false;
  if (user.isGM) return true;

  const flags = message.getFlag('synthicide', FLAG_PATH);
  if (!flags) return false;

  if (flags.userId === user.id) return true;

  const actor = game.actors?.get(flags.actorId);
  return Boolean(actor?.isOwner);
}

function getTargetArmor() {
  const defaultValue = game.settings.get('synthicide', SYNTHICIDE.DEFAULT_TARGET_ARMOR_KEY)
  if (game.user.targets?.size === 1) {
    return game.user.targets.first()?.actor?.system.armorDefense ?? defaultValue;
  } else if (game.user.targets?.size > 1) {
    ui.notifications.warn(localize('SYNTHICIDE.Roll.Warnings.TooManyTargets'));
  } else {
    ui.notifications.warn(localize('SYNTHICIDE.Roll.Warnings.NoTarget'));
  }
  return defaultValue;
}

function getActorRollModifiers(actor) {
  const rollModifiers = actor?.system?.rollModifiers;
  if (!rollModifiers || typeof rollModifiers !== 'object') return [];

  return Object.entries(rollModifiers)
    .map(([key, value]) => ({ key, value: Number(value) }))
    .filter((entry) => Number.isFinite(entry.value) && entry.value !== 0);
}