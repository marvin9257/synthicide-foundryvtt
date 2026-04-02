# Actor Sheet Tour

## Purpose

Learn where everything lives on the actor sheet so turns move faster.

## Before You Start

1. Open your actor sheet.
2. Confirm your sheet is editable.

## Steps

1. In the header, set character name, level, motivation, and currency.
2. In the header, check HP, Force Barrier, Resolve, and Cynicism.
3. Open the Attributes tab and review base attributes and increase controls.
4. Open the Bioclass tab and confirm the active bioclass and generated bioclass traits.
5. Open the Aspect tab and confirm the active aspect, ability list, and generated aspect traits.
6. Open the Combat tab and review armor, shields, weapons, and equip state.
7. Open the Gear tab and review general rollable gear items.
8. Open the Traits tab and review milestone trait entries.
9. Open the Biography tab and review character notes.

## Click Actions Reference

Use this section as your quick map for what is clickable on the actor sheet.

1. Header portrait image:
Clicking your actor portrait opens image selection/edit for the actor portrait.
Use it when you want a clear token/sheet identity in chat and combat tracking.
2. Header resource +/- buttons (Resolve, Cynicism, Food Days):
Clicking + or - changes the resource by one step within its allowed bounds.
Use it during play to track fast-changing resources without typing values every time.
3. Header numeric fields (HP, Force Barrier, Level, Lurans, and similar inputs):
Clicking into the field lets you type a direct value.
Use it for exact updates from damage, healing, leveling, economy, or table rulings.
4. Attribute icon (left side icon in each attribute row):
Clicking the icon opens a challenge roll dialog for that attribute.
Use it for non-attack checks so the roll starts with the correct attribute already selected.
5. Attribute increase +/- buttons:
Clicking + or - changes that attribute's increase pips between 0 and 5.
Use it when applying progression increases so derived values recalculate from the updated attribute.
6. Combat tab equip checkbox icon (square/square-check):
Clicking the equip icon toggles equipped state for armor, shield, or weapon.
Use it whenever your active loadout changes because equipped state affects derived defenses and roll defaults.
7. Combat tab weapon attack controls (crosshair icon and weapon image roll click):
Clicking opens the attack roll flow for that specific weapon.
Use it when making attacks so ATT, DMG, and range increment defaults come from the selected weapon.
8. Item create button (plus icon in tab headers):
Clicking + creates a new embedded item of that tab's type (weapon, armor, shield, gear, trait, or effect).
Use it when building an actor manually or adding new gear/features during advancement.
9. Item edit button (pencil icon):
Clicking opens that item sheet.
Use it to update source values (for example ATT/DMG, range increment, trait choices, or effect text).
10. Item delete button (trash icon):
Clicking removes that embedded item/effect from the actor.
Use it to clean up wrong drops, replace outdated entries, or remove temporary items.
11. Bioclass/Aspect/Cybernetics info button (info-circle icon):
Clicking opens a quick description view for the linked feature.
Use it for at-table rules reminders without opening full item edit views.
12. Bioclass/Aspect generated trait edit/delete buttons:
Clicking edit opens the generated trait; clicking trash removes that trait from the actor.
Use edit to finalize choice-based generated traits, and delete to remove incorrect generated entries before re-adding.
13. Gear/Traits item image roll click:
Clicking the item image rolls that item's configured behavior.
Use it for item-driven rolls without manually building formulas in chat.
14. Effects tab toggle icon (check/x):
Clicking toggles an effect active/inactive state.
Use it when conditions start/end so the actor's active effects match current combat state.

Example flow: click weapon crosshair -> verify attack dialog modifiers -> roll -> click item edit if source ATT/DMG needs correction.

## What Happens Automatically

1. Derived stats (sheet-calculated values) update from actor and item data.
2. Common derived stats you will see are AP, BR, TD, AD, ND, and ST (shown on sheet as Action Points, Battle Reflex, Toughness Defense, Armor Defense, Nerve Defense, and Shock Threshold).
3. Tabs show item collections by type.
4. Roll actions open the shared roll dialog with relevant defaults.

## What You Must Set Manually

1. Narrative and campaign-specific fields.
2. Choice-based details in generated traits.
3. Any values not provided by your GM-authored items.

Example: if your GM did not prefill a weapon's ATT/DMG values (shown as attack bonus and damage bonus), you need to set them manually.

## Limitations and Not Implemented

1. Values pulled from item fields are only as accurate as those fields (example: a weapon with blank ATT, shown as attack bonus, rolls lower than intended).
2. The sheet lists many abilities and effects, but listing text does not apply game state by itself (example: an aspect ability can appear on the tab while its situational bonus is still a manual call).
3. Trait choice effects are not always final on first drop; open the generated trait, make the choice, and save.
4. The Cybernetics tab shows slot context (such as body/brain slot details), but package-level implant effects from the rules update are not auto-applied end-to-end.

## Troubleshooting

### Q: A tab looks incomplete. What should I check?

A: Verify your actor type and confirm the needed items are assigned.

### Q: An expected action is missing. Why?

A: Confirm your ownership permissions for that actor.

### Q: Values seem incorrect on this tab. Where do I debug first?

A: Start with source items and their configured fields.

## Related Pages

1. [Creating a New Actor](creating-a-new-actor.md)
2. [Bioclasses](bioclasses.md)
3. [Aspects](aspects.md)
