# Resources and Derived Values

## Purpose

Know which values you edit directly and which derived stats are computed for you.

## Before You Start

1. Open your actor sheet.
2. Check header resources and attribute displays.

## Steps

1. Track directly editable resources: HP current value, Force Barrier current/max, Resolve, and Cynicism.
2. Review derived stats (the calculated, read-only values) influenced by attributes and gear.
3. After changing equipment or traits, verify derived outcomes.
4. During level progression, apply attribute increases using sheet controls.

## Derived Stats You Will See

1. Action Points (AP)
2. Battle Reflex (BR)
3. Toughness Defense (TD)
4. Armor Defense (AD)
5. Shock Threshold (ST)
6. Nerve Defense (ND)

Example: equipping armor with an armor bonus usually changes AD.
Example: changing relevant attributes can affect one or more defenses.

## What Happens Automatically

1. Resource bars and displays update after edits.
2. Defenses and combat-facing derived stats are recalculated from current actor and item data.
3. During combat turn updates, Force Barrier refresh is applied when recovery conditions are valid.

## What You Must Set Manually

1. Current resource values when your table tracks changes manually.
2. Correct item and trait data that feeds derived calculations.
3. Progression updates such as allowed attribute increases.

## Limitations and Not Implemented

1. Bad source data means bad derived data (example: wrong armor bonus causes wrong displayed defense).
2. The sheet does not enforce every progression rule your table may use (example: it will not stop every out-of-sequence stat change).
3. Situational adjustments are not auto-detected by the sheet (example: when cover or narrative penalties apply, players/GM must decide and enter the change).

## Troubleshooting

### Q: A derived value looks wrong. What should I inspect first?

A: Check source equipment and trait data first.

### Q: My resource value changed back unexpectedly. Why might that happen?

A: Verify ownership permissions and confirm the update was saved.

### Q: Combat refresh behavior seems wrong. What should I verify?

A: Confirm combat is active and actor data is valid for that refresh condition.

## Related Pages

1. [Creating a New Actor](creating-a-new-actor.md)
2. [Weapons, Armor, Shields, and Gear](weapons-armor-shields-and-gear.md)
3. [Combat Workflow](combat-workflow.md)
