const SYNTHICIDE = {};
// Shared dropdown options for bodyType and brainType
SYNTHICIDE.bodyBrainTypes = {
  Organic: 'SYNTHICIDE.Item.BodyType.Organic',
  Rigged: 'SYNTHICIDE.Item.BodyType.Rigged'
};

// Centralized debug flags for system modules
SYNTHICIDE.debug = {
  /** Enable detailed modifier aggregation debugging in Actor */
  synthicideModifiers: false,
  /** Enable detailed bioclass application debugging in Item-Bioclass */
  synthicideBioclass: false,
  // Add more debug flags as needed
};

SYNTHICIDE.SHEET_STYLE_SETTING_KEY = 'sheetStyleMode';
SYNTHICIDE.DEFAULT_TARGET_ARMOR_KEY = 'defaultTargetArmor';
SYNTHICIDE.SHEET_STYLE_CLASSIC = 'classic';
SYNTHICIDE.SHEET_STYLE_BOLD = 'rulebookBold';
SYNTHICIDE.USE_SHOCKING_STRIKE_KEY= 'useShockingStrike'

/**
 * The set of Attribute Scores used within the system.
 * @type {Object}
 */

SYNTHICIDE.attributes = {
  awareness: 'SYNTHICIDE.Attribute.Awareness.long',
  combat: 'SYNTHICIDE.Attribute.Combat.long',
  toughness: 'SYNTHICIDE.Attribute.Toughness.long',
  influence: 'SYNTHICIDE.Attribute.Influence.long',
  operation: 'SYNTHICIDE.Attribute.Operation.long',
  nerve: 'SYNTHICIDE.Attribute.Nerve.long',
  speed: 'SYNTHICIDE.Attribute.Speed.long',
};

SYNTHICIDE.attributeAbbreviations = {
  awareness: 'SYNTHICIDE.Attribute.Awareness.abbr',
  combat: 'SYNTHICIDE.Attribute.Combat.abbr',
  toughness: 'SYNTHICIDE.Attribute.Toughness.abbr',
  influence: 'SYNTHICIDE.Attribute.Influence.abbr',
  operation: 'SYNTHICIDE.Attribute.Operation.abbr',
  nerve: 'SYNTHICIDE.Attribute.Nerve.abbr',
  speed: 'SYNTHICIDE.Attribute.Speed.abbr',
};

// Centralized roll configuration used by action-roll workflows.
SYNTHICIDE.rolls = {
  challengeDifficulties: [
    { value: 3, key: 'SYNTHICIDE.Roll.Difficulty.Easy' },
    { value: 6, key: 'SYNTHICIDE.Roll.Difficulty.Standard' },
    { value: 9, key: 'SYNTHICIDE.Roll.Difficulty.Difficult' },
    { value: 12, key: 'SYNTHICIDE.Roll.Difficulty.Challenging' },
    { value: 15, key: 'SYNTHICIDE.Roll.Difficulty.Fantastic' },
    { value: 21, key: 'SYNTHICIDE.Roll.Difficulty.Epic' },
    { value: 27, key: 'SYNTHICIDE.Roll.Difficulty.Legendary' },
  ],
  degreeBands: [
    { min: 10, key: 'SYNTHICIDE.Roll.Degree.Superb' },
    { min: 5, key: 'SYNTHICIDE.Roll.Degree.Excellent' },
    { min: 0, key: 'SYNTHICIDE.Roll.Degree.Standard' },
    { min: Number.NEGATIVE_INFINITY, key: 'SYNTHICIDE.Roll.Degree.Failure' },
  ],
};

// Trait type choices for items.  We store an object mapping the type
// key to the corresponding localization key.  This lets callers simply
// iterate the entries or derive the list of valid types with
// `Object.keys(SYNTHICIDE.traitTypes)` when constructing schemas.
// `spell` remains as a valid trait subtype (spells are represented as traits).
SYNTHICIDE.traitTypes = {
  aspect: 'SYNTHICIDE.Item.Trait.Types.aspect',
  bioclass: 'SYNTHICIDE.Item.Trait.Types.bioclass',
  attackSkill: 'SYNTHICIDE.Item.Trait.Types.attackSkill',
  knowledgeFocus: 'SYNTHICIDE.Item.Trait.Types.knowledgeFocus',
  psychicPower: 'SYNTHICIDE.Item.Trait.Types.psychicPower',
  tacticalPower: 'SYNTHICIDE.Item.Trait.Types.tacticalPower',
  mutation: 'SYNTHICIDE.Item.Trait.Types.mutation',
  generalTalent: 'SYNTHICIDE.Item.Trait.Types.generalTalent',
  naturalTalent: 'SYNTHICIDE.Item.Trait.Types.naturalTalent',
  spell: 'SYNTHICIDE.Item.Trait.Types.spell'
};


// Motivation choices for actors, referencing localization keys.
SYNTHICIDE.motivations = {
  proveStrength: {
    label: 'SYNTHICIDE.Actor.Motivation.proveStrength.label',
    behavior: 'SYNTHICIDE.Actor.Motivation.proveStrength.behavior',
  },
  spreadWisdom: {
    label: 'SYNTHICIDE.Actor.Motivation.spreadWisdom.label',
    behavior: 'SYNTHICIDE.Actor.Motivation.spreadWisdom.behavior',
  },
  forgiveness: {
    label: 'SYNTHICIDE.Actor.Motivation.forgiveness.label',
    behavior: 'SYNTHICIDE.Actor.Motivation.forgiveness.behavior',
  },
  getEven: {
    label: 'SYNTHICIDE.Actor.Motivation.getEven.label',
    behavior: 'SYNTHICIDE.Actor.Motivation.getEven.behavior',
  },
  makeFriends: {
    label: 'SYNTHICIDE.Actor.Motivation.makeFriends.label',
    behavior: 'SYNTHICIDE.Actor.Motivation.makeFriends.behavior',
  },
  knowUniverse: {
    label: 'SYNTHICIDE.Actor.Motivation.knowUniverse.label',
    behavior: 'SYNTHICIDE.Actor.Motivation.knowUniverse.behavior',
  },
  liveFast: {
    label: 'SYNTHICIDE.Actor.Motivation.liveFast.label',
    behavior: 'SYNTHICIDE.Actor.Motivation.liveFast.behavior',
  },
};

export default SYNTHICIDE;

// Example derivation for selectOptions and behaviors:
// const motivationOptions = Object.fromEntries(Object.entries(SYNTHICIDE.motivations).map(([k, v]) => [k, v.label]));
// const motivationBehaviors = Object.fromEntries(Object.entries(SYNTHICIDE.motivations).map(([k, v]) => [k, v.behavior]));

