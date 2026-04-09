# Creating a New Actor

## Purpose

Build a playable actor and fill in the must-have fields before session one.

## Before You Start

1. Confirm you can create actors in your world.
2. Confirm your GM has shared which actor type you should use.
3. Have your starting character details ready (name, level, motivation, and baseline stats if applicable).

## Steps

1. Create a new actor in Foundry.
2. Choose the actor type your table expects.
3. Open the actor sheet.
4. In the header, set character name, level, motivation, and lurans.
5. In the header, confirm current HP, Force Barrier, Resolve, and Cynicism values.
6. Open the Attributes tab and verify all attributes are populated for your character.
7. Set attribute increase pips only when your table advances and allows increases.
8. Open the Biography tab and add your player-facing notes.
9. Save and close, then reopen once to ensure values persist.

## What Happens Automatically

1. Resource bars visually reflect current values.
2. Combat-facing derived stats such as Armor Defense (AD), TD, ND, and ST are recalculated from actor stats and equipped items.
3. Attribute increase controls enforce lower and upper bounds.

Example: after equipping armor or changing attributes, one or more defense totals (like Armor Defense (AD) or ST) may update.

## What You Must Set Manually

1. Character identity fields (name, biography, motivation choice).
2. Starting state values that are not automatically assigned by your selected setup flow.
3. Any table-specific narrative or tracking fields your GM expects.

## Limitations and Not Implemented

1. The sheet does not enforce every character creation rule by itself (example: it will let you type numbers your table might not allow).
2. Several displayed values depend on item setup (example: defenses can look wrong until armor/shield AD bonuses are configured).
3. You can directly edit many numeric fields, which is flexible but easy to mis-key (example: setting HP or bonuses too high by accident).
4. Advanced sections may show rules text without a direct automation button (example: a feature can describe an effect that you still apply manually at resolution time).

## Troubleshooting

### Q: A value on my sheet looks wrong. What is the first thing to do?

A: Re-open the sheet and confirm your currently equipped items are still set as expected.

### Q: My defenses or force barrier look incorrect. What should I check?

A: Check armor and shield item fields first, then confirm the right items are equipped.

### Q: My actor baseline stats do not match what I expected. Why?

A: Confirm your bioclass is assigned, then verify the bioclass starting attributes are configured correctly.

## Related Pages

1. [Player Guide Home](README.md)
2. [Bioclasses](bioclasses.md)
