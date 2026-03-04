import SynthicideItemBase from './base-item.mjs';
import SYNTHICIDE from '../helpers/config.mjs';
import { FEATURE_TYPE, FEATURE_TYPES } from '../helpers/feature-types.mjs';

/**
 * Shared logic for any item that occupies the single‑feature slot on an actor.
 * Bioclass and Aspect are thin subclasses that provide feature-specific data.
 *
 * Important DataModel context: in instance methods, `this` is the system
 * DataModel object (equivalent to `item.system`), not the parent Item document.
 * Access parent document data via `this.parent` as needed.
 *
 * @extends {SynthicideItemBase}
 */
export default class SynthicideFeature extends SynthicideItemBase {
  static OPERATION_OPTIONS = Object.freeze({
    SKIP_FEATURE_CLEANUP: 'synthicideSkipFeatureCleanup',
    SKIP_FEATURE_APPLY: 'synthicideSkipFeatureApply',
  });

  static LOCALIZATION_PREFIXES = [
    'SYNTHICIDE.Item.base',
    'SYNTHICIDE.Item.Feature'
  ];

  /**
   * Build the shared schema for both bioclasses and aspects.
   */
  static defineSchema() {
    const { fields } = foundry.data;
    const schema = super.defineSchema();

    schema.featureType = new fields.StringField({
      required: true,
      choices: FEATURE_TYPES,
      initial: 'bioclass'
    });

    schema.traits = new fields.ArrayField(
      new fields.SchemaField({
        sort: new fields.NumberField({ required: true, integer: true, initial: 0 }),
        name: new fields.StringField({ required: true, blank: true, initial: '' }),
        description: new fields.HTMLField({ required: true, initial: '' })
      }),
      { initial: [] }
    );

    return schema;
  }

  /**
   * Normalize dropped feature source data to include an explicit featureType.
   * @param {object} entry
   * @param {'bioclass'|'aspect'} featureType
   * @returns {object}
   */
  static coerceFeatureEntry(entry, featureType) {
    const existingType = entry?.system?.featureType;
    if (existingType && existingType !== featureType) {
      console.warn(
        `[Synthicide] Dropped feature type mismatch for "${entry?.name ?? '(unnamed item)'}": ` +
        `entry.system.featureType="${existingType}" but handler expected "${featureType}". Coercing to expected type.`
      );
    }

    return foundry.utils.mergeObject(
      foundry.utils.deepClone(entry),
      { system: { featureType } },
      { inplace: false }
    );
  }

  /**
   * Replace the actor's current feature of a given type with the provided
   * feature data and then apply feature side effects in one deterministic pass.
   *
   * This is the authoritative orchestration path used by UI drop handlers.
   *
   * @param {Actor} actor
   * @param {'bioclass'|'aspect'} featureType
   * @param {object} featureEntry
   * @param {object[]} [otherEntries=[]]
   * @param {{render?: boolean}} [options]
   * @returns {Promise<Item[]>}
   */
  static async replaceOnActor(actor, featureType, featureEntry, otherEntries = [], { render = true } = {}) {
    if (!actor) return [];

    const existingIds = actor.itemTypes?.[featureType]?.map(i => i.id) ?? [];
    if (existingIds.length) {
      await actor.deleteEmbeddedDocuments('Item', existingIds, {
        [this.OPERATION_OPTIONS.SKIP_FEATURE_CLEANUP]: true,
        render: false,
      });
    }

    const featureData = this.coerceFeatureEntry(featureEntry, featureType);
    const [createdFeature] = await actor.createEmbeddedDocuments('Item', [featureData], {
      render: false,
      [this.OPERATION_OPTIONS.SKIP_FEATURE_APPLY]: true,
    });

    const featureItem = actor.items.get(createdFeature.id);
    const featureModel = featureItem?.system;
    if (typeof featureModel?.applyToActor === 'function') {
      await featureModel.applyToActor(actor, { render: false });
    }

    if (otherEntries.length) {
      await actor.createEmbeddedDocuments('Item', otherEntries, { render: false });
    }

    if (render && actor.sheet) {
      await actor.sheet.render({ force: true });
    }

    return featureItem ? [featureItem] : [];
  }


