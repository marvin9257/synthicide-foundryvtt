import SYNTHICIDE from '../helpers/config.mjs';
import { prepareAttackCardData } from './attack-card-data.mjs';
import { prepareChallengeCardData } from './challenge-card-data.mjs';
import { prepareDamageCardData } from './damage-card-data.mjs';
import { getStandardizedRollData } from './roll-data-utils.mjs';
import { getControlledActor } from '../helpers/get-controlled-actor.mjs';

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
 
  // Set attackBonus and damageBonus from sourceItem if this is an attack and a weapon/item is provided
  let attackBonus = 0;
  let damageBonus = 0;
  if (isAttackSubtype(subtype) && sourceItem?.system) {
    attackBonus = Number(sourceItem.system.attackBonus ?? 0);
    damageBonus = Number(sourceItem.system.damageBonus ?? 0);
  }

  const result = await renderActionRollDialog({
    title: localize('SYNTHICIDE.Roll.Dialog.Title'),
    defaults: {
      actor,
      subtype,
      attribute: attributeKey,
      difficulty: 6,
      misc: 0,
      armor: isAttackSubtype(subtype) ? getTargetArmor() : 0,
      attackBonus,
      damageBonus,
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
  const rollData = getStandardizedRollData(sourceMessage);
  if (rollData.subtype !== SUBTYPES.ATTACK) {
    return ui.notifications.warn(localize('SYNTHICIDE.Roll.Warnings.AttackDataMissing'));
  }
  if (!rollData.hit) {
    return ui.notifications.warn(localize('SYNTHICIDE.Roll.Warnings.DamageRequiresHit'));
  }

  const actor = resolveActorFromUuidSync(rollData.actorUuid);
  if (!actor) return ui.notifications.warn(localize('SYNTHICIDE.Roll.Warnings.ActorMissing'));

  // Prefer the attribute value used on the original attack.
  const combatValue = Number(rollData.attributeValue ?? getActorAttributeValue(actor, ATTRIBUTE_COMBAT) ?? 0);
  const messageMode = normalizeMessageMode(userMessageMode ?? rollData.messageMode ?? 'public');

  // Build a simple arithmetic summary rather than re-rolling any dice.
  const summaryRoll = new Roll(`${rollData.d10} + ${combatValue} + ${rollData.damageBonus}`);
  summaryRoll.evaluateSync();
  const damageTotal = Number(summaryRoll.total ?? 0);

  // Try to resolve the original item from the attack roll, if available
  let item = null;
  if (rollData.sourceItemUuid) {
    item = await fromUuid(rollData.sourceItemUuid).catch(() => null);
  }

  // Prepare modular card data for damage (unified signature)
  const cardData = prepareDamageCardData({
    input: {
      d10: rollData.d10,
      damageBonus: rollData.damageBonus,
      total: damageTotal,
      source: sourceMessage.speaker?.alias ?? sourceMessage.id,
      sourceMessageId: sourceMessage.id,
      sourceItemUuid: rollData.sourceItemUuid ?? null,
      lethal: rollData.lethal ?? 0,
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
  const result = await renderActionRollDialog({
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

  if (!result) return null;

  const opposedRollMessage = await executeActionRoll({
    actor,
    input: result,
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
 * Generic action roll executor for challenge and attack.
 */

async function executeActionRoll({ actor, input, sourceItem, subtype }) {
  // Shared setup
  const attributeKey = getActionAttributeKey(subtype, input.attribute);
  const rollData = buildActionRollData({ actor, input, attributeKey });
  //const armor = parseNumeric(input.armor, 0);
  const difficulty = parseNumeric(input.difficulty, 6);
  // const damageBonus = parseNumeric(input.damageBonus, 0); // No longer needed, handled in cardData
  const isAttack = isAttackSubtype(subtype);
  const isChallenge = subtype === SUBTYPES.CHALLENGE;
  const formula = isAttack ? FORMULA_ATTACK : FORMULA_CHALLENGE;
  const evaluatedRoll = await new Roll(formula, rollData).evaluate();
  //const total = Number(evaluatedRoll.total ?? 0);
  // d10 and equationTerms are now handled in card data modules
  const messageMode = normalizeMessageMode(input.messageMode);
  const attributeValue = getActorAttributeValue(actor, attributeKey);


  let cardData;
  if (isAttack) {
    cardData = prepareAttackCardData({
      input,
      actor,
      sourceItem,
      rollResult: evaluatedRoll,
      attributeValue,
    });
  } else if (isChallenge) {
    cardData = prepareChallengeCardData({
      input,
      actor,
      rollResult: evaluatedRoll,
      attributeValue,
      difficulty,
    });
  } else {
    return handleOtherRoll({ actor, input, sourceItem, subtype });
  }

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
  // If a Roll is provided, render and use Foundry's `toMessage` path so the
  // roll HTML and message metadata are correct. If no Roll is provided (e.g.
  // derived deterministic results), skip roll rendering and build the
  // ChatMessage data directly to avoid dice UI and sounds.
  if (roll) {
    const rollHtml = await roll.render();
    const content = await foundry.applications.handlebars.renderTemplate(CARD_TEMPLATE, {
      ...cardData,
      rollHtml,
    });

    const toMessageOptions = {
      speaker: ChatMessage.getSpeaker({ actor }),
      content,
      style: getChatMessageStyle(),
      flags: {
        synthicide: {
          [FLAG_PATH]: cardData.flags,
        },
      },
    };
    if (Array.isArray(whisper) && whisper.length) toMessageOptions.whisper = whisper;

    const chatData = await roll.toMessage(toMessageOptions, {
      messageMode: normalizeMessageMode(messageMode),
      create: false,
    });

    return ChatMessage.create(chatData);
  }

  // No roll: render template without roll HTML and create the chat message
  // directly. This prevents Foundry from treating this as a new dice roll
  // (no sound, no dice term rendering), while keeping our card layout.
  const content = await foundry.applications.handlebars.renderTemplate(CARD_TEMPLATE, {
    ...cardData,
    rollHtml: '',
  });

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

  return ChatMessage.create(chatData, { messageMode: normalizeMessageMode(messageMode) });
}

function activateActionRollChatListeners(message, htmlElement) {
  if (!htmlElement || typeof htmlElement.querySelectorAll !== 'function' || typeof htmlElement.addEventListener !== 'function') return;
  const rollData = getStandardizedRollData(message);
  if (!rollData || (rollData.subtype !== SUBTYPES.ATTACK && rollData.subtype !== SUBTYPES.CHALLENGE)) return;
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

export function localize(key, data) {
  return game.i18n.format(key, data);
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
  return {
    attribute: getActorAttributeValue(actor, attributeKey),
    attackBonus: parseNumeric(input.attackBonus, 0),
    misc: parseNumeric(input.misc, 0),
    modifiers: modifiers.reduce((sum, mod) => sum + (Number(mod.value) || 0), 0),
  };
}

export function buildEquationTerms({ subtype, attributeKey, rollData }) {
  const terms = [
    { label: localize('SYNTHICIDE.Roll.Card.Attribute'), valueHtml: getAttributeValueHtml(attributeKey) },
    { label: localize('SYNTHICIDE.Roll.Card.AttributeValue'), value: rollData.attributeValue ?? rollData.attribute },
    { label: localize('SYNTHICIDE.Roll.Card.MiscModifier'), value: rollData.misc },
  ];

  if (isAttackSubtype(subtype)) {
    terms.push({ label: localize('SYNTHICIDE.Roll.Card.AttackBonus'), value: rollData.attackBonus });
  }

  // Always show zero if no modifiers
  const modifiersValue = (rollData.modifiers === undefined || rollData.modifiers === null) ? 0 : rollData.modifiers;
  terms.push({ label: localize('SYNTHICIDE.Roll.Dialog.RollModifiers'), value: modifiersValue });
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
  const defaultValue = game.settings.get('synthicide', SYNTHICIDE.DEFAULT_TARGET_ARMOR_KEY)
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

function getActorRollModifiers(actor) {
  const rollModifiers = actor?.system?.rollModifiers;
  if (!rollModifiers || typeof rollModifiers !== 'object') return [];

  return Object.entries(rollModifiers)
    .map(([key, value]) => ({ key, value: Number(value) }))
    .filter((entry) => Number.isFinite(entry.value) && entry.value !== 0);
}