import { buildEquationTerms, formatRollModifiers, formatSignedNumber, localize } from "../../rolls/roll-utils.mjs";
import { buildWeaponSpecializationMetadataRows } from "../../rolls/weapon-proficiency-rules.mjs";
import { CombatCardSystemData } from "./combat-card.mjs";

const fields = foundry.data.fields;
const requiredInteger = { required: true, nullable: false, integer: true };

/**
 * Modernized Document-Driven Damage Card Data Model.
 * Correctly inherits from CombatCardSystemData to absorb shared combat schemas safely.
 */
export class DamageCardSystemData extends CombatCardSystemData {
  
  constructor(data, options) {
    super(data, options); // Correctly invokes CombatCard -> BaseCard bindings
    // Layout Contract Pattern: Forces the object to natively calculate its math upon creation in RAM
    this.prepareDerivedData();
  }

  static defineSchema() {
    // 1. DYNAMICALLY INHERIT: Pulls the specialization schema, lethal, and shockRdBonus from CombatCardSystemData!
    const schema = super.defineSchema(); 
    
    // 2. Context Menu & Chat State Routing Persistence properties
    schema.userId = new fields.StringField({ required: false, nullable: true, initial: null });
    schema.messageMode = new fields.StringField({ required: false, initial: 'public' });
    
    // 3. Specialized Damage-only math schema properties
    schema.extraDamageDice = new fields.NumberField({ required: false, nullable: false, integer: true, initial: 0 });
    schema.attributeValue = new fields.NumberField({...requiredInteger, initial: 0});
    schema.specialAmmoUsed = new fields.StringField({ required: false, blank: true, initial: 'none' });
    
    // 4. Dynamic Layout Clamp Fields
    schema.clamped = new fields.BooleanField({ required: false, initial: false });
    schema.rawTotal = new fields.NumberField({ required: false, integer: true, initial: 0 });
    
    // 5. Presentation Modifiers
    schema.damageBonus = new fields.NumberField({ required: false, integer: true, initial: 0 });
    schema.baneDamageBonus = new fields.NumberField({ required: false, integer: true, initial: 0 });
    schema.doubleShotBonus = new fields.NumberField({ required: false, integer: true, initial: 0 });
    schema.slugShotActive = new fields.BooleanField({ required: false, initial: false });
    schema.baseDamageBonus = new fields.NumberField({ required: false, integer: true, initial: 0 });
    schema.dmgMultiplier = new fields.NumberField({ required: false, integer: true, initial: 0 });
    
    // 6. Source Metadata Tracking Properties
    schema.source = new fields.StringField({ required: false, blank: true, initial: '' });
    schema.actorModifierTotal = new fields.NumberField({ required: false, integer: true, initial: 0 });
    schema.modifierDetails = new fields.ArrayField(new fields.ObjectField(), { required: false, initial: [] });
    
    return schema;
  }

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();
    if (!this.rawTotal) {
      this.rawTotal = this.total;
    }
  }

  get isVehicleDamage() {
    return this.dmgMultiplier > 1 || this.subtype === "vehicleDamage";
  }

  get title() {
    return localize('SYNTHICIDE.Roll.Card.TitleDamage');
  }

  get flavor() {
    if (this.isVehicleDamage) {
      return localize('SYNTHICIDE.Roll.Card.VehicleWeaponAutoHitFlavor', { item: this.source || 'Vehicle Weapon' });
    }
    return localize('SYNTHICIDE.Roll.Card.DerivedFromAttack');
  }

  get showTotalRow() {
    return true;
  }

  get equation() {
    if (this.isVehicleDamage) {
      return `${this.d10} x ${this.dmgMultiplier}`;
    }
    const visualMod = this.actorModifierTotal !== 0 ? ` ${formatSignedNumber(this.actorModifierTotal)}` : '';
    return this.extraDamageDice > 0 
      ? `${this.d10} + ${this.attributeValue} + ${this.damageBonus}${visualMod} + ${this.extraDamageDice}d10` 
      : `${this.d10} + ${this.attributeValue} + ${this.damageBonus}${visualMod}`;
  }

  get equationTerms() {
    const termsSubtype = this.isVehicleDamage ? 'vehicleDamage' : 'damage';
    return buildEquationTerms({ 
      subtype: termsSubtype, 
      attributeKey: 'combat', 
      rollData: { 
        attributeValue: this.attributeValue, 
        damageBonus: this.damageBonus,
        hideAttributeRow: this.hideAttributeRow,
        actorModifierTotal: this.actorModifierTotal,
        attribute: this.attributeValue
      } 
    });
  }

  get metadataRows() {
    if (this.isVehicleDamage) {
      return [
        { label: localize('SYNTHICIDE.Roll.Card.SourceAttack'), value: this.source || 'Vehicle Weapon' },
        { label: localize('SYNTHICIDE.Roll.Card.VehicleWeaponMultiplier'), value: `x${this.dmgMultiplier}` }
      ];
    }

    const showBaseDamageBonus = this.baseDamageBonus !== 0 && this.damageBonus === this.baseDamageBonus;
    const rows = [
      { label: localize('SYNTHICIDE.Roll.Card.SourceAttack'), value: this.source || 'Unknown Source' },
      { label: localize('SYNTHICIDE.Roll.Card.LethalValue'), value: this.lethal }, // Safe inheritance access
    ];

    if (this.doubleShotBonus !== 0) {
      rows.push({ label: localize('SYNTHICIDE.Roll.Card.DoubleShotBonus'), value: `+${this.doubleShotBonus} DMG` });
    }
    if (this.slugShotActive) {
      rows.push({ label: localize('SYNTHICIDE.Roll.Card.SlugShotMode'), value: '+2 DMG' });
    }
    if (this.baneDamageBonus !== 0) {
      rows.push({ label: localize('SYNTHICIDE.Roll.Card.BaneTuneBonus'), value: `+${this.baneDamageBonus} DMG` });
    }
    if (showBaseDamageBonus) {
      rows.push({ label: localize('SYNTHICIDE.Roll.Card.BaseDamageBonus'), value: this.baseDamageBonus });
    }

    if (Array.isArray(this.modifierDetails) && this.modifierDetails.length > 0) {
      const formattedMods = formatRollModifiers(this.modifierDetails);
      for (const mod of formattedMods) {
        rows.push({ label: mod.label, value: `${formatSignedNumber(mod.value)} DMG` });
      }
    }

    // Safe inheritance access: specialization is guaranteed to be present as a schema block
    rows.push(...buildWeaponSpecializationMetadataRows({
      input: this.specialization ?? {},
      includeAttackBonus: false,
      includeDamageBonus: true,
      includeLethalBonus: true,
      includeShockRdBonus: true,
    }));

    return rows;
  }

  /** @override */
  get templateContext() {
    return {
      ...super.templateContext, // Automatically pulls title, flavor, equation, total, etc via parent getters
      clamped: this.clamped,
      rawTotal: this.rawTotal,
      showEffectOutcomeRow: false,
      showDamageButton: false,
      showOpposedButton: false
    };
  }
}