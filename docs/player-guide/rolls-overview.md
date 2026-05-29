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
Expands to show full equation, term-by-term contributions, including automatic modification bonuses (Battle Assist, Expert Crafting, etc.).
5. Follow-up buttons:
Roll Damage appears on qualifying attack/demolition cards.
Roll Opposed appears on challenge cards where contested resolution is needed.
6. Collateral cards (if applicable):
For weapon attacks with the Spread feature, additional per-target damage cards may appear. Apply these to each corresponding target.

## Important: Damage Floor and Modification Mechanics

1. **Zero Damage Floor**: Damage rolls cannot produce less than 0 damage, even if target defenses or penalties reduce the total below zero.
2. **Modification Bonuses**: Only implemented automatic modification mechanics are included in chat card calculations. These include Battle Assist's Combat floor, Expert Crafting damage, Enhanced Alloy attack, Bane Tune bonus damage, and Arc attack bonus. All other modification effects must be applied manually.
3. **Special Ammo**: Ammo is partially automated. Some ammo applies automatic statuses or direct numeric changes, but complex rule handling still requires table resolution.
4. **Weapon Specialization**: Weapon Proficiency traits apply implemented numeric specialization bonuses by tier when specialization matches the weapon family. Not all specialization rider text is automated.

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
3. Automatic modification mechanics (Battle Assist Combat floor, Expert Crafting damage, Enhanced Alloy attack, Bane Tune bonus damage, Arc attack bonus) are calculated and included in the roll or derived damage output.
4. Equation breakdown and card details are rendered in chat, including modification bonus terms.
5. Follow-up actions such as Roll Damage or Roll Opposed appear on qualifying cards.
6. Collateral cards may appear for weapons with the Spread feature.
7. Chat message context menu includes Apply Damage and Apply Healing when a visible roll card exists and at least one token is controlled.
8. Damage cards apply a zero damage floor (damage cannot go below 0).
9. Actor-level modifiers are aggregated during actor preparation and used as the read-only roll modifiers shown in the dialog.

Example: an attack roll card can show the computed terms including modification bonuses and then expose a follow-up damage action when valid.
Example: a weapon with Battle Assist 2, Expert Crafting +1, and Arc feature shows the Combat floor, damage bonus, and Arc attack bonus in the card details when applicable.

## What You Must Set Manually

1. Situation-specific modifiers and target assumptions.
2. Accurate target Armor Defense (AD) and shield values.
3. Weapon modification selections and special ammo type (open the weapon item to set these before rolling).
4. Any effects from non-automated modifications, partially automated ammo, or conditional traits.
5. Any GM-required interpretation and outcomes after the roll.
6. Follow-up execution timing (when to click damage/opposed and when to stop for table adjudication).
7. Token selection before using chat-card Apply Damage or Apply Healing.
8. Collateral card damage application (for Spread attacks, manually apply each collateral card to targets).

## Limitations and Not Implemented

1. Chat cards do not auto-apply every result to actor state (example: follow-up effects may still need manual application after chat output).
2. Incorrect source item values carry directly into defaults (example: wrong weapon ATT means wrong prefilled attack bonus).
3. Opposed rolls and certain post-roll actions still require manual follow-up in chat (they are separate clicks, not an auto-chain).
4. **Not all modification, ammo, and feature effects are automated**. The following have automatic mechanical application:
   - Battle Assist (Combat attribute floor)
   - Expert Crafting (damage bonus)
   - Enhanced Alloy (attack bonus)
   - Bane Tune (+3 damage vs qualifying target type)
   - Arc feature (attack bonus vs synthetics/targets with implants)
   - Spread feature (generates collateral cards)
   - Double Shot (+2 damage bonus on spread collateral cards)
   - Slug Shot (damage calculation)
   - Cryo ammo (`Frozen` status)
   - Cinder ammo (`Burning` status, immediate `1d10`, automated turn-start burning)
   - Flash ammo (`Blind` status and automated turn-start recovery check)
   - Homing ammo (lethal `6` and `Target` marker)
   - Power Wounding ammo (lethal `8` and extra `2d10` on the derived damage roll)
   - Anchor ammo (`Restrain` marker)
   - Poison ammo (`Poison` marker)
   Other modification, feature, and ammo behavior still requires manual resolution at your table.

   Note: The same status conditions are also used to track special ammo effects in combat. For example, Cryo ammo applies `Frozen` and Cinder ammo applies `Burning`. Manually setting, clearing, or otherwise changing those statuses during combat can alter the expected ammo effect flow and should only be done when your table is intentionally overriding the ammo effect.
5. **Weapon specialization coverage is intentionally scoped**. Implemented specialization math is applied automatically, but broader specialization narrative/rider handling still needs table adjudication.
6. Item modifiers are evaluated during actor preparation and must be deterministic: authors should use the `formula` field. Per-roll evaluation of item formulas or "roll-context" modifier behavior is not supported.
7. Demolition and attack follow-up output can depend on correct target/token setup; missing context may block or degrade expected automation.
8. Apply Damage and Apply Healing use currently controlled tokens, so applying to the wrong token is possible if selection is wrong.

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

### Q: Why is my attack bonus lower than expected?

A: Check the weapon item for modifications. Only implemented attack-side mechanics such as Enhanced Alloy and Arc apply direct attack bonuses. Battle Assist changes the Combat floor rather than adding a flat attack bonus, and Bane Tune affects damage rather than attack. Also verify you selected the correct weapon before rolling.

### Q: I see extra damage cards in chat for my attack. What are these?

A: These are collateral cards from the Spread feature. Apply each one to the corresponding target using right-click Apply Damage, just like the main damage card.

### Q: My weapon modification or ammo effect is not affecting the roll. Why?

A: Check which mechanics are automated. See the [Weapons, Armor, Shields, and Gear guide](weapons-armor-shields-and-gear.md#modifications-with-automatic-mechanics) and its [Special Ammo section](weapons-armor-shields-and-gear.md#special-ammo). Some ammo now adds automatic markers or direct numeric changes, but more complex effects still need manual table resolution.

## Related Pages

1. [Making an Attack Roll](making-an-attack-roll.md)
2. [Virtual Grid Units and Combat Zones](virtual-grid-units-and-combat-zones.md)
3. [Combat Workflow](combat-workflow.md)
4. [Weapon Specializations](weapon-specializations.md)
5. [Troubleshooting and Known Limitations](troubleshooting-and-known-limitations.md)
