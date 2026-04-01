import SYNTHICIDE from '../helpers/config.mjs';
import { prepareAttackCardData } from './attack-card-data.mjs';
import { prepareChallengeCardData } from './challenge-card-data.mjs';
import { prepareDamageCardData } from './damage-card-data.mjs';
import { getStandardizedRollData } from './roll-data-utils.mjs';
import { getControlledActor } from '../helpers/get-controlled-actor.mjs';
import { calculateVirtualDistanceBetweenTokens } from '../canvas/synthicide-virtual-ruler-utils.mjs';

const FLAG_PATH = 'actionRoll';
const DIALOG_TEMPLATE = 'systems/synthicide/templates/dialog/action-roll-dialog.hbs';
const CARD_TEMPLATE = 'systems/synthicide/templates/chat/action-roll-card.hbs';
const ACTION_ROLL_DIALOG_ICON = 'systems/synthicide/assets/synthicidePause.svg';
const ATTRIBUTE_COMBAT = 'combat';
const FORMULA_CHALLENGE = '1d10 + @attribute + @misc + @modifiers';
const FORMULA_ATTACK = '1d10 + @attribute + @misc + @attackBonus + @modifiers';

const SUBTYPES = {
  CHALLENGE: 'challenge',
  ATTACK: 'attack',
  DAMAGE: 'damage',
};

/**
 * Open the action roll dialog, pre-populated for either a challenge or attack.
 *
 * Attack rolls derive bonus and range defaults from the provided source item so
 * the dialog shows the same context that the eventual roll executor will use.
 *
 * @param {object} [params]
 * @param {Actor|null} [params.actor]
 * @param {string} [params.subtype]
 * @param {string} [params.attribute]
 * @param {Item|null} [params.sourceItem]
 * @param {boolean} [params.allowSubtypeChange]
 * @returns {Promise<ChatMessage|null>}
 */
export async function openSynthicideActionRollDialog({
  actor,
  subtype = SUBTYPES.CHALLENGE,
  attribute = ATTRIBUTE_COMBAT,
  sourceItem = null,
  allowSubtypeChange = false,
} = {}) {
  if (!actor) return null;
  const attributeKey = getActionAttributeKey(subtype, attribute);

  const dialogResult = await renderActionRollDialog({
    title: localize('SYNTHICIDE.Roll.Dialog.Title'),
    defaults: buildDialogDefaults({
      actor,
      subtype,
      attributeKey,
      sourceItem,
      allowSubtypeChange,
    }),
  });

  if (!dialogResult) return null;

  const resolvedSubtype = dialogResult.subtype === SUBTYPES.ATTACK ? SUBTYPES.ATTACK : SUBTYPES.CHALLENGE;
  return executeActionRoll({ actor, input: dialogResult, sourceItem, subtype: resolvedSubtype });
}

export function registerActionRollHooks() {
  Hooks.on('renderChatMessageHTML', activateActionRollChatListeners);
}

/* -------------------------------------------- */
/* Roll Execution                               */
/* -------------------------------------------- */

/**
 * Build a damage message from a successful attack card.
 *
 * Damage is derived from the stored attack result rather than rolling again, so
 * the follow-up card reflects the original die value and computed bonuses.
 *
 * @param {object} params
 * @param {ChatMessage} params.sourceMessage
 * @param {string} [params.userMessageMode]
 * @returns {Promise<ChatMessage|void|null>}
 */
