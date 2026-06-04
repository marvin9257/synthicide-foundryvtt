# Aspects

## Purpose

Assign and manage your aspect and its generated traits.

## Steps

1. Drag an aspect item onto your actor sheet.
2. Open the Aspect tab and verify it's assigned.
3. Review listed aspect abilities.
4. Open each generated trait and finalize required choices.
5. Save each edited trait.
6. To replace an aspect, drag a new one onto the actor (old one is removed).
7. Recheck traits and affected values after replacement.

## Interactive Elements on Aspect Items

When you open an aspect item:

### Main Tab (Settings)

| Element | Icon | Action |
|---------|------|--------|
| Aspect name | Text input | Reference; shows the aspect name |
| Abilities list | Text entries or checkboxes | Reference or click to enable/disable listed abilities |
| Description field | Text box | Click to add/edit aspect description |

### Traits Tab (Generated Traits & Options)

| Element | Icon | Action |
|---------|------|--------|
| Generated trait name | Text/link | Click to open the generated trait for editing |
| Trait choice field | Dropdown or text input | Click to make required choices |
| Trait description | Text box | Click to add/edit the trait text |
| Delete trait button | Trash icon | Click to remove a generated trait |

### What to Check

1. **Abilities:** Review what abilities your aspect provides.
2. **Generated traits:** Open each trait and finalize any required choices (choices don't apply until saved). **Important:** Choice-based traits may have multiple Active Effects. These Active Effects are stored on the Aspect's AE tab and not the Trait's AE tab.  This is due to a limitation of Foundry VTT not being able to embed items within items.  So all changes to attributes from the Aspect's traits need to be edited there.  Sometimes for prebuilt Aspects from the compendium, there will be one-enabled and others-disabled; other times multiple effects should remain enabled together. After making your choice, enable every matching effect and disable non-matching effects. Text-only traits still require manual implementation at your table.
3. **Trait descriptions:** Verify the trait text matches your character concept.

## What Happens Automatically

1. Your actor can only have one aspect at a time.
2. Assigning a new aspect replaces the previous one.
3. Aspect traits are generated automatically and linked to the aspect.

## What You Must Set Manually

1. Finalize choices in generated aspect traits by opening and saving them.
2. **For choice-based traits:** Enable the Active Effect(s) matching your choice and disable any others (on the Active Effect tab for the Aspect, not the trait). If a trait says "pick one," there are likely multiple effects—one enabled, one or more disabled. If a trait allows stacked selections, multiple effects may need to remain enabled.
3. Traits without Active Effects — determine which ones need one-time setup on the sheet and which require manual intervention during play; add custom Active Effects if desired.
4. Any table-specific tracking or narrative details.

Example: If a trait offers two options and you can see both effects in the Aspect's Effects tab (one enabled, one disabled), disable the one you didn't choose and enable the one you did, then save.

Stacked example: If an aspect trait allows selecting multiple benefits, keep all Active Effects for the selected benefits enabled together and disable only the unselected benefit effects.

## Limitations and Not Implemented

1. Only one aspect per actor.
2. Choice-based trait effects don't finalize at creation.
3. Aspect text dependent on scene context is manual at resolution.
4. Aspect references to rules subsystems without dedicated automation need manual adjudication.

## Troubleshooting

### Q: An aspect effect is missing.

A: look on the Effects tab for the Aspect, make required choices, and save.

### Q: I replaced an aspect but old details still show.

A: Reopen the actor sheet and verify the active aspect.

### Q: Still looks wrong.

A: Remove and re-apply the aspect.

## Related Pages

1. [Bioclasses](bioclasses.md)
2. [Traits](traits.md)
