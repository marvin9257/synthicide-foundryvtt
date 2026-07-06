import SYNTHICIDE from '../helpers/config.mjs';
import { assignTabContext, buildBaseSheetContext, buildTabs, enrichSheetHtml } from './sheet-context.mjs';
import { ICON_MAP } from '../helpers/icons.mjs';
import { prepareActiveEffectCategories } from '../helpers/effects.mjs';
import { computeHpPercent } from './sheet-utils.mjs';
import { SynthicideActorSheet } from './actor-sheet.mjs';

/**
 * Render parts enabled per actor type.
 *
 * Usage:
 * - _configureRenderOptions starts with ['header', 'tabs']
 * - Then appends VEHICLE_PARTS_BY_TYPE[this.document.type]
 * - Any part listed here should also exist in static PARTS.
 */
const VEHICLE_PARTS_BY_TYPE = {
  planetary: [ 'capacity', 'cargo', 'vehicleWeapons', 'effects', 'description'],
  ship: [ 'capacity', 'flavor', 'cargo', 'vehicleWeapons', 'locker', 'effects', 'description']
};

/**
 * Maps render part ids to tab metadata consumed by buildTabs(...).
 *
 * Rules:
 * - Key must match a render part id from static PARTS.
 * - id is the logical tab id used by tab-navigation.hbs.
 * - label is appended to 'SYNTHICIDE.Vehicle.Tabs.' and localized by templates.
 *
 * To add a new actor tab:
 * 1) Add template in static PARTS.
 * 2) Add part id to ACTOR_PARTS_BY_TYPE for target actor types.
 * 3) Add matching entry here in ACTOR_TAB_MAP.
 * 4) Add localization key under SYNTHICIDE.Vehicle.Tabs.<Label>.
 */
const VEHICLE_TAB_MAP = {
  capacity: { id: 'capacity', icon: ICON_MAP.capacity, label: 'Capacity' },
  flavor: {id: 'flavor', icon: ICON_MAP.flavor, label: 'Flavor' },
  cargo: {id: 'cargo', icon: ICON_MAP.cargo, label: 'Cargo' },
  vehicleWeapons: { id: 'vehicleWeapons', icon: ICON_MAP.vehicleWeapon, label: 'VehicleWeapons' },
  locker: {id:'locker', icon: ICON_MAP.locker, label: 'Locker'},
  description: { id: 'description', icon: ICON_MAP.description, label: 'Description' },
  effects: { id: 'effects', icon: ICON_MAP.effects, label: 'Effects' }
};

/**
 * Extend the SynthicideActorSheet with some very simple modifications
 * @extends {SynthicideActorSheet}
 */
