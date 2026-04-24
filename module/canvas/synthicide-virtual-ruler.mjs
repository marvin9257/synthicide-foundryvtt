// SynthicideVirtualRuler.js

/**
 * Custom ruler for measuring in virtual 3x3 grid units (zones).
 * Extends Foundry's canvas.interaction.Ruler to display zones during movement.
 */
import SYNTHICIDE from '../helpers/config.mjs';
import { countVirtualGridUnitsCrossed } from './synthicide-virtual-ruler-utils.mjs';

export default class SynthicideVirtualRuler extends foundry.canvas.interaction.Ruler {
  /**
   * Get the label context for a waypoint, displaying zones if enabled.
   * @param {object} waypoint - The current waypoint.
   * @param {object} state - The ruler state.
   * @returns {object} The label context for the waypoint.
   * @override
   */
  _getWaypointLabelContext(waypoint, state) {
    const context = super._getWaypointLabelContext(waypoint, state);
    if (!context) return context;
    if (game.settings.get('synthicide', SYNTHICIDE.VIRTUAL_GRID_MOVEMENT_KEY) && game.combats?.active?.started && waypoint.previous) {
      const vSize = canvas.grid.size * 3;
      const crossed = countVirtualGridUnitsCrossed(waypoint, vSize);
      context.distance.total = crossed;
      context.units =  game.i18n.localize(context.distance.total !== 1 ? "SYNTHICIDE.Zones.zonePl": "SYNTHICIDE.Zones.zone");
    }
    return context;
  }
}
