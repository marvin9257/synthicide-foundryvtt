/**
 * Modernized Document-Driven ChatMessage subclass for Synthicide.
 * Strictly mirrors the dnd5e delegation pipeline architecture.
 */
export class SynthicideChatMessage extends ChatMessage {

  /* -------------------------------------------- */
  /*  Data Preparation & Database Pre-Hooks       */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preCreate(data, options, user) {
    if ((await super._preCreate(data, options, user)) === false) return false;

    const updates = {};

    // Automatically resolve missing speaker references before committing to the DB
    if (!this.speaker.actor && options.actor) {
      updates.speaker = ChatMessage.getSpeaker({ actor: options.actor });
    }

    this.updateSource(updates);
  }

  /* -------------------------------------------- */
  /*  Dynamic Client-Side Rendering Loop          */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async renderHTML(options = {}) {
    // 1. Let Core Foundry build the default visual bubble frame naturally
    const html = await super.renderHTML(options);

    // 2. Guard path: Fallback immediately if this isn't an instantiated system data model type
    if (!(this.system instanceof foundry.abstract.TypeDataModel)) {
      return html;
    }

    // 3. Delegate HTML compilation and inner injection down to the data model
    if ( typeof this.system?.getHTML === "function" ) {
      await this.system.getHTML(html, options);
    }

    // 4. Fire system-specific hooks for module compatibility (like Dice So Nice)
    Hooks.callAll("synthicide.renderChatMessage", this, html);

    return html;
  }


  /* -------------------------------------------- */
  /*  Centralized System Enrichment Fallbacks     */
  /* -------------------------------------------- */

  /**
   * Augments the live chat card markup frame for interactive listeners.
   * @param {HTMLElement} html - The compiled live element node
   * @protected
   */
  async _enrichChatCard(html) {
    if (!html.classList.contains("synthicide-card")) {
      html.classList.add("synthicide-card");
    }

    // Re-establish click toggle expand behaviors for core d10 tray containers safely
    html.querySelectorAll(".dice-roll").forEach(el => {
      el.addEventListener("click", event => {
        event.stopPropagation();
        el.classList.toggle("expanded");
      });
    });
  }

  /* -------------------------------------------- */
  /*  Universal Message Creation Factory          */
  /* -------------------------------------------- */

  /**
   * Universal Document-Driven Action Message Creator.
   * Stores raw data parameters into standard database fields to maintain full UI reactivity.
   */
  static async createActionMessage({ actor, roll, systemData, messageMode, whisper, type } = {}) {
    const normalizedMode = CONFIG.ChatMessage.modes?.[messageMode] ? messageMode : 'public';
    const documentType = type || systemData.subtype || "base";

    const chatData = {
      speaker: ChatMessage.getSpeaker({ actor }),
      type: documentType, // Coordinates data model lookup AND layout styling natively
      system: systemData,
      whisper: Array.isArray(whisper) && whisper.length ? whisper : undefined
    };

    if (roll) {
      chatData.rolls = [roll];
    }

    return await ChatMessage.implementation.create(chatData, { messageMode: normalizedMode, actor });
  }

  /* -------------------------------------------- */
  /*  System Backwards-Compatibility Helpers      */
  /* -------------------------------------------- */

  getCardPayload() {
    return this.constructor.getStandardizedRollData(this);
  }

  getWhisper() { return this.whisper ?? undefined; }
  getFirstRollTotal() { return this.rolls?.[0]?.total ?? undefined; }
  getSpeakerAlias() { return this.speaker?.alias ?? null; }

  static getStandardizedRollData(message) {
    const type = message.type ?? (message.system?.subtype ?? message.system?.type ?? null);
    const system = message.system?.toObject?.(false) ?? message.system ?? {};
    const legacyFlags = message.flags?.synthicide ?? {};
    return {
      subtype: type,
      ...legacyFlags,
      ...system,
      userId: system.userId,
      messageMode: system.messageMode,
      sourceItemUuid: system.sourceItemUuid,
      sourceMessageId: system.sourceMessageId,
    };
  }
}
