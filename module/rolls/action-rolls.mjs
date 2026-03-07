import SYNTHICIDE from '../helpers/config.mjs';

const FLAG_PATH = 'actionRoll';
const DIALOG_TEMPLATE = 'systems/synthicide/templates/dialog/action-roll-dialog.hbs';
const CARD_TEMPLATE = 'systems/synthicide/templates/chat/action-roll-card.hbs';
const ACTION_ROLL_DIALOG_ICON = 'systems/synthicide/assets/synthicidePause.svg';

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
  attribute = 'combat',
  sourceItem = null,
  allowSubtypeChange = false,
} = {}) {
  if (!actor) return null;
 
  const result = await renderActionRollDialog({
    title: localize('SYNTHICIDE.Roll.Dialog.Title'),
    defaults: {
      subtype,
      attribute: subtype === SUBTYPES.ATTACK ? 'combat' : attribute,
      difficulty: 6,
      misc: 0,
      armor: subtype === SUBTYPES.ATTACK ? getTargetArmor() : 0,
      attackBonus: 0,
      damageBonus: 0,
      messageMode: getDefaultMessageMode(),
      allowSubtypeChange,
    },
  });

  if (!result) return null;

  if (result.subtype === SUBTYPES.ATTACK) {
    return executeAttackRoll({ actor, input: result, sourceItem });
  }

  return executeChallengeRoll({ actor, input: result, sourceItem });
}

export function registerActionRollHooks() {
  Hooks.on('renderChatMessageHTML', activateActionRollChatListeners);
}

/* -------------------------------------------- */
/* Roll Execution                               */
/* -------------------------------------------- */

async function executeChallengeRoll({ actor, input, sourceItem }) {
  const attributeKey = normalizeAttributeKey(input.attribute);
  const attributeValue = getActorAttributeValue(actor, attributeKey);
  const misc = parseNumeric(input.misc, 0);
  const difficulty = parseNumeric(input.difficulty, 6);

  const evaluatedRoll = await new Roll(`1d10 + ${attributeValue} + ${misc}`).evaluate();
  const total = Number(evaluatedRoll.total ?? 0);
  const d10 = Number(evaluatedRoll.dice?.[0]?.results?.[0]?.result ?? (total - attributeValue - misc));

  const effect = total - difficulty;
  const degree = getDegreeLabel(effect);
  const difficultyLabel = getDifficultyLabel(difficulty);
  const messageMode = normalizeMessageMode(input.messageMode);
  const effectValue = formatSignedNumber(effect);

  return createActionMessage({
    actor,
    roll: evaluatedRoll,
    messageMode,
    cardData: {
      title: localize('SYNTHICIDE.Roll.Card.TitleChallenge'),
      subtype: SUBTYPES.CHALLENGE,
      flavor: localize('SYNTHICIDE.Roll.Card.DefaultFlavorChallenge', {
        difficulty: difficultyLabel,
        attribute: getAttributeLabel(attributeKey),
      }),
      subtitle: difficultyLabel,
      equation: `1d10 + ${attributeValue} + ${misc}`,
      total,
      effectText: effectValue,
      outcomeLabel: degree,
      outcomeClass: getChallengeOutcomeClass(effect),
      showEffectOutcomeRow: true,
      dieValue: d10,
      dieClass: getDieClass(d10, 10),
      equationTerms: [
        { label: localize('SYNTHICIDE.Roll.Card.Attribute'), valueHtml: getAttributeValueHtml(attributeKey) },
        { label: localize('SYNTHICIDE.Roll.Card.AttributeValue'), value: attributeValue },
        { label: localize('SYNTHICIDE.Roll.Card.MiscModifier'), value: misc },
      ],
      metadataRows: [
        { label: localize('SYNTHICIDE.Roll.Card.Difficulty'), value: difficultyLabel },
        { label: localize('SYNTHICIDE.Roll.Card.Effect'), value: effectValue },
      ],
      showDamageButton: false,
      showOpposedButton: true,
      flags: {
        version: 2,
        subtype: SUBTYPES.CHALLENGE,
        actorId: actor.id,
        userId: game.user.id,
        sourceItemUuid: sourceItem?.uuid ?? null,
        messageMode,
        challenge: {
          attribute: attributeKey,
          attributeValue,
          difficulty,
          misc,
          d10,
          total,
          effect,
          degree,
        },
      },
    },
  });
}

