const SYNTHICIDE = {};

// Centralized debug flags for system modules
SYNTHICIDE.debug = {
  /** Enable detailed modifier aggregation debugging in Actor */
  synthicideModifiers: false,
  /** Enable detailed bioclass application debugging in Item-Bioclass */
  synthicideBioclass: false,
  // Add more debug flags as needed
};

export default SYNTHICIDE;
/**
 * Bioclass type choices used in the system.
 */
SYNTHICIDE.bioclassTypes = {
  skinbag: 'SYNTHICIDE.Item.Bioclass.Skinbag',
  scraphead: 'SYNTHICIDE.Item.Bioclass.Scraphead',
  hardshell: 'SYNTHICIDE.Item.Bioclass.Hardshell',
  rigfiend: 'SYNTHICIDE.Item.Bioclass.Rigfiend',
};

SYNTHICIDE.bioclassPresets = {
  skinbag: {
    description: 'SYNTHICIDE.Item.Bioclass.PresetDescriptions.skinbag',
    bodyType: 'Organic', // key, localize at display
    brainType: 'Organic', // key, localize at display
    bodySlots: 0,
    brainSlots: 0,
    startingAttributes: {
      awareness: 2,
      combat: 0,
      toughness: -1,
      influence: 1,
      operation: 0,
      nerve: 1,
      speed: 1,
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
    description: 'SYNTHICIDE.Item.Bioclass.PresetDescriptions.scraphead',
    bodyType: 'Organic', // key, localize at display
    brainType: 'Rigged', // key, localize at display
    bodySlots: 0,
    brainSlots: 1,
    startingAttributes: {
      awareness: 0,
      combat: 0,
      toughness: -1,
      influence: -1,
      operation: 3,
      nerve: 3,
      speed: 1,
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
    description: 'SYNTHICIDE.Item.Bioclass.PresetDescriptions.hardshell',
    bodyType: 'Rigged', // key, localize at display
    brainType: 'Organic', // key, localize at display
    bodySlots: 2,
    brainSlots: 0,
    startingAttributes: {
      awareness: 2,
      combat: 0,
      toughness: 0,
      influence: 1,
      operation: 0,
      nerve: 1,
      speed: 1,
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
    description: 'SYNTHICIDE.Item.Bioclass.PresetDescriptions.rigfiend',
    bodyType: 'Rigged', // key, localize at display
    brainType: 'Rigged', // key, localize at display
    bodySlots: 4,
    brainSlots: 2,
    startingAttributes: {
      awareness: 1,
      combat: 1,
      toughness: 0,
      influence: -1,
      operation: 2,
      nerve: 2,
      speed: 1,
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
  const description = preset.description ?? '';
  // Ensure traits have name and description fields for schema validation
  const traits = (preset.traits || []).map(trait => ({
    sort: trait.sort,
    key: trait.key ?? '',
    name: trait.name ?? '',
    description: trait.description ?? ''
  }));
  return { ...preset, description, traits };
};

// Returns a normalized aspect preset for a given aspect type
SYNTHICIDE.getAspectPreset = (aspectType) => {
  const preset = SYNTHICIDE.aspectPresets[aspectType] ?? { traits: [], abilities: [] };
  const description = preset.description ?? '';
  // Ensure abilities are always objects with a description property
  const abilities = (preset.abilities || []).map(a =>
    typeof a === 'string' ? { description: a } : (a.description ? a : { description: String(a) })
  );
  const traits = (preset.traits || []).map(trait => ({
    sort: trait.sort,
    name: trait.name ?? '',
    description: trait.description ?? ''
  }));
  return { ...preset, description, abilities, traits };
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
      return SYNTHICIDE.getAspectPreset(subtype) || { traits: [] };
    default:
      return { traits: [] };
  }
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

// Aspects are handled by the new Feature class but we provide a
// registry here for future presets and helpers.
SYNTHICIDE.aspectTypes = {
  brainiac: 'SYNTHICIDE.Item.Aspect.Types.brainiac',
  bulbhead: 'SYNTHICIDE.Item.Aspect.Types.bulbhead',
  leader: 'SYNTHICIDE.Item.Aspect.Types.leader',
  scoundrel: 'SYNTHICIDE.Item.Aspect.Types.scoundrel',
  thug: 'SYNTHICIDE.Item.Aspect.Types.thug',
};

// A minimal placeholder for aspect presets.  Actual data will be
// fleshed out as the schema for aspects is determined.
SYNTHICIDE.aspectPresets = {
  brainiac: {
    description: 'SYNTHICIDE.Item.Aspect.PresetDescriptions.brainiac',
    abilities: [
      { description: 'So long as requirements are met, select 3 knowledge focuses and gain 2 powers from each.'},
      { description: 'After character creation, you may purchase new knowledge focuses with 1 less trait point.'}
    ],
    traits: [
      { sort: 10, name: 'Attribute Increase', description: '+2 Operation' },
      { sort: 20, name: 'Attribute Penalty (Mandatory)', description: '-1 to any one attribute except Operation'}
    ]
  },
  bulbhead: {
    description: 'SYNTHICIDE.Item.Aspect.PresetDescriptions.bulbhead',
    abilities: [
      { description: 'Gain any 2 psychic powers, so long as you meet the requirements.'},
      { description: 'You are a psychic that struggles to function without Illuminix, an addictive and illegal substance traded underground. Every day you must consume doses of Illuminix equal to the highest level psychic power you want to use (1 dose to access 1st level powers, 4 doses for 4th level powers, etc). A Bulbhead who fails to score a dose of Illuminix is wracked with withdrawal, unable to access psychic powers and suffering -2 to every attribute. A single dose lifts the penalty.'},
      { description: 'After character creation, you may purchase new psychic powers with 1 less trait point.'}
    ],
    traits: [
      { sort: 10, name: 'Attribute Increase', description: '+2 Influence' },
      { sort: 20, name: 'Attribute Penalty (Mandatory)', description: '-1 to any one attribute except Influence' }
    ]
  },
  leader: {
    description: 'SYNTHICIDE.Item.Aspect.PresetDescriptions.leader',
    abilities: [
      { description: 'Gain any 2 tactical powers for which you meet the requirements.' },
      { description: 'New tactical powers cost 1 less TP' }
    ],
    traits: [
      { sort: 10, name: 'Attribute Increase', description: '+2 Awareness' },
      { sort: 20, name: 'Attribute Penalty (Mandatory)', description: '-1 to any one attribute except Awareness or Nerve' }
    ]
  },
  scoundrel: {
    description: 'SYNTHICIDE.Item.Aspect.PresetDescriptions.scoundrel',
    abilities: [
      { description: 'Gain access to any 1 knowledge focus you meet requirements for' },
      { description: 'Battle Opportunist ability:  You also gain the Battle Opportunist ability, which grants the following: 1) Add +2 DMG to attacks against overpowered and unaware targets, 2) After or just before you gain advantage, you may move 4 squares at no AP cost, 3) If you choose the attack bonus effect from gain advantage add +3 ATT to your attack roll instead of +2., and 4) Battle Opportunist can be improved via general traits purchased at 4th and 7th level.'}
    ],
    traits: [
      { sort: 10, name: 'Attribute Increase', description: '+1 Influence, +1 Speed' },
      { sort: 20, name: 'Attribute Penalty (Mandatory)', description: '-1 to any one attribute except Influence, Operation, or Speed' }
    ]
  },
  thug: {
    description: 'SYNTHICIDE.Item.Aspect.PresetDescriptions.thug',
    abilities: [
      { description: 'You gain 1 weapon proficiency and 1 attack skill.' },
      { description: 'You also gain an extra 4 maximum hit points.' },
      { description: 'After character creation, you may purchase new attack skills with 1 less trait point.' }
    ],
    traits: [
      { sort: 10, name: 'Attribute Increase', description: '+1 Combat, +1 Toughness' },
      { sort: 20, name: 'Attribute Penalty (Mandatory)', description: '-1 to any one attribute except Combat or Toughness' }
    ]
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

