# Getting Started in Foundry

## Purpose

Get a new player or GM ready to use the Synthicide system in Foundry with the right settings, actor setup, and expectations.

## Before You Start

1. Confirm you are in a world that uses the Synthicide system.
2. Confirm you can open the Items directory and your actor sheet.
3. Confirm whether you are a player setting up your own sheet or a GM configuring the world.

## System Settings

Open **Game Settings -> Configure Settings -> System Settings** before play.

### GM or Assistant: world settings

These settings affect the whole world and are usually configured by the GM.

1. **Default Target Armor**: Used when the system cannot determine a target's Armor Defense automatically. Check this before testing attack rolls without a selected target.
2. **Use Shocking Strike Rules**: Enables automation for high single-hit damage that can trigger shocking strike handling and the related Toughness save flow.
3. **Use Virtual Grids (Zones)**: Enables the 3x3 zone overlay during active combat. Turn this on if your table wants zone-based movement and range measurement.
4. **Demolition Auto-Scatter**: Controls whether failed demolition throws automatically scatter to a random corner of the target zone.

### Every user: personal settings

These settings are per-user and can be adjusted individually.

1. **Sheet Style**: Choose the visual presentation for Synthicide sheets.
2. **Virtual Grid Color**: Changes the color of the virtual grid overlay on your client only.

### Related core Foundry setting

1. **Chat message visibility** is controlled by Foundry's core chat mode, not a Synthicide system setting. If rolls appear more public or more private than expected, check the chat log roll visibility mode.

## Steps

1. Open your actor sheet and confirm you have ownership or edit permission.
2. In the Items directory, find your starting bioclass, aspect, traits, and gear.
3. Drag your starting bioclass and aspect onto the actor first.
4. Open any generated traits and save them if they require player choices or manual setup.
5. Drag starting weapons, armor, shields, and other gear onto the actor.
6. Open important item sheets and verify key system-facing values such as ATT, DMG, lethal, range increment, armor bonuses, and force barrier fields if applicable.
7. Toggle equipped state for armor, shields, and weapons you are actively using.
8. Review the actor's derived values such as AD, ND, TD, ST, AP, and HP to confirm they match your expected setup.
9. If your table uses zones, ask the GM to confirm **Use Virtual Grids (Zones)** is enabled before combat begins.
10. Make one test roll from a weapon or other action item so you can verify roll math, prompts, and chat visibility before live play.

## What Happens Automatically

1. Drag-and-drop adds item copies to your actor.
2. Adding a bioclass or aspect applies the system's replacement rules if one is already assigned.
3. Derived values update from actor and item data.
4. Roll dialogs prefill from your actor, source item, and current settings.
5. If enabled by the GM, shocking strike handling and demolition scatter use the configured world rules.
6. If enabled by the GM, virtual grid overlays and zone measurement appear during active combat.

## What You Must Set Manually

1. Character narrative details, notes, and any non-mechanical sheet text.
2. Any item fields your GM or compendium source did not prefill.
3. Choice-driven trait selections by opening and saving generated traits after assignment.
4. Table rulings for effects that are described in item text but not implemented as automation.
5. Confirmation of world settings with the GM if your expected behavior does not match the system output.

## Limitations and Not Implemented

1. Effects described only in rules text are not automatically applied unless the system implements them directly.
2. Dropping a new bioclass or aspect replaces the old one.
3. Roll results only match the data entered on the source item and actor.
4. Some guide pages assume specific world settings are enabled, especially virtual grids and related combat behavior.
5. Core Foundry permissions still control whether players can edit actors, create content, or change world-level settings.

## Troubleshooting

### Q: Drag-and-drop isn't working.

A: Confirm you have ownership of the target actor.

### Q: Values look stale after edits.

A: Close and reopen the sheet.

### Q: Rolls show unexpected numbers.

A: Check the source item fields, equipped state, any manual modifiers you entered, and the GM's world settings such as **Default Target Armor**.

### Q: I expected shocking strike automation, but it did not happen.

A: Ask the GM whether **Use Shocking Strike Rules** is enabled in System Settings.

### Q: I do not see the zone overlay during combat.

A: Ask the GM whether **Use Virtual Grids (Zones)** is enabled. The overlay only appears during active combat.

### Q: My zone overlay color is different from another player's view.

A: **Virtual Grid Color** is a per-user client setting.

### Q: My rolls are showing to the wrong audience.

A: Check Foundry's core chat roll visibility mode. That behavior is not controlled by a Synthicide system setting.

## Related Pages

1. [Creating a New Actor](creating-a-new-actor.md)
2. [Actor Sheet Tour](actor-sheet-tour.md)
3. [Virtual Grid Units and Combat Zones](virtual-grid-units-and-combat-zones.md)
4. [Making an Attack Roll](making-an-attack-roll.md)
