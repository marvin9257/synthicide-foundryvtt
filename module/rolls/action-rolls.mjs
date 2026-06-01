import { localize } from './roll-utils.mjs';
import { prepareChallengeCardData } from './challenge-card-data.mjs';
import { prepareDamageCardData } from './damage-card-data.mjs';
import { getControlledActor } from '../helpers/get-controlled-actor.mjs';
import { renderActionRollDialog, buildDialogDefaults } from './dialogs.mjs';
import { executeAttackActionRoll, getActorToken } from './attack-rolls.mjs';
import { executeDemolitionActionRoll, getDemolitionRollAttributeKey } from './demolition-rolls.mjs';
import { createActionMessage, normalizeMessageMode } from './cards.mjs';
export { createActionMessage };
import { getActionAttributeKey, getActorAttributeValue } from './modifiers.mjs';
import { buildRollContext } from './roll-context.mjs';
import { SpecializationData } from './specialization-data.mjs';

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
  if (!sourceMessage) {
    console.warn('executeDerivedDamageRoll called without sourceMessage');
    return null;
  }
  const messageRollData = sourceMessage.getCardPayload?.();
  if (!messageRollData) {
    console.warn('executeDerivedDamageRoll: no card payload found on sourceMessage', sourceMessage);
    return ui.notifications?.warn(localize('SYNTHICIDE.Roll.Warnings.AttackDataMissing'));
  }
  const sourceSubtype = messageRollData.subtype;
  if (sourceSubtype !== SUBTYPES.ATTACK && sourceSubtype !== SUBTYPES.DEMOLITION) {
    return ui.notifications.warn(localize('SYNTHICIDE.Roll.Warnings.AttackDataMissing'));
  }
  if (sourceSubtype === SUBTYPES.ATTACK && !messageRollData.hit) {
    return ui.notifications.warn(localize('SYNTHICIDE.Roll.Warnings.DamageRequiresHit'));
  }

  const actor = resolveActorFromUuidSync(messageRollData.actorUuid);
  if (!actor) return ui.notifications.warn(localize('SYNTHICIDE.Roll.Warnings.ActorMissing'));

  const actorCombatValue = Number(getActorAttributeValue(actor, 'combat'));
  const isPlantedDemolitionAttack = Boolean(messageRollData.isPlantedDemolitionAttack);
  // A demolition-originated message may indicate 'planted' via `mode`,
  // or by setting `hideAttributeRow` on the demolition card. Blast-target
  // attack messages are marked with `isPlantedDemolitionAttack`. Check
  // all of these to robustly detect planted devices regardless of card type.
  const messageIsPlanted = Boolean(messageRollData.hideAttributeRow)
    || String(messageRollData.mode ?? '') === 'planted'
    || isPlantedDemolitionAttack;
  const damageAttributeValue = sourceSubtype === SUBTYPES.ATTACK
    ? Number(messageRollData.attributeValue ?? (isPlantedDemolitionAttack ? 0 : actorCombatValue))
    : Number(messageRollData.damageAttributeValue ?? (messageIsPlanted ? 0 : actorCombatValue));
  const messageMode = normalizeMessageMode(userMessageMode ?? messageRollData.messageMode ?? 'public');
  const extraDamageDice = Number(messageRollData.extraDamageDice ?? 0);
  let extraDamageRoll = null;
  let extraDamageTotal = 0;
  if (extraDamageDice > 0) {
    extraDamageRoll = await rollAmmoExtraDamage(extraDamageDice);
    extraDamageTotal = extraDamageRoll.total;
  }

  const damageTotal = Number(messageRollData.d10 ?? 0)
    + damageAttributeValue
    + Number(messageRollData.damageBonus ?? 0)
    + extraDamageTotal;

  const specializationSource = SpecializationData.fromObject(messageRollData.specialization ?? {}).toCardPayload();
  const sourceItem = messageRollData.sourceItemUuid ? foundry.utils.fromUuidSync(messageRollData.sourceItemUuid, { strict: false }) : null;
  const baseSourceLethal = Number(sourceItem?.system?.bonuses?.lethal ?? 0);
  const rawLethal = Number(messageRollData.lethal ?? baseSourceLethal);
  const effectiveLethal = (sourceItem && rawLethal === baseSourceLethal)
    ? rawLethal + Number(specializationSource.lethalBonus ?? 0)
    : rawLethal;
  const sourceToken = getActorToken(actor);
  const controlledActor = getControlledActor();
  const controlledToken = sourceToken ?? (controlledActor?.uuid === actor?.uuid ? getActorToken(controlledActor) : null);
  const ctx = buildRollContext({ actor, actorToken: controlledToken, sourceItem: null, subtype: 'damage', attributeKey: 'combat', input: {
    d10: messageRollData.d10,
    damageBonus: messageRollData.damageBonus,
    baneDamageBonus: Number(messageRollData.baneDamageBonus ?? 0),
    shockRdBonus: Number(messageRollData.shockRdBonus ?? 0),
    specialization: specializationSource,
    slugShotActive: Boolean(messageRollData.slugShotActive),
    hideAttributeRow: messageIsPlanted,
    total: damageTotal,
    source: sourceMessage?.getSpeakerAlias?.() ?? sourceMessage.speaker?.alias ?? sourceMessage.id,
    sourceMessageId: sourceMessage.id,
    sourceItemUuid: messageRollData.sourceItemUuid ?? null,
    lethal: effectiveLethal,
    extraDamageDice,
    specialAmmoUsed: messageRollData.specialAmmoUsed ?? 'none',
    messageMode,
    userId: game.user.id,
  } });

  // attach rollData snapshot to context for completeness
  ctx.rollData = { attribute: damageAttributeValue, d10: messageRollData.d10, damageBonus: messageRollData.damageBonus };

  // Propagate special ammo choice into card input
  ctx.input.specialAmmoUsed = String(ctx.getAmmoInfo()?.specialAmmoUsed ?? 'none');
  const cardData = prepareDamageCardData({ input: ctx.input, actor, item: null, rollResult: extraDamageDice > 0 ? extraDamageRoll : null, attributeValue: damageAttributeValue, rollData: ctx.rollData, baseDamageBonus: Number(ctx.input.baseDamageBonus ?? 0) });

  return createActionMessage({ actor, roll: extraDamageDice > 0 ? extraDamageRoll : null, messageMode, cardData, template: CARD_TEMPLATE });
}

