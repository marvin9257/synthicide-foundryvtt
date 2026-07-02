# Vehicle Sheet Tour

## Purpose

Understand the vehicle sheet layout so you can run vehicles quickly during play.

## Before You Start

Open a vehicle actor sheet. Confirm whether **Is Ship** is enabled, because ship and planetary vehicles show different tabs.

## GM and Player Perspective

**GM:** This sheet is your main control surface for vehicle stats, cargo, ship-weapon damage rolls, and conditions.
**Players:** You will usually view this for reference, but edit access depends on your permissions.

## Interactive Elements

### Header

| Element | Icon | Action |
|---------|------|--------|
| Vehicle portrait | Image | Click to choose a new portrait |
| Vehicle name | Text input | Click to rename the vehicle |
| Price | Numeric input | Click to set vehicle price |
| Is Ship toggle | Checkbox | Enable for ship behavior and tabs; disable for planetary behavior |
| HP current/max | Numeric inputs | Click to set exact current and max HP |
| Velocity | Numeric input | Click to set speed value |
| Damage Threshold | Numeric input | Click to set threshold value |

### Capacity Tab

| Element | Icon | Action |
|---------|------|--------|
| Fuel Units current/max (ship) | Numeric inputs + bar | Click to set fuel value/max for ships |
| Fuel cost (ship) | Numeric input | Click to set fuel unit cost |
| Character capacity | Numeric input | Click to set passenger capacity |
| Living quarters (ship) | Checkbox | Toggle whether the ship has living quarters |
| Crates current/max | Numeric pair | Max is editable; current value is tracked by system state |
| Customizations | Multi-select list | Choose installed customization options |

### Flavor Tab (Ship Only)

| Element | Icon | Action |
|---------|------|--------|
| Origin | Dropdown | Select origin flavor |
| Appearance | Dropdown | Select appearance flavor |
| Flaw | Dropdown | Select flaw flavor |
| Mystery | Dropdown | Select mystery flavor |
| Upgrade | Dropdown | Select upgrade flavor |

### Cargo Tab

| Element | Icon | Action |
|---------|------|--------|
| Add cargo | Plus button | Create a new cargo item on this vehicle |
| Cargo name | Text/link | Click to open cargo item sheet |
| Cargo image | Item image | Reference item visually |
| Quantity and unit price | Readable values | Review current cargo quantity and price |
| Edit cargo | Pencil icon | Open cargo item for editing |
| Delete cargo | Trash icon | Remove cargo item from vehicle |

### Ship Weapons Tab

| Element | Icon | Action |
|---------|------|--------|
| Add ship weapon | Plus button | Create a new ship weapon item |
| Ship weapon image | Image button | Click to roll ship-weapon damage |
| Roll ship weapon | Crosshairs icon | Click to roll ship-weapon damage |
| Range column | Text value | Reference-only weapon range band |
| Missile column | Rocket/check icon | Reference whether weapon is marked as missile |
| Damage multiplier | Text value | Reference item multiplier |
| Edit ship weapon | Pencil icon | Open ship weapon item sheet |
| Delete ship weapon | Trash icon | Remove ship weapon item |

### Locker Tab (Ship Only)

| Element | Icon | Action |
|---------|------|--------|
| Add locker item | Plus button | Create a new gear item |
| Item name | Text/link | Click to open item sheet |
| Item type icon | Type icon | Reference item type |
| Quantity/price columns | Text values | Reference item quantity and value |
| Edit item | Pencil icon | Open item for editing |
| Delete item | Trash icon | Remove item from locker |

### Description Tab

| Element | Icon | Action |
|---------|------|--------|
| Description editor | Rich text field | Enter notes, links, and formatted vehicle text |

### Effects Tab

| Element | Icon | Action |
|---------|------|--------|
| Effect toggle | Check or X icon | Enable/disable an active effect |
| Effect name | Text/link | Open effect details |
| Add effect | Plus button | Create a new active effect |
| Delete effect | Trash icon | Remove an effect |

## Steps

1. Set the basics in the header: name, price, HP, velocity, and damage threshold.
2. Set **Is Ship** correctly first; this controls ship-only tabs such as Flavor and Locker.
3. In Capacity, configure passenger/cargo values and ship fuel settings when applicable.
4. Select customizations and, for ships, choose Flavor fields (origin, appearance, flaw, mystery, upgrade) as needed.
5. Add cargo and any ship weapons you need on the vehicle.
6. Use Ship Weapons controls when resolving vehicle weapon damage.
7. Track conditions in Effects and table notes in Description.

## What Happens Automatically

1. The sheet switches available tabs based on **Is Ship** state.
2. Ship weapon controls create a ship-weapon damage roll card when triggered.
3. Effects can be toggled active/inactive from the Effects tab.

## What You Must Set Manually

1. Vehicle baseline numbers (HP, velocity, damage threshold, capacities, and fuel values).
2. Customization and flavor choices based on your table's setup.
3. Whether range is valid at the table when using ship weapons.
4. Any narrative or situational outcomes tied to description/flavor text.

## Limitations and Not Implemented

1. **Ship weapons currently roll damage only.** There is no ship-weapon attack roll and no automatic range calculation/check.
2. Flavor selections are primarily tracking/narrative fields.
3. Some flavor categories may allow multiple picks in RAW, but this sheet is currently restricted to one selection per flavor category.
4. Flavor **Upgrade** selections do not automatically adjust vehicle characteristics.
5. Customization/flavor text and labels do not auto-resolve all situational rules.
6. Final outcomes based on fiction and positioning still require player/GM judgment.

## Troubleshooting

### Q: I cannot see the Flavor tab.

A: Enable **Is Ship** in the header. Flavor is ship-only.

### Q: I clicked a ship weapon and expected an attack roll.

A: Ship weapon controls roll damage only. Resolve hit chance and range validity manually.

### Q: I selected an Upgrade flavor but stats did not change.

A: Upgrade flavor is a tracking choice and does not auto-apply characteristic changes.

### Q: The rules allow multiple flavor picks, but I can only choose one.

A: Current vehicle flavor fields are single-select per category. If your table uses multiple picks in one category, track additional choices manually in Description/notes.

### Q: My vehicle values seem wrong.

A: Verify source fields on the vehicle and embedded items (cargo/ship weapons/effects).

## Related Pages

1. [NPC Sheet Tour](npc-sheet-tour.md)
2. [Combat Workflow](combat-workflow.md)
3. [Resources and Derived Values](resources-and-derived-values.md)
4. [Weapons, Armor, Shields, and Gear](weapons-armor-shields-and-gear.md)
5. [Troubleshooting and Known Limitations](troubleshooting-and-known-limitations.md)
