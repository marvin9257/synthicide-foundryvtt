const MIGRATION_SETTING_KEY = 'migrationVersion';
const CURRENT_MIGRATION_VERSION = '3.0.0';

/**
 * HOW TO ADD FUTURE MIGRATIONS
 *
 * 1) Add a new migration function in this file:
 *      async function migration_X_Y_Z_description() { ... }
 *    - Use semantic version in the function name for easy scanning.
 *    - Keep each migration focused on one schema/data change.
 *
 * 2) Bump CURRENT_MIGRATION_VERSION to your newest migration version.
 *
 * 3) In migrateWorld(), add a guarded call:
 *      if (foundry.utils.isNewerVersion('X.Y.Z', lastVersion)) {
 *        await migration_X_Y_Z_description();
 *      }
 *    - Keep guards ordered from oldest -> newest so users can upgrade
 *      across multiple skipped versions safely.
 *
 * 4) Prefer batch document updates when possible:
 *    - World items: Item.updateDocuments([...])
 *    - Actor-owned items: actor.updateEmbeddedDocuments('Item', [...])
 *
 * 5) Make migrations idempotent:
 *    - Filter to only documents that still need changes.
 *    - Safe to rerun with no side effects.
 *
 * 6) UI notifications:
 *    - Only show user notifications when a migration actually changed data.
 *
 * 7) Important behavior:
 *    - Only GMs run migrations.
 *    - The setting key tracks the last completed version.
 *    - A successful run always writes CURRENT_MIGRATION_VERSION.
 *
 * COPY/PASTE TEMPLATE:
 *
 * // 1) Bump CURRENT_MIGRATION_VERSION (top of file)
 * // const CURRENT_MIGRATION_VERSION = '3.1.0';
 *
 * // 2) Wire guard in migrateWorld() in version order
 * // if (foundry.utils.isNewerVersion('3.1.0', lastVersion)) {
 * //   await migration_3_1_0_myChange();
 * // }
 *
 * // 3) Add migration implementation
 * // async function migration_3_1_0_myChange() {
 * //   const worldUpdates = game.items
 * //     .filter(item => {
 * //       // return true only for docs needing migration
 * //       return false;
 * //     })
 * //     .map(item => ({
 * //       _id: item.id,
 * //       // ...changed fields
 * //     }));
 * //
 * //   if (worldUpdates.length) await Item.updateDocuments(worldUpdates);
 * //
 * //   for (const actor of game.actors) {
 * //     const embeddedUpdates = actor.items
 * //       .filter(item => {
 * //         // return true only for owned docs needing migration
 * //         return false;
 * //       })
 * //       .map(item => ({
 * //         _id: item.id,
 * //         // ...changed fields
 * //       }));
 * //
 * //     if (embeddedUpdates.length) {
 * //       await actor.updateEmbeddedDocuments('Item', embeddedUpdates);
 * //     }
 * //   }
 * //
 * //   if (worldUpdates.length) {
 * //     ui.notifications.info('SYNTHICIDE migration 3.1.0 complete.');
 * //   }
 * // }
 *
 * // 4) Optional actor-only template (no item loops)
 * // async function migration_3_1_1_actorSchemaFix() {
 * //   const actorUpdates = game.actors
 * //     .filter(actor => {
 * //       // return true only for actors needing migration
 * //       return false;
 * //     })
 * //     .map(actor => ({
 * //       _id: actor.id,
 * //       // ...changed actor fields, e.g. 'system.someField': newValue
 * //     }));
 * //
 * //   if (actorUpdates.length) {
 * //     await Actor.updateDocuments(actorUpdates);
 * //     ui.notifications.info('SYNTHICIDE migration 3.1.1 actor update complete.');
 * //   }
 * // }
 */

/**
 * Register hidden world setting used to track migration progress.
 */
export function registerMigrationSettings() {
  game.settings.register('synthicide', MIGRATION_SETTING_KEY, {
    name: 'SYNTHICIDE.Settings.MigrationVersion.Name',
    hint: 'SYNTHICIDE.Settings.MigrationVersion.Hint',
    scope: 'world',
    config: false,
    type: String,
    default: '0.0.0',
  });
}

/**
 * Execute pending world migrations for this system.
 */
export async function migrateWorld() {
  if (!game.user.isGM) return;

  const lastVersion = game.settings.get('synthicide', MIGRATION_SETTING_KEY) || '0.0.0';
  if (!foundry.utils.isNewerVersion(CURRENT_MIGRATION_VERSION, lastVersion)) return;

  if (foundry.utils.isNewerVersion('3.0.0', lastVersion)) {
    await migration_3_0_0_spellItemsToTraits();
  }

  await game.settings.set('synthicide', MIGRATION_SETTING_KEY, CURRENT_MIGRATION_VERSION);
}

/**
 * Migrate legacy `spell` items to `trait` with `traitType: spell`.
 */
async function migration_3_0_0_spellItemsToTraits() {
  const worldItemUpdates = game.items
    .filter(item => item.type === 'spell')
    .map(item => {
      const update = {
        _id: item.id,
        type: 'trait',
        'system.traitType': 'spell',
      };
      if (item.system?.spellLevel !== undefined) update['system.level'] = item.system.spellLevel;
      return update;
    });

  if (worldItemUpdates.length) {
    await Item.updateDocuments(worldItemUpdates);
  }

  for (const actor of game.actors) {
    const embeddedUpdates = actor.items
      .filter(item => item.type === 'spell')
      .map(item => {
        const update = {
          _id: item.id,
          type: 'trait',
          'system.traitType': 'spell',
        };
        if (item.system?.spellLevel !== undefined) update['system.level'] = item.system.spellLevel;
        return update;
      });

    if (embeddedUpdates.length) {
      await actor.updateEmbeddedDocuments('Item', embeddedUpdates);
    }
  }

  if (worldItemUpdates.length) {
    ui.notifications.info('SYNTHICIDE migration complete: legacy spell items converted to traits.');
  }
}
