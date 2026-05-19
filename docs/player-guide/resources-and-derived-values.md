# Resources and Derived Values

## Purpose

Know which values you control directly and which the system calculates.

## Derived Stats (Read-Only)

The system calculates these from your attributes and equipment:

1. **AP** - Action Points
2. **BR** - Battle Reflex
3. **TD** - Toughness Defense
4. **AD** - Armor Defense
5. **ND** - Nerve Defense
6. **ST** - Shock Threshold

## Direct Resources (You Control)

1. **HP** - Click to set exact value
2. **Force Barrier** - Click current/max to adjust
3. **Resolve** - Use +/- buttons during play
4. **Cynicism** - Use +/- buttons during play

## What Happens Automatically

1. Derived stats recalculate when you change attributes or equipped items.
2. Force Barrier recovery is applied at turn start (when recovery rate is valid).
3. Resource bars update from current values.

## What You Must Set Manually

1. Current resource values during play (if your table tracks manually).
2. Correct item data (affects downstream calculations).
3. Progression updates (attribute increases).

## Limitations and Not Implemented

1. Bad source item data = bad derived values.
2. Sheet doesn't enforce every progression rule your table uses.
3. Situational adjustments (cover, penalties) must be player/GM decision.

## Troubleshooting

### Q: A derived value looks wrong.

A: Check source equipment and trait data first.

### Q: Resource changed unexpectedly.

A: Verify ownership permissions and the update was saved.

### Q: Combat refresh behavior seems wrong.

A: Confirm combat is active and actor data is valid.

## Related Pages

1. [Weapons, Armor, Shields, and Gear](weapons-armor-shields-and-gear.md)
2. [Combat Workflow](combat-workflow.md)
