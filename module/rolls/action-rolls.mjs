import { getStandardizedRollData, localize } from './roll-utils.mjs';
import { prepareChallengeCardData } from './challenge-card-data.mjs';
import { prepareDamageCardData } from './damage-card-data.mjs';
import { getControlledActor } from '../helpers/get-controlled-actor.mjs';
import { renderActionRollDialog, buildDialogDefaults } from './dialogs.mjs';
import { executeAttackActionRoll } from './attack-rolls.mjs';
import { executeDemolitionActionRoll, getDemolitionRollAttributeKey } from './demolition-rolls.mjs';
import { createActionMessage, normalizeMessageMode } from './cards.mjs';
export { createActionMessage };
import { getActionAttributeKey, getActorAttributeValue } from './modifiers.mjs';
import { buildRollContext } from './roll-context.mjs';

const CARD_TEMPLATE = 'systems/synthicide/templates/chat/action-roll-card.hbs';
const SUBTYPES = {
  CHALLENGE: 'challenge',
  ATTACK: 'attack',
  DEMOLITION: 'demolition',
  DAMAGE: 'damage',
};

export async function openSynthicideActionRollDialog({
  actor,
  subtype = SUBTYPES.CHALLENGE,
  attribute = 'combat',
  sourceItem = null,
  allowSubtypeChange = false,
  rollModifiers = undefined,
} = {}) {
  if (!actor) return null;

  const requestedSubtype = resolveActionSubtype({ subtype, sourceItem });
  const attributeKey = requestedSubtype === SUBTYPES.DEMOLITION
    ? getDemolitionRollAttributeKey(sourceItem)
    : getActionAttributeKey(requestedSubtype, attribute);

  const dialogResult = await renderActionRollDialog({
    title: localize('SYNTHICIDE.Roll.Dialog.Title'),
    defaults: buildDialogDefaults({
      actor,
      subtype: requestedSubtype,
      attributeKey,
      sourceItem,
      allowSubtypeChange,
      rollModifiers,
    }),
  });

  if (!dialogResult) return null;

  const resolvedSubtype = resolveActionSubtype({ subtype: dialogResult.subtype, sourceItem });
  return executeActionRoll({ actor, input: dialogResult, sourceItem, subtype: resolvedSubtype });
}

export function registerActionRollHooks() {
  Hooks.on('renderChatMessageHTML', activateActionRollChatListeners);
}

