# Troubleshooting and Known Limitations

## Purpose

Give you one place to check common problems, known limits, and quick fixes.

## Before You Start

1. Identify which part of play is failing.
2. Common categories are actor setup, bioclass/aspect assignment, trait effects, equipment values, roll execution, and combat turn behavior.

## Steps

1. Confirm actor ownership and edit permissions.
2. Reopen the actor sheet after major feature or item changes.
3. Verify source item fields before debugging roll totals.
4. For bioclass and aspect traits, open generated traits, make choices, and save.
5. Re-test the same action with minimal modifiers.
6. If needed, remove and re-apply the problematic feature item.

## What Happens Automatically

1. Many values and card details update from source data.
2. Replacing a bioclass or aspect removes the previous one and applies the new one (you can only have one bioclass and one aspect at a time).
3. At turn start in combat, Force Barrier can recover automatically if it has valid recovery settings and is not at 0 with no recovery.

Example: assigning a new bioclass replaces the old one and refreshes associated generated traits.

## What You Must Set Manually

1. Trait choices that require player decisions.
2. Correct item authoring values for bonuses and ranges.
3. Outcomes that appear in chat but are not auto-written to actor state.

## Limitations and Not Implemented

1. Only one bioclass and one aspect are supported per actor.
2. Choice-driven bioclass and aspect trait changes may not finalize until trait edit and save (example: "pick one bonus" options).
3. Standard trait levels are milestone-limited to 1, 4, and 7 (example: you cannot add a normal level 2 trait).
4. Rules text effects without dedicated automation remain manual (example: many trait-text and ammo-text effects still need player/GM application).
5. Demolition setup is strict (example: missing token or missing range increment blocks the roll with a warning).
6. Cybernetics package choices and many implant-specific effects are visible on sheets but are not auto-applied end-to-end, so they require manual table handling.

## Rules Update Coverage Gaps (Quick Reference)

1. Item modifications: You can select mod names on item sheets, but many mod rules do nothing mechanically unless you also add explicit numeric modifiers/effects.
2. Special ammo: You can select ammo type, but most ammo effects (for example cryo AP penalties, cinder ongoing damage, homing interactions) are resolved manually.
3. Shield tactics: Advanced shield behavior from the rules (angle lock/defensive arc style handling) is manual in most cases.
4. Force barrier lifecycle: Barrier damage absorption and turn-start recovery exist, but overload/recharge-time lifecycle tracking must still be tracked manually.
5. Cybernetics package logic: Bioclass slot display exists, but many package/implant effects still need manual setup or manual adjudication.

## Troubleshooting

### Q: My actor values look wrong after changing bioclass or aspect. What should I check?

A: Reopen the actor, confirm the active bioclass/aspect is the one you expect, then open generated traits and save any required choices. Remember: assigning a new bioclass/aspect replaces the previous one.

### Q: My attack or damage numbers look off. What should I check first?

A: Check the source weapon first: ATT, DMG, range increment, and any situational modifiers entered in the roll dialog. Example: if range increment is 0, range-based rolls will not behave as expected.

### Q: I get demolition warnings in chat. What does that usually mean?

A: Most often it means setup is missing. Place/select the attacker token and verify the source item has a valid range increment.

### Q: I cannot see expected buttons or actions. What should I verify?

A: Verify ownership/permissions, confirm the item type is correct for that action, and make sure you are using your own actor sheet. Example: attack actions only appear for weapon items.

### Q: Right-click Apply Damage is missing from a chat card. What should I verify?

A: Confirm the chat message is visible and roll-based, then select at least one token on the canvas. Apply Damage and Apply Healing only appear when a controlled token exists.

## Related Pages

1. [Bioclasses](bioclasses.md)
2. [Aspects](aspects.md)
3. [Demolition and Range-Based Actions](demolition-and-range-based-actions.md)
