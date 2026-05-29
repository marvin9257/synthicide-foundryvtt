import SYNTHICIDE from '../helpers/config.mjs';

/**
 * Developer note:
 * - `SpecializationData` is the canonical in-memory representation of a
 *   weapon specialization. Keep normalization, merging, and computed logic
 *   (getDemolitionBonus, merge, fromInput/fromObject) here.
 * - Persist only the serialized card-ready payload (`toCardPayload()`) into
 *   actor/item/chat system data. Callers should invoke `toCardPayload()` at
 *   the boundary when writing into models or ChatMessage.system.
 * - Use `SpecializationData.fromInput()` for flexible callers that may receive
 *   a `SpecializationData` instance, a wrapper object with a `specialization`
 *   property, or a raw payload. Use `SpecializationData.fromObject()` when
 *   reading canonical stored payloads.
 * - `RollContext` owns the application of specialization bonuses to per-roll
 *   `rollData`. Do not duplicate roll mutation logic elsewhere.
 */

/**
 * A normalized weapon specialization payload.
 *
 * This class owns the specialization value object, raw config lookup,
 * primitive specialization adjustment, demolition bonus access, and
 * card payload serialization.
 */
export class SpecializationData {
  /**
   * @param {object} [options={}] - Specialization constructor values.
   * @param {string} [options.key=''] - Proficiency key or weapon specialization key.
   * @param {number} [options.level=0] - Proficiency level.
   * @param {number} [options.attackBonus=0] - Attack bonus from specialization.
   * @param {number} [options.damageBonus=0] - Damage bonus from specialization.
   * @param {number} [options.lethalBonus=0] - Lethal bonus from specialization.
   * @param {number} [options.shockRdBonus=0] - Shock RD bonus from specialization.
   * @param {number} [options.demolitionThrow=0] - Throw bonus for demolition rolls.
   * @param {number} [options.demolitionPlacement=0] - Placement bonus for demolition rolls.
   * @param {string} [options.description=''] - Optional combined specialization description.
   */
  constructor({
    key = '',
    level = 0,
    attackBonus = 0,
    damageBonus = 0,
    lethalBonus = 0,
    shockRdBonus = 0,
    demolitionThrow = 0,
    demolitionPlacement = 0,
    description = '',
  } = {}) {
    this.key = String(key ?? '').trim();
    this.level = Number(level ?? 0);
    this.attackBonus = Number(attackBonus ?? 0);
    this.damageBonus = Number(damageBonus ?? 0);
    this.lethalBonus = Number(lethalBonus ?? 0);
    this.shockRdBonus = Number(shockRdBonus ?? 0);
    this.demolitionThrow = Number(demolitionThrow ?? 0);
    this.demolitionPlacement = Number(demolitionPlacement ?? 0);
    this.description = String(description ?? '').trim();
  }

  /**
   * Convert a proficiency level into a normalized bonus tier.
   *
   * @param {number|string} level - The raw proficiency level.
   * @returns {number} Tier value used for lookup in bonus tables.
   */
  static getProficiencyTier(level) {
    const value = Number(level);
    if (!Number.isFinite(value) || value < 1) return 0;
    if (value >= 7) return 7;
    if (value >= 4) return 4;
    return 1;
  }

  /**
   * Build specialization data from an existing payload-like object.
   *
   * This method expects the caller to pass the normalized specialization
   * payload directly. It does not inspect a wrapper object for an outer
   * `specialization` property.
   *
   * @param {object} [payload={}] - Raw specialization payload
   * @param {string} [payload.key='']
   * @param {number} [payload.level=0]
   * @param {number} [payload.attackBonus=0]
   * @param {number} [payload.damageBonus=0]
   * @param {number} [payload.lethalBonus=0]
   * @param {number} [payload.shockRdBonus=0]
   * @param {number} [payload.demolitionThrow=0]
   * @param {number} [payload.demolitionPlacement=0]
   * @param {string} [payload.description='']
   * @returns {SpecializationData}
   */
  static fromObject({
    key = '',
    level = 0,
    attackBonus = 0,
    damageBonus = 0,
    lethalBonus = 0,
    shockRdBonus = 0,
    demolitionThrow = 0,
    demolitionPlacement = 0,
    description = '',
  } = {}) {
    return new SpecializationData({
      key,
      level,
      attackBonus,
      damageBonus,
      lethalBonus,
      shockRdBonus,
      demolitionThrow,
      demolitionPlacement,
      description,
    });
  }

  /**
   * Normalize an input object into a SpecializationData instance.
   *
   * This helper is the caller-friendly entry point for flows that may
   * receive either:
   *   1) a SpecializationData instance,
   *   2) an object whose `specialization` property contains the payload,
   *   3) a raw specialization payload object.
   *
   * It ensures the returned value is always a SpecializationData instance.
   *
   * @param {object|SpecializationData} [input={}] - Raw input or wrapper
   * @returns {SpecializationData}
   */
  static fromInput(input = {}) {
    if (input instanceof SpecializationData) return input;

    const specialization = input?.specialization ?? input;
    if (specialization instanceof SpecializationData) return specialization;
    if (specialization && typeof specialization === 'object') {
      return SpecializationData.fromObject(specialization);
    }

    return new SpecializationData();
  }

