/**
 * Shared sheet context/tab utilities.
 *
 * HOW TO USE THESE HELPERS
 *
 * Typical flow inside a sheet class:
 * 1) Define a PARTS_BY_TYPE map for _configureRenderOptions.
 * 2) Define a TAB_MAP where each render part maps to:
 *    { id, icon, label }
 * 3) In _prepareContext, call buildBaseSheetContext(...) and include:
 *    tabs: this._getTabs(options.parts)
 * 4) In _preparePartContext, call assignTabContext(partId, context)
 *    before your per-part switch logic.
 * 5) In _getTabs(parts), call buildTabs(...) with:
 *    - parts
 *    - this.tabGroups
 *    - defaultTab
 *    - labelPrefix
 *    - TAB_MAP
 *
 * Notes:
 * - TAB_MAP keys are render part IDs (for example: "general", "effects").
 * - descriptor.id is the logical tab id used by the generic tab template.
 * - Multiple parts may share one descriptor.id (for example several
 *   attribute parts all map to id "attributes").
 * - labelPrefix + label should match localization keys used in lang files.
 */

/**
 * Build common context values shared by AppV2 document sheets.
 * @param {object} params
 * @param {foundry.applications.api.DocumentSheetV2} params.sheet
 * @param {Document} params.document
 * @param {string} params.documentKey
 * @param {Record<string, unknown>} [params.extra]
 * @returns {Record<string, unknown>}
 */
export function buildBaseSheetContext({ sheet, document, documentKey, extra = {} }) {
  const context = {
    editable: sheet.isEditable,
    owner: document.isOwner,
    limited: document.limited,
    [documentKey]: document,
    system: document.system,
    flags: document.flags,
    fields: document.schema.fields,
    systemFields: document.system.schema.fields,
  };

  return Object.assign(context, extra);
}

/**
 * Assign current tab context when the part has a corresponding tab entry.
 *
 * This keeps _preparePartContext lean. If the current part appears in
 * context.tabs, templates can always rely on context.tab being present.
 * @param {string} partId
 * @param {Record<string, unknown>} context
 */
export function assignTabContext(partId, context) {
  if (partId in (context.tabs || {})) {
    context.tab = context.tabs[partId];
  }
}

/**
 * Build tab descriptors for a set of rendered parts.
 * @param {object} params
 * @param {string[]} params.parts
 * @param {Record<string, string>} params.tabGroups
 * @param {string} params.defaultTab
 * @param {string} params.labelPrefix
 * @param {Record<string, {id: string, icon: string, label: string}>} params.tabMap
 * @param {string} [params.group='primary']
 * @returns {Record<string, Partial<ApplicationTab>>}
 *
 * Example descriptor entry in tabMap:
 *   general: { id: 'general', icon: 'fa-solid fa-info-circle', label: 'General' }
 */
export function buildTabs({
  parts,
  tabGroups,
  defaultTab,
  labelPrefix,
  tabMap,
  group = 'primary',
}) {
  if (!tabGroups[group]) tabGroups[group] = defaultTab;

  return parts.reduce((tabs, partId) => {
    const descriptor = tabMap[partId];
    if (!descriptor) return tabs;

    const tab = {
      cssClass: tabGroups[group] === descriptor.id ? 'active' : '',
      group,
      id: descriptor.id,
      icon: descriptor.icon,
      label: `${labelPrefix}${descriptor.label}`,
    };

    tabs[partId] = tab;
    return tabs;
  }, {});
}
