import SYNTHICIDE from "../helpers/config.mjs";

export default class SynthicideActiveEffectConfig extends foundry.applications.sheets.ActiveEffectConfig {
  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    // Provide modifier targets map directly to the template (no JS localization)
    context.changeSelectOptions = SYNTHICIDE.MODIFIER_TARGETS || {};
    return context;
  }

  /** @override */
  async _renderChange(context) {
    const { change, index } = context;
    if ( typeof change.value !== "string" ) change.value = JSON.stringify(change.value);
    Object.assign(
      change,
      ["key", "type", "value", "phase", "priority"].reduce((paths, fieldName) => {
        paths[`${fieldName}Path`] = `system.changes.${index}.${fieldName}`;
        return paths;
      }, {})
    );

    const parent = this.document?.parent;
    // If this AE is embedded on an Item of type `trait`, render our custom change partial
    if ( parent?.documentName === 'Item' && parent?.type === 'trait' ) {
      // Ensure the select options are available on the per-change context too
      if (!context.changeSelectOptions) context.changeSelectOptions = SYNTHICIDE.MODIFIER_TARGETS || {};
      return foundry.applications.handlebars.renderTemplate('systems/synthicide/templates/sheets/active-effect/change-synthicide.hbs', context);
    }

    // Otherwise defer to base implementation
    return super._renderChange(context);
  }

  
}
