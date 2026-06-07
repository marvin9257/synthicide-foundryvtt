**RollContext Refactor**

This note documents the recent refactor that centralizes per-roll modifier logic in a single `RollContext` used across action flows (attack, demolition, challenge, damage).

- **Location**: `module/rolls/roll-context.mjs`
- **Purpose**: Provide a canonical per-roll object that holds `input`, normalized `rollData`, range context, resolved specialization, and helper methods such as `applyRollAdjustments()`, `applyInputAdjustments()`, and `resolveSpecialization()`.

Key points
- `RollContext` owns modifier application. Callers should build a context via `buildRollContext(opts)` and call `ctx.applyRollAdjustments()` once to normalize inputs, apply mode/ammo adjustments, and resolve specialization.
- `applyInputAdjustments()` remains available for lower-level flows that need only mode/ammo adjustment without specialization.
- Specialization: `applyRollAdjustments()` applies specialization by default, so callers do not need to invoke `ctx.resolveSpecialization()` explicitly in standard attack/demolition flows.
- Low-level helpers (modes, ammo, specialization lookup) remain in `module/rolls/modifiers.mjs` as internal helpers. `computeRollModifiers()` is intentionally preserved for dialog UI defaults only.
- Chat payloads: contexts are serializable via `ctx.toJSON()` and use `foundry.utils.deepClone` when embedded in `ChatMessage.system`.

Demolition-specific semantics
- Thrown explosives: the thrower's actor is used to compute ATT/DMG. A single attack roll is generated once and compared to every token in the blast template (consistent with RAW).
- Planted explosives: actor-based bonuses, special ammo effects, and specializations from the character who planted the device are intentionally excluded. The planted attack uses the weapon's base bonuses only (the code builds a `RollContext` with `actor: null`/`sourceItem: null` to enforce this behavior).

Migration guidance
- Prefer `RollContext` for new roll flows instead of ad-hoc merging of modifiers.
- When building UI defaults for dialogs keep using `computeRollModifiers(actor, situational)` to present persistent + situational modifiers to users.
- If you need to exclude actor-derived modifiers (e.g. planted devices), construct the `RollContext` with `actor: null` and provide only the weapon/base bonuses in `input`.

Rationale
- Centralizing modifier application reduces duplication and avoids subtle inconsistencies (special ammo, slug-shot, specialization application) across different roll flows.
