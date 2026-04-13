import { openSynthicideActionRollDialog } from '../rolls/action-rolls.mjs';
import { enrichSheetHtml } from './sheet-context.mjs';

/**
 * Clone an array-valued system field from a document.
 * @param {Document} document
 * @param {string} field
 * @returns {Array<unknown>}
 */
function cloneSystemArray(document, field) {
  const value = document?.system?.[field];
  return Array.isArray(value) ? foundry.utils.deepClone(value) : [];
}

/**
 * Apply a mutation callback to an array-valued system field and persist.
 * @param {Document} document
 * @param {string} field
 * @param {(array: Array<unknown>) => (void|boolean)} mutate
 * @returns {Promise<void>}
 */
export async function mutateSystemArray(document, field, mutate) {
  const values = cloneSystemArray(document, field);
  const shouldPersist = mutate(values);
  if (shouldPersist === false) return;
  await document.update({ [`system.${field}`]: values });
}

/**
 * Remove a row at dataset-provided index from an array-valued system field.
 * @param {Document} document
 * @param {string} field
 * @param {string|number} indexValue
 * @returns {Promise<void>}
 */
export async function removeSystemArrayIndex(document, field, indexValue) {
  const index = Number(indexValue);
  await mutateSystemArray(document, field, values => {
    if (index < 0 || index >= values.length) return false;
    values.splice(index, 1);
    return true;
  });
}

/* -------------------------------------------- */
/*  Shared Sheet Action Handlers                */
/* -------------------------------------------- */

/**
 * Resolve an embedded Item or ActiveEffect from a click target.
 *
 * Priority:
 * 1. Effects — `[data-effect-id]` + `[data-parent-id]`   (matches effects.hbs rows)
 * 2. Items   — `[data-item-id]` or `[data-document-id]`  (all item-list rows)
 *
 * @param {Actor} actor
 * @param {HTMLElement} target
 * @returns {Item|ActiveEffect|null}
 */
export function getEmbeddedDocument(actor, target) {
  const effectRow = target.closest('[data-effect-id]');
  if (effectRow) {
    const parentId = effectRow.dataset.parentId;
    const effectId = effectRow.dataset.effectId;
    const parent = parentId === actor.id ? actor : actor.items.get(parentId);
    return parent?.effects?.get(effectId) ?? null;
  }
  const itemRow =
    target.closest('[data-item-id]') ?? target.closest('[data-document-id]');
  const itemId = itemRow?.dataset?.itemId ?? itemRow?.dataset?.documentId;
  if (!itemId) return null;
  return actor.items.get(itemId);
}

/**
 * Compute the HP bar fill percentage, clamped to [0, 1].
 * @param {object} system - Actor system data.
 * @returns {number}
 */
export function computeHpPercent(system) {
  const hpValue = Number(system.hitPoints?.value ?? 0);
  const hpMax = Number(system.hitPoints?.max ?? 1);
  return hpMax > 0 ? Math.max(0, hpValue) / hpMax : 0;
}

/**
 * Open the embedded document's sheet.
 * @param {Actor} actor
 * @param {HTMLElement} target
 */
export async function viewDocAction(actor, target) {
  const doc = getEmbeddedDocument(actor, target);
  doc?.sheet?.render(true);
}

/**
 * Delete the embedded document.
 * @param {Actor} actor
 * @param {HTMLElement} target
 */
export async function deleteDocAction(actor, target) {
  const doc = getEmbeddedDocument(actor, target);
  if (!doc) return;
  await doc.delete();
}

/**
 * Show the embedded document's description in a read-only dialog.
 * @param {Actor} actor
 * @param {HTMLElement} target
 */
export async function showInfoAction(actor, target) {
  const doc = getEmbeddedDocument(actor, target);
  if (!doc) return;
  const desc = doc.system?.description || '';
  const title = doc.name || game.i18n.localize('SYNTHICIDE.Info');
  try {
    await foundry.applications.api.DialogV2.prompt({
      window: { title },
      content: `<div class="synthicide-info">${desc}</div>`,
      ok: { label: game.i18n.localize('OK'), callback: () => true },
    });
  } catch {
    // Dialog dismissed.
  }
}

/**
 * Toggle an ActiveEffect's enabled/disabled state.
 * @param {Actor} actor
 * @param {HTMLElement} target
 */
export async function toggleEffectAction(actor, target) {
  const effect = getEmbeddedDocument(actor, target);
  await effect?.update({ disabled: !effect.disabled });
}

/**
 * Enrich and attach biography HTML to the sheet context.
 * @param {Actor} actor
 * @param {object} context
 * @param {boolean} isOwner
 */
export async function prepareBiographyPartContext(actor, context, isOwner) {
  context.enrichedBiography = await enrichSheetHtml({
    html: actor.system.biography,
    document: actor,
    isOwner,
    rollData: actor.getRollData(),
  });
}

/**
 * Launches an attack roll pre-populated with this NPC's selected attack total.
 * The dialog still allows the GM to override the pre-filled value.
 * @this {SynthicideNPCActorSheet}
 * @param {PointerEvent} event
 * @param {HTMLElement} target
 */
export async function makeSelectedAttackRoll(actor) {
  // Use selectedWeaponId to get the selected weapon item
  const selectedWeaponId = actor.system.selectedWeaponId;
  const weapon = actor.items?.get(selectedWeaponId) ?? null;
  const attackBonusOverride = weapon ? Number(weapon.system.bonuses.attack ?? 0) : 0;
  const damageBonusOverride = weapon ? Number(weapon.system.bonuses.damage ?? 0) : 0;
  return openSynthicideActionRollDialog({
    actor: actor,
    subtype: 'attack',
    attribute: 'combat',
    attackBonusOverride,
    damageBonusOverride,
    sourceItem: weapon,
  });
}

/**
 * Handles generic roll clicks (challenge or item attacks).
 * @param {Actor} actor
 * @param {HTMLElement} target
 */
export async function makeRoll(actor, target) {
  const { rollType, attributeKey, roll, label } = target.dataset;

  if (rollType === 'challenge') {
    const roleChallengeBonus = getRoleChallengeBonus({
      roleKey: actor.system?.npcRole,
      attributeKey,
      level: Number(actor.system?.level?.value ?? 1),
    });
    return openSynthicideActionRollDialog({
      actor: actor,
      subtype: 'challenge',
      attribute: attributeKey,
      miscOverride: roleChallengeBonus,
    });
  }

  if (rollType === 'attack') {
    const item = getEmbeddedDocument(actor, target);
    return openSynthicideActionRollDialog({
      actor: actor,
      subtype: 'attack',
      sourceItem: item,
    });
  }

  if (roll) {
    const evaluatedRoll = new Roll(roll, actor.getRollData());
    return evaluatedRoll.toMessage(
      { speaker: ChatMessage.getSpeaker({ actor: actor }), flavor: label ?? '' },
      { messageMode: game.settings.get('core', 'messageMode') }
    );
  }
}

function getRoleChallengeBonus({ roleKey, attributeKey, level }) {
  const key = String(attributeKey ?? '');
  const halfLevelPlusOne = 1 + Math.floor(Math.max(1, Number(level ?? 1)) / 2);

  if (roleKey === 'fastTalker' && ['awareness', 'influence'].includes(key)) {
    return halfLevelPlusOne;
  }

  if (roleKey === 'guardian' && ['awareness', 'nerve'].includes(key)) {
    return halfLevelPlusOne;
  }

  if (roleKey === 'professional' && key === 'operation') {
    return 2;
  }

  return 0;
}