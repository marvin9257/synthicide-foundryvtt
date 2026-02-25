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

SYNTHICIDE.getBioclassPreset = (bioclassType) =>
  SYNTHICIDE.bioclassPresets[bioclassType] ?? SYNTHICIDE.bioclassPresets.skinbag;

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

