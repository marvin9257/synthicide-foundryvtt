# Demolition and Range-Based Actions

## Purpose

Explain how demolition, thrown, and other range-sensitive actions are handled by the system and what the player must do versus what the system calculates.

## Quick Checklist

1. Select and confirm your acting token on the scene.
2. In the Combat tab or weapon list, click the weapon's **target** icon to initiate the action (this opens targeting and the roll dialog).
3. Open the weapon/item sheet and verify the **range increment** is set.
3. Use the ruler or place the targeting template to select the target location.
4. Confirm the attribute/skill and any situational modifiers in the roll dialog.
5. Submit the roll and follow the chat readout for distance, range bands, and outcome.

## How Range Is Calculated

- Measured distance uses Foundry's scene units (grid-based or freeform ruler measurements, depending on the scene/grid settings).
- The system computes "range bands" as: ceil(measured distance / weapon range increment). Example: range increment 4, measured distance 9 → ceil(9 / 4) = 3 bands.
- The chat message shows the measured distance and the calculated range bands so you can apply system-specific modifiers (for example, +1 difficulty per extra band if your table uses that rule).

## What the System Automatically Handles

- Measures distance between attacker and target location using the selected token and the ruler/template.
- Computes range bands from the weapon's range increment.
- Displays distance, range bands, and the roll result in chat.
- Applies any demolitions/weapon specialization bonuses that have been implemented and recognized by the system (where supported by the item/trait data).
- Shows a targeting or blast preview template when the item provides one and the scene supports templates.
 - For thrown items, automates scatter (random scatter rules implemented in the system) and resolves attack/attack-like rolls for each token in the target area, producing a summary of hits and misses in chat.
 - Note: damage calculation and application are not always automatic — users must click the item's "Calculate Damage"/apply damage controls to compute and assign damage to affected tokens unless additional automation modules are present.

## What Players or GMs Must Do Manually

- Place and select the correct token before initiating the action.
- Click the weapon's target icon in the Combat tab or weapon list to begin targeting and rolling.
- Apply damage and secondary effects to multiple targets affected by an area (AoE) — the system may not auto-finalize multi-target blast damage.
- Account for elevation, terrain cover, or special narrative rulings; these are not always modeled automatically.

## Common Limitations

- Items with a missing or zero `range increment` cannot compute range bands — ensure each demolition-capable item has a valid range increment value.
- The system does not always auto-apply area damage to every affected Actor; GMs may need to confirm and apply damage to tokens inside a blast.
- Scatter placement, complex line-of-sight occlusion, and some conditional rule riders may require manual resolution.

## Troubleshooting

### Missing attacker token warning

Place and select your token on the scene before starting the action.

### Range increment not set or zero

Open the item sheet for the weapon and set a positive numeric range increment. The action needs this value to compute range bands.

### Chat doesn't show distance or bands

- Confirm the scene grid/ruler is enabled and that you used the ruler or template to pick the target.
- If distance still isn't shown, check for module conflicts or custom item data formats that the system doesn't recognize.

### My Demolitions specialization exists but nothing changed

Verify the trait is authored as a Weapon Proficiency specialization the system recognizes (see the weapon specialization documentation). If the trait is present but automation doesn't apply, the bonus may need GM approval or additional module support.

### Item tag issues (blast / planted)

- Both thrown and planted demolition items must include a blast feature (for example `blast3` or `blast5`). If an item lacks a blast feature the system cannot build a placement/template and will warn about a missing demolition blast (see the "Demolition blast missing" warning).
- Planted devices additionally require a plant feature (for example `plant8` or `plant12`) to be treated as a planted demolition. Without a plant feature the system will treat the item as a thrown demolition and planted-specific logic (plant number, `operation` attribute defaulting, success/failure plant resolution) will not run.
- Fix: open the item sheet and ensure the correct features/tags are enabled on the item (blast and, for planted devices, plant).

## Related Pages

- [Rolls Overview](docs/player-guide/rolls-overview.md)
- [Virtual Grid Units and Combat Zones](docs/player-guide/virtual-grid-units-and-combat-zones.md)
- [Weapon Specializations](docs/player-guide/weapon-specializations.md)
- [Combat Workflow](docs/player-guide/combat-workflow.md)

## Thrown vs Placed Demolitions

The system treats "thrown" (tossed grenades, thrown charges) and "placed" (planted charges, remote explosives) actions differently in practice. Below is a quick breakdown of what the system typically automates for each, and what requires player/GM resolution.

Thrown (tossed charges)
- Automated:
	- Initiating targeting via the weapon's target icon and showing any thrown-template preview the item provides.
	- Measuring distance between the thrower and the target location using the ruler or token placement.
	- Computing range bands from the weapon's range increment and displaying distance/bands in chat.
	- Automating scatter using the system's random scatter rules (as implemented in `action-rolls.mjs`) when a throw misses.
	- Selecting tokens inside the target area and resolving attack/attack-like rolls for each token automatically, with a chat summary of hits and misses.
- Manual / Requires GM or player action:
	- Calculating and applying damage — the UI requires the user (or GM) to click the item's "Calculate Damage" and then apply damage to the affected tokens unless a module automates damage application.
	- Resolving environmental or table-specific modifiers not modeled by the system (elevation, special cover rules, narrative rulings).

Placed (planted/remote charges)
- Automated:
	- Handling the placement attempt and reporting whether the device is successfully planted/armed (success/failure), based on item data and checks.
	- Previewing placement templates when the item provides one.
- Manual / Requires GM or player action:
	- Verifying the placement against table rules (access, line-of-sight, structural restrictions) and confirming arming procedures.
	- Managing fuse/timer behavior and executing the detonation; the system typically does not run ongoing timers or automatic delayed detonations without additional modules.
	- Calculating and applying AoE damage to affected tokens (manual apply) unless an automation module is present.

Notes
- Exact automation depends on item data (template shape/size, `range increment`, and any automation flags) and on whether additional automation modules are installed. If behavior is inconsistent, check the item sheet and module compatibility first.

## Calculate Damage

- Trigger: click the **Calculate Damage** button on a qualifying attack or demolition chat card (the button uses `data-action="rollDamage"`).
- Permissions: the follow-up is permitted only to a GM, the original roller, or a user who owns the actor on the source card.
- What it does: it reads the stored roll data (the original d10 and roll metadata), rolls any extra damage dice from special ammo at click time, and builds a derived damage card. The net damage computed is the stored d10 + the resolved attribute (demolition uses `combat`; attacks use the original attack attribute when present) + damage bonuses + any extra dice.
- Thrown demolitions: the system auto-resolves per-target attack rolls and posts an attack card for each token in the blast area; click **Calculate Damage** on each target's attack card to derive that target's damage. The demolition placement card also exposes Calculate Damage, but per-target attack cards are the canonical place to derive per-token damage.
- After calculation: a damage card is posted to chat. To apply the damage to tokens, select the target token(s) and use the chat message context menu (right-click the damage card → **Apply Damage**) or the card's controls if present. Damage application is not always automatic; ensure correct token selection before applying.
- Note: damage has a zero floor (cannot go below 0) and extra-dice (ammo) are rolled when you click Calculate Damage.