async function executeDerivedDamageRoll({ sourceMessage, userMessageMode }) {
  const messageRollData = getStandardizedRollData(sourceMessage);
  const sourceSubtype = messageRollData.subtype;
  if (sourceSubtype !== SUBTYPES.ATTACK && sourceSubtype !== SUBTYPES.DEMOLITION) {
    return ui.notifications.warn(localize('SYNTHICIDE.Roll.Warnings.AttackDataMissing'));
  }
  if (sourceSubtype === SUBTYPES.ATTACK && !messageRollData.hit) {
    return ui.notifications.warn(localize('SYNTHICIDE.Roll.Warnings.DamageRequiresHit'));
  }

  const actor = resolveActorFromUuidSync(messageRollData.actorUuid);
  if (!actor) return ui.notifications.warn(localize('SYNTHICIDE.Roll.Warnings.ActorMissing'));

  const actorCombatValue = Number(getActorAttributeValue(actor, 'combat') ?? 0);
  const combatValue = sourceSubtype === SUBTYPES.ATTACK
    ? Number(messageRollData.attributeValue ?? actorCombatValue)
    : actorCombatValue;
  const messageMode = normalizeMessageMode(userMessageMode ?? messageRollData.messageMode ?? 'public');
  const extraDamageDice = Number(messageRollData.extraDamageDice ?? 0);
  let extraDamageRoll = null;
  let extraDamageTotal = 0;
  if (extraDamageDice > 0) {
    extraDamageRoll = await rollAmmoExtraDamage(extraDamageDice);
    extraDamageTotal = extraDamageRoll.total;
  }

  const damageTotal = Number(messageRollData.d10 ?? 0)
    + combatValue
    + Number(messageRollData.damageBonus ?? 0)
    + extraDamageTotal;

  const ctx = buildRollContext({ actor, actorToken: getControlledActor()?.token ?? null, sourceItem: null, subtype: 'damage', attributeKey: 'combat', input: {
    d10: messageRollData.d10,
    damageBonus: messageRollData.damageBonus,
    baneDamageBonus: Number(messageRollData.baneDamageBonus ?? 0),
    shockRdBonus: Number(messageRollData.shockRdBonus ?? 0),
    specializationKey: String(messageRollData.specializationKey ?? ''),
    specializationLevel: Number(messageRollData.specializationLevel ?? 0),
    specializationAttackBonus: Number(messageRollData.specializationAttackBonus ?? 0),
    specializationDamageBonus: Number(messageRollData.specializationDamageBonus ?? 0),
    specializationLethalBonus: Number(messageRollData.specializationLethalBonus ?? 0),
    specializationShockRdBonus: Number(messageRollData.specializationShockRdBonus ?? 0),
    slugShotActive: Boolean(messageRollData.slugShotActive),
    total: damageTotal,
    source: sourceMessage.speaker?.alias ?? sourceMessage.id,
    sourceMessageId: sourceMessage.id,
    sourceItemUuid: messageRollData.sourceItemUuid ?? null,
    lethal: messageRollData.lethal ?? 0,
    extraDamageDice,
    specialAmmoUsed: messageRollData.specialAmmoUsed ?? 'none',
    messageMode,
    userId: game.user.id,
  } });

  // attach rollData snapshot to context for completeness
  ctx.rollData = { attribute: combatValue, d10: messageRollData.d10, damageBonus: messageRollData.damageBonus };

  // Propagate special ammo choice into card input
  ctx.input.specialAmmoUsed = String(ctx.getAmmoInfo()?.specialAmmoUsed ?? 'none');
  const cardData = prepareDamageCardData({ input: ctx.input, actor, item: null, rollResult: extraDamageDice > 0 ? extraDamageRoll : null, attributeValue: combatValue });

  return createActionMessage({ actor, roll: extraDamageDice > 0 ? extraDamageRoll : null, messageMode, cardData, template: CARD_TEMPLATE });
}

