import { BaseCardSystemData } from "./base-card.mjs";
import { getDegreeLabel, getDifficultyLabel } from "../../rolls/roll-utils.mjs";

const fields = foundry.data.fields;
const requiredInteger = { required: true, nullable: false, integer: true };
const requiredBlankString = { required: true, blank: true, initial: '' };

/**
 * Modernized Document-Driven Challenge and Driver Velocity Data Model.
 * Dynamically re-configures layout formulas and UI labels based on the active attribute key.
 */
export class ChallengeCardSystemData extends BaseCardSystemData {
  static defineSchema() {
    const schema = super.defineSchema(); // Inherits actorUuid, actorName, total, subtype, AND d10!
    schema.attribute = new fields.StringField({...requiredBlankString});
    schema.difficulty = new fields.NumberField({...requiredInteger, initial: 0});
    
    // Transient UI calculation values (Not saved to disk)
    schema.effectValue = new fields.NumberField({...requiredInteger, initial: 0}, {persisted: false});
    schema.effectDegree = new fields.StringField({...requiredBlankString}, {persisted: false});

    // UI presentation storage variables
    schema.misc = new fields.NumberField({ required: false, integer: true, initial: 0 });
    schema.modifiers = new fields.NumberField({ required: false, integer: true, initial: 0 });
    schema.attributeValue = new fields.NumberField({ required: false, integer: true, initial: 0 });
    schema.flavorOverride = new fields.StringField({ required: false, nullable: true, initial: null });
    return schema;
  }

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();
    this.effectValue = this.total - this.difficulty;
    this.effectDegree = getDegreeLabel(this.effectValue) || "";
  }

  /**
   * Helper check to determine if this card represents a vehicle driver velocity check
   * @returns {boolean}
   */
  get isDriverVelocity() {
    return this.attribute === "velocity" || this.subtype === "driverVelocity";
  }

  get title() {
    return this.isDriverVelocity 
      ? game.i18n.localize("SYNTHICIDE.Roll.Card.TitleDriverVelocity")
      : game.i18n.localize("SYNTHICIDE.Roll.Card.TitleChallenge");
  }

  get showTotalRow() {
    // Driver velocity keeps the big total box visible, standard challenge uses the outcome row banner instead
    return this.isDriverVelocity;
  }

  get showEffectOutcomeRow() {
    return !this.isDriverVelocity;
  }

  get effectText() {
    return this.effectValue >= 0 ? `+${this.effectValue}` : String(this.effectValue);
  }

  get outcomeLabel() {
    return this.effectDegree;
  }

  get outcomeClass() {
    return this.effectValue >= 0 ? "success" : "failure";
  }

  get showOpposedButton() {
    return !this.isDriverVelocity;
  }

  get equation() {
    return `${this.d10} + ${this.attributeValue} + ${this.misc} + ${this.modifiers}`;
  }

  get equationTerms() {
    // If vehicle velocity, replace the standard attribute label text string block natively
    const label = this.isDriverVelocity
      ? game.i18n.localize("SYNTHICIDE.Vehicle.Velocity")
      : game.i18n.localize(`SYNTHICIDE.Attribute.${this.attribute?.capitalize() ?? "Combat"}.long`);

    return [
      { label, value: this.attributeValue },
      { label: game.i18n.localize("SYNTHICIDE.Roll.Dialog.MiscModifier"), value: this.misc },
      { label: game.i18n.localize("SYNTHICIDE.Roll.Dialog.RollModifiers"), value: this.modifiers }
    ];
  }

  get metadataRows() {
    if (this.isDriverVelocity) return []; // Driver velocity clears out the extra difficulty rows
    return [
      { label: game.i18n.localize("SYNTHICIDE.Roll.Card.Difficulty"), value: this.difficulty },
      { label: game.i18n.localize("SYNTHICIDE.Roll.Card.Effect"), value: this.effectText }
    ];
  }

  get flavor() {
    if (this.flavorOverride) return this.flavorOverride;
    
    if (this.isDriverVelocity) {
      return game.i18n.localize("SYNTHICIDE.Roll.Card.DefaultFlavorDriverVelocity");
    }
    const difficultyText = getDifficultyLabel(this.difficulty);
    
    const attrKey = this.attribute ? this.attribute.toLowerCase() : "combat";
    const attrLabel = game.i18n.localize(`SYNTHICIDE.Attribute.${attrKey.capitalize()}.long`);
    
    return game.i18n.format("SYNTHICIDE.Roll.Card.DefaultFlavorChallenge", {
      difficulty: difficultyText,
      attribute: attrLabel
    });
  }

  /** @override */
  get templateContext() {
    return {
      ...super.templateContext,
      // Challenge and Velocity field extensions appended cleanly in one spot!
      showEffectOutcomeRow: this.showEffectOutcomeRow,
      effectText: this.effectText,
      outcomeLabel: this.outcomeLabel,
      outcomeClass: this.outcomeClass,
      showOpposedButton: this.showOpposedButton,
      showDamageButton: false
    };
  }
}