export class SynthicideVehicleSheet extends SynthicideActorSheet {
  /** @override */
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
      classes: ['vehicle'],
      position: { width: 'auto', height: 'auto' },
      window: {
        icon: ICON_MAP.vehicle,
      },
    }, { inplace: false });
  

  /** @override */
  static PARTS = {
    header: {
      template: 'systems/synthicide/templates/vehicle/header.hbs',
    },
    tabs: {
      // Foundry-provided generic template
      template: 'templates/generic/tab-navigation.hbs',
    },
    capacity: {
      template: 'systems/synthicide/templates/vehicle/capacity.hbs',
      scrollable: [""]
    },
    flavor: {
      template: 'systems/synthicide/templates/vehicle/flavor.hbs',
      scrollable: [""]
    },
    cargo: {
      template: 'systems/synthicide/templates/vehicle/cargo.hbs',
      scrollable: [""]
    },
    vehicleWeapons: {
      template: 'systems/synthicide/templates/vehicle/vehicle-weapons.hbs',
      scrollable: [""]
    },
    locker: {
      template: 'systems/synthicide/templates/vehicle/locker.hbs',
      scrollable: [""]
    },
    description: {
      template: 'systems/synthicide/templates/vehicle/description.hbs',
      scrollable: [""]
    },
    effects: {
      template: 'systems/synthicide/templates/actor/effects.hbs',
      scrollable: [""]
    }
  };

  /** @override */
  _configureRenderOptions(options) {
    const isShip = this.document.system.vehicleType === "spaceship"
    this.options.window.icon = isShip ? ICON_MAP.spaceShip: ICON_MAP.vehicle;
    super._configureRenderOptions(options);
    options.parts = ['header', 'tabs'];
    if (this.document.limited) return;
    options.parts.push(...(VEHICLE_PARTS_BY_TYPE[isShip ? 'ship' : 'planetary'] ?? []));
  }

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = buildBaseSheetContext({
      sheet: this,
      document: this.actor,
      documentKey: 'actor',
      extra: {
        SYNTHICIDE,
        tabs: this._getTabs(options.parts),
      },
    });

    context.hpPercent = computeHpPercent(context.system);
    context.fuelPercent = context.system.fuelUnits.max > 0 ? (context.system.fuelUnits.value / context.system.fuelUnits.max) : 0;

    context.config = context.config || {};
    context.config.motivationOptions = Object.fromEntries(
      Object.entries(SYNTHICIDE.motivations).map(([k, v]) => [k, v.label])
    );
    context.config.motivationBehaviors = Object.fromEntries(
      Object.entries(SYNTHICIDE.motivations).map(([k, v]) => [k, v.behavior])
    );
    

    // Offloading item context prep to a helper function
    await this._prepareItems(context);

    context.isShip = this.actor.system.vehicleType === 'spaceship';
    context.usesFuel = ['spaceship', 'skyCar'].includes(this.actor.system.vehicleType);
    context.vehicleTypes = SYNTHICIDE.VEHICLE_TYPES;

    return context;
  }

  /** @override */
  async _preparePartContext(partId, context) {
    assignTabContext(partId, context);

    switch (partId) {
      case 'description':
        context.enrichedDescription = await enrichSheetHtml({
          html: this.actor.system.description,
          document: this.actor,
          isOwner: this.document.isOwner,
          rollData: this.actor.getRollData(),
        });
        break;
      case 'effects':
        context.effects = prepareActiveEffectCategories(this.actor.allApplicableEffects());
        break;
      case 'capacity': {
        const type = this.actor.system.vehicleType === 'spaceship' ? 'ship' : 'planetary';
        context.customizationOptions = { ...SYNTHICIDE.vehicleCustomizations[type] };
        break;
      }
      case 'flavor': {
        const flavors = SYNTHICIDE.shipFlavors;
        context.originOptions = { ...flavors.origins };
        context.appearanceOptions = { ...flavors.appearance };
        context.flawOptions = { ...flavors.flaws };
        context.mysteryOptions = { ...flavors.mysteries };
        context.upgradeOptions = { ...flavors.upgrades };
        break;
      }
      case 'cargo' :{
        const cargo = this.actor.itemTypes.cargo;
        context.cargo = cargo?.sort((a, b) => (a.sort || 0) - (b.sort || 0));
        break;
      }
      case 'vehicleWeapons': {
        const vehicleWeapons = this.actor.itemTypes.vehicleWeapon;
        context.vehicleWeapons = vehicleWeapons?.sort((a, b) => (a.sort || 0) - (b.sort || 0));
        context.vehicleWeaponRanges = SYNTHICIDE.VEHICLE_WEAPON_RANGES;
        break;
      }
      case 'locker': {
        const locker = this.actor.items.filter(item => item.type !== 'cargo' && item.type !== 'vehicleWeapon');
        context.locker = locker.sort((a, b) => (a.sort || 0) - (b.sort || 0));
        context.itemTypeIcons = ICON_MAP;
        break;
      }
        
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
    return buildTabs({
      parts,
      tabGroups: this.tabGroups,
      defaultTab: 'capacity',
      labelPrefix: 'SYNTHICIDE.Vehicle.Tabs.',
      tabMap: VEHICLE_TAB_MAP,
    });
  }

  /**
   * Organize and classify Items for Actor sheets.
   *
   * @param {object} context The context object to mutate
   */
  async _prepareItems(context) {
    // Initialize containers.
    const gear = this.actor.itemTypes.gear;
    const armor = this.actor.itemTypes.armor;
    const shield = this.actor.itemTypes.shield;
    const weapon = this.actor.itemTypes.weapon;
    const implants = this.actor.itemTypes.implant;
    
        // Sort then assign
    context.gear = gear?.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    context.armor = armor?.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    context.shield = shield?.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    context.weapon = weapon?.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    context.implants = implants?.sort((a, b) => (a.sort || 0) - (b.sort || 0));
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
    //this.#disableOverrides();
    // You may want to add other special handling here
    // Foundry comes with a large number of utility classes, e.g. SearchFilter
    // That you may want to implement yourself.
  }

  
}


