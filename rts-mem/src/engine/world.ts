import { GridNav, aStar, Point } from "@engine/pathfinding";
import { Rect, Vec2 } from "@engine/math";

let NEXT_ID = 1;

export type Faction = "SBEU" | "PMС" | "NEUTRAL";
export type EntityType = "unit" | "building" | "resource";

export type Entity = {
  id: number;
  name: string;
  type: EntityType;
  faction: Faction;
  pos: Vec2;
  radius: number;
  hp: number;
  hpMax: number;
  attack?: { range: number; damage: number; cooldown: number; cd: number; splash?: number };
  moveSpeed?: number;
  targetPos?: Vec2 | null;
  path?: Point[];
  pathIndex?: number;
  tier?: 1 | 2 | 3;
  trainQueue?: string[];
  garrison?: number;
  resource?: { kind: "rubles" | "dollars"; amount: number };
  abilities?: Partial<{
    stunGrenade: { cd: number; cooldown: number; radius: number; duration: number; range: number };
    aimedShot: { cd: number; cooldown: number; bonusDamage: number };
    throwGrenade: { cd: number; cooldown: number; fuse: number; radius: number; damage: number; range: number };
  }>;
  stunnedUntil?: number;
};

export type Economy = { rubles: number; dollars: number };

export type Trainable = { id: string; label: string; costRubles: number; costDollars: number; buildTime: number; tier: 1 | 2 | 3 };

type Effect =
  | { kind: "explosion"; pos: Vec2; fuse: number; radius: number; damage: number; faction: Faction }
  | { kind: "stun"; pos: Vec2; fuse: number; radius: number; duration: number };

export class World {
  width: number; height: number; tileSize = 16;
  nav: GridNav;
  entities: Entity[] = [];
  effects: Effect[] = [];
  economy: Economy = { rubles: 500, dollars: 200 };
  time = 0;

  objectiveText: string = "Песочница";
  onUpdateExtra?: (w: World, dt: number) => void;
  winCondition?: (w: World) => boolean;
  loseCondition?: (w: World) => boolean;

  catalog: Record<string, Trainable> = {
    // SBEU
    "sbeu-worker": { id: "sbeu-worker", label: "Дикий (рабочий)", costRubles: 50, costDollars: 0, buildTime: 4, tier: 1 },
    "sbeu-worm": { id: "sbeu-worm", label: "СБЭУ-Червь", costRubles: 50, costDollars: 0, buildTime: 6, tier: 1 },
    "sbeu-caterpillar": { id: "sbeu-caterpillar", label: "СБЭУ-Гусеница", costRubles: 75, costDollars: 0, buildTime: 7, tier: 1 },
    "sbeu-cockroach": { id: "sbeu-cockroach", label: "СБЭУ-Таракан", costRubles: 125, costDollars: 25, buildTime: 10, tier: 2 },
    "sbeu-cicada": { id: "sbeu-cicada", label: "СБЭУ-Цикада", costRubles: 100, costDollars: 50, buildTime: 12, tier: 2 },
    "sbeu-turtle": { id: "sbeu-turtle", label: "СБЭУ-Черепаха", costRubles: 250, costDollars: 100, buildTime: 20, tier: 3 },
    // PMC
    "pmc-typok": { id: "pmc-typok", label: "Типок", costRubles: 50, costDollars: 0, buildTime: 6, tier: 1 },
    "pmc-silach": { id: "pmc-silach", label: "Силач", costRubles: 100, costDollars: 0, buildTime: 9, tier: 2 },
    "pmc-sniper": { id: "pmc-sniper", label: "Снайпер", costRubles: 125, costDollars: 50, buildTime: 12, tier: 2 },
    "pmc-grenade": { id: "pmc-grenade", label: "Грената", costRubles: 100, costDollars: 75, buildTime: 14, tier: 2 },
    "pmc-tank": { id: "pmc-tank", label: "Танк", costRubles: 300, costDollars: 150, buildTime: 25, tier: 3 },
  };

  constructor(width: number, height: number) {
    this.width = width; this.height = height; this.nav = new GridNav(width, height);
  }

