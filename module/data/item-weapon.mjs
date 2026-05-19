import SYNTHICIDE from '../helpers/config.mjs';
import SynthicideGear from './item-gear.mjs';

const fields = foundry.data.fields;
const requiredInteger = { required: true, nullable: false, integer: true };
const EXPERT_CRAFTING_DAMAGE_BONUSES = {
  expertCrafting1: 1,
  expertCrafting2: 2,
  expertCrafting3: 3,
};
const BATTLE_ASSIST_VALUES = {
  battleAssist1: 1,
  battleAssist2: 2,
  battleAssist3: 3,
};
/**
 * Weapon item system model.
 *
 * DataModel context: instance methods execute on the armor system model
 * (`item.system`), not on the Item document.
 *
 * @extends {SynthicideGear}
 */
export default class SynthicideWeapon extends SynthicideGear {
  static LOCALIZATION_PREFIXES = [
    'SYNTHICIDE.Item.base',
    'SYNTHICIDE.Item.Gear',
    'SYNTHICIDE.Item.Weapon'
  ];

  static defineSchema() {
    
    const schema = super.defineSchema();
    //Core weapon data
    schema.weaponClass = new fields.StringField({
      required: true,
      choices: SYNTHICIDE.WEAPON_CLASSES,
      initial: Object.keys(SYNTHICIDE.WEAPON_CLASSES)[0]
    });
    schema.weaponType = new fields.StringField({
      required: true,
      choices: SYNTHICIDE.WEAPON_TYPES[schema.weaponClass],
      initial: Object.keys(SYNTHICIDE.WEAPON_TYPES[schema.weaponClass.initial])[0]
    });
    schema.rangeIncrement = new fields.NumberField({ ...requiredInteger, initial: 0 });
    schema.features = new fields.SetField(new fields.StringField({ required: true, blank: false }));
    schema.modifications = new fields.SetField(new fields.StringField({ required: true, blank: false }));
    schema.specialAmmo = new fields.StringField({ required: true, blank: false, initial: "none" });
    schema.bonuses = makeWeaponBonusSchema(false);

    // For Sharper weapons only - base weapon data
    schema.attackBonus = new fields.NumberField({ ...requiredInteger, initial: 0 });
    schema.damageBonus = new fields.NumberField({ ...requiredInteger, initial: 0 });
    schema.lethal = new fields.NumberField({ ...requiredInteger, initial: 0 });

    // For NPC weapons only: allow dynamic keys for all tiers
    schema.tierBonuses = new fields.SchemaField({
        1: makeWeaponBonusSchema(),
        2: makeWeaponBonusSchema(),
        3: makeWeaponBonusSchema()
    });
    schema.weaponTier = new fields.NumberField({ ...requiredInteger, initial: 1 }, {persisted: false});
    
    // Mastery (applies only to NPCs)
    schema.masteredWeapon = new fields.BooleanField({ required: true, initial: false });
    // Special-case logic (e.g., psycherProjection)
    schema.specialType = new fields.StringField({ required: false, blank: true, initial: "" });
    
    return schema;
  }

  /**
   * Compose the derived roll formula from structured roll fields.
   * @this {SynthicideWeapon}
   * @returns {void}
   */
  prepareDerivedData() {
    super.prepareDerivedData();

    // Get owning actor (parent is the Item document, actor is parent.actor)
    const itemDoc = this.parent;
    const actor = itemDoc?.actor;
    const expertCraftingDamageBonus = getExpertCraftingDamageBonus(this.modifications);
    const enhancedAlloyAttackBonus = hasEnhancedAlloyAttackBonus(this.modifications) ? 1 : 0;
    const battleAssistValue = getBattleAssistValue(this.modifications);
    const doubleShotBonus = getDoubleShotBonus(this.modifications);
    this.bonuses.battleAssistValue = battleAssistValue;
    this.bonuses.doubleShotBonus = doubleShotBonus;
    if (!actor) return;

    // direct passthrough if not NPC
    if (actor.type !== 'npc') {
      this.bonuses.attack = this.attackBonus + enhancedAlloyAttackBonus;
      this.bonuses.damage = this.damageBonus + expertCraftingDamageBonus; ///NEED TO ADD BONUS IF WEAPON AMMO MODIFIES DAMAGE
      this.bonuses.lethal = this.lethal; ///NEED TO ADD BONUS IF WEAPON AMMO MODIFIES LETHAL
      return;
    }

    // Special-case: psycherProjection
    if (this.specialType === 'psycherProjection') {
      // For psycherProjection, attack/damage = actor level
      const level = Number(actor.system?.level?.value ?? 1);
      this.bonuses.attack = level;
      this.bonuses.damage = level;
      this.bonuses.lethal = 0;
      // You may want to set other special-case fields here
      return;
    }

    // Always compute weaponTier from actor's level to avoid stale/zero values
    let level = Number(actor.system?.level?.value ?? 1);
    let tier = 1;
    if (level >= 9) {
      tier = 3;
    } else if (level >= 5) {
      tier = 2;
    }
    this.weaponTier = tier; // Expose for template/UI use
    // Get bonuses for this tier
    const tierBonuses = this.tierBonuses?.[tier] ?? { attack: 0, damage: 0, lethal: 0 };

    // Mastery logic: add baseAttackDamage if this weapon is the mastered weapon, else 0
    const halfLevel = Math.floor(level / 2);
    const thirdLevel = Math.floor(level / 3);
    const masteredWeaponBonus = this.masteredWeapon
      ? (actor.system?.npcRole === 'killer' ? halfLevel : thirdLevel)
      : 0;
    this.bonuses.attack = tierBonuses.attack + masteredWeaponBonus + enhancedAlloyAttackBonus;
    this.bonuses.damage = tierBonuses.damage + masteredWeaponBonus + expertCraftingDamageBonus;
    this.bonuses.lethal = tierBonuses.lethal;
  }

