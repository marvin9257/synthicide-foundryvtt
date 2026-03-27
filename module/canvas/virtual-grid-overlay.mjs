// Virtual Grid Overlay for Synthicide
// Draws a 3x3 virtual grid overlay (each cell = 3x3 Foundry grid units)

import SYNTHICIDE from '../helpers/config.mjs';

/**
 * VirtualGridLayer overlays a 3x3 virtual grid on the scene grid.
 * Only visible if the system setting is enabled.
 */
export class VirtualGridLayer extends foundry.canvas.layers.CanvasLayer {
  static get layerOptions() {
    return foundry.utils.mergeObject(super.layerOptions, {
      name: 'virtualGrid',
      zIndex: 120,
    });
  }

  drawVirtualGrid() {
    this.clear();
    if (!game.settings.get('synthicide', SYNTHICIDE.VIRTUAL_GRID_MOVEMENT_KEY)) {
      console.log('[VirtualGrid] Setting disabled, not drawing overlay.');
      return false;
    }
    const grid = canvas.grid;
    if (!grid) {
      console.warn('[VirtualGrid] No canvas.grid found.');
      return false;
    }
    // Use canvas.scene or canvas.dimensions for width/height
    const dims = (canvas.scene && canvas.scene.dimensions) || {};
    const width = dims.width || 0;
    const height = dims.height || 0;
    this.position.set(0, 0);
    this.width = width;
    this.height = height;
    this.zIndex = 9999;

    const gSize = grid.size;
    const vSize = gSize * 3;
    const cols = Math.ceil(width / vSize);
    const rows = Math.ceil(height / vSize);
    const g = new globalThis.PIXI.Graphics();
    // Use a subtle orange, semi-transparent, thicker line
    g.lineStyle(5, 0xff8800, 0.5);
    console.log(`[VirtualGrid] Drawing overlay: grid size=${gSize}, virtual size=${vSize}, cols=${cols}, rows=${rows}, width=${width}, height=${height}`);
    for (let c = 0; c <= cols; c++) {
      const x = c * vSize;
      g.moveTo(x, 0);
      g.lineTo(x, height);
    }
    for (let r = 0; r <= rows; r++) {
      const y = r * vSize;
      g.moveTo(0, y);
      g.lineTo(width, y);
    }
    this.addChild(g);
    return true;
  }

  clear() {
    this.removeChildren();
  }
}

// Register and manage the overlay
export function registerVirtualGridOverlay() {
  Hooks.on('canvasReady', () => {
    if (!canvas.virtualGrid) {
      canvas.virtualGrid = new VirtualGridLayer();
      canvas.stage.addChild(canvas.virtualGrid);
    }
    // Show overlay if combat is already active and setting is enabled
    const show = game.combats?.active?.started && game.settings.get('synthicide', SYNTHICIDE.VIRTUAL_GRID_MOVEMENT_KEY);
    canvas.virtualGrid.visible = !!show;
    if (show) canvas.virtualGrid.drawVirtualGrid();
    else canvas.virtualGrid.clear();
  });

  // Only redraw if visible on resize
  Hooks.on('resize', () => {
    if (canvas.virtualGrid && canvas.virtualGrid.visible) canvas.virtualGrid.drawVirtualGrid();
  });
}