async function executeDerivedDamageRoll({ sourceMessage, userMessageMode }) {
  const messageRollData = getStandardizedRollData(sourceMessage);
  if (messageRollData.subtype !== SUBTYPES.ATTACK) {
    return ui.notifications.warn(localize('SYNTHICIDE.Roll.Warnings.AttackDataMissing'));
  }
  if (!messageRollData.hit) {
    return ui.notifications.warn(localize('SYNTHICIDE.Roll.Warnings.DamageRequiresHit'));
  }

  const actor = resolveActorFromUuidSync(messageRollData.actorUuid);
  if (!actor) return ui.notifications.warn(localize('SYNTHICIDE.Roll.Warnings.ActorMissing'));

  // Prefer the attribute value used on the original attack.
  const combatValue = Number(messageRollData.attributeValue ?? getActorAttributeValue(actor, ATTRIBUTE_COMBAT) ?? 0);
  const messageMode = normalizeMessageMode(userMessageMode ?? messageRollData.messageMode ?? 'public');

  // Build a simple arithmetic summary rather than re-rolling any dice.
  const summaryRoll = new Roll(`${messageRollData.d10} + ${combatValue} + ${messageRollData.damageBonus}`);
  summaryRoll.evaluateSync();
  const damageTotal = Number(summaryRoll.total ?? 0);

  // Try to resolve the original item from the attack roll, if available
  let item = null;
  if (messageRollData.sourceItemUuid) {
    item = await fromUuid(messageRollData.sourceItemUuid).catch(() => null);
  }

  // Prepare modular card data for damage (unified signature)
  const cardData = prepareDamageCardData({
    input: {
      d10: messageRollData.d10,
      damageBonus: messageRollData.damageBonus,
      total: damageTotal,
      source: sourceMessage.speaker?.alias ?? sourceMessage.id,
      sourceMessageId: sourceMessage.id,
      sourceItemUuid: messageRollData.sourceItemUuid ?? null,
      lethal: messageRollData.lethal ?? 0,
      messageMode,
      userId: game.user.id,
    },
    actor,
    item,
    attributeValue: combatValue,
  });

  return createActionMessage({
    actor,
    roll: null, // No new dice were rolled for derived damage
    messageMode,
    cardData,
  });
}

async function executeOpposedChallengeRoll({ sourceMessage }) {
  const sourceRollData = getStandardizedRollData(sourceMessage);
  if (sourceRollData.subtype !== SUBTYPES.CHALLENGE) {
    return ui.notifications.warn(localize('SYNTHICIDE.Roll.Warnings.ChallengeDataMissing'));
  }

  // Use robust utility to get the correct actor for the opposed roll
  const actor = getControlledActor();
  if (!actor) return ui.notifications.warn(localize('SYNTHICIDE.Roll.Warnings.ActorMissing'));

  const sourceMode = normalizeMessageMode(sourceRollData.messageMode ?? 'public');
  const dialogResult = await renderActionRollDialog({
    title: localize('SYNTHICIDE.Roll.Dialog.OpposedTitle'),
    defaults: {
      actor,
      subtype: SUBTYPES.CHALLENGE,
      attribute: sourceRollData.attribute ?? ATTRIBUTE_COMBAT,
      difficulty: sourceRollData.difficulty ?? 6,
      misc: parseNumeric(sourceRollData.misc, 0),
      armor: 10,
      attackBonus: 0,
      damageBonus: 0,
      messageMode: sourceMode,
      allowSubtypeChange: false,
    },
  });

  if (!dialogResult) return null;

  const opposedRollMessage = await executeActionRoll({
    actor,
    input: dialogResult,
    sourceItem: null,
    subtype: SUBTYPES.CHALLENGE,
  });
  if (!opposedRollMessage) return null;

  const opposedRollData = getStandardizedRollData(opposedRollMessage);
  const opposedTotal = Number(opposedRollData.total ?? 0);
  const sourceTotal = Number(sourceRollData.total ?? 0);

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
  }, { messageMode: sourceMode });

  return opposedRollMessage;
}

/**
 * Route a roll request to the correct execute function.
 *
 * @param {object} params
 * @param {Actor} params.actor
 * @param {object} params.input
 * @param {Item|null} params.sourceItem
 * @param {string} params.subtype
 * @returns {Promise<ChatMessage|null>}
 */
async function executeActionRoll({ actor, input, sourceItem, subtype }) {
  const isAttack = isAttackSubtype(subtype);
  const isChallenge = subtype === SUBTYPES.CHALLENGE;
  const attributeKey = getActionAttributeKey(subtype, input.attribute);
  const rollData = buildActionRollData({ actor, input, attributeKey });

  if (isAttack) {
    return executeAttackActionRoll({
      actor,
      input,
      sourceItem,
      rollData,
    });
  }

  if (isChallenge) {
    return executeChallengeActionRoll({
      actor,
      input,
      rollData,
    });
  }

  return handleOtherRoll({ actor, input, sourceItem, subtype });
}

/**
 * Execute an attack roll, including range-rule handling and attack card creation.
 *
 * Range handling order:
 * 1. Compute contextual range data from attacker/target token state.
 * 2. Abort when melee attacks are impossible due to out-of-zone targeting.
 * 3. Apply dialog override for range modifier when provided; otherwise use computed value.
 *
 * @param {object} params
 * @param {Actor} params.actor
 * @param {object} params.input
 * @param {Item|null} params.sourceItem
 * @param {string} params.attributeKey
 * @param {object} params.rollData
 * @returns {Promise<ChatMessage|null>}
 */