  /**
   * Resolve the owning actor from this embedded item data model.
   * @returns {Actor|null}
   * @private
   */
  _getOwningActor(options = {}) {
    const optionParent = options?.parent;
    if (optionParent?.documentName === 'Actor') return optionParent;
    return this.parent?.actor ?? optionParent?.actor ?? null;
  }

  /**
   * Determine whether this client should execute local side effects.
   * Some Foundry paths provide no userId in data model hooks.
   * @param {string|undefined|null} userId
   * @returns {boolean}
   * @private
   */
  _isCurrentUser(userId) {
    return !userId || game.userId === userId;
  }

  // ---------------------------------------------------------------------
  // Actor integration helpers
  // ---------------------------------------------------------------------

  /**
   * Apply this feature to an actor by creating trait items and syncing
   * any special attributes.  The actor may be provided explicitly or is
   * inferred from the owning document.
   * @param {Actor} [actor]
   */
  async applyToActor(actor, { render = true } = {}) {
    if (!this.featureType) return;
    const owning = actor ?? this._getOwningActor();
    if (!owning) return;
    await this._removeFeatureTraits(owning, { render });
    await this._createFeatureTraits(owning, { render });
    await this._syncFeatureAttributes(owning, { render });
  }

  /**
   * Remove any trait items on the actor that were generated by this
   * feature.  Traits are identified by matching the featureType field.
   * @private
   */
  async _removeFeatureTraits(owningActor, { render = true } = {}) {
    const featureType = this.featureType;
    if (!featureType) return;
    const toDelete = owningActor.items
      .filter(i => i.type === 'trait' && i.system.traitType === featureType)
      .map(i => i.id);
    if (toDelete.length) {
      await owningActor.deleteEmbeddedDocuments('Item', toDelete, { render });

      // optional debug output keyed by feature type (e.g. synthicideBioclass)
      const flag = `synthicide${featureType.charAt(0).toUpperCase() + featureType.slice(1)}`;
      const debug = Boolean(SYNTHICIDE.debug?.[flag]);
      if (debug) {
        console.groupCollapsed(`[Synthicide] ${featureType} traits deleted: ${this.parent?.name}`);
        console.table(toDelete);
        console.groupEnd();
      }
    }
  }

  /**
   * Create trait items and embed them on the owning actor.  Each trait
   * record is copied from the feature's system data and tagged with the
   * appropriate traitType so it can later be cleaned up.
   * @private
   */
  async _createFeatureTraits(owningActor, { render = true } = {}) {
    const featureType = this.featureType;
    if (!featureType) return;
    const traits = Array.isArray(this.traits) ? this.traits : [];
    if (!traits.length) return;

    const docs = traits.map(trait => {
      const name = trait.name || 'Trait';
      const description = trait.description || '';
      const system = {
        ...trait,
        name,
        description,
        traitType: featureType
      };
      if (this.featureType === FEATURE_TYPE.BIOCLASS || this.parent?.type === FEATURE_TYPE.BIOCLASS) {
        system.bioClassLink = true;
      }
      return { type: 'trait', name, system };
    });

    await owningActor.createEmbeddedDocuments('Item', docs, { render });
  }

  /**
   * Route attribute synchronization to subclass-specific logic.
   * Subclasses can override `_syncSubtypeAttributes` when needed.
   * @private
   */
  async _syncFeatureAttributes(owningActor, { render = true } = {}) {
    await this._syncSubtypeAttributes(owningActor, { render });
  }

  /**
   * Subclass extension point for feature-specific actor synchronization.
   * @param {Actor} owningActor
   * @param {{render?: boolean}} _options
   * @private
   */
  async _syncSubtypeAttributes(_owningActor, _options = {}) {
    // default no-op; bioclass subclass implements actor base stat sync
  }

  /**
   * Subclass extension point for feature-specific cleanup when a feature is
   * deleted from an actor.
   * @param {Actor} owningActor
   * @private
   */
  async _cleanupOnDelete(_owningActor, _options = {}) {
    // default no-op; bioclass subclass implements attribute resets
  }

