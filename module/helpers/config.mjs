const SYNTHICIDE = {};
// Centralized shocking strike outcome constants and flavor keys
SYNTHICIDE.SHOCK_OUTCOMES = {
  LETHAL: 'lethal',
  SUCCESS: 'success',
  DEATH: 'death',
  MINUS_ONE: 'minusOne',
};

SYNTHICIDE.SHOCK_FLAVOR_KEYS = {
  [SYNTHICIDE.SHOCK_OUTCOMES.LETHAL]: 'SYNTHICIDE.Chat.Shock.LethalApplied',
  [SYNTHICIDE.SHOCK_OUTCOMES.SUCCESS]: 'SYNTHICIDE.Chat.Shock.Success',
  [SYNTHICIDE.SHOCK_OUTCOMES.DEATH]: 'SYNTHICIDE.Chat.Shock.FailureDeath',
  [SYNTHICIDE.SHOCK_OUTCOMES.MINUS_ONE]: 'SYNTHICIDE.Chat.Shock.FailureMinusOne',
};

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

// Settings constants
SYNTHICIDE.SHEET_STYLE_SETTING_KEY = 'sheetStyleMode';
SYNTHICIDE.DEFAULT_TARGET_ARMOR_KEY = 'defaultTargetArmor';
SYNTHICIDE.SHEET_STYLE_CLASSIC = 'classic';
SYNTHICIDE.SHEET_STYLE_BOLD = 'rulebookBold';
SYNTHICIDE.USE_SHOCKING_STRIKE_KEY = 'useShockingStrike';

// Virtual Grid Movement Setting Key
SYNTHICIDE.VIRTUAL_GRID_MOVEMENT_KEY = 'virtualGridMovement';
SYNTHICIDE.DEMOLITION_AUTO_SCATTER_KEY = 'demolitionAutoScatter';

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

/**
 * The set of Attribute Scores abbreviations used within the system.
 * @type {Object}
 */
SYNTHICIDE.attributeAbbreviations = {
  awareness: 'SYNTHICIDE.Attribute.Awareness.abbr',
  combat: 'SYNTHICIDE.Attribute.Combat.abbr',
  toughness: 'SYNTHICIDE.Attribute.Toughness.abbr',
  influence: 'SYNTHICIDE.Attribute.Influence.abbr',
  operation: 'SYNTHICIDE.Attribute.Operation.abbr',
  nerve: 'SYNTHICIDE.Attribute.Nerve.abbr',
  speed: 'SYNTHICIDE.Attribute.Speed.abbr',
};

/**
 * Centralized roll difficulty and sucess levels used by action-roll workflows.
 * @type {Object}
 */
SYNTHICIDE.rolls = {
  challengeDifficulties: [
    { value: 3, label: 'SYNTHICIDE.Roll.Difficulty.Easy' },
    { value: 6, label: 'SYNTHICIDE.Roll.Difficulty.Standard' },
    { value: 9, label: 'SYNTHICIDE.Roll.Difficulty.Difficult' },
    { value: 12, label: 'SYNTHICIDE.Roll.Difficulty.Challenging' },
    { value: 15, label: 'SYNTHICIDE.Roll.Difficulty.Fantastic' },
    { value: 21, label: 'SYNTHICIDE.Roll.Difficulty.Epic' },
    { value: 27, label: 'SYNTHICIDE.Roll.Difficulty.Legendary' },
  ],
  degreeBands: [
    { min: 10, label: 'SYNTHICIDE.Roll.Degree.Superb' },
    { min: 5, label: 'SYNTHICIDE.Roll.Degree.Excellent' },
    { min: 0, label: 'SYNTHICIDE.Roll.Degree.Standard' },
    { min: Number.NEGATIVE_INFINITY, label: 'SYNTHICIDE.Roll.Degree.Failure' },
  ],
};

/**
 * Trait type choices for items.  We store an object mapping the type
 * key to the corresponding localization key.  This lets callers simply
 * iterate the entries or derive the list of valid types with
 * `Object.keys(SYNTHICIDE.traitTypes)` when constructing schemas.
 * `spell` remains as a valid trait subtype (spells are represented as traits).
 * @type {Object}
 */
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

/**
 * Motivation choices for actors, referencing localization keys.
 * @type {Object}
 */
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

/**
 * Constants for validating data.
 */
//Alowed Trait levels
SYNTHICIDE.ALLOWED_TRAIT_LEVELS = [1, 4, 7];
//items that have quantity, weight and could be equipped
SYNTHICIDE.GEAR_TYPES = ["gear", "armor", "weapon", "drugs"];
SYNTHICIDE.EQUIPABLE = ["armor", "weapon"];

