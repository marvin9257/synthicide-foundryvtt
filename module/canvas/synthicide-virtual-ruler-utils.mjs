


/**
 * Get the virtual grid cell coordinates for a point in pixel space.
 * @param {number} x - X coordinate in pixels.
 * @param {number} y - Y coordinate in pixels.
 * @param {number} vSize - Virtual grid cell size in pixels.
 * @returns {[number, number]} The [col, row] indices in virtual grid units.
 * @private
 */
function getVirtualGridCell(x, y, vSize) {
  return [Math.floor(x / vSize), Math.floor(y / vSize)];
}

/**
 * Calculate Chebyshev (grid-based) distance between two grid cells.
 * @param {[number, number]} cellA - [col, row] of the first cell.
 * @param {[number, number]} cellB - [col, row] of the second cell.
 * @returns {number} Chebyshev distance (max of dx, dy).
 * @private
 */
function chebyshevCellDistance(cellA, cellB) {
  return Math.max(Math.abs(cellA[0] - cellB[0]), Math.abs(cellA[1] - cellB[1]));
}

/**
 * Calculate the number of virtual grid units (VCU) crossed between two points.
 * Uses Chebyshev distance (max of dx, dy) to count grid boundaries crossed.
 *
 * @param {object} waypoint - The current waypoint object with .ray and .previous.
 *   - .ray: {A: {x, y}, B: {x, y}} (start and end points)
 *   - .previous: previous waypoint (optional)
 * @param {number} vSize - The size (in pixels) of a virtual grid cell.
 * @returns {number} The number of virtual grid units crossed for this segment.
 */
export function countVirtualGridUnitsCrossed(waypoint, vSize) {
  if (!waypoint || !waypoint.ray) return 0;
  let x0, y0;
  if (waypoint.previous && waypoint.previous.ray) {
    x0 = waypoint.previous.ray.B.x;
    y0 = waypoint.previous.ray.B.y;
  } else {
    x0 = waypoint.ray.A.x;
    y0 = waypoint.ray.A.y;
  }
  const x1 = waypoint.ray.B.x;
  const y1 = waypoint.ray.B.y;
  const cellA = getVirtualGridCell(x0, y0, vSize);
  const cellB = getVirtualGridCell(x1, y1, vSize);
  if (cellA[0] === cellB[0] && cellA[1] === cellB[1]) return 0;
  return chebyshevCellDistance(cellA, cellB);
}

/**
 * Calculate Chebyshev distance in virtual grid units (VCU) between two tokens.
 * This matches the logic of the virtual ruler and token movement.
 *
 * @param {Token} tokenA - The first token.
 * @param {Token} tokenB - The second token.
 * @param {number} [virtualGridMultiplier=3] - Multiplier for virtual grid size (default 3).
 * @returns {number} Chebyshev distance in VCU between token centers.
 */
export function calculateVirtualDistanceBetweenTokens(tokenA, tokenB, virtualGridMultiplier = 3) {
  if (!tokenA || !tokenB) return 0;
  const a = tokenA.center;
  const b = tokenB.center;
  const gridSize = canvas?.grid?.size || 100;
  const vSize = gridSize * virtualGridMultiplier;
  const cellA = getVirtualGridCell(a.x, a.y, vSize);
  const cellB = getVirtualGridCell(b.x, b.y, vSize);
  return chebyshevCellDistance(cellA, cellB);
}
