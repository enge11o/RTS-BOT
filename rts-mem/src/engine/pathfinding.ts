export type Node = { x: number; y: number; walkable: boolean };

export class GridNav {
  width: number; height: number; nodes: Node[];
  constructor(width: number, height: number) {
    this.width = width; this.height = height; this.nodes = new Array(width * height).fill(0).map((_, i) => ({ x: i % width, y: Math.floor(i / width), walkable: true }));
  }
  idx(x: number, y: number) { return y * this.width + x; }
  inBounds(x: number, y: number) { return x >= 0 && y >= 0 && x < this.width && y < this.height; }
  setBlocked(x: number, y: number, blocked: boolean) { if (this.inBounds(x,y)) this.nodes[this.idx(x,y)].walkable = !blocked; }
  isWalkable(x: number, y: number) { return this.inBounds(x,y) && this.nodes[this.idx(x,y)].walkable; }
}

export type Point = { x: number; y: number };

export function aStar(grid: GridNav, start: Point, goal: Point): Point[] {
  const sx = Math.round(start.x), sy = Math.round(start.y);
  const gx = Math.round(goal.x), gy = Math.round(goal.y);
  if (!grid.inBounds(sx, sy) || !grid.inBounds(gx, gy)) return [];
  const open: number[] = [];
  const came = new Map<number, number>();
  const g = new Map<number, number>();
  const f = new Map<number, number>();

  const startIdx = grid.idx(sx, sy);
  open.push(startIdx);
  g.set(startIdx, 0);
  f.set(startIdx, heuristic(sx, sy, gx, gy));

  const closed = new Set<number>();

  while (open.length) {
    // Pick lowest f
    let bestIndex = 0;
    for (let i = 1; i < open.length; i++) if ((f.get(open[i]) ?? Infinity) < (f.get(open[bestIndex]) ?? Infinity)) bestIndex = i;
    const current = open.splice(bestIndex, 1)[0];
    if (current === grid.idx(gx, gy)) {
      return reconstructPath(grid, came, current);
    }
    closed.add(current);
    const cx = current % grid.width, cy = Math.floor(current / grid.width);
    for (const [nx, ny] of neighbors(grid, cx, cy)) {
      const nid = grid.idx(nx, ny);
      if (closed.has(nid) || !grid.isWalkable(nx, ny)) continue;
      const tentative = (g.get(current) ?? Infinity) + cost(cx, cy, nx, ny);
      if (!open.includes(nid)) open.push(nid);
      else if (tentative >= (g.get(nid) ?? Infinity)) continue;
      came.set(nid, current);
      g.set(nid, tentative);
      f.set(nid, tentative + heuristic(nx, ny, gx, gy));
    }
  }
  return [];
}

function reconstructPath(grid: GridNav, came: Map<number, number>, current: number): Point[] {
  const path: Point[] = [];
  while (came.has(current)) {
    const x = current % grid.width, y = Math.floor(current / grid.width);
    path.push({ x, y });
    current = came.get(current)!;
  }
  path.reverse();
  if (path.length > 1) smooth(path);
  return path;
}

function neighbors(grid: GridNav, x: number, y: number): [number, number][] {
  const result: [number, number][] = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (dx === 0 && dy === 0) continue;
    const nx = x + dx, ny = y + dy;
    if (!grid.inBounds(nx, ny)) continue;
    if (!grid.isWalkable(nx, ny)) continue;
    // Prevent diagonal through corners
    if (dx !== 0 && dy !== 0 && (!grid.isWalkable(x + dx, y) || !grid.isWalkable(x, y + dy))) continue;
    result.push([nx, ny]);
  }
  return result;
}

function heuristic(x1: number, y1: number, x2: number, y2: number) {
  const dx = Math.abs(x1 - x2), dy = Math.abs(y1 - y2);
  return dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy);
}

function cost(x1: number, y1: number, x2: number, y2: number) {
  const d = Math.hypot(x2 - x1, y2 - y1);
  return d;
}

function smooth(path: Point[]) {
  // Simple collinear smoothing
  for (let i = path.length - 3; i >= 0; i--) {
    const a = path[i], b = path[i + 1], c = path[i + 2];
    const abx = b.x - a.x, aby = b.y - a.y;
    const bcx = c.x - b.x, bcy = c.y - b.y;
    if (abx === bcx && aby === bcy) path.splice(i + 1, 1);
  }
}