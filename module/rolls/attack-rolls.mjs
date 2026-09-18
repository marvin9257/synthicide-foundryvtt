import SYNTHICIDE from '../helpers/config.mjs';
import { hasWeaponFeature } from './weapon-proficiency-rules.mjs';
import { SpecializationData } from './specialization-data.mjs';
import { FORMULA_ATTACK, hasWeaponModification } from './modifiers.mjs';
import { createActionMessage, normalizeMessageMode } from './cards.mjs';
import { getSpreadCollateralTokens, calculateVirtualDistanceBetweenTokens } from '../canvas/synthicide-virtual-ruler-utils.mjs';
import { localize } from './roll-utils.mjs';
import { SynthicideChatMessage } from '../documents/synthicide-chat-message.mjs';

export async function executeAttackActionRoll({ ctx, rollData = null, template }) {
  const actor = ctx.actor;
  const sourceItem = ctx.sourceItem;
  const messageMode = normalizeMessageMode(ctx.input.messageMode);
  const attackRangeContext = ctx.attackRangeContext;
  const specializationContext = ctx.specialization || {};

  if (attackRangeContext?.isImpossible) {
    ui.notifications.warn(localize('SYNTHICIDE.Roll.Warnings.MeleeOutOfRange'));
    return null;
  }

  // 1. Evaluate the Roll
  const effectiveRollData = rollData ?? ctx.rollData;
  const evaluatedRoll = await new Roll(FORMULA_ATTACK, effectiveRollData).evaluate();
  const attackTotal = Number(evaluatedRoll.total ?? 0);

  // 2. Fetch Target and Shield Details dynamically
  const targetDefenseContext = getTargetDefense({ notify: false });
  const targetToken = getSingleTargetToken({ notify: false });

  // 3. Assemble inputs safely
  const resolvedInput = buildResolvedAttackInput({
    input: ctx.input,
    rollData: ctx.rollData,
    attackRangeContext,
    baneDamageBonus: getBaneDamageBonus({ sourceItem, targetActor: targetToken?.actor }),
    specializationContext,
  });

  resolvedInput.attackBonus = Number(ctx.rollData.attackBonus ?? resolvedInput.attackBonus);
  resolvedInput.damageBonus = Number(ctx.rollData.damageBonus ?? resolvedInput.damageBonus);
  resolvedInput.specialAmmoUsed = String(ctx.getAmmoInfo()?.specialAmmoUsed ?? 'none');

  // 4. Construct the clean DataModel structural schema
  const cardSystemData = {
    // Shared Foundation Properties
    subtype: "attack",
    lethal: Number(sourceItem?.system?.bonuses?.lethal ?? 0) + Number(resolvedInput.specialization?.lethalBonus ?? 0),
    shockRdBonus: Number(sourceItem?.system?.shockRdBonus ?? 0),
    hideAttributeRow: Boolean(resolvedInput.isPlantedDemolitionAttack),
    specialization: resolvedInput.specialization ?? {},

    // Core Base Card Schema Parameters - Pulling values from the live evaluated Roll document
    total: Number(attackTotal),
    attackTotal: Number(attackTotal),
    // Extract the raw single d10 dice result safely from the roll terms collection
    d10: Number(evaluatedRoll.terms?.[0]?.results?.[0]?.result ?? evaluatedRoll.dice?.[0]?.results?.[0]?.result ?? 0),
    
    // Explicitly compute hit status during orchestration execution so it commits permanently to disk
    hit: Number(attackTotal) >= (Number(resolvedInput.armor ?? targetDefenseContext.armor ?? 0) + Number(resolvedInput.shieldBonus ?? targetDefenseContext.shieldBonus ?? 0)),

    // Core Metrics
    armor: Number(resolvedInput.armor ?? targetDefenseContext.armor ?? 0),
    shieldBonus: Number(resolvedInput.shieldBonus ?? targetDefenseContext.shieldBonus ?? 0),
    damageBonus: Number(resolvedInput.damageBonus ?? 0),
    baseAttackBonus: Number(resolvedInput.attackBonus ?? 0),
    baseDamageBonus: Number(resolvedInput.damageBonus ?? 0),
    
    attribute: String(ctx.attributeKey ?? 'combat'), 
    attributeValue: Number(ctx.rollData.attribute ?? resolvedInput.attributeValue ?? 0),
    
    // Automation Capture
    battleAssistValue: Number(sourceItem?.system?.bonuses?.battleAssistValue ?? 0),
    actorCombatValue: Number(actor?.system?.attributes?.combat?.value ?? 0),
    
    // Physical Tracking Dimensions
    rangeDistance: attackRangeContext?.distance ?? null,
    rangeIncrement: attackRangeContext?.rangeIncrement ?? null,
    
    // Weapon/Modification Context
    isPlantedDemolitionAttack: Boolean(resolvedInput.isPlantedDemolitionAttack),
    extraDamageDice: Number(resolvedInput.extraDamageDice ?? 0),
    baneDamageBonus: Number(resolvedInput.baneDamageBonus ?? 0),
    slugShotActive: !!(resolvedInput.slugShotActive),
    weaponModifications: Array.isArray(sourceItem?.system?.modifications) 
      ? sourceItem.system.modifications 
      : sourceItem?.system?.modifications instanceof Set 
        ? Array.from(sourceItem.system.modifications) 
        : [],
    
    // Identity Tracking
    actorUuid: actor?.uuid ?? null,
    sourceItemUuid: sourceItem?.uuid ?? null,
    weaponName: String(sourceItem?.name || localize('SYNTHICIDE.Roll.Subtype.Attack')),
    specialAmmoUsed: resolvedInput.specialAmmoUsed
  };

  // 5. Instantiation & Validation via Message Router Override
  const attackMessage = await createActionMessage({
    actor,
    template,
    roll: evaluatedRoll,
    messageMode,
    type: "attack",
    systemData: cardSystemData,
  });

  // Spread collateral trigger checks follow...
  if (hasWeaponFeature(sourceItem, 'spread')) {
    await executeSpreadCollateralCard({
      actor,
      sourceItem,
      attackTotal,
      attributeValue: ctx.rollData.attribute,
      specializationContext,
      messageMode,
      attackMessage,
      rollData: ctx.rollData
    });
  }

  return attackMessage;
}


