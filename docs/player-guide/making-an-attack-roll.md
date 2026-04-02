# Making an Attack Roll

## Purpose

Run a full attack flow from weapon click to damage follow-up.

## Before You Start

1. Open your actor sheet.
2. Confirm at least one weapon is on your actor.
3. Confirm weapon bonuses and range increment are configured.

## Steps

1. Open the Combat tab.
2. Click the weapon attack action.
3. In the roll dialog, verify attribute, target AD (target armor), ATT (attack bonus), DMG (damage bonus), range modifier, and shield AD bonus.
4. Submit the attack roll.
5. Read hit or miss details in chat.
6. If a hit is confirmed, trigger damage follow-up from chat if available.
7. Select the target token, right-click the resulting damage card in chat, and choose Apply Damage.
8. Apply any remaining table-required effects.

Example dialog values: target AD 12, ATT +2, DMG +3, range modifier -1, shield bonus +1.

## What Happens Automatically

1. Attack rolls use data from the weapon and your actor.
2. Chat cards display equation terms and result details.
3. A qualifying hit result enables damage follow-up actions from the chat card.

## What You Must Set Manually

1. Correct target assumptions and situational modifiers.
2. Any non-automated outcome handling at your table.
3. Final application of effects when the sheet shows a result but your table still resolves details manually.
4. Correct token selection before using right-click Apply Damage from chat.

Example: if the target has temporary cover this round, apply that modifier in the dialog before rolling.

## Limitations and Not Implemented

1. Wrong source weapon data gives wrong attack outcomes (example: blank DMG bonus makes damage follow-up look too low).
2. Post-hit effects tied to conditional trait text still need manual decisions (example: effects that apply only in specific situations).
3. Damage follow-up depends on a valid qualifying attack result (example: a miss does not unlock the same damage flow).
4. The sheet does not resolve custom edge rulings from your table (example: unusual cover, improvised targets, or house rules still need a GM call).

## Troubleshooting

### Q: I cannot trigger the attack roll. What should I check?

A: Confirm the source item is a weapon and that it is on your actor.

### Q: My attack values look off. What is the first fix?

A: Verify weapon bonus fields first, then check roll dialog modifiers.

### Q: Damage follow-up is missing. Why?

A: Confirm the source attack result qualified for damage in chat.

### Q: I clicked Roll Damage, but HP did not change. What should I do?

A: Select the target token, right-click the damage card, then use Apply Damage.

## Related Pages

1. [Rolls Overview](rolls-overview.md)
2. [Virtual Grid Units and Combat Zones](virtual-grid-units-and-combat-zones.md)
3. [Weapons, Armor, Shields, and Gear](weapons-armor-shields-and-gear.md)
4. [Combat Workflow](combat-workflow.md)
