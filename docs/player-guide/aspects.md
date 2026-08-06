# Aspects

## Purpose

Assign and manage your aspect, its generated traits, and its applied attribute bonuses.

## Steps

1. Drag an aspect item onto your actor sheet.
2. Open the Aspect tab and verify it's assigned.
3. Review the Aspect Attribute Bonuses Applied row on the actor Aspect tab.
4. Click the Aspect edit icon to open the aspect item.
5. In the aspect item Attributes tab, set attribute bonuses and HP bonus fields as needed.
6. In the aspect item Traits tab, add or remove trait source rows if needed.
7. Back on the actor Aspect tab, use a trait edit button to adjust an individual generated trait's text.
8. To replace an aspect, drag a new one onto the actor (old one is removed).
9. Recheck the applied bonus row and generated traits after replacement.

## Actor Aspect Tab (On The Actor Sheet)

When viewing the actor Aspect tab:

| Element | Icon | Action |
|---------|------|--------|
| Aspect header | Text | Shows assigned aspect name |
| Info button | Info icon | Shows aspect description |
| Edit aspect button | Pencil icon | Opens the aspect item sheet |
| Delete aspect button | Trash icon | Unassigns the aspect from actor |
| Abilities list | Text entries | Reference only; shows aspect abilities |
| Aspect Attribute Bonuses Applied | Pill list | Shows non-zero bonuses currently applied |
| Generated trait card | Card row | Shows generated trait name and description |
| Trait edit button | Pencil icon | Opens that generated trait for editing |
| Trait delete button | Trash icon | Removes that generated trait item |

Helper text meaning:

1. Use Edit Aspect to add or remove aspect trait source rows.
2. Use a trait edit button to change that single generated trait's text/details.

## Interactive Elements On Aspect Items

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

### Traits Tab (Source Trait Rows)

| Element | Icon | Action |
|---------|------|--------|
| Add trait row button | Plus icon | Add a new source trait row on the aspect item |
| Trait name field | Text input | Set the source trait name |
| Trait description field | Textarea | Set the source trait description |
| Remove row button | Trash icon | Remove a source trait row |

### What to Check

1. Attributes tab values: confirm expected attribute and HP bonus fields are set.
2. Actor bonus row: confirm non-zero bonuses appear under Aspect Attribute Bonuses Applied.
3. Abilities: review what ability bonuses or penalties your aspect provides.
4. Generated traits: verify names/descriptions on actor tab and edit individual traits as needed.

## What Happens Automatically

1. Your actor can only have one aspect at a time.
2. Assigning a new aspect replaces the previous one.
3. Aspect traits are generated automatically and linked to the aspect.
4. Aspect bonus fields are applied through derived-data calculation (not through aspect Active Effects).

## What You Must Set Manually

1. Set aspect field values on the Attributes tab when your build requires non-default values.
2. Add/remove source trait rows in the aspect item if your table's build needs adjustments.
3. Edit individual generated trait text via the trait edit button on the actor Aspect tab.
4. Track any table-specific narrative details for text-only abilities.

Example: If your aspect grants +2 Operation and -1 Awareness, set those directly in the aspect Attributes tab.

## Limitations and Not Implemented

1. Only one aspect per actor.
2. Choice-based trait effects don't finalize at creation.
3. Aspect text dependent on scene context is manual at resolution.
4. Aspect references to rules subsystems without dedicated automation need manual adjudication.
5. The bioclass HP-per-level bonus checkbox affects Sharper HP calculation only (NPCs do not use this path).

## Troubleshooting

### Q: An aspect bonus is missing.

A: Check the Aspect Attribute Bonuses Applied row first. If expected values are missing, open the aspect item and verify the Attributes tab values, then re-open the actor sheet.

### Q: I replaced an aspect but old details still show.

A: Reopen the actor sheet, verify the active aspect in the header, and confirm generated trait cards and bonus pills updated.

### Q: Still looks wrong.

A: Remove and re-apply the aspect.

## Related Pages

1. [Bioclasses](bioclasses.md)
2. [Traits](traits.md)
