export const ICON_MAP = {
  trait: 'fa-solid fa-turn-up',
  bioclass: 'fa-solid fa-heart-circle-bolt',
  aspect: 'fa-solid fa-atom',
  attributes: 'fa-solid fa-sliders',
  general: 'fa-solid fa-info-circle',
  cybernetics: 'fa-solid fa-microchip',
  biography: 'fa-solid fa-file-lines',
  person: 'fa-solid fa-id-card',
  effects: 'fa-solid fa-bolt',
  abilities: 'fa-solid fa-gem',
  weapon: 'fa-solid fa-gun',
  armor: 'fa-solid fa-shield',
  consumable: 'fa-solid fa-battery-full',
  gear: 'fa-solid fa-toolbox',
  tool: 'fa-solid fa-hammer',
  default: 'fa-solid fa-box',
  description: 'fa-solid fa-file-lines'
};

/**
 * Return a Font Awesome icon string based on an Item document.
 * Expects an Item document object; warns and returns a default for invalid input.
 * @param {object} doc - The Item document to inspect (required)
 * @returns {string}
 */
export function getItemIcon(doc) {
  if (!doc || typeof doc !== 'object') {
    console.warn('getItemIcon expects an Item document; received:', doc);
    return ICON_MAP.default;
  }

  let resolvedType = doc.type || '';
  if (doc.system?.featureType) resolvedType = doc.system.featureType;
  return ICON_MAP[resolvedType] ?? ICON_MAP.default;
}