async function executeOpposedChallengeRoll({ sourceMessage }) {
  const sourceRollData = getStandardizedRollData(sourceMessage);
  if (sourceRollData.subtype !== SUBTYPES.CHALLENGE) {
    return ui.notifications.warn(localize('SYNTHICIDE.Roll.Warnings.ChallengeDataMissing'));
  }

  const actor = getControlledActor();
  if (!actor) return ui.notifications.warn(localize('SYNTHICIDE.Roll.Warnings.ActorMissing'));

  const sourceMode = normalizeMessageMode(sourceRollData.messageMode ?? 'public');
  const dialogResult = await renderActionRollDialog({
    title: localize('SYNTHICIDE.Roll.Dialog.OpposedTitle'),
    defaults: {
      actor,
      subtype: SUBTYPES.CHALLENGE,
      attribute: sourceRollData.attribute ?? 'combat',
      difficulty: sourceRollData.difficulty ?? 6,
      misc: parseInt(sourceRollData.misc ?? 0, 10),
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

async function executeActionRoll({ actor, input, sourceItem, subtype }) {
  const resolvedSubtype = resolveActionSubtype({ subtype, sourceItem });
  const isDemolition = resolvedSubtype === SUBTYPES.DEMOLITION;
  const isAttack = resolvedSubtype === SUBTYPES.ATTACK;
  const isChallenge = resolvedSubtype === SUBTYPES.CHALLENGE;
  const attributeRequested = input?.attribute ?? (isDemolition ? getDemolitionRollAttributeKey(sourceItem) : 'combat');
  const attributeKey = getActionAttributeKey(resolvedSubtype, attributeRequested);

  // Build a RollContext centrally and apply modifiers once for all flows
  const ctx = buildRollContext({ actor, actorToken: null, sourceItem, subtype: resolvedSubtype, attributeKey, input });
  ctx.applyInputAdjustments();

  if (isDemolition) {
    return executeDemolitionActionRoll({ ctx, template: CARD_TEMPLATE });
  }

  if (isAttack) {
    return executeAttackActionRoll({ ctx, template: CARD_TEMPLATE });
  }

  if (isChallenge) {
    return executeChallengeActionRoll({ ctx });
  }

  return handleOtherRoll({ actor, input, sourceItem, subtype });
}

async function executeChallengeActionRoll({ actor, input, rollData }) {
  // Use RollContext for challenge flow
  const ctx = buildRollContext({ actor, actorToken: getControlledActor()?.token ?? null, sourceItem: null, subtype: 'challenge', attributeKey: input?.attribute ?? 'combat', input });
  ctx.rollData = rollData;
  const messageMode = normalizeMessageMode(ctx.input.messageMode);
  const difficulty = Number(ctx.input.difficulty ?? 6);
  const evaluatedRoll = await new Roll('1d10 + @attribute + @misc + @modifiers', ctx.rollData).evaluate();

  // Propagate special ammo choice into card input
  ctx.input.specialAmmoUsed = String(ctx.getAmmoInfo()?.specialAmmoUsed ?? 'none');
  const cardData = prepareChallengeCardData({ input: ctx.input, actor, rollResult: evaluatedRoll, attributeValue: ctx.rollData.attribute, difficulty });
  return createActionMessage({ actor, roll: evaluatedRoll, messageMode, cardData, template: CARD_TEMPLATE });
}

async function handleOtherRoll({ _actor, _input, _sourceItem, subtype }) {
  ui.notifications?.warn(`Roll type '${subtype}' is not implemented yet.`);
  return null;
}

function activateActionRollChatListeners(message, htmlElement) {
  if (!htmlElement || typeof htmlElement.querySelectorAll !== 'function' || typeof htmlElement.addEventListener !== 'function') return;
  const messageRollData = getStandardizedRollData(message);
  if (!messageRollData || (messageRollData.subtype !== SUBTYPES.ATTACK
    && messageRollData.subtype !== SUBTYPES.CHALLENGE
    && messageRollData.subtype !== SUBTYPES.DEMOLITION)) return;

  const followupAllowed = canExecuteFollowup(message);
  if (htmlElement.dataset.synthicideActionBound === 'true') return;
  htmlElement.dataset.synthicideActionBound = 'true';

  htmlElement.addEventListener('click', (event) => {
    const button = event.target?.closest?.('[data-action]');
    if (!button) return;

    const action = button.dataset.action;
    if (action !== 'rollDamage' && action !== 'rollOpposed') return;

    if (action === 'rollDamage' && !followupAllowed) {
      event.preventDefault();
      ui.notifications.warn(localize('SYNTHICIDE.Roll.Warnings.NotPermitted'));
      return;
    }

    onActionRollCardClick(event, message);
  });
}

async function onActionRollCardClick(event, message) {
  const button = event.target?.closest?.('[data-action]');
  if (!button || button.disabled) return;

  const action = button.dataset.action;
  if (action !== 'rollDamage' && action !== 'rollOpposed') return;

  event.preventDefault();
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

function canExecuteFollowup(message, user = game.user) {
  if (!message || !user) return false;
  if (user.isGM) return true;

  const rollData = getStandardizedRollData(message);
  if (!rollData) return false;

  if (rollData.userId === user.id) return true;

  const actor = resolveActorFromUuidSync(rollData.actorUuid);
  if (!actor) return false;
  return Boolean(actor?.isOwner);
}

function resolveActorFromUuidSync(uuid) {
  if (!uuid) return null;
  try {
    return globalThis.fromUuidSync(uuid, { strict: false }) ?? null;
  } catch {
    return null;
  }
}

function resolveActionSubtype({ subtype, sourceItem }) {
  if (String(sourceItem?.system?.weaponClass ?? '') === 'demolition') return SUBTYPES.DEMOLITION;
  if (subtype === SUBTYPES.ATTACK) return SUBTYPES.ATTACK;
  if (subtype === SUBTYPES.DEMOLITION) return SUBTYPES.DEMOLITION;
  return SUBTYPES.CHALLENGE;
}

async function rollAmmoExtraDamage(extraDamageDice) {
  if (!(extraDamageDice > 0)) return 0;
  return await new Roll(`${extraDamageDice}d10`).evaluate();
}
