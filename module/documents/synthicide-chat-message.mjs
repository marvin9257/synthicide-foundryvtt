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
    const messageType = cardData?.type ?? CONST.BASE_DOCUMENT_TYPE;
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
   * Universal Document-Driven Action Message Creator.
   * Compiles template HTML upfront to eliminate reactive validation leaks,
   * guaranteeing exactly one clean, fully animated chat card pass.
   * @param {object} params
   * @param {Actor} params.actor
   * @param {Roll|null} params.roll
   * @param {object} params.systemData
   * @param {string} params.messageMode
   * @param {string[]} params.whisper
   * @param {string} params.template
   */
  static async createActionMessage({ actor, roll, systemData, messageMode, whisper, template } = {}) {
    const normalizedMode = this.normalizeMessageMode(messageMode);
    const activeTemplate = template ?? "systems/synthicide/templates/chat/action-roll-card.hbs";

    // 1. DYNAMIC TYPE LOOKUP: Sourced directly from your system data models configuration layer
    const cardSubtype = systemData.subtype ?? systemData.type ?? CONST.BASE_DOCUMENT_TYPE;
    const ModelClass = CONFIG.ChatMessage.dataModels?.[cardSubtype];

    // Build a temporary, local model schema instance wrapper to securely calculate class getters
    let systemInstance = systemData;
    if (ModelClass) {
      systemInstance = new ModelClass(systemData, { parent: null});
    }

    // 2. Invoke the data model's self-contained contract wrapper
    const templateData = systemInstance.templateContext ?? { system: systemInstance };
    
    // Natively merge parent message structures for Handlebars speaker template compatibility
    templateData.speaker = ChatMessage.getSpeaker({ actor });
    templateData.system = systemInstance;

    const renderedContent = await foundry.applications.handlebars.renderTemplate(activeTemplate, templateData);

    // 3. CONSOLIDATED DATA PAYLOAD: Package a fully complete document context configuration
    const chatData = {
      speaker: ChatMessage.getSpeaker({ actor }),
      type: cardSubtype,
      system: systemData,
      content: renderedContent, // The card frame body text is fully prepared and provided upfront!
      style: CONST.CHAT_MESSAGE_STYLES.ROLL,
      whisper: Array.isArray(whisper) && whisper.length ? whisper : undefined
    };

    // 4. DATABASE COMMIT: Consumes the roll natively to fire 3D dice while printing exactly ONE card
    if (roll) {
      return await roll.toMessage(chatData, { 
        messageMode: normalizedMode, 
        create: true 
      });
    }
    return await ChatMessage.implementation.create(chatData, { messageMode: normalizedMode });
  }
}
