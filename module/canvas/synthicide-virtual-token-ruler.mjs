
import SYNTHICIDE from '../helpers/config.mjs';
import { countVirtualGridUnitsCrossed } from './synthicide-virtual-ruler-utils.mjs';

/**
 * Custom token ruler for measuring in virtual 3x3 grid units (zones).
 * Extends Foundry's TokenRuler to display zones and cost for token movement.
 */
export default class SynthicideVirtualTokenRuler extends foundry.canvas.placeables.tokens.TokenRuler {
  /**
   * Get the label context for a waypoint, displaying zones and cost if enabled.
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
      // Total zones from origin to this waypoint
      let total = 0;
      let prev = waypoint;
      while (prev && prev.previous) {
        total += countVirtualGridUnitsCrossed(prev, vSize);
        prev = prev.previous;
      }
      // Delta vgu for this segment
      const delta = countVirtualGridUnitsCrossed(waypoint, vSize);
      context.distance = {
        total,
        units: game.i18n.localize(total !== 1 ? "SYNTHICIDE.Zones.zonePl": "SYNTHICIDE.Zones.zone"),
        delta: delta !== total ? `+${delta}` : undefined
      };
      context.cost = {
        total,
        units: game.i18n.localize(total !== 1 ? "SYNTHICIDE.Zones.zonePl": "SYNTHICIDE.Zones.zone"),
        delta: delta !== total ? `+${delta}` : undefined
      };
      context.units = game.i18n.localize(total !== 1 ? "SYNTHICIDE.Zones.zonePl": "SYNTHICIDE.Zones.zone");
    }
    return context;
  }
}
