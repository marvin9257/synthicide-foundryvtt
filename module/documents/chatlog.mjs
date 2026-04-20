import { getStandardizedRollData } from '../rolls/roll-utils.mjs';
/**
 * The chat popout
 * @extends {ChatPopout}
 *
 */
export class SynthicideChatPopout extends foundry.applications.sidebar.apps.ChatPopout {
  /** @inheritDoc */
  /**
   * Get context menu entries for chat messages in the log.
   * @returns {ContextMenuEntry[]}
   * @inheritDoc
   */
  _getEntryContextOptions() {
    const options = super._getEntryContextOptions();
    return newContextOptions(options);
  }
}

let synthicideChatContextHookRegistered = false;

/**
 * Register context menu augmentation for chat messages.
 * Call during init so ChatLog first render picks up custom options.
 */
export function registerSynthicideChatContextHook() {
  if (synthicideChatContextHookRegistered) return;
  Hooks.on('getChatMessageContextOptions', (_app, options) => {
    newContextOptions(options);
  });
  synthicideChatContextHookRegistered = true;
}

/** Function that adds chat card context
* @param {ContextMenuEntry[]} coreContext
* @returns {ContextMenuEntry[]} object of context
*/
function newContextOptions(coreContext)  {
  if (coreContext.some(o => o?.label === game.i18n.localize("SYNTHICIDE.Chat.Roll.ApplyDamage"))) {
    return coreContext;
  }

  const canApply = li => {
    const message = game.messages.get(li.dataset?.messageId);
    const rollData = getStandardizedRollData(message);
    return Boolean((message?.isRoll || (rollData && typeof rollData.total === 'number'))
      && message?.isContentVisible
      && canvas.tokens?.controlled.length);
  };
  coreContext.push(
    {
      label: game.i18n.localize("SYNTHICIDE.Chat.Roll.ApplyDamage"),
      icon: '<i class="fas fa-user-minus"></i>',
      visible: canApply,
      onClick: (_event, li) => applyChatCardDamage(li, 1)
    },
    {
      label: game.i18n.localize("SYNTHICIDE.Chat.Roll.ApplyHealing"),
      icon: '<i class="fas fa-user-plus"></i>',
      visible: canApply,
      onClick: (_event, li) => applyChatCardDamage(li, -1)
    }
  );
  return coreContext;
}

/**
 * Apply rolled dice damage to the token or tokens which are currently controlled.
 *
 * @param {HTMLElement} li      The chat entry which contains the roll data
 * @param {number} multiplier   A damage multiplier to apply to the rolled damage.
 * @returns {Promise|undefined}
 */
function applyChatCardDamage(li, multiplier) {
  const message = game.messages.get(li.dataset?.messageId);
  if (!message) {
    ui.notifications.warn("SYNTHICIDE.Warnings.NoDamageToApply", {localize: true});
    return;
  }
  const rollData = getStandardizedRollData(message);
  const baseDamage = rollData.total ?? message.rolls?.[0]?.total;
  if (baseDamage > 0) {
    return Promise.all(canvas.tokens.controlled.map(t => {
      const targetActor = t.actor;
      if (["sharper", "npc"].includes(targetActor.type)) {
        const damage = Math.floor(baseDamage * multiplier);
        if (multiplier > 0) {
          const messageMode = rollData.messageMode ?? undefined;
          const whisper = message.whisper ?? undefined;
          const lethal = rollData.lethal ?? 0;
          const options = {
            messageMode,
            whisper,
            sourceItemUuid: rollData.sourceItemUuid ?? null,
            attack: rollData.subtype === 'attack' ? rollData : null,
            lethal,
            userId: game.user.id,
          };
          return targetActor.damageActor(damage, options);
        } else if (multiplier < 0 ) {
          return targetActor.healActor(-damage);
        }
        return undefined;
      } else {
        ui.notifications.warn("SYNTHICIDE.Warnings.CantAutoDamage", {localize: true});
        return undefined;
      }
    }));
  } else {
    ui.notifications.warn("SYNTHICIDE.Warnings.NoDamageToApply", {localize: true});
  }
}