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
  // Construction
  buildingType?: string;
  underConstruction?: boolean;
  constructRemaining?: number;
  supplyBonus?: number;
  // Worker harvesting (SBEU)
  carryRubles?: number;
  carryCapacity?: number;
  harvestCooldown?: number;
  // Unit meta
  supplyCost?: number;
};

export type Economy = { rubles: number; dollars: number; supplyCap: number; supplyUsed: number };

export type Trainable = { id: string; label: string; costRubles: number; costDollars: number; buildTime: number; tier: 1 | 2 | 3; supplyCost: number };

type Effect =
  | { kind: "explosion"; pos: Vec2; fuse: number; radius: number; damage: number; faction: Faction }
  | { kind: "stun"; pos: Vec2; fuse: number; radius: number; duration: number };

export class World {
  width: number; height: number; tileSize = 16;
  nav: GridNav;
  entities: Entity[] = [];
  effects: Effect[] = [];
  economy: Economy = { rubles: 500, dollars: 200, supplyCap: 10, supplyUsed: 0 };
  time = 0;
  playerFaction: Faction = "SBEU";

  objectiveText: string = "Песочница";
  onUpdateExtra?: (w: World, dt: number) => void;
  winCondition?: (w: World) => boolean;
  loseCondition?: (w: World) => boolean;

  catalog: Record<string, Trainable> = {
    // SBEU
    "sbeu-worker": { id: "sbeu-worker", label: "Дикий (рабочий)", costRubles: 50, costDollars: 0, buildTime: 4, tier: 1, supplyCost: 1 },
    "sbeu-worm": { id: "sbeu-worm", label: "СБЭУ-Червь", costRubles: 50, costDollars: 0, buildTime: 6, tier: 1, supplyCost: 1 },
    "sbeu-caterpillar": { id: "sbeu-caterpillar", label: "СБЭУ-Гусеница", costRubles: 75, costDollars: 0, buildTime: 7, tier: 1, supplyCost: 1 },
    "sbeu-cockroach": { id: "sbeu-cockroach", label: "СБЭУ-Таракан", costRubles: 125, costDollars: 25, buildTime: 10, tier: 2, supplyCost: 2 },
    "sbeu-cicada": { id: "sbeu-cicada", label: "СБЭУ-Цикада", costRubles: 100, costDollars: 50, buildTime: 12, tier: 2, supplyCost: 2 },
    "sbeu-turtle": { id: "sbeu-turtle", label: "СБЭУ-Черепаха", costRubles: 250, costDollars: 100, buildTime: 20, tier: 3, supplyCost: 3 },
    // PMC
    "pmc-typok": { id: "pmc-typok", label: "Типок", costRubles: 50, costDollars: 0, buildTime: 6, tier: 1, supplyCost: 1 },
    "pmc-silach": { id: "pmc-silach", label: "Силач", costRubles: 100, costDollars: 0, buildTime: 9, tier: 2, supplyCost: 2 },
    "pmc-sniper": { id: "pmc-sniper", label: "Снайпер", costRubles: 125, costDollars: 50, buildTime: 12, tier: 2, supplyCost: 2 },
    "pmc-grenade": { id: "pmc-grenade", label: "Грената", costRubles: 100, costDollars: 75, buildTime: 14, tier: 2, supplyCost: 2 },
    "pmc-tank": { id: "pmc-tank", label: "Танк", costRubles: 300, costDollars: 150, buildTime: 25, tier: 3, supplyCost: 4 },
  };

  buildingCatalog: Record<string, { id: string; label: string; costRubles: number; costDollars: number; buildTime: number; radius: number; supplyBonus?: number } > = {
    "stash": { id: "stash", label: "Ячейка схрона", costRubles: 100, costDollars: 0, buildTime: 8, radius: 4, supplyBonus: 8 },
  };

  constructor(width: number, height: number) {
    this.width = width; this.height = height; this.nav = new GridNav(width, height);
  }

