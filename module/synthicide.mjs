// Import document classes.
import { SynthicideActor } from './documents/actor.mjs';
import { SynthicideItem } from './documents/item.mjs';
// Import sheet classes.
import { SynthicideActorSheet } from './sheets/actor-sheet.mjs';
import { SynthicideNPCActorSheet } from './sheets/npc-actor-sheet.mjs';
import SynthicideNPCCompactSheet from './sheets/npc-compact-sheet.mjs';
import { SynthicideItemSheet } from './sheets/item-sheet.mjs';
// Import helper/utility classes and constants.
import SYNTHICIDE from './helpers/config.mjs';
import SynthicideActiveEffectConfig from './applications/synthicide-active-effect-config.mjs';
// Import DataModel classes
import * as models from './data/_module.mjs';
//Import Combat Class
import  SynthicideCombat from './documents/combat.mjs';
import { migrateWorld, registerMigrationSettings } from './data/migrations.mjs';
import {SynthicideGamePause} from './documents/pause.mjs';
import { openSynthicideActionRollDialog, registerActionRollHooks } from './rolls/action-rolls.mjs';
import { registerSynthicideChatContextHook, SynthicideChatPopout } from './documents/chatlog.mjs';
import { registerVirtualGridOverlay } from './canvas/virtual-grid-overlay.mjs';
import SynthicideVirtualRuler from './canvas/synthicide-virtual-ruler.mjs';
import SynthicideVirtualTokenRuler from './canvas/synthicide-virtual-token-ruler.mjs';

const collections = foundry.documents.collections;

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

// Add key classes to the global scope so they can be more easily used
globalThis.synthicide = {
  documents: {
    SynthicideActor,
    SynthicideItem,
  },
  applications: {
    SynthicideActorSheet,
    SynthicideNPCActorSheet,
    SynthicideItemSheet,
  },
  utils: {
    rollItemMacro,
    openSynthicideActionRollDialog,
  },
  models,
};


