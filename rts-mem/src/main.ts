import { Game } from "@engine/game";
import { createMissionWorld, campaigns } from "@game/campaigns";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

function fitCanvasToWindow() {
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

fitCanvasToWindow();
window.addEventListener("resize", fitCanvasToWindow);

const game = new Game(canvas, ctx);

// Campaign state
let currentCampaign: keyof typeof campaigns = "SBEU";
let currentMissionIndex = 0;

function loadMission() {
  game.loadWorld(createMissionWorld(currentCampaign, currentMissionIndex));
}
loadMission();

let last = performance.now();
function frame(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.update(dt);
  game.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Bind HUD
const rublesEl = document.getElementById("rubles")!;
const dollarsEl = document.getElementById("dollars")!;
const selectedEl = document.getElementById("selected")!;
const inspectorEl = document.getElementById("inspector")!;
const actionsEl = document.getElementById("actions")!;

function syncUI() {
  const s = game.getUIState();
  rublesEl.textContent = String(s.rubles);
  dollarsEl.textContent = String(s.dollars);
  selectedEl.textContent = String(s.selectedCount);
  inspectorEl.textContent = s.inspector + (s.objective ? ` | Цель: ${s.objective}` : "");

  actionsEl.innerHTML = "";
  // Mission control buttons
  addBtn(`Кампания: ${currentCampaign}`, () => { currentCampaign = currentCampaign === "SBEU" ? "PMC" : "SBEU"; currentMissionIndex = 0; loadMission(); });
  addBtn(`Миссия ${currentMissionIndex + 1}/5`, () => { currentMissionIndex = (currentMissionIndex + 1) % 5; loadMission(); });

  for (const action of s.actions) {
    const btn = document.createElement("div");
    btn.className = "btn";
    btn.textContent = `${action.label} (${action.costRubles}₽/${action.costDollars}$)`;
    btn.onclick = () => action.onClick();
    actionsEl.appendChild(btn);
  }
}

function addBtn(label: string, onClick: () => void) {
  const btn = document.createElement("div");
  btn.className = "btn";
  btn.textContent = label;
  btn.onclick = onClick;
  actionsEl.appendChild(btn);
}

setInterval(syncUI, 120);