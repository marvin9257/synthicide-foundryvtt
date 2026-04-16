import { makeModifiersField } from './commonSchemaUtils.mjs';

/**
 * Mixin that adds a standardized modifiers schema and helper methods.
 * Usage: class MyItem extends applyModifiable(Base) { ... }
 */
export function applyModifiable(Base) {
  return class Modifiable extends Base {
    static defineSchema() {
      // Call the superclass defineSchema to get its schema object
      const baseSchema = typeof super.defineSchema === 'function' ? super.defineSchema() : {};
      // Ensure we don't mutate ancestor schema prototypes unexpectedly
      const schema = Object.assign({}, baseSchema);
      // Attach the standardized modifiers field if not present
      if (!Object.prototype.hasOwnProperty.call(schema, 'modifiers')) {
        schema.modifiers = makeModifiersField();
      }
      return schema;
    }

    /** Return modifiers array (system context) */
    getModifiers() {
      return this.modifiers ?? [];
    }

    // `triggerActorModifierAggregation` is implemented on `SynthicideItemBase`.

  };
}
