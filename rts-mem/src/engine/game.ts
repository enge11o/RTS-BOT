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
        this.commitSelection();
        this.selectionStart = null;
      }
    });

    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    this.canvas.addEventListener("mouseup", (e) => {
      if (e.button === 2) {
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

  private screenToWorld(x: number, y: number): Vec2 {
    return { x: (x / this.camera.zoom) + this.camera.x, y: (y / this.camera.zoom) + this.camera.y };
  }

  private commitSelection() {
    if (!this.selectionStart) {
      const hit = this.world.pickEntity(this.mouse.worldX, this.mouse.worldY);
      this.selectedIds.clear();
      if (hit) this.selectedIds.add(hit.id);
      return;
    }
    const rect: Rect = Rect.fromPoints(this.selectionStart, { x: this.mouse.worldX, y: this.mouse.worldY });
    const ids = this.world.queryEntities(rect);
    this.selectedIds = new Set(ids);
  }

  update(dt: number) {
    this.world.update(dt);
  }

  render() {
    const { ctx } = this;
    ctx.save();
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-this.camera.x, -this.camera.y);

    this.world.render(ctx);

    if (this.mouse.down && this.selectionStart) {
      const x = Math.min(this.selectionStart.x, this.mouse.worldX);
      const y = Math.min(this.selectionStart.y, this.mouse.worldY);
      const w = Math.abs(this.selectionStart.x - this.mouse.worldX);
      const h = Math.abs(this.selectionStart.y - this.mouse.worldY);
      ctx.strokeStyle = "#60a5fa";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);
    }

    for (const id of this.selectedIds) {
      const e = this.world.getEntityById(id);
      if (!e) continue;
      ctx.strokeStyle = "#34d399";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.pos.x, e.pos.y, e.radius + 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  getUIState() {
    const s = this.world.getEconomy();
    const selected = [...this.selectedIds].map((id) => this.world.getEntityById(id)).filter(Boolean);
    const inspector = selected.length === 1 ? `${selected[0]!.name} (HP ${Math.ceil(selected[0]!.hp)})` : selected.length > 1 ? `${selected.length} юнитов` : "—";

    const actions: ActionDef[] = [];
    if (selected.length === 1 && selected[0]!.type === "building") {
      const b = selected[0]!;
      for (const train of this.world.getTrainableUnits(b.faction, b.tier)) {
        actions.push({
          id: `train:${train.id}`,
          label: `Нанять ${train.label}`,
          costRubles: train.costRubles,
          costDollars: train.costDollars,
          onClick: () => this.world.queueTrain(b.id, train.id),
        });
      }
    }

    return {
      rubles: s.rubles,
      dollars: s.dollars,
      selectedCount: selected.length,
      inspector,
      objective: (this.world as any).objectiveText as string | undefined,
      actions,
    };
  }
}