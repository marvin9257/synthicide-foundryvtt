import SYNTHICIDE from '../helpers/config.mjs';
import ItemTemplate from '../documents/ItemTemplate.mjs';
import { calculateVirtualZoneDistanceBetweenPoints, getRandomScatterCorner } from '../canvas/demolition-scatter-utils.mjs';
import { prepareDemolitionCardData } from './demolition-card-data.mjs';
import { prepareAttackCardData } from './attack-card-data.mjs';
import { createActionMessage, createBlastSummaryMessage, normalizeMessageMode } from './cards.mjs';
import { SynthicideChatMessage } from '../documents/synthicide-chat-message.mjs';
import { parseNumeric, FORMULA_CHALLENGE, FORMULA_ATTACK } from './modifiers.mjs';
import { buildRollContext } from './roll-context.mjs';
import { getActorToken } from './attack-rolls.mjs';
import { hasWeaponFeature } from './weapon-proficiency-rules.mjs';
import { SpecializationData } from './specialization-data.mjs';
import { localize } from './roll-utils.mjs';

export async function executeDemolitionActionRoll({ ctx, template }) {
  const plantNumber = getDemolitionPlantNumber(ctx.sourceItem);
  if (plantNumber !== null) {
    return executePlantedDemolitionActionRoll({ ctx, plantNumber, template });
  }
  return executeThrownDemolitionActionRoll({ ctx, template });
}

async function executeThrownDemolitionActionRoll({ ctx, template }) {
  const actor = ctx.actor;
  const sourceItem = ctx.sourceItem;
  const actorToken = getActorToken(actor);
  if (!actorToken?.center) {
    ui.notifications.warn(localize('SYNTHICIDE.Roll.Warnings.AttackerTokenMissing'));
    return null;
  }

  const rangeIncrement = Math.max(0, Number(sourceItem?.system?.rangeIncrement ?? 0));
  if (rangeIncrement <= 0) {
    ui.notifications.warn(localize('SYNTHICIDE.Roll.Warnings.DemolitionRangeIncrementMissing'));
    return null;
  }

  const placement = await createDemolitionPlacementContext({ input: ctx.input, sourceItem, requirePoint: true });
  if (!placement) return null;
  const { messageMode, placedRegion, placedPoint, blastDiameter } = placement;

  const specializationContext = ctx.specialization || {};

  // Evaluate the challenge roll using ctx.rollData (modifiers applied by caller)
  const rangeDistance = calculateVirtualZoneDistanceBetweenPoints(actorToken.center, placedPoint);
  const rangeBands = rangeDistance > 0 ? Math.ceil(rangeDistance / rangeIncrement) : 0;
  const difficulty = rangeBands * 3;

  const evaluatedRoll = await new Roll(FORMULA_CHALLENGE, ctx.rollData).evaluate();
  evaluatedRoll.options.rollOrder = 1; //Dice so nice integration
  const success = Number(evaluatedRoll.total ?? 0) >= difficulty;
  const autoScatterEnabled = Boolean(game.settings.get('synthicide', SYNTHICIDE.DEMOLITION_AUTO_SCATTER_KEY));

  let scatterApplied = false;
  if (!success && autoScatterEnabled) {
    const scatterCorner = getRandomScatterCorner({ zonePoint: placedPoint });
    if (scatterCorner) {
      await ItemTemplate.movePlacedRegion(placedRegion, scatterCorner);
      scatterApplied = true;
    }
  }

  const blastTargets = ItemTemplate.targetTokensForPlacedRegion(placedRegion) || [];
  const specialization = buildDemolitionSpecialization(specializationContext);

  const damageCardData = prepareDemolitionCardData({
    input: {
      ...ctx.input,
      damageBonus: Number(ctx.input.damageBonus ?? sourceItem?.system?.bonuses?.damage ?? 0),
      baseDamageBonus: Number(sourceItem?.system?.bonuses?.damage ?? 0),
      actorModifierTotal: Number(ctx.rollData.actorModifierTotal ?? 0),
      difficulty,
      rangeDistance: Number(rangeDistance),
      rangeIncrement,
      rangeBands,
      mode: 'throw',
      blastDiameter,
      success,
      scatterApplied,
      specialization,
    },
    actor,
    sourceItem,
    rollResult: evaluatedRoll,
    attributeValue: ctx.rollData.attribute,
  });

  foundry.utils.setProperty(damageCardData, 'system.placedTemplateUuid', placedRegion?.uuid);
  await createActionMessage({ actor, roll: evaluatedRoll, messageMode, cardData: damageCardData, template });

  if (blastTargets.length > 0) {
    const {summaryRows, firstAttackMessageId} = await resolveBlastTargetAttacks({ ctx, specialization, blastTargets, messageMode, template });
    if (summaryRows.length > 0) {
      await createBlastSummaryMessage({ actor, summaryRows, messageMode, companionMessageId: firstAttackMessageId });
    }
  }

  return null;
}

