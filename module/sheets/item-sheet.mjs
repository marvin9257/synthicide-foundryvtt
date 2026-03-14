import { prepareActiveEffectCategories } from '../helpers/effects.mjs';
import SYNTHICIDE from '../helpers/config.mjs';
import { FEATURE_TYPE } from '../helpers/feature-types.mjs';
import { assignTabContext, buildBaseSheetContext, buildTabs, enrichSheetHtml } from './sheet-context.mjs';
import { mutateSystemArray, removeSystemArrayIndex } from './sheet-utils.mjs';
import { getItemIcon, ICON_MAP } from '../helpers/icons.mjs';

const { api, sheets } = foundry.applications;

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
  gear: ['rollGear'],
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
  rollGear: { id: 'rollGear', icon: ICON_MAP.roll, label: 'RollData' },
  attributesBioclass: { id: 'attributes', icon: ICON_MAP.attributes, label: 'Attributes' },
  cyberneticsBioclass: { id: 'cybernetics', icon: ICON_MAP.cybernetics, label: 'Cybernetics' },
  traitsBioclass: { id: 'traits', icon: ICON_MAP.trait, label: 'Traits' },
  abilitiesAspect: { id: 'abilities', icon: ICON_MAP.abilities, label: 'Abilities' },
  effects: { id: 'effects', icon: ICON_MAP.effects, label: 'Effects' },
  description: { id: 'description', icon: ICON_MAP.description, label: 'Description'}
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
        'systems/synthicide/templates/item/parts/trait.hbs',
    },
    rollGear: {
      template: 'systems/synthicide/templates/item/parts/rollGear.hbs',
    },
    attributesBioclass: {
      template:
        'systems/synthicide/templates/item/parts/bioclass-attributes.hbs',
    },
    cyberneticsBioclass: {
      template:
        'systems/synthicide/templates/item/parts/bioclass-cybernetics.hbs',
    },
    traitsBioclass: {
      template:
        'systems/synthicide/templates/item/parts/bioclass-traits.hbs',
    },
    abilitiesAspect: {
      template: 'systems/synthicide/templates/item/parts/aspect-abilities.hbs',
    },
    effects: {
      template: 'systems/synthicide/templates/item/effects.hbs',
    },
    description: {
      template: 'systems/synthicide/templates/item/description.hbs'
    }
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
    // every item type has a description
    options.parts.push('description');
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
    // Build traitTypeOptions and localized trait level options for select helpers
    context.config = context.config || {};
    // traitTypes is already a key->loc-key map; the template can localize it
    context.config.traitTypeOptions = SYNTHICIDE.traitTypes;
    // Localized labels for allowed trait levels using a single format string
    
    context.config.traitLevelOptions = Object.fromEntries(
      SYNTHICIDE.ALLOWED_TRAIT_LEVELS.map(l => [String(l), game.i18n.format('SYNTHICIDE.Item.Trait.LevelLabel', { level: l })])
    );
    context.isGear = SYNTHICIDE.GEAR_TYPES.includes(this.item.type);
    context.isEquipable = SYNTHICIDE.EQUIPABLE.includes(this.item.type);

    return context;
  }

  /** @override */
  async _preparePartContext(partId, context) {
    assignTabContext(partId, context);

    switch (partId) {
      case 'description':
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
    // Loop through the dataset and add it to effectData
    for (const [dataKey, value] of Object.entries(target.dataset)) {
      // These data attributes are reserved for the action handling
      if (['action', 'documentClass'].includes(dataKey)) continue;
      // Nested properties require dot notation in the HTML, e.g. anything with `system`
      // An example exists in trait-level templates, with `data-system.level`
      // which turns into the dataKey 'system.level'
      foundry.utils.setProperty(effectData, dataKey, value);
    }
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
   * Handle dropping an ActiveEffect document onto this item sheet.
    *
    * Extension point: if we later support nested items, override
    * _onDropDocument(event, document) and handle Item there, while
    * delegating unsupported document types to super.
   * @param {DragEvent} event
   * @param {ActiveEffect} effect
   * @returns {Promise<ActiveEffect|null|undefined>}
   * @protected
   */
  async _onDropActiveEffect(event, effect) {
    if (!this.item.isOwner || !effect) return null;

    if (this.item.uuid === effect.parent?.uuid)
      return this._onEffectSort(event, effect);
    return super._onDropActiveEffect(event, effect);
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
    const sortUpdates = foundry.utils.performIntegerSort(effect, {
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

}

// Icon resolution is provided by module/helpers/icons.mjs (getItemIcon).