async function executeOpposedChallengeRoll({ sourceMessage }) {
  if (!sourceMessage) {
    console.warn('executeOpposedChallengeRoll called without sourceMessage');
    return null;
  }
  const sourceRollData = sourceMessage.getCardPayload?.();
  if (!sourceRollData) {
    console.warn('executeOpposedChallengeRoll: no card payload found on sourceMessage', sourceMessage);
    return ui.notifications?.warn(localize('SYNTHICIDE.Roll.Warnings.ChallengeDataMissing'));
  }
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

  const opposedRollData = opposedRollMessage.getCardPayload?.();
  const opposedEffect = Number(opposedRollData?.effectValue ?? 0);
  const sourceEffect = Number(sourceRollData?.effectValue ?? 0);

  let winnerText;
  if (opposedEffect > sourceEffect) {
    winnerText = localize('SYNTHICIDE.Roll.Opposed.Result.ChallengerWins', {
      challenger: opposedRollMessage.getSpeakerAlias?.() ?? opposedRollMessage.speaker?.alias ?? localize('SYNTHICIDE.Roll.Opposed.Challenger'),
      total: opposedEffect,
      opposedTotal: sourceEffect,
    });
  } else if (sourceEffect > opposedEffect) {
    winnerText = localize('SYNTHICIDE.Roll.Opposed.Result.SourceWins', {
      source: sourceMessage.getSpeakerAlias?.() ?? sourceMessage.speaker?.alias ?? localize('SYNTHICIDE.Roll.Opposed.Source'),
      total: sourceEffect,
      opposedTotal: opposedEffect,
    });
  } else {
    winnerText = localize('SYNTHICIDE.Roll.Opposed.Result.Tie', { total: sourceEffect });
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

  // Build a RollContext centrally and apply modifiers + specializations once for all flows
  const sourceToken = getActorToken(actor);
  const controlledActor = getControlledActor();
  const controlledToken = sourceToken ?? (controlledActor?.uuid === actor?.uuid ? getActorToken(controlledActor) : null);
  const ctx = buildRollContext({ actor, actorToken: controlledToken, sourceItem, subtype: resolvedSubtype, attributeKey, input });
  ctx.prepareRoll({ notifyRange: false });

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

async function executeChallengeActionRoll({ ctx } = {}) {
  if (!ctx) return null;
  const actorObj = ctx.actor ?? null;
  const messageMode = normalizeMessageMode(ctx.input.messageMode);
  const difficulty = Number(ctx.input.difficulty ?? 6);
  const evaluatedRoll = await new Roll('1d10 + @attribute + @misc + @modifiers', ctx.rollData).evaluate();

  // Propagate special ammo choice into card input
  ctx.input.specialAmmoUsed = String(ctx.getAmmoInfo()?.specialAmmoUsed ?? 'none');
  const cardData = prepareChallengeCardData({ input: ctx.input, actor: actorObj, rollResult: evaluatedRoll, attributeValue: ctx.rollData.attribute, difficulty });
  return createActionMessage({ actor: actorObj, roll: evaluatedRoll, messageMode, cardData, template: CARD_TEMPLATE });
}

async function handleOtherRoll({ _actor, _input, _sourceItem, subtype }) {
  ui.notifications?.warn(`Roll type '${subtype}' is not implemented yet.`);
  return null;
}

function activateActionRollChatListeners(message, htmlElement) {
  if (!htmlElement || typeof htmlElement.querySelectorAll !== 'function' || typeof htmlElement.addEventListener !== 'function') return;
  if (!message) {
    console.warn('activateActionRollChatListeners called without message', { htmlElement });
    return;
  }
  const messageRollData = message.getCardPayload?.();
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

  if (!message) {
    console.warn('onActionRollCardClick called without message');
    return;
  }

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
  if (!message) {
    console.warn('canExecuteFollowup called without message');
    return false;
  }
  if (!user) return false;
  if (user.isGM) return true;

  const rollData = message.getCardPayload?.();
  if (!rollData) return false;

  if (rollData.userId === user.id) return true;

  const actor = resolveActorFromUuidSync(rollData.actorUuid);
  if (!actor) return false;
  return Boolean(actor?.isOwner);
}

function resolveActorFromUuidSync(uuid) {
  if (!uuid) return null;
  try {
    return foundry.utils.fromUuidSync(uuid, { strict: false }) ?? null;
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
