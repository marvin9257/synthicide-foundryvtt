# Aspects

## Purpose

Assign and manage your aspect and its generated traits.

## Steps

1. Drag an aspect item onto your actor sheet.
2. Open the Aspect tab and verify it's assigned.
3. Open the aspect item and review the Attributes tab.
4. Set any aspect attribute bonuses and HP bonus fields.
5. Review listed aspect abilities.
6. Open each generated trait and finalize required choices.
7. Save each edited trait.
8. To replace an aspect, drag a new one onto the actor (old one is removed).
9. Recheck traits and affected values after replacement.

## Interactive Elements on Aspect Items

When you open an aspect item:

### Main Tab (Settings)

| Element | Icon | Action |
|---------|------|--------|
| Aspect name | Text input | Reference; shows the aspect name |
| Abilities list | Text entries | Reference; review ability text |
| Description field | Text box | Click to add/edit aspect description |

### Attributes Tab (Aspect Bonuses)

| Element | Icon | Action |
|---------|------|--------|
| Attribute bonus fields | Number inputs | Set per-attribute bonuses applied to derived values |
| HP Max Bonus | Number input | Add a flat bonus to actor max HP |
| Add Bioclass HP / Level | Checkbox | Add bioclass HP-per-level as a one-time bonus to max HP (Sharper only) |

### Traits Tab (Generated Traits & Options)

| Element | Icon | Action |
|---------|------|--------|
| Generated trait name | Text/link | Click to open the generated trait for editing |
| Trait choice field | Dropdown or text input | Click to make required choices |
| Trait description | Text box | Click to add/edit the trait text |
| Delete trait button | Trash icon | Click to remove a generated trait |

### What to Check

1. **Attributes tab values:** Confirm the expected attribute bonuses and HP bonus fields are set.
2. **Abilities:** Review what ability bonueses or penalties your aspect provides.
3. **Generated traits:** Open each trait and finalize any required choices (choices don't apply until saved).
4. **Trait descriptions:** Verify the trait text matches your character concept.

## What Happens Automatically

1. Your actor can only have one aspect at a time.
2. Assigning a new aspect replaces the previous one.
3. Aspect traits are generated automatically and linked to the aspect.
4. Aspect bonus fields are applied through derived-data calculation (not through aspect Active Effects).

## What You Must Set Manually

1. Finalize choices in generated aspect traits by opening and saving them.
2. Set aspect field values on the Attributes tab when your build requires non-default values.
3. Any table-specific tracking or narrative details for text-only abilities.

Example: If your aspect grants +2 Operation and -1 Awareness, set those directly in the aspect Attributes tab.

## Limitations and Not Implemented

1. Only one aspect per actor.
2. Choice-based trait effects don't finalize at creation.
3. Aspect text dependent on scene context is manual at resolution.
4. Aspect references to rules subsystems without dedicated automation need manual adjudication.
5. The bioclass HP-per-level bonus checkbox affects Sharper HP calculation only (NPCs do not use this path).

## Troubleshooting

### Q: An aspect bonus is missing.

A: Open the aspect item, verify values in the Attributes tab, then re-open the actor sheet.

### Q: I replaced an aspect but old details still show.

A: Reopen the actor sheet and verify the active aspect.

### Q: Still looks wrong.

A: Remove and re-apply the aspect.

## Related Pages

1. [Bioclasses](bioclasses.md)
2. [Traits](traits.md)
