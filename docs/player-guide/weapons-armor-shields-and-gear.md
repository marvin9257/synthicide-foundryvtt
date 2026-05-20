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

## Interactive Elements on Item Sheets

When you open a weapon, armor, shield, or gear item, you'll find these clickable fields and controls:

### Weapon Item

| Element | Icon | Action |
|---------|------|--------|
| Weapon name | Text input | Click to edit the weapon name |
| Weapon class dropdown | Dropdown | Click to select Melee, Ranged, or Demolition |
| Weapon type dropdown | Dropdown | Click to select specific weapon type (affected by class) |
| Attack Bonus (ATT) | Numeric input | Click to set the attack bonus |
| Damage Bonus (DMG) | Numeric input | Click to set the damage bonus |
| Lethal | Numeric input | Click to set lethal bonus (if applicable) |
| Range Increment | Numeric input | Click to set range increment for range-based attacks |
| Modifications checkboxes | Checkboxes | Click to select modifications (see Weapon Modifications section) |
| Special Ammo dropdown | Dropdown | Click to select ammo type (ranged weapons only) |
| Features checkboxes | Checkboxes | Click to select weapon features |
| Description/Notes field | Text box | Click to add weapon notes or flavor text |

### Armor Item

| Element | Icon | Action |
|---------|------|--------|
| Armor name | Text input | Click to edit the armor name |
| AD Bonus (Armor Defense) | Numeric input | Click to set the defense bonus |
| ST Bonus (Shock Threshold) | Numeric input | Click to set shock threshold bonus |
| Force Barrier current/max | Numeric inputs | Click to set Force Barrier values |
| Force Barrier recovery | Numeric input | Click to set recovery rate per turn |
| Modifications checkbox | Checkbox | Click to select armor modifications |
| Description/Notes field | Text box | Click to add armor notes |

### Shield Item

| Element | Icon | Action |
|---------|------|--------|
| Shield name | Text input | Click to edit the shield name |
| AD Bonus | Numeric input | Click to set defense bonus |
| Description/Notes field | Text box | Click to add shield notes |

### Gear Item

| Element | Icon | Action |
|---------|------|--------|
| Gear name | Text input | Click to edit the gear name |
| Formula field | Text box | Click to enter a roll formula (e.g., `2d6 + @attributes.awareness.value`) |
| Description field | Text box | Click to add item description or effect text |
| Price/Quantity fields | Numeric inputs | Click to track cost and quantity if your table uses it |

## Weapon Modifications

Modifications change how a weapon behaves in combat. Some have automatic mechanical effects, while others are organizational selections that require manual implementation.

### Modifications with Automatic Mechanics

1. **Expert Crafting (1-3)**: Adds +1, +2, or +3 bonus to damage rolls.
2. **Battle Assist (1-3)**: Adds +1, +2, or +3 bonus to attack rolls.
3. **Enhanced Alloy**: Adds +1 bonus to attack rolls.
4. **Bane Tune (Organics/Synthetics)**: Adds +2 bonus when attacking the specified target type (organics or synthetics).
5. **Arc** (Ranged/Melee): Adds +2 bonus when attacking synthetics; generates per-target spread collateral cards on hit.
6. **Double Shot** (Ranged): Creates additional per-target collateral cards on successful hits.
7. **Slug Shot** (Ranged): Affects damage calculation with modified projectile mechanics.

### Modifications Without Automatic Mechanics

These are available to select but require manual implementation of their effects:

1. **Miniaturized**: Use for roleplay/tracking; concealment penalties and size effects are manual.
2. **Long Range** (Ranged): Does not automatically extend range; use the range modifier field in the attack dialog.
3. **Snub Nose** (Ranged): Reduces functional range; adjust manually in the dialog.
4. **Full Auto** (Ranged): Does not auto-calculate burst mechanics; apply manually.
5. **Silencing** (Ranged): Cosmetic selection; audibility tracking is manual.
6. **Reach/Telescoping** (Melee): Does not auto-extend melee range; apply when rolling.
7. **Poison Reservoir** (Melee): Poison effects are manual.
8. **Scanning Scope** (Ranged): Targeting assistance is manual.
9. **High Powered** (Ranged): Does not auto-increase damage; use a numeric modifier if needed.
10. **Rapid Reload** (Ranged): Magazine/reload mechanics are manual.

