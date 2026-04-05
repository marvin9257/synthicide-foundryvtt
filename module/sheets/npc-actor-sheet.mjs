import SYNTHICIDE from '../helpers/config.mjs';
import { assignTabContext, buildBaseSheetContext, buildTabs } from './sheet-context.mjs';
import { ICON_MAP } from '../helpers/icons.mjs';
import { openSynthicideActionRollDialog } from '../rolls/action-rolls.mjs';
import { prepareActiveEffectCategories } from '../helpers/effects.mjs';
import { computeHpPercent, deleteDocAction, getEmbeddedDocument, prepareBiographyPartContext, showInfoAction, toggleEffectAction, viewDocAction } from './sheet-utils.mjs';

const { api, sheets } = foundry.applications;

/**
 * Maps render part ids to tab metadata for the NPC sheet.
 *
 * label values must match keys under SYNTHICIDE.Actor.Tabs.* in lang/en.json.
 */
const NPC_TAB_MAP = {
  npcStats: { id: 'npcStats', icon: ICON_MAP.attributes, label: 'Attributes' },
  combat: { id: 'combat', icon: ICON_MAP.combat, label: 'Combat' },
  gear: { id: 'gear', icon: ICON_MAP.gear, label: 'Gear' },
  info: { id: 'info', icon: ICON_MAP.general, label: 'Notes' },
  biography: { id: 'biography', icon: ICON_MAP.biography, label: 'Biography' },
  effects: { id: 'effects', icon: ICON_MAP.effects, label: 'Effects' },
};

/**
 * Standalone sheet for NPC actors.
 *
 * @extends {ActorSheetV2}
 */
