# Stylesheet Guide — Adding New Elements

This document explains how `css/synthicide.css` is structured and what to do when you add new UI elements to actor or item sheets.

---

## File Structure Overview

The CSS file is split into two logical halves:

| Lines (approx) | Contents |
|---|---|
| 1 – 1,170 | **Classic / base styles** — applies to both modes. Never style-mode-specific. |
| 1,171 – end | **Rulebook Bold block** — all rules prefixed with `body.synthicide-style-bold`. |

### Classic block sections (in order)

- Global resets, fonts, layout primitives
- Shared utility classes: `.item-label`, `.effect-label`, `.ability-row`, `.trait-card-*`
- Progress bars, ability list, bioclass trait cards
- Sheet header, tabs, resources
- Items list / effects list (`.items-list`, `.effects-list`)
- Attributes panel (`.attributes-table`, `.attribute-label`, `img.actions-img`)
- Resolve / Cynicism counters
- Item sheet base styles

### Bold block sections (in order)

```
COLOR TOKENS
SHEET HEADER
TABS
TAB CONTENT AREA
SECTION HEADER BARS  ← .items-header, .effects-header, .attributes-header
  └─ LARGE BARS (bioclass / aspect / cybernetics)
ITEMS LIST & EFFECTS LIST
  └─ rows, alternating stripes, hover, item-name, item-controls
ATTRIBUTES TABLE
RESOURCE FIELDSETS
MODIFIERS TABLE
h3 / h4 SECTION HEADINGS
TRAIT DESCRIPTION
CYBERNETICS FIELDSET
GEAR TAB: formula display
BIOGRAPHY TAB
ITEM SHEET – HEADER
ITEM SHEET – GENERAL TAB
ITEM SHEET – RESOURCE CELLS
ITEM SHEET – ABILITY LIST
ITEM SHEET – MODIFIERS TABLE
ITEM SHEET – DEEPER STYLING  ← add-buttons, fieldsets, effects, misc
```

---

## CSS Token Variables

Defined only inside `body.synthicide-style-bold .synthicide { … }` and its dark-mode override. Use these everywhere in the bold block — never hardcode colours.

| Token | Purpose |
|---|---|
| `--rb-accent` | Bright maroon-red — `border-left` accents, hover highlights |
| `--rb-strong` | Deep maroon — all header/bar backgrounds, border colour source |
| `--rb-alt` | Burnt-orange — labels, secondary text |
| `--rb-on-accent` | White — text on dark maroon backgrounds |
| `--rb-line` | Semi-transparent dark — fine dividers |
| `--rb-cell` | Panel-bg mix — data cell backgrounds |
| `--rb-cell-alt` | Slightly stronger mix — alternating row tint |

**Border colour recipe** — always use a mix, never a raw colour:
```css
border: 1px solid color-mix(in srgb, var(--rb-strong) 35%, transparent);
```
Use `35%` for light borders (table cells, rows), `45–50%` for heavier container borders.

---

## Pattern Catalogue

Use these patterns as building blocks. Each maps to an existing section in the bold block.

### 1. Section header bar (full-width label strip)

Use for top-level group dividers within a tab (e.g. "ABILITIES", "TRAITS", "LEVEL 0 TRAITS").

```css
/* Bold override — place in SECTION HEADER BARS section */
body.synthicide-style-bold .synthicide .tab.mytab .items-list > .items-header {
  min-height: 42px;
  padding: 0 14px;
  border-left-width: 6px; /* accent stripe */
}
body.synthicide-style-bold .synthicide .tab.mytab .items-list > .items-header .item-name {
  font-size: 1.15rem;
  letter-spacing: 0.05em;
}
body.synthicide-style-bold .synthicide .tab.mytab .items-list > .items-header .item-controls a {
  font-size: 0.9rem;
  color: var(--rb-on-accent);
}
```

For a smaller column-header bar (e.g. gear "NAME / ROLL FORMULA"), use the default `.items-header` styles — no override needed; the shared `0.72rem / uppercase` rule applies automatically.

### 2. List row (items or effects)

Any `<li class='item flexrow'>` inside an `.items-list` automatically gets:
- `border-bottom`, `min-height: 32px`, `padding: 3px 6px`
- Alternating row stripe
- Hover highlight

**Item image** — use this structure:
```html
<div class='item-image'>
  <a class='rollable' data-roll-type='item' data-action='roll'>
    <img src='{{item.img}}' data-tooltip='{{item.name}}' />
    <!-- NO width/height attributes — CSS controls sizing -->
  </a>
</div>
<div class='item-label'>{{item.name}}</div>
```

The CSS handles `22×22px` in classic and scales correctly in bold mode. Never add `width=` / `height=` to these images.

### 3. Resource cell (label + input pair)

```html
<div class='resource'>
  <label class='resource-label'>My Label</label>
  <input type='number' name='system.myField' value='{{system.myField}}' />
</div>
```

In bold mode this automatically gets a bordered card look, label styling, and dark-mode treatment.

**Grid of resource cells:**
```html
<div class='grid grid-3col'>
  <div class='resource'>…</div>
  <div class='resource'>…</div>
  <div class='resource'>…</div>
</div>
```

If you need a `::before` section header above a grid, use class `grid-section-first` and add a rule in the **ITEM SHEET – DEEPER STYLING** section:
```css
body.synthicide-style-bold .synthicide .item-form .tab.mytab .my-grid:first-of-type::before {
  content: "My Section Title";
  /* copy the Properties ::before block and adjust */
}
```

