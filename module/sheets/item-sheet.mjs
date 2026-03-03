import { prepareActiveEffectCategories } from '../helpers/effects.mjs';
import SYNTHICIDE from '../helpers/config.mjs';
import { FEATURE_TYPE } from '../helpers/feature-types.mjs';
import { assignTabContext, buildBaseSheetContext, buildTabs, enrichSheetHtml } from './sheet-context.mjs';
import { mutateSystemArray, removeSystemArrayIndex } from './sheet-utils.mjs';
import { getItemIcon, ICON_MAP } from '../helpers/icons.mjs';

const { api, sheets } = foundry.applications;
const DragDrop = foundry.applications.ux.DragDrop;

/**
 * Base parts enabled directly from document.type.
 *
 * Usage:
 * - _configureRenderOptions always starts with ['header', 'tabs', 'general'].
 * - Then it appends ITEM_BASE_PARTS_BY_TYPE[this.document.type].
 * - Keep keys aligned with actual item document types.
 *
 * Important: this map answers "what parts should render for this.item.type?"
 *
 * This map is the single source of truth for item sheet part selection.
 */
const ITEM_BASE_PARTS_BY_TYPE = {
  trait: ['attributesTrait'],
  gear: ['attributesGear'],
  bioclass: ['attributesBioclass', 'cyberneticsBioclass', 'traitsBioclass'],
  aspect: ['abilitiesAspect', 'traitsBioclass'],
};

/**
 * Tab metadata map for item sheet parts.
 *
 * Rules:
 * - Key must match a render part id.
 * - id is the logical tab id shown/activated by tab-navigation.hbs.
 * - Multiple parts can share one id (for example all attribute part variants).
 *
 * To add a new item tab or part:
 * 1) Add part template in static PARTS.
 * 2) Add part id in ITEM_BASE_PARTS_BY_TYPE.
 * 3) Add matching entry here in ITEM_TAB_MAP.
 * 4) Add localization key under SYNTHICIDE.Item.Tabs.<Label>.
 */
const ITEM_TAB_MAP = {
  general: { id: 'general', icon: ICON_MAP.general, label: 'General' },
  attributesTrait: { id: 'attributes', icon: ICON_MAP.attributes, label: 'Attributes' },
  attributesGear: { id: 'attributes', icon: ICON_MAP.attributes, label: 'Attributes' },
  attributesBioclass: { id: 'attributes', icon: ICON_MAP.attributes, label: 'Attributes' },
  cyberneticsBioclass: { id: 'cybernetics', icon: ICON_MAP.cybernetics, label: 'Cybernetics' },
  traitsBioclass: { id: 'traits', icon: ICON_MAP.trait, label: 'Traits' },
  abilitiesAspect: { id: 'abilities', icon: ICON_MAP.abilities, label: 'Abilities' },
  effects: { id: 'effects', icon: ICON_MAP.effects, label: 'Effects' },
};

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheetV2}
 */
