import SYNTHICIDE from '../helpers/config.mjs';
import ItemTemplate from '../documents/ItemTemplate.mjs';
import { calculateVirtualZoneDistanceBetweenPoints, getRandomScatterCorner } from '../canvas/demolition-scatter-utils.mjs';
import { prepareDemolitionCardData } from './demolition-card-data.mjs';
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
      modifiers: Number(freshCtx.rollData.actorModifierTotal ?? 0) + Number(rollData?.rangeModifier ?? 0),
    };
  } else {
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
      modifiers: Number(freshCtx.rollData.actorModifierTotal) + Number(rollData?.rangeModifier ?? 0),
    };
  }

  const attackRoll = await new Roll(FORMULA_ATTACK, attackRollData).evaluate();
  attackRoll.options.rollOrder = 2; // Dice So Nice integration
  const attackTotal = Number(attackRoll.total ?? 0);
  let firstAttackMessageId = "";

  for (const token of blastTargets) {
    const targetActor = token.actor;
    if (!targetActor) continue;
    const targetAD = Number(targetActor.system.armorDefense?.value ?? targetActor.system.armorDefense ?? 0);
    const hit = attackTotal >= targetAD;

    // Construct the standardized database system schema footprint directly
    const cardSystemData = {
      lethal: Number(sourceItem?.system?.bonuses?.lethal ?? 0) + Number(specialization?.lethalBonus ?? 0),
      shockRdBonus: Number(sourceItem?.system?.shockRdBonus ?? 0),
      hideAttributeRow: isPlantedDemolition(sourceItem),
      specialization: specialization ?? {},

      armor: targetAD,
      shieldBonus: 0,
      damageBonus: baseDamageBonus,
      baseAttackBonus: baseAttackBonus,
      baseDamageBonus: baseDamageBonus,
      attribute: 'combat',
      attributeValue: Number(attackRollData.attribute ?? 0),
      
      battleAssistValue: Number(sourceItem?.system?.bonuses?.battleAssistValue ?? 0),
      actorCombatValue: Number(actor?.system?.attributes?.combat?.value ?? 0),
      
      isPlantedDemolitionAttack: isPlantedDemolition(sourceItem),
      extraDamageDice: Number(input?.extraDamageDice ?? 0),
      baneDamageBonus: 0,
      slugShotActive: false,
      weaponModifications: Array.isArray(sourceItem?.system?.modifications) 
        ? sourceItem.system.modifications 
        : sourceItem?.system?.modifications instanceof Set 
          ? Array.from(sourceItem.system.modifications) 
          : [],
      
      actorUuid: actor?.uuid ?? null,
      sourceItemUuid: sourceItem?.uuid ?? null,
      weaponName: sourceItem?.name ?? localize('SYNTHICIDE.Roll.Subtype.Attack'),
      specialAmmoUsed: String(input?.specialAmmoUsed ?? 'none')
    };

    // Use createActionMessage infrastructure to trigger native local validation context
    let tempMessage = await SynthicideChatMessage.createActionMessage({
      actor,
      roll: attackRoll,
      messageMode,
      systemData: cardSystemData,
      template,
      type: "attack"
    });

    if (!firstAttackMessageId) {
      firstAttackMessageId = tempMessage.id;
    } else if (tempMessage?.id) {
      // Connect sequential dice sets safely to preserve companion animations
      await tempMessage.update({
        "flags.dice-so-nice.linkedTo": firstAttackMessageId
      });
    }

    summaryRows.push(`<tr><td>${token.name}</td><td>${targetAD}</td><td>${attackTotal}</td><td>${hit ? localize('SYNTHICIDE.Roll.Outcome.Hit') : localize('SYNTHICIDE.Roll.Outcome.Miss')}</td></tr>`);
  }

  return { summaryRows, firstAttackMessageId };
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
