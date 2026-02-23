# Synthicide System

![Synthicide Theme](assets/synthicideTheme.png)

![Foundry v14](https://img.shields.io/badge/foundry-v14-green)

This system is a draft version of a Synthicide system that is based on v13 Boilerplate. It's similar to Simple World-building, but has examples of creating attributes in code rather than dynamically through the UI.

# Development & Build Instructions

## Prerequisites

- Node.js (v18 or later recommended)

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

---


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