async function executeAttackActionRoll({ actor, input, sourceItem, rollData }) {
  const messageMode = normalizeMessageMode(input.messageMode);
  const attackRangeContext = buildAttackRangeContext({ actor, sourceItem });
  // Hard-stop only for impossible melee attacks; all other range states continue.
  if (attackRangeContext?.isImpossible) {
    ui.notifications.warn(localize('SYNTHICIDE.Roll.Warnings.MeleeOutOfRange'));
    return null;
  }

  const computedRangeModifier = Number(attackRangeContext?.rangeModifier ?? 0);
  // Dialog value pre-populated from computed at open time; user may override.
  const rangeModifier = parseNumeric(input.rangeModifier, computedRangeModifier);
  rollData.rangeModifier = rangeModifier;
  rollData.modifiers += rangeModifier;

  const evaluatedRoll = await new Roll(FORMULA_ATTACK, rollData).evaluate();

  // Enrich attack-only payload fields for the chat card and stored roll flags.
  const resolvedInput = buildResolvedAttackInput({
    input,
    rollData,
    attackRangeContext,
  });
  const cardData = prepareAttackCardData({
    input: resolvedInput,
    actor,
    sourceItem,
    rollResult: evaluatedRoll,
    attributeValue: rollData.attribute,
  });

  return createActionMessage({
    actor,
    roll: evaluatedRoll,
    messageMode,
    cardData,
  });
}

async function executeChallengeActionRoll({ actor, input, rollData }) {
  const messageMode = normalizeMessageMode(input.messageMode);
  const difficulty = parseNumeric(input.difficulty, 6);
  const evaluatedRoll = await new Roll(FORMULA_CHALLENGE, rollData).evaluate();

  const cardData = prepareChallengeCardData({
    input,
    actor,
    rollResult: evaluatedRoll,
    attributeValue: rollData.attribute,
    difficulty,
  });

  return createActionMessage({
    actor,
    roll: evaluatedRoll,
    messageMode,
    cardData,
  });
}

// --- Handlers for each roll type ---

// Placeholder for future roll types
async function handleOtherRoll({ _actor, _input, _sourceItem, subtype }) {
  // For now, just return a generic message or throw an error
  ui.notifications?.warn(`Roll type '${subtype}' is not implemented yet.`);
  return null;
}

/* -------------------------------------------- */
/* Chat Cards                                   */
/* -------------------------------------------- */

export async function createActionMessage({ actor, roll, cardData, messageMode, whisper } = {}) {
  // Use Foundry's roll path when dice were actually rolled; otherwise create a
  // normal chat message so derived summaries do not trigger dice UI or sounds.
  if (roll) {
    const rollHtml = await roll.render();
    const cardHtml = await renderActionCardHtml({ cardData, rollHtml });
    const toMessageOptions = buildChatMessageData({ actor, content: cardHtml, cardData, whisper });

    const chatData = await roll.toMessage(toMessageOptions, {
      messageMode: normalizeMessageMode(messageMode),
      create: false,
    });

    return ChatMessage.create(chatData);
  }

  // No roll: render template without roll HTML and create the chat message
  // directly. This prevents Foundry from treating this as a new dice roll
  // (no sound, no dice term rendering), while keeping our card layout.
  const cardHtml = await renderActionCardHtml({ cardData });
  const chatData = buildChatMessageData({ actor, content: cardHtml, cardData, whisper });

  return ChatMessage.create(chatData, { messageMode: normalizeMessageMode(messageMode) });
}

