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
7. On vehicle sheets, some flavor categories can be multi-pick in RAW, but the sheet currently supports one selection per flavor category.
8. On vehicle sheets, ship weapons roll damage only; attack resolution and range validation are manual.

## Rules Update Coverage Gaps (Quick Reference)

1. **Item modifications**: You can select mod names on weapon items. Automatic mechanics are limited to:
   - Battle Assist (Combat attribute floor)
   - Expert Crafting (damage bonus)
   - Enhanced Alloy (attack bonus)
   - Bane Tune (+3 damage vs qualifying target type)
   - Arc feature (attack bonus vs synthetics/targets with implants)
   - Spread feature (collateral cards)
   - Double Shot (+2 damage bonus on spread collateral cards)
   - Slug Shot (damage calculation)
   All other modifications are tracking fields and require manual implementation of their effects.
2. **Special ammo**: Ammo selection is partially automated. The system currently handles several direct effects and status markers, but broader RAW behavior for ammo still requires manual table resolution.
3. **Weapon features**: Most features are descriptive and require manual application. Arc provides an attack bonus vs qualifying targets, and Spread provides collateral-card generation.
4. **Shield tactics**: Advanced shield behavior from the rules (angle lock/defensive arc style handling) is manual in most cases.
5. **Force barrier lifecycle**: Barrier damage absorption and turn-start recovery exist, but overload/recharge-time lifecycle tracking must still be tracked manually after collapse.
6. **Cybernetics package logic**: Bioclass slot display exists, but many package/implant effects still need manual setup or manual adjudication.
7. **Weapon specialization**: Weapon Proficiency traits now apply implemented numeric specialization bonuses by milestone tier, but they do not automate every specialization text rider.

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

### Q: I selected a weapon modification, but it is not affecting my attack bonus or damage. Why?

A: Most modifications do not have automatic mechanics. Check the [Rules Update Coverage Gaps section](#rules-update-coverage-gaps-quick-reference) above and the [Weapons, Armor, Shields, and Gear guide](weapons-armor-shields-and-gear.md) to see which modifications are automatic. For non-automatic modifications, apply bonuses or effects manually at your table.

### Q: My weapon has Arc feature, but the attack bonus is not showing. What should I check?

A: Arc provides +2 bonus against synthetic targets. Verify that the target is actually a synthetic in your rules. Also expand the chat card details to see the full bonus breakdown. If the target is organic, the Arc bonus does not apply.

### Q: I see extra damage cards in chat after my attack. What are these and how do I apply them?

A: These are collateral cards from the Spread feature on your weapon. Each collateral card applies to a different target. Select the target and right-click each collateral card to Apply Damage individually.

### Q: My special ammo is not working. Is the system supposed to auto-apply ammo effects?

A: Partly. Some ammo is automated and some is not. The system currently applies direct numeric changes for Homing and Power Wounding, plus several on-hit status effects such as Cryo, Cinder, Flash, Anchor, and Poison. More complex RAW handling still needs manual resolution. Check the [Weapons, Armor, Shields, and Gear guide](weapons-armor-shields-and-gear.md#special-ammo) for the current split.

### Q: My Weapon Proficiency trait is set, but I still do not see a specialization bonus. What should I verify?

A: Check three things first: trait type is Weapon Proficiency, specialization matches the weapon family, and level is 1, 4, or 7. For blaster weapons, use Shotgun specialization. See [Weapon Specializations](weapon-specializations.md).

### Q: Vehicle flavor rules at my table allow multiple picks in one category. Why can I only choose one?

A: Vehicle flavor fields are currently single-select per category on the sheet. If your table uses multiple picks in a category, track extra selections manually in vehicle notes. See [Vehicle Sheet Tour](vehicle-sheet-tour.md).

### Q: Why does my ship weapon only roll damage?

A: Current ship-weapon controls produce damage rolls only. Hit chance and range checks are not automated for ship weapons and must be resolved manually at the table. See [Vehicle Sheet Tour](vehicle-sheet-tour.md).

## Related Pages

1. [Bioclasses](bioclasses.md)
2. [Aspects](aspects.md)
3. [Weapon Specializations](weapon-specializations.md)
4. [Demolition and Range-Based Actions](demolition-and-range-based-actions.md)
5. [Vehicle Sheet Tour](vehicle-sheet-tour.md)
