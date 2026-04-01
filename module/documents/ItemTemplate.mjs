import SYNTHICIDE from "../helpers/config.mjs";


/**
 * A helper class for building Regions for item AOE.  Originally adapted from D5e system then v14 migrations for MeasuredTemplates
 * @extends {Region}
 */
export default class ItemTemplate extends foundry.canvas.placeables.Region {


  // -------------------- REGION CREATION --------------------

  /**
   * System method to create an ItemTemplate instance using item data.
   * Uses foundry.utils.deepClone for safe data handling.
   * @param {SynthicideItem} item - The Item object for which to construct the template.
   * @param {object} [options={}] - Options to modify the created template.
   * @returns {Promise<ItemTemplate|null>} The template object, or null if the item does not produce a template.
   */
  static async fromItem(item, options = {}) {
    const target = foundry.utils.deepClone(options.target ?? item.system.target ?? {});
    // Only pass minimal intent to migration: target, name, uuid
    const itemTemplateData = {
      target,
      name: options.name ?? item.name ?? "Unnamed Region",
      uuid: options.uuid ?? item.uuid,
      color: options.color,
      hidden: options.hidden,
      flags: options.flags
    };

    // Migrate itemTemplateData to Foundry regionData
    const regionData = this.generateItemTemplateData(itemTemplateData);
    if (!regionData) {
      console.error("Failed to migrate ItemTemplate data:", itemTemplateData);
      return null;
    }

    // Create the region document
    const regionDoc = new foundry.documents.RegionDocument(foundry.utils.deepClone(regionData), {parent: canvas.scene});
    // Create the placeable Region object (ItemTemplate extends Region)
    const region = new this(regionDoc);
    region.item = item;
    region.actorSheet = item.actor?.sheet || null;
    return region;
  }

  /* -------------------------------------------- */

  /**
   * Helper to target tokens after region placement.
   * Call this with the placed region PlaceableObject returned from drawPreview.
   * Uses center-only targeting logic for accuracy.
   * Example:
   *   const placedRegion = await template.drawPreview();
   *   if (placedRegion) ItemTemplate.targetTokensForPlacedRegion(placedRegion);
   */
  static targetTokensForPlacedRegion(regionDoc) {
    const regionDocument = regionDoc?.document ?? regionDoc;
    if (!regionDocument) {
      console.warn("[Synthicide] targetTokensForPlacedRegion: No region provided");
      return;
    }
    const tokens = canvas.tokens?.placeables;
    const arrayOfTokenIds = [];
    if (tokens?.length > 0) {
      for (const tok of tokens) {
        if (tok.document?.testInsideRegion(regionDocument)) {
          arrayOfTokenIds.push(tok.id);
        }
      }
      canvas.tokens?.setTargets(arrayOfTokenIds, {mode: "replace"});
    } else {
      console.warn("[Synthicide] No tokens found on canvas for targeting");
    }
  }

  static getPlacedPoint(regionDoc) {
    const regionDocument = regionDoc?.document ?? regionDoc;
    const regionData = regionDocument?.toObject?.() ?? null;
    const shape = regionData?.shapes?.[0] ?? null;
    if (!shape) return null;

    return {
      x: Number(shape.x ?? 0),
      y: Number(shape.y ?? 0),
    };
  }

  static async movePlacedRegion(regionDoc, point) {
    const regionDocument = regionDoc?.document ?? regionDoc;
    if (!regionDocument || !point || typeof regionDocument.update !== 'function') return null;

    const regionData = regionDocument.toObject?.() ?? {};
    const shapes = foundry.utils.deepClone(regionData.shapes ?? []);
    if (!Array.isArray(shapes) || !shapes.length) return regionDoc;

    shapes[0].x = Number(point.x ?? shapes[0].x ?? 0);
    shapes[0].y = Number(point.y ?? shapes[0].y ?? 0);
    await regionDocument.update({ shapes });
    return regionDoc;
  }

  // -------------------- TARGETING --------------------

