import SYNTHICIDE from "../helpers/config.mjs";

/**
 * The system-side TwodsixActiveEffect document which overrides/extends the common ActiveEffect model.
 * We extend to our own class to have isSuppressed getter work with equipped status
 */
export class SynthicideActiveEffect extends foundry.documents.ActiveEffect {
  /**
   * Is there some system logic that makes this active effect ineligible for application?  Accounts for equipped status and expiration
   * @type {boolean}
   * @override
   */
  get isSuppressed() {
    // Check if effect has expired
    if (this.duration.expired) {
      return true;
    }

    if (this.parent instanceof Item) {
      const itemType = this.parent.type;
      if (SYNTHICIDE.EQUIPABLE.includes(itemType) && !this.parent.system.equipped) {
        return true;
      }
    }
    return false;
  }
}