export class SynthicideNPCActorSheet extends api.HandlebarsApplicationMixin(
  sheets.ActorSheetV2
) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ['synthicide', 'actor', 'npc'],
    position: {
      width: 700,
      height: 640,
    },
    window: {
      resizable: true,
      icon: ICON_MAP.person,
    },
    actions: {
      viewDoc: this._viewDoc,
      createDoc: this._createDoc,
      deleteDoc: this._deleteDoc,
      showInfo: this._showInfo,
      toggleEffect: this._toggleEffect,
      roll: this._onRoll,
      masteredAttackRoll: this._onMasteredAttackRoll,
    },
    dragDrop: [{ dropSelector: null }],
    form: {
      submitOnChange: true,
    },
  };

  /** @override */
  static PARTS = {
    npcHeader: {
      template: 'systems/synthicide/templates/actor/header-npc.hbs',
    },
    tabs: {
      template: 'templates/generic/tab-navigation.hbs',
    },
    npcStats: {
      template: 'systems/synthicide/templates/actor/attributes-npc.hbs',
      scrollable: [''],
    },
    combat: {
      template: 'systems/synthicide/templates/actor/combat-npc.hbs',
      scrollable: [''],
    },
    gear: {
      template: 'systems/synthicide/templates/actor/gear-npc.hbs',
      scrollable: [''],
    },
    info: {
      template: 'systems/synthicide/templates/actor/info-npc.hbs',
      scrollable: [''],
    },
    biography: {
      template: 'systems/synthicide/templates/actor/biography.hbs',
      scrollable: [''],
    },
    effects: {
      template: 'systems/synthicide/templates/actor/effects.hbs',
      scrollable: [''],
    },
  };

  /* -------------------------------------------- */
  /*  Render Lifecycle                            */
  /* -------------------------------------------- */

  /** @override */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    options.parts = ['npcHeader', 'tabs'];
    if (this.document.limited) return;
    options.parts.push('npcStats', 'combat', 'gear', 'info', 'biography', 'effects');
  }

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

    // HP bar percentage for colour-coded resource track.
    context.hpPercent = computeHpPercent(context.system);

    // Config dropdown option maps consumed by templates via @root.config.*.
    context.config = {
      npcRoleOptions: Object.fromEntries(
        Object.entries(SYNTHICIDE.npc.roles).map(([k, v]) => [k, v.label])
      ),
      npcWeaponOptions: Object.fromEntries(
        Object.entries(SYNTHICIDE.npc.masteredWeapons).map(([k, v]) => [k, v.label])
      ),
      npcWealthOptions: Object.fromEntries(
        Object.entries(SYNTHICIDE.npc.wealthTiers).map(([k, v]) => [k, v.label])
      ),
    };

    // Bioclass item (max 1); null when no bioclass is assigned.
    context.bioclass = this.actor.itemTypes.bioclass?.[0] ?? null;

    // Role build guidance used in the attributes tab.
    context.npcBuild = this._prepareNPCBuildContext(context.system, context.bioclass);

    // Gear items sorted by drag-order.
    const sortFn = (a, b) => (a.sort || 0) - (b.sort || 0);
    context.gear = this.actor.itemTypes.gear?.sort(sortFn) ?? [];
    context.armor = this.actor.itemTypes.armor?.sort(sortFn) ?? [];
    context.shield = this.actor.itemTypes.shield?.sort(sortFn) ?? [];
    context.weapon = this.actor.itemTypes.weapon?.sort(sortFn) ?? [];
    context.npcInventory = [
      ...context.gear,
      ...context.armor,
      ...context.shield,
      ...context.weapon,
    ].sort((a, b) => {
      const sortDelta = (a.sort || 0) - (b.sort || 0);
      if (sortDelta !== 0) return sortDelta;
      return String(a.name ?? '').localeCompare(String(b.name ?? ''));
    });

    return context;
  }

  /** @override */
  async _preparePartContext(partId, context) {
    assignTabContext(partId, context);
    switch (partId) {
      case 'biography':
        await prepareBiographyPartContext(this.actor, context, this.document.isOwner);
        break;
      case 'effects':
        context.effects = prepareActiveEffectCategories(this.actor.allApplicableEffects());
        break;
    }
    return context;
  }

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
  }

  /** @override */
  async _processSubmitData(event, form, submitData) {
    await this.document.update(submitData);
  }

  /**
   * Build tab descriptors for the NPC sheet.
   * @param {string[]} parts
   * @returns {Record<string, Partial<ApplicationTab>>}
   * @protected
   */
  _getTabs(parts) {
    return buildTabs({
      parts,
      tabGroups: this.tabGroups,
      defaultTab: 'npcStats',
      labelPrefix: 'SYNTHICIDE.Actor.Tabs.',
      tabMap: NPC_TAB_MAP,
    });
  }

  /**
   * Compute role build guidance and boss status summary for the NPC attributes tab.
   * @param {object} system - Actor system data.
   * @returns {object}
   * @protected
   */
  _prepareNPCBuildContext(system, bioclass = null) {
    const level = Math.max(1, Number(system.level?.value ?? 1));
    const role = SYNTHICIDE.npc.roles[system.npcRole] ?? SYNTHICIDE.npc.roles.guardian;
    const strongKey = role.strong;
    const goodKeys = role.good ?? [];
    const weakKey = role.weak;
    const ignoreWeakPenalty = shouldIgnoreWeakRolePenalty(bioclass);

    return {
      role,
      strongKey,
      goodKeys,
      weakKey,
      strongLabel: game.i18n.localize(SYNTHICIDE.attributes[strongKey] ?? strongKey),
      strongAbbr: game.i18n.localize(SYNTHICIDE.attributeAbbreviations[strongKey] ?? strongKey),
      goodLabels: goodKeys
        .map((k) => game.i18n.localize(SYNTHICIDE.attributes[k] ?? k))
        .join(', '),
      goodAbbrs: goodKeys
        .map((k) => game.i18n.localize(SYNTHICIDE.attributeAbbreviations[k] ?? k))
        .join('/'),
      weakLabel: weakKey
        ? game.i18n.localize(SYNTHICIDE.attributes[weakKey] ?? weakKey)
        : game.i18n.localize('SYNTHICIDE.Actor.NPC.WeakNone'),
      weakAbbr: weakKey
        ? game.i18n.localize(SYNTHICIDE.attributeAbbreviations[weakKey] ?? weakKey)
        : game.i18n.localize('SYNTHICIDE.Actor.NPC.WeakNone'),
      strongBonus: 1 + Math.floor(level / 2),
      goodBonus: Math.floor(level / 3),
      weakPenalty: weakKey && !ignoreWeakPenalty ? -2 : 0,
      rolePowerText: game.i18n.localize(role.power),
      bossSummary: system.boss
        ? game.i18n.localize('SYNTHICIDE.Actor.NPC.BossActive')
        : '',
    };
  }

  /* -------------------------------------------- */
  /*  Drop Handling                               */
  /* -------------------------------------------- */

  /**
   * Intercept item drops to enforce max-1 bioclass; delegate everything else
   * to the base ActorSheetV2 implementation.
   * @override
   */
  async _onDropItem(event, data) {
    if (!this.actor.isOwner) return false;
    const item = await fromUuid(data.uuid);
    if (!item) return false;

    if (item.type === 'bioclass') {
      return this._onDropBioclassItem(item);
    }

    return super._onDropItem(event, data);
  }

  /**
   * Handle dropping a bioclass item onto the NPC sheet.
   * Prompts the user before replacing an existing one.
   * @param {Item} item
   * @protected
   */
  async _onDropBioclassItem(item) {
    const existing = this.actor.itemTypes.bioclass?.[0];
    if (existing) {
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: {
          title: game.i18n.localize('SYNTHICIDE.Actor.NPC.ReplaceBioclassTitle'),
        },
        content: `<p>${game.i18n.format('SYNTHICIDE.Actor.NPC.ReplaceBioclassContent', { name: item.name })}</p>`,
      });
      if (!confirmed) return;
      await existing.delete();
    }
    // Skip creation if the item is already embedded on this actor.
    if (item.parent?.uuid === this.actor.uuid) return;
    return this.actor.createEmbeddedDocuments('Item', [item.toObject()]);
  }

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

  static async _viewDoc(event, target) {
    await viewDocAction(this.actor, target);
  }

  static async _deleteDoc(event, target) {
    await deleteDocAction(this.actor, target);
  }

  static async _showInfo(event, target) {
    await showInfoAction(this.actor, target);
  }

  /**
   * Creates a new embedded document from data-* attributes on the trigger element.
   * @this {SynthicideNPCActorSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async _createDoc(event, target) {
    const docCls = getDocumentClass(target.dataset.documentClass);
    const docData = {
      name: docCls.defaultName({ type: target.dataset.type, parent: this.actor }),
    };
    for (const [dataKey, value] of Object.entries(target.dataset)) {
      if (['action', 'documentClass', 'tooltip'].includes(dataKey)) continue;
      foundry.utils.setProperty(docData, dataKey, value);
    }
    await docCls.create(docData, { parent: this.actor });
  }

  /**
   * Toggles an ActiveEffect's enabled state.
   * @this {SynthicideNPCActorSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async _toggleEffect(event, target) {
    await toggleEffectAction(this.actor, target);
  }

  /**
   * Handles generic roll clicks (challenge or item attacks).
   * @this {SynthicideNPCActorSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async _onRoll(event, target) {
    event.preventDefault();
    const { rollType, attributeKey, roll, label } = target.dataset;

    if (rollType === 'challenge') {
      const roleChallengeBonus = getRoleChallengeBonus({
        roleKey: this.actor.system?.npcRole,
        attributeKey,
        level: Number(this.actor.system?.level?.value ?? 1),
      });
      return openSynthicideActionRollDialog({
        actor: this.actor,
        subtype: 'challenge',
        attribute: attributeKey,
        miscOverride: roleChallengeBonus,
      });
    }

    if (rollType === 'attack') {
      const item = this._getEmbeddedDocument(target);
      return openSynthicideActionRollDialog({
        actor: this.actor,
        subtype: 'attack',
        sourceItem: item,
      });
    }

    if (roll) {
      const evaluatedRoll = new Roll(roll, this.actor.getRollData());
      return evaluatedRoll.toMessage(
        { speaker: ChatMessage.getSpeaker({ actor: this.actor }), flavor: label ?? '' },
        { messageMode: game.settings.get('core', 'messageMode') }
      );
    }
  }

  /**
   * Launches an attack roll pre-populated with this NPC's mastered attack total.
   * The dialog still allows the GM to override the pre-filled value.
   * @this {SynthicideNPCActorSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async _onMasteredAttackRoll(event, _target) {
    event.preventDefault();
    const isPsycherProjection = this.actor.system?.masteredWeapon === 'psycherProjection';
    const attackBonusOverride = Number(
      this.actor.system.masteredAttack?.attackBonus?.total ?? 0
    );
    const damageBonusOverride = Number(
      this.actor.system.masteredAttack?.damageBonus?.total ?? 0
    );
    return openSynthicideActionRollDialog({
      actor: this.actor,
      subtype: 'attack',
      attribute: isPsycherProjection ? 'influence' : 'combat',
      attackBonusOverride,
      damageBonusOverride,
    });
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Retrieve an embedded Item or ActiveEffect from a click target.
   * Target or an ancestor must carry data-item-id or data-document-id.
   * @param {HTMLElement} target
   * @returns {Item|ActiveEffect|null}
   */
  _getEmbeddedDocument(target) {
    return getEmbeddedDocument(this.actor, target);
  }
}

function getRoleChallengeBonus({ roleKey, attributeKey, level }) {
  const key = String(attributeKey ?? '');
  const halfLevelPlusOne = 1 + Math.floor(Math.max(1, Number(level ?? 1)) / 2);

  if (roleKey === 'fastTalker' && ['awareness', 'influence'].includes(key)) {
    return halfLevelPlusOne;
  }

  if (roleKey === 'guardian' && ['awareness', 'nerve'].includes(key)) {
    return halfLevelPlusOne;
  }

  if (roleKey === 'professional' && key === 'operation') {
    return 2;
  }

  return 0;
}

function shouldIgnoreWeakRolePenalty(bioclass) {
  if (bioclass?.system?.ignoreRoleWeakPenalty === true) return true;

  const name = String(bioclass?.name ?? '').trim().toLowerCase();
  return /(^|\W)priest(\W|$)/.test(name);
}
