# NPC Sheet Tour

## Purpose

Learn how to run NPCs quickly from the sheet during play, with clear GM and player expectations.

## Before You Start

1. Open the NPC actor sheet.
2. Confirm whether you have edit permission.
3. Confirm the NPC has a bioclass assigned.
4. If no bioclass is assigned, open the Items directory and prepare to drag a bioclass item onto the NPC header drop zone.

## GM and Player Perspective

1. GM perspective:
Use this sheet as the primary encounter control panel for NPC stats, attacks, and notes.
2. Player perspective:
You usually read this sheet for transparency or shared reference, but most edits are GM-driven unless ownership is granted.

## Steps

1. In the header, set name, level, bioclass, role, and wealth tier.
2. If bioclass is missing, drag and drop a bioclass item onto the Bioclass slot in the header.
3. If a bioclass is already assigned and you drop another one, confirm replacement when prompted.
4. In the header, set HP values, Boss toggle, and HP Bonus as needed.
5. Open the Combat tab and set Force Barrier current, max, and recovery rate.
6. In the NPC Stats tab, review the left attribute column and use attribute icons for challenge rolls.
7. In the Role Calculations panel, confirm Strong, Good, and Weak guidance matches the selected role.
8. In the Derived Values panel, confirm AP, BR, TD, AD, ST, and ND.
9. In Combat, pick mastered weapon and review ATT/DMG totals, ability, range, and notes.
10. Click Roll Attack when using mastered attack flow.
11. In Notes, maintain Unique Power, Boss Power, Loot, and Notes.
12. In Gear, use the merged list to manage gear, armor, shield, and weapon items from one tab.
13. In Biography and Effects, keep narrative and active status effects current.

Important note:
On NPCs, the Gear tab is an inventory list. Items shown there do not automatically change derived stats or mastered attack values.

## Priest and Weak Penalty (Definitive Workflow)

Use this when an NPC should ignore weak role penalties (for example Priest-style NPC setup).

1. Open the NPC's assigned bioclass item from the header edit button.
2. Go to the bioclass Traits tab.
3. Enable Ignore Weak Penalty.
4. Save/close the bioclass item and return to the NPC sheet.
5. Verify the Role Calculations weak chip and weak attribute results update as expected.

This checkbox is the definitive control for removing weak penalties.

## Click Actions Reference

1. Header portrait image:
Click to change NPC portrait art.
2. Bioclass edit and remove buttons:
Click edit to open the bioclass item, or trash to remove it.
3. Bioclass drop zone (when empty):
Drag and drop a bioclass item from the directory to assign it.
4. Attribute icon in each row:
Click to open a challenge roll for that attribute.
5. Combat tab Mastered Attack Roll button:
Click to open an attack dialog pre-filled from mastered attack values.
6. Gear row edit and delete buttons:
Click edit to update item details, or trash to remove the item.
7. Gear tab New item button:
Click to create a new item directly from the NPC sheet.
8. Effects toggle control:
Click to enable or disable effects in the Effects tab.

## What Happens Automatically

1. NPC attributes are derived from bioclass base attributes plus role bonuses.
2. Derived defenses and action values recalculate from current level and attributes.
3. Mastered attack bonuses update from level, role rules, and selected mastered weapon.
4. Damage application checks Force Barrier before HP.
5. Turn-start force barrier recovery uses configured recovery rate when applicable.
6. Gear tab merges gear, armor, shield, and weapon into one list.
7. When Ignore Weak Penalty is enabled on the assigned bioclass, weak role penalties are removed from NPC attribute calculations.

## What You Must Set Manually

1. HP current value during play.
2. Force Barrier current, max, and recovery rate values in Combat tab.
3. Boss toggle and HP Bonus.
4. Role, wealth, mastered weapon, and narrative note fields.
5. Item quantity and price values where your table tracks them.
6. Priest-style weak-penalty exception setting on the bioclass item when needed.
7. Any mechanical bonuses from carried inventory entries (armor/weapon/shield/gear) that your table wants to apply to NPCs.

## Limitations and Not Implemented

1. NPC notes and power text are reference text; they do not auto-apply every situational rule.
2. Some role powers are informational and still need table judgment.
3. Loot and wealth are not fully auto-generated from tier.
4. If source item fields are incomplete, gear display and downstream rolls reflect those incomplete values.
5. NPC Gear tab entries are inventory tracking only; they do not currently auto-apply armor, weapon, or shield item stats to NPC derived values.

## Troubleshooting

### Q: A role modifier looks wrong. What should I check?

A: Verify NPC role, level, and the assigned bioclass values first.

### Q: Weak penalty should be ignored for this NPC. What should I check?

A: Open the NPC's bioclass item, go to Traits tab, and verify Ignore Weak Penalty is enabled.

### Q: I changed role but weak still looks wrong. What should I check?

A: Confirm the assigned bioclass is correct and that Ignore Weak Penalty is only enabled when intended.

### Q: Armor, shield, or weapon is missing from Gear. Why?

A: Confirm the item is embedded on this NPC and not on another actor.

### Q: Mastered attack roll looks off. Where do I debug first?

A: Check mastered weapon selection, NPC level, and mastered attack panel totals.

## Related Pages

1. [Actor Sheet Tour](actor-sheet-tour.md)
2. [Creating a New Actor](creating-a-new-actor.md)
3. [Combat Workflow](combat-workflow.md)
4. [Weapons, Armor, Shields, and Gear](weapons-armor-shields-and-gear.md)
5. [Troubleshooting and Known Limitations](troubleshooting-and-known-limitations.md)
