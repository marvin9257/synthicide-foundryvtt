import { localize } from './roll-utils.mjs';
import { getControlledActor } from '../helpers/get-controlled-actor.mjs';
import { renderActionRollDialog, buildDialogDefaults } from './dialogs.mjs';
import { executeAttackActionRoll, getActorToken } from './attack-rolls.mjs';
import { executeDemolitionActionRoll, getDemolitionRollAttributeKey } from './demolition-rolls.mjs';
import { createActionMessage, normalizeMessageMode } from './cards.mjs';
export { createActionMessage };
import { getActionAttributeKey, getActorAttributeValue } from './modifiers.mjs';
import { buildRollContext } from './roll-context.mjs';
import { SpecializationData } from './specialization-data.mjs';
import { SynthicideChatMessage } from '../documents/synthicide-chat-message.mjs';

const CARD_TEMPLATE = 'systems/synthicide/templates/chat/action-roll-card.hbs';
const SUBTYPES = {
  CHALLENGE: 'challenge',
  ATTACK: 'attack',
  DEMOLITION: 'demolition',
  DRIVER_VELOCITY: 'driverVelocity',
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
  const resolvedInput = {
    ...dialogResult,
    // Keep caller-provided situational modifiers (e.g. NPC role bonuses)
    // because they are display-only in the dialog and not form-submitted.
    rollModifiers,
  };
  return executeActionRoll({ actor, input: resolvedInput, sourceItem, subtype: resolvedSubtype });
}

export async function rollVehicleWeaponDamageCard({ actor, sourceItem, messageMode } = {}) {
  if (!actor || !sourceItem || sourceItem.type !== 'vehicleWeapon') {
    ui.notifications?.warn(localize('SYNTHICIDE.Roll.Warnings.AttackDataMissing'));
    return null;
  }

  const normalizedMode = normalizeMessageMode(messageMode ?? game.settings.get('core', 'messageMode'));
  const dieRoll = await new Roll('1d10').evaluate();
  const dieValue = Number(dieRoll.total ?? 0);
  const dmgMultiplier = Math.max(1, Number(sourceItem.system?.dmgMultiplier ?? 1));
  const bonusDamage = dieValue * (dmgMultiplier - 1);
  const totalDamage = dieValue + bonusDamage;

  // Pack the variables straight into a systemData footprint matching vehicle configurations
  const systemData = {
    subtype: 'vehicleDamage',
    userId: game.user.id,
    messageMode: normalizedMode,
    
    d10: dieValue,
    total: totalDamage,
    extraDamageDice: 0,
    attributeValue: 0,
    specialAmmoUsed: 'none',
    
    damageBonus: bonusDamage,
    lethal: 0,
    shockRdBonus: 0,
    baneDamageBonus: 0,
    doubleShotBonus: 0,
    slugShotActive: false,
    baseDamageBonus: 0,
    hideAttributeRow: true,
    dmgMultiplier: dmgMultiplier,
    
    source: sourceItem.name ?? '',
    actorUuid: actor.uuid,
    sourceItemUuid: sourceItem.uuid,
    sourceMessageId: null,
    
    clamped: false,
    rawTotal: totalDamage,
    
    actorModifierTotal: 0,
    modifierDetails: [],
    specialization: {}
  };

  // Dispatch straight to the universal document-driven message router
  return SynthicideChatMessage.createActionMessage({ 
    actor, 
    roll: dieRoll,
    messageMode: normalizedMode,
    systemData,
    type: 'damage'
  });
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
    rollModifiers: messageRollData.rollModifiers
  } });

  // attach rollData snapshot to context for completeness
  ctx.rollData.attribute = damageAttributeValue;
  ctx.rollData.d10 = messageRollData.d10;
  ctx.rollData.damageBonus = messageRollData.damageBonus;
  ctx.prepareRoll({ includeSpecialization: true }); //needed?

  // Inject any calculated actor totals dynamically into the damage total calculation
  const actorModifierTotal = Number(ctx.rollData.actorModifierTotal ?? 0);
  const correctedDamageTotal = damageTotal + actorModifierTotal;
  ctx.input.total = correctedDamageTotal;
  ctx.rollData.total = correctedDamageTotal;

  // Propagate special ammo choice into card input
  ctx.input.specialAmmoUsed = String(ctx.getAmmoInfo()?.specialAmmoUsed ?? 'none');

  // 1. ASSEMBLE SYSTEM DATA: Map your variables straight to the modern DataModel fields
  const systemData = {
    subtype: 'damage',
    userId: game.user.id,
    messageMode: messageMode,
    
    // Core dice values & math bases
    d10: Number(messageRollData.d10 ?? 0),
    total: correctedDamageTotal,
    extraDamageDice: extraDamageDice,
    attributeValue: damageAttributeValue,
    specialAmmoUsed: ctx.input.specialAmmoUsed,
    
    // Layout presentation modifiers
    damageBonus: Number(messageRollData.damageBonus ?? 0),
    lethal: effectiveLethal,
    shockRdBonus: Number(messageRollData.shockRdBonus ?? 0),
    baneDamageBonus: Number(messageRollData.baneDamageBonus ?? 0),
    doubleShotBonus: Number(messageRollData.doubleShotBonus ?? 0),
    slugShotActive: Boolean(messageRollData.slugShotActive),
    baseDamageBonus: Number(ctx.input.baseDamageBonus ?? 0),
    hideAttributeRow: messageIsPlanted,
    dmgMultiplier: 0, 
    
    // Core structural identity tracking pointers
    source: sourceMessage?.getSpeakerAlias?.() ?? sourceMessage.speaker?.alias ?? sourceMessage.id,
    actorUuid: actor.uuid,
    sourceItemUuid: messageRollData.sourceItemUuid ?? null,
    sourceMessageId: sourceMessage.id,
    
    // Capping fields for template context states
    clamped: false, 
    rawTotal: damageTotal + actorModifierTotal,
    
    // Subsystem evaluation structures
    actorModifierTotal: actorModifierTotal,
    modifierDetails: Array.isArray(ctx.rollData.modifierDetails) ? ctx.rollData.modifierDetails : [],
    specialization: specializationSource
   };

  // 2. DISPATCH TO ROUTER: Hand the plain object block straight to your modern Document Creator
  return SynthicideChatMessage.createActionMessage({ 
    actor, 
    roll: extraDamageDice > 0 ? extraDamageRoll : null,
    messageMode,
    systemData // This triggers modern local RAM validation inside DamageCardSystemData flawlessly!
  });
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
  const isDriverVelocity = resolvedSubtype === SUBTYPES.DRIVER_VELOCITY;
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

  if (isDriverVelocity) {
    return executeDriverVelocityActionRoll({ ctx });
  }

  return handleOtherRoll({ actor, input, sourceItem, subtype });
}

