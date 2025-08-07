import { aStar } from "@engine/pathfinding";
import { Rect, Vec2 } from "@engine/math";
import { World } from "@engine/world";

export type ActionDef = {
  id: string;
  label: string;
  costRubles: number;
  costDollars: number;
  onClick: () => void;
};

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private world: World;
  private camera = { x: 0, y: 0, zoom: 1 };

  private mouse = { x: 0, y: 0, worldX: 0, worldY: 0, down: false };
  private selectionStart: Vec2 | null = null;
  private selectedIds = new Set<number>();
  private pendingAbility: { casterId: number; kind: "stunGrenade" | "aimedShot" | "throwGrenade" } | null = null;
  private buildPlacer: { typeId: string } | null = null;
  private groups: Record<number, number[]> = {};

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.world = new World(128, 128);
    this.world.spawnDemo();
    this.bindInput();
  }

  loadWorld(world: World) {
    this.world = world;
    this.selectedIds.clear();
    this.camera = { x: 0, y: 0, zoom: 1 };
    this.pendingAbility = null;
    this.buildPlacer = null;
  }

  private bindInput() {
    this.canvas.addEventListener("mousemove", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
      this.mouse.worldX = (this.mouse.x / this.camera.zoom) + this.camera.x;
      this.mouse.worldY = (this.mouse.y / this.camera.zoom) + this.camera.y;
    });
    this.canvas.addEventListener("mousedown", (e) => {
      if (e.button === 0) {
        this.mouse.down = true;
        this.selectionStart = { x: this.mouse.worldX, y: this.mouse.worldY };
      }
    });
    window.addEventListener("mouseup", (e) => {
      if (e.button === 0) {
        this.mouse.down = false;
        if (this.pendingAbility) {
          this.world.manualCastAbility(this.pendingAbility.casterId, this.pendingAbility.kind as any, { x: this.mouse.worldX, y: this.mouse.worldY });
          this.pendingAbility = null; this.selectionStart = null; return;
        }
        if (this.buildPlacer) {
          const ok = this.world.placeBuilding(this.world.playerFaction, this.buildPlacer.typeId, { x: this.mouse.worldX, y: this.mouse.worldY });
          this.buildPlacer = null; this.selectionStart = null; return;
        }
        this.commitSelection();
        this.selectionStart = null;
      }
    });

    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    this.canvas.addEventListener("mouseup", (e) => {
      if (e.button === 2) {
        if (this.pendingAbility || this.buildPlacer) { this.pendingAbility = null; this.buildPlacer = null; return; }
        const target = { x: this.mouse.worldX, y: this.mouse.worldY };
        this.world.issueMoveCommand([...this.selectedIds], target);
      }
    });

    window.addEventListener("keydown", (e) => {
      const speed = 32;
      if (e.key === "ArrowUp" || e.key === "w") this.camera.y -= speed;
      if (e.key === "ArrowDown" || e.key === "s") this.camera.y += speed;
      if (e.key === "ArrowLeft" || e.key === "a") this.camera.x -= speed;
      if (e.key === "ArrowRight" || e.key === "d") this.camera.x += speed;

      // Groups: Ctrl+1..9 assign; 1..9 select
      const digit = parseInt(e.key, 10);
      if (!isNaN(digit) && digit >= 1 && digit <= 9) {
        if (e.ctrlKey || e.metaKey) {
          this.groups[digit] = [...this.selectedIds];
        } else {
          const ids = this.groups[digit] || [];
          this.selectedIds = new Set(ids);
        }
      }

      // Ability hotkeys
      if (e.key.toLowerCase() === "q" || e.key.toLowerCase() === "w" || e.key.toLowerCase() === "e") {
        const sel = [...this.selectedIds].map(id => this.world.getEntityById(id)).find(u => u?.type === "unit" && u.abilities);
        if (sel && sel?.abilities) {
          if (e.key.toLowerCase() === "q" && sel.abilities.stunGrenade) this.pendingAbility = { casterId: sel.id, kind: "stunGrenade" };
          if (e.key.toLowerCase() === "w" && sel.abilities.aimedShot) this.pendingAbility = { casterId: sel.id, kind: "aimedShot" };
          if (e.key.toLowerCase() === "e" && sel.abilities.throwGrenade) this.pendingAbility = { casterId: sel.id, kind: "throwGrenade" };
        }
      }

      // Build hotkeys
      if (e.key.toLowerCase() === "b") { this.buildPlacer = { typeId: "stash" }; }
      if (e.key.toLowerCase() === "c") { this.buildPlacer = { typeId: "pmc-supply" }; }
    });

    this.canvas.addEventListener("wheel", (e) => {
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const before = this.screenToWorld(this.mouse.x, this.mouse.y);
      this.camera.zoom = Math.max(0.5, Math.min(2, this.camera.zoom * factor));
      const after = this.screenToWorld(this.mouse.x, this.mouse.y);
      this.camera.x += before.x - after.x;
      this.camera.y += before.y - after.y;
    }, { passive: true });
  }

  private screenToWorld(x: number, y: number): Vec2 { return { x: (x / this.camera.zoom) + this.camera.x, y: (y / this.camera.zoom) + this.camera.y }; }

  private commitSelection() {
    if (!this.selectionStart) {
      const hit = this.world.pickEntity(this.mouse.worldX, this.mouse.worldY);
      this.selectedIds.clear(); if (hit) this.selectedIds.add(hit.id); return;
    }
    const rect: Rect = Rect.fromPoints(this.selectionStart, { x: this.mouse.worldX, y: this.mouse.worldY });
    const ids = this.world.queryEntities(rect); this.selectedIds = new Set(ids);
  }

  update(dt: number) { this.world.update(dt); }

  render() {
    const { ctx } = this;
    ctx.save();
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-this.camera.x, -this.camera.y);

    this.world.render(ctx);

    if (this.mouse.down && this.selectionStart && !this.pendingAbility && !this.buildPlacer) {
      const x = Math.min(this.selectionStart.x, this.mouse.worldX);
      const y = Math.min(this.selectionStart.y, this.mouse.worldY);
      const w = Math.abs(this.selectionStart.x - this.mouse.worldX);
      const h = Math.abs(this.selectionStart.y - this.mouse.worldY);
      ctx.strokeStyle = "#60a5fa"; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
    }

    if (this.pendingAbility) { ctx.strokeStyle = "#f59e0b"; ctx.beginPath(); ctx.arc(this.mouse.worldX, this.mouse.worldY, 3, 0, Math.PI * 2); ctx.stroke(); }
    if (this.buildPlacer) { const t = this.buildPlacer.typeId; const ok = this.world.canPlaceBuilding(t, { x: this.mouse.worldX, y: this.mouse.worldY }); ctx.strokeStyle = ok ? "#22c55e" : "#ef4444"; ctx.lineWidth = 2; const r = this.world.buildingCatalog[t].radius; ctx.strokeRect(this.mouse.worldX - r, this.mouse.worldY - r, r * 2, r * 2); }

    for (const id of this.selectedIds) { const e = this.world.getEntityById(id); if (!e) continue; ctx.strokeStyle = "#34d399"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(e.pos.x, e.pos.y, e.radius + 2, 0, Math.PI * 2); ctx.stroke(); }

    ctx.restore();
  }

  getUIState() {
    const s = this.world.getEconomy();
    const selected = [...this.selectedIds].map((id) => this.world.getEntityById(id)).filter(Boolean);
    const inspector = selected.length === 1 ? `${selected[0]!.name} (HP ${Math.ceil(selected[0]!.hp)})` : selected.length > 1 ? `${selected.length} юнитов` : "—";

    const actions: ActionDef[] = [];
    if (selected.length === 1 && selected[0]!.type === "building") {
      const b = selected[0]!;
      for (const train of this.world.getTrainableUnits(b.faction, b.tier)) actions.push({ id: `train:${train.id}`, label: `Нанять ${train.label}`, costRubles: train.costRubles, costDollars: train.costDollars, onClick: () => this.world.queueTrain(b.id, train.id) });
      if (b.faction === this.world.playerFaction) {
        const bt = this.world.buildingCatalog["stash"]; actions.push({ id: "build:stash", label: `Построить ${bt.label} (B)`, costRubles: bt.costRubles, costDollars: bt.costDollars, onClick: () => { this.buildPlacer = { typeId: "stash" }; } });
        const sc = this.world.buildingCatalog["pmc-supply"]; actions.push({ id: "build:pmc", label: `Построить ${sc.label} (C)`, costRubles: sc.costRubles, costDollars: sc.costDollars, onClick: () => { this.buildPlacer = { typeId: "pmc-supply" }; } });
      }
    }

    if (selected.length === 1 && selected[0]!.type === "unit") {
      const u = selected[0]!;
      if (u.faction === this.world.playerFaction) {
        const bt = this.world.buildingCatalog["stash"]; actions.push({ id: "build:stash", label: `Построить ${bt.label} (B)`, costRubles: bt.costRubles, costDollars: bt.costDollars, onClick: () => { this.buildPlacer = { typeId: "stash" }; } });
        const sc = this.world.buildingCatalog["pmc-supply"]; actions.push({ id: "build:pmc", label: `Построить ${sc.label} (C)`, costRubles: sc.costRubles, costDollars: sc.costDollars, onClick: () => { this.buildPlacer = { typeId: "pmc-supply" }; } });
      }
      if (u.abilities) {
        if (u.abilities.stunGrenade) actions.push({ id: `ab:stun:${u.id}`, label: "Оглушающая граната (Q)", costRubles: 0, costDollars: 0, onClick: () => { this.pendingAbility = { casterId: u.id, kind: "stunGrenade" }; } });
        if (u.abilities.aimedShot) actions.push({ id: `ab:aim:${u.id}`, label: "Прицельный выстрел (W)", costRubles: 0, costDollars: 0, onClick: () => { this.pendingAbility = { casterId: u.id, kind: "aimedShot" }; } });
        if (u.abilities.throwGrenade) actions.push({ id: `ab:nade:${u.id}`, label: "Кинуть гранату (E)", costRubles: 0, costDollars: 0, onClick: () => { this.pendingAbility = { casterId: u.id, kind: "throwGrenade" }; } });
      }
    }

    return { rubles: s.rubles, dollars: s.dollars, selectedCount: selected.length, inspector, objective: (this.world as any).objectiveText as string | undefined, supply: `${this.world.economy.supplyUsed}/${this.world.economy.supplyCap}`, actions };
  }
}