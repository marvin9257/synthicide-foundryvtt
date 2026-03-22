# Synthicide 2e System

![Synthicide Theme](assets/synthicide2eTheme.webp)

![Foundry v14](https://img.shields.io/badge/foundry-v14-green)

<img title="Minimum foundry version" src="https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/marvin9257/synthicide-foundryvtt/master/static/system.json&label=Minimum%20Foundry%20version&query=compatibility.minimum&style=flat-square&color=important"> 

<img title="Verified foundry version" src="https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/marvin9257/synthicide-foundryvtt/master/static/system.json&label=Verified%20Foundry%20version&query=compatibility.verified&style=flat-square&color=important"> 

<img title="Synthicide version" src="https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/marvin9257/synthicide-foundryvtt/master/static/system.json&label=Synthicide%20version&query=version&style=flat-square&color=success">

![GitHub release](https://img.shields.io/github/release-date/marvin9257/synthicide-foundryvtt) 
[![GitHub commits](https://img.shields.io/github/commits-since/marvin9257/synthicide-foundryvtt/latest)](https://github.com/marvin9257/synthicide-foundryvtt/commits/) 

![the latest version zip](https://img.shields.io/github/downloads/marvin9257/synthicide-foundryvtt/latest/synthicide.zip) 

![Forge installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Fsynthicide)

This system is a draft, unofficial version of a Synthicide 2E rpg for Foundry VTT. It is is based on v13 Boilerplate.

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
	- Bundle JavaScript using Rollup
	- Copy all required files (assets, css, lang, module, templates, system.json, README, LICENSE) into a fresh `dist/` folder

## Live Development with FoundryVTT

To have FoundryVTT use your latest build automatically:

1. Remove or backup any existing `synthicide` folder in your FoundryVTT systems directory:
	`/Users/USERNAME/Library/Application Support/FoundryVTT/Data/systems/synthicide`
2. Create a symlink from your local `dist` folder to the FoundryVTT systems directory:
	```sh
	ln -sfn "$(pwd)/dist" "/Users/USERNAME/Library/Application Support/FoundryVTT/Data/systems/synthicide"
	```
3. Now, every time you run `npm run build`, FoundryVTT will use the latest code and assets.

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

1. The sheet always starts with: `['header', 'tabs', 'general']`
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


# Getting Help

Check out the [Official Foundry VTT Discord](https://discord.gg/foundryvtt)! The #system-development channel has helpful pins and is a good place to ask questions about any part of the foundry application.

For more static references, the [Knowledge Base](https://foundryvtt.com/kb/) and [API Documentation](https://foundryvtt.com/api/) provide different levels of detail. For the most detail, you can find the client side code in your foundry installation location. Classes are documented in individual files under `resources/app/client` and `resources/app/common`, and the code is collated into a single file at `resources/app/public/scripts/foundry.js`.

## Tutorial

For much more information on how to use this system as a starting point for making your own, see the [full tutorial on the Foundry Wiki](https://foundryvtt.wiki/en/development/guides/SD-tutorial)!

Note: Tutorial may be out of date, so look out for the Foundry compatibility badge at the top of each page.

## Sheet Layout

This system includes a handful of helper CSS classes to help you lay out your sheets if you're not comfortable diving into CSS fully. Those are:

- `flexcol`: Included by Foundry itself, this lays out the child elements of whatever element you place this on vertically.
- `flexrow`: Included by Foundry itself, this lays out the child elements of whatever element you place this on horizontally.
- `flex-center`: When used on something that's using flexrow or flexcol, this will center the items and text.
- `flex-between`: When used on something that's using flexrow or flexcol, this will attempt to place space between the items. Similar to "justify" in word processors.
- `flex-group-center`: Add a border, padding, and center all items.
- `flex-group-left`: Add a border, padding, and left align all items.
- `flex-group-right`: Add a border, padding, and right align all items.
- `grid`: When combined with the `grid-Ncol` classes, this will lay out child elements in a grid.
- `grid-Ncol`: Replace `N` with any number from 1-12, such as `grid-3col`. When combined with `grid`, this will layout child elements in a grid with a number of columns equal to the number specified.