async function executeChallengeActionRoll({ ctx } = {}) {
  if (!ctx) return null;
  const actorObj = ctx.actor ?? null;
  const messageMode = normalizeMessageMode(ctx.input.messageMode);
  const difficulty = Number(ctx.input.difficulty ?? 6);
  
  // 1. Evaluate the authentic dice check natively on the client
  const evaluatedRoll = await new Roll('1d10 + @attribute + @misc + @modifiers', ctx.rollData).evaluate();
  const d10Value = Number(evaluatedRoll.dice[0].results[0].result ?? 0);
  const finalTotal = Number(evaluatedRoll.total ?? 0);

  // 2. Package data fields matching our strict DataModel configuration
  const systemData = {
    subtype: "challenge",
    attribute: ctx.attributeKey || "combat",
    difficulty,
    total: finalTotal,
    d10: d10Value,
    misc: Number(ctx.rollData.misc ?? 0),
    modifiers: Number(ctx.rollData.modifiers ?? 0),
    attributeValue: Number(ctx.rollData.attribute ?? 0),
    actorUuid: actorObj?.uuid ?? null,
    actorName: actorObj?.name ?? ""
  };

  return createActionMessage({ actor: actorObj, roll: evaluatedRoll, messageMode, systemData });
}

async function executeDriverVelocityActionRoll({ ctx } = {}) {
  if (!ctx) return null;
  const actorObj = ctx.actor ?? null;
  const messageMode = normalizeMessageMode(ctx.input.messageMode);
  const difficulty = Number(ctx.input.difficulty ?? 6);
  const velocity = Number(foundry.utils.getProperty(actorObj, 'system.velocity') ?? 0);
  
  ctx.rollData.velocity = velocity;
  ctx.rollData.attributeValue = velocity; 
  
  // 1. Evaluate the velocity roll formula
  const evaluatedRoll = await new Roll('1d10 + @velocity + @misc + @modifiers', ctx.rollData).evaluate();
  const d10Value = Number(evaluatedRoll.dice[0]?.results?.[0]?.result ?? 0);
  const finalTotal = Number(evaluatedRoll.total ?? 0);

  // 2. Map snapshot payload straight to your centralized Challenge schema structure!
  const systemData = {
    subtype: "challenge", // Map to challenge schema class natively
    attribute: "velocity", // Overrides attribute name so our model triggers velocity row translations
    difficulty,
    total: finalTotal,
    d10: d10Value,
    misc: Number(ctx.rollData.misc ?? 0),
    modifiers: Number(ctx.rollData.modifiers ?? 0),
    attributeValue: velocity,
    actorUuid: actorObj?.uuid ?? null,
    actorName: actorObj?.name ?? ""
  };

  return createActionMessage({ actor: actorObj, roll: evaluatedRoll, messageMode, systemData, type: 'challenge' });
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
  if (subtype === SUBTYPES.DRIVER_VELOCITY) return SUBTYPES.DRIVER_VELOCITY;
  if (subtype === SUBTYPES.ATTACK) return SUBTYPES.ATTACK;
  if (subtype === SUBTYPES.DEMOLITION) return SUBTYPES.DEMOLITION;
  return SUBTYPES.CHALLENGE;
}

async function rollAmmoExtraDamage(extraDamageDice) {
  if (!(extraDamageDice > 0)) return 0;
  return await new Roll(`${extraDamageDice}d10`).evaluate();
}