  /**
   * Merge multiple SpecializationData instances into a single aggregate.
   *
   * Only valid SpecializationData objects are included.
   * The returned instance preserves cumulative bonuses and a merged description.
   *
   * @param {SpecializationData[]} [specializations=[]]
   * @param {string} [description='']
   * @returns {SpecializationData}
   */
  static merge(specializations = [], description = '') {
    const validSpecializations = Array.isArray(specializations)
      ? specializations.filter((spec) => spec instanceof SpecializationData)
      : [];

    if (!validSpecializations.length) {
      return new SpecializationData();
    }

    const merged = new SpecializationData({
      key: validSpecializations[0].key,
      level: validSpecializations[0].level,
      description: String(description ?? '').trim(),
    });

    for (const spec of validSpecializations) {
      merged.attackBonus += spec.attackBonus;
      merged.damageBonus += spec.damageBonus;
      merged.lethalBonus += spec.lethalBonus;
      merged.shockRdBonus += spec.shockRdBonus;
      merged.demolitionThrow += spec.demolitionThrow;
      merged.demolitionPlacement += spec.demolitionPlacement;
    }

    return merged;
  }

  /**
   * Create specialization data from a list of proficiency entries.
   *
   * This is used to build combined specialization contexts for weapons
   * that require multiple proficiency sources (for example primary weapon type
   * plus primitive proficiency).
   *
   * @param {object} params
   * @param {object[]} [params.entries=[]]
   * @param {string} [params.weaponClass='']
   * @param {string} [params.description='']
   * @returns {SpecializationData}
   */
  static fromProficiencyList({ entries = [], weaponClass = '', description = '' } = {}) {
    const normalizedEntries = new Map();
    if (Array.isArray(entries)) {
      for (const entry of entries) {
        if (!entry || !entry.proficiencyKey) continue;
        const level = Number(entry.level ?? 0);
        if (!Number.isFinite(level) || level <= 0) continue;

        const key = String(entry.proficiencyKey).trim();
        const existingLevel = Number(normalizedEntries.get(key) ?? 0);
        normalizedEntries.set(key, Math.max(existingLevel, level));
      }
    }

    const specializations = [...normalizedEntries.entries()]
      .map(([proficiencyKey, level]) => SpecializationData.fromProficiencyKey({
        proficiencyKey,
        level,
        weaponClass,
      }));

    return SpecializationData.merge(specializations, description);
  }

  /**
   * Build specialization data from a proficiency key and level.
   *
   * @param {object} params
   * @param {string} [params.proficiencyKey='']
   * @param {number} [params.level=0]
   * @param {string} [params.weaponClass='']
   * @returns {SpecializationData}
   */
  static fromProficiencyKey({ proficiencyKey = '', level = 0, weaponClass = '' } = {}) {
    const tier = SpecializationData.getProficiencyTier(level);
    const raw = SYNTHICIDE.WEAPON_PROFICIENCY_MVP_BONUSES?.[proficiencyKey]?.[tier] ?? {};

    const specialization = new SpecializationData({
      key: proficiencyKey,
      level,
      attackBonus: Number(raw.attackBonus ?? 0),
      damageBonus: Number(raw.damageBonus ?? 0),
      lethalBonus: Number(raw.lethalBonus ?? 0),
      shockRdBonus: Number(raw.shockRdBonus ?? 0),
      demolitionThrow: Number(raw.demolitionThrow ?? 0),
      demolitionPlacement: Number(raw.demolitionPlacement ?? 0),
    });

    if (proficiencyKey === 'primitive') {
      if (weaponClass === 'ranged') {
        specialization.attackBonus += Number(raw.primitiveRangedAttack ?? 0);
      } else if (weaponClass === 'melee') {
        specialization.attackBonus += Number(raw.primitiveMeleeAttack ?? 0);
        specialization.damageBonus += Number(raw.primitiveMeleeDamage ?? 0);
      }
    }

    return specialization;
  }

  /**
   * Returns the demolition-specific bonus for the current specialization.
   *
   * @param {string} attributeKey - Either 'operation' or default throw attribute.
   * @returns {number}
   */
  getDemolitionBonus(attributeKey) {
    return attributeKey === 'operation'
      ? this.demolitionPlacement
      : this.demolitionThrow;
  }

  /**
   * Serialize the specialization to the card-facing payload shape.
   *
   * @returns {object} Plain specialization payload for system/card data.
   */
  toCardPayload() {
    return {
      key: this.key,
      level: this.level,
      attackBonus: this.attackBonus,
      damageBonus: this.damageBonus,
      lethalBonus: this.lethalBonus,
      shockRdBonus: this.shockRdBonus,
      demolitionThrow: this.demolitionThrow,
      demolitionPlacement: this.demolitionPlacement,
      description: this.description,
    };
  }
}