async function executePlantedDemolitionActionRoll({ ctx, plantNumber, template }) {
  const actor = ctx.actor;
  const sourceItem = ctx.sourceItem;
  const placement = await createDemolitionPlacementContext({ input: ctx.input, sourceItem, requirePoint: false });
  if (!placement) return null;
  const { messageMode, placedRegion, blastDiameter } = placement;

  const specializationContext = ctx.specialization || {};
  const specialization = buildDemolitionSpecialization(specializationContext);

  const evaluatedRoll = await new Roll(FORMULA_CHALLENGE, ctx.rollData).evaluate();
  const success = Number(evaluatedRoll.total ?? 0) >= plantNumber;
  const detonated = !success;

  const cardData = prepareDemolitionCardData({
    input: {
      ...ctx.input,
      damageBonus: Number(ctx.input.damageBonus ?? sourceItem?.system?.bonuses?.damage ?? 0),
      baseDamageBonus: Number(sourceItem?.system?.bonuses?.damage ?? 0),
      attribute: 'operation',
      actorModifierTotal: Number(ctx.rollData.actorModifierTotal ?? 0),
      difficulty: plantNumber,
      mode: 'planted',
      plantNumber,
      blastDiameter,
      success,
      detonated,
      scatterApplied: false,
      specialization,
    },
    actor,
    sourceItem,
    rollResult: evaluatedRoll,
    attributeValue: ctx.rollData.attribute,
  });

  foundry.utils.setProperty(cardData, 'system.placedTemplateUuid', placedRegion?.uuid);
  await createActionMessage({ actor, roll: evaluatedRoll, messageMode, cardData, template });
  return null;
}

async function resolveBlastTargetAttacks({ ctx, specialization, blastTargets, messageMode, template }) {
  const summaryRows = [];
  if (!blastTargets?.length) return { summaryRows, firstAttackMessageId: '' };

  const actor = ctx.actor;
  const input = ctx.input;
  const sourceItem = ctx.sourceItem;
  const rollData = ctx.rollData;

  const baseAttackBonus = Number(sourceItem?.system?.bonuses?.attack ?? 0);
  const baseDamageBonus = Number(sourceItem?.system?.bonuses?.damage ?? 0);
  const inputAttackBonus = Number(input?.attackBonus ?? 0);
  const misc = parseNumeric(input?.misc, 0);

  let attackRollData;
  if (isPlantedDemolition(sourceItem)) {
    // For planted demolition the device is static and should not use the
    // actor's modifiers or any special ammo effects per RAW. Build a
    // RollContext with no actor and no sourceItem so modifier and ammo
    // application are effectively disabled, but still normalize the
    // provided inputs (attackBonus, misc).
    const freshCtx = buildRollContext({
      actor: null,
      actorToken: null,
      sourceItem: null,
      input: { attackBonus: baseAttackBonus + inputAttackBonus, misc },
      subtype: 'attack',
      attributeKey: ctx.attributeKey,
    });
    freshCtx.normalizeInput().applyInputAdjustments();

    attackRollData = {
      attribute: Number(freshCtx.rollData.attribute ?? 0),
      misc: Number(freshCtx.rollData.misc ?? 0),
      attackBonus: Number(freshCtx.rollData.attackBonus ?? 0),
      // No actor modifiers for planted devices; only include placement rangeModifier.
      modifiers: Number(freshCtx.rollData.actorModifierTotal ?? 0) + Number(rollData?.rangeModifier ?? 0),
    };
  } else {
    // Build a fresh RollContext so modifier application (modes, ammo,
    // specialization) is consistent with other flows. We provide the
    // computed attack/damage inputs so the context can adjust them.
    const freshCtx = buildRollContext({
      actor,
      input: { attackBonus: baseAttackBonus + inputAttackBonus, misc },
      sourceItem,
      subtype: 'attack',
      attributeKey: ctx.attributeKey,
    });
    freshCtx.applyInputAdjustments();

    attackRollData = {
      attribute: freshCtx.rollData.attribute,
      misc: freshCtx.rollData.misc,
      attackBonus: freshCtx.rollData.attackBonus,
      // Keep range modifier from the original rollData (placement range),
      // but use the canonical actor modifier total from the fresh context.
      modifiers: Number(freshCtx.rollData.actorModifierTotal) + Number(rollData?.rangeModifier ?? 0),
    };
  }

  const attackRoll = await new Roll(FORMULA_ATTACK, attackRollData).evaluate();
  attackRoll.options.rollOrder = 2; ///Dice so nice integration
  const attackTotal = Number(attackRoll.total ?? 0);
  const rollHtml = await attackRoll.render();
  let firstAttackMessageId = "";

  for (const token of blastTargets) {
    const targetActor = token.actor;
    if (!targetActor) continue;
    const targetAD = Number(targetActor.system.armorDefense?.value ?? 0);
    const hit = attackTotal >= targetAD;

    const attackCardData = prepareAttackCardData({
      input: {
        ...input,
        armor: targetAD,
        isPlantedDemolitionAttack: isPlantedDemolition(sourceItem),
        specialization,
        damageBonus: baseDamageBonus,
        baseDamageBonus: baseDamageBonus,
        attackBonus: Number(attackRollData.attackBonus ?? 0),
        baseAttackBonus: baseAttackBonus,
        actorModifierTotal: Number(attackRollData.actorModifierTotal ?? 0),
        rangeModifier: Number(rollData.rangeModifier ?? 0),
        rangeDistance: null,
        rangeIncrement: null,
      },
      actor,
      sourceItem,
      rollResult: attackRoll,
      attributeValue: attackRollData.attribute,
      rollData: attackRollData,
    });
    const cardHtml = await foundry.applications.handlebars.renderTemplate(template, { ...attackCardData, rollHtml });
    const chatData = SynthicideChatMessage.prepareData({ actor, content: cardHtml, cardData: attackCardData });
    let tempMessage;
    if (!firstAttackMessageId) {
      tempMessage = await attackRoll.toMessage(chatData, { messageMode: normalizeMessageMode(messageMode) });
      firstAttackMessageId = tempMessage.id;
    } else {
      chatData.flags = chatData.flags ?? {};
      chatData.flags['dice-so-nice'] = { linkedTo: firstAttackMessageId };
      await SynthicideChatMessage.create(chatData, { messageMode: normalizeMessageMode(messageMode) });
    }
    summaryRows.push(`<tr><td>${token.name}</td><td>${targetAD}</td><td>${attackTotal}</td><td>${hit ? localize('SYNTHICIDE.Roll.Outcome.Hit') : localize('SYNTHICIDE.Roll.Outcome.Miss')}</td></tr>`);
  }

  return {summaryRows, firstAttackMessageId};
}

