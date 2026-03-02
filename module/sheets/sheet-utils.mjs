/**
 * Clone an array-valued system field from a document.
 * @param {Document} document
 * @param {string} field
 * @returns {Array<unknown>}
 */
export function cloneSystemArray(document, field) {
  const value = document?.system?.[field];
  return Array.isArray(value) ? foundry.utils.deepClone(value) : [];
}

/**
 * Apply a mutation callback to an array-valued system field and persist.
 * @param {Document} document
 * @param {string} field
 * @param {(array: Array<unknown>) => (void|boolean)} mutate
 * @returns {Promise<void>}
 */
export async function mutateSystemArray(document, field, mutate) {
  const values = cloneSystemArray(document, field);
  const shouldPersist = mutate(values);
  if (shouldPersist === false) return;
  await document.update({ [`system.${field}`]: values });
}

/**
 * Remove a row at dataset-provided index from an array-valued system field.
 * @param {Document} document
 * @param {string} field
 * @param {string|number} indexValue
 * @returns {Promise<void>}
 */
export async function removeSystemArrayIndex(document, field, indexValue) {
  const index = Number(indexValue);
  await mutateSystemArray(document, field, values => {
    if (index < 0 || index >= values.length) return false;
    values.splice(index, 1);
    return true;
  });
}
