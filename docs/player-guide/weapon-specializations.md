# Weapon Specializations

## Purpose

Explain how Weapon Proficiency traits connect to weapon rolls, what bonuses are automatic, and what is still manual.

## Before You Start

1. Open your actor sheet and go to the Traits tab.
2. Confirm you have a trait with type set to Weapon Proficiency.
3. Confirm the trait has a specialization and a valid milestone level (1, 4, or 7).

## Steps

1. Create or open a trait item.
2. Set Trait Type to Weapon Proficiency.
3. Set Weapon Specialization to match your weapon family.
4. Set level to 1, 4, or 7.
5. Save the trait.
6. Make attack or demolition rolls from the matching weapon.
7. Check chat card details to confirm bonuses were included.

## What Happens Automatically

1. Weapon Proficiency traits are read from actor-derived data and applied by specialization key.
2. Bonus tiers are milestone-based:
   1. Level 1-3 uses tier 1.
   2. Level 4-6 uses tier 4.
   3. Level 7+ uses tier 7.
3. Matching specialization bonuses are included in roll math where implemented.
4. Blaster weapons use Shotgun proficiency rules for specialization bonuses.

### Current Automatic Bonus Coverage

1. Axe:
   1. Adds damage and lethal bonuses by tier.
   2. Adds shocking-strike RD bonus by tier (+2 at levels 1/4, +4 at level 7).
2. Sword, Pistol, Shotgun:
   1. Add attack bonus by tier.
3. Hammer, Knife, Martial:
   1. Add attack and damage bonuses by tier.
   2. Include listed lethal bonus where defined.
4. Primitive:
   1. Applies primitive-specific ranged attack and melee attack/damage tier bonuses when the weapon has the Primitive feature.
5. Demolitions:
   1. Applies throw and placement bonuses in demolition workflows.

## What You Must Set Manually

1. Create and maintain the Weapon Proficiency trait itself.
2. Keep specialization choice aligned with the weapon being used.
3. Resolve narrative or conditional specialization text not represented by numeric bonuses.
4. Apply any table rules that go beyond the currently implemented numeric effects.

## Limitations and Not Implemented

1. Only milestone trait levels are supported for specialization progression (1, 4, 7).
2. A specialization only affects rolls when the source weapon family matches.
3. Rifle specialization currently exists as a selection but does not add numeric bonuses yet.
4. Specialization does not auto-apply every possible RAW rider effect; current support is primarily numeric roll integration.
5. Weapon specialization does not replace manual resolution for non-automated weapon features, modifications, or ammo behavior.

### Developer note for integrators

- Specialization numeric bonuses are applied by roll flows only when the flow explicitly invokes `ctx.applyRollAdjustments()` or `ctx.resolveSpecialization()` on a `RollContext` instance. `applyInputAdjustments()` (the input normalization step) does not apply specialization bonuses; do not rely on automatic application from modifier normalization.
- Direct helper calls such as `resolveAndApplySpecialization()` have been removed. Prefer `ctx.applyRollAdjustments()` for standard flows, or `ctx.resolveSpecialization()` for explicitly resolving specialization after other input adjustments.

## Troubleshooting

### Q: My specialization bonus is not showing in attack totals.

A: Check trait type (Weapon Proficiency), specialization key, and level. Then verify the weapon family matches the specialization.

### Q: I am using a blaster. Which specialization applies?

A: Blaster follows Shotgun specialization rules.

### Q: My Primitive proficiency bonus is missing.

A: Primitive bonuses only apply when the weapon has the Primitive feature and uses the appropriate melee or ranged class context.

### Q: Why does my Rifle proficiency not change totals?

A: Rifle specialization is available as a trait selection, but its numeric tier bonuses are not implemented yet.

## Related Pages

1. [Traits](traits.md)
2. [Weapons, Armor, Shields, and Gear](weapons-armor-shields-and-gear.md)
3. [Making an Attack Roll](making-an-attack-roll.md)
4. [Demolition and Range-Based Actions](demolition-and-range-based-actions.md)