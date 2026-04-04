# Weapons, Armor, Shields, and Gear

## Purpose

Set up equipment correctly so combat numbers behave the way you expect.

## Before You Start

1. Open your actor sheet.
2. Have your weapon, armor, shield, and gear items available.

## Steps

1. Use the Combat tab to add armor, shields, and weapons.
2. Use the Gear tab for general non-combat items and formulas.
3. Open each item and verify key numeric fields.
4. For armor, confirm Armor Defense (AD) bonus, ST bonus, and Force Barrier fields.
5. For shields, confirm shield AD bonus fields.
6. For weapons, confirm ATT, DMG, and range increment.
7. Toggle equip state for the items you are actively using.
8. Re-check derived actor defenses after equipment changes.

Example setup: weapon ATT +2, DMG +3, range increment 4; armor AD bonus +2 (Armor Defense), shield AD bonus +1.

## What Happens Automatically

1. Equipped items contribute to derived values.
2. Weapon roll actions prefill attack roll fields.
3. Defense and Force Barrier displays refresh from current equipped item data during normal sheet and combat updates.

Example: equipping armor with Force Barrier fields updates the actor's shown Force Barrier values.

## What You Must Set Manually

1. Core numeric fields on authored items.
2. Any custom formula content on general gear.
3. Equip state for currently active loadout.

## Limitations and Not Implemented

1. Incomplete item data gives incomplete or misleading outcomes (example: missing range increment breaks range-based attack expectations).
2. The system does not block every invalid formula or data combo (example: odd formula text can roll in unexpected ways).
3. Equip behavior is type-limited for specific item classes (example: armor and shields are exclusive equip types, so equipping one can unequip another of the same type).
4. Inventory logistics such as carrying limits and deep encumbrance checks are not enforced by sheet logic and must be tracked manually.
5. Weapon/armor/shield modification selections are tracking fields unless explicit numeric changes/modifiers/effects are also authored (example: selecting "long range" alone does not enforce every related range rule).
6. Shield tactic handling from the rules update (such as defensive arc and lock-angle behavior) requires manual table resolution.
7. Special ammo is selectable, but ammo-specific mechanical effects are manual in most cases (example: flash or anchor effects are not auto-applied by a dedicated ammo engine).

## Troubleshooting

### Q: My defenses are wrong. What should I check first?

A: Verify equipped state and numeric fields on armor and shields.

### Q: Roll values are wrong. Where do I debug first?

A: Inspect source weapon or gear item fields first.

### Q: Force barrier values seem off. What is the likely issue?

A: Verify armor force barrier configuration values, especially max and recovery-related fields.

## Related Pages

1. [Rolls Overview](rolls-overview.md)
2. [Making an Attack Roll](making-an-attack-roll.md)
3. [Resources and Derived Values](resources-and-derived-values.md)
