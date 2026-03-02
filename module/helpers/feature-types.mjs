export const FEATURE_TYPE = Object.freeze({
  BIOCLASS: 'bioclass',
  ASPECT: 'aspect',
});

export const FEATURE_TYPES = Object.freeze(Object.values(FEATURE_TYPE));

const FEATURE_TYPE_SET = new Set(FEATURE_TYPES);

export function isFeatureType(type) {
  return FEATURE_TYPE_SET.has(type);
}
