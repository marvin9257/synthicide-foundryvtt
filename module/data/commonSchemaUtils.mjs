import SYNTHICIDE from '../helpers/config.mjs';

/**
 * Return a standardized modifiers ArrayField for item schemas.
 * Targets are a curated list (attributes + common derived/roll/flag paths).
 */
export function makeModifiersField() {
  const fields = foundry.data.fields;

  // Use the canonical modifier target keys from the central config so there
  // is a single source of truth for exposed modifier targets (attributes,
  // derived slots, etc.)
  const targetChoicesMap = Object.assign({}, SYNTHICIDE.MODIFIER_TARGETS || {});

  return new fields.ArrayField(
    new fields.SchemaField({
      target: new fields.StringField({ required: true, choices: targetChoicesMap }),
      formula: new fields.StringField({ required: true, blank: false, initial: '+0' }),
      condition: new fields.StringField({ required: false, blank: true, initial: '' }),
      priority: new fields.NumberField({ required: false, integer: true, initial: 0 }),
      stacking: new fields.StringField({ required: false, choices: { stack: 'stack', highest: 'highest', replace: 'replace' }, initial: 'stack' }),
      source: new fields.StringField({ required: false, blank: true, initial: '' }),
      needsReview: new fields.BooleanField({ required: false, initial: false }, { persisted: false })
    }),
    { initial: [] }
  );
}
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
    value: new fields.NumberField({required: true, integer: false, initial: initialValue}),
  }, schemaOptions);
}

/**
 * Produce the derived field for value modifier pairs where value isn't persisted.
 * @param {number} initialValue
 * @param {object} schemaOptions  Options passed to the outer schema.
 * @returns {ResourceData}
 */
export function makeDerivedField(initialValue = 0, schemaOptions={}) {
  return new fields.SchemaField({
    modifier: new fields.NumberField({ ...requiredInteger, initial: 0 }),
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
 * Convert field from string to number respecting local number format, if necessary.
 * @param {any} source data source (document.system)
 * @param {string} field  system field to convert.
 * @returns {void}
 */
export function migrateStringToNumber(source, field) {
  if ( Object.hasOwn(source, field)) {
    if ( typeof source[field] !== 'number') {
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