function activateActionRollChatListeners(message, htmlElement) {
  if (!htmlElement || typeof htmlElement.querySelectorAll !== 'function' || typeof htmlElement.addEventListener !== 'function') return;
  const messageRollData = getStandardizedRollData(message);
  if (!messageRollData || (messageRollData.subtype !== SUBTYPES.ATTACK && messageRollData.subtype !== SUBTYPES.CHALLENGE)) return;
  const root = htmlElement;
  const followupAllowed = canExecuteFollowup(message);

  for (const button of root.querySelectorAll('[data-action="rollDamage"]')) {
    if (!followupAllowed) button.disabled = true;
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
 * Synthicide d10 SVG to the dialog header icon on render.
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
          const form = resolveDialogForm(event, button, dialog);
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

/**
 * Build the default dialog object for a new action roll.
 *
 * @param {object} params
 * @param {Actor} params.actor
 * @param {string} params.subtype
 * @param {string} params.attributeKey
 * @param {Item|null} params.sourceItem
 * @param {boolean} params.allowSubtypeChange
 * @returns {object}
 */
function buildDialogDefaults({ actor, subtype, attributeKey, sourceItem, allowSubtypeChange }) {
  const attackDefaults = getAttackDialogDefaults({ actor, subtype, sourceItem });

  return {
    actor,
    subtype,
    attribute: attributeKey,
    difficulty: 6,
    misc: 0,
    armor: isAttackSubtype(subtype) ? getTargetArmor() : 0,
    attackBonus: attackDefaults.attackBonus,
    damageBonus: attackDefaults.damageBonus,
    rangeModifier: attackDefaults.rangeModifier,
    messageMode: getDefaultMessageMode(),
    allowSubtypeChange,
  };
}

function getAttackDialogDefaults({ actor, subtype, sourceItem }) {
  if (!isAttackSubtype(subtype) || !sourceItem?.system) {
    return {
      attackBonus: 0,
      damageBonus: 0,
      rangeModifier: 0,
    };
  }

  const rangeContext = buildAttackRangeContext({ actor, sourceItem, notify: false });
  return {
    attackBonus: Number(sourceItem.system.attackBonus ?? 0),
    damageBonus: Number(sourceItem.system.damageBonus ?? 0),
    rangeModifier: Number(rangeContext?.rangeModifier ?? 0),
  };
}

function buildDialogContext(defaults) {
  const subtype = defaults.subtype ?? SUBTYPES.CHALLENGE;
  const isAttack = isAttackSubtype(subtype);
  const difficultyList = SYNTHICIDE.rolls?.challengeDifficulties ?? [];

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
    defaultRangeModifier: defaults.rangeModifier ?? 0,
    defaultMisc: defaults.misc ?? 0,
    subtypeOptions: [
      {
        value: SUBTYPES.CHALLENGE,
        label: 'SYNTHICIDE.Roll.Subtype.Challenge',
        selected: subtype === SUBTYPES.CHALLENGE,
      },
      {
        value: SUBTYPES.ATTACK,
        label: 'SYNTHICIDE.Roll.Subtype.Attack',
        selected: subtype === SUBTYPES.ATTACK,
      },
    ],
    messageModeOptions: CONFIG.ChatMessage.modes,
    messageModeSelected: normalizeMessageMode(defaults.messageMode),
    attributeOptions: SYNTHICIDE.attributes,
    attributeSelected: attributeKey,
    difficultyOptions: difficultyList,
    difficultySelected: Number(defaults.difficulty ?? 6),
    rollModifiers,
    rollModifierTotalDisplay,
    actor,
    attributeKey,
  };
}

function resolveDialogForm(event, button, dialog) {
  return button?.form
    ?? event?.currentTarget?.form
    ?? event?.target?.form
    ?? dialog?.element?.querySelector?.('form.synthicide-action-roll-form')
    ?? null;
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
    rangeModifier: parseNumeric(formData.get('rangeModifier'), 0),
  };
}

/* -------------------------------------------- */
/* Utilities                                    */
/* -------------------------------------------- */

export function localize(key, data) {
  return game.i18n.format(key, data);
}

async function renderActionCardHtml({ cardData, rollHtml = '' }) {
  return foundry.applications.handlebars.renderTemplate(CARD_TEMPLATE, {
    ...cardData,
    rollHtml,
  });
}

function buildChatMessageData({ actor, content, cardData, whisper }) {
  const chatData = {
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    style: getChatMessageStyle(),
    flags: {
      synthicide: {
        [FLAG_PATH]: cardData.flags,
      },
    },
  };

  if (Array.isArray(whisper) && whisper.length) chatData.whisper = whisper;
  return chatData;
}

