# NPC Sheet Tour

## Purpose

Understand the NPC sheet layout for quick combat execution.

## Before You Start

Have the NPC actor sheet open. Drag a bioclass from Items onto the Bioclass slot if it's empty.

## GM and Player Perspective

**GM:** This sheet is your encounter control panel (stats, attacks, notes).
**Players:** You usually see this for reference; most edits are GM-driven.

## Interactive Elements

### Header

| Element | Icon | Action |
|---------|------|--------|
| NPC portrait | Image | Click to choose a new portrait |
| Name field | Text input | Click to edit the NPC name |
| Level field | Numeric | Click to set NPC level |
| Bioclass slot | Item icon + label | Drag a bioclass item here to assign; click edit (pencil) to open bioclass; click remove (trash) to unassign |
| Role dropdown | Dropdown menu | Click to select NPC role (affects attribute bonuses) |
| HP current/max | Numeric inputs | Click to set exact values |
| Force Barrier current/max | Numeric inputs | Click to set exact values |
| Force Barrier recovery | Numeric input | Click to set recovery rate |
| Boss toggle | Checkbox | Click to mark as boss or elite |
| HP Bonus field | Numeric | Click to set HP bonus modifier |

### NPC Stats Tab (Attributes)

| Element | Icon | Action |
|---------|------|--------|
| Attribute icon (e.g., Awareness) | Circle with symbol | Click to open a challenge roll for that attribute |
| Attribute value | Numeric display | Read-only; derived from bioclass + role bonuses |
| Strong/Good/Weak guidance | Text badges | Reference only; shows role bonuses |

### Combat Tab

| Element | Icon | Action |
|---------|------|--------|
| Mastered weapon dropdown | Dropdown | Click to select the NPC's primary weapon |
| Roll Attack button | Crosshairs icon + text | Click to execute a mastered attack with the selected weapon |
| Weapon ATT/DMG display | Numeric | Read-only; shows calculated bonuses including modifications |

### Notes Tab

| Element | Icon | Action |
|---------|------|--------|
| Unique Power field | Text box | Click to add/edit unique NPC power description |
| Boss Power field | Text box | Click to add/edit boss-specific power |
| Loot field | Text box | Click to track loot rewards |
| Notes field | Text box | Click to add GM notes or table reminders |

### Gear Tab (Inventory)

| Element | Icon | Action |
|---------|------|--------|
| Item name | Text/link | Click to open the item sheet |
| Item image | Icon | Reference; shows item type |
| Edit button | Pencil icon | Click to open the item for editing |
| Delete button | Trash icon | Click to remove the item |
| Add new item | Plus button | Click to create a new gear item |

### Effects Tab

| Element | Icon | Action |
|---------|------|--------|
| Effect toggle | Check or X icon | Click to enable/disable a condition |
| Effect name | Text | Click to open the effect sheet |
| Delete button | Trash icon | Click to remove the effect |
| Add new effect | Plus button | Click to create a new effect |

### Biography & Appearance Tab

| Element | Icon | Action |
|---------|------|--------|
| Biography field | Text box | Click to add NPC background/description |
| Appearance field | Text box | Click to describe appearance |

## Steps

1. **Header:** Set name, level, bioclass, role, and wealth tier.
2. **HP/Force Barrier:** Set HP current/max, Force Barrier current/max/recovery, Boss toggle, and HP Bonus.
3. **Attributes & Calculations:** NPC Stats tab shows derived attributes. Role Calculations panel shows Strong/Good/Weak guidance. Use attribute icons for challenge rolls.
4. **Mastered Weapon:** Select in Combat tab. Verify ATT/DMG totals include any implemented weapon mechanics (Battle Assist Combat floor, Expert Crafting, Enhanced Alloy, Bane Tune, Arc).
5. **Click Roll Attack** to execute a mastered attack. Collateral cards may appear for weapons with the Spread feature.
6. **Notes:** Track Unique Power, Boss Power, Loot, table notes.
7. **Gear:** Reference inventory tracking only (doesn't auto-apply to NPC stats).
8. **Effects:** Toggle active/inactive as conditions start/end.

**Weak Penalty Exception:** Open the bioclass item, go to Traits tab, enable Ignore Weak Penalty if needed.

## What Happens Automatically

1. NPC attributes are derived from bioclass base attributes plus role bonuses.
2. Derived defenses and action values recalculate from current level and attributes.
3. Mastered attack and damage calculations update from level, role rules, selected mastered weapon, and implemented weapon mechanics (Battle Assist, Expert Crafting, Enhanced Alloy, Bane Tune, Arc).
4. Collateral cards may appear for weapons with the Spread feature when mastered attacks are rolled.
5. Damage application checks Force Barrier before HP.
6. Turn-start force barrier recovery uses configured recovery rate when applicable.
7. Gear tab merges gear, armor, shield, and weapon into one list.
8. When Ignore Weak Penalty is enabled on the assigned bioclass, weak role penalties are removed from NPC attribute calculations.

## What You Must Set Manually

1. HP current during play.
2. Force Barrier current, max, recovery values.
3. Boss toggle, HP Bonus, role, wealth, mastered weapon.
4. Weak Penalty exception if needed (on bioclass item).
5. Any armor/weapon/shield bonuses you want applied to NPC defenses (Gear tab doesn't auto-apply).

## Limitations and Not Implemented

1. NPC notes and power text are reference text; they do not auto-apply every situational rule.
2. Some role powers are informational and still need table judgment.
3. Loot and wealth are not fully auto-generated from tier.
4. If source item fields are incomplete, gear display and downstream rolls reflect those incomplete values.
5. NPC Gear tab entries are inventory tracking only; they do not currently auto-apply armor, weapon, or shield item stats to NPC derived values.

## Troubleshooting

### Q: Role modifier looks wrong.

A: Check NPC role, level, and bioclass.

### Q: Weak penalty should be ignored.

A: Open the bioclass, go to Traits tab, enable Ignore Weak Penalty.

### Q: Armor/shield/weapon missing from Gear.

A: Verify the item is embedded on this NPC.

### Q: Mastered attack looks off.

A: Check mastered weapon selection, NPC level, and mastered attack totals. If the weapon uses a modification, verify it's automatic (see Weapons guide).

### Q: I see extra damage cards from a mastered attack.

A: Those are collateral cards from Spread. Apply each to the corresponding target.

## Related Pages

1. [Creating a New Actor](creating-a-new-actor.md)
2. [Combat Workflow](combat-workflow.md)
3. [Weapons, Armor, Shields, and Gear](weapons-armor-shields-and-gear.md)
