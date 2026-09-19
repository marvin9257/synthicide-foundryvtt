// module/data/cards/demolition-card.mjs
import { buildEquationTerms, localize, getDifficultyLabel, getAttributeLabel } from "../../rolls/roll-utils.mjs";
import { CombatCardSystemData } from "./combat-card.mjs";
import { buildWeaponSpecializationMetadataRows } from "../../rolls/weapon-proficiency-rules.mjs";

const fields = foundry.data.fields;
const requiredInteger = { required: true, nullable: false, integer: true };
const requiredBlankString = { required: true, blank: true, initial: '' };

/**
 * Modernized Document-Driven Demolition Card Data Model.
 * Aligns strictly with core tactical planting and detonation rules.
 */
export class DemolitionCardSystemData extends CombatCardSystemData {
  static defineSchema() {
    const schema = super.defineSchema();
    
    // Core Metrics (Explicitly persisted parameters)
    schema.difficulty = new fields.NumberField({...requiredInteger, initial: 0});
    schema.damageBonus = new fields.NumberField({...requiredInteger, initial: 0});
    schema.baseDamageBonus = new fields.NumberField({...requiredInteger, initial: 0});
    schema.actorModifierTotal = new fields.NumberField({...requiredInteger, initial: 0});
    
    // Spatial & Blast Configurations
    schema.blastDiameter = new fields.NumberField({...requiredInteger, initial: 0});
    schema.placedTemplateUuid = new fields.StringField({ required: false, blank: true, initial: '' });
    
    // Mode Settings & Boolean Realizations
    schema.mode = new fields.StringField({...requiredBlankString}); // "throw" or "planted"
    schema.success = new fields.BooleanField({ required: true, initial: false });
    schema.scatterApplied = new fields.BooleanField({ required: false, initial: false });
    schema.plantNumber = new fields.NumberField({ required: false, nullable: true, integer: true, initial: null });
    
    // Spatial Distance Context Metrics
    schema.rangeDistance = new fields.NumberField({ required: false, nullable: true, initial: null });
    schema.rangeIncrement = new fields.NumberField({ required: false, nullable: true, initial: null });
    schema.rangeBands = new fields.NumberField({ required: false, nullable: true, integer: true, initial: null });

    // Flexible layout references mapping safeties
    schema.weaponModifications = new fields.ArrayField(new fields.JSONField(), { required: false, initial: [] });
    schema.weaponName = new fields.StringField({ required: true, blank: false, initial: 'Demolition' });
    schema.specialAmmoUsed = new fields.StringField({ required: false, blank: true, initial: 'none' });
    
    return schema;
  }

  _initializeCalculations() {
    super._initializeCalculations();
    const currentMode = String(this.mode).toLowerCase();
    this.isPlantedMode = currentMode === 'planted';
    this.isThrowMode = currentMode === 'throw';
    
    if (this.isPlantedMode) {
      this.hideAttributeRow = true;
    }
  }

  get title() {
    return localize('SYNTHICIDE.Roll.Card.TitleDemolition');
  }

  get flavor() {
    if (this.isPlantedMode) {
      return localize('SYNTHICIDE.Roll.Card.DefaultFlavorDemolitionPlanted', {
        item: this.weaponName,
        attribute: getAttributeLabel(this.attribute),
        plant: this.plantNumber ?? this.difficulty
      });
    }
    
    return localize('SYNTHICIDE.Roll.Card.DefaultFlavorDemolition', {
      item: this.weaponName,
      attribute: getAttributeLabel(this.attribute),
      rd: getDifficultyLabel(this.difficulty)
    });
  }

  get showTotalRow() {
    return true;
  }

  get showEffectOutcomeRow() {
    return false;
  }

  get equation() {
    return String(this.parent?.roll?.result || this.parent?.roll?.formula || '');
  }

  get equationTerms() {
    return buildEquationTerms({ 
      subtype: 'demolition', 
      attributeKey: this.attribute, 
      rollData: { 
        ...this, 
        attributeValue: this.attributeValue,
        hideAttributeRow: this.hideAttributeRow 
      }
    });
  }

  get outcomeLabel() {
    if (this.isPlantedMode) {
      return this.success 
        ? localize('SYNTHICIDE.Roll.Outcome.Planted') 
        : localize('SYNTHICIDE.Roll.Outcome.DetonatedDuringPlanting');
    }

    if (this.success) return localize('SYNTHICIDE.Roll.Outcome.OnTarget');
    return this.scatterApplied
      ? localize('SYNTHICIDE.Roll.Outcome.Scattered')
      : localize('SYNTHICIDE.Roll.Outcome.OffTargetNoScatter');
  }

  get outcomeClass() {
    return this.success ? 'outcome-success' : 'outcome-failure';
  }

  get metadataRows() {
    const rows = [
      {
        label: this.isPlantedMode
          ? localize('SYNTHICIDE.Roll.Card.PlantNumber')
          : localize('SYNTHICIDE.Roll.Card.Difficulty'),
        value: this.difficulty,
      }
    ];

    const performanceMargin = this.total - this.difficulty;
    rows.push({ 
      label: localize('SYNTHICIDE.Roll.Card.Effect'), 
      value: performanceMargin > 0 ? `+${performanceMargin}` : String(performanceMargin) 
    });

    rows.push({ 
      label: localize('SYNTHICIDE.Roll.Card.BlastDiameter'), 
      value: this.blastDiameter ?? 'n/a' 
    });

    if (this.isThrowMode) {
      rows.push(
        { label: localize('SYNTHICIDE.Roll.Card.Distance'), value: this.rangeDistance ?? 'n/a' },
        { label: localize('SYNTHICIDE.Roll.Card.RangeIncrement'), value: this.rangeIncrement ?? 'n/a' }
      );
      if (this.rangeBands !== null && this.rangeDistance !== null && this.rangeBands !== this.rangeDistance) {
        rows.push({ label: localize('SYNTHICIDE.Roll.Card.RangeBands'), value: this.rangeBands });
      }
    }

    if (this.baseDamageBonus !== 0 && this.damageBonus === this.baseDamageBonus) {
      rows.push({ label: localize('SYNTHICIDE.Roll.Card.BaseDamageBonus'), value: this.baseDamageBonus });
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
    // Dynamically calculate the numeric margin (Effect value) using schema column values to match legacy challenge behavior
    const computedEffect = this.total - this.difficulty;
    
    return {
      ...super.templateContext,
      subtype: "demolition",
      showEffectOutcomeRow: this.isThrowMode,
      // Fix: Outputs the standard signed numeric string value (e.g. "+3" or "-5") instead of repeating the outcome text
      effectText: computedEffect > 0 ? `+${computedEffect}` : String(computedEffect),
      effectClass: this.outcomeClass,
      outcomeLabel: this.outcomeLabel,
      outcomeClass: this.success ? "success" : "failure",
      showDamageButton: this.isPlantedMode ? !this.success : false, 
      showOpposedButton: false,
      damageBonus: this.damageBonus
    };
  }
}
