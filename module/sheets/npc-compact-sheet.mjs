
import SYNTHICIDE from '../helpers/config.mjs';
import { ICON_MAP } from '../helpers/icons.mjs';
import { buildBaseSheetContext } from './sheet-context.mjs';
import { deleteDocAction, makeRoll, makeSelectedAttackRoll, showInfoAction, viewDocAction } from './sheet-utils.mjs';
const { api, sheets } = foundry.applications;

class SynthicideNPCCompactSheet extends api.HandlebarsApplicationMixin(sheets.ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["synthicide", "actor", "npc", "npc-compact"],
    position: { width: 'auto', height: 'auto' },
    window: { 
      resizable: true,
      icon: ICON_MAP.person
    },
    actions: {
      viewDoc: this._viewDoc,
      deleteDoc: this._deleteDoc,
      showInfo: this._showInfo,
      selectedAttackRoll: this._onSelectedAttackRoll,
      roll: this._onRoll
    },
    form: { submitOnChange: true }
  };

  static PARTS = {
    compact: {
      template: 'systems/synthicide/templates/actor/npc-compact-sheet.hbs',
    }
  };

  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    options.parts = ['compact'];
  }

  async _prepareContext(_options) {
    // Provide context matching the default NPC sheet for localization and config
    const context = buildBaseSheetContext({
      sheet: this,
      document: this.actor,
      documentKey: 'actor',
      extra: {
        SYNTHICIDE,
        config: {
          npcRoleOptions: Object.fromEntries(
            Object.entries(SYNTHICIDE.npc.roles).map(([k, v]) => [k, v.label])
          ),
          npcWeaponOptions: Object.fromEntries(
            (this.actor.itemTypes.weapon ?? []).map(w => [w._id, w.name])
          ),
          npcWealthOptions: Object.fromEntries(
            Object.entries(SYNTHICIDE.npc.wealthTiers).map(([k, v]) => [k, v.label])
          ),
          bioclassOptions: Object.fromEntries(
            Object.entries(SYNTHICIDE.npc.bioclasses ?? {}).map(([k, v]) => [k, v.label])
          ),
        },
        configAttributes: SYNTHICIDE.attributes,
        sheetStyle: game.settings.get('synthicide', SYNTHICIDE.SHEET_STYLE_SETTING_KEY) || SYNTHICIDE.SHEET_STYLE_CLASSIC
      },
    });

    // Expose the selected weapon item for the template
    const selectedWeaponId = context.system.selectedWeaponId;
    const selectedWeapon = this.actor.items.get(selectedWeaponId) ?? null;
    context.selectedWeapon = selectedWeapon;

    // Precompute tier attack/damage for template simplicity
    let tierObj = null;
    if (selectedWeapon && selectedWeapon.system?.tierBonuses && selectedWeapon.system?.weaponTier) {
      tierObj = selectedWeapon.system.tierBonuses[selectedWeapon.system.weaponTier] || null;
    }
    context.selectedWeaponTier = tierObj;

    // Bioclass item (max 1); null when no bioclass is assigned.
    context.bioclass = this.actor.itemTypes.bioclass?.[0] ?? null;
    return context;
  }

  static async _viewDoc(event, target) {
      await viewDocAction(this.actor, target);
    }
  
    static async _deleteDoc(event, target) {
      await deleteDocAction(this.actor, target);
    }
  
    static async _showInfo(event, target) {
      await showInfoAction(this.actor, target);
    }

    static async _onSelectedAttackRoll(event, _target) {
      event.preventDefault();
      makeSelectedAttackRoll(this.actor);
    }
    /**
     * Handles generic roll clicks (challenge or item attacks).
     * @this {SynthicideNPCActorSheet}
     * @param {PointerEvent} event
     * @param {HTMLElement} target
     */
    static async _onRoll(event, target) {
      event.preventDefault();
      makeRoll(this.actor, target)
    }
}

export default SynthicideNPCCompactSheet;
