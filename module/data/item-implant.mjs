import SYNTHICIDE from '../helpers/config.mjs';
import SynthicideGear from './item-gear.mjs';

/**
 * Implant item system model.
 *
 * DataModel context: instance methods execute on the implant system model
 * (`item.system`), not on the Item document.
 *
 * @extends {SynthicideGear}
 */
export default class SynthicideImplant extends SynthicideGear {
  static LOCALIZATION_PREFIXES = [
    'SYNTHICIDE.Item.base',
    'SYNTHICIDE.Item.Gear',
    'SYNTHICIDE.Item.Implant'
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    // Install location maps to actor slot pools (bodySlots/brainSlots).
    schema.location = new fields.StringField({
      required: true,
      choices: SYNTHICIDE.IMPLANT_LOCATIONS,
      initial: 'body'
    });

    // Specific implant family drives default modification list options in sheet UI.
    schema.implantType = new fields.StringField({
      required: true,
      choices: SYNTHICIDE.IMPLANT_TYPES,
      initial: 'custom'
    });

    // Selected stock modifications for this implant.
    schema.modifications = new fields.SetField(
      new fields.StringField({
        required: true,
        blank: false,
        choices: SYNTHICIDE.ALL_IMPLANT_MOD_KEYS
      })
    );

    // Free-form notes for homebrew modifications or custom implant behavior.
    schema.customMods = new fields.StringField({ blank: true, initial: '' });

    // New implants start unequipped until explicitly installed on the actor.
    schema.equipped = new fields.BooleanField({ required: true, nullable: false, initial: false });

    // Support larger implants that consume multiple slots.
    schema.slotSize = new fields.NumberField({ ...requiredInteger, initial: 1, min: 1 });

    // Attribute modifiers granted by this implant (only applied when equipped).
    schema.modifiers = new fields.ArrayField(
      new fields.SchemaField({
        target: new fields.StringField({
          required: true,
          choices: Object.keys(SYNTHICIDE.attributes),
        }),
        value: new fields.NumberField({ required: true }),
        type: new fields.StringField({
          required: true,
          choices: ['bonus', 'penalty', 'set'],
        }),
        condition: new fields.StringField({ required: false }),
      })
    );

    return schema;
  }

  /**
   * Override to gate attribute modifier contributions on the implant being equipped.
   * Returns zero contributions for all attributes when the implant is not equipped.
   * @this {SynthicideImplant}
   * @override
   * @param {Array<string>} attributeKeys
   * @param {Array<Object>} [debugArr]
   * @returns {{ attributeModifiers: Object, nonAttributeModifiers: Array }}
   */
  aggregateAttributeModifiers(attributeKeys, debugArr) {
    if (!this.equipped) {
      return {
        attributeModifiers: Object.fromEntries(attributeKeys.map((k) => [k, 0])),
        nonAttributeModifiers: [],
      };
    }
    return super.aggregateAttributeModifiers(attributeKeys, debugArr);
  }

