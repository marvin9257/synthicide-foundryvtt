# Combat Workflow

## Purpose

Show how to run a smooth turn in Foundry combat using Synthicide tools.

## Before You Start

1. Confirm combat is started in Foundry.
2. Ensure your token is in the scene.
3. Verify your equipped armor, shield, and weapon setup.

## Steps

1. Start your turn by checking current resources.
2. Confirm Force Barrier, HP, Resolve, Cynicism, and current AP.
3. Perform movement and action decisions per your table rules.
4. Use challenge or attack rolls from your actor sheet.
5. Resolve hit, damage, and follow-up effects from chat output.
6. End your turn after applying all required manual outcomes.

Example turn: check AP/Force Barrier -> make an attack roll from a weapon -> apply chat result -> update any manual effects -> end turn.

## What Happens Automatically

1. The system runs automatic turn-start combat updates.
2. At turn start, Force Barrier recovery is applied when the actor has valid recovery values (example: no recovery is applied if current Force Barrier is 0 and recovery is 0).
3. Roll cards capture detailed combat results in chat.

Example: if Force Barrier has a positive current value and recovery rate, it can recover at turn start.

## What You Must Set Manually

1. Tactical choices and target declarations.
2. Any effects not directly auto-applied by the roll flow.
3. Rule interpretations your table tracks manually.

## Limitations and Not Implemented

1. Combat effects described in free-text traits or scenario rules are not auto-applied by chat cards (example: a narrative condition still needs manual application on the sheet).
2. Turn outcomes can require manual confirmation in chat and on sheet values (example: checking that the right target assumptions were used before applying results).
3. Turn-start force barrier refresh is conditional, not guaranteed every round (example: no refresh if force barrier value is 0 or recovery rate is 0).
4. Edge-case interactions need a GM ruling instead of a built-in resolution flow (example: unusual movement combined with blast overlap).
5. Force barrier overload and recharge-time tracking from the rules update must be tracked manually after collapse.
6. Advanced tactical actions from the rules kit (such as cover-fire style handling) do not have dedicated automation buttons and must be resolved manually.

## Troubleshooting

### Q: Force barrier did not change like I expected. What do I verify?

A: Verify force barrier values and armor setup first, including recovery-related fields.

### Q: Movement or range results look wrong. What should I check?

A: Verify token placement and confirm you are on the active scene.

### Q: Chat actions are missing. What usually causes this?

A: Check permissions and message visibility mode.

## Related Pages

1. [Making an Attack Roll](making-an-attack-roll.md)
2. [Virtual Grid Units and Combat Zones](virtual-grid-units-and-combat-zones.md)
3. [Resources and Derived Values](resources-and-derived-values.md)
4. [Demolition and Range-Based Actions](demolition-and-range-based-actions.md)
