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

  async _draw(options) {
    await super._draw(options);
    if (this.gridGraphics) {
      this.gridGraphics.clear();
    } else {
      this.gridGraphics = new globalThis.PIXI.Graphics();
      this.addChild(this.gridGraphics);
    }
    if (!this._shouldDrawGrid()) return this;
    this._drawGrid();
    return this;
  }

  _shouldDrawGrid() {
    return game.combats?.active?.started && game.settings.get('synthicide', SYNTHICIDE.VIRTUAL_GRID_MOVEMENT_KEY);
  }

  _drawGrid() {
    if (!canvas?.ready) return;
    const grid = canvas.grid;
    if (!grid) return;

    const dims = canvas.dimensions ?? {};
    const width = dims.width ?? 0;
    const height = dims.height ?? 0;
    const gSize = grid.size;
    const vSize = gSize * 3;
    const cols = Math.ceil(width / vSize);
    const rows = Math.ceil(height / vSize);
    const color = game.settings.get('synthicide', SYNTHICIDE.VIRTUAL_GRID_COLOR_KEY) || 0xff8800;

    this.gridGraphics.lineStyle(5, color, 0.5);
    for (let c = 0; c <= cols; c++) {
      const x = c * vSize;
      this.gridGraphics.moveTo(x, 0);
      this.gridGraphics.lineTo(x, height);
    }
    for (let r = 0; r <= rows; r++) {
      const y = r * vSize;
      this.gridGraphics.moveTo(0, y);
      this.gridGraphics.lineTo(width, y);
    }
  }

  async tearDown() {
    if (this.gridGraphics) {
      try {
        if (!this.gridGraphics.destroyed) this.gridGraphics.destroy({ children: true });
      } catch(er) {
        // ignore destroy errors
        console.log("Had teardown errors", er);
      }
      this.gridGraphics = null;
    }
    await super.tearDown();
  }
}

export function safeRenderVirtualGrid() {
  return canvas?.ready && canvas.virtualGrid ? canvas.virtualGrid.draw() : undefined;
}

// Register and manage the overlay as a custom canvas layer
export function registerVirtualGridOverlay() {
  CONFIG.Canvas.layers.virtualGrid = {
    layerClass: VirtualGridLayer,
    group: 'primary',
  };

  Hooks.on('resize', () => {
    safeRenderVirtualGrid();
  });
}