Hooks.once('init', function () {

  console.log(
      `%cSYNTHICIDE 2e | Initializing system\n` +
      `%c
                         _   _     _      _     _        ____      
         ___ _   _ _ __ | |_| |__ (_) ___(_) __| | ___  |___ \\ ___ 
        / __| | | | '_ \\| __| '_ \\| |/ __| |/ _' |/ _ \\   __) / _ \\ 
        \\__ \\ |_| | | | | |_| | | | | (__| | (_| |  __/  / __/  __/
        |___/\\__, |_| |_|\\__|_| |_|_|\\___|_|\\__,_|\\___| |_____\\___|
            |___/                                                                                     
      `,
      "color: #ffffff; font-weight: bold; font-size: 16px;", // Style for the header
      "color:rgb(222, 51, 3); font-weight: normal; font-size: 12px;" // Style for the ASCII art
  );

  // Expose the synthicide namespace on `game` for macros and user scripts.
  if (typeof game !== 'undefined') game.synthicide = globalThis.synthicide;

  // Add custom constants for configuration.
  CONFIG.SYNTHICIDE = SYNTHICIDE;

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: '1d10 + @attributes.speed.value',
    decimals: 2,
  };

  // Define custom Document and DataModel classes
  CONFIG.Actor.documentClass = SynthicideActor;

  // Note that you don't need to declare a DataModel
  // for the base actor/item classes - they are included
  // with the Character/NPC as part of super.defineSchema()
  CONFIG.Actor.dataModels = {
    sharper: models.SynthicideSharperData,
    npc: models.SynthicideNPCData,
  };
  CONFIG.Item.documentClass = SynthicideItem;
  CONFIG.Item.dataModels = {
    armor: models.SynthicideArmor,
    aspect: models.SynthicideAspect,
    bioclass: models.SynthicideBioclass,
    implant: models.SynthicideImplant,
    gear: models.SynthicideGear,
    shield: models.SynthicideShield,
    trait: models.SynthicideTrait,
    weapon: models.SynthicideWeapon
  };

  // Internal settings used by world migrations
  registerMigrationSettings();

  // Client and Workds settings for Synthicide
  registerSettings();

  // Register application/document hooks.
  registerSynthicideChatContextHook();
  registerActionRollHooks();

  // Register sheet application classes
  collections.Actors.unregisterSheet('core', foundry.applications.sheets.ActorSheetV2)
  collections.Actors.registerSheet('synthicide', SynthicideActorSheet, {
    types: ['sharper'],
    makeDefault: true,
    label: 'SYNTHICIDE.SheetLabels.Actor',
  });
  collections.Actors.registerSheet('synthicide', SynthicideNPCActorSheet, {
    types: ['npc'],
    makeDefault: true,
    label: 'SYNTHICIDE.SheetLabels.NPCActor',
  });
  collections.Actors.registerSheet('synthicide', SynthicideNPCCompactSheet, {
    types: ['npc'],
    makeDefault: false,
    label: 'SYNTHICIDE.SheetLabels.NPCCompact',
  });
  collections.Items.unregisterSheet('core', foundry.applications.sheets.ItemSheetV2);
  collections.Items.registerSheet('synthicide', SynthicideItemSheet, {
    makeDefault: true,
    label: 'SYNTHICIDE.SheetLabels.Item',
  });

  //Game pause icon change
  CONFIG.ui.pause = SynthicideGamePause;

  // Add custom chat popout class.
  CONFIG.ChatMessage.popoutClass = SynthicideChatPopout;

  //Combat tracking
  CONFIG.Combat.documentClass = SynthicideCombat;

  CONFIG.fontDefinitions["Roboto"] = {
    editor: true,
    fonts: [
      { urls: ["systems/synthicide/assets/fonts/Roboto/Roboto-Regular.ttf"], weight: 400 },
      { urls: ["systems/synthicide/assets/fonts/Roboto/Roboto-Bold.ttf"], weight: 700 }
    ]
  };
  registerVirtualGridOverlay();
  // Use custom ruler for virtual grid measurement
  CONFIG.Canvas.rulerClass = SynthicideVirtualRuler;
  CONFIG.Token.rulerClass = SynthicideVirtualTokenRuler;

  foundry.applications.apps.DocumentSheetConfig.registerSheet(CONFIG.ActiveEffect.documentClass, 'synthicide', SynthicideActiveEffectConfig, { makeDefault: true });

});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// If you need to add Handlebars helpers, here is a useful example:
Handlebars.registerHelper('toLowerCase', function (str) {
  return str.toLowerCase();
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once('ready', async function () {
  await migrateWorld();

  applySheetStyleMode(
    game.settings.get('synthicide', SYNTHICIDE.SHEET_STYLE_SETTING_KEY)
  );

  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  // Use a synchronous check to decide whether to intercept the drop and return `false` immediately
  // so Foundry's default hotbar macro creation is prevented. The actual macro creation remains
  // asynchronous inside `createDocMacro`.
  Hooks.on('hotbarDrop', (bar, data, slot) => {
    if (!data || data.type !== 'Item') return;
    const uuid = data.uuid || '';
    if (!(uuid.includes('Actor.') || uuid.includes('Token.'))) return;
    // Spawn the async creation but return false synchronously to block the default handler.
    void createDocMacro(data, slot);
    return false;
  });

});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createDocMacro(data, slot) {
  // First, determine if this is a valid owned item.
  if (data.type !== 'Item') return;
  if (!data.uuid.includes('Actor.') && !data.uuid.includes('Token.')) {
    return ui.notifications.warn(
      'You can only create macro buttons for owned Items'
    );
  }
  // If it is, retrieve it based on the uuid.
  const item = await Item.fromDropData(data);

  // Create the macro command using the uuid. Call the utils directly.
  const command = `game.synthicide.utils.rollItemMacro("${data.uuid}");`;
  let macro = game.macros.find(
    (m) => m.name === item.name && m.command === command
  );
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: 'script',
      img: item.img,
      command: command,
      flags: { 'synthicide.itemMacro': true },
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemUuid
 */
function rollItemMacro(itemUuid) {
  // Reconstruct the drop data so that we can load the item.
  const dropData = {
    type: 'Item',
    uuid: itemUuid,
  };
  // Load the item from the uuid.
  Item.fromDropData(dropData).then((item) => {
    // Determine if the item loaded and if it's an owned item.
    if (!item || !item.parent) {
      const itemName = item?.name ?? itemUuid;
      return ui.notifications.warn(
        `Could not find item ${itemName}. You may need to delete and recreate this macro.`
      );
    }

    // Trigger the item roll
    /** @type {import('./documents/item.mjs').SynthicideItem} */
    const sItem = /** @type {import('./documents/item.mjs').SynthicideItem} */ (item);
    sItem.roll();
  });
}

function applySheetStyleMode(mode) {
  const doc = globalThis.document;
  if (!doc) return;

  const roots = [doc.body, doc.documentElement].filter(Boolean);
  for (const root of roots) {
    root.classList.remove('synthicide-style-classic', 'synthicide-style-bold');
    root.classList.add(
      mode === SYNTHICIDE.SHEET_STYLE_BOLD
        ? 'synthicide-style-bold'
        : 'synthicide-style-classic'
    );
  }
}

function registerSettings() {
  game.settings.register('synthicide', SYNTHICIDE.SHEET_STYLE_SETTING_KEY, {
    name: 'SYNTHICIDE.Settings.SheetStyleMode.Name',
    hint: 'SYNTHICIDE.Settings.SheetStyleMode.Hint',
    scope: 'client',
    config: true,
    type: String,
    choices: {
      [SYNTHICIDE.SHEET_STYLE_CLASSIC]: 'SYNTHICIDE.Settings.SheetStyleMode.Choices.Classic',
      [SYNTHICIDE.SHEET_STYLE_BOLD]: 'SYNTHICIDE.Settings.SheetStyleMode.Choices.RulebookBold',
    },
    default: SYNTHICIDE.SHEET_STYLE_CLASSIC,
    onChange: (value) => applySheetStyleMode(value),
  });

  game.settings.register('synthicide', SYNTHICIDE.DEFAULT_TARGET_ARMOR_KEY, {
    name: 'SYNTHICIDE.Settings.DefaultTargetArmor.Name',
    hint: 'SYNTHICIDE.Settings.DefaultTargetArmor.Hint',
    scope: 'world',
    config: true,
    type: Number,
    default: 6,
  });

  game.settings.register('synthicide', SYNTHICIDE.USE_SHOCKING_STRIKE_KEY, {
    name: 'SYNTHICIDE.Settings.UseShockingStrike.Name',
    hint: 'SYNTHICIDE.Settings.UseShockingStrike.Hint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
  });

  // Virtual Grid Movement Display Setting
  game.settings.register('synthicide', SYNTHICIDE.VIRTUAL_GRID_MOVEMENT_KEY, {
    name: 'SYNTHICIDE.Settings.VirtualGridMovement.Name',
    hint: 'SYNTHICIDE.Settings.VirtualGridMovement.Hint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
    onChange: () => { if (canvas.ready) canvas.draw(); }
  });

  game.settings.register('synthicide', SYNTHICIDE.DEMOLITION_AUTO_SCATTER_KEY, {
    name: 'SYNTHICIDE.Settings.DemolitionAutoScatter.Name',
    hint: 'SYNTHICIDE.Settings.DemolitionAutoScatter.Hint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
  });

}