# Virtual Grid Units and Combat Zones

## Purpose

Explain how virtual grid units (zones) work in combat movement and how zone distance affects attack rules.

## Before You Start

1. Open your world settings.
2. Enable **Use Virtual Grids (Zones)** in Synthicide settings.
3. Place your token on the active scene.
4. Start combat in the scene.

## Steps

1. Start combat and confirm the orange 3x3 virtual overlay appears on the map.
2. Select your token and drag movement with the ruler.
3. Read movement labels in zones while plotting your path.
4. Target an enemy token before making an attack roll.
5. Open the attack dialog and verify the range modifier shown for that target distance.
6. Submit the roll and confirm the chat result matches your expected zone penalty/bonus.

Example: if your target is 2 zones away and your weapon range increment is 1, the range modifier is -1.

## What Happens Automatically

1. During active combat, the system draws a virtual zone overlay where each zone is 3x3 base grid squares.
2. Movement ruler labels switch to zones when virtual grids are enabled and combat is active.
3. Zone distance uses Chebyshev counting: moving 1 zone diagonally costs the same as moving 1 zone straight.
4. Attack range context uses zone distance between attacker and target token centers.
5. The virtual overlay is removed when combat ends.

## What You Must Set Manually

1. Enable the world setting for virtual grids before combat starts.
2. Keep attacker and target tokens placed correctly on the scene before rolling.
3. Confirm target selection before opening attack rolls.
4. Apply any table-specific movement restrictions not enforced by the ruler.

## Rules Tie-In (Player-Facing)

1. This system models combat movement using zones instead of counting each 5-foot square during combat.
2. A zone is treated as a 15'x15' area when your base grid is 5-foot squares.
3. Zone distance drives range penalties and bonuses in attack flow.
4. The close weapon feature grants +1 ATT only when attacker and target are in the same zone.

## Limitations and Not Implemented

1. The zones ruler and orange overlay only appear when both conditions are true: virtual grids enabled and combat started.
2. If attacker or target token is missing from scene placement, range context falls back and may warn instead of calculating full zone distance.
3. The overlay changes map guidance and labels, but it does not auto-enforce all tactical house rules tied to movement.
4. Zone movement display does not replace GM adjudication for unusual terrain, verticality, or custom map constraints.

## Troubleshooting

### Q: I enabled the setting, but I still do not see the virtual overlay. What should I check?

A: Confirm combat has started. The overlay is intentionally combat-only.

### Q: My ruler still shows normal units instead of zones. Why?

A: Check both conditions: virtual grid setting enabled and active combat running in the current scene.

### Q: My attack range modifier looks wrong. What should I verify first?

A: Verify attacker token placement, target token selection, and weapon range increment.

### Q: Diagonal movement looks cheaper than I expected. Is that a bug?

A: No. Zone counting uses Chebyshev distance, so one diagonal zone step costs the same as one straight zone step.

## Related Pages

1. [Combat Workflow](combat-workflow.md)
2. [Making an Attack Roll](making-an-attack-roll.md)
3. [Demolition and Range-Based Actions](demolition-and-range-based-actions.md)
4. [Troubleshooting and Known Limitations](troubleshooting-and-known-limitations.md)
