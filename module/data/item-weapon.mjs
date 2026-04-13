import SYNTHICIDE from '../helpers/config.mjs';
import SynthicideGear from './item-gear.mjs';

const fields = foundry.data.fields;
const requiredInteger = { required: true, nullable: false, integer: true };
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
    schema.bonuses = makeWeaponBonusSchema(fields, false); 

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
    if (!actor) return;

    // direct passthrough if not NPC
    if (actor.type !== 'npc') {
      this.bonuses.attack = this.attackBonus;
      this.bonuses.damage = this.damageBonus;
      this.bonuses.lethal = this.lethal;
      return;
    }

    // Special-case: psycherProjection
    if (this.specialType === 'psycherProjection') {
      // For psycherProjection, attack/damage = actor level
      const level = Number(actor.system?.level?.value ?? 1);
      this.bonuses.attack = level;
      this.bonuses.damage = level;
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
    this.bonuses.attack = tierBonuses.attack + masteredWeaponBonus;
    this.bonuses.damage = tierBonuses.damage + masteredWeaponBonus;
    this.bonuses.lethal = tierBonuses.lethal;
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
    lethal: new fields.NumberField({ initial: 0 }, {persisted})
  });
}

//function makeWeaponBonusInitial() {
//  return { attack: 0, damage: 0, lethal: 0 };
//}