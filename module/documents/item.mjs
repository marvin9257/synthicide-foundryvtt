

import { createActionMessage, openSynthicideActionRollDialog } from '../rolls/action-rolls.mjs';
import { getRollResultSummary } from '../rolls/roll-utils.mjs';
import SYNTHICIDE from '../helpers/config.mjs';

/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class SynthicideItem extends Item {
  /**
   * Intercept equipped checkbox changes and trigger equip logic.
   * Now handled in _onUpdate for consistency.
   */
  async _preUpdate(changed, options, user) {
    const allowed = await super._preUpdate(changed, options, user);
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

    if (!this.actor) return;
    // Only trigger if this is armor and not from equip logic
    if (this.type === "armor" && changed?.system?.equipped !== undefined && !options._fromEquipLogic) {
      if (changed?.system?.equipped) {
        await this.actor.equipArmor(this.id);
      } else {
        await this.actor.update({'system.armorValues.forceBarrier.value': 0}, {render: false});
      }
    }
  }
  
  /**
   * Equip this item. For armor, ensures only one is equipped. For other items, equips this item if not already equipped.
   */
  async equip() {
    if (!SYNTHICIDE.EQUIPABLE.includes(this.type)) return;
    if (this.type === "armor" && this.actor) {
      // Update armor items and unequip where necessary
      await this.actor.equipArmor(this.id);
    } else if (!this.system.equipped) {
      // Only update if not already equipped
      await this.update({ "system.equipped": true });
    }
  }

  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    // As with the actor class, items are documents that can have their data
    // preparation methods overridden (such as prepareBaseData()).
    super.prepareData();
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
   * Handle clickable rolls.
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
