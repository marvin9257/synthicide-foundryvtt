const SYNTHICIDE = {};

// Centralized debug flags for system modules
SYNTHICIDE.debug = {
  /** Enable detailed modifier aggregation debugging in Actor */
  synthicideModifiers: true,
  /** Enable detailed bioclass application debugging in Item-Bioclass */
  synthicideBioclass: true,
  // Add more debug flags as needed
};

export default SYNTHICIDE;
/**
 * Bioclass type choices used in the system.
 */
SYNTHICIDE.bioclassTypes = [
  'skinbag',
  'scraphead',
  'hardshell',
  'rigfiend'
];



SYNTHICIDE.bioclassPresets = {
  skinbag: {
    bodyType: 'Organic', // key, localize at display
    brainType: 'Organic', // key, localize at display
    bodySlots: 0,
    brainSlots: 0,
    startingAttributes: {
      actions: 2,
      awareness: 0,
      combat: -1,
      nerve: 1,
      speed: 0,
      toughness: 1,
      will: 1,
      hp: 35,
      hpPerLevel: 5,
    },
    traits: [
      {
        sort: 10,
        key: 'TechlessWill',
      },
      {
        sort: 20,
        key: 'GeneticLegacy',
      },
    ],
  },
  scraphead: {
    bodyType: 'Organic', // key, localize at display
    brainType: 'Rigged', // key, localize at display
    bodySlots: 0,
    brainSlots: 1,
    startingAttributes: {
      actions: 0,
      awareness: 0,
      combat: -1,
      nerve: -1,
      speed: 3,
      toughness: 3,
      will: 1,
      hp: 35,
      hpPerLevel: 5,
    },
    traits: [
      {
        sort: 10,
        key: 'HardBrain',
      },
      {
        sort: 20,
        key: 'StarterSoftware',
      },
    ],
  },
  hardshell: {
    bodyType: 'Rigged', // key, localize at display
    brainType: 'Organic', // key, localize at display
    bodySlots: 2,
    brainSlots: 0,
    startingAttributes: {
      actions: 2,
      awareness: 0,
      combat: 0,
      nerve: 1,
      speed: 0,
      toughness: 1,
      will: 1,
      hp: 42,
      hpPerLevel: 6,
    },
    traits: [
      {
        sort: 10,
        key: 'StarterHardware',
      },
    ],
  },
  rigfiend: {
    bodyType: 'Rigged', // key, localize at display
    brainType: 'Rigged', // key, localize at display
    bodySlots: 4,
    brainSlots: 2,
    startingAttributes: {
      actions: 1,
      awareness: 1,
      combat: 0,
      nerve: -1,
      speed: 2,
      toughness: 2,
      will: 1,
      hp: 42,
      hpPerLevel: 6,
    },
    traits: [
      {
        sort: 10,
        key: 'ModFocused',
      },
    ],
  },
};

SYNTHICIDE.getBioclassPreset = (bioclassType) => {
  const preset = SYNTHICIDE.bioclassPresets[bioclassType] ?? SYNTHICIDE.bioclassPresets.skinbag;
  // Ensure traits have name and description fields for schema validation
  const traits = (preset.traits || []).map(trait => ({
    sort: trait.sort,
    key: trait.key ?? '',
    name: trait.name ?? '',
    description: trait.description ?? ''
  }));
  return { ...preset, traits };
};

// Unified preset getter for any feature subtype.  `type` should be
// "bioclass" or "aspect" and `subtype` the specific category value.
// Returns an object containing at least `traits` (and for bioclasses,
// `startingAttributes`, `bodySlots`, `brainSlots`, etc).
SYNTHICIDE.getFeaturePreset = (type, subtype) => {
  switch (type) {
    case 'bioclass':
      return SYNTHICIDE.getBioclassPreset(subtype);
    case 'aspect':
      return SYNTHICIDE.aspectPresets[subtype] || { traits: [] };
    default:
      return { traits: [] };
  }
};

SYNTHICIDE.bioclassToActorAttributeMap = {
  actions: 'operation',
  will: 'influence',
};

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

// Trait type choices for items.  We store an object mapping the type
// key to the corresponding localization key.  This lets callers simply
// iterate the entries or derive the list of valid types with
// `Object.keys(SYNTHICIDE.traitTypes)` when constructing schemas.
// The `'spell'` entry remains to handle legacy items.
SYNTHICIDE.traitTypes = {
  bioclass: 'SYNTHICIDE.Item.Trait.Types.bioclass',
  attackSkill: 'SYNTHICIDE.Item.Trait.Types.attackSkill',
  knowledgeFocus: 'SYNTHICIDE.Item.Trait.Types.knowledgeFocus',
  psychicPower: 'SYNTHICIDE.Item.Trait.Types.psychicPower',
  tacticalPower: 'SYNTHICIDE.Item.Trait.Types.tacticalPower',
  mutation: 'SYNTHICIDE.Item.Trait.Types.mutation',
  generalTalent: 'SYNTHICIDE.Item.Trait.Types.generalTalent',
  naturalTalent: 'SYNTHICIDE.Item.Trait.Types.naturalTalent',
  spell: 'SYNTHICIDE.Item.Trait.Types.spell' // legacy
};

// Aspects are handled by the new Feature class but we provide a
// registry here for future presets and helpers.
SYNTHICIDE.aspectTypes = [
  'brainiac',
  'bulbhead',
  'leader',
  'scoundrel',
  'thug'
];

// A minimal placeholder for aspect presets.  Actual data will be
// fleshed out as the schema for aspects is determined.
SYNTHICIDE.aspectPresets = {
  brainiac: {
    abilities: [
      'Select 3 knowledge focuses and gain 2 powers from each',
      'After creation purchase new knowledge focuses for 1 less TP'
    ],
    traits: [
      { sort: 10, name: 'Gifted with prodigal intellect', description: '' }
    ]
  },
  bulbhead: {
    abilities: [
      'Gain any 2 psychic powers (requirements permitting)',
      'Purchasing new psychic powers costs 1 less TP'
    ],
    traits: []
  },
  leader: {
    abilities: [
      'Gain any 2 tactical powers (requirements permitting)',
      'New tactical powers cost 1 less TP'
    ],
    traits: []
  },
  scoundrel: {
    abilities: [
      'Gain access to any 1 knowledge focus you meet requirements for',
      'Battle Opportunist ability (free move when gaining advantage/setup)'
    ],
    traits: []
  },
  thug: {
    abilities: [
      'Gain 1 weapon proficiency and 1 battle power',
      'Extra max HP equal to HP per level',
      'New battle powers cost 1 less TP'
    ],
    traits: []
  }
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

// Example derivation for selectOptions and behaviors:
// const motivationOptions = Object.fromEntries(Object.entries(SYNTHICIDE.motivations).map(([k, v]) => [k, v.label]));
// const motivationBehaviors = Object.fromEntries(Object.entries(SYNTHICIDE.motivations).map(([k, v]) => [k, v.behavior]));

