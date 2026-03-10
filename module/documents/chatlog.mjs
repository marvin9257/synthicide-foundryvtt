/**
 * The sidebar chat tab.
 * @extends {ChatLog}
 * @mixes HandlebarsApplication
 */
export class SynthicideChatLog extends foundry.applications.sidebar.tabs.ChatLog {
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

/** Function that adds chat card context
* @param {ContextMenuEntry[]} coreContext
* @returns {ContextMenuEntry[]} object of context
*/
function newContextOptions(coreContext)  {
  const canApply = li => {
    const message = game.messages.get(li.dataset?.messageId);
    return (message?.isRoll || message.getFlag('synthicide', 'actionRoll.damage.total') )&& message?.isContentVisible && canvas.tokens?.controlled.length;
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
  const actionRollData = message.getFlag('synthicide', 'actionRoll');
  const baseDamage = actionRollData?.damage?.total ?? message.rolls[0]?.total;
  if (baseDamage > 0) {
    return Promise.all(canvas.tokens.controlled.map(t => {
      const targetActor = t.actor;
      if (["sharper", "npc"].includes(targetActor.type)) {
        const damage = Math.floor(baseDamage * multiplier);
        if (multiplier > 0) {
          const messageMode = actionRollData?.messageMode ?? actionRollData?.messageType ?? undefined;
          const whisper = message.whisper ?? undefined;
          const lethal = actionRollData?.lethal ?? actionRollData?.attack?.lethal ?? 0;
          const options = {
            messageMode,
            whisper,
            sourceItemUuid: actionRollData?.sourceItemUuid ?? null,
            attack: actionRollData?.attack ?? null,
            lethal,
          };
          targetActor.damageActor(damage, options);
        } else if (multiplier < 0 ) {
          targetActor.healActor(-damage);
        }
      } else {
        ui.notifications.warn("SYNTHICIDE.Warnings.CantAutoDamage", {localize: true});
      }
    }));
  } else {
    ui.notifications.warn("SYNTHICIDE.Warnings.NoDamageToApply", {localize: true});
  }
}