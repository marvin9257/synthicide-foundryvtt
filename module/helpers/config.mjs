const SYNTHICIDE = {};

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
    bodyType: 'Organic',
    brainType: 'Organic',
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
        name: 'Techless Will',
        description:
          'Three times per day, add +3 to any attribute check (including Speed). In battle this lasts 1 round; in roleplay it applies to one check.',
      },
      {
        sort: 20,
        name: 'Genetic Legacy',
        description:
          'Choose one: Mutant Dog or Dying Breed. Mutant Dog grants 4 mutation-only trait points and -2 Nerve. Dying Breed grants milestone attribute and trait bonuses as described by the bioclass.',
      },
    ],
  },
  scraphead: {
    bodyType: 'Organic',
    brainType: 'Rigged',
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
        name: 'Hard Brain',
        description: 'You may not purchase psychic powers with trait points.',
      },
      {
        sort: 20,
        name: 'Starter Software',
        description:
          'Choose a knowledge focus and gain 2 of its powers, as listed in character traits and powers.',
      },
    ],
  },
  hardshell: {
    bodyType: 'Rigged',
    brainType: 'Organic',
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
        name: 'Starter Hardware',
        description:
          'Choose one permanent increase: Cyber Eyes (+1 Awareness) or Servo Limbs (+1 Combat).',
      },
    ],
  },
  rigfiend: {
    bodyType: 'Rigged',
    brainType: 'Rigged',
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
        name: 'Mod Focused',
        description:
          'You cannot gain psychic powers and cannot permanently mutate through traits. General traits cost 3 TP instead of 2.',
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