export function buildAttackRangeContext({ actor, sourceItem, actorToken = null, targetToken = null, notify = true } = {}) {
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

  function normalizeToken(token) {
    return token?.object ?? token ?? null;
  }

  if (weaponClass !== 'melee' && weaponClass !== 'ranged') return context;

  if (!targetToken) targetToken = getSingleTargetToken({ notify });
  targetToken = normalizeToken(targetToken);
  if (!targetToken?.center) return context;

  if (!actorToken) actorToken = getActorToken(actor);
  actorToken = normalizeToken(actorToken);
  if (!actorToken?.center) {
    if (notify && actor) ui.notifications.warn(localize('SYNTHICIDE.Roll.Warnings.AttackerTokenMissing'));
    return context;
  }

  const distance = Number(calculateVirtualDistanceBetweenTokens(actorToken, targetToken));
  context.distance = Number.isFinite(distance) ? Math.max(0, distance) : 0;

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
      rangeModifier -= context.distance;
    }
  }

  if (weaponClass === 'ranged' && hasCloseFeature && context.distance === 0) {
    rangeModifier += 1;
  }

  context.rangeModifier = rangeModifier;
  return context;
}

export function resolveWeaponAttackContext({ _actor, sourceItem, targetToken }) {
  const baseAttackBonus = Number(sourceItem?.system?.bonuses?.attack ?? 0);
  const baseDamageBonus = Number(sourceItem?.system?.bonuses?.damage ?? 0);
  const arcAttackBonus = getArcAttackBonus({ sourceItem, targetToken });
  const baneDamageBonus = getBaneDamageBonus({ sourceItem, targetActor: targetToken?.actor });

  return {
    attackBonus: baseAttackBonus + arcAttackBonus + baneDamageBonus,
    damageBonus: baseDamageBonus + baneDamageBonus,
  };
}

