import { localize, getAttributeLabel, getDieClass, buildEquationTerms, formatSignedNumber } from './roll-utils.mjs';

export function prepareDemolitionCardData({ input, actor, sourceItem, rollResult, attributeValue }) {
  const d10 = Number(rollResult.dice?.[0]?.results?.[0]?.result ?? 0);
  const total = Number(rollResult.total ?? 0);
  const attributeKey = input.attribute;
  const difficulty = Number(input.difficulty ?? 0);
  const effect = total - difficulty;
  const rangeDistance = Number.isFinite(Number(input.rangeDistance)) ? Number(input.rangeDistance) : null;
  const rangeIncrement = Number.isFinite(Number(input.rangeIncrement)) ? Number(input.rangeIncrement) : null;
  const rangeBands = Number.isFinite(Number(input.rangeBands)) ? Number(input.rangeBands) : null;
  const blastDiameter = Number.isFinite(Number(input.blastDiameter)) ? Number(input.blastDiameter) : null;
  const success = Boolean(input.success);
  const scatterApplied = Boolean(input.scatterApplied);
  const effectText = success
    ? localize('SYNTHICIDE.Roll.Outcome.OnTarget')
    : (scatterApplied
      ? localize('SYNTHICIDE.Roll.Outcome.Scattered')
      : localize('SYNTHICIDE.Roll.Outcome.OffTargetNoScatter'));

  const showRangeBands = rangeBands !== null
    && rangeDistance !== null
    && rangeBands !== rangeDistance;

  const metadataRows = [
    { label: localize('SYNTHICIDE.Roll.Card.Difficulty'), value: difficulty },
    { label: localize('SYNTHICIDE.Roll.Card.Effect'), value: formatSignedNumber(effect) },
    { label: localize('SYNTHICIDE.Roll.Card.Distance'), value: rangeDistance ?? 'n/a' },
    { label: localize('SYNTHICIDE.Roll.Card.RangeIncrement'), value: rangeIncrement ?? 'n/a' },
    { label: localize('SYNTHICIDE.Roll.Card.BlastDiameter'), value: blastDiameter ?? 'n/a' },
  ];

  if (showRangeBands) {
    metadataRows.push({ label: localize('SYNTHICIDE.Roll.Card.RangeBands'), value: rangeBands });
  }

  return {
    title: localize('SYNTHICIDE.Roll.Card.TitleDemolition'),
    subtype: 'demolition',
    equation: rollResult.result,
    total,
    dieValue: d10,
    dieClass: getDieClass(d10, 10),
    equationTerms: buildEquationTerms({ subtype: 'demolition', attributeKey, rollData: { ...input, attributeValue } }),
    attributeKey,
    showEffectOutcomeRow: false,
    showDamageButton: false,
    showOpposedButton: false,
    flavor: localize('SYNTHICIDE.Roll.Card.DefaultFlavorDemolition', {
      item: sourceItem?.name ?? localize('SYNTHICIDE.Roll.Subtype.Demolition'),
      attribute: getAttributeLabel(attributeKey),
      rd: difficulty,
    }),
    effectText,
    effectClass: success ? 'outcome-success' : 'outcome-failure',
    metadataRows,
    flags: {
      version: 2,
      subtype: 'demolition',
      actorUuid: actor.uuid,
      userId: game.user.id,
      sourceItemUuid: sourceItem?.uuid ?? null,
      messageMode: input.messageMode,
      demolition: {
        attribute: attributeKey,
        attributeValue,
        difficulty,
        d10,
        total,
        effect,
        rangeDistance,
        rangeIncrement,
        rangeBands,
        blastDiameter,
        success,
        scatterApplied,
        aimedPoint: input.aimedPoint ?? null,
        finalPoint: input.finalPoint ?? null,
      },
    },
  };
}