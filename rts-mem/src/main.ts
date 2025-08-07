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

// Screens
const mainMenu = document.getElementById("mainMenu")!;
const missionMenu = document.getElementById("missionMenu")!;
const resultMenu = document.getElementById("resultMenu")!;
const missionCampaignTitle = document.getElementById("missionCampaignTitle")!;
const missionButtons = document.getElementById("missionButtons")!;

let currentCampaign: keyof typeof campaigns = "SBEU";
let currentMissionIndex = 0;

function show(el: HTMLElement) { el.style.display = "flex"; }
function hide(el: HTMLElement) { el.style.display = "none"; }

function goMainMenu() {
  show(mainMenu); hide(missionMenu); hide(resultMenu);
}
function goMissionMenu(campId: keyof typeof campaigns) {
  currentCampaign = campId; missionCampaignTitle.textContent = campaigns[campId].name;
  missionButtons.innerHTML = "";
  campaigns[campId].missions.forEach((m, i) => {
    const b = document.createElement("div"); b.className = "btn"; b.textContent = `${i + 1}. ${m.name}`; b.onclick = () => startMission(campId, i);
    missionButtons.appendChild(b);
  });
  hide(mainMenu); show(missionMenu); hide(resultMenu);
}
function startMission(campId: keyof typeof campaigns, idx: number) {
  currentCampaign = campId; currentMissionIndex = idx;
  game.loadWorld(createMissionWorld(campId, idx));
  hide(mainMenu); hide(missionMenu); hide(resultMenu);
}
function restartMission() { startMission(currentCampaign, currentMissionIndex); }

// Bind main menu
(document.getElementById("btnPlaySBEU") as HTMLDivElement).onclick = () => goMissionMenu("SBEU");
(document.getElementById("btnPlayPMC") as HTMLDivElement).onclick = () => goMissionMenu("PMC");
(document.getElementById("btnSandbox") as HTMLDivElement).onclick = () => { startMission("SBEU", 0); };
(document.getElementById("btnBackToMain") as HTMLDivElement).onclick = () => goMainMenu();
(document.getElementById("btnRestart") as HTMLDivElement).onclick = () => restartMission();
(document.getElementById("btnMissionSelect") as HTMLDivElement).onclick = () => goMissionMenu(currentCampaign);
(document.getElementById("btnMainMenu") as HTMLDivElement).onclick = () => goMainMenu();

goMainMenu();

let last = performance.now();
function frame(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.update(dt);
  game.render();

  // Check result
  const state = (game as any).getWorldState ? (game as any).getWorldState() : (game as any).world?.getState?.();
  if (state === "victory" || state === "defeat") {
    const title = document.getElementById("resultTitle")!;
    title.textContent = state === "victory" ? "Победа!" : "Поражение";
    show(resultMenu);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// HUD
const rublesEl = document.getElementById("rubles")!;
const dollarsEl = document.getElementById("dollars")!;
const supplyEl = document.getElementById("supply")!;
const selectedEl = document.getElementById("selected")!;
const inspectorEl = document.getElementById("inspector")!;
const actionsEl = document.getElementById("actions")!;

function syncUI() {
  const s = game.getUIState();
  rublesEl.textContent = String(s.rubles);
  dollarsEl.textContent = String(s.dollars);
  supplyEl.textContent = s.supply ?? "0/0";
  selectedEl.textContent = String(s.selectedCount);
  inspectorEl.textContent = s.inspector + (s.objective ? ` | Цель: ${s.objective}` : "");

  actionsEl.innerHTML = "";
  // Mission control buttons are moved to menus
  for (const action of s.actions) {
    const btn = document.createElement("div");
    btn.className = "btn";
    btn.textContent = `${action.label} (${action.costRubles}₽/${action.costDollars}$)`;
    btn.onclick = () => action.onClick();
    actionsEl.appendChild(btn);
  }
}
setInterval(syncUI, 120);