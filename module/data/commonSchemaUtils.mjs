const fields = foundry.data.fields;
const requiredInteger = { required: true, nullable: false, integer: true };

/**
 * Data structure for character's resources.
 * @param {number} initialValue initial Value
 * @param {number} initialMax initial Maximum
 * @param {object} schemaOptions  Options passed to the outer schema.
 * @returns {ResourceData}
 */
export function makeResourceField(initialValue, initialMax, schemaOptions={}) {
  return new fields.SchemaField({
    value: new fields.NumberField({required: true, integer: true, initial: initialValue}),
    max: new fields.NumberField({required: true, integer: true, initial: initialMax}),
    min: new fields.NumberField({required: true, integer: true, initial: 0}),
    label: new fields.StringField({required: true})
  }, schemaOptions);
}

/**
 * Produce the schema field for a simple value trait.
 * @param {number} initialValue
 * @param {object} schemaOptions  Options passed to the outer schema.
 * @returns {ResourceData}
 */
export function makeValueField(initialValue = 0, schemaOptions={}) {
  return new fields.SchemaField({
    value: new fields.NumberField({required: true, integer: true, initial: initialValue}),
  }, schemaOptions);
}

/**
 * Produce the derived field for value modifier pairs where value isn't persisted.
 * @param {number} initialValue
 * @param {object} schemaOptions  Options passed to the outer schema.
 * @returns {ResourceData}
 */
export function makeDerivedField(initialValue = 0, schemaOptions={persisted: false}) {
  return new fields.SchemaField({
    modifier: new fields.NumberField({ ...requiredInteger, initial: 0 }, { persisted: false }),
    value: new fields.NumberField({ ...requiredInteger, initial: initialValue }, {persisted: false})
  }, schemaOptions);
}

/**
 * Produce actor implant slot summary schema (body/head usage pools).
 * @param {object} schemaOptions Options passed to the outer schema.
 * @returns {SchemaField}
 */
export function makeImplantSlotsField(schemaOptions = {}) {
  return new fields.SchemaField({
    body: new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 0 }, { persisted: false }),
      max: new fields.NumberField({ ...requiredInteger, initial: 0 }, { persisted: false }),
      remaining: new fields.NumberField({ ...requiredInteger, initial: 0 }, { persisted: false }),
    }),
    head: new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 0 }, { persisted: false }),
      max: new fields.NumberField({ ...requiredInteger, initial: 0 }, { persisted: false }),
      remaining: new fields.NumberField({ ...requiredInteger, initial: 0 }, { persisted: false }),
    }),
  }, schemaOptions);
}

/**
 * Produce a force-barrier schema with configurable defaults and field options.
 * @param {object} options
 * @param {number} options.valueInitial
 * @param {number} options.maxInitial
 * @param {number} options.recoveryRateInitial
 * @param {object} options.valueFieldOptions
 * @param {object} options.maxFieldOptions
 * @param {object} options.recoveryRateFieldOptions
 * @param {object} options.schemaOptions
 * @returns {SchemaField}
 */
export function makeForceBarrierField({
  valueInitial = 0,
  maxInitial = 0,
  recoveryRateInitial = 0,
  valueFieldOptions = {},
  maxFieldOptions = {},
  recoveryRateFieldOptions = {},
  schemaOptions = {},
} = {}) {
  return new fields.SchemaField({
    value: new fields.NumberField({ ...requiredInteger, initial: valueInitial, min: 0 }, valueFieldOptions),
    max: new fields.NumberField({ ...requiredInteger, initial: maxInitial, min: 0 }, maxFieldOptions),
    recoveryRate: new fields.NumberField(
      { ...requiredInteger, initial: recoveryRateInitial, min: 0 },
      recoveryRateFieldOptions
    ),
  }, schemaOptions);
}

/**
 * Compute implant slot usage summary for an actor from bioclass + equipped implants.
 * @param {Actor|null|undefined} actor
 * @returns {{ body: { value: number, max: number, remaining: number }, head: { value: number, max: number, remaining: number } }}
 */
