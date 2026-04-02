# Demolition and Range-Based Actions

## Purpose

Handle demolition and other range-sensitive actions that depend on where tokens are on the map.

## Before You Start

1. Make sure your token is present on the scene.
2. Confirm your source item has a valid range increment.
3. Confirm your table uses the scene and targeting flow for demolition.

## Steps

1. Trigger the demolition-capable roll from the correct source item.
2. Confirm attribute and modifiers.
3. Place or confirm the target area as prompted.
4. Submit the roll and read range and difficulty details in chat.
5. If the action misses, resolve scatter behavior as shown by the system and your table rules.
6. Apply collateral or target effects according to table adjudication.

## What Happens Automatically

1. Range-to-target calculations use token position and placement point.
2. Difficulty is derived from measured distance and the source item's range increment.
3. Chat output includes distance and outcome details.

Example: with range increment 4 and target distance 9, the action is treated as 3 range bands for difficulty calculation.

## What You Must Set Manually

1. Correct token placement and action declaration.
2. Any manual effect resolution after the rolled result.
3. Cleanup and follow-up effects your table tracks outside automation.

Example: after a miss and scatter, confirm final affected targets before applying consequences.

## Limitations and Not Implemented

1. Demolition rolls fail fast when required setup is missing (example: no selected attacker token, or range increment set to 0).
2. Blast and collateral outcomes are not auto-finalized for every target (example: you still confirm who is affected before applying results).
3. Scatter and placement outcomes still need player/GM review on the map (example: corner scatter can land in an awkward map position that needs table interpretation).

## Troubleshooting

### Q: I got a missing attacker token warning. What should I do?

A: Place and select the attacker token before rerunning the roll.

### Q: I got a range increment warning. What does that mean?

A: Open the source item and set a valid range increment value.

### Q: Targeting looks wrong. How do I correct it?

A: Repeat the action with clear placement and confirm map position before rolling.

## Related Pages

1. [Rolls Overview](rolls-overview.md)
2. [Virtual Grid Units and Combat Zones](virtual-grid-units-and-combat-zones.md)
3. [Combat Workflow](combat-workflow.md)
4. [Troubleshooting and Known Limitations](troubleshooting-and-known-limitations.md)
