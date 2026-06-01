import SYNTHICIDE from '../helpers/config.mjs';
import { hasWeaponFeature } from './weapon-proficiency-rules.mjs';
import { SpecializationData } from './specialization-data.mjs';
import { FORMULA_ATTACK, hasWeaponModification } from './modifiers.mjs';
import { prepareAttackCardData } from './attack-card-data.mjs';
import { prepareDamageCardData } from './damage-card-data.mjs';
import { createActionMessage, normalizeMessageMode } from './cards.mjs';
// RollContext constructed at the action entrypoint; flows accept `ctx`.
import { getSpreadCollateralTokens, calculateVirtualDistanceBetweenTokens } from '../canvas/synthicide-virtual-ruler-utils.mjs';
import { localize } from './roll-utils.mjs';

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

  // Respect any externally provided rollData override, otherwise use ctx.rollData
  const effectiveRollData = rollData ?? ctx.rollData;
  const evaluatedRoll = await new Roll(FORMULA_ATTACK, effectiveRollData).evaluate();
  const attackTotal = Number(evaluatedRoll.total ?? 0);

  const resolvedInput = buildResolvedAttackInput({
    input: ctx.input,
    rollData: ctx.rollData,
    attackRangeContext,
    baneDamageBonus: getBaneDamageBonus({ sourceItem, targetActor: getSingleTargetToken({ notify: false })?.actor }),
    specializationContext,
  });

  // Ensure the attack card metadata uses the fully adjusted attack and damage values.
  resolvedInput.attackBonus = Number(ctx.rollData.attackBonus ?? resolvedInput.attackBonus);
  resolvedInput.damageBonus = Number(ctx.rollData.damageBonus ?? resolvedInput.damageBonus);
  resolvedInput.specialAmmoUsed = String(ctx.getAmmoInfo()?.specialAmmoUsed ?? 'none');

  const cardData = prepareAttackCardData({ input: resolvedInput, actor, sourceItem, rollResult: evaluatedRoll, attributeValue: ctx.rollData.attribute, rollData: ctx.rollData });

  const attackMessage = await createActionMessage({
    actor,
    template,
    roll: evaluatedRoll,
    messageMode,
    cardData,
  });

  if (hasWeaponFeature(sourceItem, 'spread')) {
    await executeSpreadCollateralCard({
      actor,
      sourceItem,
      attackTotal,
      attributeValue: ctx.rollData.attribute,
      specializationContext,
      messageMode,
      template,
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

async function executeSpreadCollateralCard({ actor, sourceItem, attackTotal, attributeValue, specializationContext = {}, messageMode, template }) {
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
      await ChatMessage.create({
        content: `<div class="synthicide-spread-miss">${localize('SYNTHICIDE.Roll.Card.SpreadNoCollateral', {
          itemName: itemNamePrefix,
          count: candidates.length,
        })}</div>`,
        speaker: ChatMessage.getSpeaker({ actor }),
      }, { messageMode: normalizeMessageMode(messageMode) });
    return;
  }

  for (const collateralToken of hitTokens) {
    const baneDamageBonus = getBaneDamageBonus({ sourceItem, targetActor: collateralToken.actor });
    const damageBonus = baseDamageBonus + doubleShotBonus + baneDamageBonus;
    const flatDamage = attributeValue + damageBonus;

    const cardData = prepareDamageCardData({
      input: {
        d10: 0,
        damageBonus,
        baseDamageBonus,
        doubleShotBonus,
        baneDamageBonus,
        total: flatDamage,
        source: sourceItem?.name ?? '',
        lethal,
        messageMode,
        userId: game.user.id,
      },
      actor,
      item: sourceItem,
      attributeValue,
      overrides: {
        title: localize('SYNTHICIDE.Roll.Card.TitleSpreadDamage'),
        flavor: localize('SYNTHICIDE.Roll.Card.SpreadFlavor', {
          item: sourceItem?.name ?? '',
          targets: collateralToken.name,
        }),
      },
    });

    await createActionMessage({ actor, roll: null, messageMode, cardData, template });
  }
}
