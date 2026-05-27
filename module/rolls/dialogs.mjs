import SYNTHICIDE from '../helpers/config.mjs';
import { localize, formatSignedNumber, formatRollModifiers } from './roll-utils.mjs';
import { computeRollModifiers, parseNumeric, getActionAttributeKey, ATTRIBUTE_COMBAT, hasWeaponModification } from './modifiers.mjs';
import { buildAttackRangeContext, resolveWeaponAttackContext, getTargetDefense } from './attack-rolls.mjs';
import { normalizeMessageMode } from './cards.mjs';

const DIALOG_TEMPLATE = 'systems/synthicide/templates/dialog/action-roll-dialog.hbs';
const ACTION_ROLL_DIALOG_ICON = 'systems/synthicide/assets/synthicidePause.svg';

export async function renderActionRollDialog({ title, defaults }) {
  const context = buildDialogContext(defaults);
  const content = await foundry.applications.handlebars.renderTemplate(DIALOG_TEMPLATE, context);

  try {
    return await foundry.applications.api.DialogV2.prompt({
      window: { title, icon: '' },
      content,
      ok: {
        label: localize('SYNTHICIDE.Roll.Dialog.RollButton'),
        callback: (event, button, dialog) => {
          const form = resolveDialogForm(event, button, dialog);
          if (!form) return null;
          return extractDialogData(form);
        },
      },
      render: (_event, dialog) => {
        const iconEl = dialog.window?.icon;
        if (!iconEl) return;
        const img = globalThis.document.createElement('img');
        img.src = ACTION_ROLL_DIALOG_ICON;
        img.alt = '';
        iconEl.className = 'window-icon synthicide-window-icon';
        iconEl.replaceChildren(img);
      },
    });
  } catch {
    return null;
  }
}

export function buildDialogDefaults({ actor, subtype, attributeKey, sourceItem, allowSubtypeChange, rollModifiers = undefined }) {
  const attackDefaults = getAttackDialogDefaults({ actor, subtype, sourceItem });
  const isMeleeAttack = String(sourceItem?.system?.weaponClass ?? '') === 'melee';
  const targetDefense = subtype === 'attack'
    ? getTargetDefense({ notify: true })
    : { armor: 0, shieldBonus: 0 };

  return {
    actor,
    subtype,
    attribute: attributeKey,
    difficulty: 6,
    misc: 0,
    armor: targetDefense.armor,
    attackBonus: attackDefaults.attackBonus,
    damageBonus: attackDefaults.damageBonus,
    slugShotModeAvailable: attackDefaults.slugShotModeAvailable,
    slugShotActive: false,
    rangeModifier: attackDefaults.rangeModifier,
    shieldBonus: isMeleeAttack ? targetDefense.shieldBonus : 0,
    weaponClass: String(sourceItem?.system?.weaponClass ?? ''),
    sourceItem,
    messageMode: getDefaultMessageMode(),
    allowSubtypeChange,
    rollModifiers,
  };
}

export function getAttackDialogDefaults({ actor, subtype, sourceItem }) {
  if (subtype !== 'attack' || !sourceItem?.system) {
    return {
      attackBonus: 0,
      damageBonus: 0,
      slugShotModeAvailable: false,
      rangeModifier: 0,
    };
  }

  const rangeContext = buildAttackRangeContext({ actor, sourceItem, notify: false });
  const targetToken = game.user.targets?.size === 1 ? game.user.targets.first() : null;
  const attackContext = resolveWeaponAttackContext({ actor, sourceItem, targetToken });
  return {
    attackBonus: attackContext.attackBonus,
    damageBonus: attackContext.damageBonus,
    slugShotModeAvailable: hasWeaponModification(sourceItem, 'slugShot'),
    rangeModifier: Number(rangeContext?.rangeModifier ?? 0),
  };
}