  /**
   * Foundry hook: Called when the item is deleted.
   * If this weapon was the owning NPC's selectedWeaponId, persist a new
   * selection (the only remaining weapon) or clear it.
   * @this {SynthicideWeapon}
   * @param {object} options
   * @param {string} userId
   * @returns {Promise<void>}
   */
  async _onDelete(options, userId) {
    await super._onDelete(options, userId);
    if (game.userId !== userId) return;
    await this._checkZeroOrOneNpcWeapon();
  }
  /**
   * Foundry hook: Called when the item is created.
   * If this weapon is added to an NPC and the actor has no selectedWeaponId,
   * persist this weapon as the selected one so the UI and data model stay
   * consistent after drops.
   * @this {SynthicideWeapon}
   * @param {object} data
   * @param {object} options
   * @param {string} userId
   * @returns {Promise<void>}
   */
  async _onCreate(data, options, userId) {
    await super._onCreate(data, options, userId);
    if (game.userId !== userId) return;
    await this._checkZeroOrOneNpcWeapon();
  }

  /**
   * If an NPC actor now has exactly zero or one weapon, ensure the persisted
   * `selectedWeaponId` equals that weapon's id or blank. No-op otherwise.
   */
  async _checkZeroOrOneNpcWeapon() {
    const itemDoc = this.parent;
    const actor = itemDoc?.actor;
    if (!actor || actor.type !== 'npc') return;
    const weapons = actor.itemTypes.weapon ?? [];
    if (weapons.length === 1) {
      const onlyId = weapons[0]?.id ?? '';
      const selected = actor.system?.selectedWeaponId ?? '';
      if (onlyId && selected !== onlyId) {
        await actor.update({ 'system.selectedWeaponId': onlyId });
      }
      return;
    }

    // If there are no weapons left, clear any persisted selection.
    if (weapons.length === 0 && actor.system?.selectedWeaponId !== '') {
      await actor.update({ 'system.selectedWeaponId': '' });
    }
  }
}


/**
 * Helper for creating a Foundry VTT SchemaField for weapon bonuses (attack, damage, lethal).
 *
 * @param {boolean} [persisted=true] - Whether the schema fields should be persisted to the database.
 * @returns {foundry.data.fields.SchemaField} SchemaField with attack, damage, and lethal NumberFields.
 */
function makeWeaponBonusSchema(persisted = true) {
  return new fields.SchemaField({
    attack: new fields.NumberField({ initial: 0 }, {persisted}),
    damage: new fields.NumberField({ initial: 0 }, {persisted}),
    lethal: new fields.NumberField({ initial: 0 }, {persisted}),
    battleAssistValue: new fields.NumberField({ initial: 0 }, {persisted}),
    doubleShotBonus: new fields.NumberField({ initial: 0 }, {persisted})
  });
}

function getExpertCraftingDamageBonus(modifications) {
  const mods = modifications instanceof Set
    ? modifications
    : new Set(Array.isArray(modifications) ? modifications : []);

  if (mods.has('expertCrafting3')) return EXPERT_CRAFTING_DAMAGE_BONUSES.expertCrafting3;
  if (mods.has('expertCrafting2')) return EXPERT_CRAFTING_DAMAGE_BONUSES.expertCrafting2;
  if (mods.has('expertCrafting1')) return EXPERT_CRAFTING_DAMAGE_BONUSES.expertCrafting1;
  return 0;
}

function hasEnhancedAlloyAttackBonus(modifications) {
  const mods = modifications instanceof Set
    ? modifications
    : new Set(Array.isArray(modifications) ? modifications : []);

  return mods.has('enhancedAlloy');
}

function getBattleAssistValue(modifications) {
  const mods = modifications instanceof Set
    ? modifications
    : new Set(Array.isArray(modifications) ? modifications : []);

  if (mods.has('battleAssist3')) return BATTLE_ASSIST_VALUES.battleAssist3;
  if (mods.has('battleAssist2')) return BATTLE_ASSIST_VALUES.battleAssist2;
  if (mods.has('battleAssist1')) return BATTLE_ASSIST_VALUES.battleAssist1;
  return 0;
}

function getDoubleShotBonus(modifications) {
  const mods = modifications instanceof Set
    ? modifications
    : new Set(Array.isArray(modifications) ? modifications : []);

  return mods.has('doubleShot') ? 2 : 0;
}

