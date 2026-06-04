# Combat Workflow

## Purpose

Show how to run a smooth turn in Foundry combat using Synthicide tools.

## Before You Start

1. Confirm combat is started in Foundry.
2. Ensure your token is in the scene.
3. Verify your equipped armor, shield, and weapon setup.

## Steps

1. Start your turn by checking current resources.
2. Confirm Force Barrier, HP, Resolve, Cynicism, and current AP.
3. Perform movement and action decisions per your table rules.
4. When preparing an attack, verify weapon modifications and special ammo selection on your weapon item (if applicable).
5. Use challenge or attack rolls from your actor sheet.
6. Resolve hit, damage, and follow-up effects from chat output (including any non-automated modification or ammo effects).
7. End your turn after applying all required manual outcomes.

Example turn: check AP/Force Barrier -> select weapon modifications if needed -> make an attack roll from a weapon -> apply chat result and any manual effects -> end turn.

## What Happens Automatically

1. The system runs automatic turn-start combat updates.
2. At turn start, Force Barrier recovery is applied when the actor has valid recovery values (example: no recovery is applied if current Force Barrier is 0 and recovery is 0).
3. Roll cards capture detailed combat results in chat.

4. Special ammo is applied automatically when a weapon's `specialAmmo` is set (or when you override it in the attack dialog). Implemented ammo behaviors include:

	- **Cryo:** On a successful hit the system toggles the `frozen` status on the target. `frozen` is cleared automatically at the end of the target's turn.

	- **Cinder:** On hit the system applies immediate burning damage (1d10) and sets the `burning` status. At the start of the burning actor's turn the system rolls 1d10 for additional burning damage; if that roll is odd the `burning` status is removed.

	- **Power Wounding:** Adds extra damage dice to the damage follow-up (`+2d10`) and applies a lethal override that affects shocking-strike/lethal resolution.

	- **Homing:** Adjusts lethality for the attack (a lethal override) and applies a `target` status on the hit target to mark homing lock.

	- **Stun:** Toggles the `stun` status on hit.

	- **Poison:** Toggles the `poison` status on hit.

	- **Anchor:** Toggles the `restrain` status on hit.

	- **Flash:** Toggles the `blind` status on hit.

	- **None / unimplemented:** Some ammo keys present in the UI (for example `knockBack` and `bouncing`) are exposed in the weapon ammo choices but do not have automated on-hit behaviors implemented; those effects remain manual and should be resolved by the GM or players.

	These effects are applied by the attack/damage flows (attack adjustments, extra damage dice, lethal overrides, and on-hit status toggles/immediate damage). You only need to set the ammo on the weapon or select it in the roll dialog — the system handles the rolls and status applications for you.

	Implementation reference: [module/rolls/ammo-effects.mjs](module/rolls/ammo-effects.mjs#L1-L120) and related application logic in [module/documents/actor.mjs](module/documents/actor.mjs#L1-L320) and [module/rolls/roll-context.mjs](module/rolls/roll-context.mjs#L1-L360).

Example: if Force Barrier has a positive current value and recovery rate, it can recover at turn start.

## What You Must Set Manually

1. Tactical choices and target declarations.
2. Weapon modification selections and special ammo type before rolling (check your weapon items for these fields).
3. Any effects from non-automated modifications, special ammo, or traits.
4. Rule interpretations your table tracks manually.

Example: before using a weapon, open it to set or verify modifications and ammo if needed.

## Limitations and Not Implemented

1. Combat effects described in free-text traits or scenario rules are not auto-applied by chat cards (example: a narrative condition still needs manual application on the sheet).
2. Turn outcomes can require manual confirmation in chat and on sheet values (example: checking that the right target assumptions were used before applying results).
3. Turn-start force barrier refresh is conditional, not guaranteed every round (example: no refresh if force barrier value is 0 or recovery rate is 0).
4. Edge-case interactions need a GM ruling instead of a built-in resolution flow (example: unusual movement combined with blast overlap).
5. Force barrier overload and recharge-time tracking from the rules update must be tracked manually after collapse.
6. Advanced tactical actions from the rules kit (such as cover-fire style handling) do not have dedicated automation buttons and must be resolved manually.

## Troubleshooting

### Q: Force barrier did not change like I expected. What do I verify?

A: Verify force barrier values and armor setup first, including recovery-related fields.

### Q: Movement or range results look wrong. What should I check?

A: Verify token placement and confirm you are on the active scene.

### Q: Chat actions are missing. What usually causes this?

A: Check permissions and message visibility mode.

## Related Pages

1. [Making an Attack Roll](making-an-attack-roll.md)
2. [Virtual Grid Units and Combat Zones](virtual-grid-units-and-combat-zones.md)
3. [Resources and Derived Values](resources-and-derived-values.md)
4. [Demolition and Range-Based Actions](demolition-and-range-based-actions.md)