export function getTargetDefense({ notify = true } = {}) {
  const defaultValue = game.settings.get('synthicide', SYNTHICIDE.DEFAULT_TARGET_ARMOR_KEY);
  if (game.user.targets?.size === 1) {
    const targetActor = game.user.targets.first()?.actor;
    const armorData = targetActor?.system?.armorDefense;
    const armor = Number(armorData?.value ?? armorData);
    const equippedShield = targetActor?.itemTypes?.shield?.find((item) => item.system?.equipped);
    const shieldBonus = Number(equippedShield?.system?.adBonus ?? 0);
    return {
      armor: Number.isFinite(armor) ? armor : defaultValue,
      shieldBonus: Number.isFinite(shieldBonus) ? shieldBonus : 0,
    };
  }

  if (notify) {
    if (game.user.targets?.size > 1) ui.notifications.warn(localize('SYNTHICIDE.Roll.Warnings.TooManyTargets'));
    else ui.notifications.warn(localize('SYNTHICIDE.Roll.Warnings.NoTarget'));
  }
  return { armor: defaultValue, shieldBonus: 0 };
}

function getTokenObject(token) {
  if (!token) return null;
  return token.object ?? token;
}

function getSingleTargetToken({ notify = true } = {}) {
  if (game.user.targets?.size === 1) return getTokenObject(game.user.targets.first() ?? null);
  if (game.user.targets?.size > 1) {
    if (notify) ui.notifications.warn(localize('SYNTHICIDE.Roll.Warnings.TooManyTargets'));
    return null;
  }
  if (notify) ui.notifications.warn(localize('SYNTHICIDE.Roll.Warnings.NoTarget'));
  return null;
}

export function getActorToken(actor) {
  if (!actor) return null;
  const activeTokens = actor.getActiveTokens?.(false, false) ?? [];
  if (activeTokens.length > 0) return getTokenObject(activeTokens[0]);
  if (canvas?.scene?.tokens) {
    const sceneToken = canvas.scene.tokens.find((token) => token?.actorId === actor.id);
    if (sceneToken) return sceneToken.object;
  }
  const controlled = canvas?.tokens?.controlled ?? [];
  return getTokenObject(controlled.find((token) => token?.actor?.id === actor.id) ?? null);
}

function getArcAttackBonus({ sourceItem, targetToken }) {
  if (!hasWeaponFeature(sourceItem, 'arc')) return 0;
  const targetActor = targetToken?.actor;
  if (!targetActor) return 0;
  return isSyntheticTarget(targetActor) || targetHasAnyImplants(targetActor) ? SYNTHICIDE.ARC_BONUS : 0;
}

function getBaneDamageBonus({ sourceItem, targetActor }) {
  if (!targetActor) return 0;
  const hasOrganicBane = hasWeaponModification(sourceItem, 'baneTuneOrganics');
  const hasSyntheticBane = hasWeaponModification(sourceItem, 'baneTuneSynthetics');
  if (!hasOrganicBane && !hasSyntheticBane) return 0;

  const targetIsSyntheticNpc = isSyntheticTarget(targetActor);
  const targetHasImplants = targetHasAnyImplants(targetActor);
  const isSyntheticForBane = targetIsSyntheticNpc || targetHasImplants;
  const isOrganicForBane = !targetIsSyntheticNpc || targetHasImplants;

  if (hasOrganicBane && isOrganicForBane) return 3;
  if (hasSyntheticBane && isSyntheticForBane) return 3;
  return 0;
}

function isSyntheticTarget(actor) {
  return (actor.system.npcWealthTier ?? '').toLowerCase() === 'synthetic';
}

function targetHasAnyImplants(actor) {
  return actor.itemTypes?.implant?.length > 0;
}

function buildResolvedAttackInput({ input, rollData, attackRangeContext, baneDamageBonus = 0, specializationContext = {} }) {
  return {
    ...input,
    baneDamageBonus,
    specialization: SpecializationData.fromObject(specializationContext).toCardPayload(),
    actorModifierTotal: rollData.actorModifierTotal,
    rangeModifier: rollData.rangeModifier,
    rangeDistance: attackRangeContext?.distance ?? null,
    rangeIncrement: attackRangeContext?.rangeIncrement ?? null,
  };
}