### 4. `fieldset.resource` card (bioclass traits pattern)

Wraps a titled card with name + textarea content:
```html
<fieldset class='resource'>
  <div class='trait-card-header'>
    <div class='trait-card-name'>
      <label class='resource-label'>Name</label>
      <input type='text' … />
    </div>
    <div class='trait-card-actions'>
      <button type='button' data-action='removeItem' data-index='{{i}}'>
        <i class='fas fa-trash'></i>
      </button>
    </div>
  </div>
  <label class='resource-label'>Description</label>
  <textarea …></textarea>
</fieldset>
```

Automatically gets border, border-left accent, and spacing in bold mode.


### 5. Add-item button row

Use `ability-add` or `trait-add-row` class on the wrapper — NOT `.resource` (which gets card borders):
```html
<div class='trait-add-row'>
  <button type='button' data-action='addMyThing'>
    <i class='fas fa-plus'></i>
    Add Thing
  </button>
</div>
```

In bold mode this gets the styled accent-bordered button automatically.

### 6. `h3` / `h4` section headings (inside content area)

Plain `<h3>` or `<h4>` elements inside `.synthicide` automatically get:
- Bold block: deep-maroon tinted background, accent `border-left`, `1rem / uppercase`

For the Aspect tab specifically, `h4` is overridden to a full-width dark header bar. If you add a new tab that should use the same treatment, add a selector to the `.tab.aspect h4` rule.

### 7. Cybernetics fieldset

```html
<fieldset class='cybernetics'>
  <legend>My Cybernetic Category</legend>
  <!-- content -->
</fieldset>
```

Gets accent border-left and styled legend in bold mode automatically.

### 8. Description block (rich-text prose)

```html
<div class='description-header'>My Section</div>
<div class='trait-description-editor'>
  <prose-mirror name='system.description' …>
    {{{enrichedDescription}}}
  </prose-mirror>
</div>
```

`.description-header` gets the full maroon header-bar treatment anywhere inside `.synthicide`.

---

## Step-by-Step: Adding a New Tab to an Actor or Item Sheet

### 1. Template

Create `templates/actor/mytab.hbs` (or `templates/item/parts/mytab.hbs`):

```html
<section class='tab mytab scrollable {{tab.cssClass}}' data-group='primary' data-tab='mytab'>
  <!-- content using patterns above -->
</section>
```

Register the partial in the sheet JS (`_prepareContext` / `_preparePartials`).

### 2. Classic CSS

Add any base layout rules (flex, grid, sizing) to the **classic block** of `css/synthicide.css` — usually near the end of the first half, before line ~1,170.

Label text nodes: always use `<div class='item-label'>` or `<span class='item-label'>` — hooks the overflow/ellipsis rule.
Images: place inside `.item-image` wrapper, no `width/height` attributes.

### 3. Bold CSS

Add bold-mode overrides at the **end of the appropriate section** in the bold block. The sections are listed in the catalogue above.

**Checklist for a new tab:**

- [ ] Header bars — does the tab have section dividers? Choose small (column-header style, no override needed) or large (`1.15rem` override).
- [ ] Content rows — if using `.items-list`, rows are already styled. Add tab-specific row overrides only if the tab needs different sizing.
- [ ] Resource cells — inside `.item-form`, cells get card borders automatically.
- [ ] Fieldsets — get accent border-left automatically.
- [ ] Add-buttons — wrap in `.trait-add-row` or `.ability-add` instead of `.resource`.
- [ ] h3/h4 headings — automatic. Override only if this tab needs a non-standard heading size.
- [ ] Dark mode — check if any new colours need a `body.theme-dark.synthicide-style-bold` override. Items that use `--rb-*` tokens automatically handle dark mode.

### 4. Avoid these mistakes

| Mistake | Correct approach |
|---|---|
| `<img width='24' height='24'>` on list images | Remove attributes; CSS controls size via `.item-image` |
| `style='display:flex;…'` inline | Add or reuse a CSS class |
| Using `.resource` as an add-button wrapper | Use `.trait-add-row` or `.ability-add` |
| Hard-coding `#7f180f` in bold-block rules | Use `var(--rb-strong)` |
| Adding a new "section header bar" with no class | Give it `.items-header` inside `.items-list`, or `.description-header` for prose sections |
| Forgetting `data-tooltip` on icon-only buttons | Always add for accessibility |

---

## Quick Reference — Class → Visual Role

| Class | Visual role |
|---|---|
| `.items-header` | Column header row (dark bar, small caps) |
| `.items-header` (large override) | Full section divider bar (tall, 1.15rem) |
| `.description-header` | Prose section title bar |
| `.item-label` | Item/effect name text (overflow-safe) |
| `.item-image` | Icon container in list rows |
| `.resource` | Label + input card |
| `.resource-label` | Small-caps label above an input |
| `fieldset.resource` | Bordered card (bioclass trait card) |
| `fieldset.cybernetics` | Cybernetics category block |
| `.trait-add-row` / `.ability-add` | Styled add-item button wrapper |
| `.trait-card-header/.name/.actions` | Bioclass trait card layout helpers |
| `.ability-row` | Single ability entry (flex row) |
| `h3`, `h4` | Tinted section headings inside content |
| `.trait-description` | Prose description block with accent border |
