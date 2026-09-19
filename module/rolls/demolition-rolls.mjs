import SYNTHICIDE from '../helpers/config.mjs';
import ItemTemplate from '../documents/ItemTemplate.mjs';
import { calculateVirtualZoneDistanceBetweenPoints, getRandomScatterCorner } from '../canvas/demolition-scatter-utils.mjs';
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

  // Evaluate the challenge roll natively using ctx.rollData
  const rangeDistance = calculateVirtualZoneDistanceBetweenPoints(actorToken.center, placedPoint);
  const rangeBands = rangeDistance > 0 ? Math.ceil(rangeDistance / rangeIncrement) : 0;
  const difficulty = rangeBands * 3;

  const evaluatedRoll = await new Roll(FORMULA_CHALLENGE, ctx.rollData).evaluate();
  evaluatedRoll.options.rollOrder = 1; // Dice So Nice integration
  const totalScore = Number(evaluatedRoll.total ?? 0);
  const success = totalScore >= difficulty;
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

  // Structural Overrides Priority Rule: dialog fields override base item properties
  const finalDamageBonus = Number(ctx.input.damageBonus ?? sourceItem?.system?.bonuses?.damage ?? 0);
  const finalBaseDamageBonus = Number(sourceItem?.system?.bonuses?.damage ?? 0);
  const finalLethalValue = Number(sourceItem?.system?.bonuses?.lethal ?? 0) + Number(specialization?.lethalBonus ?? 0);
  const finalShockRdBonus = Number(sourceItem?.system?.shockRdBonus ?? 0);

  // Pack variables directly into the document structure to honor the Explicit Total Persistence Rule
  const cardSystemData = {
    subtype: 'demolition',
    d10: Number(evaluatedRoll.dice[0]?.results[0]?.result ?? 0),
    total: totalScore,
    difficulty,
    attribute: ctx.attributeKey || 'combat',
    attributeValue: Number(ctx.rollData.attribute ?? 0),
    damageBonus: finalDamageBonus,
    baseDamageBonus: finalBaseDamageBonus,
    actorModifierTotal: Number(ctx.rollData.actorModifierTotal ?? 0),
    
    blastDiameter,
    placedTemplateUuid: placedRegion?.uuid ?? '',
    mode: 'throw',
    success,
    scatterApplied,
    detonated: false,
    plantNumber: null,
    
    rangeDistance: Number(rangeDistance),
    rangeIncrement,
    rangeBands,

    lethal: finalLethalValue,
    shockRdBonus: finalShockRdBonus,
    hideAttributeRow: false,
    specialization: specialization ?? {},
    
    weaponModifications: Array.isArray(sourceItem?.system?.modifications) 
      ? sourceItem.system.modifications 
      : sourceItem?.system?.modifications instanceof Set 
        ? Array.from(sourceItem.system.modifications) 
        : [],
    weaponName: sourceItem?.name || localize('SYNTHICIDE.Roll.Subtype.Demolition'),
    specialAmmoUsed: String(ctx.input.specialAmmoUsed || 'none'),

    actorUuid: actor?.uuid ?? null,
    sourceItemUuid: sourceItem?.uuid ?? null,
    actorName: actor?.name ?? "",

    misc: Number(ctx.input.misc ?? 0),
    modifiers: Number(ctx.input.rollModifiers ?? 0),
    rangeModifier: Number(ctx.rollData.rangeModifier ?? 0),
    attackBonus: Number(ctx.rollData.attackBonus ?? 0)
  };

  // Dispatch straight to the universal document-driven message creator
  await SynthicideChatMessage.createActionMessage({
    actor,
    roll: evaluatedRoll,
    messageMode,
    systemData: cardSystemData,
    template,
    type: "demolition"
  });

  if (blastTargets.length > 0) {
    const { summaryRows, firstAttackMessageId } = await resolveBlastTargetAttacks({ ctx, specialization, blastTargets, messageMode, template });
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
  const totalScore = Number(evaluatedRoll.total ?? 0);
  const success = totalScore >= plantNumber;
  const detonated = !success; // Flags true so the data contract renders the manual damage click button

  // Structural Overrides Priority Rule: user dialog inputs take precedence over static attributes
  const finalDamageBonus = Number(ctx.input.damageBonus ?? sourceItem?.system?.bonuses?.damage ?? 0);
  const finalBaseDamageBonus = Number(sourceItem?.system?.bonuses?.damage ?? 0);
  const finalLethalValue = Number(sourceItem?.system?.bonuses?.lethal ?? 0) + Number(specialization?.lethalBonus ?? 0);
  const finalShockRdBonus = Number(sourceItem?.system?.shockRdBonus ?? 0);

  // Map snapshot properties cleanly to your standalone document schema definition
  const cardSystemData = {
    subtype: 'demolition',
    d10: Number(evaluatedRoll.dice?.[0]?.results?.[0]?.result ?? evaluatedRoll.terms?.[0]?.results?.[0]?.result ?? 0),
    total: totalScore,
    difficulty: plantNumber,
    attribute: 'operation',
    attributeValue: Number(ctx.rollData.attribute ?? 0),
    damageBonus: finalDamageBonus,
    baseDamageBonus: finalBaseDamageBonus,
    actorModifierTotal: Number(ctx.rollData.actorModifierTotal ?? 0),
    
    blastDiameter,
    placedTemplateUuid: placedRegion?.uuid ?? '',
    mode: 'planted',
    success,
    scatterApplied: false,
    detonated,
    plantNumber,

    lethal: finalLethalValue,
    shockRdBonus: finalShockRdBonus,
    hideAttributeRow: true, // Natively evaluated by DataModel RAM pass to format row layouts
    specialization: specialization ?? {},
    
    weaponModifications: Array.isArray(sourceItem?.system?.modifications) 
      ? sourceItem.system.modifications 
      : sourceItem?.system?.modifications instanceof Set 
        ? Array.from(sourceItem.system.modifications) 
        : [],
    weaponName: sourceItem?.name || localize('SYNTHICIDE.Roll.Subtype.Demolition'),
    specialAmmoUsed: String(ctx.input.specialAmmoUsed || 'none'),

    actorUuid: actor?.uuid ?? null,
    sourceItemUuid: sourceItem?.uuid ?? null,
    actorName: actor?.name ?? "",

    misc: Number(ctx.input.misc ?? 0),
    modifiers: Number(ctx.input.rollModifiers ?? 0),
    rangeModifier: Number(ctx.rollData.rangeModifier ?? 0),
    attackBonus: Number(ctx.rollData.attackBonus ?? 0),
  };

  // Dispatch straight to the universal creation router to render exactly ONE card pass
  await SynthicideChatMessage.createActionMessage({
    actor,
    roll: evaluatedRoll,
    messageMode,
    systemData: cardSystemData,
    template,
    type: "demolition"
  });

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

  const isPlanted = isPlantedDemolition(sourceItem);

  let attackRollData;
  if (isPlanted) {
    const freshCtx = buildRollContext({
      actor: null, // Forces actor attribute lookups to isolate completely to 0
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

  // Securely find the target roll's face value independently of the parent roll formula
  const computedD10 = Number(attackRoll.dice?.[0]?.results?.[0]?.result ?? attackRoll.terms?.[0]?.results?.[0]?.result ?? 0);

  for (const token of blastTargets) {
    const targetActor = token.actor;
    if (!targetActor) continue;
    const targetAD = Number(targetActor.system.armorDefense?.value ?? targetActor.system.armorDefense ?? 0);
    const hit = attackTotal >= targetAD;

    // Construct the standardized database system schema footprint directly with explicit totals
    const cardSystemData = {
      subtype: "attack",
      // Explicit Persistence Rule: Explicitly bind the flat totals to bypass parent message overrides
      total: attackTotal,
      attackTotal: attackTotal,
      d10: computedD10, // FIX: RESTORED missing parameter required by executeDerivedDamageRoll!

      misc: Number(input?.misc ?? 0),
      modifiers: Number(input?.rollModifiers ?? 0),
      rangeModifier: Number(rollData?.rangeModifier ?? 0),
      attackBonus: Number(baseAttackBonus ?? 0),

      lethal: Number(sourceItem?.system?.bonuses?.lethal ?? 0) + Number(specialization?.lethalBonus ?? 0),
      shockRdBonus: Number(sourceItem?.system?.shockRdBonus ?? 0),
      hideAttributeRow: isPlanted, // Planted explosives cleanly hide the combat line from layout views
      specialization: specialization ?? {},

      armor: targetAD,
      shieldBonus: 0,
      damageBonus: baseDamageBonus,
      baseAttackBonus: baseAttackBonus,
      baseDamageBonus: baseDamageBonus,
      attribute: 'combat',
      // Rule Parity check: Planted device damage loops must treat the user's attribute contributions as 0
      attributeValue: isPlanted ? 0 : Number(attackRollData.attribute ?? 0),
      
      battleAssistValue: Number(sourceItem?.system?.bonuses?.battleAssistValue ?? 0),
      actorCombatValue: Number(actor?.system?.attributes?.combat?.value ?? 0),
      
      isPlantedDemolitionAttack: isPlanted,
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

  const messageMode = SynthicideChatMessage.normalizeMessageMode(input.messageMode);
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

export async function createBlastSummaryMessage({ actor, summaryRows, messageMode, companionMessageId }) {
  const summaryTable = `
    <div class="synthicide-blast-summary">
      <strong>${localize('SYNTHICIDE.Roll.BlastSummary.Title')}</strong>
      <table>
        <thead>
          <tr>
            <th>${localize('SYNTHICIDE.Roll.BlastSummary.Target')}</th>
            <th>${localize('SYNTHICIDE.Roll.BlastSummary.AD')}</th>
            <th>${localize('SYNTHICIDE.Roll.BlastSummary.Roll')}</th>
            <th>${localize('SYNTHICIDE.Roll.BlastSummary.Result')}</th>
          </tr>
        </thead>
        <tbody>${summaryRows.join('')}</tbody>
      </table>
    </div>
  `;
  const chatData = {
    content: summaryTable,
    speaker: ChatMessage.getSpeaker({ actor }),
    type: CONST.BASE_DOCUMENT_TYPE
  };
  if (companionMessageId) {
    chatData.flags = {
      'dice-so-nice': {
        linkedTo: companionMessageId
      }
    };
  }
  await ChatMessage.implementation.create(chatData, { messageMode: SynthicideChatMessage.normalizeMessageMode(messageMode) });
}