  /**
   * Re-aggregate actor modifiers when `equipped` or `modifiers` changes.
   * @this {SynthicideImplant}
   * @override
   * @param {object} changed
   * @param {object} options
   * @param {string} userId
   * @returns {Promise<void>}
   */
  async _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);
    if (game.userId !== userId) return;
    const changedFlat = foundry.utils.flattenObject(changed ?? {});
    const equippedChanged = 'system.equipped' in changedFlat;
    if (equippedChanged) {
      await this.triggerActorModifierAggregation({ render: true });
    }
  }

  /**
   * Return available implant type choices for a location.
   * @this {SynthicideImplant}
   * @param {string} [location]
   * @returns {Object<string, string>}
   */
  getAvailableImplantTypeChoices(location = this.location) {
    return SYNTHICIDE.IMPLANT_TYPES_BY_LOCATION[location] ?? {};
  }

  /**
   * Return available modification choices for an implant type.
   * @this {SynthicideImplant}
   * @param {string} [implantType]
   * @returns {Object<string, string>}
   */
  getAvailableModificationChoices(implantType = this.implantType) {
    return SYNTHICIDE.IMPLANT_MODIFICATIONS[implantType] ?? {};
  }

  /**
   * Show a localized warning when an implant would exceed slot capacity.
   * @this {SynthicideImplant}
   * @param {{ location: string, capacity: number, usedSlots: number }} result
   * @returns {void}
   */
  notifySlotCapacityExceeded({ location, capacity, usedSlots }) {
    const locationLabel = game.i18n.localize(SYNTHICIDE.IMPLANT_LOCATIONS[location] ?? location);
    ui.notifications?.warn(
      game.i18n.format('SYNTHICIDE.Roll.Warnings.ImplantSlotsExceeded', {
        location: locationLabel,
        used: usedSlots,
        capacity,
      })
    );
  }

  /**
   * Sanitize a set/array of mod keys against known keys and type-specific compatibility.
   * @this {SynthicideImplant}
   * @param {Iterable<string>|Array<string>} modifications
   * @param {string} [implantType]
   * @returns {Array<string>}
   */
  sanitizeModificationKeys(modifications, implantType = this.implantType) {
    const list = Array.isArray(modifications)
      ? modifications
      : modifications instanceof Set
        ? Array.from(modifications)
        : [];

    const knownKeys = new Set(SYNTHICIDE.ALL_IMPLANT_MOD_KEYS);
    const knownOnly = list.filter((key) => knownKeys.has(key));
    if (implantType === 'custom') return knownOnly;

    const allowedMods = new Set(Object.keys(this.getAvailableModificationChoices(implantType)));
    return knownOnly.filter((key) => allowedMods.has(key));
  }



  /**
   * Validate equipped→true transitions against slot capacity.
   * Reject updates that would exceed slot limits.
   * @this {SynthicideImplant}
   * @param {object} changes
   * @param {object} options
   * @param {string} user
   * @returns {Promise<boolean|void>}
   * @override
   */
  async _preUpdate(changes, options, user) {
    const allowed = await super._preUpdate?.(changes, options, user);
    if (allowed === false) return false;

    const nextSystem = changes.system ?? {};
    const changedFlat = foundry.utils.flattenObject(changes ?? {});

    // Sanitize implant type and modifications
    const nextLocation =
      nextSystem.location
      ?? changedFlat['system.location']
      ?? this.location;
    const allowedTypeKeys = Object.keys(this.getAvailableImplantTypeChoices(nextLocation));
    let nextType =
      nextSystem.implantType
      ?? changedFlat['system.implantType']
      ?? this.implantType;
    if (!allowedTypeKeys.includes(nextType)) {
      nextType = allowedTypeKeys[0] ?? 'custom';
      foundry.utils.setProperty(changes, 'system.implantType', nextType);
    }

    if (nextType) {
      const incomingMods =
        nextSystem.modifications
        ?? changedFlat['system.modifications'];
      const sourceMods = incomingMods ?? this.modifications ?? [];
      const filteredMods = this.sanitizeModificationKeys(sourceMods, nextType);
      foundry.utils.setProperty(changes, 'system.modifications', filteredMods);
    }

    const actor = this.parent?.actor;
    if (!actor) return allowed;

    // Validate strict equipped false->true transitions
    const nextEquipped =
      nextSystem.equipped
      ?? changedFlat['system.equipped']
      ?? this.equipped;
    const wasEquipped = this.equipped === true;
    const becomingEquipped = !wasEquipped && nextEquipped === true;

    const locationChanged =
      Object.prototype.hasOwnProperty.call(nextSystem, 'location')
      || Object.prototype.hasOwnProperty.call(changedFlat, 'system.location');
    const slotSizeChanged =
      Object.prototype.hasOwnProperty.call(nextSystem, 'slotSize')
      || Object.prototype.hasOwnProperty.call(changedFlat, 'system.slotSize');
    const needsCapacityValidation =
      nextEquipped === true && (becomingEquipped || (wasEquipped && (locationChanged || slotSizeChanged)));

    if (needsCapacityValidation) {
      const nextSlotSize = Number(
        nextSystem.slotSize
        ?? changedFlat['system.slotSize']
        ?? this.slotSize
        ?? 1
      );

      const pool = actor.system?.implantSlots?.[nextLocation] ?? actor.system?.implantSlots?.body;
      const currentUsed = Number(pool?.value ?? 0);
      const capacity = Number(pool?.max ?? 0);

      // If this implant is already equipped and currently counted in this pool,
      // remove its current contribution before applying the next slot size.
      const currentContribution =
        wasEquipped && this.location === nextLocation
          ? Number(this.slotSize ?? 1)
          : 0;
      const usedSlots = (currentUsed - currentContribution) + nextSlotSize;

      const slotCheck = {
        allowed: usedSlots <= capacity,
        capacity,
        usedSlots,
        location: nextLocation,
      };

      if (!slotCheck.allowed) {
        const updateUserId = typeof user === 'string' ? user : user?.id;
        const shouldNotify = !updateUserId || updateUserId === game.userId;
        if (shouldNotify) this.notifySlotCapacityExceeded(slotCheck);
        const itemSheet = this.parent?.sheet;
        if (itemSheet?.rendered) itemSheet.render(false);
        return false;
      }
    }

    return allowed;
  }
}
