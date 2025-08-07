import { World, Faction } from "@engine/world";

export type Mission = {
  id: string;
  name: string;
  faction: Faction; // player faction
  setup: (w: World) => void;
};

export type Campaign = { id: string; name: string; missions: Mission[] };

function spawnWave(w: World, faction: Faction, at: { x: number; y: number }, comp: Array<{ unitId: string; count: number }>) {
  for (const part of comp) {
    for (let i = 0; i < part.count; i++) w.spawnUnit(faction, { x: at.x + (Math.random() * 6 - 3), y: at.y + (Math.random() * 6 - 3) }, part.unitId);
  }
}

// Common helpers
function destroyAllEnemiesWin(w: World, player: Faction) {
  w.objectiveText = "Уничтожьте все силы противника";
  w.winCondition = (world) => world.entities.every(e => e.faction === player || e.faction === "NEUTRAL");
}

function surviveForMinutes(w: World, minutes: number) {
  const target = minutes * 60;
  w.objectiveText = `Продержитесь ${minutes} минут`;
  w.winCondition = (world) => world.time >= target;
}

function gatherResources(w: World, rubles: number, dollars: number) {
  w.objectiveText = `Накопите ресурсы: ₽${rubles} и $${dollars}`;
  w.winCondition = (world) => world.getEconomy().rubles >= rubles && world.getEconomy().dollars >= dollars;
}

export const campaigns: Record<string, Campaign> = {
  SBEU: {
    id: "SBEU",
    name: "Кампания СБЭУ",
    missions: [
      {
        id: "sbeu-1",
        name: "Инструктаж зверинца",
        faction: "SBEU",
        setup: (w) => {
          w.playerFaction = "SBEU";
          w.spawnDemo();
          w.objectiveText = "Выделяйте юнитов и отдавайте приказы. Постройте пару бойцов";
          w.onUpdateExtra = (world, dt) => {};
          w.winCondition = (world) => world.entities.filter(e => e.faction === "SBEU" && e.type === "unit").length >= 10;
        },
      },
      {
        id: "sbeu-2",
        name: "Отбить ресурсные точки",
        faction: "SBEU",
        setup: (w) => {
          w.playerFaction = "SBEU";
          w.spawnDemo();
          for (const r of w.entities.filter(e => e.type === "resource")) {
            spawnWave(w, "PMС", { x: r.pos.x + 6, y: r.pos.y + 6 }, [{ unitId: "pmc-typok", count: 3 }]);
          }
          w.objectiveText = "Очистите окрестности ресурсов";
          w.winCondition = (world) => world.entities.every(e => !(e.faction === "PMС" && e.type === "unit"));
        },
      },
      {
        id: "sbeu-3",
        name: "Штурм укрепточки",
        faction: "SBEU",
        setup: (w) => {
          w.playerFaction = "SBEU";
          w.spawnDemo();
          spawnWave(w, "PMС", { x: 92, y: 86 }, [{ unitId: "pmc-silach", count: 3 }, { unitId: "pmc-sniper", count: 2 }]);
          destroyAllEnemiesWin(w, "SBEU");
        },
      },
      {
        id: "sbeu-4",
        name: "Накопить на штурм",
        faction: "SBEU",
        setup: (w) => {
          w.playerFaction = "SBEU";
          w.spawnDemo();
          gatherResources(w, 1000, 300);
          let t = 0; w.onUpdateExtra = (world, dt) => { t += dt; if (t > 20) { t = 0; spawnWave(world, "PMС", { x: 88, y: 92 }, [{ unitId: "pmc-typok", count: 4 }, { unitId: "pmc-grenade", count: 1 }]); } };
        },
      },
      {
        id: "sbeu-5",
        name: "Штурм водоочистной",
        faction: "SBEU",
        setup: (w) => {
          w.playerFaction = "SBEU";
          w.spawnDemo();
          spawnWave(w, "PMС", { x: 94, y: 84 }, [{ unitId: "pmc-silach", count: 4 }, { unitId: "pmc-sniper", count: 2 }, { unitId: "pmc-tank", count: 1 }]);
          destroyAllEnemiesWin(w, "SBEU");
        },
      },
    ],
  },
  PMC: {
    id: "PMC",
    name: "Кампания ЧВК",
    missions: [
      {
        id: "pmc-1",
        name: "Прибытие Зубешко",
        faction: "PMС",
        setup: (w) => {
          w.playerFaction = "PMС";
          w.spawnDemo();
          w.objectiveText = "Инструктаж по механикам ЧВК";
          w.winCondition = (world) => world.entities.filter(e => e.faction === "PMС" && e.type === "unit").length >= 8;
        },
      },
      {
        id: "pmc-2",
        name: "Оборона укрепления A",
        faction: "PMС",
        setup: (w) => {
          w.playerFaction = "PMС";
          w.spawnDemo();
          surviveForMinutes(w, 3);
          let t = 0; w.onUpdateExtra = (world, dt) => { t += dt; if (t > 15) { t = 0; spawnWave(world, "SBEU", { x: 60, y: 30 }, [{ unitId: "sbeu-worm", count: 6 }, { unitId: "sbeu-caterpillar", count: 2 }]); } };
        },
      },
      {
        id: "pmc-3",
        name: "Оборона укрепления B",
        faction: "PMС",
        setup: (w) => {
          w.playerFaction = "PMС";
          w.spawnDemo();
          surviveForMinutes(w, 4);
          let t = 0; w.onUpdateExtra = (world, dt) => { t += dt; if (t > 18) { t = 0; spawnWave(world, "SBEU", { x: 66, y: 52 }, [{ unitId: "sbeu-cockroach", count: 3 }, { unitId: "sbeu-cicada", count: 2 }]); } };
        },
      },
      {
        id: "pmc-4",
        name: "Предательство Пуссильченко",
        faction: "PMС",
        setup: (w) => {
          w.playerFaction = "PMС";
          w.spawnDemo();
          surviveForMinutes(w, 5);
          let t = 0; w.onUpdateExtra = (world, dt) => { t += dt; if (t > 20) { t = 0; spawnWave(world, "SBEU", { x: 70, y: 46 }, [{ unitId: "sbeu-worm", count: 6 }, { unitId: "sbeu-cockroach", count: 4 }, { unitId: "sbeu-turtle", count: 1 }]); } };
        },
      },
      {
        id: "pmc-5",
        name: "Контрнаступление",
        faction: "PMС",
        setup: (w) => {
          w.playerFaction = "PMС";
          w.spawnDemo();
          destroyAllEnemiesWin(w, "PMС");
        },
      },
    ],
  },
};

export function createMissionWorld(campaignId: keyof typeof campaigns, missionIndex: number): World {
  const c = campaigns[campaignId];
  const m = c.missions[missionIndex];
  const w = new World(128, 128);
  w.playerFaction = m.faction;
  m.setup(w);
  return w;
}