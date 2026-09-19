import SYNTHICIDE from "../../helpers/config.mjs";
import { BaseCardSystemData } from "./base-card.mjs";

// DataModels for Synthicide ChatMessage card types (v14+)
const fields = foundry.data.fields;
const requiredInteger = { required: true, nullable: false, integer: true };
const requiredBlankString = { required: true, blank: true, initial: '' };

export class ShockCardSystemData extends BaseCardSystemData {
  static defineSchema() {
    const schema = super.defineSchema();
    schema.damageRemaining = new fields.NumberField({...requiredInteger, initial: 0});
    schema.shockThreshold = new fields.NumberField({...requiredInteger, initial: 0});
    schema.rd = new fields.NumberField({...requiredInteger, initial: 0});
    schema.toughnessValue = new fields.NumberField({...requiredInteger, initial: 0});
    schema.outcome = new fields.StringField({...requiredBlankString});
    schema.lethal = new fields.NumberField({...requiredInteger, initial: 0});
    schema.rollTotal = new fields.NumberField({ required: false, initial: 0 });
    schema.armorDefense = new fields.NumberField({ required: false, nullable: true, integer: true, initial: 0 });
    return schema;
  }

  /**
   * Resolves the final shock outcome category string from calculation states.
   * @param {boolean} isLethal
   * @param {boolean} success
   * @param {boolean} wouldDropBelowZero
   * @returns {string}
   */
  static resolveShockOutcome({ isLethal, success, wouldDropBelowZero } = {}) {
    if (isLethal) return SYNTHICIDE.SHOCK_OUTCOMES.LETHAL;
    if (success) return SYNTHICIDE.SHOCK_OUTCOMES.SUCCESS;
    return wouldDropBelowZero ? SYNTHICIDE.SHOCK_OUTCOMES.DEATH : SYNTHICIDE.SHOCK_OUTCOMES.MINUS_ONE;
  }

  /** @override */
  get templateContext() {
    return {
      ...super.templateContext,
      // Shock cards only use baseline properties, so we just return the parent payload!
    };
  }

   get isLethal() {
    return this.outcome === SYNTHICIDE.SHOCK_OUTCOMES.LETHAL; // Matches your global system configuration key string
  }

  get title() {
    return game.i18n.localize("SYNTHICIDE.Roll.Card.TitleShock");
  }

  get showTotalRow() {
    return true; // Always true so totals remain visible on failures
  }

  get equation() {
    if (this.isLethal) {
      return `${game.i18n.localize("SYNTHICIDE.Roll.Card.InstantDeath")} (${game.i18n.localize("SYNTHICIDE.Roll.Card.LethalShort")}: ${this.lethal} >= AD: ${this.armorDefense})`;
    }
    return this.d10 > 0 ? `${this.d10} + ${this.toughnessValue}` : `${this.toughnessValue}`;
  }

  get equationTerms() {
    if (this.isLethal) return [];
    return [
      { label: game.i18n.localize("SYNTHICIDE.Attribute.Toughness.long"), value: this.toughnessValue }
    ];
  }

  get metadataRows() {
    const rows = [];
    if (this.isLethal) {
      rows.push(
        { label: game.i18n.localize("SYNTHICIDE.Attribute.Toughness.long"), value: this.toughnessValue },
        { label: game.i18n.localize("SYNTHICIDE.Roll.Card.ArmorDefense"), value: this.armorDefense },
        { label: game.i18n.localize("SYNTHICIDE.Roll.Card.LethalRating"), value: this.lethal }
      );
    }
    rows.push(
      { label: game.i18n.localize("SYNTHICIDE.Chat.Shock.Threshold"), value: this.shockThreshold },
      { label: game.i18n.localize("SYNTHICIDE.Roll.Card.Difficulty"), value: this.rd },
      { label: game.i18n.localize("SYNTHICIDE.Roll.Card.DamageResultApplied"), value: this.damageRemaining }
    );
    return rows;
  }

  get flavor() {
    // 1. Compile the base damage context text string dynamically
    const baseFlavor = game.i18n.format("SYNTHICIDE.Chat.Shock.Base", {
      actor: this.actorName || game.i18n.localize("SYNTHICIDE.Roll.Card.UnknownTarget"),
      damage: this.damageRemaining,
      threshold: this.shockThreshold
    });

    // 2. EXACT MATCH FALLBACK: Fall back directly to the MINUS_ONE key if the active outcome is unmapped
    const key = SYNTHICIDE.SHOCK_FLAVOR_KEYS?.[this.outcome] 
             ?? SYNTHICIDE.SHOCK_FLAVOR_KEYS?.[SYNTHICIDE.SHOCK_OUTCOMES?.MINUS_ONE];
    
    const outcomeText = this.isLethal
      ? game.i18n.format(key, { lethal: this.lethal })
      : game.i18n.format(key, { roll: this.rollTotal, rd: this.rd });

    return `${baseFlavor} ${outcomeText}`.trim();
  }

}