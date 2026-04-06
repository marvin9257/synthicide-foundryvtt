import SynthicideActorBaseData from './base-actor.mjs';
import SYNTHICIDE from '../helpers/config.mjs';

const fields = foundry.data.fields;
const requiredInteger = { required: true, nullable: false, integer: true };
const requiredBlankString = { required: true, blank: true, initial: '' };

export default class SynthicideNPCData extends SynthicideActorBaseData {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    'SYNTHICIDE.Actor.NPC',
  ];

  static defineSchema() {
    const schema = super.defineSchema();

    schema.attributes = new fields.SchemaField(
      Object.keys(SYNTHICIDE.attributes).reduce((obj, attribute) => {
        obj[attribute] = new fields.SchemaField({
          value: new fields.NumberField({ ...requiredInteger, initial: 0 }),
        });
        return obj;
      }, {})
    );

    schema.npcRole = new fields.StringField({
      required: true,
      choices: Object.keys(SYNTHICIDE.npc.roles),
      initial: 'guardian',
    });
    schema.masteredWeapon = new fields.StringField({
      required: true,
      choices: Object.keys(SYNTHICIDE.npc.masteredWeapons),
      initial: 'fist',
    });
    schema.attackWeapon = new fields.StringField({
      required: true,
      choices: Object.keys(SYNTHICIDE.npc.masteredWeapons),
      initial: 'fist',
    });
    schema.npcWealthTier = new fields.StringField({
      required: true,
      choices: Object.keys(SYNTHICIDE.npc.wealthTiers),
      initial: 'destitute',
    });
    schema.boss = new fields.BooleanField({ initial: false });

    schema.hitPointBonus = new fields.NumberField({ ...requiredInteger, initial: 0 });
    schema.armorValues = new fields.SchemaField({
      forceBarrier: new fields.SchemaField({
        value: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
        max: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
        recoveryRate: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      }),
    });
    schema.uniquePower = new fields.StringField({ ...requiredBlankString });
    schema.bossPower = new fields.StringField({ ...requiredBlankString });
    schema.notes = new fields.StringField({ ...requiredBlankString });
    schema.loot = new fields.StringField({ ...requiredBlankString });

    schema.masteredAttack = new fields.SchemaField({
      attackBonus: new fields.SchemaField({
        base: new fields.NumberField({ ...requiredInteger, initial: 0 }, { persisted: false }),
        weapon: new fields.NumberField({ ...requiredInteger, initial: 0 }, { persisted: false }),
        total: new fields.NumberField({ ...requiredInteger, initial: 0 }, { persisted: false }),
      }),
      damageBonus: new fields.SchemaField({
        base: new fields.NumberField({ ...requiredInteger, initial: 0 }, { persisted: false }),
        weapon: new fields.NumberField({ ...requiredInteger, initial: 0 }, { persisted: false }),
        total: new fields.NumberField({ ...requiredInteger, initial: 0 }, { persisted: false }),
      }),
      ability: new fields.StringField({ ...requiredBlankString }, { persisted: false }),
      range: new fields.StringField({ ...requiredBlankString }, { persisted: false }),
      notes: new fields.StringField({ ...requiredBlankString }, { persisted: false }),
      label: new fields.StringField({ ...requiredBlankString }, { persisted: false }),
      tierLabel: new fields.StringField({ ...requiredBlankString }, { persisted: false }),
    });

    return schema;
  }

  prepareDerivedData() {
    super.prepareDerivedData();

    const level = Math.max(1, Number(this.level?.value ?? 1));
    const bioclassItem = this.parent?.items?.find(i => i.type === 'bioclass') ?? null;
    const bioclassProfile = bioclassItem
      ? {
          hitPointsBase: Number(bioclassItem.system.startingAttributes?.hp ?? 28),
          hitPointsPerLevel: Number(bioclassItem.system.startingAttributes?.hpPerLevel ?? 4),
        }
      : { hitPointsBase: 28, hitPointsPerLevel: 4 };
    const roleProfile = SYNTHICIDE.npc.roles[this.npcRole] ?? SYNTHICIDE.npc.roles.guardian;
    const attackWeaponKey = this.attackWeapon ?? this.masteredWeapon;
    const weaponProfile = getWeaponTier(attackWeaponKey, level);
    const isMasteredAttack = attackWeaponKey === this.masteredWeapon;

    this.hitPoints.base = bioclassProfile.hitPointsBase;
    this.hitPoints.perLevel = bioclassProfile.hitPointsPerLevel;

    for (const key of Object.keys(SYNTHICIDE.attributes)) {
      if (!this.attributes?.[key]) continue;
      this.attributes[key].value = this.getEffectiveAttributeValue(key, {
        level,
        roleProfile,
        bioclassItem,
      });
    }

    const toughnessValue = Number(this.attributes?.toughness?.value ?? 0);
    const nerveValue = Number(this.attributes?.nerve?.value ?? 0);
    const speedValue = Number(this.attributes?.speed?.value ?? 0);
    const awarenessValue = Number(this.attributes?.awareness?.value ?? 0);

    const halfLevel = Math.floor(level / 2);
    const thirdLevel = Math.floor(level / 3);
    const baseAttackDamage = this.npcRole === 'killer' ? halfLevel : thirdLevel;
    const bonusHitPoints = Number(this.hitPointBonus ?? 0);
    const baseHitPoints = this.hitPoints.base + (this.hitPoints.perLevel * Math.max(0, level - 1)) + bonusHitPoints;

    this.hitPoints.max = this.boss ? baseHitPoints * 2 : baseHitPoints;
    this.actionPoints.value = Math.floor(speedValue / 2) + 3;
    this.battleReflex.value = awarenessValue + speedValue;
    this.toughnessDefense.value = 5 + thirdLevel + toughnessValue;
    this.armorDefense.value = 7 + halfLevel + toughnessValue + getKillerArmorBonus(level, this.npcRole);
    this.shockThreshold.value = 10 + this.armorDefense.value + halfLevel;
    this.nerveDefense.value = 5 + thirdLevel + nerveValue;

    if (isMasteredAttack) {
      this.masteredAttack.attackBonus.base = baseAttackDamage;
      this.masteredAttack.damageBonus.base = baseAttackDamage;
      this.masteredAttack.attackBonus.weapon = weaponProfile.attack;
      this.masteredAttack.damageBonus.weapon = weaponProfile.damage;
      // total = base + weapon; @attribute (combat) is added by the roll formula
      this.masteredAttack.attackBonus.total = baseAttackDamage + weaponProfile.attack;
      this.masteredAttack.damageBonus.total = baseAttackDamage + weaponProfile.damage;
    } else {
      this.masteredAttack.attackBonus.base = 0;
      this.masteredAttack.damageBonus.base = 0;
      this.masteredAttack.attackBonus.weapon = weaponProfile.attack;
      this.masteredAttack.damageBonus.weapon = weaponProfile.damage;
      // total = weapon only; @attribute (combat) is added by the roll formula
      this.masteredAttack.attackBonus.total = weaponProfile.attack;
      this.masteredAttack.damageBonus.total = weaponProfile.damage;
    }
    this.masteredAttack.ability = weaponProfile.ability;
    this.masteredAttack.range = weaponProfile.range;
    this.masteredAttack.notes = weaponProfile.notes;
    this.masteredAttack.label = weaponProfile.label;
    this.masteredAttack.tierLabel = weaponProfile.tierLabel;
  }

  getEffectiveAttributeValue(attributeKey, { level = null, roleProfile = null, bioclassItem = null } = {}) {
    const resolvedLevel = Math.max(1, Number(level ?? this.level?.value ?? 1));
    const resolvedRole = roleProfile
      ?? SYNTHICIDE.npc.roles[this.npcRole]
      ?? SYNTHICIDE.npc.roles.guardian;
    const startingAttributes = bioclassItem?.system?.startingAttributes ?? {};
    const baseValue = Number(startingAttributes[attributeKey] ?? 0);
    const ignoreWeakPenalty = shouldIgnoreWeakRolePenalty(bioclassItem);

    const roleBonus = getRoleAttributeBonus(attributeKey, resolvedLevel, resolvedRole, {
      ignoreWeakPenalty,
    });
    const bossBonus = this.boss && ['combat', 'toughness', 'nerve'].includes(attributeKey) ? 1 : 0;
    return baseValue + roleBonus + bossBonus;
  }

  getRollData() {
    const data = foundry.utils.mergeObject(
      super.getRollData ? super.getRollData() : {},
      this,
      { inplace: false, recursive: true }
    );

    if (this.attributes) {
      for (const [key, attribute] of Object.entries(this.attributes)) {
        data[key] = foundry.utils.duplicate(attribute);
        data[key].value = Number(attribute.value ?? 0);
      }
    }

    data.lvl = this.level.value;
    data.masteredAttack = foundry.utils.duplicate(this.masteredAttack);
    return data;
  }
}

