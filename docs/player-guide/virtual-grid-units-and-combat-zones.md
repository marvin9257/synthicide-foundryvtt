# Virtual Grid Units and Combat Zones

## Purpose

Understand how zones work and how they affect attack ranges.

## Steps

1. Confirm virtual grids are enabled in world settings.
2. Start combat on the active scene.
3. Verify the orange 3x3 overlay appears on the map.
4. Drag your token with the ruler to see zone labels.
5. Target an enemy before making an attack.
6. Open the attack dialog and verify the range modifier for that distance.
7. Submit the roll.

Example: target 2 zones away, weapon range increment 1 → range modifier -1.

## What Happens Automatically

1. During active combat, the system draws a virtual zone overlay where each zone is 3x3 base grid squares.
2. Movement ruler labels switch to zones when virtual grids are enabled and combat is active.
3. Zone distance uses Chebyshev counting: moving 1 zone diagonally costs the same as moving 1 zone straight.
4. Attack range context uses zone distance between attacker and target token centers.
5. The virtual overlay is removed when combat ends.

## What You Must Set Manually

1. Enable virtual grid setting before combat.
2. Keep tokens placed on the scene before rolling.
3. Select targets before opening attack rolls.
4. Apply any table-specific movement restrictions.

## Rules Tie-In

1. A zone = 15'x15' area (assuming 5-foot base squares).
2. Zone distance drives range penalties/bonuses in attacks.
3. Close weapon feature grants +1 ATT only in the same zone.

## Limitations and Not Implemented

1. Zone overlay only appears during active combat.
2. Missing attacker/target tokens may trigger warnings instead of full zone calculation.
3. Overlay doesn't enforce all tactical house rules.
4. Zone display doesn't replace GM adjudication for terrain, verticality, custom constraints.

## Troubleshooting

### Q: I don't see the virtual overlay.

A: Confirm combat has started. Overlay is combat-only.

### Q: Ruler still shows normal units.

A: Check virtual grid setting is enabled and combat is running.

### Q: Attack range modifier looks wrong.

A: Verify attacker/target token placement and weapon range increment.

### Q: Diagonal movement looks cheaper than expected.

A: That's correct. Zones use Chebyshev distance (diagonal = straight cost).

## Related Pages

1. [Combat Workflow](combat-workflow.md)
2. [Making an Attack Roll](making-an-attack-roll.md)
3. [Demolition and Range-Based Actions](demolition-and-range-based-actions.md)
