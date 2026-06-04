# Bioclasses

## Purpose

Assign and manage your bioclass and its generated traits.

## Steps

1. Drag a bioclass item onto your actor sheet.
2. Open the Bioclass tab and verify the bioclass is assigned.
3. Review generated bioclass traits.
4. Open each generated trait and finalize any required choices.
5. Save each edited trait.
6. To replace a bioclass, drag a new one onto the actor (old one is removed).
7. Recheck actor attributes and HP after replacement.

## Interactive Elements on Bioclass Items

When you open a bioclass item to verify values or finalize trait choices:

### Main Tab (Settings)

| Element | Icon | Action |
|---------|------|--------|
| Bioclass name | Text input | Reference; shows the bioclass name |
| Starting attributes fields | Numeric inputs (Awareness, Combat, etc.) | Click to verify starting attribute values |
| HP | Numeric input | Click to verify base HP value |
| HP per Level | Numeric input | Click to verify HP progression |
| Description field | Text box | Click to add/edit bioclass description |

### Traits Tab (Generated Traits & Options)

| Element | Icon | Action |
|---------|------|--------|
| Ignore Weak Penalty checkbox | Checkbox | Click to enable (NPC only; removes weak role penalties) |
| Generated trait name | Text/link | Click to open the generated trait for editing |
| Trait choice field | Dropdown or text input | Click to make required choices from the trait options |
| Trait description | Text box | Click to add/edit the trait text |
| Delete trait button | Trash icon | Click to remove a generated trait |

### What to Check

1. **Starting attributes:** Verify Awareness, Combat, Toughness, Influence, Operation, Nerve, Speed are all set correctly.
2. **HP values:** Confirm base HP and HP per level match your character concept.
3. **Generated traits:** Open each and make/finalize choices (they don't apply until saved). **Important:** Choice-based traits may have multiple Active Effects. Sometimes this is one-enabled/others-disabled; other times multiple effects should remain enabled together. After making your choice, enable every matching effect and disable non-matching effects. Text-only traits still require manual implementation at your table.
4. **Weak penalty (NPC):** Enable Ignore Weak Penalty checkbox if the NPC should ignore weak role penalties.

## What Happens Automatically

1. Your actor can only have one bioclass at a time.
2. Assigning a new bioclass replaces the previous one.
3. Bioclass traits are generated automatically and linked to the bioclass.

## What You Must Set Manually

1. Verify the bioclass item has complete starting values (attributes, HP, HP per level).
2. Open and save generated traits when they require choices.
3. **For choice-based traits:** Enable the Active Effect(s) matching your choice and disable any others. If a trait says "choose one," there are likely multiple effects—one enabled, one or more disabled. If a trait allows stacked selections, multiple effects may need to remain enabled.  Any preconfigured Active Effects will be on the Effects tab of the Bioclass sheet and not the trait if the bioclass is dragged from compendium.
4. Traits without Active Effects—determine which ones need one-time setup on the sheet and which require manual intervention during play; add custom Active Effects if desired.
5. Any table-specific adjustments to trait text.

Example: A trait with "Choose: Full Human (+1 Influence, +1 Nerve) or Mutant (–2 Nerve)" comes with both effects. By default, Full Human is enabled and Mutant is disabled. If you choose Mutant, open the Effects tab, disable "Full Human," enable "Mutant," and save.

Stacked example: If a bioclass trait lets you choose two upgrades and each upgrade has its own Active Effect, enable both selected upgrade effects and leave non-selected upgrades disabled.

## Limitations and Not Implemented

1. Only one bioclass per actor.
2. Incomplete bioclass items result in incomplete actors.
3. Choice-based trait changes don't finalize at creation time.
4. Bioclass replacement removes old generated traits.
5. Narrative trait effects still need manual handling.
6. Cybernetics package effects aren't auto-translated to item modifiers.

## Troubleshooting

### Q: My attributes look wrong after assigning a bioclass.

A: Open the bioclass item and verify all starting attributes and HP fields are filled.

### Q: A trait-based change is missing.

A: Open the generated trait, make the required choice, and save.

### Q: Traits look stale after replacing bioclass.

A: Close and reopen the actor sheet, then verify the active bioclass is correct.

### Q: Still doesn't update.

A: Remove and re-apply the bioclass once.

## Related Pages

1. [Creating a New Actor](creating-a-new-actor.md)
2. [Aspects](aspects.md)
