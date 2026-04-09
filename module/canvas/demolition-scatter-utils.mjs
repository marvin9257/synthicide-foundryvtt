function getVirtualZoneSize(virtualGridMultiplier = 3) {
  const gridSize = Number(canvas?.grid?.size ?? 0);
  return gridSize > 0 ? gridSize * virtualGridMultiplier : 0;
}

function getVirtualZoneCell(point, virtualGridMultiplier = 3) {
  const zoneSize = getVirtualZoneSize(virtualGridMultiplier);
  if (!point || !zoneSize) return null;

  return {
    col: Math.floor(Number(point.x ?? 0) / zoneSize),
    row: Math.floor(Number(point.y ?? 0) / zoneSize),
    zoneSize,
  };
}

function chebyshevDistance(cellA, cellB) {
  return Math.max(Math.abs(cellA.col - cellB.col), Math.abs(cellA.row - cellB.row));
}

export function calculateVirtualZoneDistanceBetweenPoints(pointA, pointB, virtualGridMultiplier = 3) {
  const cellA = getVirtualZoneCell(pointA, virtualGridMultiplier);
  const cellB = getVirtualZoneCell(pointB, virtualGridMultiplier);
  if (!cellA || !cellB) return 0;
  return chebyshevDistance(cellA, cellB);
}

export function getVirtualZoneCorners(zonePoint, virtualGridMultiplier = 3) {
  const cell = getVirtualZoneCell(zonePoint, virtualGridMultiplier);
  if (!cell) return [];

  const left = cell.col * cell.zoneSize;
  const top = cell.row * cell.zoneSize;
  const right = left + cell.zoneSize;
  const bottom = top + cell.zoneSize;

  return [
    { id: 'nw', index: 0, x: left, y: top },
    { id: 'ne', index: 1, x: right, y: top },
    { id: 'sw', index: 2, x: left, y: bottom },
    { id: 'se', index: 3, x: right, y: bottom },
  ];
}

export function getRandomScatterCorner({ zonePoint, random = Math.random, virtualGridMultiplier = 3 } = {}) {
  const corners = getVirtualZoneCorners(zonePoint, virtualGridMultiplier);
  if (!corners.length) return null;

  const roll = Number(random?.() ?? Math.random());
  const normalizedRoll = Number.isFinite(roll) ? Math.min(Math.max(roll, 0), 0.999999) : 0;
  return corners[Math.floor(normalizedRoll * corners.length)] ?? corners[0];
}