import SynthicideItemBase from './base-item.mjs';
import SYNTHICIDE from '../helpers/config.mjs';

export default class SynthicideBioclass extends SynthicideItemBase {
  static LOCALIZATION_PREFIXES = [
    'SYNTHICIDE.Item.base',
    'SYNTHICIDE.Item.Bioclass',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();
    const defaultPreset = SYNTHICIDE.getBioclassPreset('skinbag');

    // Bioclass type: Skinbag, Scraphead, Hardshell, Rigfiend
    schema.bioclassType = new fields.StringField({
      required: true,
      choices: SYNTHICIDE.bioclassTypes,
      initial: 'skinbag',
    });

    // Starting attributes
    schema.startingAttributes = new fields.SchemaField({
      actions: new fields.NumberField({ required: true, initial: defaultPreset.startingAttributes.actions }),
      awareness: new fields.NumberField({ required: true, initial: defaultPreset.startingAttributes.awareness }),
      combat: new fields.NumberField({ required: true, initial: defaultPreset.startingAttributes.combat }),
      nerve: new fields.NumberField({ required: true, initial: defaultPreset.startingAttributes.nerve }),
      speed: new fields.NumberField({ required: true, initial: defaultPreset.startingAttributes.speed }),
      toughness: new fields.NumberField({ required: true, initial: defaultPreset.startingAttributes.toughness }),
      will: new fields.NumberField({ required: true, initial: defaultPreset.startingAttributes.will }),
      hp: new fields.NumberField({ required: true, initial: defaultPreset.startingAttributes.hp }),
      hpPerLevel: new fields.NumberField({ required: true, initial: defaultPreset.startingAttributes.hpPerLevel }),
    });

    // Bioclass traits
    schema.traits = new fields.ArrayField(
      new fields.SchemaField({
        sort: new fields.NumberField({ required: true, integer: true, initial: 0 }),
        name: new fields.StringField({ required: true }),
        description: new fields.HTMLField({ required: true }),
      }),
      { initial: foundry.utils.deepClone(defaultPreset.traits) }
    );

    // Bioclass slots
    schema.bodySlots = new fields.NumberField({ required: true, initial: defaultPreset.bodySlots });
    schema.brainSlots = new fields.NumberField({ required: true, initial: defaultPreset.brainSlots });

    // Associated trait IDs (bioclass-linked traits)
    schema.associatedTraitIds = new fields.ArrayField(new fields.StringField(), { initial: [] });

    return schema;
  }

  prepareDerivedData() {
    const bioclassType = this.bioclassType;
    const preset = SYNTHICIDE.getBioclassPreset(bioclassType);
    const bodyTypeKey = preset.bodyType;
    const brainTypeKey = preset.brainType;
    this.bodyType = game.i18n.localize(`SYNTHICIDE.Item.BodyType.${bodyTypeKey}`);
    this.brainType = game.i18n.localize(`SYNTHICIDE.Item.BodyType.${brainTypeKey}`);
    this.bioclassTypeLabel = game.i18n.localize(`SYNTHICIDE.Item.Bioclass.${bioclassType.charAt(0).toUpperCase() + bioclassType.slice(1)}`);
  }
}