/**
 * Weapon Constants
 */
SYNTHICIDE.WEAPON_CLASSES = {
  melee: "SYNTHICIDE.Item.Weapon.Melee.label",
  ranged: "SYNTHICIDE.Item.Weapon.Ranged.label",
  demolition: "SYNTHICIDE.Item.Weapon.Demolition.label"
};

SYNTHICIDE.WEAPON_TYPES = {
  melee: {
    axe: "SYNTHICIDE.Item.Weapon.Melee.Axe",
    hammer: "SYNTHICIDE.Item.Weapon.Melee.Hammer",
    knife: "SYNTHICIDE.Item.Weapon.Melee.Knife",
    martial: "SYNTHICIDE.Item.Weapon.Melee.Martial",
    sword: "SYNTHICIDE.Item.Weapon.Melee.Sword"
  },
  ranged: {
    pistol: "SYNTHICIDE.Item.Weapon.Ranged.Pistol",
    rifle: "SYNTHICIDE.Item.Weapon.Ranged.Rifle",
    shotgun: "SYNTHICIDE.Item.Weapon.Ranged.Shotgun"
  },
  demolition: {
    grenade: "SYNTHICIDE.Item.Weapon.Demolition.Grenade",
    mine: "SYNTHICIDE.Item.Weapon.Demolition.Mine",
    charge: "SYNTHICIDE.Item.Weapon.Demolition.Charge"
  }
};

SYNTHICIDE.WEAPON_FEATURES = {
  melee: {
    twoHanded: "SYNTHICIDE.Item.Weapon.Melee.Feature.TwoHanded",
    primative: "SYNTHICIDE.Item.Weapon.Melee.Feature.Primative",
    counter: "SYNTHICIDE.Item.Weapon.Melee.Feature.Counter",
    guard: "SYNTHICIDE.Item.Weapon.Melee.Feature.Guard"
  },
  ranged: {
    twoHanded: "SYNTHICIDE.Item.Weapon.Melee.Feature.TwoHanded",
    primative: "SYNTHICIDE.Item.Weapon.Melee.Feature.Primative",
    close: "SYNTHICIDE.Item.Weapon.Ranged.Feature.Close",
    guard: "SYNTHICIDE.Item.Weapon.Ranged.Feature.Guard",
    slow1: "SYNTHICIDE.Item.Weapon.Ranged.Feature.Slow1",
    slow2: "SYNTHICIDE.Item.Weapon.Ranged.Feature.Slow2",
    spread: "SYNTHICIDE.Item.Weapon.Ranged.Feature.Spread"
  },
  demolition: {
    blast3: "SYNTHICIDE.Item.Weapon.Demolition.Feature.Blast3",
    blast5: "SYNTHICIDE.Item.Weapon.Demolition.Feature.Blast5",
    stun: "SYNTHICIDE.Item.Weapon.Demolition.Feature.Stun",
    plant8: "SYNTHICIDE.Item.Weapon.Demolition.Feature.Plant8",
    plant12: "SYNTHICIDE.Item.Weapon.Demolition.Feature.Plant12"
  }
};
SYNTHICIDE.WEAPON_MODIFICATIONS = {
  melee: {
    none: "SYNTHICIDE.Item.Weapon.Melee.Modification.None",
    expertCrafting: "SYNTHICIDE.Item.Weapon.Melee.Modification.ExpertCrafting",
    minaturized: "SYNTHICIDE.Item.Weapon.Melee.Modification.Minaturized",
    baneTuneOrganics: "SYNTHICIDE.Item.Weapon.Melee.Modification.BaneTuneOrganics",
    baneTuneSynthetics: "SYNTHICIDE.Item.Weapon.Melee.Modification.BaneTuneSynthetics",
    reach: "SYNTHICIDE.Item.Weapon.Melee.Modification.Reach",
    telescoping: "SYNTHICIDE.Item.Weapon.Melee.Modification.Telescoping",
    enhancedAlloy: "SYNTHICIDE.Item.Weapon.Melee.Modification.EnhancedAlloy",
    poisonReservoir: "SYNTHICIDE.Item.Weapon.Melee.Modification.PoisonReservoir"
  },
  ranged: {
    none: "SYNTHICIDE.Item.Weapon.Ranged.Modification.None",
    longRange: "SYNTHICIDE.Item.Weapon.Ranged.Modification.LongRange",
    expertCrafting: "SYNTHICIDE.Item.Weapon.Ranged.Modification.ExpertCrafting",
    snubNose: "SYNTHICIDE.Item.Weapon.Ranged.Modification.SnubNose",
    fullAuto: "SYNTHICIDE.Item.Weapon.Ranged.Modification.FullAuto",
    silencing: "SYNTHICIDE.Item.Weapon.Ranged.Modification.Silencing",
    battleAssist: "SYNTHICIDE.Item.Weapon.Ranged.Modification.BattleAssist",
    minaturized: "SYNTHICIDE.Item.Weapon.Ranged.Modification.Minaturized",
    baneTuneOrganics: "SYNTHICIDE.Item.Weapon.Ranged.Modification.BaneTuneOrganics",
    baneTuneSynthetics: "SYNTHICIDE.Item.Weapon.Ranged.Modification.BaneTuneSynthetics",
    scanningScope: "SYNTHICIDE.Item.Weapon.Ranged.Modification.ScanningScope",
    highPowered: "SYNTHICIDE.Item.Weapon.Ranged.Modification.HighPowered",
    slugShot: "SYNTHICIDE.Item.Weapon.Ranged.Modification.SlugShot",
    doubleShot: "SYNTHICIDE.Item.Weapon.Ranged.Modification.DoubleShot",
    rapidReload: "SYNTHICIDE.Item.Weapon.Ranged.Modification.RapidReload"
  },
  demolition: {
    none: "SYNTHICIDE.Item.Weapon.Ranged.Modification.None"
  }
};

