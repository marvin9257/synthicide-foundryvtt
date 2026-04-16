
/**
 * Base item system model.
 *
 * DataModel context: instance methods execute on the item system model
 * (`item.system`), not on the Item document.
 */
export default class SynthicideItemBase extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = {};
    schema.description = new fields.HTMLField();
    return schema;
  }

  /**
   * Foundry hook: Called when the item is created.
    * @this {SynthicideItemBase}
    * @param {object} data
    * @param {object} options
    * @param {string} userId
    * @returns {Promise<void>}
   */
  async _onCreate(data, options, userId) {
    super._onCreate(data, options, userId);
    if (game.userId !== userId) return;
    // special onCreate code follows
  }

  /**
   * Foundry hook: Called when the item is updated.
    * @this {SynthicideItemBase}
    * @param {object} changed
    * @param {object} options
    * @param {string} userId
    * @returns {Promise<void>}
   */
  async _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);
    if (game.userId !== userId) return;
    // Special onpdatecode follows
  }

  /**
   * Foundry hook: Called when the item is deleted.
    * @this {SynthicideItemBase}
    * @param {object} options
    * @param {string} userId
    * @returns {Promise<void>}
   */
  async _onDelete(options, userId) {
    super._onDelete(options, userId);
    if (game.userId !== userId) return;
    // Special onDelete code follows.
  }
}