async function createDemolitionPlacementContext({ input, sourceItem, requirePoint = true }) {
  const targetData = buildDemolitionTargetData(sourceItem);
  if (!targetData) {
    ui.notifications.warn(localize('SYNTHICIDE.Roll.Warnings.DemolitionBlastMissing'));
    return null;
  }
  const { target, blastDiameter } = targetData;

  const messageMode = normalizeMessageMode(input.messageMode);
  const template = await ItemTemplate.fromItem(sourceItem, {
    name: sourceItem?.name ?? localize('SYNTHICIDE.Roll.Subtype.Demolition'),
    target,
  });
  if (!template) return null;

  const placedRegion = await template.drawPreview();
  if (!placedRegion) return null;

  let placedPoint = null;
  if (requirePoint) {
    placedPoint = ItemTemplate.getPlacedPoint(placedRegion);
    if (!placedPoint) {
      ui.notifications.warn(localize('SYNTHICIDE.Roll.Warnings.DemolitionPlacementMissing'));
      return null;
    }
  }

  return {
    messageMode,
    placedRegion,
    placedPoint,
    blastDiameter,
  };
}

function getDemolitionBlastDiameter(sourceItem) {
  if (hasWeaponFeature(sourceItem, 'blast5')) return 5;
  if (hasWeaponFeature(sourceItem, 'blast3')) return 3;
  return 0;
}

function getDemolitionPlantNumber(sourceItem) {
  if (hasWeaponFeature(sourceItem, 'plant12')) return 12;
  if (hasWeaponFeature(sourceItem, 'plant8')) return 8;
  return null;
}

export function getDemolitionRollAttributeKey(sourceItem) {
  return isPlantedDemolition(sourceItem) ? 'operation' : 'combat';
}
function isPlantedDemolition(sourceItem) {
  return getDemolitionPlantNumber(sourceItem) !== null;
}

function buildDemolitionSpecialization(specializationContext = {}) {
  const specialization = specializationContext instanceof SpecializationData
    ? specializationContext
    : SpecializationData.fromObject(specializationContext);

  return {
    ...specialization.toCardPayload(),
  };
}

function buildDemolitionTargetData(sourceItem) {
  const blastDiameter = getDemolitionBlastDiameter(sourceItem);
  if (blastDiameter <= 0) return null;
  const sceneDistancePerGridCell = Number(canvas?.scene?.grid?.distance ?? canvas?.grid?.distance ?? 1);
  const radiusInDistanceUnits = (blastDiameter * sceneDistancePerGridCell) / 2;
  const target = foundry.utils.deepClone(sourceItem?.system?.target ?? {});
  return {
    blastDiameter,
    target: {
      ...target,
      type: 'radius',
      templateType: 'circle',
      value: radiusInDistanceUnits,
    },
  };
}
