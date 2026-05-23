# Synthicide 2e System

![Synthicide Theme](assets/synthicide2eTheme.webp)

![Foundry v14](https://img.shields.io/badge/foundry-v14-green)


<img title="Minimum foundry version" src="https://img.shields.io/badge/dynamic/json?url=https://github.com/marvin9257/synthicide-foundryvtt/releases/latest/download/system.json&label=Minimum%20Foundry%20version&query=compatibility.minimum&style=flat-square&color=important"> 

<img title="Verified foundry version" src="https://img.shields.io/badge/dynamic/json?url=https://github.com/marvin9257/synthicide-foundryvtt/releases/latest/download/system.json&label=Verified%20Foundry%20version&query=compatibility.verified&style=flat-square&color=important"> 

<img title="Synthicide version" src="https://img.shields.io/badge/dynamic/json?url=https://github.com/marvin9257/synthicide-foundryvtt/releases/latest/download/system.json&label=Synthicide%20version&query=version&style=flat-square&color=success">

![GitHub release](https://img.shields.io/github/release-date/marvin9257/synthicide-foundryvtt) 
[![GitHub commits](https://img.shields.io/github/commits-since/marvin9257/synthicide-foundryvtt/latest)](https://github.com/marvin9257/synthicide-foundryvtt/commits/) 

![the latest version zip](https://img.shields.io/github/downloads/marvin9257/synthicide-foundryvtt/latest/synthicide.zip) 

![Forge installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Fsynthicide)

This system is a draft, unofficial version of a Synthicide 2E rpg for Foundry VTT. It is is based on v13 Boilerplate. Permission was given by Will Power Games to create this system with limitations that content is limitted to first level items. 

# Development & Build Instructions

## Prerequisites

- Node.js (v24 or later recommended)

- npm (comes with Node.js)

## Building the System

To build the system for FoundryVTT:

1. Install dependencies (first time only):
	```sh
	npm install
	```
2. Build the system:
	```sh
	npm run build
	```
	This will:
	- Run `prebuild`
	- Run `npm run packs:build-yml`
	- Regenerate `packs-src/player-guide-journal` from `docs/player-guide/*.md`
	- Validate `system.json` pack declarations against `packs-src/*`
	- Compile `packs-src/*` into `packs/*`
	- Bundle JavaScript using Rollup
	- Copy all required files (assets, css, lang, module, templates, system.json, README, LICENSE) into a fresh `dist/` folder

### Build pipeline summary

- `docs/player-guide/*.md` is the source of truth for the player guide journal.
- `packs-src/player-guide-journal` is generated output, is overwritten on each regeneration, and is gitignored.
- `packs/player-guide-journal` is compiled output used by Foundry.
- `starter-items` still uses hand-maintained files under `packs-src/starter-items`.

## Live Development with FoundryVTT

To have FoundryVTT use your latest build automatically:

1. Remove or backup any existing `synthicide` folder in your FoundryVTT systems directory:
	`/Users/USERNAME/Library/Application Support/FoundryVTT/Data/systems/synthicide`
2. Create a symlink from your local `dist` folder to the FoundryVTT systems directory:
	```sh
	ln -sfn "$(pwd)/dist" "/Users/USERNAME/Library/Application Support/FoundryVTT/Data/systems/synthicide"
	```
3. Now, every time you run `npm run build`, FoundryVTT will use the latest code and assets.

For this repo, `npm run build:develop` automates the same workflow:

```sh
npm run build:develop
```

This command:

- Runs the full `npm run build` pipeline above
- Regenerates the player-guide journal YAML from the markdown docs
- Validates pack declarations
- Recompiles all packs
- Recreates the symlink from `dist/` into your Foundry systems directory

Use `npm run build:develop` when you want a single command to rebuild and immediately test in Foundry.

## Player Guide Journal Workflow

What you edit manually:

- `docs/player-guide/*.md`

What is generated automatically:

- `packs-src/player-guide-journal/*.yml`
- `packs/player-guide-journal`
- `dist/` during `npm run build` or `npm run build:develop`

Typical loop for player-guide changes:

1. Edit a markdown file in `docs/player-guide/`.
2. Run `npm run packs:build-yml` if you only want to rebuild compendiums, or `npm run build:develop` if you want to test in Foundry immediately.
3. Reload Foundry.
4. Re-import the journal entries into a world if you previously imported copies from the compendium.

Notes:

- Do not hand-edit `packs-src/player-guide-journal/*.yml`; those files are regenerated.
- Do not commit `packs-src/player-guide-journal/*.yml`; that directory is generated and ignored.
- `npm run packs:build-yml` now regenerates the player guide journal, validates pack declarations, and then compiles packs.
- `npm run build` and `npm run build:develop` use that same pack-build pipeline through `prebuild`.

## Notes

- The build process automatically clears and recreates the `dist` folder each time.
- Only the contents of `dist` are needed for distribution or installation.
- For production or release, you can zip the `dist` folder and distribute/upload as needed.

## Developer Notes: Item Sheet Part/Tab Maps

The item sheet uses data maps instead of long switch statements to decide which UI parts render.

Relevant constants live in `module/sheets/item-sheet.mjs`:

- `ITEM_BASE_PARTS_BY_TYPE`
- `ITEM_TAB_MAP`

### Render flow

In `_configureRenderOptions`:

1. The sheet always starts with: `['header', 'tabs']`
2. It appends base parts from `ITEM_BASE_PARTS_BY_TYPE[this.document.type]`
3. It always appends `effects`

`ITEM_BASE_PARTS_BY_TYPE` is now the single source of part mappings.

### Practical example

- If document type is `bioclass`:
	- Parts come from `ITEM_BASE_PARTS_BY_TYPE.bioclass`

### How to add a new item tab/part

1. Add the template in `static PARTS`
2. Add the part id to `ITEM_BASE_PARTS_BY_TYPE`
3. Add tab metadata in `ITEM_TAB_MAP`
4. Add localization key(s) under `SYNTHICIDE.Item.Tabs.*`

### Quick rule of thumb

- Use `ITEM_BASE_PARTS_BY_TYPE` as the single source of part mappings

### Shared HTML enrichment helper

For sheet text enrichment, use `enrichSheetHtml(...)` from `module/sheets/sheet-context.mjs` instead of calling `TextEditor.implementation.enrichHTML(...)` directly in each sheet.

Why:

- Keeps `secrets`, `rollData`, and `relativeTo` handling consistent.
- Reduces duplication in actor/item sheet part preparation.
- Makes future tabs easier to add without repeating boilerplate.

### Feature Replacement Flags (Bioclass / Aspect)

Actor-sheet replacement drop handlers use two custom operation flags passed
through Foundry document operations:

- `synthicideSkipFeatureCleanup`
	- Applied when deleting the outgoing feature during replacement.
	- Prevents old-feature `_onDelete` cleanup from racing with incoming feature apply.
- `synthicideSkipFeatureApply`
	- Applied when creating the incoming feature during replacement.
	- Prevents automatic `_onCreate` apply so the handler can explicitly `await`
		one `applyToActor(...)` pass before the final render.

Why this exists:

- Without these flags, replacement can trigger duplicate lifecycle side effects
	(old cleanup + new apply) and produce transient stale trait UI timing.
- With these flags, replacement has a single deterministic apply flow and one
	final render after data is fully synchronized.
