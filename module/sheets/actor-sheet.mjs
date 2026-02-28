import { prepareActiveEffectCategories } from '../helpers/effects.mjs';
import SYNTHICIDE from '../helpers/config.mjs';
const { api, sheets } = foundry.applications;

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheetV2}
 */
export class SynthicideActorSheet extends api.HandlebarsApplicationMixin(
  sheets.ActorSheetV2
) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ['synthicide', 'actor'],
    position: {
      width: 600,
      height: 600,
    },
    window: {
      resizable: true,
      icon: "fa-solid fa-person"
    },
    actions: {
      //onEditImage: this._onEditImage,
      viewDoc: this._viewDoc,
      createDoc: this._createDoc,
      deleteDoc: this._deleteDoc,
      showInfo: this._showInfo,
      toggleEffect: this._toggleEffect,
      roll: this._onRoll,
      increaseAttribute: this._onIncreaseAttribute,
      decreaseAttribute: this._onDecreaseAttribute,
      increaseCounter: this._onIncreaseCounter,
      decreaseCounter: this._onDecreaseCounter,
      editTraitItem: this._editTraitItem,
      deleteTraitItem: this._deleteTraitItem,
    },

    // Custom property that's merged into `this.options`
    // dragDrop: [{ dragSelector: '.draggable', dropSelector: null }],
    form: {
      submitOnChange: true,
    },
    sheetType: "SynthecideActorSheet"
  };

  /** @override */
  static PARTS = {
    header: {
      template: 'systems/synthicide/templates/actor/header.hbs',
    },
    tabs: {
      // Foundry-provided generic template
      template: 'templates/generic/tab-navigation.hbs',
    },
    // Bioclass tab (bioclass data and associated traits)
    bioclass: {
      template: 'systems/synthicide/templates/actor/bioclass-traits.hbs',
      scrollable: [""],
    },
    attributes: {
      template: 'systems/synthicide/templates/actor/attributes.hbs',
      scrollable: [""]
    },
    biography: {
      template: 'systems/synthicide/templates/actor/biography.hbs',
      scrollable: [""],
    },
    gear: {
      template: 'systems/synthicide/templates/actor/gear.hbs',
      scrollable: [""],
    },
    // Traits tab (leveled traits)
    traits: {
      template: 'systems/synthicide/templates/actor/traits.hbs',
      scrollable: [""],
    },
    cybernetics: {
      template: 'systems/synthicide/templates/actor/cybernetics.hbs',
      scrollable: [""],
    },
    effects: {
      template: 'systems/synthicide/templates/actor/effects.hbs',
      scrollable: [""],
    },
  };

  /** @override */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    // Not all parts always render
    options.parts = ['header', 'tabs'];
    // Don't show the other tabs if only limited view
    if (this.document.limited) return;
    // Control which parts show based on document subtype
    switch (this.document.type) {
      case 'sharper':
        options.parts.push(
          'attributes',
          'bioclass',
          'gear',
          'traits',
          'cybernetics',
          'biography',
          'effects'
        );
        break;
      case 'npc':
        options.parts.push('attributes', 'gear', 'biography', 'effects');
        break;
    }
      
  }

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    // Output initialization
    const context = {
      // Validates both permissions and compendium status
      editable: this.isEditable,
      owner: this.document.isOwner,
      limited: this.document.limited,
      // Add the actor document.
      actor: this.actor,
      // Add the actor's data to context.data for easier access, as well as flags.
      system: this.actor.system,
      flags: this.actor.flags,
      // Add both configs
      //config: CONFIG, // Foundry's global CONFIG
      SYNTHICIDE: SYNTHICIDE, // Your local config
      tabs: this._getTabs(options.parts),
      // Necessary for formInput and formFields helpers
      fields: this.document.schema.fields,
      systemFields: this.document.system.schema.fields,
    };

    // Calculate hpPercent for hit points bar coloring
    const hpValue = Number(context.system.hitPoints?.value ?? 0);
    const hpMax = Number(context.system.hitPoints?.max ?? 1);
    context.hpPercent = hpMax > 0 ? hpValue / hpMax : 0;

    // Motivation selectOptions and behaviors
    context.config = context.config || {};
    context.config.motivationOptions = Object.fromEntries(
      Object.entries(SYNTHICIDE.motivations).map(([k, v]) => [k, v.label])
    );
    context.config.motivationBehaviors = Object.fromEntries(
      Object.entries(SYNTHICIDE.motivations).map(([k, v]) => [k, v.behavior])
    );

    // Offloading item context prep to a helper function
    await this._prepareItems(context);

    return context;
  }

  /** @override */
  async _preparePartContext(partId, context) {
    switch (partId) {
      case 'bioclass':
      case 'attributes':
      case 'traits':
      case 'gear':
      case 'cybernetics':
        context.tab = context.tabs[partId];
        break;
      case 'biography':
        context.tab = context.tabs[partId];
        // Enrich biography info for display
        // Enrichment turns text like `[[/r 1d20]]` into buttons
        context.enrichedBiography = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
          this.actor.system.biography,
          {
            // Whether to show secret blocks in the finished html
            secrets: this.document.isOwner,
            // Data to fill in for inline rolls
            rollData: this.actor.getRollData(),
            // Relative UUID resolution
            relativeTo: this.actor,
          }
        );
        break;
      case 'effects':
        context.tab = context.tabs[partId];
        // Prepare active effects
        context.effects = prepareActiveEffectCategories(
          // A generator that returns all effects stored on the actor
          // as well as any items
          this.actor.allApplicableEffects()
        );
        break;
    }
    return context;
  }

  /**
   * Generates the data for the generic tab navigation template
   * @param {string[]} parts An array of named template parts to render
   * @returns {Record<string, Partial<ApplicationTab>>}
   * @protected
   */
  _getTabs(parts) {
    // If you have sub-tabs this is necessary to change
    const tabGroup = 'primary';
    // Default tab for first time it's rendered this session
    if (!this.tabGroups[tabGroup]) this.tabGroups[tabGroup] = 'attributes';
    return parts.reduce((tabs, partId) => {
      const tab = {
        cssClass: '',
        group: tabGroup,
        // Matches tab property to
        id: '',
        // FontAwesome Icon, if you so choose
        icon: '',
        // Run through localization
        label: 'SYNTHICIDE.Actor.Tabs.',
      };
      switch (partId) {
        case 'header':
        case 'tabs':
          return tabs;
        case 'attributes':
          tab.id = 'attributes';
          tab.label += 'Attributes';
          tab.icon = 'fa-solid fa-star';
          break;
        case 'gear':
          tab.id = 'gear';
          tab.label += 'Gear';
          tab.icon = 'fa-solid fa-toolbox';
          break;
        case 'traits':
          tab.id = 'traits';
          tab.label += 'Traits';
          tab.icon = 'fa-solid fa-certificate';
          break;
        case 'bioclass':
          tab.id = 'bioclass';
          tab.label += 'Bioclass';
          tab.icon = 'fa-solid fa-dna';
          break;
        case 'cybernetics':
          tab.id = 'cybernetics';
          tab.label += 'Cybernetics';
          tab.icon = 'fa-solid fa-microchip';
          break;
        case 'biography':
          tab.id = 'biography';
          tab.label += 'Biography';
          tab.icon = 'fa-solid fa-user';
          break;
        case 'effects':
          tab.id = 'effects';
          tab.label += 'Effects';
          tab.icon = 'fa-solid fa-bolt';
          break;
      }
      if (this.tabGroups[tabGroup] === tab.id) tab.cssClass = 'active';
      tabs[partId] = tab;
      return tabs;
    }, {});
  }

  /**
   * Organize and classify Items for Actor sheets.
   *
   * @param {object} context The context object to mutate
   */
  async _prepareItems(context) {
    // Initialize containers.
    const gear = [];
    let bioclass = null; // reassigned when a bioclass item is found
    const bioclassTraits = [];
    const traitsByLevel = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
      7: [],
      8: [],
      9: [],
    };

    // Iterate through items, allocating to containers
    for (let i of this.document.items) {
      if (i.type === 'gear') {
        gear.push(i);
      }
      else if (i.type === 'trait') {
        // Enrich description for display
        i.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
          i.system.description || '',
          {
            secrets: this.document.isOwner,
            rollData: this.actor.getRollData(),
            relativeTo: this.actor
          }
        );
        // Separate bioclass traits from those that have levels
        if (i.system.traitType === 'bioclass') {
          bioclassTraits.push(i);
        } else {
          const lvl = Number(i.system.level ?? 0);
          if (!traitsByLevel[lvl]) traitsByLevel[lvl] = [];
          traitsByLevel[lvl].push(i);
        }
      }
      else if (i.type === 'bioclass' && !bioclass) {
        bioclass = i;
      }
    }

    // Sort each level list
    for (const s of Object.values(traitsByLevel)) {
      s.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    }

    // Sort then assign
    context.gear = gear.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    context.bioclassTraits = bioclassTraits.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    context.traitsByLevel = traitsByLevel;
    context.bioclass = bioclass;
  }

  /**
   * Actions performed after any render of the Application.
   * Post-render steps are not awaited by the render process.
   * @param {ApplicationRenderContext} context      Prepared context data
   * @param {RenderOptions} options                 Provided render options
   * @protected
   * @override
   */
  async _onRender(context, options) {
    await super._onRender(context, options);
    this.#disableOverrides();
    // You may want to add other special handling here
    // Foundry comes with a large number of utility classes, e.g. SearchFilter
    // That you may want to implement yourself.
  }

  /**************
   *
   *   ACTIONS
   *
   **************/

  /**
   * Handle changing a Document's image.
   *
   * @this SynthicideActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @returns {Promise}
   * @protected
   */
  /*static async _onEditImage(event, target) {
    const attr = target.dataset.edit;
    const current = foundry.utils.getProperty(this.document, attr);
    const { img } =
      this.document.constructor.getDefaultArtwork?.(this.document.toObject()) ??
      {};
    const fp = new foundry.applications.apps.FilePicker.implementation({
      current,
      type: 'image',
      redirectToRoot: img ? [img] : [],
      callback: (path) => {
        this.document.update({ [attr]: path });
      },
      top: this.position.top + 40,
      left: this.position.left + 10,
    });
    return fp.browse();
  }*/

  /**
   * Renders an embedded document's sheet
   *
   * @this SynthicideActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _viewDoc(event, target) {
    const doc = this._getEmbeddedDocument(target);
    doc.sheet.render(true);
  }

  /**
   * Handles item deletion
   *
   * @this SynthicideActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _deleteDoc(event, target) {
    const doc = this._getEmbeddedDocument(target);
    await doc.delete();
  }

  /**
   * Show a simple dialog containing the description of an embedded document.
   * This is used by the read‑only info buttons on the various actor tabs.
   *
   * @this SynthicideActorSheet
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   * @private
   */
  static async _showInfo(event, target) {
    const doc = this._getEmbeddedDocument(target);
    if (!doc) return;
    const desc = doc.system?.description || '';
    const title = doc.name || game.i18n.localize('SYNTHICIDE.Info');

    try {
      await foundry.applications.api.DialogV2.prompt({
        window: { title },
        content: `<div class="synthicide-info">${desc}</div>`,
        ok: {
          label: game.i18n.localize('OK'),
          callback: () => true
        }
      });
    } catch {
      // user closed the dialog without clicking OK – ignore
    }
  }


  /**
   * Handle creating a new Owned Item or ActiveEffect for the actor using initial data defined in the HTML dataset
   *
   * @this SynthicideActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @private
   */
  static async _createDoc(event, target) {
    // Retrieve the configured document class for Item or ActiveEffect
    const docCls = getDocumentClass(target.dataset.documentClass);
    // Prepare the document creation data by initializing it a default name.
    const docData = {
      name: docCls.defaultName({
        // defaultName handles an undefined type gracefully
        type: target.dataset.type,
        parent: this.actor,
      }),
    };
    // Loop through the dataset and add it to our docData
    for (const [dataKey, value] of Object.entries(target.dataset)) {
      // These data attributes are reserved for the action handling
      if (['action', 'documentClass', 'tooltip'].includes(dataKey)) continue;
      // Nested properties require dot notation in the HTML, e.g. anything with `system`
      // An example exists in spells.hbs, with `data-system.spell-level`
      // which turns into the dataKey 'system.spellLevel'
      foundry.utils.setProperty(docData, dataKey, value);
    }

    // Finally, create the embedded document!
    await docCls.create(docData, { parent: this.actor });
  }

  /**
   * Determines effect parent to pass to helper
   *
   * @this SynthicideActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @private
   */
  static async _toggleEffect(event, target) {
    const effect = this._getEmbeddedDocument(target);
    await effect.update({ disabled: !effect.disabled });
  }

  /**
   * Handle clickable rolls.
   *
   * @this SynthicideActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _onRoll(event, target) {
    event.preventDefault();
    const dataset = target.dataset;

    // Handle item rolls.
    switch (dataset.rollType) {
      case 'item': {
        const item = this._getEmbeddedDocument(target);
        if (item) return item.roll();
      }
    }

    // Handle rolls that supply the formula directly.
    if (dataset.roll) {
      let label = dataset.label ? `[attribute] ${dataset.label}` : '';
      let roll = new Roll(dataset.roll, this.actor.getRollData());
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label,
        rollMode: game.settings.get('core', 'rollMode'),
      });
      return roll;
    }
  }

  /**
   * Increase an attribute's level increase value by 1.
   * @this SynthicideActorSheet
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   * @protected
   */
  static async _onIncreaseAttribute(event, target) {
    event.preventDefault();
    event.stopPropagation();
    const key =
      target.dataset.attributeKey ||
      target.closest('[data-attribute-key]')?.dataset.attributeKey ||
      target.closest('.attribute-stepper')?.dataset.attributeKey;
    if (!key) return;
    const path = `system.attributes.${key}.increase`;
    const current = Number(foundry.utils.getProperty(this.actor.system, `attributes.${key}.increase`) ?? 0);
    const next = Math.min(5, current + 1);
    await this.actor.update({ [path]: next });
  }

  /**
   * Decrease an attribute's level increase value by 1.
   * @this SynthicideActorSheet
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   * @protected
   */
  static async _onDecreaseAttribute(event, target) {
    event.preventDefault();
    event.stopPropagation();
    const key =
      target.dataset.attributeKey ||
      target.closest('[data-attribute-key]')?.dataset.attributeKey ||
      target.closest('.attribute-stepper')?.dataset.attributeKey;
    if (!key) return;
    const path = `system.attributes.${key}.increase`;
    const current = Number(foundry.utils.getProperty(this.actor.system, `attributes.${key}.increase`) ?? 0);
    const next = Math.max(0, current - 1);
    await this.actor.update({ [path]: next });
  }

  /** @protected */
  static async _onIncreaseCounter(event, target) {
    event.preventDefault();
    event.stopPropagation();
    const key = target.dataset.counterKey || target.closest('[data-counter-key]')?.dataset.counterKey;
    let path, current, max;
    switch (key) {
      case "resolve":
        path = "system.resolve";
        current = Number(this.actor.system.resolve ?? 0);
        max = 5;
        break;
      case "cynicism":
        path = "system.cynicism";
        current = Number(this.actor.system.cynicism ?? 0);
        max = 10;
        break;
      case "foodDays":
        path = "system.foodDays.value";
        current = Number(this.actor.system.foodDays.value ?? 0);
        max = undefined;
        break;
      // Add more cases as needed
      default:
        return;
    }
    const next = max !== undefined ? Math.min(max, current + 1) : current + 1;
    await this.actor.update({ [path]: next });
  }

  /** @protected */
  static async _onDecreaseCounter(event, target) {
    event.preventDefault();
    event.stopPropagation();
    const key = target.dataset.counterKey || target.closest('[data-counter-key]')?.dataset.counterKey;
    let path, current, min;
    switch (key) {
      case "resolve":
        path = "system.resolve";
        current = Number(this.actor.system.resolve ?? 0);
        min = 0;
        break;
      case "cynicism":
        path = "system.cynicism";
        current = Number(this.actor.system.cynicism ?? 0);
        min = 0;
        break;
      case "foodDays":
        path = "system.foodDays.value";
        current = Number(this.actor.system.foodDays.value ?? 0);
        min = this.actor.system.foodDays.min;
        break;
      // Add more cases as needed
      default:
        return;
    }
    const next = Math.max(min, current - 1);
    await this.actor.update({ [path]: next });
  }
  /**
   * Open the trait item sheet for editing
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async _editTraitItem(event, target) {
    event.preventDefault();
    const itemId = target.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (item) item.sheet.render(true);
  }

  /**
   * Delete the trait item from the actor
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async _deleteTraitItem(event, target) {
    event.preventDefault();
    const itemId = target.dataset.itemId;
    await this.actor.deleteEmbeddedDocuments('Item', [itemId]);
  }

  /** Helper Functions */

  /**
   * Fetches the embedded document representing the containing HTML element
   *
   * @param {HTMLElement} target    The element subject to search
   * @returns {Item | ActiveEffect} The embedded Item or ActiveEffect
   */
  _getEmbeddedDocument(target) {
    const docRow = target.closest('li[data-document-class]');
    if (docRow.dataset.documentClass === 'Item') {
      return this.actor.items.get(docRow.dataset.itemId);
    } else if (docRow.dataset.documentClass === 'ActiveEffect') {
      const parent =
        docRow.dataset.parentId === this.actor.id
          ? this.actor
          : this.actor.items.get(docRow?.dataset.parentId);
      return parent.effects.get(docRow?.dataset.effectId);
    } else return console.warn('Could not find document class');
  }

  /***************
   *
   * Drag and Drop
   *
   ***************/

  /**
   * Handle the dropping of ActiveEffect data onto an Actor Sheet
   * @param {DragEvent} event                  The concluding DragEvent which contains drop data
   * @param {object} data                      The data transfer extracted from the event
   * @returns {Promise<ActiveEffect|boolean>}  The created ActiveEffect object or false if it couldn't be created.
   * @protected
   */
  async _onDropActiveEffect(event, data) {
    const aeCls = getDocumentClass('ActiveEffect');
    const effect = await aeCls.fromDropData(data);
    if (!this.actor.isOwner || !effect) return false;
    if (effect.target === this.actor)
      return this._onSortActiveEffect(event, effect);
    return aeCls.create(effect, { parent: this.actor });
  }

  /**
   * Handle a drop event for an existing embedded Active Effect to sort that Active Effect relative to its siblings
   *
   * @param {DragEvent} event
   * @param {ActiveEffect} effect
   */
  async _onSortActiveEffect(event, effect) {
    /** @type {HTMLElement} */
    const dropTarget = event.target.closest('[data-effect-id]');
    if (!dropTarget) return;
    const target = this._getEmbeddedDocument(dropTarget);

    // Don't sort on yourself
    if (effect.uuid === target.uuid) return;

    // Identify sibling items based on adjacent HTML elements
    const siblings = [];
    for (const el of dropTarget.parentElement.children) {
      const siblingId = el.dataset.effectId;
      const parentId = el.dataset.parentId;
      if (
        siblingId &&
        parentId &&
        (siblingId !== effect.id || parentId !== effect.parent.id)
      )
        siblings.push(this._getEmbeddedDocument(el));
    }

    // Perform the sort
    const sortUpdates = SortingHelpers.performIntegerSort(effect, {
      target,
      siblings,
    });

    // Split the updates up by parent document
    const directUpdates = [];

    const grandchildUpdateData = sortUpdates.reduce((items, u) => {
      const parentId = u.target.parent.id;
      const update = { _id: u.target.id, ...u.update };
      if (parentId === this.actor.id) {
        directUpdates.push(update);
        return items;
      }
      if (items[parentId]) items[parentId].push(update);
      else items[parentId] = [update];
      return items;
    }, {});

    // Effects-on-items updates
    for (const [itemId, updates] of Object.entries(grandchildUpdateData)) {
      await this.actor.items
        .get(itemId)
        .updateEmbeddedDocuments('ActiveEffect', updates);
    }

    // Update on the main actor
    return this.actor.updateEmbeddedDocuments('ActiveEffect', directUpdates);
  }

  /**
   * Handle dropping of an Actor data onto another Actor sheet
   * @param {DragEvent} event            The concluding DragEvent which contains drop data
   * @param {object} data                The data transfer extracted from the event
   * @returns {Promise<object|boolean>}  A data object which describes the result of the drop, or false if the drop was
   *                                     not permitted.
   * @protected
   */
  async _onDropActor(_event, _data) {
    if (!this.actor.isOwner) return false;
  }

  /* -------------------------------------------- */

  /**
   * Handle dropping of a Folder on an Actor Sheet.
   * The core sheet currently supports dropping a Folder of Items to create all items as owned items.
   * @param {DragEvent} event     The concluding DragEvent which contains drop data
   * @param {object} data         The data transfer extracted from the event
   * @returns {Promise<Item[]>}
   * @protected
   */
  async _onDropFolder(event, data) {
    if (!this.actor.isOwner) return [];
    const folder = await Folder.implementation.fromDropData(data);
    if (folder.type !== 'Item') return [];
    const droppedItemData = await Promise.all(
      folder.contents.map(async (item) => {
        if (!(item instanceof Item)) item = await fromUuid(item.uuid);
        return item;
      })
    );
    return this._onDropItemCreate(droppedItemData, event);
  }

  /**
   * Generic drop handler for items, folders, actors, and effects
   * @param {DragEvent} event
   * @returns {Promise}
   */
  async _onDrop(event) {
    event.preventDefault();
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if (!data) return;
    switch (data.type) {
      case 'ActiveEffect':
        return this._onDropActiveEffect(event, data);
      case 'Actor':
        return this._onDropActor(event, data);
      case 'Folder':
        return this._onDropFolder(event, data);
      case 'Item': {
        let itemObj = data;
        if (data.uuid) {
          const doc = await fromUuid(data.uuid);
          if (doc) itemObj = doc.toObject();
        }
        return this._onDropItemCreate([itemObj], event);
      }
      default:
        return;
    }
  }

  /**
   * Handle the final creation of dropped Item data on the Actor.
   * This method is factored out to allow downstream classes the opportunity to override item creation behavior.
   * @param {object[]|object} itemData      The item data requested for creation
   * @param {DragEvent} event               The concluding DragEvent which provided the drop data
   * @returns {Promise<Item[]>}
   * @private
   */
  async _onDropItemCreate(itemData, _event) {
    itemData = itemData instanceof Array ? itemData : [itemData];
    const resolvedData = await Promise.all(itemData.map(async entry => {
      if (entry.uuid) {
        const doc = await fromUuid(entry.uuid);
        return doc ? doc.toObject() : entry;
      }
      return entry instanceof Item ? entry.toObject() : { ...entry };
    }));
    const bioclassEntries = resolvedData.filter(entryData => entryData.type === 'bioclass');
    const otherEntries = resolvedData.filter(entryData => entryData.type !== 'bioclass');

    if (bioclassEntries.length) {
      return await this._handleBioclassDrop(bioclassEntries[0], otherEntries);
    } else {
      return await this._handleGenericItemDrop(otherEntries);
    }
  }

  /**
   * Handle dropping a bioclass item.
   * UI only triggers bioclass creation/deletion; trait logic is handled in item hooks.
   * @param {object} bioclassEntry - The bioclass item data
   * @param {object[]} otherEntries - Other item data to create
   * @returns {Promise<Item[]>}
   */
  async _handleBioclassDrop(bioclassEntry, otherEntries) {
    // Delete old bioclass item(s) to trigger _onDelete and trait cleanup in item-bioclass.mjs
    const oldBioclassIds = this.actor.itemTypes.bioclass.map(b => b.id);
    if (oldBioclassIds.length) {
      await this.actor.deleteEmbeddedDocuments('Item', oldBioclassIds);
    }
    // Create new bioclass item (triggers _onCreate in item-bioclass.mjs)
    const bioclassData = { ...bioclassEntry };
    const [createdBioclass] = await this.actor.createEmbeddedDocuments('Item', [bioclassData]);
    const bioclassItem = this.actor.items.get(createdBioclass.id);
    // Create other dropped items (non-bioclass)
    if (otherEntries.length) {
      await this.actor.createEmbeddedDocuments('Item', otherEntries);
    }
    return [bioclassItem];
  }

  /**
   * Handle dropping generic items (non-bioclass)
   * @param {object[]} itemData - Array of item data to create
   * @returns {Promise<Item[]>}
   */
  async _handleGenericItemDrop(itemData) {
    if (!itemData.length) return [];
    const created = await this.actor.createEmbeddedDocuments('Item', itemData);
    return created;
  }

  /********************
   *
   * Actor Override Handling
   *
   ********************/

  /**
   * Submit a document update based on the processed form data.
   * @param {SubmitEvent} event                   The originating form submission event
   * @param {HTMLFormElement} form                The form element that was submitted
   * @param {object} submitData                   Processed and validated form data to be used for a document update
   * @returns {Promise<void>}
   * @protected
   * @override
   */
  async _processSubmitData(event, form, submitData) {
    const overrides = foundry.utils.flattenObject(this.actor.overrides);
    for (let k of Object.keys(overrides)) delete submitData[k];
    await this.document.update(submitData);
  }

  /**
   * Disables inputs subject to active effects
   */
  #disableOverrides() {
    const flatOverrides = foundry.utils.flattenObject(this.actor.overrides);
    for (const override of Object.keys(flatOverrides)) {
      const input = this.element.querySelector(`[name="${override}"]`);
      if (input) {
        input.disabled = true;
      }
    }
  }
}
