import { prepareActiveEffectCategories } from '../helpers/effects.mjs';
import SYNTHICIDE from '../helpers/config.mjs';

const { api, sheets } = foundry.applications;
const DragDrop = foundry.applications.ux.DragDrop;

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheetV2}
 */
export class SynthicideItemSheet extends api.HandlebarsApplicationMixin(sheets.ItemSheetV2) {
  constructor(options = {}) {
    super(options);
  }

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ['synthicide', 'item'],
    actions: {
      onEditImage: this._onEditImage,
      viewDoc: this._viewEffect,
      createDoc: this._createEffect,
      deleteDoc: this._deleteEffect,
      toggleEffect: this._toggleEffect,
      addModifier: this._onAddModifier,
      removeModifier: this._onRemoveModifier,
      addTrait: this._onAddTrait,
      removeTrait: this._onRemoveTrait,
    },
    form: {
      submitOnChange: true,
    },
    dragDrop: [{ dragSelector: '.draggable', dropSelector: null }],
  };
  /**
   * Handle adding a new modifier row to the feature item.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async _onAddModifier(event, _target) {
    event.preventDefault();
    const item = this.item;
    const modifiers = Array.isArray(item.system.modifiers) ? foundry.utils.deepClone(item.system.modifiers) : [];
    const defaultTarget = Object.keys(SYNTHICIDE.attributes)[0] ?? 'awareness';
    // Add a blank modifier
    modifiers.push({ target: defaultTarget, value: 0, type: 'bonus', condition: '', source: '' });
    await item.update({ 'system.modifiers': modifiers });
  }

  /**
   * Handle removing a modifier row from the feature item.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async _onRemoveModifier(event, target) {
    event.preventDefault();
    const item = this.item;
    const index = Number(target.dataset.index);
    let modifiers = Array.isArray(item.system.modifiers) ? foundry.utils.deepClone(item.system.modifiers) : [];
    if (index >= 0 && index < modifiers.length) {
      modifiers.splice(index, 1);
      await item.update({ 'system.modifiers': modifiers });
    }
  }

  /**
   * Handle adding a new trait row to the bioclass item.
   * @param {PointerEvent} event
   */
  static async _onAddTrait(event) {
    event.preventDefault();
    const item = this.item;
    const traits = Array.isArray(item.system.traits)
      ? foundry.utils.deepClone(item.system.traits)
      : [];
    const maxSort = traits.reduce(
      (max, trait) => Math.max(max, Number(trait?.sort ?? 0)),
      0
    );
    traits.push({ sort: maxSort + 10, name: '', description: '' });
    await item.update({ 'system.traits': traits });
  }

  /**
   * Handle removing a trait row from the bioclass item.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async _onRemoveTrait(event, target) {
    event.preventDefault();
    const item = this.item;
    const index = Number(target.dataset.index);
    const traits = Array.isArray(item.system.traits)
      ? foundry.utils.deepClone(item.system.traits)
      : [];
    if (index >= 0 && index < traits.length) {
      traits.splice(index, 1);
      await item.update({ 'system.traits': traits });
    }
  }

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    header: {
      template: 'systems/synthicide/templates/item/header.hbs',
    },
    tabs: {
      // Foundry-provided generic template
      template: 'templates/generic/tab-navigation.hbs',
    },
    description: {
      template: 'systems/synthicide/templates/item/description.hbs',
    },
    attributesFeature: {
      template:
        'systems/synthicide/templates/item/attribute-parts/feature.hbs',
    },
    attributesGear: {
      template: 'systems/synthicide/templates/item/attribute-parts/gear.hbs',
    },
    attributesSpell: {
      template: 'systems/synthicide/templates/item/attribute-parts/spell.hbs',
    },
    attributesBioclass: {
      template:
        'systems/synthicide/templates/item/attribute-parts/bioclass-attributes.hbs',
    },
    cyberneticsBioclass: {
      template:
        'systems/synthicide/templates/item/attribute-parts/bioclass-cybernetics.hbs',
    },
    traitsBioclass: {
      template:
        'systems/synthicide/templates/item/attribute-parts/bioclass-traits.hbs',
    },
    effects: {
      template: 'systems/synthicide/templates/item/effects.hbs',
    },
  };

  /** @override */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    // Not all parts always render
    options.parts = ['header', 'tabs', 'description'];
    // Don't show the other tabs if only limited view
    if (this.document.limited) return;
    // Control which parts show based on document subtype
    switch (this.document.type) {
      case 'feature':
        options.parts.push('attributesFeature', 'effects');
        break;
      case 'gear':
        options.parts.push('attributesGear');
        break;
      case 'spell':
        options.parts.push('attributesSpell');
        break;
      case 'bioclass':
        options.parts.push(
          'attributesBioclass',
          'cyberneticsBioclass',
          'traitsBioclass'
        );
        break;
    }
  }

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = {
      // Validates both permissions and compendium status
      editable: this.isEditable,
      owner: this.document.isOwner,
      limited: this.document.limited,
      // Add the item document.
      item: this.item,
      // Adding system and flags for easier access
      system: this.item.system,
      flags: this.item.flags,
      // Adding a pointer to SYNTHICIDE
      SYNTHICIDE: SYNTHICIDE,
      //config: CONFIG,
      // You can factor out context construction to helper functions
      tabs: this._getTabs(options.parts),
      // Necessary for formInput and formFields helpers
      fields: this.document.schema.fields,
      systemFields: this.document.system.schema.fields,
    };

    return context;
  }

  /** @override */
  async _preparePartContext(partId, context) {
    switch (partId) {
      case 'attributesFeature':
      case 'attributesGear':
      case 'attributesSpell':
      case 'attributesBioclass':
      case 'cyberneticsBioclass':
      case 'traitsBioclass':
        // Necessary for preserving active tab on re-render
        context.tab = context.tabs[partId];
        break;
      case 'description':
        context.tab = context.tabs[partId];
        // Enrich description info for display
        // Enrichment turns text like `[[/r 1d20]]` into buttons
        context.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
          this.item.system.description,
          {
            // Whether to show secret blocks in the finished html
            secrets: this.document.isOwner,
            // Data to fill in for inline rolls
            rollData: this.item.getRollData(),
            // Relative UUID resolution
            relativeTo: this.item,
          }
        );
        break;
      case 'effects':
        context.tab = context.tabs[partId];
        // Prepare active effects for easier access
        context.effects = prepareActiveEffectCategories(this.item.effects);
        break;
    }
    return context;
  }

  /** @override */
  async _processSubmitData(event, form, submitData) {
    if (this.item.type === 'bioclass') {
      const nextType = foundry.utils.getProperty(submitData, 'system.bioclassType');
      const currentType = this.item.system.bioclassType;
      if (nextType && nextType !== currentType) {
        const preset = SYNTHICIDE.getBioclassPreset(nextType);
        foundry.utils.setProperty(
          submitData,
          'system.startingAttributes',
          foundry.utils.deepClone(preset.startingAttributes)
        );
        foundry.utils.setProperty(submitData, 'system.bodySlots', preset.bodySlots);
        foundry.utils.setProperty(submitData, 'system.brainSlots', preset.brainSlots);
        foundry.utils.setProperty(
          submitData,
          'system.traits',
          foundry.utils.deepClone(preset.traits)
        );
      }
    }

    await this.document.update(submitData);
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
    if (!this.tabGroups[tabGroup]) this.tabGroups[tabGroup] = 'description';
    return parts.reduce((tabs, partId) => {
      const tab = {
        cssClass: '',
        group: tabGroup,
        // Matches tab property to
        id: '',
        // FontAwesome Icon, if you so choose
        icon: '',
        // Run through localization
        label: 'SYNTHICIDE.Item.Tabs.',
      };
      switch (partId) {
        case 'header':
        case 'tabs':
          return tabs;
        case 'description':
          tab.id = 'description';
          tab.label += 'Description';
          tab.icon = 'fa-solid fa-align-left';
          break;
        case 'attributesFeature':
        case 'attributesGear':
        case 'attributesSpell':
          tab.id = 'attributes';
          tab.label += 'Attributes';
          tab.icon = 'fa-solid fa-list';
          break;
        case 'attributesBioclass':
          tab.id = 'attributes';
          tab.label += 'Attributes';
          tab.icon = 'fa-solid fa-list';
          break;
        case 'cyberneticsBioclass':
          tab.id = 'cybernetics';
          tab.label += 'Cybernetics';
          tab.icon = 'fa-solid fa-microchip';
          break;
        case 'traitsBioclass':
          tab.id = 'traits';
          tab.label += 'Traits';
          tab.icon = 'fa-solid fa-dna';
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
   * Actions performed after any render of the Application.
   * Post-render steps are not awaited by the render process.
   * @param {ApplicationRenderContext} context      Prepared context data
   * @param {RenderOptions} options                 Provided render options
   * @protected
   */
  async _onRender(context, options) {
    await super._onRender(context, options);
    new DragDrop.implementation({
      dragSelector: ".draggable",
      dropSelector: null,
      permissions: {
        dragstart: this._canDragStart.bind(this),
        drop: this._canDragDrop.bind(this)
      },
      callbacks: {
        dragstart: this._onDragStart.bind(this),
        dragover: this._onDragOver.bind(this),
        drop: this._onDrop.bind(this)
      }
    }).bind(this.element);
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
   * @this SynthicideItemSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @returns {Promise}
   * @protected
   */
  static async _onEditImage(event, target) {
    const attr = target.dataset.edit;
    const current = foundry.utils.getProperty(this.document, attr);
    const { img } =
      this.document.constructor.getDefaultArtwork?.(this.document.toObject()) ??
      {};
    const fp = new FilePicker({
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
  }

  /**
   * Renders an embedded document's sheet
   *
   * @this SynthicideItemSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _viewEffect(event, target) {
    const effect = this._getEffect(target);
    effect.sheet.render(true);
  }

  /**
   * Handles item deletion
   *
   * @this SynthicideItemSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _deleteEffect(event, target) {
    const effect = this._getEffect(target);
    await effect.delete();
  }

  /**
   * Handle creating a new Owned Item or ActiveEffect for the actor using initial data defined in the HTML dataset
   *
   * @this SynthicideItemSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @private
   */
  static async _createEffect(event, target) {
    // Retrieve the configured document class for ActiveEffect
    const aeCls = getDocumentClass('ActiveEffect');
    // Prepare the document creation data by initializing it a default name.
    // As of v12, you can define custom Active Effect subtypes just like Item subtypes if you want
    const effectData = {
      name: aeCls.defaultName({
        // defaultName handles an undefined type gracefully
        type: target.dataset.type,
        parent: this.item,
      }),
    };
    // Loop through the dataset and add it to our effectData
    for (const [dataKey, value] of Object.entries(target.dataset)) {
      // These data attributes are reserved for the action handling
      if (['action', 'documentClass'].includes(dataKey)) continue;
      // Nested properties require dot notation in the HTML, e.g. anything with `system`
      // An example exists in spells.hbs, with `data-system.spell-level`
      // which turns into the dataKey 'system.spellLevel'
      foundry.utils.setProperty(effectData, dataKey, value);
    }

    // Finally, create the embedded document!
    await aeCls.create(effectData, { parent: this.item });
  }

  /**
   * Determines effect parent to pass to helper
   *
   * @this SynthicideItemSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @private
   */
  static async _toggleEffect(event, target) {
    const effect = this._getEffect(target);
    await effect.update({ disabled: !effect.disabled });
  }

  /** Helper Functions */

  /**
   * Fetches the row with the data for the rendered embedded document
   *
   * @param {HTMLElement} target  The element with the action
   * @returns {HTMLLIElement} The document's row
   */
  _getEffect(target) {
    const li = target.closest('.effect');
    return this.item.effects.get(li?.dataset?.effectId);
  }

  /**
   *
   * DragDrop
   *
   */

  /**
   * Define whether a user is able to begin a dragstart workflow for a given drag selector
   * @param {string} selector       The candidate HTML selector for dragging
   * @returns {boolean}             Can the current user drag this selector?
   * @protected
   */
  _canDragStart(_selector) {
    // game.user fetches the current user
    return this.isEditable;
  }

  /**
   * Define whether a user is able to conclude a drag-and-drop workflow for a given drop selector
   * @param {string} selector       The candidate HTML selector for the drop target
   * @returns {boolean}             Can the current user drop on this selector?
   * @protected
   */
  _canDragDrop(_selector) {
    // game.user fetches the current user
    return this.isEditable;
  }

  /**
   * Callback actions which occur at the beginning of a drag start workflow.
   * @param {DragEvent} event       The originating DragEvent
   * @protected
   */
  _onDragStart(event) {
    const li = event.currentTarget;
    if ('link' in event.target.dataset) return;

    let dragData = null;

    // Active Effect
    if (li.dataset.effectId) {
      const effect = this.item.effects.get(li.dataset.effectId);
      dragData = effect.toDragData();
    }

    if (!dragData) return;

    // Set data transfer
    event.dataTransfer.setData('text/plain', JSON.stringify(dragData));
  }

  /**
   * Callback actions which occur when a dragged element is over a drop target.
   * @param {DragEvent} event       The originating DragEvent
   * @protected
   */
  _onDragOver(_event) { }

  /**
   * Callback actions which occur when a dragged element is dropped on a target.
   * @param {DragEvent} event       The originating DragEvent
   * @protected
   */
  async _onDrop(event) {
    const data = TextEditor.getDragEventData(event);
    const item = this.item;
    const allowed = Hooks.call('dropItemSheetData', item, this, data);
    if (allowed === false) return;

    // Although you will find implmentations to all doc types here, it is important to keep 
    // in mind that only Active Effects are "valid" for items.
    // Actors have items, but items do not have actors.
    // Items in items is not implemented on Foudry per default. If you need an implementation with that,
    // try to search how other systems do. Basically they will use the drag and drop, but they will store
    // the UUID of the item.
    // Folders can only contain Actors or Items. So, fall on the cases above.
    // We left them here so you can have an idea of how that would work, if you want to do some kind of
    // implementation for that.
    switch (data.type) {
      case 'ActiveEffect':
        return this._onDropActiveEffect(event, data);
      case 'Actor':
        return this._onDropActor(event, data);
      case 'Item':
        return this._onDropItem(event, data);
      case 'Folder':
        return this._onDropFolder(event, data);
    }
  }

  /* -------------------------------------------- */

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
    if (!this.item.isOwner || !effect) return false;

    if (this.item.uuid === effect.parent?.uuid)
      return this._onEffectSort(event, effect);
    return aeCls.create(effect, { parent: this.item });
  }

  /**
   * Sorts an Active Effect based on its surrounding attributes
   *
   * @param {DragEvent} event
   * @param {ActiveEffect} effect
   */
  _onEffectSort(event, effect) {
    const effects = this.item.effects;
    const dropTarget = event.target.closest('[data-effect-id]');
    if (!dropTarget) return;
    const target = effects.get(dropTarget.dataset.effectId);

    // Don't sort on yourself
    if (effect.id === target.id) return;

    // Identify sibling items based on adjacent HTML elements
    const siblings = [];
    for (let el of dropTarget.parentElement.children) {
      const siblingId = el.dataset.effectId;
      if (siblingId && siblingId !== effect.id)
        siblings.push(effects.get(el.dataset.effectId));
    }

    // Perform the sort
    const sortUpdates = SortingHelpers.performIntegerSort(effect, {
      target,
      siblings,
    });
    const updateData = sortUpdates.map((u) => {
      const update = u.update;
      update._id = u.target._id;
      return update;
    });

    // Perform the update
    return this.item.updateEmbeddedDocuments('ActiveEffect', updateData);
  }

  /* -------------------------------------------- */

  /**
   * Handle dropping of an Actor data onto another Actor sheet
   * @param {DragEvent} event            The concluding DragEvent which contains drop data
   * @param {object} data                The data transfer extracted from the event
   * @returns {Promise<object|boolean>}  A data object which describes the result of the drop, or false if the drop was
   *                                     not permitted.
   * @protected
   */
  async _onDropActor(_event, _data) {
    if (!this.item.isOwner) return false;
  }

  /* -------------------------------------------- */

  /**
   * Handle dropping of an item reference or item data onto an Actor Sheet
   * @param {DragEvent} event            The concluding DragEvent which contains drop data
   * @param {object} data                The data transfer extracted from the event
   * @returns {Promise<Item[]|boolean>}  The created or updated Item instances, or false if the drop was not permitted.
   * @protected
   */
  async _onDropItem(_event, _data) {
    if (!this.item.isOwner) return false;
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
  async _onDropFolder(_event, _data) {
    if (!this.item.isOwner) return [];
  }
}
