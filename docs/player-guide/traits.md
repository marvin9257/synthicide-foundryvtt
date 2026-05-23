# Traits

## Purpose

Manage milestone traits and generated traits without surprises.

## Steps

1. **Milestone traits:** Add them in the Traits tab at levels 1, 4, or 7.
2. **Bioclass/Aspect traits:** Generated automatically when those items are assigned. Open each and finalize required choices, then save.
3. **Weapon proficiency traits:** Set trait type to Weapon Proficiency, pick a Weapon Specialization, and set level to 1, 4, or 7.
4. **Edit later:** Use the edit icon if you need to revise.

## Interactive Elements on Trait Items

When you open a trait to view or edit it:

| Element | Icon | Action |
|---------|------|--------|
| Trait name | Text input | Click to edit the trait name |
| Trait level | Numeric input | Click to set the trait level |
| Trait type dropdown | Dropdown | Reference; shows if trait is a milestone or generated trait |
| Weapon Specialization dropdown | Dropdown | Click to pick specialization when trait type is Weapon Proficiency |
| Choice field (if applicable) | Dropdown or checkboxes | Click to make a required "choose one" selection |
| Description/effect field | Text box | Click to add or edit the trait's mechanical/narrative effect |
| Notes field | Text box | Click to add table-specific notes or conditions |
| Save button | Button/action | Click to save all changes to the trait |

### Finalize Generated Traits

When you open a generated trait (from bioclass or aspect):

1. **Review the description** to understand what the trait does.
2. **Look for "choose one" prompts** or dropdowns—these require selection.
3. **Make your choice** (click the dropdown or checkbox).
4. **Click Save** to confirm the choice (without saving, the choice doesn't apply).
5. **Close the trait** and return to the actor sheet.

### Active Effects on Traits

**Important:** Traits handle Active Effects (AE) differently depending on how they're designed.

**Traits with a single AE (no choices):**
- These traits automatically apply their mechanical effects (bonuses, penalties, status effects) when the trait is added to your sheet.
- Example: A trait that grants +2 to a specific attribute includes an AE that modifies that attribute.
- No manual setup needed—the effect is automatic.

**Choice-based traits with multiple AE (requires configuration):**
- Some traits include multiple Active Effects, with all but one disabled by default.
- Other traits use a mix-and-match choice where multiple effects may need to stay enabled together.
- Example: A trait with "Choose: Option A or Option B" may ship with one effect enabled and one disabled.
- Example: A trait with "Choose two benefits" may require two (or more) effects enabled at the same time.
- Stacked example: if you choose "+1 Combat" and "+1 Speed" from a multi-pick trait, both matching effects should stay enabled.
- **You must manually enable/disable effects to match your final choice:**
  1. Open the trait item.
  2. Scroll to the **Effects** tab.
  3. Find the effect(s) that match your choice and toggle **disabled** OFF (enable them).
  4. Leave all matching effects enabled when the trait choice allows stacking.
  5. Disable any effects that don't match your choice by toggling **disabled** ON.
  6. Save the trait.
- This is critical—if you don't configure the effects, your choice won't take mechanical effect.

**Traits without AE (manual setup required):**
- These traits are text-only descriptions of abilities or mechanics that your table must apply manually.
- You need to decide if/how to represent the effect as an Active Effect.
- Some no-AE traits need one-time setup on the sheet before play.
- Others require manual intervention during play (player/GM applies the effect when triggered).
- You may need to add a custom AE to track the trait's benefit during play.

**How to add a custom Active Effect to a trait:**
1. Open the trait item.
2. Scroll to the **Effects** tab.
3. Click **Add Effect** to create a new Active Effect.
4. Configure the effect (bonus type, value, affected attribute, etc.).
5. Save the trait.

**If you're unsure whether a trait needs AE setup:**
- Check during character creation if the trait's benefits are already reflected in your attributes/stats.
- For choice-based traits, verify all chosen option effects are enabled (not just one).
- If not, ask your GM whether the trait should grant bonuses automatically or require manual tracking.

## What Happens Automatically

1. Standard traits are grouped by milestone level.
2. Bioclass and aspect traits are created automatically when assigned.
3. Weapon proficiency traits feed weapon-specialization bonuses into supported roll flows.
4. Trait lists update when features are replaced.

## What You Must Set Manually

1. Trait text and table-specific details.
2. Required choices in generated traits (open and save to finalize).
3. Weapon specialization selection and proficiency level on Weapon Proficiency traits.
4. Manual follow-up trait effects require.

## Limitations and Not Implemented

1. Standard trait levels limited to milestones (1, 4, 7) only.
2. Choice-driven effects don't finalize until you edit and save.
3. Weapon specialization automation is limited to currently implemented numeric effects.
4. Situational trait bonuses still need player/GM judgment.

## Troubleshooting

### Q: A trait effect is missing.

A: Open the trait, make required choices, and save.

### Q: Trait list looks stale after feature changes.

A: Reopen the actor sheet.

### Q: Why can't I add a trait at the level I want?

A: Standard traits only support milestone levels 1, 4, and 7.

### Q: I made a Weapon Proficiency trait, but my roll bonus did not change.

A: Verify trait type is Weapon Proficiency, confirm specialization matches the weapon family, and ensure the trait level is 1, 4, or 7.

## Related Pages

1. [Bioclasses](bioclasses.md)
2. [Aspects](aspects.md)
3. [Weapon Specializations](weapon-specializations.md)
4. [Troubleshooting and Known Limitations](troubleshooting-and-known-limitations.md)
