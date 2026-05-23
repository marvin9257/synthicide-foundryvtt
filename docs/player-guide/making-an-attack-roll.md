# Making an Attack Roll

## Purpose

Run a full attack flow from weapon click to damage follow-up.

## Before You Start

1. Open your actor sheet.
2. Confirm at least one weapon is on your actor.
3. Confirm weapon bonuses and range increment are configured.

## Steps

1. Open the Combat tab.
2. Verify weapon modifications and special ammo selection on your weapon item (if applicable).
3. Click the weapon attack action.
4. In the roll dialog, verify attribute, target Armor Defense (AD), ATT (attack bonus), DMG (damage bonus), range modifier, and shield AD bonus.
5. Submit the attack roll.
6. Read hit or miss details in chat.
7. If a hit is confirmed, trigger damage follow-up from chat if available.
8. If your weapon has the Spread feature, collateral cards may appear in chat alongside the main attack result.
9. Select the target token, right-click the resulting damage card in chat, and choose Apply Damage.
10. Apply any remaining table-required effects (including effects from modifications or special ammo that are not automated).

Example dialog values: target Armor Defense (AD) 12, ATT +2, DMG +3, range modifier -1, shield bonus +1.
Example: a weapon with Spread can generate collateral cards; Double Shot can increase the damage shown on those collateral cards.

## What Happens Automatically

1. Attack rolls use data from the weapon and your actor, including implemented automatic modification mechanics such as Battle Assist's Combat floor, Expert Crafting damage, Enhanced Alloy attack, Bane Tune damage, and Arc attack bonus when applicable.
2. Chat cards display equation terms and result details, including modification bonuses.
3. A qualifying hit result enables damage follow-up actions from the chat card.
4. Weapons with the Spread feature can generate per-target collateral cards based on the attack line through the primary target.
5. The damage card shows a zero damage floor (damage cannot go below 0 even if modifiers reduce it).
6. Some ammo effects are automated as part of the attack/damage flow, including Power Wounding lethal plus extra damage dice, Homing lethal plus target marking, Cryo frozen status, Cinder burning plus immediate extra damage, and Flash blind plus its turn-start recovery check.

Example: a weapon with Battle Assist 2 and Expert Crafting +1 can show the Combat floor and damage bonus in the chat card breakdown.

## What You Must Set Manually

1. Correct target assumptions and situational modifiers.
2. Weapon modification selections and special ammo type before rolling (if using non-automatic modifications or ammo).
3. Any effects from non-automated modifications, partially automated ammo, or traits.
4. Final application of effects when the sheet shows a result but your table still resolves details manually.
5. Correct token selection before using right-click Apply Damage from chat.

Example: if the target has temporary cover this round, apply that modifier in the dialog before rolling.
Example: select poison ammo, roll the attack, let the system place the `Poison` marker, then resolve any additional poison rules manually.

## Limitations and Not Implemented

1. Wrong source weapon data gives wrong attack outcomes (example: blank DMG bonus makes damage follow-up look too low).
2. Only some weapon modifications have automatic mechanics. Others require manual implementation (see [Weapons, Armor, Shields, and Gear](weapons-armor-shields-and-gear.md) for details).
3. Special ammo is only partially automated. Some ammo adds statuses or direct numeric effects automatically, but complex RAW behavior still needs manual resolution after the roll.
4. Post-hit effects tied to conditional trait text still need manual decisions (example: effects that apply only in specific situations).
5. Damage follow-up depends on a valid qualifying attack result (example: a miss does not unlock the same damage flow).
6. Collateral cards from the Spread feature appear in chat but their target application must still be resolved at your table.
7. The sheet does not resolve custom edge rulings from your table (example: unusual cover, improvised targets, or house rules still need a GM call).

## Troubleshooting

### Q: I cannot trigger the attack roll. What should I check?

A: Confirm the source item is a weapon and that it is on your actor.

### Q: My attack values look off. What is the first fix?

A: Verify weapon bonus fields first, then check roll dialog modifiers.

### Q: Damage follow-up is missing. Why?

A: Confirm the source attack result qualified for damage in chat.

### Q: I clicked Roll Damage, but HP did not change. What should I do?

A: Select the target token, right-click the damage card, then use Apply Damage.

### Q: I see collateral cards in chat. What should I do with them?

A: Apply damage from each collateral card to the corresponding target token, just like the main damage card. Right-click each collateral card and choose Apply Damage while the target is selected.

### Q: My modification bonus is not showing in the attack. Why?

A: Check the [Weapons, Armor, Shields, and Gear guide](weapons-armor-shields-and-gear.md#modifications-with-automatic-mechanics). Only modifications listed as having automatic mechanics are applied automatically. For others, you must track and apply bonuses manually.

## Related Pages

1. [Rolls Overview](rolls-overview.md)
2. [Virtual Grid Units and Combat Zones](virtual-grid-units-and-combat-zones.md)
3. [Weapons, Armor, Shields, and Gear](weapons-armor-shields-and-gear.md)
4. [Combat Workflow](combat-workflow.md)
