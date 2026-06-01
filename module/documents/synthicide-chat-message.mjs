/**
 * A lightweight ChatMessage subclass for Synthicide that centralizes
 * card/roll message preprocessing (speaker, system deep-clone, style)
 * and provides convenience helpers for working with action/card payloads.
 */
export class SynthicideChatMessage extends ChatMessage {
  /**
   * Intercept message creation to normalise common chat/card fields.
   * Keep changes minimal: ensure `speaker`, `system` is cloned, and
   * default `style` is set for roll-like messages.
   */
  static async create(data = {}, options = {}) {
    const chatData = typeof data === 'object' && data ? data : {};

    // Ensure speaker is present when an actor was supplied
    if (!chatData.speaker && chatData.actor) {
      chatData.speaker = ChatMessage.getSpeaker({ actor: chatData.actor });
    }

    // Clone system card data to avoid accidental mutation by callers
    if (chatData.system && foundry?.utils?.deepClone) {
      chatData.system = foundry.utils.deepClone(chatData.system);
    }

    // Default chat style for roll cards when not provided
    if (typeof chatData.style === 'undefined') {
      const styles = CONST.CHAT_MESSAGE_STYLES;
      chatData.style = styles.ROLL ?? styles.OTHER ?? 0;
    }

    return super.create(chatData, options);
  }

  /**
   * Prepare a chat data object from common card pieces.
   * This mirrors the previous `buildChatMessageData` but centralizes cloning
   * and defaults so callers no longer need to duplicate that logic.
   */
  static prepareData({ actor, content, cardData, whisper } = {}) {
    const chatData = {
      speaker: ChatMessage.getSpeaker({ actor }),
      content,
      style: CONST.CHAT_MESSAGE_STYLES.ROLL ?? CONST.CHAT_MESSAGE_STYLES.OTHER ?? 0,
    };

    chatData.system = foundry?.utils?.deepClone ? foundry.utils.deepClone(cardData?.system ?? {}) : (cardData?.system ?? {});
    // Prefer `cardData.type` for the ChatMessage `type` (used to select the DataModel),
    // but prefer `cardData.subtype` for the system-level `subtype` used by templates and logic.
    const messageType = cardData?.type ?? cardData?.subtype ?? CONST.BASE_DOCUMENT_TYPE;
    chatData.type = String(messageType);
    const systemSubtype = cardData?.subtype ?? cardData?.type ?? '';
    if (systemSubtype) chatData.system.subtype = String(systemSubtype);
    if (cardData?.flags) {
      chatData.flags = foundry?.utils?.deepClone ? foundry.utils.deepClone(cardData.flags) : cardData.flags;
    }
    if (cardData?.title) chatData.title = cardData.title;
    if (Array.isArray(whisper) && whisper.length) chatData.whisper = whisper;
    return chatData;
  }

  /**
   * Instance helper to return the standardized card/roll payload for this message.
   * Mirrors the old `getStandardizedRollData(message)` utility so callers can use
   * `message.getCardPayload()` instead of importing the utility.
   */
  getCardPayload() {
    return this.constructor.getStandardizedRollData(this);
  }

  /** Return the whisper array or undefined. */
  getWhisper() {
    return this.whisper ?? undefined;
  }

  /** Return the total of the first embedded Roll, if any. */
  getFirstRollTotal() {
    return this.rolls?.[0]?.total ?? undefined;
  }

  /** Return speaker alias for convenience. */
  getSpeakerAlias() {
    return this.speaker?.alias ?? null;
  }

  static normalizeMessageMode(mode) {
    return CONFIG.ChatMessage.modes?.[mode] ? mode : 'public';
  }

  static getStandardizedRollData(message) {
    const type = message.type ?? (message.system?.subtype ?? message.system?.type ?? null);
    const system = message.system?.toObject?.(false) ?? message.system ?? {};
    const legacyFlags = message.flags?.synthicide ?? {};
    const payload = { ...legacyFlags, ...system };
    return {
      subtype: type,
      ...payload,
      userId: payload.userId,
      messageMode: payload.messageMode,
      sourceItemUuid: payload.sourceItemUuid,
      sourceMessageId: payload.sourceMessageId,
    };
  }

  /**
   * High-level helper to render card HTML (when needed), prepare chat data,
   * and create the chat message (via `roll.toMessage` when a Roll is provided).
   */
  static async createActionMessage({ actor, roll, cardData, template, messageMode, whisper } = {}) {
    const normalizedMode = this.normalizeMessageMode(messageMode);

    if (roll) {
      const rollHtml = await roll.render();
      const cardHtml = await foundry.applications.handlebars.renderTemplate(template, { ...cardData, rollHtml });
      return roll.toMessage(this.prepareData({ actor, content: cardHtml, cardData, whisper }), {
        messageMode: normalizedMode,
        create: true,
      });
    }

    const cardHtml = await foundry.applications.handlebars.renderTemplate(template, cardData);
    const chatData = this.prepareData({ actor, content: cardHtml, cardData, whisper });
    return this.create(chatData, { messageMode: normalizedMode });
  }
}