SYNTHICIDE.WEAPON_AMMO = {
  none: "SYNTHICIDE.Item.Weapon.Ranged.Ammo.None",
  cryo: "SYNTHICIDE.Item.Weapon.Ranged.Ammo.Cryo",
  cinder: "SYNTHICIDE.Item.Weapon.Ranged.Ammo.Cinder",
  knockBack: "SYNTHICIDE.Item.Weapon.Ranged.Ammo.KnockBack",
  homing: "SYNTHICIDE.Item.Weapon.Ranged.Ammo.Homing",
  poison: "SYNTHICIDE.Item.Weapon.Ranged.Ammo.Poison",
  powerWounding: "SYNTHICIDE.Item.Weapon.Ranged.Ammo.PowerWounding",
  flash: "SYNTHICIDE.Item.Weapon.Ranged.Ammo.Flash",
  anchor: "SYNTHICIDE.Item.Weapon.Ranged.Ammo.Anchor",
  bouncing: "SYNTHICIDE.Item.Weapon.Ranged.Ammo.Bouncing"
};

SYNTHICIDE.ARMOR_MODIFICATIONS = {
  none: "SYNTHICIDE.Item.Armor.Modification.None",
  endoPlating: "SYNTHICIDE.Item.Armor.Modification.EndoPlating",
  lighterMaterials: "SYNTHICIDE.Item.Armor.Modification.LighterMaterials",
  psychicInsulator: "SYNTHICIDE.Item.Armor.Modification.PsychicInsulator",
  superiorCrafting: "SYNTHICIDE.Item.Armor.Modification.SuperiorCrafting",
  reinforcedHelmet: "SYNTHICIDE.Item.Armor.Modification.ReinforcedHelmet",
  slick: "SYNTHICIDE.Item.Armor.Modification.Slick",
  radiative: "SYNTHICIDE.Item.Armor.Modification.Radiative",
  reactiveCamo: "SYNTHICIDE.Item.Armor.Modification.ReactiveCamo",
  calling: "SYNTHICIDE.Item.Armor.Modification.Calling"
}

/**
 * The valid target Area Types in the game system.
 */
SYNTHICIDE.AREA_TARGET_TYPES = {
  none: {
    label: "SYNTHICIDE.Target.None",
    template: ""
  },
  radius: {
    label: "SYNTHICIDE.Target.Radius",
    template: "circle"
  },
  sphere: {
    label: "SYNTHICIDE.Target.Sphere",
    template: "circle"
  },
  cylinder: {
    label: "SYNTHICIDE.Target.Cylinder",
    template: "circle"
  },
  cone: {
    label: "SYNTHICIDE.Target.Cone",
    template: "cone"
  },
  square: {
    label: "SYNTHICIDE.Target.Square",
    template: "rect"
  },
  cube: {
    label: "SYNTHICIDE.Target.Cube",
    template: "rect"
  },
  line: {
    label: "SYNTHICIDE.Target.Line",
    template: "ray"
  },
  wall: {
    label: "SYNTHICIDE.Target.Wall",
    template: "ray"
  }
};

export default SYNTHICIDE;

// Example derivation for selectOptions and behaviors:
// const motivationOptions = Object.fromEntries(Object.entries(SYNTHICIDE.motivations).map(([k, v]) => [k, v.label]));
// const motivationBehaviors = Object.fromEntries(Object.entries(SYNTHICIDE.motivations).map(([k, v]) => [k, v.behavior]));

