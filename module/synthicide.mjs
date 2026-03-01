// Import document classes.
import { SynthicideActor } from './documents/actor.mjs';
import { SynthicideItem } from './documents/item.mjs';
// Import sheet classes.
import { SynthicideActorSheet } from './sheets/actor-sheet.mjs';
import { SynthicideItemSheet } from './sheets/item-sheet.mjs';
// Import helper/utility classes and constants.
import SYNTHICIDE from './helpers/config.mjs';
// Import DataModel classes
import * as models from './data/_module.mjs';

const collections = foundry.documents.collections;
const sheets = foundry.appv1.sheets;

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

// Add key classes to the global scope so they can be more easily used
// by downstream developers
globalThis.synthicide = {
  documents: {
    SynthicideActor,
    SynthicideItem,
  },
  applications: {
    SynthicideActorSheet,
    SynthicideItemSheet,
  },
  utils: {
    rollItemMacro,
  },
  models,
};

Hooks.once('init', function () {
  console.log(
      `%cSYNTHICIDE | Initializing system\n` +
      `%c
                         _   _     _      _     _      
         ___ _   _ _ __ | |_| |__ (_) ___(_) __| | ___ 
        / __| | | | '_ \\| __| '_ \\| |/ __| |/ _\\ |/ _ \\     
        \\__ \\ |_| | | | | |_| | | | | (__| | (_| |  __/     
        |___/\\__, |_| |_|\\__|_| |_|_|\\___|_|\\__,_|\\___| 
             |___/                                      
      `,
      "color: #ffffff; font-weight: bold; font-size: 16px;", // Style for the header
      "color:rgb(222, 51, 3); font-weight: normal; font-size: 12px;" // Style for the ASCII art
  );

  // Add custom constants for configuration.
  CONFIG.SYNTHICIDE = SYNTHICIDE;

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: '1d10 + @attributes.dex.mod',
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
    gear: models.SynthicideGear,
    trait: models.SynthicideTrait,
    bioclass: models.SynthicideBioclass,
    feature: models.SynthicideFeature,
    aspect: models.SynthicideAspect,
    // legacy: spell items inherit from trait
    spell: models.SynthicideSpell,
  };
  CONFIG.Item.typeClasses = {
    bioclass: models.SynthicideBioclass,
    gear: models.SynthicideGear,
    trait: models.SynthicideTrait,
    feature: models.SynthicideFeature,
    aspect: models.SynthicideAspect,
    // legacy
    spell: models.SynthicideSpell,
    // Add other item types as needed
  };

  // Active Effects are never copied to the Actor,
  // but will still apply to the Actor from within the Item
  // if the transfer property on the Active Effect is true.
  CONFIG.ActiveEffect.legacyTransferral = false;

  // Register sheet application classes
  collections.Actors.unregisterSheet('core', sheets.ActorSheet);
  collections.Actors.unregisterSheet('core', foundry.applications.sheets.ActorSheetV2)
  collections.Actors.registerSheet('synthicide', SynthicideActorSheet, {
    types:["sharper", "NPC"],
    makeDefault: true,
    label: 'SYNTHICIDE.SheetLabels.Actor',
  });
  collections.Items.unregisterSheet('core', sheets.ItemSheet);
  collections.Items.registerSheet('synthicide', SynthicideItemSheet, {
    makeDefault: true,
    label: 'SYNTHICIDE.SheetLabels.Item',
  });
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
  // Conversion of legacy spell items to traits
  if (game.user.isGM) {
    const convertItem = async item => {
      if (item.type === 'spell') {
        const updates = { type: 'trait', 'system.traitType': 'spell' };
        if (item.system?.spellLevel !== undefined) updates['system.level'] = item.system.spellLevel;
        await item.update(updates);
      }
    };

    // World-level items
    for (const item of game.items.filter(i => i.type === 'spell')) {
      await convertItem(item);
    }

    // Actor-owned items
    for (const actor of game.actors) {
      for (const item of actor.items.filter(i => i.type === 'spell')) {
        await actor.updateEmbeddedDocuments('Item', [{ _id: item.id, type: 'trait', 'system.traitType': 'spell', 'system.level': item.system?.spellLevel }]);
      }
    }
  }

  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on('hotbarDrop', (bar, data, slot) => createDocMacro(data, slot));
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

  // Create the macro command using the uuid.
  const command = `game.synthicide.rollItemMacro("${data.uuid}");`;
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
    item.roll();
  });
}
