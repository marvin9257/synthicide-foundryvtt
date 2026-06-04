
import SYNTHICIDE from '../helpers/config.mjs';
import { ICON_MAP } from '../helpers/icons.mjs';
import { buildBaseSheetContext } from './sheet-context.mjs';
import { SynthicideNPCActorSheet } from './npc-actor-sheet.mjs';

class SynthicideNPCCompactSheet extends SynthicideNPCActorSheet {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    classes: [...super.DEFAULT_OPTIONS.classes, 'npc-compact'],
    position: { width: 'auto', height: 'auto' },
    window: {
      icon: ICON_MAP.person,
    },
  }, { inplace: false });

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
            (this.actor.itemTypes.weapon ?? []).map(w => [w.id, w.name])
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

    // Determine a selected weapon id for display without mutating the
    // read-only `context.system` object.
    const selectedWeaponId = this.actor.system.selectedWeaponId ?? '';
    context.selectedWeaponId = selectedWeaponId;
    const selectedWeapon = selectedWeaponId ? (this.actor.items.get(selectedWeaponId) ?? null) : null;
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
}

export default SynthicideNPCCompactSheet;