function parseNumeric(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function formatSignedNumber(value) {
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
  const actorModifierTotal = modifiers.reduce((sum, mod) => sum + (Number(mod.value) || 0), 0);
  return {
    attribute: getActorAttributeValue(actor, attributeKey),
    attackBonus: parseNumeric(input.attackBonus, 0),
    misc: parseNumeric(input.misc, 0),
    modifiers: actorModifierTotal,
    actorModifierTotal,
    rangeModifier: 0,
  };
}

export function buildEquationTerms({ subtype, attributeKey, rollData }) {
  const isDamage = subtype === 'damage';

  const terms = [
    { label: localize('SYNTHICIDE.Roll.Card.Attribute'), valueHtml: getAttributeValueHtml(attributeKey) },
    { label: localize('SYNTHICIDE.Roll.Card.AttributeValue'), value: rollData.attributeValue ?? rollData.attribute },
  ];

  if (isDamage) {
    terms.push({ label: localize('SYNTHICIDE.Roll.Card.DamageBonus'), value: rollData.damageBonus ?? 0 });
    return terms;
  }

  terms.push({ label: localize('SYNTHICIDE.Roll.Card.MiscModifier'), value: rollData.misc });

  if (isAttackSubtype(subtype)) {
    terms.push({ label: localize('SYNTHICIDE.Roll.Card.AttackBonus'), value: rollData.attackBonus });
  }

  terms.push({ label: localize('SYNTHICIDE.Roll.Dialog.RollModifiers'), value: rollData.actorModifierTotal ?? 0 });

  if (isAttackSubtype(subtype)) {
    terms.push({ label: localize('SYNTHICIDE.Roll.Card.RangeModifier'), value: Number(rollData.rangeModifier ?? 0) });
  }

  return terms;
}

function getActorAttributeValue(actor, attributeKey) {
  return Number(actor?.system?.attributes?.[attributeKey]?.value ?? 0);
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

function getDegreeBands() {
  return SYNTHICIDE.rolls?.degreeBands ?? [];
}

export function getDegreeLabel(effect) {
  const bands = getDegreeBands();
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

function getDefaultMessageMode() {
  const modeFromCore = game.settings.get('core', 'messageMode');
  return normalizeMessageMode(modeFromCore);
}

function normalizeMessageMode(mode) {
  return CONFIG.ChatMessage.modes?.[mode] ? mode : 'public';
}

function getChatMessageStyle() {
  const styles = CONST.CHAT_MESSAGE_STYLES;
  return styles.ROLL ?? styles.OTHER ?? 0;
}

function canExecuteFollowup(message, user = game.user) {
  if (!message || !user) return false;
  if (user.isGM) return true;

  const rollData = getStandardizedRollData(message);
  if (!rollData) return false;

  if (rollData.userId === user.id) return true;

  // Try UUID resolution first to handle unlinked/temporary actors.
  const actor = resolveActorFromUuidSync(rollData.actorUuid);
  if (!actor) return false;
  return Boolean(actor?.isOwner);
}

/**
 * Resolve an actor UUID safely in synchronous contexts.
 * Uses strict:false so malformed or unsync-resolvable UUIDs return null.
 * @param {string|undefined|null} uuid
 * @returns {Actor|null}
 */
function resolveActorFromUuidSync(uuid) {
  if (!uuid) return null;
  try {
    return globalThis.fromUuidSync(uuid, { strict: false }) ?? null;
  } catch {
    return null;
  }
}

function getTargetArmor() {
  const defaultValue = game.settings.get('synthicide', SYNTHICIDE.DEFAULT_TARGET_ARMOR_KEY);
  if (game.user.targets?.size === 1) {
    const armorData = game.user.targets.first()?.actor?.system?.armorDefense;
    const armor = Number(armorData?.value ?? armorData);
    return Number.isFinite(armor) ? armor : defaultValue;
  } else if (game.user.targets?.size > 1) {
    ui.notifications.warn(localize('SYNTHICIDE.Roll.Warnings.TooManyTargets'));
  } else {
    ui.notifications.warn(localize('SYNTHICIDE.Roll.Warnings.NoTarget'));
  }
  return defaultValue;
}

function getSingleTargetToken({ notify = true } = {}) {
  if (game.user.targets?.size === 1) return game.user.targets.first() ?? null;
  if (game.user.targets?.size > 1) {
    if (notify) ui.notifications.warn(localize('SYNTHICIDE.Roll.Warnings.TooManyTargets'));
    return null;
  }

  if (notify) ui.notifications.warn(localize('SYNTHICIDE.Roll.Warnings.NoTarget'));
  return null;
}

/**
 * Resolve a scene token for an actor using progressively looser fallbacks.
 *
 * The active-token lookup is preferred because it respects linked and embedded
 * actor state. Scene and controlled-token fallbacks keep rolls functional when
 * Foundry cannot resolve an active token directly.
 *
 * @param {Actor|null} actor
 * @returns {Token|null}
 */
function getActorToken(actor) {
  if (!actor) return null;
  
  // First priority: look for active tokens for this actor on the current scene
  const activeTokens = actor.getActiveTokens?.(false, false) ?? [];
  if (activeTokens.length > 0) return activeTokens[0];

  // Second priority: direct scene search for a token belonging to this actor
  if (canvas?.scene?.tokens) {
    const sceneToken = canvas.scene.tokens.find((token) => token?.actorId === actor.id);
    if (sceneToken) return sceneToken.object;
  }

  // Fallback: any token the current user has controlled (last resort)
  const controlled = canvas?.tokens?.controlled ?? [];
  const controlledMatch = controlled.find((token) => token?.actor?.id === actor.id);
  if (controlledMatch) return controlledMatch;

  return null;
}

function hasWeaponFeature(sourceItem, featureKey) {
  const features = sourceItem?.system?.features;
  if (features instanceof Set) return features.has(featureKey);
  if (Array.isArray(features)) return features.includes(featureKey);
  return false;
}

/**
 * Compute range-related attack context from the current attacker and target.
 *
 * This helper never mutates roll state directly. It returns enough information
 * for the dialog and the attack executor to make the same range decision.
 *
 * @param {object} params
 * @param {Actor} params.actor
 * @param {Item|null} params.sourceItem
 * @param {boolean} [params.notify=true]
 * @returns {{weaponClass: string, rangeIncrement: number, hasCloseFeature: boolean, distance: number|null, rangeModifier: number, isImpossible: boolean}}
 */
function buildAttackRangeContext({ actor, sourceItem, notify = true }) {
  const weaponClass = String(sourceItem?.system?.weaponClass ?? '');
  const rangeIncrement = Math.max(0, Number(sourceItem?.system?.rangeIncrement ?? 0));
  const hasCloseFeature = hasWeaponFeature(sourceItem, 'close');

  const context = {
    weaponClass,
    rangeIncrement,
    hasCloseFeature,
    distance: null,
    rangeModifier: 0,
    isImpossible: false,
  };

  // Only melee and ranged use the distance-based attack modifier rules.
  if (weaponClass !== 'melee' && weaponClass !== 'ranged') return context;

  const targetToken = getSingleTargetToken({ notify });
  if (!targetToken?.center) return context;

  const attackerToken = getActorToken(actor);
  if (!attackerToken?.center) {
    // Attacker actor is known but token not on scene or not locatable.
    // Fall back to default context so attack still rolls (range modifier = 0).
    if (notify && actor) {
      ui.notifications.warn(localize('SYNTHICIDE.Roll.Warnings.AttackerTokenMissing'));
    }
    return context;
  }

  const distance = Number(calculateVirtualDistanceBetweenTokens(attackerToken, targetToken) ?? 0);
  context.distance = Number.isFinite(distance) ? Math.max(0, distance) : 0;

  // Melee attacks with no range increment cannot reach targets outside the same zone.
  if (weaponClass === 'melee' && rangeIncrement === 0 && context.distance > 0) {
    context.isImpossible = true;
    return context;
  }

  let rangeModifier = 0;
  if (context.distance > 0) {
    if (rangeIncrement > 0) {
      const extraDistance = context.distance - rangeIncrement;
      if (extraDistance > 0) rangeModifier -= Math.ceil(extraDistance / rangeIncrement);
    } else if (weaponClass === 'ranged') {
      // Ranged weapons with zero range increment suffer -1 ATT per zone beyond current.
      rangeModifier -= context.distance;
    }
  }

  if (weaponClass === 'ranged' && hasCloseFeature && context.distance === 0) {
    rangeModifier += 1;
  }

  context.rangeModifier = rangeModifier;
  return context;
}

function getActorRollModifiers(actor) {
  const rollModifiers = actor?.system?.rollModifiers;
  if (!rollModifiers || typeof rollModifiers !== 'object') return [];

  return Object.entries(rollModifiers)
    .map(([key, value]) => ({ key, value: Number(value) }))
    .filter((entry) => Number.isFinite(entry.value) && entry.value !== 0);
}

function buildResolvedAttackInput({ input, rollData, attackRangeContext }) {
  return {
    ...input,
    modifiers: rollData.modifiers,
    actorModifierTotal: rollData.actorModifierTotal,
    rangeModifier: rollData.rangeModifier,
    rangeDistance: attackRangeContext?.distance ?? null,
    rangeIncrement: attackRangeContext?.rangeIncrement ?? null,
    weaponClass: attackRangeContext?.weaponClass ?? null,
    hasCloseFeature: attackRangeContext?.hasCloseFeature ?? false,
  };
}