function getRoleAttributeBonus(attributeKey, level, roleProfile, { ignoreWeakPenalty = false } = {}) {
  if (!roleProfile) return 0;

  const strongBonus = 1 + Math.floor(level / 2);
  const goodBonus = Math.floor(level / 3);
  const isStrong = roleProfile.strong === attributeKey;
  const isGood = Array.isArray(roleProfile.good) && roleProfile.good.includes(attributeKey);
  const isWeak = roleProfile.weak === attributeKey;

  if (isStrong) return strongBonus;
  if (isGood) return goodBonus;
  if (isWeak && ignoreWeakPenalty) return 0;
  if (isWeak) return -2;
  return 0;
}

function shouldIgnoreWeakRolePenalty(bioclassItem) {
  // Primary source: explicit bioclass flag (robust to free-form names).
  if (bioclassItem?.system?.ignoreRoleWeakPenalty === true) return true;

  // Legacy fallback for existing worlds before the flag is set.
  const name = String(bioclassItem?.name ?? '').trim().toLowerCase();
  return /(^|\W)priest(\W|$)/.test(name);
}

function getWeaponTier(weaponKey, level) {
  const weapon = SYNTHICIDE.npc.masteredWeapons[weaponKey] ?? SYNTHICIDE.npc.masteredWeapons.fist;
  const tiers = Array.isArray(weapon.tiers) ? weapon.tiers : [];
  let tierIndex = tiers.findIndex((entry) => {
    const minLevel = Number(entry?.minLevel ?? 1);
    const maxLevel = Number(entry?.maxLevel ?? minLevel);
    return level >= minLevel && level <= maxLevel;
  });
  if (tierIndex < 0) tierIndex = Math.max(0, tiers.length - 1);

  const tier = tiers[tierIndex] ?? null;
  const minLevel = Number(tier?.minLevel ?? 1);
  const maxLevel = Number(tier?.maxLevel ?? minLevel);
  const rawAbility = String(tier?.ability ?? '').trim();
  return {
    label: game.i18n.localize(weapon.label),
    attack: Number(tier?.attack ?? 0),
    damage: Number(tier?.damage ?? 0),
    ability: rawAbility || '-',
    range: tier?.range ?? 'Engaged',
    notes: tier?.notes ?? '',
    tierLabel: `${minLevel}-${maxLevel}`,
  };
}

function getKillerArmorBonus(level, roleKey) {
  if (roleKey !== 'killer') return 0;
  if (level >= 10) return 5;
  if (level >= 7) return 3;
  return 1;
}