export function getImplantSlotSummary(actor) {
  const bioclass = actor?.itemTypes?.bioclass?.[0]?.system;
  const summary = {
    body: {
      value: 0,
      max: Number(bioclass?.bodySlots ?? 0),
      remaining: 0,
    },
    head: {
      value: 0,
      max: Number(bioclass?.brainSlots ?? 0),
      remaining: 0,
    },
  };

  for (const implant of actor?.itemTypes?.implant ?? []) {
    if (!implant.system?.equipped) continue;
    const location = implant.system?.location ?? 'body';
    if (!(location in summary)) continue;
    summary[location].value += Number(implant.system?.slotSize ?? 1);
  }

  for (const pool of Object.values(summary)) {
    pool.remaining = pool.max - pool.value;
  }

  return summary;
}

/**
 * Parse a Knowledge Area trait's HTML description into a set of selectable powers.
 * Uses a lightweight template parser, simple string splitting, and Foundry's native slugify.
 * Guarantees a minimum of 3 powers by filling in generic fallbacks if needed.
 * 
 * @param {string} html The item's `system.description` HTML.
 * @returns {Object<string, string>} Map of slug key -> power name, in document order.
 */
export function parseKnowledgePowerOptions(html) {
  const options = {};
  
  // 1. If HTML is completely empty, skip straight to filling the 3 fallbacks
  if (html?.trim()) {
    // Convert string to elements using a lightweight template
    const template = globalThis.document.createElement("template");
    template.innerHTML = html;
    
    // Gather all list items, fallback to paragraphs if none exist
    let nodes = template.content.querySelectorAll("ul li");
    if (!nodes.length) nodes = template.content.querySelectorAll("p");

    const usedKeys = new Set();

    nodes.forEach((node, index) => {
      const text = node.textContent.trim().replace(/\s+/g, " ");
      if (!text) return;

      // Simple Split: Break text at the first colon (:), dash (—), or hyphen (-)
      const parts = text.split(/[:—-]/);
      let name = parts[0] ? parts[0].trim().slice(0, 60) : "";

      // Fallback if the line did not contain a separator
      if (!name || parts.length === 1) name = `Power ${index + 1}`;

      // Generate a clean unique key using Foundry VTT's native slugify helper
      let key = name.slugify() || `power-${index + 1}`;
      let suffix = 2;
      while (usedKeys.has(key)) {
        key = `${key}-${suffix++}`;
      }
      usedKeys.add(key);

      options[key] = name;
    });
  }

  // 2. FALLBACK GUARANTEE: Ensure at least 3 powers always exist in the map
  let fallbackIndex = 1;
  while (Object.keys(options).length < 3) {
    const fallbackName = `Power ${fallbackIndex}`;
    const fallbackKey = `power-${fallbackIndex}`;
    
    // Only add if this specific key doesn't clash with an already parsed power
    if (!options[fallbackKey]) {
      options[fallbackKey] = fallbackName;
    }
    fallbackIndex++;
  }

  return options;
}

/**
 * Convert field from string to number respecting local number format, if necessary.
 * @param {any} source data source (document.system)
 * @param {string} field  system field to convert.
 * @returns {void}
 */
export function migrateStringToNumber(source, field) {
  if (Object.hasOwn(source, field)) {
    if (typeof source[field] !== "number") {
      source[field] = parseLocaleNumber(source[field]) || 0;
    }
  }
}


/**
 * Convert field from number to string.
 * @param {any} source data source (document.system)
 * @param {string} field  system field to convert.
 * @returns {void}
 */
export function migrateNumberToString(source, field) {
  if ( Object.hasOwn(source, field)) {
    if ( typeof source[field] !== 'string') {
      source[field] = source[field]?.toString() || "0";
    }
  }
}

/**
 * Convert field from string to string array.
 * @param {any} source data source (document.system)
 * @param {string} field  system field to convert.
 * @returns {void}
 */
export function migrateStringToStringArray(source, field) {
  if ( Object.hasOwn(source, field)) {
    if ( typeof source[field] !== 'object') {
      source[field] = [source[field] ?? ""];
    }
  }
}

/**
 * Parse a localized number string to a float.
 * @param {string} stringNumber - The localized number string.
 * @returns {number} - The float value of the localized number.
 */
export function parseLocaleNumber(stringNumber) {
  if (stringNumber) {
    const thousandSeparator = Intl.NumberFormat(game.i18n.lang).formatToParts(11111)[1].value;
    const decimalSeparator = Intl.NumberFormat(game.i18n.lang).formatToParts(1.1)[1].value;

    return parseFloat(
      stringNumber
        .replace(new RegExp('\\' + thousandSeparator, 'g'), '')
        .replace(new RegExp('\\' + decimalSeparator), '.')
    );
  } else {
    return NaN;
  }
}