# Rolls Overview

## Purpose

Explain the shared roll system so you know which roll type to use, what each dialog field controls, and how to read chat output.

## Before You Start

1. Open your actor sheet.
2. Choose the roll source (attribute icon, weapon attack control, demolition weapon, or rollable item).
3. If you are making an attack or demolition roll, select a target token first.

## Steps

1. Trigger a roll from the actor sheet.
2. Confirm roll type in the dialog (Challenge, Attack, or Demolition).
3. Set message visibility mode (who can see the roll in chat).
4. Confirm attribute and roll difficulty (RD) fields (RD appears on challenge flow).
5. Set misc modifier.
6. For attack or demolition, verify armor, ATT, DMG, range modifier, and shield bonus.
7. Submit the roll.
8. Read the result card in chat and use follow-up buttons when available.

## Types of Rolls and What They Are For

1. Challenge roll:
Use this for attribute checks that are not weapon attacks.
It compares your total to the selected roll difficulty (RD) and shows success level in chat.
2. Attack roll:
Use this for weapon attacks in combat.
It resolves hit logic against target armor and can unlock a Roll Damage follow-up button.
3. Demolition roll:
Use this for demolition-class weapons and blast placement workflows.
It uses the same core roll flow but applies demolition targeting and placement logic.
4. Damage follow-up roll:
Use this from the Roll Damage chat button after a qualifying attack/demolition result.
It posts a damage card based on stored attack data instead of rolling a brand-new attack.
5. Opposed challenge roll:
Use this from the Roll Opposed chat button on a challenge card when another actor contests the result.
It prompts a second challenge roll and posts a comparison summary.

## Dialog Options and What Each One Does

1. Roll Type:
Chooses the roll workflow (Challenge, Attack, Demolition) when subtype switching is allowed by the opener.
2. Message Type:
Controls chat visibility (for example public or restricted modes).
3. Attribute:
Sets the attribute added to the roll.
Attack and demolition commonly lock this to combat-facing logic.
4. Roll Difficulty (RD):
Used by challenge rolls to determine result.
5. Misc Modifier:
Manual situational modifier entered for the current roll.
6. Roll Modifiers total and list:
Read-only summary of actor-level modifiers currently affecting the roll.

Note: Persistent modifiers come from owned items and actor state and are aggregated during actor preparation. Item modifiers must be authored as a deterministic formula string (the `formula` field) and are evaluated synchronously during actor preparation; per-roll evaluation of item formulas or per-roll "modifier contexts" is not supported.
7. Target Armor:
Defense value the attack compares against.
8. Attack Bonus (ATT):
Added offensive bonus for the source weapon.
9. Damage Bonus (DMG):
Stored for damage follow-up calculations.
10. Range Modifier:
Distance modifier, including virtual zone penalties/bonuses when applicable.
11. Shield Bonus:
Target shield contribution used in attack context.

## Chat Output: What You See and How to Use It

1. Card header:
Shows roll title and metadata tags (such as difficulty info).
2. Inline die display:
Shows the d10 result used in the roll.
3. Effect or outcome row:
Shows success/failure text and effect-oriented labels when present.
4. Details panel:
Expands to show full equation, term-by-term contributions, and metadata rows.
5. Follow-up buttons:
Roll Damage appears on qualifying attack/demolition cards.
Roll Opposed appears on challenge cards where contested resolution is needed.

## Applying Damage or Healing From Chat Cards

1. Select one or more target tokens on the scene first.
2. In chat, right-click the roll/result message you want to apply.
3. Choose Apply Damage to subtract the roll total from selected token actors.
4. Choose Apply Healing to add the roll total back to selected token actors.
5. Confirm token HP and Force Barrier values after application.

Example: select one NPC token -> right-click the damage card -> Apply Damage.
Example: select two tokens -> right-click -> Apply Damage applies to both controlled tokens.

Example: attack card -> open details to verify ATT, attribute, and range terms -> click Roll Damage if the hit qualifies.

## What Happens Automatically

1. Dialog defaults are populated from your actor and the item you clicked.
2. Attack and demolition defaults pull source item values for ATT, DMG, and range-related fields.
3. Equation breakdown and card details are rendered in chat.
4. Follow-up actions such as Roll Damage or Roll Opposed appear on qualifying cards.
5. Chat message context menu includes Apply Damage and Apply Healing when a visible roll card exists and at least one token is controlled.
6. Actor-level modifiers are aggregated during actor preparation and used as the read-only roll modifiers shown in the dialog.

Example: an attack roll card can show the computed terms and then expose a follow-up damage action when valid.

## What You Must Set Manually

1. Situation-specific modifiers and target assumptions.
2. Accurate target Armor Defense (AD) and shield values.
3. Any GM-required interpretation and outcomes after the roll.
4. Follow-up execution timing (when to click damage/opposed and when to stop for table adjudication).
5. Token selection before using chat-card Apply Damage or Apply Healing.

## Limitations and Not Implemented

1. Chat cards do not auto-apply every result to actor state (example: follow-up effects may still need manual application after chat output).
2. Incorrect source item values carry directly into defaults (example: wrong weapon ATT means wrong prefilled attack bonus).
3. Opposed rolls and certain post-roll actions still require manual follow-up in chat (they are separate clicks, not an auto-chain).
4. Special ammo effects from the rules kit are not auto-resolved in roll math/cards (example: cryo AP reduction, cinder ongoing fire, and homing follow-up behavior are handled manually).
5. Weapon modification labels do not apply all rules text by themselves (example: long range, slug shot mode, and full auto behavior only affect math when explicit item stats/modifiers are authored).
6. Item modifiers are evaluated during actor preparation and must be deterministic: authors should use the `formula` field. Per-roll evaluation of item formulas or "roll-context" modifier behavior is not supported.
7. Demolition and attack follow-up output can depend on correct target/token setup; missing context may block or degrade expected automation.
7. Apply Damage and Apply Healing use currently controlled tokens, so applying to the wrong token is possible if selection is wrong.

## Troubleshooting

### Q: My roll total looks wrong. What should I check first?

A: Check the source attribute and item bonuses used for that roll.

### Q: The attack dialog used the wrong weapon/data. How do I fix it?

A: Trigger the roll again from the intended weapon or source action.

### Q: A follow-up action is missing. Why?

A: Check chat card buttons, message visibility mode, and permissions.

### Q: The roll type is not what I expected. What should I verify?

A: Check the source you clicked. Demolition-class weapons force demolition flow, and weapon attack controls open attack flow.

### Q: The details panel total does not match my expectation. What should I inspect?

A: Expand details and verify attribute value, misc modifier, actor roll modifiers, ATT, and range modifier terms.

### Q: I do not see Apply Damage when I right-click a chat card. What should I check?

A: Confirm the message is a visible roll/result card and confirm at least one token is currently selected on the canvas.

## Related Pages

1. [Making an Attack Roll](making-an-attack-roll.md)
2. [Virtual Grid Units and Combat Zones](virtual-grid-units-and-combat-zones.md)
3. [Combat Workflow](combat-workflow.md)
4. [Troubleshooting and Known Limitations](troubleshooting-and-known-limitations.md)
