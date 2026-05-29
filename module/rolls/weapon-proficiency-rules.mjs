import SYNTHICIDE from '../helpers/config.mjs';
import { formatSignedNumber } from './roll-utils.mjs';

/**
 * Resolve the proficiency key for a weapon type.
 */
export function resolveWeaponProficiencyKey(weaponType) {
  return SYNTHICIDE.WEAPON_TYPE_PROFICIENCY_KEY?.[weaponType]
    ?? SYNTHICIDE.WEAPON_TYPE_RULE_FAMILY?.[weaponType]
    ?? weaponType;
}

/**
 * Convert raw trait level to proficiency tier milestones.
 */
export function getProficiencyTier(level) {
  const value = Number(level);
  if (!Number.isFinite(value) || value < 1) return 0;
  if (value >= 7) return 7;
  if (value >= 4) return 4;
  return 1;
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
export function resolveWeaponSpecializationContext({ actor, sourceItem, subtype, attributeKey } = {}) {
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

  const proficiencyKey = resolveWeaponProficiencyKey(weaponType);
  if (!proficiencyKey) return empty;

  const level = getActorWeaponProficiencyLevel(actor, proficiencyKey);
  if (level <= 0) return empty;

  const tier = getProficiencyTier(level);
  const table = SYNTHICIDE.WEAPON_PROFICIENCY_MVP_BONUSES?.[proficiencyKey] ?? {};
  const raw = table?.[tier] ?? {};

  const result = {
    ...empty,
    key: proficiencyKey,
    level,
    attackBonus: Number(raw.attackBonus ?? 0),
    damageBonus: Number(raw.damageBonus ?? 0),
    lethalBonus: Number(raw.lethalBonus ?? 0),
    shockRdBonus: Number(raw.shockRdBonus ?? 0),
    demolitionThrow: Number(raw.demolitionThrow ?? 0),
    demolitionPlacement: Number(raw.demolitionPlacement ?? 0),
  };

  const weaponClass = String(sourceItem?.system?.weaponClass ?? '');
  const isPrimitive = hasWeaponFeature(sourceItem, 'primitive');
  if (proficiencyKey === 'primitive' && isPrimitive) {
    if (weaponClass === 'ranged') {
      const bonus = Number(raw.primitiveRangedAttack ?? 0);
      result.attackBonus += bonus;
    } else if (weaponClass === 'melee') {
      const attackBonus = Number(raw.primitiveMeleeAttack ?? 0);
      const damageBonus = Number(raw.primitiveMeleeDamage ?? 0);
      result.attackBonus += attackBonus;
      result.damageBonus += damageBonus;
    }
  }

  if (subtype === 'demolition') {
    if (attributeKey === 'operation') {
      result.demolitionPlacement = Number(result.demolitionPlacement ?? 0);
    }
    return result;
  }

  return result;
}

/**
 * Get demolition-specific specialization bonus for modifiers.
 * Returns the numeric demolition bonus that callers may apply.
 */
export function getDemolitionSpecializationBonus({ specializationContext, subtype, attributeKey } = {}) {
  // This function returns the numeric specialization bonus for demolition
  // flows. It does not mutate any provided roll data.
  if (!specializationContext) return 0;
  if (subtype !== 'demolition') return 0;

  const bonus = attributeKey === 'operation'
    ? Number(specializationContext.demolitionPlacement ?? 0)
    : Number(specializationContext.demolitionThrow ?? 0);

  return Number(bonus || 0);
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
export function normalizeSpecialization(input = {}) {
  const specialization = input?.specialization;
  if (specialization && typeof specialization === 'object') {
    return {
      key: String(specialization.key ?? '').trim(),
      level: Number(specialization.level ?? 0),
      attackBonus: Number(specialization.attackBonus ?? 0),
      damageBonus: Number(specialization.damageBonus ?? 0),
      lethalBonus: Number(specialization.lethalBonus ?? 0),
      shockRdBonus: Number(specialization.shockRdBonus ?? 0),
    };
  }
  return {
    key: '',
    level: 0,
    attackBonus: 0,
    damageBonus: 0,
    lethalBonus: 0,
    shockRdBonus: 0,
  };
}

export function buildWeaponSpecializationMetadataRows({ input = {}, includeAttackBonus = false, includeDamageBonus = false, includeLethalBonus = false, includeShockRdBonus = false } = {}) {
  const { key, level, attackBonus, damageBonus, lethalBonus, shockRdBonus } = normalizeSpecialization(input);

  if (!key && !level && !attackBonus && !damageBonus && !lethalBonus && !shockRdBonus) return [];

  const rows = [];

  const descriptorName = key ? formatSpecializationName(key) : '';
  const descriptorValue = level > 0
    ? `${descriptorName || game.i18n.localize('SYNTHICIDE.Roll.Card.SpecShort')} (Lvl ${level})`
    : descriptorName;
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
 * Backward-compatible single-row accessor.
 */
export function buildWeaponSpecializationMetadataRow(options = {}) {
  return buildWeaponSpecializationMetadataRows(options)[0] ?? null;
}

/**
 * Build metadata rows for demolition specialization traceability.
 */
export function buildDemolitionSpecializationMetadataRows({ input = {} } = {}) {
  const spec = input?.specialization ?? {};
  const key = String(spec.key ?? '').trim();
  const level = Number(spec.level ?? 0);
  const throwBonus = Number(spec.demolitionThrow ?? 0);
  const placementBonus = Number(spec.demolitionPlacement ?? 0);

  if (!key && !level && !throwBonus && !placementBonus) return [];

  const rows = [];
  const descriptorName = key ? formatSpecializationName(key) : '';
  const descriptorValue = level > 0
    ? `${descriptorName || game.i18n.localize('SYNTHICIDE.Roll.Card.SpecShort')} (Lvl ${level})`
    : descriptorName;

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
