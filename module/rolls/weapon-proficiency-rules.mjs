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
    attack: 0,
    damage: 0,
    lethal: 0,
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
    attack: Number(raw.attack ?? 0),
    damage: Number(raw.damage ?? 0),
    lethal: Number(raw.lethal ?? 0),
    shockRdBonus: Number(raw.shockRdBonus ?? 0),
    demolitionThrow: Number(raw.demolitionThrow ?? 0),
    demolitionPlacement: Number(raw.demolitionPlacement ?? 0),
  };

  const weaponClass = String(sourceItem?.system?.weaponClass ?? '');
  const isPrimitive = hasWeaponFeature(sourceItem, 'primitive');
  if (proficiencyKey === 'primitive' && isPrimitive) {
    if (weaponClass === 'ranged') {
      result.attack += Number(raw.primitiveRangedAttack ?? 0);
    } else if (weaponClass === 'melee') {
      result.attack += Number(raw.primitiveMeleeAttack ?? 0);
      result.damage += Number(raw.primitiveMeleeDamage ?? 0);
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
 * Apply specialization bonuses to roll data where relevant.
 * Returns the bonus that was applied to modifiers for traceability.
 */
export function applySpecializationToRollData({ rollData, specializationContext, subtype, attributeKey } = {}) {
  if (!rollData || !specializationContext) return 0;

  if (subtype !== 'demolition') return 0;

  const bonus = attributeKey === 'operation'
    ? Number(specializationContext.demolitionPlacement ?? 0)
    : Number(specializationContext.demolitionThrow ?? 0);

  if (bonus !== 0) {
    rollData.modifiers += bonus;
    rollData.actorModifierTotal += bonus;
  }

  return bonus;
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
  const key = String(input?.specializationKey ?? '').trim();
  const level = Number(input?.specializationLevel ?? 0);
  const attackBonus = Number(input?.specializationAttackBonus ?? 0);
  const damageBonus = Number(input?.specializationDamageBonus ?? 0);
  const lethalBonus = Number(input?.specializationLethalBonus ?? 0);
  const shockRdBonus = Number(input?.specializationShockRdBonus ?? 0);

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
  if (includeAttackBonus) bonusParts.push(`ATT ${formatSignedNumber(attackBonus)}`);
  if (includeDamageBonus) bonusParts.push(`DMG ${formatSignedNumber(damageBonus)}`);
  if (bonusParts.length) {
    rows.push({
      label: game.i18n.localize('SYNTHICIDE.Roll.Card.WeaponSpecializationBonuses'),
      value: bonusParts.join(' · '),
    });
  }

  const effectParts = [];
  if (includeLethalBonus) effectParts.push(`Lethal ${formatSignedNumber(lethalBonus)}`);
  if (includeShockRdBonus) effectParts.push(`Shock RD ${formatSignedNumber(shockRdBonus)}`);
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
  const key = String(input?.specializationKey ?? '').trim();
  const level = Number(input?.specializationLevel ?? 0);
  const throwBonus = Number(input?.specializationDemolitionThrowBonus ?? 0);
  const placementBonus = Number(input?.specializationDemolitionPlacementBonus ?? 0);

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