async function executeAttackRoll({ actor, input, sourceItem }) {
  const attributeKey = normalizeAttributeKey(input.attribute);
  const attributeValue = getActorAttributeValue(actor, attributeKey);
  const attackBonus = parseNumeric(input.attackBonus, 0);
  const damageBonus = parseNumeric(input.damageBonus, 0);
  const misc = parseNumeric(input.misc, 0);
  const armor = parseNumeric(input.armor, 0);

  const evaluatedRoll = await new Roll(`1d10 + ${attributeValue} + ${attackBonus} + ${misc}`).evaluate();
  const attackTotal = Number(evaluatedRoll.total ?? 0);
  const d10 = Number(
    evaluatedRoll.dice?.[0]?.results?.[0]?.result ?? (attackTotal - attributeValue - attackBonus - misc)
  );
  const hit = attackTotal >= armor;
  const damageTotal = d10 + attributeValue + damageBonus;
  const messageMode = normalizeMessageMode(input.messageMode);

  return createActionMessage({
    actor,
    roll: evaluatedRoll,
    messageMode,
    cardData: {
      title: localize('SYNTHICIDE.Roll.Card.TitleAttack'),
      subtype: SUBTYPES.ATTACK,
      flavor: localize('SYNTHICIDE.Roll.Card.DefaultFlavorAttack', {
        attribute: getAttributeLabel(attributeKey),
        armor,
        item: sourceItem?.name || localize('SYNTHICIDE.Roll.Subtype.Attack'),
      }),
      equation: `1d10 + ${attributeValue} + ${attackBonus} + ${misc}`,
      total: attackTotal,
      effectText: hit ? localize('SYNTHICIDE.Roll.Outcome.Hit') : localize('SYNTHICIDE.Roll.Outcome.Miss'),
      effectClass: hit ? 'outcome-success' : 'outcome-failure',
      showEffectOutcomeRow: false,
      dieValue: d10,
      dieClass: getDieClass(d10, 10),
      equationTerms: [
        { label: localize('SYNTHICIDE.Roll.Card.Attribute'), valueHtml: getAttributeValueHtml(attributeKey) },
        { label: localize('SYNTHICIDE.Roll.Card.AttributeValue'), value: attributeValue },
        { label: localize('SYNTHICIDE.Roll.Card.AttackBonus'), value: attackBonus },
        { label: localize('SYNTHICIDE.Roll.Card.MiscModifier'), value: misc },
      ],
      metadataRows: [
        { label: localize('SYNTHICIDE.Roll.Card.Armor'), value: armor },
        { label: localize('SYNTHICIDE.Roll.Card.DamageBonus'), value: damageBonus },
      ],
      showDamageButton: hit,
      showOpposedButton: false,
      flags: {
        version: 2,
        subtype: SUBTYPES.ATTACK,
        actorId: actor.id,
        userId: game.user.id,
        sourceItemUuid: sourceItem?.uuid ?? null,
        messageMode,
        attack: {
          attribute: attributeKey,
          attributeValue,
          armor,
          attackBonus,
          damageBonus,
          misc,
          d10,
          attackTotal,
          hit,
          damageTotal,
        },
      },
    },
  });
}

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

  const messageMode = normalizeMessageMode(userMessageMode ?? flags.messageMode ?? flags.messageType ?? 'public');
  const summaryRoll = await new Roll(`${attack.d10} + ${attack.attributeValue} + ${attack.damageBonus}`).evaluate();

  return createActionMessage({
    actor,
    roll: summaryRoll,
    messageMode,
    cardData: {
      title: localize('SYNTHICIDE.Roll.Card.TitleDamage'),
      subtype: SUBTYPES.DAMAGE,
      flavor: localize('SYNTHICIDE.Roll.Card.DerivedFromAttack'),
      equation: `${attack.d10} + ${attack.attributeValue} + ${attack.damageBonus}`,
      total: attack.damageTotal,
      showEffectOutcomeRow: false,
      dieValue: attack.d10,
      dieClass: getDieClass(attack.d10, 10),
      metadataRows: [
        { label: localize('SYNTHICIDE.Roll.Card.SourceAttack'), value: sourceMessage.id },
        { label: localize('SYNTHICIDE.Roll.Card.AttributeValue'), value: attack.attributeValue },
        { label: localize('SYNTHICIDE.Roll.Card.DamageBonus'), value: attack.damageBonus },
      ],
      showDamageButton: false,
      showOpposedButton: false,
      flags: {
        version: 2,
        subtype: SUBTYPES.DAMAGE,
        actorId: actor.id,
        userId: game.user.id,
        sourceMessageId: sourceMessage.id,
        sourceItemUuid: flags.sourceItemUuid ?? null,
        messageMode,
        damage: {
          sourceMessageId: sourceMessage.id,
          d10: attack.d10,
          attributeValue: attack.attributeValue,
          damageBonus: attack.damageBonus,
          total: attack.damageTotal,
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
      subtype: SUBTYPES.CHALLENGE,
      attribute: sourceChallenge.attribute ?? 'combat',
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

  const opposedRollMessage = await executeChallengeRoll({
    actor,
    input: { ...result, subtype: SUBTYPES.CHALLENGE },
    sourceItem: null,
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

/* -------------------------------------------- */
/* Chat Cards                                   */
/* -------------------------------------------- */

async function createActionMessage({ actor, roll, cardData, messageMode }) {
  const speaker = ChatMessage.getSpeaker({ actor });
  const rollHtml = await roll.render();
  const content = await foundry.applications.handlebars.renderTemplate(CARD_TEMPLATE, {
    ...cardData,
    rollHtml,
  });

  return ChatMessage.create({
    speaker,
    content,
    rolls: [roll],
    style: getChatMessageStyle(),
    messageMode: normalizeMessageMode(messageMode),
    flags: {
      synthicide: {
        [FLAG_PATH]: cardData.flags,
      },
    },
  });
}

function activateActionRollChatListeners(message, htmlElement) {
  if (!htmlElement || typeof htmlElement.querySelectorAll !== 'function') return;
  const root = htmlElement;

  for (const button of root.querySelectorAll('[data-action="rollDamage"]')) {
    button.dataset.messageId = message.id;
    const allowed = canExecuteFollowup(message);
    if (!allowed) button.disabled = true;
    button.addEventListener('click', onRollDamageButtonClick);
  }

  for (const button of root.querySelectorAll('[data-action="rollOpposed"]')) {
    button.dataset.messageId = message.id;
    button.addEventListener('click', onOpposedRollButtonClick);
  }
}

async function onRollDamageButtonClick(event) {
  event.preventDefault();

  const button = event.currentTarget;
  const messageId = button?.dataset?.messageId;
  if (!messageId) return;

  const message = game.messages?.get(messageId);
  if (!message) return;

  if (!canExecuteFollowup(message)) {
    ui.notifications.warn(localize('SYNTHICIDE.Roll.Warnings.NotPermitted'));
    return;
  }

  button.disabled = true;
  try {
    await executeDerivedDamageRoll({ sourceMessage: message });
  } finally {
    button.disabled = false;
  }
}

async function onOpposedRollButtonClick(event) {
  event.preventDefault();

  const button = event.currentTarget;
  const messageId = button?.dataset?.messageId;
  if (!messageId) return;

  const message = game.messages?.get(messageId);
  if (!message) return;

  button.disabled = true;
  try {
    await executeOpposedChallengeRoll({ sourceMessage: message });
  } finally {
    button.disabled = false;
  }
}

/* -------------------------------------------- */
/* Dialog Rendering                             */
/* -------------------------------------------- */

async function renderActionRollDialog({ title, defaults }) {
  const context = buildDialogContext(defaults);
  const content = await foundry.applications.handlebars.renderTemplate(DIALOG_TEMPLATE, context);

  try {
    return await promptActionRollDialog({
      title,
      content,
      ok: {
        label: localize('SYNTHICIDE.Roll.Dialog.RollButton'),
        callback: (event, button, dialog) => {
          const form = resolveDialogForm(event, button, dialog);
          if (!form) return null;
          return extractDialogData(form);
        },
      },
    });
  } catch {
    return null;
  }
}

async function promptActionRollDialog({ title, render, ...config }) {
  return foundry.applications.api.DialogV2.prompt({
    ...config,
    window: { ...(config.window ?? {}), title, icon: '' },
    render: (event, dialog) => {
      const iconEl = dialog.window?.icon;
      if (iconEl) {
        const img = globalThis.document.createElement('img');
        img.src = ACTION_ROLL_DIALOG_ICON;
        img.alt = '';
        img.width = 16;
        img.height = 16;
        iconEl.className = 'window-icon synthicide-window-icon';
        iconEl.replaceChildren(img);
      }
      if (typeof render === 'function') render(event, dialog);
    },
  });
}

function buildDialogContext(defaults) {
  const subtype = defaults.subtype ?? SUBTYPES.CHALLENGE;
  const isAttack = subtype === SUBTYPES.ATTACK;
  const difficultyList = getChallengeDifficulties();

  return {
    allowSubtypeChange: Boolean(defaults.allowSubtypeChange),
    defaultSubtype: subtype,
    isAttack,
    defaultArmor: defaults.armor ?? 10,
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
    attributeOptions: getLocalizedAttributeOptions(defaults.attribute),
    difficultyOptions: difficultyList.map((entry) => ({
      value: entry.value,
      label: localize(entry.key),
      selected: Number(entry.value) === Number(defaults.difficulty ?? 6),
    })),
  };
}

function extractDialogData(formElement) {
  const formData = new globalThis.FormData(formElement);
  return {
    subtype: String(formData.get('subtype') ?? SUBTYPES.CHALLENGE),
    messageMode: normalizeMessageMode(String(formData.get('messageMode') ?? 'public')),
    attribute: String(formData.get('attribute') ?? 'combat'),
    difficulty: parseNumeric(formData.get('difficulty'), 6),
    misc: parseNumeric(formData.get('misc'), 0),
    armor: parseNumeric(formData.get('armor'), 0),
    attackBonus: parseNumeric(formData.get('attackBonus'), 0),
    damageBonus: parseNumeric(formData.get('damageBonus'), 0),
  };
}

function resolveDialogForm(event, button, dialog) {
  const fromButton = button?.form;
  if (fromButton) return fromButton;

  const fromEventTarget = event?.currentTarget?.form ?? event?.target?.form;
  if (fromEventTarget) return fromEventTarget;

  return dialog?.element?.querySelector?.('form.synthicide-action-roll-form') ?? null;
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

function normalizeAttributeKey(attributeKey) {
  return attributeKey && SYNTHICIDE.attributes?.[attributeKey] ? attributeKey : 'combat';
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
  return `<span class="synthicide-attr-pill"><img class="synthicide-attr-icon" src="/systems/synthicide/assets/${key}.png" alt="${label}" /> ${label}</span>`;
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
