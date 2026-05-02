

import { createActionMessage, openSynthicideActionRollDialog } from '../rolls/action-rolls.mjs';
import { getRollResultSummary } from '../rolls/roll-utils.mjs';
import SYNTHICIDE from '../helpers/config.mjs';

/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class SynthicideItem extends foundry.documents.Item {
  
  /**
   * Foundry hook: Called before the item is updated.
   * Auto-updates weapon image if weaponType changes and image is default.
   *
   * @param {object} update - The update data being applied to the item
   * @param {object} options - Additional update options
   * @param {string} userId - The ID of the user making the update
   * @returns {Promise<boolean|void>} - Return false to prevent the update
   * @override
   */
  async _preUpdate(update, options, userId) {
    const allowed = await super._preUpdate(update, options, userId);
    if (allowed === false) return false;

    // Only act if this is a weapon and weaponType is being changed
    if (this.type === 'weapon' && update?.system?.weaponType) {
      // The current (pre-update) weaponType
      const currentWeaponType = this.system.weaponType;
      // The new weaponType being set
      const newWeaponType = update.system.weaponType;

      // Only proceed if the weaponType is actually changing
      if (currentWeaponType !== newWeaponType) {
        // Get the default image for the current (pre-update) weaponType
        const prevDefaultImg = SynthicideItem.getDefaultArtwork({
          type: 'weapon',
          system: { ...this.system, weaponType: currentWeaponType }
        }).img;

        // Only update if the current image is the default
        if (this.img === prevDefaultImg) {
          // Get the default image for the new weaponType
          const newDefaultImg = SynthicideItem.getDefaultArtwork({
            type: 'weapon',
            system: { ...this.system, weaponType: newWeaponType }
          }).img;

          if (newDefaultImg && newDefaultImg !== this.img) {
            // Set the new image in the update payload
            foundry.utils.mergeObject(update,  {img: newDefaultImg});
          }
        }
      }
    }
    return allowed;
  }

  /**
  * Foundry hook: Called when the item is updated.
  * Handle post-update logic for armor equip/unequip.
  *
  * @this {SynthicideItem}
  * @param {object} changed
  * @param {object} options
  * @param {string} userId
  * @returns {Promise<void>}
  */
  async _onUpdate(changed, options, userId) {
    await super._onUpdate(changed, options, userId);
    if (game.userId !== userId) return;

    // Auto-update image if weaponType changes and image is default
    if (this.type === 'weapon' && changed?.system?.weaponType) {
      // Check if the image is the default for the previous type
      const newImage = SynthicideItem.getDefaultArtwork(this).img;
      if (this.img !== newImage && newImage) {
        await this.update({ img: newImage });
      }
    }

    if (!this.actor) return;
    // Enforce one-equipped-at-a-time for exclusive types unless this change was
    // triggered by the actor-level equip orchestration itself.
    if (SYNTHICIDE.EXCLUSIVE_EQUIP_TYPES.includes(this.type) && changed?.system?.equipped !== undefined && !options._fromEquipLogic) {
      if (changed?.system?.equipped) {
        await this.actor.equipExclusiveItemType(this.type, this.id);
      } else if (this.type === 'armor') {
        await this.actor.update({'system.armorValues.forceBarrier.value': 0}, {render: false});
      }
    }
  }
  
  /**
   * Equip this item. Exclusive types ensure only one item of that type is
   * equipped at a time. Other equipable items are toggled on directly.
   */
  async equip() {
    if (!SYNTHICIDE.EQUIPABLE.includes(this.type)) return;
    if (SYNTHICIDE.EXCLUSIVE_EQUIP_TYPES.includes(this.type) && this.actor) {
      await this.actor.equipExclusiveItemType(this.type, this.id);
    } else if (!this.system.equipped) {
      // Only update if not already equipped
      await this.update({ "system.equipped": true });
    }
  }

  /**
   * Prepare a data object which defines the data schema used by dice roll commands against this Item
   * @override
   */
  getRollData() {
    // Starts off by populating the roll data with a shallow copy of `this.system`
    const rollData = { ...this.system };

    // Quit early if there's no parent actor
    if (!this.actor) return rollData;

    // If present, add the actor's roll data
    rollData.actor = this.actor.getRollData();

    return rollData;
  }

  /**
   * Handle clickable and item macro rolls rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  async roll(_event) {
    // If this is a weapon item, use the attack roll dialog
    if (this.type === "weapon" && this.actor) {
      return openSynthicideActionRollDialog({
        actor: this.actor,
        subtype: 'attack',
        sourceItem: this,
      });
    }

    return this._rollFormulaItem();
  }

  async _rollFormulaItem() {
    const item = this;
    const speaker = ChatMessage.getSpeaker({ actor: item.actor });
    const label = game.i18n.format('SYNTHICIDE.Roll.Card.ItemRoll', { type: item.type, name: item.name });

    if (!item.system.formula || (item.system.roll.diceSize === "" && item.system.roll.diceBonus === "")) {
      return ChatMessage.create({
        speaker,
        flavor: label,
        content: item.system.description ?? '',
      }, {
        messageMode: game.settings.get('core', 'messageMode'),
      });
    }

    const rollData = item.getRollData();
    const evaluatedRoll = await new Roll(rollData.formula, rollData.actor).evaluate();
    const { total, d10, equation, dieClass } = getRollResultSummary(evaluatedRoll);
    const cardData = {
      title: label,
      subtype: 'item',
      equation,
      total,
      dieValue: d10,
      dieClass,
      equationTerms: buildItemEquationTerms(rollData, item),
      showEffectOutcomeRow: false,
      showDamageButton: false,
      showOpposedButton: false,
      flags: {
        actorUuid: item.actor?.uuid ?? null,
        userId: game.user.id,
        sourceItemUuid: item.uuid,
        messageMode: game.settings.get('core', 'messageMode'),
      },
      flavor: item.system.description ?? '',
      metadataRows: [
        { label: 'Formula', valueHtml: `<code>${foundry.utils.escapeHTML(String(rollData.formula ?? ''))}</code>` },
      ],
    };

    return createActionMessage({
      actor: item.actor,
      roll: evaluatedRoll,
      messageMode: game.settings.get('core', 'messageMode'),
      cardData,
    });
  }

  static getDefaultArtwork(itemData) {
    const imagePath = 'systems/synthicide/assets/icons/items/';
    const iconMap = SYNTHICIDE.ICON_TYPE_MAP || {};

    // Special handling for weapon subclasses
    if (itemData.type === 'weapon') {
      const weaponIcons = iconMap.weapon || {};
      if (itemData.system?.weaponType) {
        const weaponType = itemData.system.weaponType;
        const iconFile = weaponIcons[weaponType] || weaponIcons.default;
        if (iconFile) {
          return { img: imagePath + iconFile };
        }
      } else {
        return { img: imagePath + weaponIcons.default }
      }
    }

    // Fallback to type-based icon
    const icon = iconMap[itemData.type];
    if (icon) {
      return { img: imagePath + icon };
    }
    return super.getDefaultArtwork(itemData);
  }
}

// Build compact equation terms for the item roll card.
function buildItemEquationTerms(rollData, item) {
  const terms = [];
  try {
    const formula = String(rollData?.formula ?? '');
    const regex = /@attributes\.([a-zA-Z0-9_-]+)\.value/g;
    const seen = new Set();
    const actor = item?.actor;
    const actorAttrs = actor?.system?.attributes ?? {};
    const attrLabelText = game?.i18n?.localize?.('SYNTHICIDE.Roll.Card.Attribute') ?? 'Attribute';
    for (const match of formula.matchAll(regex)) {
      const key = match[1];
      if (seen.has(key)) continue;
      seen.add(key);
      const attrLabel = actorAttrs?.[key]?.label ?? key;
      const valueHtml = `<span class="synthicide-attr-pill"><img class="synthicide-attr-icon" src="/systems/synthicide/assets/icons/attributes/${foundry.utils.escapeHTML(key)}.png" alt="" /> ${foundry.utils.escapeHTML(attrLabel)}</span>`;
      terms.push({ label: attrLabelText, valueHtml });
    }
    if (terms.length > 0) return terms;
  // eslint-disable-next-line no-unused-vars
  } catch (err) {
    // ignore and fall through
  }
  // Fallback: show the item name as the source
  terms.push({ label: game?.i18n?.localize?.('SYNTHICIDE.Roll.Card.Source') ?? 'Source', value: item?.name ?? '' });
  return terms;
}
