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

  /**
   * Update the virtual grid overlay visibility for all clients.
   */
  updateVirtualGridOverlay() {
    try {
      const show = game.combats?.active?.started && game.settings.get('synthicide', SYNTHICIDE.VIRTUAL_GRID_MOVEMENT_KEY);
      this.visible = !!show;
      if (show) this.drawVirtualGrid();
      else this.clear();
    } catch (e) {
      console.warn('[VirtualGridLayer] Could not update virtual grid overlay:', e);
    }
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

// Register and manage the overlay as a custom canvas layer
export function registerVirtualGridOverlay() {
  // Register the custom layer in Foundry's layer system
  CONFIG.Canvas.layers.virtualGrid = {
    layerClass: VirtualGridLayer,
    group: 'primary',
  };

  // On canvas ready, update visibility
  Hooks.on('canvasReady', () => {
    if (canvas.virtualGrid?.updateVirtualGridOverlay) {
      canvas.virtualGrid.updateVirtualGridOverlay();
    }
  });

  // Only redraw if visible on resize
  Hooks.on('resize', () => {
    if (canvas.virtualGrid?.visible) canvas.virtualGrid.drawVirtualGrid();
  });
}
