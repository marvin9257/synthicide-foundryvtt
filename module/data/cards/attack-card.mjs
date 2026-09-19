// module/data/cards/attack-card.mjs
import { buildEquationTerms, localize, getAttributeLabel } from "../../rolls/roll-utils.mjs";
import { CombatCardSystemData } from "./combat-card.mjs";
import { buildWeaponSpecializationMetadataRows } from "../../rolls/weapon-proficiency-rules.mjs";

const fields = foundry.data.fields;
const requiredInteger = { required: true, nullable: false, integer: true };
//const requiredBlankString = { required: true, blank: true, initial: '' };

export class AttackCardSystemData extends CombatCardSystemData {
  
  constructor(data, options) {
    super(data, options); // Natively binds schema fields safely
    // Unified layout pattern requirement: Forces immediate calculation in RAM
    this.prepareDerivedData();
  }

  static defineSchema() {
    const schema = super.defineSchema();
    
    // Core Metrics
    schema.attackTotal = new fields.NumberField({...requiredInteger, initial: 0});
    schema.armor = new fields.NumberField({...requiredInteger, initial: 0});
    schema.shieldBonus = new fields.NumberField({...requiredInteger, initial: 0});
    schema.damageBonus = new fields.NumberField({...requiredInteger, initial: 0});
    schema.baseAttackBonus = new fields.NumberField({...requiredInteger, initial: 0});
    schema.baseDamageBonus = new fields.NumberField({...requiredInteger, initial: 0});
    schema.lethalOverride = new fields.NumberField({ required: false, nullable: true, initial: null });
    schema.baseLethalValue = new fields.NumberField({...requiredInteger, initial: 0});
    schema.hit = new fields.BooleanField({ required: true, initial: false });

    // Battle Assist properties
    schema.battleAssistValue = new fields.NumberField({...requiredInteger, initial: 0});
    schema.actorCombatValue = new fields.NumberField({...requiredInteger, initial: 0});
    
    // Spatial Properties
    schema.rangeDistance = new fields.NumberField({ required: false, nullable: true, initial: null });
    schema.rangeIncrement = new fields.NumberField({ required: false, nullable: true, initial: null });
    
    // State Flags & Features
    schema.isPlantedDemolitionAttack = new fields.BooleanField({ required: false, initial: false });
    schema.extraDamageDice = new fields.NumberField({...requiredInteger, initial: 0});
    schema.baneDamageBonus = new fields.NumberField({...requiredInteger, initial: 0});
    schema.slugShotActive = new fields.BooleanField({ required: false, initial: false });
    
    // FIX: Switched to a generic ArrayField to prevent validation crashes from weapon document objects
    schema.weaponModifications = new fields.ArrayField(new fields.JSONField());
    
    schema.weaponName = new fields.StringField({ required: true, blank: false, initial: 'Attack' });
    schema.specialAmmoUsed = new fields.StringField({ required: false, blank: true, initial: 'none' });
    
    return schema;
  }

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();
    
    // 1. Calculate effective composite defense thresholds
    this.effectiveArmor = this.armor + this.shieldBonus;
    
    // 2. Evaluate hits using our explicit schema parameter
    const totalScore = this.attackTotal || Number(this.parent?.roll?.total ?? 0);
    this.hit = totalScore >= this.effectiveArmor;
    
    // 3. Resolve weapon modification string tags or object keys safely
    const mods = this.weaponModifications || [];
    this.isSlugShotRealized = this.slugShotActive && mods.some(m => m === 'slugShot' || m?.key === 'slugShot' || m?.id === 'slugShot');
    
    // 4. Compute lethal properties
    const specialization = this.specialization ?? {};
    this.lethal = Number.isFinite(this.lethalOverride)
      ? this.lethalOverride
      : Number(this.baseLethalValue ?? 0) + Number(specialization.lethalBonus ?? 0);
    
    // 5. Evaluate high-tech Battle Assist capabilities case-insensitively
    this.isBattleAssistApplied = String(this.attribute).toLowerCase() === 'combat'
      && this.battleAssistValue > this.actorCombatValue
      && this.attributeValue === this.battleAssistValue;
  }

  get title() {
    return localize('SYNTHICIDE.Roll.Card.TitleAttack');
  }

  get flavor() {
    return localize('SYNTHICIDE.Roll.Card.DefaultFlavorAttack', {
      attribute: getAttributeLabel(this.attribute),
      armor: this.effectiveArmor,
      item: this.weaponName,
    });
  }

  get showTotalRow() {
    return false;
  }

  get showEffectOutcomeRow() {
    return false;
  }

  get equation() {
    return String(this.parent?.roll?.result || this.parent?.roll?.formula || '');
  }

  get equationTerms() {
    return buildEquationTerms({ 
      subtype: 'attack', 
      attributeKey: this.attribute, 
      rollData: { ...this, attributeValue: this.attributeValue }
    });
  }

  get metadataRows() {
    const rows = [
      { label: localize('SYNTHICIDE.Roll.Card.Armor'), value: String(this.armor) }
    ];

    if (this.baseAttackBonus !== 0) {
      rows.push({
        label: localize('SYNTHICIDE.Roll.Card.BaseAttackBonus'),
        value: String(this.baseAttackBonus)
      });
    }

    if (this.shieldBonus !== 0) {
      rows.push({ 
        label: localize('SYNTHICIDE.Roll.Card.ShieldBonus'), 
        value: this.shieldBonus > 0 ? `+${this.shieldBonus}` : String(this.shieldBonus) 
      });
      rows.push({ 
        label: localize('SYNTHICIDE.Roll.Card.EffectiveArmor'), 
        value: String(this.effectiveArmor) 
      });
    }

    rows.push(
      { label: localize('SYNTHICIDE.Roll.Card.Distance'), value: this.rangeDistance ?? 'n/a' },
      { label: localize('SYNTHICIDE.Roll.Card.RangeIncrement'), value: this.rangeIncrement ?? 'n/a' }
    );

    if (this.isSlugShotRealized) {
      rows.push({
        label: localize('SYNTHICIDE.Roll.Card.SlugShotMode'),
        value: '-2 ATT, +2 DMG',
      });
    }

    if (this.isBattleAssistApplied) {
      rows.push({
        label: localize('SYNTHICIDE.Roll.Card.BattleAssist'),
        value: `${this.actorCombatValue} -> ${this.battleAssistValue}`,
      });
    }

    rows.push(
      ...buildWeaponSpecializationMetadataRows({
        input: this.specialization ?? {},
        includeAttackBonus: true,
        includeDamageBonus: true,
        includeLethalBonus: true,
        includeShockRdBonus: true,
      })
    );

    return rows;
  }

  /** @override */
  get templateContext() {
    return {
      ...super.templateContext,
      subtype: "attack",
      showEffectOutcomeRow: this.showEffectOutcomeRow,
      effectText: this.hit ? localize('SYNTHICIDE.Roll.Outcome.Hit') : localize('SYNTHICIDE.Roll.Outcome.Miss'),
      effectClass: this.hit ? 'outcome-success' : 'outcome-failure',
      extraDamageDice: this.extraDamageDice,
      damageBonus: this.damageBonus,
      showDamageButton: this.hit, 
      showOpposedButton: false
    };
  }
}