export class SynthicideItemSheet extends api.HandlebarsApplicationMixin(sheets.ItemSheetV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ['synthicide', 'item'],
    position: {
      width: 520,
      height: 450,
    },
    actions: {
      //onEditImage: this._onEditImage,
      viewDoc: this._viewEffect,
      createDoc: this._createEffect,
      deleteDoc: this._deleteEffect,
      toggleEffect: this._toggleEffect,
      addModifier: this._onAddModifier,
      removeModifier: this._onRemoveModifier,
      addTrait: this._onAddTrait,
      removeTrait: this._onRemoveTrait,
      addAbility: this._onAddAbility,
      removeAbility: this._onRemoveAbility,
    },
    form: {
      submitOnChange: true,
    },
    dragDrop: [{ dragSelector: '.draggable', dropSelector: null }],
  };
  

  /** @override */
  static PARTS = {
    header: {
      template: 'systems/synthicide/templates/item/header.hbs',
    },
    tabs: {
      // Foundry-provided generic template
      template: 'templates/generic/tab-navigation.hbs',
    },
    general: {
      template: 'systems/synthicide/templates/item/general.hbs',
    },
    attributesTrait: {
      template:
        'systems/synthicide/templates/item/attribute-parts/trait.hbs',
    },
    attributesGear: {
      template: 'systems/synthicide/templates/item/attribute-parts/gear.hbs',
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
    abilitiesAspect: {
      template: 'systems/synthicide/templates/item/attribute-parts/aspect-abilities.hbs',
    },
    effects: {
      template: 'systems/synthicide/templates/item/effects.hbs',
    },
  };

  /** @override */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    // Not all parts always render
    options.parts = ['header', 'tabs', 'general'];
    // Don't show the other tabs if only limited view
    if (this.document.limited) return;
    // Control which parts show based on document subtype
    options.parts.push(...(ITEM_BASE_PARTS_BY_TYPE[this.document.type] ?? []));
    // every item type can have effects
    options.parts.push('effects');
  }

  /** @inheritDoc */
  _initializeApplicationOptions(options) {
    const applicationOptions = super._initializeApplicationOptions(options);
    // Use shared helper so icon logic is consistent across sheets.
    applicationOptions.window.icon = getItemIcon(applicationOptions.document);
    return applicationOptions;
  }

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = buildBaseSheetContext({
      sheet: this,
      document: this.item,
      documentKey: 'item',
      extra: {
        isBioclass: this.item.system.featureType === FEATURE_TYPE.BIOCLASS,
        isAspect: this.item.system.featureType === FEATURE_TYPE.ASPECT,
        SYNTHICIDE,
        tabs: this._getTabs(options.parts),
      },
    });
    // Build traitTypeOptions for select helper
    context.config = context.config || {};
    // traitTypes is already a key->loc-key map; the template can localize it
    context.config.traitTypeOptions = SYNTHICIDE.traitTypes;
    // Restrict trait level choices to the system's milestone levels
    context.config.traitLevelOptions = { '1': '1', '4': '4', '7': '7' };

    return context;
  }

  /** @override */
  async _preparePartContext(partId, context) {
    assignTabContext(partId, context);

    switch (partId) {
      case 'general':
        // Use shared helper to keep enrich options consistent across sheets.
        context.enrichedDescription = await enrichSheetHtml({
          html: this.item.system.description,
          document: this.item,
          isOwner: this.document.isOwner,
          rollData: this.item.getRollData(),
        });
        break;
      case 'effects':
        // Prepare active effects for easier access
        context.effects = prepareActiveEffectCategories(this.item.effects);
        break;
    }
    return context;
  }

  /** @override */
  async _processSubmitData(event, form, submitData) {


    await this.document.update(submitData);
  }

  /**
   * Generates the data for the generic tab navigation template
   * @param {string[]} parts An array of named template parts to render
   * @returns {Record<string, Partial<ApplicationTab>>}
   * @protected
   */
  _getTabs(parts) {
    return buildTabs({
      parts,
      tabGroups: this.tabGroups,
      defaultTab: 'general',
      labelPrefix: 'SYNTHICIDE.Item.Tabs.',
      tabMap: ITEM_TAB_MAP,
    });
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
      // An example exists in trait-level templates, with `data-system.level`
      // which turns into the dataKey 'system.level'
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

  /**
   * Handle adding a new modifier row to the feature item.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async _onAddModifier(event, _target) {
    event.preventDefault();
    const defaultTarget = Object.keys(SYNTHICIDE.attributes)[0] ?? 'awareness';
    await mutateSystemArray(this.item, 'modifiers', modifiers => {
      modifiers.push({ target: defaultTarget, value: 0, type: 'bonus', condition: '', source: '' });
    });
  }

  /**
   * Handle removing a modifier row from the feature item.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async _onRemoveModifier(event, target) {
    event.preventDefault();
    await removeSystemArrayIndex(this.item, 'modifiers', target.dataset.index);
  }

  /**
   * Handle adding a new trait row to the bioclass item.
   * @param {PointerEvent} event
   */
  static async _onAddTrait(event) {
    event.preventDefault();
    await mutateSystemArray(this.item, 'traits', traits => {
      const maxSort = traits.reduce(
        (max, trait) => Math.max(max, Number(trait?.sort ?? 0)),
        0
      );
      traits.push({ sort: maxSort + 10, name: '', description: '' });
    });
  }

  /**
   * Handle removing a trait row from the bioclass item.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async _onRemoveTrait(event, target) {
    event.preventDefault();
    await removeSystemArrayIndex(this.item, 'traits', target.dataset.index);
  }

  /**
   * Handle adding an ability row to an aspect.
   */
  static async _onAddAbility(event) {
    event.preventDefault();
    await mutateSystemArray(this.item, 'abilities', abilities => {
      abilities.push({ description: '' });
    });
  }

  /**
   * Handle removing an ability row from an aspect.
   */
  static async _onRemoveAbility(event, target) {
    event.preventDefault();
    await removeSystemArrayIndex(this.item, 'abilities', target.dataset.index);
  }

  /* -------------------------------------------- */

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

// Icon resolution is provided by module/helpers/icons.mjs (getItemIcon).