function buildDialogContext(defaults) {
  const subtype = defaults.subtype ?? 'challenge';
  const isAttack = subtype === 'attack';
  const isDemolition = subtype === 'demolition';
  const isMeleeAttack = isAttack && String(defaults.weaponClass ?? '') === 'melee';
  const difficultyList = SYNTHICIDE.rolls?.challengeDifficulties ?? [];

  const attributeKey = isDemolition
    ? defaults.attribute
    : getActionAttributeKey(subtype, defaults.attribute ?? ATTRIBUTE_COMBAT);

  const { modifiers: rawRollModifiers, total: rollModifierTotal } = computeRollModifiers(defaults.actor, defaults.rollModifiers);
  const rollModifiers = formatRollModifiers(rawRollModifiers);

  return {
    allowSubtypeChange: Boolean(defaults.allowSubtypeChange),
    defaultSubtype: subtype,
    isAttack,
    isDemolition,
    showDifficulty: subtype === 'challenge',
    defaultArmor: defaults.armor ?? game.settings.get('synthicide', SYNTHICIDE.DEFAULT_TARGET_ARMOR_KEY) ?? 5,
    lockAttribute: isAttack || isDemolition,
    defaultAttackBonus: defaults.attackBonus ?? 0,
    defaultDamageBonus: defaults.damageBonus ?? 0,
    showSlugShotToggle: Boolean(defaults.slugShotModeAvailable),
    defaultSlugShotActive: Boolean(defaults.slugShotActive),
    defaultRangeModifier: defaults.rangeModifier ?? 0,
    defaultShieldBonus: defaults.shieldBonus ?? 0,
    shieldBonusHintKey: isMeleeAttack
      ? 'SYNTHICIDE.Roll.Dialog.ShieldBonusHint.Melee'
      : 'SYNTHICIDE.Roll.Dialog.ShieldBonusHint.NonMelee',
    defaultMisc: defaults.misc ?? 0,
    subtypeOptions: [
      { value: 'challenge', label: 'SYNTHICIDE.Roll.Subtype.Challenge', selected: subtype === 'challenge' },
      { value: 'attack', label: 'SYNTHICIDE.Roll.Subtype.Attack', selected: subtype === 'attack' },
      { value: 'demolition', label: 'SYNTHICIDE.Roll.Subtype.Demolition', selected: subtype === 'demolition' },
    ],
    messageModeOptions: CONFIG.ChatMessage.modes,
    messageModeSelected: normalizeMessageMode(defaults.messageMode),
    attributeOptions: SYNTHICIDE.attributes,
    attributeSelected: attributeKey,
    difficultyOptions: difficultyList,
    difficultySelected: Number(defaults.difficulty ?? 6),
    rollModifiers,
    rollModifierTotalDisplay: formatSignedNumber(rollModifierTotal),
    actor: defaults.actor,
  };
}

function resolveDialogForm(event, button, dialog) {
  return button?.form
    ?? event?.currentTarget?.form
    ?? event?.target?.form
    ?? dialog?.element?.querySelector?.('form.synthicide-action-roll-form')
    ?? null;
}

export function extractDialogData(formElement) {
  const formData = new globalThis.FormData(formElement);
  return {
    subtype: String(formData.get('subtype') ?? 'challenge'),
    messageMode: normalizeMessageMode(String(formData.get('messageMode') ?? 'public')),
    attribute: String(formData.get('attribute') ?? ATTRIBUTE_COMBAT),
    difficulty: parseNumeric(formData.get('difficulty'), 6),
    misc: parseNumeric(formData.get('misc'), 0),
    armor: parseNumeric(formData.get('armor'), 0),
    attackBonus: parseNumeric(formData.get('attackBonus'), 0),
    damageBonus: parseNumeric(formData.get('damageBonus'), 0),
    slugShotActive: formData.get('slugShotActive') === 'on',
    rangeModifier: parseNumeric(formData.get('rangeModifier'), 0),
    shieldBonus: parseNumeric(formData.get('shieldBonus'), 0),
  };
}



function getDefaultMessageMode() {
  const modeFromCore = game.settings.get('core', 'messageMode');
  return normalizeMessageMode(modeFromCore);
}
