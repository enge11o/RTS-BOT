export type Vec2 = { x: number; y: number };

export const Vec2 = {
  add(a: Vec2, b: Vec2): Vec2 { return { x: a.x + b.x, y: a.y + b.y }; },
  sub(a: Vec2, b: Vec2): Vec2 { return { x: a.x - b.x, y: a.y - b.y }; },
  mul(a: Vec2, s: number): Vec2 { return { x: a.x * s, y: a.y * s }; },
  len(a: Vec2): number { return Math.hypot(a.x, a.y); },
  norm(a: Vec2): Vec2 { const l = Vec2.len(a) || 1; return { x: a.x / l, y: a.y / l }; },
};

export type Rect = { x: number; y: number; w: number; h: number };

export const Rect = {
  fromPoints(a: Vec2, b: Vec2): Rect {
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    return { x, y, w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
  },
  contains(r: Rect, p: Vec2): boolean {
    return p.x >= r.x && p.y >= r.y && p.x <= r.x + r.w && p.y <= r.y + r.h;
  },
  intersectsCircle(r: Rect, c: Vec2, radius: number): boolean {
    const cx = Math.max(r.x, Math.min(c.x, r.x + r.w));
    const cy = Math.max(r.y, Math.min(c.y, r.y + r.h));
    const dx = c.x - cx; const dy = c.y - cy;
    return (dx * dx + dy * dy) <= radius * radius;
  },
};