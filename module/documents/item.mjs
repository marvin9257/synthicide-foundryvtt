

import { createActionMessage } from '../rolls/action-rolls.mjs';
import SYNTHICIDE from '../helpers/config.mjs';

/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class SynthicideItem extends Item {
  /**
   * Intercept equipped checkbox changes and trigger equip logic.
   */
  async _preUpdate(changed, options, user) {
    const allowed = await super._preUpdate(changed, options, user);
    if (allowed === false) return false;

    if (this.type === "armor" && changed?.system?.equipped !== undefined && !options._fromEquipLogic) {
      if (changed?.system?.equipped) {
        await this.actor.equipArmor(this.id);
      } else {
        await this.actor.update({'system.armorValues.forceBarrier.value': 0}, {render: false})
      }
    }
    return allowed;
  }
  
  /**
   * Equip this item. For armor, ensures only one is equipped. For other items, equips this item if not already equipped.
   */
  async equip() {
    if (!SYNTHICIDE.EQUIPABLE.includes(this.type)) return;
    if (this.type === "armor") {
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
    const item = this;

    // Initialize chat data.
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const label = game.i18n.format('SYNTHICIDE.Roll.Card.ItemRoll', {type: item.type, name: item.name});

    // If there's no roll data, send a chat message.
    if (!this.system.formula || (this.system.roll.diceSize === "" && this.system.roll.diceBonus === "")) {
      return ChatMessage.create({
        speaker: speaker,
        flavor: label,
        content: item.system.description ?? '',
      }, {
        messageMode: game.settings.get('core', 'messageMode'),
      });
    }
    // Otherwise, create a roll and render it using the action-roll card.
    else {
      const rollData = this.getRollData();
      const evaluatedRoll = await new Roll(rollData.formula, rollData.actor).evaluate();
      const total = Number(evaluatedRoll.total ?? 0);
      const dieValue = Number(evaluatedRoll.dice?.[0]?.results?.[0]?.result ?? 0);
      let dieClass = '';
      if (Number.isFinite(dieValue)) {
        if (dieValue <= 1) dieClass = 'min';
        else if (dieValue >= 10) dieClass = 'max';
      }

      const cardData = {
        title: label,
        subtype: 'item',
        equation: evaluatedRoll.result,
        total,
        dieValue,
        dieClass,
        equationTerms: buildItemEquationTerms(rollData, this),
        showEffectOutcomeRow: false,
        showDamageButton: false,
        showOpposedButton: false,
        flags: {
          actorUuid: this.actor?.uuid ?? null,
          userId: game.user.id,
          sourceItemUuid: this.uuid,
          messageMode: game.settings.get('core', 'messageMode'),
        },
        flavor: this.system.description ?? '',
        metadataRows: [
          { label: 'Formula', valueHtml: `<code>${foundry.utils.escapeHTML(String(rollData.formula ?? ''))}</code>` },
        ],
      };

      return createActionMessage({
        actor: this.actor,
        roll: evaluatedRoll,
        messageMode: game.settings.get('core', 'messageMode'),
        cardData,
      });
    }
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