  private blockTilesForCircle(center: Vec2, radius: number) {
    const r = Math.ceil(radius);
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const gx = Math.floor(center.x + x), gy = Math.floor(center.y + y);
      if ((x * x + y * y) <= r * r) this.nav.setBlocked(gx, gy, true);
    }
  }

  spawnDemo() {
    // Player base (SBEU)
    const base: Entity = {
      id: NEXT_ID++, name: "Улей", type: "building", faction: "SBEU",
      pos: { x: 40, y: 40 }, radius: 6, hp: 1500, hpMax: 1500, tier: 1, trainQueue: [], garrison: 0,
    };
    this.entities.push(base);
    this.blockTilesForCircle(base.pos, base.radius + 1);

    for (let i = 0; i < 6; i++) this.spawnUnit("SBEU", { x: 52 + i * 2, y: 40 }, "sbeu-worker");

    // Neutral resources
    for (let i = 0; i < 12; i++) { const r = this.spawnResource({ x: 70 + (i % 6) * 3, y: 32 + Math.floor(i / 6) * 3 }, "rubles", 1500); this.blockTilesForCircle(r.pos, r.radius + 1); }
    for (let i = 0; i < 8; i++) { const r = this.spawnResource({ x: 64 + (i % 4) * 3, y: 48 + Math.floor(i / 4) * 3 }, "dollars", 800); this.blockTilesForCircle(r.pos, r.radius + 1); }

    // Enemy PMC outpost
    const pmcBase: Entity = {
      id: NEXT_ID++, name: "Центр поставок", type: "building", faction: "PMС",
      pos: { x: 96, y: 88 }, radius: 6, hp: 1400, hpMax: 1400, tier: 1, trainQueue: [], garrison: 0,
    };
    this.entities.push(pmcBase);
    this.blockTilesForCircle(pmcBase.pos, pmcBase.radius + 1);
    for (let i = 0; i < 4; i++) this.spawnUnit("PMС", { x: 90 + i * 2, y: 96 }, "pmc-typok");

    this.objectiveText = "Песочница: стройте юнитов и тестируйте управление";
  }

  spawnResource(pos: Vec2, kind: "rubles" | "dollars", amount: number) {
    const e: Entity = { id: NEXT_ID++, name: kind === "rubles" ? "Рубли" : "Доллары", type: "resource", faction: "NEUTRAL", pos, radius: 3, hp: 1, hpMax: 1, resource: { kind, amount } };
    this.entities.push(e);
    return e;
  }

  spawnUnit(faction: Faction, pos: Vec2, unitId: string) {
    const t = this.catalog[unitId];
    const e: Entity = {
      id: NEXT_ID++, name: t.label, type: "unit", faction, pos: { ...pos }, radius: 2.8,
      hp: 100, hpMax: 100, moveSpeed: 7,
      attack: { range: 8, damage: 6, cooldown: 1, cd: 0 },
    };
    // Unit-specific tuning
    if (unitId === "sbeu-turtle" || unitId === "pmc-tank") {
      e.radius = 4; e.hp = 260; e.hpMax = 260; e.moveSpeed = 4; e.attack = { range: 10, damage: 14, cooldown: 1.5, cd: 0 };
      if (unitId === "pmc-tank") e.attack.splash = 2.5;
    }
    if (unitId === "pmc-sniper") {
      e.attack = { range: 16, damage: 6, cooldown: 1.2, cd: 0 };
      e.abilities = { aimedShot: { cd: 0, cooldown: 5, bonusDamage: 30 } };
    }
    if (unitId === "pmc-grenade") {
      e.attack = { range: 10, damage: 4, cooldown: 2, cd: 0 };
      e.abilities = { throwGrenade: { cd: 0, cooldown: 10, fuse: 2, radius: 3, damage: 32, range: 12 } };
    }
    if (unitId === "sbeu-cicada") {
      e.attack = { range: 9, damage: 3, cooldown: 1, cd: 0 };
      e.abilities = { stunGrenade: { cd: 0, cooldown: 12, radius: 3.5, duration: 2.5, range: 11 } };
    }
    this.entities.push(e);
    return e;
  }

  getEntityById(id: number) { return this.entities.find(e => e.id === id); }

  queryEntities(rect: Rect): number[] {
    const ids: number[] = [];
    for (const e of this.entities) {
      if (e.type === "resource") continue;
      if (Rect.intersectsCircle(rect, e.pos, e.radius)) ids.push(e.id);
    }
    return ids;
  }

  pickEntity(x: number, y: number): Entity | null {
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i];
      const dx = x - e.pos.x, dy = y - e.pos.y;
      if (dx * dx + dy * dy <= e.radius * e.radius) return e;
    }
    return null;
  }

  issueMoveCommand(ids: number[], target: Vec2) {
    const goal = { x: Math.floor(target.x), y: Math.floor(target.y) };
    for (const id of ids) {
      const e = this.getEntityById(id);
      if (!e || e.type !== "unit" || !e.moveSpeed) continue;
      const start = { x: Math.floor(e.pos.x), y: Math.floor(e.pos.y) };
      const path = aStar(this.nav, start, goal);
      e.path = path; e.pathIndex = 0; e.targetPos = { ...target };
    }
  }

  getEconomy() { return this.economy; }

  getTrainableUnits(faction: Faction, tier: number | undefined): Trainable[] {
    const res: Trainable[] = [];
    for (const t of Object.values(this.catalog)) {
      if ((t.id.startsWith("sbeu") && faction !== "SBEU") || (t.id.startsWith("pmc") && faction !== "PMС")) continue;
      if (tier && t.tier > tier) continue;
      res.push(t);
    }
    return res;
  }

  queueTrain(buildingId: number, unitId: string) {
    const b = this.getEntityById(buildingId);
    if (!b || b.type !== "building") return;
    const t = this.catalog[unitId];
    if (!t) return;
    if (this.economy.rubles < t.costRubles || this.economy.dollars < t.costDollars) return;
    this.economy.rubles -= t.costRubles; this.economy.dollars -= t.costDollars;
    b.trainQueue = b.trainQueue || [];
    b.trainQueue.push(unitId);
  }

  private processTraining(dt: number) {
    for (const b of this.entities) {
      if (b.type !== "building") continue;
      if (!b.trainQueue || b.trainQueue.length === 0) continue;
      const current = b.trainQueue[0];
      const t = this.catalog[current];
      b.garrison = (b.garrison ?? 0) + dt;
      if (b.garrison! >= t.buildTime) {
        b.garrison = 0;
        b.trainQueue.shift();
        // Spawn near building
        this.spawnUnit(b.faction, { x: b.pos.x + 8 + Math.random() * 4, y: b.pos.y + (Math.random() * 6 - 3) }, current);
      }
    }
  }

  private harvestAndIncome(dt: number) {
    // Very simplified: each worker near rubles adds income; PMC center provides periodic dollars
    for (const e of this.entities) {
      if (e.type === "unit" && e.faction === "SBEU" && e.name.includes("Дикий")) {
        const res = this.entities.find(r => r.type === "resource" && r.resource?.kind === "rubles" && dist(e.pos, r.pos) < 10 && (r.resource!.amount > 0));
        if (res) {
          this.economy.rubles += 2 * dt;
          res.resource!.amount = Math.max(0, res.resource!.amount - 3 * dt);
        }
      }
      if (e.type === "building" && e.faction === "PMС" && e.name.includes("Центр поставок")) {
        this.economy.dollars += 3 * dt;
      }
    }
  }

  private updateEffects(dt: number) {
    for (const fx of this.effects) fx.fuse -= dt;
    const ready = this.effects.filter(fx => fx.fuse <= 0);
    this.effects = this.effects.filter(fx => fx.fuse > 0);
    for (const fx of ready) {
      if (fx.kind === "explosion") {
        for (const e of this.entities) {
          if (e.faction === fx.faction || e.faction === "NEUTRAL") continue;
          if (dist(e.pos, fx.pos) <= fx.radius) e.hp -= fx.damage;
        }
      } else if (fx.kind === "stun") {
        for (const e of this.entities) {
          if (e.faction === "NEUTRAL") continue;
          if (dist(e.pos, fx.pos) <= fx.radius) e.stunnedUntil = Math.max(e.stunnedUntil ?? 0, this.time + fx.duration);
        }
      }
    }
  }

  private useAbilities(dt: number) {
    for (const e of this.entities) {
      if (e.type !== "unit" || !e.abilities) continue;
      if ((e.stunnedUntil ?? 0) > this.time) continue;
      const enemy = this.entities.find(o => o.faction !== e.faction && o.faction !== "NEUTRAL" && o.hp > 0);
      if (!enemy) continue;
      const d = dist(e.pos, enemy.pos);

      if (e.abilities.stunGrenade) {
        const a = e.abilities.stunGrenade;
        a.cd = Math.max(0, a.cd - dt);
        if (a.cd === 0 && d <= a.range) {
          // Instant stun at enemy position
          this.effects.push({ kind: "stun", pos: { ...enemy.pos }, fuse: 0.1, radius: a.radius, duration: a.duration });
          a.cd = a.cooldown;
        }
      }
      if (e.abilities.aimedShot) {
        const a = e.abilities.aimedShot; a.cd = Math.max(0, a.cd - dt);
        if (a.cd === 0 && e.attack && d <= e.attack.range) {
          enemy.hp -= a.bonusDamage; a.cd = a.cooldown;
        }
      }
      if (e.abilities.throwGrenade) {
        const a = e.abilities.throwGrenade; a.cd = Math.max(0, a.cd - dt);
        if (a.cd === 0 && d <= a.range) {
          this.effects.push({ kind: "explosion", pos: { ...enemy.pos }, fuse: a.fuse, radius: a.radius, damage: a.damage, faction: e.faction });
          a.cd = a.cooldown;
        }
      }
    }
  }

  update(dt: number) {
    this.time += dt;

    // Movement along grid path
    for (const e of this.entities) {
      if (e.type !== "unit" || !e.moveSpeed) continue;
      if ((e.stunnedUntil ?? 0) > this.time) continue;
      if (e.path && e.pathIndex! < e.path.length) {
        const waypoint = e.path[e.pathIndex!];
        const wp = { x: waypoint.x, y: waypoint.y };
        const dx = wp.x - e.pos.x, dy = wp.y - e.pos.y;
        const d = Math.hypot(dx, dy);
        if (d < 0.2) e.pathIndex!++;
        else {
          const nx = dx / (d || 1), ny = dy / (d || 1);
          e.pos.x += nx * e.moveSpeed * dt;
          e.pos.y += ny * e.moveSpeed * dt;
        }
      }
    }

    // Abilities
    this.useAbilities(dt);

    // Simple combat: attack nearest enemy in range
    for (const e of this.entities) {
      if (!e.attack) continue;
      if ((e.stunnedUntil ?? 0) > this.time) { e.attack.cd = Math.max(0, e.attack.cd - dt); continue; }
      e.attack.cd = Math.max(0, e.attack.cd - dt);
      const enemy = this.entities.find(o => o.faction !== e.faction && o.faction !== "NEUTRAL" && o.hp > 0 && dist(e.pos, o.pos) <= e.attack!.range);
      if (enemy && e.attack.cd <= 0) {
        enemy.hp -= e.attack.damage;
        // Splash (for tank)
        if (e.attack.splash) {
          for (const other of this.entities) {
            if (other === enemy) continue;
            if (other.faction === e.faction || other.faction === "NEUTRAL") continue;
            const dd = dist(other.pos, enemy.pos);
            if (dd <= e.attack.splash) other.hp -= Math.max(1, Math.floor(e.attack.damage * 0.4));
          }
        }
        e.attack.cd = e.attack.cooldown;
      }
    }

    // Effects
    this.updateEffects(dt);

    // Cleanup dead
    this.entities = this.entities.filter(e => e.hp > 0 || e.type === "resource");

    // Economy
    this.processTraining(dt);
    this.harvestAndIncome(dt);

    // Scenario hooks
    if (this.onUpdateExtra) this.onUpdateExtra(this, dt);
  }

  render(ctx: CanvasRenderingContext2D) {
    // Ground grid
    ctx.save();
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 1;
    for (let y = 0; y <= this.height; y += 8) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.width, y); ctx.stroke();
    }
    for (let x = 0; x <= this.width; x += 8) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.height); ctx.stroke();
    }

    // Effects preview
    for (const fx of this.effects) {
      if (fx.kind === "explosion") {
        ctx.strokeStyle = "rgba(239,68,68,0.6)";
        ctx.beginPath(); ctx.arc(fx.pos.x, fx.pos.y, fx.radius, 0, Math.PI * 2); ctx.stroke();
      } else if (fx.kind === "stun") {
        ctx.strokeStyle = "rgba(96,165,250,0.6)";
        ctx.beginPath(); ctx.arc(fx.pos.x, fx.pos.y, fx.radius, 0, Math.PI * 2); ctx.stroke();
      }
    }

    // Resources
    for (const e of this.entities) if (e.type === "resource") {
      ctx.fillStyle = e.resource!.kind === "rubles" ? "#3b82f6" : "#22c55e";
      ctx.beginPath(); ctx.arc(e.pos.x, e.pos.y, 2.5, 0, Math.PI * 2); ctx.fill();
    }

    // Buildings
    for (const e of this.entities) if (e.type === "building") {
      ctx.fillStyle = e.faction === "SBEU" ? "#9333ea" : "#ef4444";
      ctx.fillRect(e.pos.x - 6, e.pos.y - 6, 12, 12);
      drawHP(ctx, e);
    }

    // Units
    for (const e of this.entities) if (e.type === "unit") {
      const stunned = (e.stunnedUntil ?? 0) > this.time;
      ctx.fillStyle = e.faction === "SBEU" ? "#a78bfa" : "#f87171";
      ctx.globalAlpha = stunned ? 0.6 : 1;
      ctx.beginPath(); ctx.arc(e.pos.x, e.pos.y, e.radius, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      drawHP(ctx, e);
    }

    ctx.restore();
  }
}

function drawHP(ctx: CanvasRenderingContext2D, e: Entity) {
  const w = 12, h = 2;
  const x = e.pos.x - w / 2, y = e.pos.y - (e.type === "building" ? 8 : e.radius + 6);
  ctx.fillStyle = "#111827"; ctx.fillRect(x, y, w, h);
  const p = Math.max(0, Math.min(1, e.hp / e.hpMax));
  ctx.fillStyle = p > 0.6 ? "#22c55e" : p > 0.3 ? "#eab308" : "#ef4444";
  ctx.fillRect(x, y, w * p, h);
}

function dist(a: Vec2, b: Vec2) { return Math.hypot(a.x - b.x, a.y - b.y); }