## Weapon Features

Weapon features describe inherent capabilities. Some have automatic effects in rolls, while others are descriptive.

### Features with Automatic Mechanics

1. **Arc** (Melee/Ranged): Adds +2 bonus against synthetic targets. On successful ranged attacks, generates per-target spread collateral cards.

### Features Without Automatic Mechanics

These are available for selection but require manual application:

1. **Two-Handed**: Apply disadvantage to off-hand actions manually.
2. **Primitive**: Use for narration; damage penalties are manual.
3. **Counter** (Melee): Reactive attack setup requires manual decision and execution.
4. **Guard**: Defensive stance effects are manual.
5. **Fossil** (Ranged): Historical/cosmetic; mechanics are manual.
6. **Retrofit** (Ranged): Equipment modifications are manual.
7. **Close** (Ranged): Close-range behavior is manual.
8. **Slow (1-2)** (Ranged): Reload penalties are manual.
9. **Spread** (Ranged): Area effects are manual unless Arc or Double Shot creates collateral cards.
10. **Beam/Wave/Hellfire** (Ranged): Special damage behaviors are manual.
11. **Blast (3/5)** (Demolition): Blast radius targeting is manual.
12. **Stun** (Demolition): Stun effects are manual.
13. **Plant (8/12)** (Demolition): Planting mechanics and timing are manual.

## Special Ammo

Special ammo types are selectable on ranged weapons but most effects require manual implementation.

### Ammo Types Available

1. **None**: Standard ammunition.
2. **Cryo**: Cold-based rounds; armor penetration and target slowdown effects are manual.
3. **Cinder**: Incendiary rounds; ongoing fire damage is manual.
4. **Knock Back**: Knockback effects are manual.
5. **Homing**: Homing behavior and re-targeting are manual.
6. **Poison**: Poison damage is manual.
7. **Power Wounding**: Enhanced damage against armor; bonus calculation is manual.
8. **Flash**: Blinding effects are manual.
9. **Anchor**: Movement-blocking effects are manual.
10. **Bouncing**: Ricochet behavior is manual.
11. **Stun**: Electrical/stun effects are manual.

**Important**: Selecting ammo type does not automatically apply mechanical effects. All ammo effects must be resolved by your table after the roll.

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
5. **Many modifications, features, and ammo effects require manual implementation** (see Weapon Modifications, Weapon Features, and Special Ammo sections above). Selecting these options does not guarantee automatic mechanical application. Your table must resolve effects that are not in the automatic mechanics list.
6. Shield tactic handling from the rules update (such as defensive arc and lock-angle behavior) requires manual table resolution.
7. Modification selections that do not appear in the automatic mechanics list will not affect attack or damage calculations; you must apply these effects manually at your table.

## Troubleshooting

### Q: My defenses are wrong. What should I check first?

A: Verify equipped state and numeric fields on armor and shields.

### Q: Roll values are wrong. Where do I debug first?

A: Inspect source weapon or gear item fields first.

### Q: Force barrier values seem off. What is the likely issue?

A: Verify armor force barrier configuration values, especially max and recovery-related fields.

### Q: I selected a weapon modification, but I do not see its effect in my attack. Why?

A: Check the [Weapon Modifications section](#weapon-modifications) above. Many modifications require manual implementation. Only modifications listed under "Modifications with Automatic Mechanics" apply automatically. For others, apply the effect manually at your table.

### Q: Ammo effects are not being applied. Is that expected?

A: Yes. Special ammo type is a selection field; almost all ammo effects must be resolved manually by your table. See the [Special Ammo section](#special-ammo) for details.

## Related Pages

1. [Rolls Overview](rolls-overview.md)
2. [Making an Attack Roll](making-an-attack-roll.md)
3. [Resources and Derived Values](resources-and-derived-values.md)
