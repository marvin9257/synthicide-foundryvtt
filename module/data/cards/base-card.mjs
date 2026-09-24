import { canExecuteFollowup, executeDerivedDamageRoll, executeOpposedChallengeRoll } from "../../rolls/action-rolls.mjs";
import { getDieClass } from "../../rolls/roll-utils.mjs";

const fields = foundry.data.fields;

/**
 * Clean Official Base Card Data Model.
 * Natively integrates with standard Foundry VTT document lifecycles.
 */
export class BaseCardSystemData extends foundry.abstract.TypeDataModel {
  /**
   * Official Foundry VTT configuration property.
   * Tells the core engine which layout template to natively parse during super.renderHTML().
   * @type {string}
   */
  static TEMPLATE_URL = "systems/synthicide/templates/chat/action-roll-card.hbs";

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();
    // Standard API alignment: Compute non-persisted properties here reactively
    this.dieClass = getDieClass(this.d10, 10);
  }

  static defineSchema() {
    return {
      actorUuid: new fields.StringField({ required: false, nullable: true, blank: true, initial: '' }),
      sourceItemUuid: new fields.StringField({ required: false, blank: true, initial: '' }),
      sourceMessageId: new fields.StringField({ required: false, blank: true, initial: '' }),
      subtype: new fields.StringField({ required: false, blank: true, initial: '' }),
      total: new fields.NumberField({ required: false, integer: true, initial: 0 }),
      actorName: new fields.StringField({ required: false, blank: true, initial: '' }),
      d10: new fields.NumberField({ required: false, integer: true, initial: 0 })
    };
  }

  get templateContext() {
    return {
      type: this.subtype || this.type,
      title: this.title ?? "",
      flavor: this.flavor ?? "",
      equation: this.equation ?? "",
      equationTerms: this.equationTerms ?? [],
      metadataRows: this.metadataRows ?? [],
      showTotalRow: this.showTotalRow ?? true,
      total: this.total ?? 0,
      actorName: this.actorName ?? "",
      dieValue: this.d10 ?? 0,
      dieClass: this.dieClass
    };
  }

  /**
   * Centralized UI HTML Enrichment Pass.
   * Inherited automatically by all card subclasses.
   * @param {HTMLElement} html - The live browser DOM fragment node for the message card
   * @param {object} options - Structural parameters passed by the renderer
   */
  async getHTML(html, _options = {}) {
    // 1. Resolve template locations safely using the static configuration parameter
    const template = this.constructor.TEMPLATE_URL ?? BaseCardSystemData.TEMPLATE_URL;

    // 2. Construct context structures cleanly utilizing getters
    const context = {
      ...this.templateContext,
      system: this,
      message: this.parent, // 'this.parent' targets the ChatMessage document safely inside TypeDataModels
      user: game.user,
      speaker: this.parent?.speaker
    };

    // 3. Render embedded dice collections via core frameworks reactively
    if (this.parent?.rolls?.length) {
      context.rollHtml = await Promise.all(this.parent.rolls.map(r => r.render())).then(htmls => htmls.join(""));
    } else {
      context.rollHtml = "";
    }

    // 4. Compile layout text strings via core template engines
    const innerHTML = await foundry.applications.handlebars.renderTemplate(template, context);

    // 5. Safely target Foundry's message content envelope container and slot the inner markup
    const contentContainer = html.querySelector(".message-content");
    if (contentContainer) {
      contentContainer.innerHTML = innerHTML;
    }

    // 6. Apply shared architectural styling anchors directly onto the live wrapper frame
    if (!html.classList.contains("synthicide-card")) {
      html.classList.add("synthicide-card", `subtype-${this.subtype || this.type}`);
    }

    // 7. Bind shared layout interaction animations (like expanding dice boxes)
    html.querySelectorAll(".dice-roll").forEach(el => {
      el.addEventListener("click", event => {
        event.stopPropagation();
        el.classList.toggle("expanded");
      });
    });

    html.querySelectorAll("[data-action]").forEach(btn => {
      btn.addEventListener("click", async event => {
        event.preventDefault();
        if (btn.disabled) return;

        const action = btn.dataset.action;

        // Security Check Integration Rule: Verify follow-up permission rules
        if (action === "rollDamage" && !canExecuteFollowup(this.parent)) {
          ui.notifications.warn(game.i18n.localize('SYNTHICIDE.Roll.Warnings.NotPermitted'));
          return;
        }

        // Global Click-Locking State Guard
        btn.disabled = true;
        try {
          // Dynamic Action Routing
          if (action === "rollOpposed") {
            await executeOpposedChallengeRoll({ sourceMessage: this.parent });
          } else if (action === "rollDamage") {
            await executeDerivedDamageRoll({ sourceMessage: this.parent });
          }
        } finally {
          btn.disabled = false;
        }
      });
    });
  }
}
