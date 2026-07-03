/**
 * The system Combatant document which extends the common Combatant model for vehicle initiative.
 *
 * @extends Combatant
 * @category Documents
 *
 * @see {@link foundry.documents.Combat}: The Combat document which contains Combatant embedded documents
 * @see {@link foundry.applications.sheets.CombatantConfig}: The application which configures a
 *   Combatant
 */
export default class SynthicideCombatant extends Combatant {
  /* -------------------------------------------- */
  /*  Methods                                     */
  /* -------------------------------------------- */

  /**
   * Acquire the default dice formula which should be used to roll initiative for this combatant.
   * Modules or systems could choose to override or extend this to accommodate special situations.
   * @returns {string}               The initiative formula to use for this combatant.
   * @protected
   */
  _getInitiativeFormula() {
    if (this.actor?.type !== 'vehicle') {
      return super._getInitiativeFormula();
    }
    return '1d10 + @velocity';
  }
}

/**
 * @param {string} initFormula
 * @param {string} title
 * @returns {Promise<string>}
 */
export async function confirmRollFormula(initFormula, title) {
  let returnText = "";
  await foundry.applications.api.DialogV2.wait({
    window: {title: title},
    content: `<label for="outputFormula">Formula</label><input type="text" name="outputFormula" value="` + initFormula + `"></input>`,
    buttons: [
      {
        action: "roll",
        icon: "fa-solid fa-dice",
        label: "SYNTHICIDE.Roll.Dialog.RollButton",
        default: true,
        callback: (event, button, dialog) => {
          returnText = dialog.element.querySelector('[name="outputFormula"]')?.value;
        }
      }
    ],
  });
  return (returnText ?? "");
}