async function executeSpreadCollateralCard({ actor, sourceItem, attackTotal, attributeValue, specializationContext = {}, messageMode, attackMessage, rollData = {} }) {
  const attackerToken = getActorToken(actor);
  const targetToken = getSingleTargetToken({ notify: false });
  if (!attackerToken || !targetToken) return;

  const candidates = getSpreadCollateralTokens(attackerToken, targetToken);
  if (!candidates.length) return;

  const hitTokens = candidates.filter((token) => {
    const armor = Number(token.actor?.system?.armorDefense?.value ?? token.actor?.system?.armorDefense ?? 0);
    return attackTotal >= armor;
  });

  const baseDamageBonus = Number(sourceItem?.system?.bonuses.damage ?? 0) + Number(specializationContext.damageBonus ?? 0);
  const doubleShotBonus = Number(sourceItem?.system?.bonuses.doubleShotBonus ?? 0);
  const lethal = Number(sourceItem?.system?.bonuses.lethal ?? 0);

  if (!hitTokens.length) {
    const itemNamePrefix = sourceItem?.name ? `${sourceItem.name}: ` : '';
    const chatData = {
      content: `<div class="synthicide-spread-miss">${localize('SYNTHICIDE.Roll.Card.SpreadNoCollateral', {
        itemName: itemNamePrefix,
        count: candidates.length,
      })}</div>`,
      speaker: ChatMessage.getSpeaker({ actor }),
    };
    if (attackMessage?.id) {
      chatData.flags = {
        'dice-so-nice': {
          linkedTo: attackMessage.id
        }
      };
    }
    await ChatMessage.create(chatData, { messageMode: normalizeMessageMode(messageMode) });
    return;
  }

  for (const collateralToken of hitTokens) {
    const baneDamageBonus = getBaneDamageBonus({ sourceItem, targetActor: collateralToken.actor });
    const damageBonus = baseDamageBonus + doubleShotBonus + baneDamageBonus;
    const actorModifierTotal = Number(rollData.actorModifierTotal ?? 0);
    const flatDamage = attributeValue + damageBonus + actorModifierTotal;

    const systemData = {
      subtype: 'damage',
      userId: game.user.id,
      messageMode: messageMode,
      
      d10: 0,
      total: flatDamage,
      extraDamageDice: 0,
      attributeValue: attributeValue,
      specialAmmoUsed: String(sourceItem?.system?.specialAmmo ?? 'none'),
      
      damageBonus: damageBonus,
      lethal: lethal,
      shockRdBonus: 0,
      baneDamageBonus: baneDamageBonus,
      doubleShotBonus: doubleShotBonus,
      slugShotActive: false,
      baseDamageBonus: baseDamageBonus,
      hideAttributeRow: false,
      dmgMultiplier: 0,

      targetName: String(collateralToken.name || localize('SYNTHICIDE.Roll.Card.UnknownTarget')),
      
      source: sourceItem?.name ?? '',
      actorUuid: actor.uuid,
      sourceItemUuid: sourceItem?.uuid ?? null,
      sourceMessageId: attackMessage?.id || null,
      
      clamped: false,
      rawTotal: flatDamage,
      
      actorModifierTotal: actorModifierTotal,
      modifierDetails: Array.isArray(rollData.modifierDetails) ? rollData.modifierDetails : [],
      specialization: SpecializationData.fromObject(specializationContext).toCardPayload()
    };

    // Prepare custom companion references for Dice So Nice integrations safely
    const customFlags = {};
    if (attackMessage?.id) {
      customFlags['dice-so-nice'] = { linkedTo: attackMessage.id };
    }

    await SynthicideChatMessage.createActionMessage({ 
      actor, 
      roll: null,
      messageMode,
      type: 'damage',
      systemData,
      flags: customFlags 
    });
  }
}
