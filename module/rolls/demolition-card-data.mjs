import {
  localize,
  getAttributeLabel,
  buildEquationTerms,
  formatSignedNumber,
  buildBaseActionCardData,
  getRollResultSummary,
  extractCardContext
} from './roll-utils.mjs';

export function prepareDemolitionCardData({ input, actor, sourceItem, rollResult, attributeValue }) {
  const { d10, total, equation, dieClass } = getRollResultSummary(rollResult);
  const mode = getDemolitionMode(input.mode);
  const attributeKey = input.attribute;
  const difficulty = Number(input.difficulty ?? 0);
  const plantNumber = Number.isFinite(Number(input.plantNumber)) ? Number(input.plantNumber) : null;
  const effect = total - difficulty;
  const rangeDistance = Number.isFinite(Number(input.rangeDistance)) ? Number(input.rangeDistance) : null;
  const rangeIncrement = Number.isFinite(Number(input.rangeIncrement)) ? Number(input.rangeIncrement) : null;
  const rangeBands = Number.isFinite(Number(input.rangeBands)) ? Number(input.rangeBands) : null;
  const blastDiameter = Number.isFinite(Number(input.blastDiameter)) ? Number(input.blastDiameter) : null;
  const success = Boolean(input.success);
  const scatterApplied = Boolean(input.scatterApplied);
  const effectText = buildDemolitionEffectText({ mode, success, scatterApplied });
  const metadataRows = buildDemolitionMetadataRows({
    mode,
    difficulty,
    effect,
    blastDiameter,
    rangeDistance,
    rangeIncrement,
    rangeBands,
  });
  const { messageMode, sourceItemUuid, sourceMessageId } = extractCardContext({ input, sourceItem });
  // Strict system data for DataModel validation
  const system = {
    d10,
    total,
    damageBonus: Number(sourceItem?.system?.bonuses?.damage ?? 0),
    lethal: Number(sourceItem?.system?.bonuses?.lethal ?? 0),
    actorUuid: actor?.uuid ?? null,
    sourceItemUuid,
    sourceMessageId,
  };

  const cardExtras = buildBaseActionCardData({
    subtype: 'demolition',
    equation,
    total,
    dieValue: d10,
    dieClass,
    rollResult,
    attributeKey,
    equationTerms: buildEquationTerms({ subtype: 'demolition', attributeKey, rollData: { ...input, attributeValue } }),
    showEffectOutcomeRow: false,
    showDamageButton: true,
    showOpposedButton: false,
    flavor: buildDemolitionFlavor({ mode, sourceItem, attributeKey, difficulty, plantNumber }),
    effectText,
    effectClass: success ? 'outcome-success' : 'outcome-failure',
    metadataRows
  });

  return {
    type: 'demolition',
    system,
    messageMode,
    ...cardExtras,
    title: localize('SYNTHICIDE.Roll.Card.TitleDemolition'),
    flavor: buildDemolitionFlavor({ mode, sourceItem, attributeKey, difficulty, plantNumber }),
    showTotalRow: true
  };
}

function getDemolitionMode(mode) {
  return mode === 'planted' ? 'planted' : 'throw';
}

function buildDemolitionEffectText({ mode, success, scatterApplied }) {
  if (mode === 'planted') {
    return success
      ? localize('SYNTHICIDE.Roll.Outcome.Planted')
      : localize('SYNTHICIDE.Roll.Outcome.DetonatedDuringPlanting');
  }

  if (success) return localize('SYNTHICIDE.Roll.Outcome.OnTarget');
  return scatterApplied
    ? localize('SYNTHICIDE.Roll.Outcome.Scattered')
    : localize('SYNTHICIDE.Roll.Outcome.OffTargetNoScatter');
}

function buildDemolitionMetadataRows({ mode, difficulty, effect, blastDiameter, rangeDistance, rangeIncrement, rangeBands }) {
  const metadataRows = [
    {
      label: mode === 'planted'
        ? localize('SYNTHICIDE.Roll.Card.PlantNumber')
        : localize('SYNTHICIDE.Roll.Card.Difficulty'),
      value: difficulty,
    },
    { label: localize('SYNTHICIDE.Roll.Card.Effect'), value: formatSignedNumber(effect) },
    { label: localize('SYNTHICIDE.Roll.Card.BlastDiameter'), value: blastDiameter ?? 'n/a' },
  ];

  if (mode === 'throw') {
    metadataRows.push({ label: localize('SYNTHICIDE.Roll.Card.Distance'), value: rangeDistance ?? 'n/a' });
    metadataRows.push({ label: localize('SYNTHICIDE.Roll.Card.RangeIncrement'), value: rangeIncrement ?? 'n/a' });

    const showRangeBands = rangeBands !== null
      && rangeDistance !== null
      && rangeBands !== rangeDistance;
    if (showRangeBands) {
      metadataRows.push({ label: localize('SYNTHICIDE.Roll.Card.RangeBands'), value: rangeBands });
    }
  }

  return metadataRows;
}

function buildDemolitionFlavor({ mode, sourceItem, attributeKey, difficulty, plantNumber }) {
  if (mode === 'planted') {
    return localize('SYNTHICIDE.Roll.Card.DefaultFlavorDemolitionPlanted', {
      item: sourceItem?.name ?? localize('SYNTHICIDE.Roll.Subtype.Demolition'),
      attribute: getAttributeLabel(attributeKey),
      plant: plantNumber ?? difficulty,
    });
  }

  return localize('SYNTHICIDE.Roll.Card.DefaultFlavorDemolition', {
    item: sourceItem?.name ?? localize('SYNTHICIDE.Roll.Subtype.Demolition'),
    attribute: getAttributeLabel(attributeKey),
    rd: difficulty,
  });
}