  /**
   * Foundry hook: creation should apply the feature to its actor.
    *
    * Custom operation option:
    * - options[SynthicideFeature.OPERATION_OPTIONS.SKIP_FEATURE_APPLY]:
    *   when true, skip automatic applyToActor.
    *   Used by actor-sheet replacement drop handlers so they can explicitly
    *   await applyToActor once and render only after all side effects complete.
    *
    * @this {SynthicideFeature}
    * @param {object} data
    * @param {object} options
    * @param {string} userId
    * @returns {Promise<void>}
   */
  async _onCreate(data, options, userId) {
    super._onCreate(data, options, userId);
    if (!this._isCurrentUser(userId)) return;
    if (options?.[SynthicideFeature.OPERATION_OPTIONS.SKIP_FEATURE_APPLY]) return;
    const actor = this._getOwningActor(options);
    if (actor) {
      try {
        await this.applyToActor(actor, { render: options?.render ?? true });
      } catch (err) {
        if (SYNTHICIDE.debug?.synthicideBioclass) console.error('applyToActor failed', err);
      }
    }
  }

  /**
   * Foundry hook: update may require re-applying traits/attributes.
    * @this {SynthicideFeature}
    * @param {object} changed
    * @param {object} options
    * @param {string} userId
    * @returns {Promise<void>}
   */
  async _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);
    if (!this._isCurrentUser(userId)) return;
    const actor = this._getOwningActor(options);
    if (!actor) return;

    const traitUpdate = !!changed?.system?.traits;
    if (traitUpdate) {
      await this.applyToActor(actor, { render: options?.render ?? true });
    }
  }

  /**
   * Capture actor before embedded item is removed so post-delete logic still
   * has access to the owning document.
    * @this {SynthicideFeature}
    * @param {object} options
    * @param {string} userId
    * @returns {Promise<boolean|void>}
   */
  async _preDelete(options, userId) {
    const allowed = await super._preDelete?.(options, userId);
    if (allowed === false) return false;
    this._deletingActor = this._getOwningActor(options);
    return allowed;
  }

  /**
   * Foundry hook: deleting a feature should remove any generated traits.
    *
    * Custom operation option:
    * - options[SynthicideFeature.OPERATION_OPTIONS.SKIP_FEATURE_CLEANUP]:
    *   when true, skip old-feature cleanup during replacement drops. The new
    *   feature's apply pass is the single authoritative remove+create flow for
    *   generated traits.
    *
    * @this {SynthicideFeature}
    * @param {object} options
    * @param {string} userId
    * @returns {Promise<void>}
   */
  async _onDelete(options, userId) {
    super._onDelete(options, userId);
    if (!this._isCurrentUser(userId)) return;
    const actor = this._deletingActor ?? this._getOwningActor(options);
    this._deletingActor = null;
    if (!actor) return;

    // Replacement drops intentionally skip old-feature cleanup because
    // the newly created feature's _onCreate/applyToActor will perform
    // a single authoritative remove+create pass.
    const skipCleanup = Boolean(options?.[SynthicideFeature.OPERATION_OPTIONS.SKIP_FEATURE_CLEANUP]);
    if (!skipCleanup) {
      const render = options?.render ?? true;
      await this._removeFeatureTraits(actor, { render });
      await this._cleanupOnDelete(actor, { render });
    }

    const debug = Boolean(SYNTHICIDE.debug?.synthicideModifiers);
    actor.aggregateAndApplyItemModifiers({ debug, render: options?.render ?? true });
  }

  /**
   * Pass-through pre-update hook for future shared feature logic.
   *
   * DataModel hook context: `this` is the feature system model
   * (`item.system`), not the parent Item document.
   *
   * @this {SynthicideFeature}
   * @param {object} changes
   * @param {object} options
   * @param {string} user
   * @returns {Promise<boolean|void>}
   * @override
   */
  async _preUpdate(changes, options, user) {
    const allowed = await super._preUpdate?.(changes, options, user);
    if (allowed === false) return false;
    return allowed;
  }
}

