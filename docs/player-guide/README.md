# Synthicide Player Guide

This guide walks players through using the Synthicide Foundry system at the table.

It focuses on practical sheet actions, rolls, and known limits. It does not cover programming or system internals.

## Start Here

1. [Getting Started in Foundry](getting-started-in-foundry.md)
2. [Creating a New Actor](creating-a-new-actor.md)
3. [Bioclasses](bioclasses.md)
4. [Aspects](aspects.md)
5. [Actor Sheet Tour](actor-sheet-tour.md)
6. [Traits](traits.md)
7. [Weapons, Armor, Shields, and Gear](weapons-armor-shields-and-gear.md)
8. [Rolls Overview](rolls-overview.md)
9. [Making an Attack Roll](making-an-attack-roll.md)
10. [Combat Workflow](combat-workflow.md)
11. [Virtual Grid Units and Combat Zones](virtual-grid-units-and-combat-zones.md)
12. [Resources and Derived Values](resources-and-derived-values.md)
13. [Demolition and Range-Based Actions](demolition-and-range-based-actions.md)
14. [Troubleshooting and Known Limitations](troubleshooting-and-known-limitations.md)

## What This Guide Covers

- Building and maintaining a character sheet.
- Assigning and replacing character-defining items (bioclass and aspect).
- Equipping gear and running common roll flows.
- Understanding what the system automates vs what players still do manually.

## Core Play Assumptions

- You have permission to create and edit actors.
- You can open item sheets from your actor or item directory.
- You are using this system in Foundry VTT v14.

## Global Limitations and Not Yet Implemented Areas

Use these expectations while reading every page in this guide:

1. Only one bioclass and one aspect can be assigned to an actor at a time.
2. Replacing a bioclass or aspect removes the previous one.
3. Key setup values must be verified by players or GMs (example: ATT/DMG, range increment, Armor Defense (AD) bonuses, and Force Barrier fields on items).
4. Bioclass and aspect trait effects that require player choices are not finalized on creation; open, edit, and save the generated trait to implement them.
5. Trait levels for regular (non-feature) traits are milestone-based (1, 4, 7).
6. Outcomes tied to situational text still require player/GM judgment at resolution time (example: conditional bonuses and narrative effects in trait text).
7. Cybernetics currently shows slot context, but many package and implant effects from the rules update still require manual handling.
8. Item modification selectors exist on weapon/armor/shield sheets, but most modification effects are not auto-applied by rules logic. Treat them as tracking fields unless your GM has added explicit modifiers/effects.
9. Special ammo selection exists on ranged weapons, but most ammo-specific rule effects (for example cryo/cinder/homing/flash/anchor behaviors) require manual resolution.
10. Advanced shield behaviors from the rules update (angle lock, ranged cover state, ballistic shared cover, and similar tactical handling) do not have full dedicated automation and usually need manual adjudication.
11. Force barrier handles absorption and turn-start recovery, but overload and recharge timing from the rules kit must still be tracked manually.

## Key Terms (Plain Language)

1. Derived stats (also called derived values in this guide): Read-only totals the sheet calculates from your attributes and gear. Common examples are Action Points (AP), Battle Reflex (BR), Armor Defense (AD), Nerve Defense (ND), Toughness Defense (TD), and Shock Threshold (ST). "AD" always means Armor Defense; roll difficulty is always called "RD".
2. Source item: The specific item that started a roll or effect. Example: the weapon you clicked to make an attack roll.
3. Generated trait: A trait item created automatically when you assign a bioclass or aspect.
4. Milestone trait levels: Standard trait levels supported by this system for normal traits (1, 4, and 7).
5. Message visibility mode: Who can see a chat roll (for example public vs more restricted visibility).
6. Manual resolution: A result the system displays but does not apply directly to state without player/GM confirmation.
7. Tracking field: A value or selector shown on a sheet for reference that may not automatically change roll math by itself.
8. ATT/DMG: Weapon attack and damage values used in roll math. Certain sheet fields label these as attack bonus and damage bonus.

## Page Format

Each page in this guide follows the same sections:

1. Purpose
2. Before You Start
3. Steps
4. What Happens Automatically
5. What You Must Set Manually
6. Limitations and Not Implemented
7. Troubleshooting

## Suggested Reading Order

1. [Getting Started in Foundry](getting-started-in-foundry.md)
2. [Creating a New Actor](creating-a-new-actor.md)
3. [Actor Sheet Tour](actor-sheet-tour.md)
4. [Bioclasses](bioclasses.md)
5. [Aspects](aspects.md)
6. [Traits](traits.md)
7. [Weapons, Armor, Shields, and Gear](weapons-armor-shields-and-gear.md)
8. [Rolls Overview](rolls-overview.md)
9. [Making an Attack Roll](making-an-attack-roll.md)
10. [Combat Workflow](combat-workflow.md)
11. [Virtual Grid Units and Combat Zones](virtual-grid-units-and-combat-zones.md)
12. [Resources and Derived Values](resources-and-derived-values.md)
13. [Demolition and Range-Based Actions](demolition-and-range-based-actions.md)
14. [Troubleshooting and Known Limitations](troubleshooting-and-known-limitations.md)

