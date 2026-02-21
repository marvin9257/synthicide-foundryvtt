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

    // Bioclass type: Skinbag, Scraphead, Hardshell, Rigfiend
    schema.bioclassType = new fields.StringField({
      required: true,
      choices: SYNTHICIDE.bioclassTypes,
    });

    // Starting attributes
    schema.startingAttributes = new fields.SchemaField({
      actions: new fields.NumberField({ required: true, initial: 0 }),
      awareness: new fields.NumberField({ required: true, initial: 0 }),
      combat: new fields.NumberField({ required: true, initial: 0 }),
      nerve: new fields.NumberField({ required: true, initial: 0 }),
      speed: new fields.NumberField({ required: true, initial: 0 }),
      toughness: new fields.NumberField({ required: true, initial: 0 }),
      will: new fields.NumberField({ required: true, initial: 0 }),
      hp: new fields.NumberField({ required: true, initial: 0 }),
      hpPerLevel: new fields.NumberField({ required: true, initial: 0 }),
    });

    // Bioclass traits
    schema.traits = new fields.ArrayField(
      new fields.SchemaField({
        name: new fields.StringField({ required: true }),
        description: new fields.HTMLField({ required: true }),
      })
    );

    // Bioclass slots
    schema.bodySlots = new fields.NumberField({ required: true, initial: 0 });
    schema.brainSlots = new fields.NumberField({ required: true, initial: 0 });

    return schema;
  }

  prepareDerivedData() {
    // Derive and localize bodyType and brainType from bioclassType
    const bioclassType = this.bioclassType;
    let bodyTypeKey = 'Organic';
    let brainTypeKey = 'Organic';
    switch (bioclassType) {
      case 'skinbag':
        bodyTypeKey = 'Organic';
        brainTypeKey = 'Organic';
        break;
      case 'scraphead':
        bodyTypeKey = 'Organic';
        brainTypeKey = 'Rigged';
        break;
      case 'hardshell':
        bodyTypeKey = 'Rigged';
        brainTypeKey = 'Organic';
        break;
      case 'rigfiend':
        bodyTypeKey = 'Rigged';
        brainTypeKey = 'Rigged';
        break;
    }
    this.bodyType = game.i18n.localize(`SYNTHICIDE.Item.BodyType.${bodyTypeKey}`);
    this.brainType = game.i18n.localize(`SYNTHICIDE.Item.BodyType.${brainTypeKey}`);
    this.bioclassTypeLabel = game.i18n.localize(`SYNTHICIDE.Item.Bioclass.${bioclassType.charAt(0).toUpperCase() + bioclassType.slice(1)}`);
  }
}