  private blockTilesForCircle(center: Vec2, radius: number, blocked = true) {
    const r = Math.ceil(radius);
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const gx = Math.floor(center.x + x), gy = Math.floor(center.y + y);
      if ((x * x + y * y) <= r * r) this.nav.setBlocked(gx, gy, blocked);
    }
  }

  canPlaceBuilding(typeId: string, pos: Vec2): boolean {
    const t = this.buildingCatalog[typeId]; if (!t) return false;
    const r = t.radius + 1;
    // Check tiles free
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const gx = Math.floor(pos.x + x), gy = Math.floor(pos.y + y);
      if ((x * x + y * y) <= r * r) {
        if (!this.nav.inBounds(gx, gy) || !this.nav.isWalkable(gx, gy)) return false;
      }
    }
    // No overlap with entities
    for (const e of this.entities) {
      const d = Math.hypot(e.pos.x - pos.x, e.pos.y - pos.y);
      if (d < e.radius + t.radius + 1) return false;
    }
    return true;
  }

  placeBuilding(faction: Faction, typeId: string, pos: Vec2): Entity | null {
    const t = this.buildingCatalog[typeId]; if (!t) return null;
    if (!this.canPlaceBuilding(typeId, pos)) return null;
    if (this.economy.rubles < t.costRubles || this.economy.dollars < t.costDollars) return null;
    this.economy.rubles -= t.costRubles; this.economy.dollars -= t.costDollars;
    const b: Entity = {
      id: NEXT_ID++, name: t.label, type: "building", faction, pos: { ...pos }, radius: t.radius,
      hp: 800, hpMax: 800, tier: 1, buildingType: typeId, underConstruction: true, constructRemaining: t.buildTime, supplyBonus: t.supplyBonus,
    };
    this.entities.push(b);
    // Reserve tiles immediately
    this.blockTilesForCircle(b.pos, b.radius + 1, true);
    return b;
  }

  spawnDemo() {
    const base: Entity = {
      id: NEXT_ID++, name: "Улей", type: "building", faction: "SBEU",
      pos: { x: 40, y: 40 }, radius: 6, hp: 1500, hpMax: 1500, tier: 1, trainQueue: [], garrison: 0,
    };
    this.entities.push(base);
    this.blockTilesForCircle(base.pos, base.radius + 1);

    for (let i = 0; i < 6; i++) {
      const w = this.spawnUnit("SBEU", { x: 52 + i * 2, y: 40 }, "sbeu-worker");
      w.carryRubles = 0; w.carryCapacity = 15; w.harvestCooldown = 0;
    }

    for (let i = 0; i < 12; i++) { const r = this.spawnResource({ x: 70 + (i % 6) * 3, y: 32 + Math.floor(i / 6) * 3 }, "rubles", 1500); this.blockTilesForCircle(r.pos, r.radius + 1); }
    for (let i = 0; i < 8; i++) { const r = this.spawnResource({ x: 64 + (i % 4) * 3, y: 48 + Math.floor(i / 4) * 3 }, "dollars", 800); this.blockTilesForCircle(r.pos, r.radius + 1); }

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
      hp: 100, hpMax: 100, moveSpeed: 7, supplyCost: t.supplyCost,
      attack: { range: 8, damage: 6, cooldown: 1, cd: 0 },
    };
    if (unitId === "sbeu-turtle" || unitId === "pmc-tank") {
      e.radius = 4; e.hp = 260; e.hpMax = 260; e.moveSpeed = 4; e.attack = { range: 10, damage: 14, cooldown: 1.5, cd: 0, splash: unitId === "pmc-tank" ? 2.5 : undefined };
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
    // Formation offsets in rings
    const offsets: Vec2[] = [];
    const spacing = 2.5;
    const count = ids.length;
    let ring = 0; let placed = 0;
    while (placed < count) {
      const ringCount = Math.max(6, ring * 8);
      for (let i = 0; i < ringCount && placed < count; i++) {
        const angle = (i / ringCount) * Math.PI * 2;
        const radius = spacing * (ring + 1);
        offsets.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
        placed++;
      }
      ring++;
    }
    const goal = { x: Math.floor(target.x), y: Math.floor(target.y) };
    ids.forEach((id, idx) => {
      const e = this.getEntityById(id);
      if (!e || e.type !== "unit" || !e.moveSpeed) return;
      const start = { x: Math.floor(e.pos.x), y: Math.floor(e.pos.y) };
      const g = { x: goal.x + Math.floor(offsets[idx].x), y: goal.y + Math.floor(offsets[idx].y) };
      const path = aStar(this.nav, start, g);
      e.path = path; e.pathIndex = 0; e.targetPos = { ...g };
    });
  }

  getEconomy() {
    // Compute supply used by alive units of player faction
    let used = 0;
    for (const e of this.entities) if (e.type === "unit" && e.faction === this.playerFaction) used += e.supplyCost ?? 0;
    this.economy.supplyUsed = used;
    return this.economy;
  }

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
    const { supplyUsed, supplyCap } = this.getEconomy();
    if (supplyUsed + t.supplyCost > supplyCap) return;
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
        this.spawnUnit(b.faction, { x: b.pos.x + 8 + Math.random() * 4, y: b.pos.y + (Math.random() * 6 - 3) }, current);
      }
    }
  }

  private harvestAndIncome(dt: number) {
    // SBEU workers: harvest rubles with carry, return to "Улей"
    for (const e of this.entities) {
      if (e.type === "unit" && e.faction === "SBEU" && e.name.includes("Дикий")) {
        e.harvestCooldown = Math.max(0, (e.harvestCooldown ?? 0) - dt);
        const base = this.entities.find(b => b.type === "building" && b.faction === "SBEU" && b.name === "Улей");
        const res = this.entities.find(r => r.type === "resource" && r.resource?.kind === "rubles" && (r.resource!.amount > 0) && dist(e.pos, r.pos) < 10);
        if ((e.carryRubles ?? 0) >= (e.carryCapacity ?? 15)) {
          if (base) {
            const d = dist(e.pos, base.pos);
            if (d > 6) this.issueMoveCommand([e.id], base.pos);
            else { this.economy.rubles += e.carryRubles ?? 0; e.carryRubles = 0; }
          }
        } else if (res) {
          if (e.harvestCooldown === 0) {
            const take = Math.min(2, res.resource!.amount);
            res.resource!.amount -= take; e.carryRubles = (e.carryRubles ?? 0) + take; e.harvestCooldown = 1;
          }
        } else {
          // Move to nearest rubles
          const nearest = this.entities.filter(r => r.type === "resource" && r.resource?.kind === "rubles" && r.resource.amount > 0)
            .sort((a, b) => dist(e.pos, a.pos) - dist(e.pos, b.pos))[0];
          if (nearest) this.issueMoveCommand([e.id], nearest.pos);
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
      // Keep auto-casts simple: if enemy in range then act
      const enemy = this.entities.find(o => o.faction !== e.faction && o.faction !== "NEUTRAL" && o.hp > 0);
      if (!enemy) continue;
      const d = dist(e.pos, enemy.pos);
      if (e.abilities.stunGrenade) {
        const a = e.abilities.stunGrenade; a.cd = Math.max(0, a.cd - dt);
        if (a.cd === 0 && d <= a.range) { this.effects.push({ kind: "stun", pos: { ...enemy.pos }, fuse: 0.1, radius: a.radius, duration: a.duration }); a.cd = a.cooldown; }
      }
      if (e.abilities.aimedShot) {
        const a = e.abilities.aimedShot; a.cd = Math.max(0, a.cd - dt);
        if (a.cd === 0 && e.attack && d <= e.attack.range) { enemy.hp -= a.bonusDamage; a.cd = a.cooldown; }
      }
      if (e.abilities.throwGrenade) {
        const a = e.abilities.throwGrenade; a.cd = Math.max(0, a.cd - dt);
        if (a.cd === 0 && d <= a.range) { this.effects.push({ kind: "explosion", pos: { ...enemy.pos }, fuse: a.fuse, radius: a.radius, damage: a.damage, faction: e.faction }); a.cd = a.cooldown; }
      }
    }
  }

  manualCastAbility(casterId: number, kind: keyof NonNullable<Entity["abilities"]>, target: Vec2) {
    const e = this.getEntityById(casterId); if (!e || e.type !== "unit" || !e.abilities) return;
    if (kind === "stunGrenade" && e.abilities.stunGrenade) {
      const a = e.abilities.stunGrenade; if (a.cd === 0) { this.effects.push({ kind: "stun", pos: { ...target }, fuse: 0.05, radius: a.radius, duration: a.duration }); a.cd = a.cooldown; }
    }
    if (kind === "aimedShot" && e.abilities.aimedShot) {
      const a = e.abilities.aimedShot; if (a.cd === 0) { const enemy = this.entities.find(o => o.faction !== e.faction && o.faction !== "NEUTRAL" && dist(o.pos, target) < 4); if (enemy) enemy.hp -= a.bonusDamage; a.cd = a.cooldown; }
    }
    if (kind === "throwGrenade" && e.abilities.throwGrenade) {
      const a = e.abilities.throwGrenade; if (a.cd === 0) { this.effects.push({ kind: "explosion", pos: { ...target }, fuse: a.fuse, radius: a.radius, damage: a.damage, faction: e.faction }); a.cd = a.cooldown; }
    }
  }

  update(dt: number) {
    this.time += dt;

    // Separation: simple repulsion between allies
    for (const e of this.entities) {
      if (e.type !== "unit" || !e.moveSpeed) continue;
      let rx = 0, ry = 0; let cnt = 0;
      for (const o of this.entities) {
        if (o === e || o.type !== "unit" || o.faction !== e.faction) continue;
        const dx = e.pos.x - o.pos.x, dy = e.pos.y - o.pos.y; const d2 = dx*dx + dy*dy;
        const minDist = (e.radius + o.radius + 1);
        if (d2 < minDist*minDist && d2 > 0.0001) { const d = Math.sqrt(d2); rx += dx / d; ry += dy / d; cnt++; }
      }
      if (cnt) { const s = 2.0; e.pos.x += (rx / cnt) * s * dt; e.pos.y += (ry / cnt) * s * dt; }
    }

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
        else { const nx = dx / (d || 1), ny = dy / (d || 1); e.pos.x += nx * e.moveSpeed * dt; e.pos.y += ny * e.moveSpeed * dt; }
      }
    }

    // Abilities
    this.useAbilities(dt);

    // Simple combat
    for (const e of this.entities) {
      if (!e.attack) continue;
      if ((e.stunnedUntil ?? 0) > this.time) { e.attack.cd = Math.max(0, e.attack.cd - dt); continue; }
      e.attack.cd = Math.max(0, e.attack.cd - dt);
      const enemy = this.entities.find(o => o.faction !== e.faction && o.faction !== "NEUTRAL" && o.hp > 0 && dist(e.pos, o.pos) <= e.attack!.range);
      if (enemy && e.attack.cd <= 0) {
        enemy.hp -= e.attack.damage;
        if (e.attack.splash) {
          for (const other of this.entities) {
            if (other === enemy) continue;
            if (other.faction === e.faction || other.faction === "NEUTRAL") continue;
            if (dist(other.pos, enemy.pos) <= e.attack.splash) other.hp -= Math.max(1, Math.floor(e.attack.damage * 0.4));
          }
        }
        e.attack.cd = e.attack.cooldown;
      }
    }

    // Effects
    this.updateEffects(dt);

    // Construction progress
    for (const b of this.entities) {
      if (b.type === "building" && b.underConstruction) {
        b.constructRemaining = Math.max(0, (b.constructRemaining ?? 0) - dt);
        if (b.constructRemaining === 0) {
          b.underConstruction = false;
          if (b.supplyBonus) this.economy.supplyCap += b.supplyBonus;
        }
      }
    }

    // Cleanup dead
    this.entities = this.entities.filter(e => e.hp > 0 || e.type === "resource");

    // Economy
    this.processTraining(dt);
    this.harvestAndIncome(dt);

    // Scenario hooks
    if (this.onUpdateExtra) this.onUpdateExtra(this, dt);
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 1;
    for (let y = 0; y <= this.height; y += 8) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.width, y); ctx.stroke(); }
    for (let x = 0; x <= this.width; x += 8) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.height); ctx.stroke(); }

    for (const fx of this.effects) {
      if (fx.kind === "explosion") { ctx.strokeStyle = "rgba(239,68,68,0.6)"; ctx.beginPath(); ctx.arc(fx.pos.x, fx.pos.y, fx.radius, 0, Math.PI * 2); ctx.stroke(); }
      else if (fx.kind === "stun") { ctx.strokeStyle = "rgba(96,165,250,0.6)"; ctx.beginPath(); ctx.arc(fx.pos.x, fx.pos.y, fx.radius, 0, Math.PI * 2); ctx.stroke(); }
    }

    for (const e of this.entities) if (e.type === "resource") { ctx.fillStyle = e.resource!.kind === "rubles" ? "#3b82f6" : "#22c55e"; ctx.beginPath(); ctx.arc(e.pos.x, e.pos.y, 2.5, 0, Math.PI * 2); ctx.fill(); }

    for (const e of this.entities) if (e.type === "building") {
      ctx.fillStyle = e.faction === "SBEU" ? "#9333ea" : "#ef4444";
      ctx.fillRect(e.pos.x - e.radius, e.pos.y - e.radius, e.radius * 2, e.radius * 2);
      if (e.underConstruction) { ctx.fillStyle = "rgba(248,113,113,0.3)"; ctx.fillRect(e.pos.x - e.radius, e.pos.y - e.radius, e.radius * 2, e.radius * 2); }
      drawHP(ctx, e);
    }

    for (const e of this.entities) if (e.type === "unit") {
      const stunned = (e.stunnedUntil ?? 0) > this.time;
      ctx.fillStyle = e.faction === "SBEU" ? "#a78bfa" : "#f87171";
      ctx.globalAlpha = stunned ? 0.6 : 1;
      ctx.beginPath(); ctx.arc(e.pos.x, e.pos.y, e.radius, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; drawHP(ctx, e);
    }

    ctx.restore();
  }
}

function drawHP(ctx: CanvasRenderingContext2D, e: Entity) {
  const w = 12, h = 2; const x = e.pos.x - w / 2, y = e.pos.y - (e.type === "building" ? e.radius + 4 : e.radius + 6);
  ctx.fillStyle = "#111827"; ctx.fillRect(x, y, w, h);
  const p = Math.max(0, Math.min(1, e.hp / e.hpMax));
  ctx.fillStyle = p > 0.6 ? "#22c55e" : p > 0.3 ? "#eab308" : "#ef4444"; ctx.fillRect(x, y, w * p, h);
}

function dist(a: Vec2, b: Vec2) { return Math.hypot(a.x - b.x, a.y - b.y); }