  /**
   * Generate ItemTemplate data to Region data.
   * Uses foundry.utils.deepClone and math utilities for safe conversion.
   * @param {object} template - The ItemTemplate data.
   * @param {object} [context] - The migration context.
   * @param {BaseGrid} [context.grid] - The grid.
   * @param {boolean} [context.gridTemplates] - Grid-shaped?
   * @param {"round"|"flat"} [context.coneTemplateType] - The cone curvature.
   * @returns {object|null} The Region data or null if migration fails.
   */
  static generateItemTemplateData(
    template,
    {grid = canvas.scene?.grid ?? foundry.documents.BaseScene.defaultGrid, gridTemplates = false, coneTemplateType = "round"} = {}
  ) {
    try {
      if (!canvas?.scene) {
        console.error("Cannot generate template data without an active scene");
        return null;
      }

      // Extract raw intent
      const {
        target = {},
        name: regionName = "Unnamed Region",
        uuid = "",
        color,
        hidden = false,
        flags: customFlags = {}
      } = template;
      const regionShape = target.templateType ?? SYNTHICIDE.AREA_TARGET_TYPES?.[target.type]?.template;
      if (!regionShape) {
        console.error("No region shape found for target:", target);
        return null;
      }
      const x = 0;
      const y = 0;
      const elevation = 0;
      const distance = Math.abs(target.value || 0);
      const direction = 0;
      const angle = target.angle || 90;
      const width = target.width || 0;
      const fillColor = color ?? game.user?.color ?? "#ff0000";
      const flags = foundry.utils.mergeObject(
        {synthicide: {origin: uuid}, core: {MeasuredTemplate: true}},
        foundry.utils.deepClone(customFlags),
        {inplace: false}
      );

      // Use gridlessGrid if grid is not gridless
      const gridBased = gridTemplates === true;
      if (!gridBased && !grid.isGridless) {
        grid = canvas.scene.gridlessGrid; // Use the gridlessGrid property from the Scene class
      }
      if (!grid?.distance || !grid?.size) {
        console.error("Invalid grid data for template generation", grid);
        return null;
      }
      const distancePixels = grid.size / grid.distance;
      let shape;
      switch (regionShape) {
        case "circle":
          shape = {type: "circle", x, y, radius: distance * distancePixels, gridBased};
          break;
        case "cone": {
          const curvature = gridBased || (coneTemplateType === "round") ? "round" : "flat";
          shape = {
            type: "cone",
            x,
            y,
            radius: distance * distancePixels,
            angle,
            rotation: direction,
            curvature,
            gridBased
          };
          break;
        }
        case "rect": {
          const {x: x1, y: y1} = grid.getTranslatedPoint({x, y}, direction, distance);
          let rectWidth = grid.measurePath([{x, y}, {x: x1, y}]).distance * distancePixels;
          let rectHeight = grid.measurePath([{x, y}, {x, y: y1}]).distance * distancePixels;
          const rotation = direction.toNearest(90, "floor");
          if ((rotation === 90) || (rotation === 270)) {
            [rectWidth, rectHeight] = [rectHeight, rectWidth];
          }
          shape = {
            type: "rectangle",
            x,
            y,
            width: rectWidth,
            height: rectHeight,
            anchorX: 0,
            anchorY: 0,
            rotation,
            gridBased
          };
          break;
        }
        case "ray":
          shape = {
            type: "line",
            x,
            y,
            length: distance * distancePixels,
            width: width * distancePixels,
            rotation: direction,
            gridBased
          };
          break;
        default:
          console.error("Unsupported template type:", regionShape);
          return null;
      }

      // Create the Region data
      return {
        name: regionName || `${shape.type.capitalize()} Template`,
        color: fillColor,
        shapes: [shape],
        elevation: {bottom: elevation, top: null},
        restriction: {enabled: false, type: "move", priority: 0},
        behaviors: [],
        visibility: hidden ? CONST.REGION_VISIBILITY.OBSERVER : CONST.REGION_VISIBILITY.ALWAYS,
        displayMeasurements: true,
        locked: false,
        ownership: {default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE},
        flags: foundry.utils.deepClone(flags)
      };
    } catch (err) {
      console.error("Error migrating ItemTemplate data:", err);
      return null;
    }
  }

  // -------------------- GENERATE TEMPLATE DATA --------------------

  /**
   * Creates a preview of the region template and returns the placed region document after confirmation.
   * Minimizes the actor sheet before placement and maximizes it after - if it was open.
   * Uses canvas.regions for region creation.
   * @returns {Promise<RegionDocument|null>} A promise that resolves with the placed region or null if cancelled.
   */
  async drawPreview() {
    const regionData = this.document?.toObject();
    let actorSheetOpen = false;
    let placedRegion;
    // Minimize actor sheet if open
    if (this.actorSheet?.state > 0) {
      this.actorSheet?.minimize();
      actorSheetOpen = true;
    }
    // Suppress the Region Legend menu if open (do this before placement)
    if (canvas?.regions?.legend?.close) {
      await canvas.regions.legend.close();
    }
    try {
      placedRegion = await canvas.regions.placeRegion(regionData, {create: true});
    } catch {
      placedRegion = null;
    } finally {
      // Maximize the actor sheet after placement if previously open
      if (this.actorSheet && actorSheetOpen) {
        await this.actorSheet.maximize();
      }
    }
    return placedRegion;
  }
}
