import SYNTHICIDE from '../helpers/config.mjs';
import { formatSignedNumber } from './roll-utils.mjs';
import { SpecializationData } from './specialization-data.mjs';

/**
 * Resolve the proficiency key for a weapon type.
 */
export function resolveWeaponProficiencyKey(weaponType) {
  return SYNTHICIDE.WEAPON_TYPE_PROFICIENCY_KEY?.[weaponType]
    ?? SYNTHICIDE.WEAPON_TYPE_RULE_FAMILY?.[weaponType]
    ?? weaponType;
}

/**
 * Read actor weapon proficiency level from derived data.
 */
export function getActorWeaponProficiencyLevel(actor, proficiencyKey) {
  const derivedLevel = Number(actor?.system?.weaponProficiencies?.[proficiencyKey] ?? 0);
  if (Number.isFinite(derivedLevel) && derivedLevel > 0) return derivedLevel;
  return 0;
}

/**
 * Build normalized specialization/proficiency bonus context for a weapon roll.
 */
export function resolveWeaponSpecializationContext({ actor, sourceItem } = {}) {
  const empty = {
    key: '',
    level: 0,
    attackBonus: 0,
    damageBonus: 0,
    lethalBonus: 0,
    shockRdBonus: 0,
    demolitionThrow: 0,
    demolitionPlacement: 0,
  };

  if (!actor || !sourceItem) return empty;
  const weaponType = String(sourceItem?.system?.weaponType ?? '').trim();
  if (!weaponType) return empty;

  const primaryKey = resolveWeaponProficiencyKey(weaponType);
  if (!primaryKey) return empty;

  const weaponClass = String(sourceItem?.system?.weaponClass ?? '').trim();
  const primaryLevel = getActorWeaponProficiencyLevel(actor, primaryKey);
  const isPrimitive = hasWeaponFeature(sourceItem, 'primitive');
  const primitiveLevel = isPrimitive ? getActorWeaponProficiencyLevel(actor, 'primitive') : 0;

  const entries = [];
  if (primaryLevel > 0) entries.push({ proficiencyKey: primaryKey, level: primaryLevel });
  if (primitiveLevel > 0) entries.push({ proficiencyKey: 'primitive', level: primitiveLevel });
  if (!entries.length) return empty;

  const description = entries.length > 1
    ? entries.map(({ proficiencyKey, level }) => `${formatSpecializationName(proficiencyKey)} (Lvl ${level})`).join(' + ')
    : '';

  const specialization = SpecializationData.fromProficiencyList({
    entries,
    weaponClass,
    description,
  });

  return specialization.toCardPayload();
}

/**
 * Get demolition-specific specialization bonus for modifiers.
 * Returns the numeric demolition bonus that callers may apply.
 */
export function getDemolitionSpecializationBonus({ specializationContext, subtype, attributeKey } = {}) {
  if (subtype !== 'demolition') return 0;

  const specializationData = SpecializationData.fromInput(specializationContext);
  return specializationData.getDemolitionBonus(attributeKey);
}

export function hasWeaponFeature(sourceItem, featureKey) {
  const features = sourceItem?.system?.features;
  if (features instanceof Set) return features.has(featureKey);
  if (Array.isArray(features)) return features.includes(featureKey);
  return false;
}

/**
 * Build standardized metadata rows for weapon specialization traceability.
 */
export function buildWeaponSpecializationMetadataRows({ input = {}, includeAttackBonus = false, includeDamageBonus = false, includeLethalBonus = false, includeShockRdBonus = false } = {}) {
  const specializationData = SpecializationData.fromInput(input);
  const { key, level, attackBonus, damageBonus, lethalBonus, shockRdBonus, description } = specializationData.toCardPayload();

  if (!key && !level && !attackBonus && !damageBonus && !lethalBonus && !shockRdBonus) return [];

  const rows = [];

  const descriptorName = String(description || (key ? formatSpecializationName(key) : '')).trim();
  const descriptorValue = description
    ? descriptorName
    : (level > 0
      ? `${descriptorName || game.i18n.localize('SYNTHICIDE.Roll.Card.SpecShort')} (Lvl ${level})`
      : descriptorName);
  if (descriptorValue) {
    rows.push({
      label: game.i18n.localize('SYNTHICIDE.Roll.Card.WeaponSpecialization'),
      value: descriptorValue,
    });
  }

  const bonusParts = [];
  if (includeAttackBonus && attackBonus !== 0) bonusParts.push(`ATT ${formatSignedNumber(attackBonus)}`);
  if (includeDamageBonus && damageBonus !== 0) bonusParts.push(`DMG ${formatSignedNumber(damageBonus)}`);
  if (bonusParts.length) {
    rows.push({
      label: game.i18n.localize('SYNTHICIDE.Roll.Card.WeaponSpecializationBonuses'),
      value: bonusParts.join(' · '),
    });
  }

  const effectParts = [];
  if (includeLethalBonus && lethalBonus !== 0) effectParts.push(`Lethal ${formatSignedNumber(lethalBonus)}`);
  if (includeShockRdBonus && shockRdBonus !== 0) effectParts.push(`Shock RD ${formatSignedNumber(shockRdBonus)}`);
  if (effectParts.length) {
    rows.push({
      label: game.i18n.localize('SYNTHICIDE.Roll.Card.WeaponSpecializationEffects'),
      value: effectParts.join(' · '),
    });
  }

  return rows;
}

/**
 * Build metadata rows for demolition specialization traceability.
 */
export function buildDemolitionSpecializationMetadataRows({ input = {} } = {}) {
  const specializationData = SpecializationData.fromInput(input);
  const { key, level, description, demolitionThrow: throwBonus, demolitionPlacement: placementBonus } = specializationData.toCardPayload();

  if (!key && !level && !throwBonus && !placementBonus) return [];

  const rows = [];
  const descriptorName = String(description || (key ? formatSpecializationName(key) : '')).trim();
  const descriptorValue = description
    ? descriptorName
    : (level > 0
      ? `${descriptorName || game.i18n.localize('SYNTHICIDE.Roll.Card.SpecShort')} (Lvl ${level})`
      : descriptorName);

  if (descriptorValue) {
    rows.push({
      label: game.i18n.localize('SYNTHICIDE.Roll.Card.WeaponSpecialization'),
      value: descriptorValue,
    });
  }

  const bonusParts = [];
  if (throwBonus !== 0) {
    bonusParts.push(`${game.i18n.localize('SYNTHICIDE.Roll.Card.DemolitionThrowBonus')} ${formatSignedNumber(throwBonus)}`);
  }
  if (placementBonus !== 0) {
    bonusParts.push(`${game.i18n.localize('SYNTHICIDE.Roll.Card.DemolitionPlacementBonus')} ${formatSignedNumber(placementBonus)}`);
  }

  if (bonusParts.length) {
    rows.push({
      label: game.i18n.localize('SYNTHICIDE.Roll.Card.WeaponSpecializationBonuses'),
      value: bonusParts.join(' · '),
    });
  }

  return rows;
}

function formatSpecializationName(key) {
  const normalized = String(key ?? '').trim();
  if (!normalized) return '';
  const localizedKey = SYNTHICIDE.WEAPON_SPECIALIZATIONS?.[normalized];
  if (localizedKey) {
    return game.i18n.localize(localizedKey).replace(/\s+Proficiency$/i, '');
  }
  return normalized;
}
