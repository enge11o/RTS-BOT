// --- ИНИЦИАЛИЗАЦИЯ И DOM ЭЛЕМЕНТЫ ---
const tg = window.Telegram.WebApp;
const BASE_PRESTIGE_COST = 1e6; // Базовая стоимость перерождения - 1 миллион

// DOM Элементы
const scoreElement = document.getElementById('score');
const shevronsDisplay = document.getElementById('shevrons-display');
const shevronsElement = document.getElementById('shevrons');
const autoClickPowerElement = document.getElementById('auto-click-power');
const boostIndicator = document.getElementById('boost-indicator');
const clickButton = document.getElementById('click-button');
const userNameElement = document.getElementById('user-name');
const openPanelButton = document.getElementById('open-panel-button');
const closePanelButton = document.getElementById('close-panel-button');
const bottomPanel = document.getElementById('bottom-panel');
const panelTabs = document.getElementById('panel-tabs');
const panelContent = document.getElementById('panel-content');
const upgradesContent = document.getElementById('upgrades-content');
const questsContent = document.getElementById('quests-content');
const achievementsContent = document.getElementById('achievements-content');
const shtabContent = document.getElementById('shtab-content');
const missionsContent = document.getElementById('missions-content');
const prestigeContent = document.getElementById('prestige-content');
const bonusContainer = document.getElementById('bonus-container');
const toastContainer = document.getElementById('toast-container');
const clickFeedbackContainer = document.getElementById('click-feedback-container');
const gameBackground = document.getElementById('game-background');
const soundToggle = document.getElementById('sound-toggle');

// --- СТРУКТУРЫ ДАННЫХ ИГРЫ ---
const upgradesData = {
    zvezda: { name: "ЗВЁЗДОЧКА", description: "Улучшает ручной сбор ресурсов", icon: 'images/icons/zvezda.png', baseCost: 50, power: 1, type: 'click' },
    mops: { name: "СБЭУ МОПС", description: "Базовая добывающая единица", icon: 'images/icons/mops.png', baseCost: 15, power: 1, type: 'auto' },
    gusenica: { name: "СБЭУ ГУСЕНИЦА", description: "Тяжёлая техника для добычи", icon: 'images/icons/gusenica.png', baseCost: 100, power: 5, type: 'auto' },
    cherepaha: { name: "СБЭУ ЧЕРЕПАХА", description: "Бронированный добытчик", icon: 'images/icons/cherepaha.png', baseCost: 1200, power: 50, type: 'auto' },
    komar: { name: "СБЭУ КОМАР", description: "Быстрый воздушный сборщик", icon: 'images/icons/komar.png', baseCost: 15000, power: 300, type: 'auto' },
    projectV: { name: "Проект 'Возмездие'", description: "Даёт +10% ко всей добыче ресурсов", icon: 'images/icons/projectV.png', baseCost: 10000000, power: 0.1, type: 'percentage' }
};
const questsData = [
    { id: 'click100', name: "Первые шаги", description: "Соберите ресурсы 100 раз", icon: 'images/icons/quest_click.png', target: 100, metric: 'totalClicks', reward: 500 },
    { id: 'score1k', name: "Накопитель", description: "Накопите 1000 ресурсов", icon: 'images/icons/quest_resource.png', target: 1000, metric: 'score', reward: 1000 },
    { id: 'upgrade5', name: "Инженер", description: "Приобретите 5 любых улучшений", icon: 'images/icons/quest_upgrade.png', target: 5, metric: 'totalUpgrades', reward: 2500 },
    { id: 'mops10', name: "Мопсолюб", description: "Разверните 10 'СБЭУ МОПС'", icon: 'images/icons/mops.png', target: 10, metric: 'upgrade_mops', reward: 5000 },
    { id: 'click10k', name: "Трудоголик", description: "Соберите ресурсы 10,000 раз", icon: 'images/icons/quest_click.png', target: 10000, metric: 'totalClicks', reward: 25000 },
    { id: 'score100k', name: "Магнат", description: "Накопите 100,000 ресурсов", icon: 'images/icons/quest_resource.png', target: 100000, metric: 'score', reward: 50000 },
    { id: 'gusenica25', name: "Танковый биатлон", description: "Разверните 25 'СБЭУ ГУСЕНИЦА'", icon: 'images/icons/gusenica.png', target: 25, metric: 'upgrade_gusenica', reward: 150000 },
    { id: 'zvezda20', name: "Снайпер", description: "Улучшите 'ЗВЁЗДОЧКУ' до ур. 20", icon: 'images/icons/zvezda.png', target: 20, metric: 'upgrade_zvezda', reward: 75000 },
    { id: 'bonus5', name: "Охотник за бонусами", description: "Поймайте 5 бонусных объектов", icon: 'images/icons/ach_bonus.png', target: 5, metric: 'bonusesClicked', reward: 200000 },
    { id: 'cherepaha50', name: "Стальной панцирь", description: "Разверните 50 'СБЭУ ЧЕРЕПАХА'", icon: 'images/icons/cherepaha.png', target: 50, metric: 'upgrade_cherepaha', reward: 500000 },
    { id: 'all10', name: "Полная боеготовность", description: "Прокачайте все СБЭУ до ур. 10", icon: 'images/icons/quest_all.png', target: 4, metric: 'allSBEULevel10', reward: 1000000 },
    { id: 'prestige1', name: "Новое начало", description: "Совершите своё первое перерождение", icon: 'images/icons/ach_prestige.png', target: 1, metric: 'prestigeCount', reward: 15 }, // Награда в Шевронах!
];
const achievementsData = [
    { id: 'ach_click1', name: "Касание", description: "Сделайте свой первый клик", icon: 'images/icons/ach_first.png', condition: s => s.stats.totalClicks >= 1 },
    { id: 'ach_score1M', name: "Миллионер", description: "Наберите 1,000,000 ресурсов", icon: 'images/icons/ach_milestone.png', condition: s => s.score >= 1000000 },
    { id: 'ach_komar', name: "Жужжащий рой", description: "Купите первого 'СБЭУ КОМАР'", icon: 'images/icons/komar.png', condition: s => s.upgrades.komar.level > 0 },
    { id: 'ach_golden', name: "Счастливчик", description: "Поймайте бонусный объект", icon: 'images/icons/ach_bonus.png', condition: s => s.stats.bonusesClicked > 0 },
    { id: 'ach_allSBEU', name: "Коллекционер", description: "Купите по одному СБЭУ каждого типа", icon: 'images/icons/ach_all.png', condition: s => s.upgrades.mops.level > 0 && s.upgrades.gusenica.level > 0 && s.upgrades.cherepaha.level > 0 && s.upgrades.komar.level > 0 },
    { id: 'ach_prestige1', name: "Первое перерождение", description: "Совершите свою первую передислокацию", icon: 'images/icons/ach_prestige.png', condition: s => s.stats.prestigeCount > 0 },
    { id: 'ach_allTrophies', name: "Оружейный барон", description: "Соберите все трофеи", icon: 'images/icons/trophy_all.png', condition: s => s.trophies.length >= Object.keys(trophyData).length },
    { id: 'ach_shtabMax', name: "Верховный главнокомандующий", description: "Полностью улучшите Штаб", icon: 'images/icons/shtab_max.png', condition: s => { for(const id in shtabUpgradesData) { if(shtabUpgradesData[id].maxLevel && s.shtabUpgrades[id].level < shtabUpgradesData[id].maxLevel) return false; } return true; }},
    { id: 'ach_projectV', name: "Возмездие свершилось", description: "Постройте 'Проект Возмездие'", icon: 'images/icons/projectV.png', condition: s => s.upgrades.projectV.level > 0 },
    { id: 'ach_secret', name: "Не трогай это!", description: "Вы нашли что-то, что не следовало трогать.", icon: 'images/icons/ach_secret.png', condition: s => s.stats.secretFound, hidden: true }
];
const shtabUpgradesData = {
    veteran: { name: "Ветеранская подготовка", description: "Каждый вложенный Шеврон пассивно увеличивает всю добычу на 1%", icon: 'images/icons/shtab_veteran.png', type: 'passive' },
    foundry: { name: "Улучшенная плавка", description: "Увеличивает базовую добычу всех СБЭУ на 25%", icon: 'images/icons/shtab_foundry.png', cost: 10, maxLevel: 1, type: 'upgrade' },
    intel: { name: "Разведданные", description: "Увеличивает шанс появления бонуса на 10% за уровень", icon: 'images/icons/shtab_intel.png', cost: 25, maxLevel: 5, type: 'upgrade' },
    logistics: { name: "Эффективная логистика", description: "Снижает стоимость всех улучшений на 2% за уровень", icon: 'images/icons/shtab_logistics.png', cost: 15, maxLevel: 10, type: 'upgrade', effect_per_level: 0.02 },
    starter_pack: { name: "Стартовый капитал", description: "Начинайте каждое перерождение с 1000 ресурсов", icon: 'images/icons/shtab_starter.png', cost: 5, maxLevel: 1, type: 'upgrade' }
};
const trophyData = {
    helmet: { name: "Пробитая каска", description: "+5% к силе клика", icon: 'images/icons/trophy_helmet.png', effect: { type: 'click_multiplier', value: 0.05 } },
    nvg: { name: "Трофейный ПНВ", description: "Бонусы появляются на 10% чаще", icon: 'images/icons/trophy_nvg.png', effect: { type: 'bonus_chance', value: 0.1 } },
    flask: { name: "Пустая фляга", description: "Снижает стоимость 'СБЭУ МОПС' на 25%", icon: 'images/icons/trophy_flask.png', effect: { type: 'cost_reduction', unit: 'mops', value: 0.25 } }
};
const missionsData = {
    scout: { name: "Разведка", description: "Отправить 10 Мопсов на разведку.\nШанс найти Трофей.", duration: 60 * 15, cost: 1000, required: { mops: 10 }, rewards: ['helmet'] },
    convoy: { name: "Захват конвоя", description: "Отправить 25 Гусениц на перехват.\nВысокий шанс найти Трофей.", duration: 60 * 60, cost: 50000, required: { gusenica: 25 }, rewards: ['nvg', 'helmet'] },
    sabotage: { name: "Саботаж", description: "Отправить 50 Комаров для диверсии.\nГарантированный редкий Трофей.", duration: 60 * 60 * 4, cost: 1e6, required: { komar: 50 }, rewards: ['flask', 'nvg'] }
};
const visualMilestones = [
    { name: 'Крепость', condition: s => s.shevrons > 0, bg: 'images/bg_fortress.png', clicker: 'images/clicker_veteran.png' },
    { name: 'База', condition: s => s.upgrades.projectV.level > 0, bg: 'images/bg_base.png', clicker: 'images/clicker_elite.png' },
    { name: 'Аванпост', condition: s => s.upgrades.komar.level > 0, bg: 'images/bg_outpost.png', clicker: 'images/clicker_specops.png' },
    { name: 'Лагерь', condition: s => s.upgrades.cherepaha.level > 0, bg: 'images/bg_camp.png', clicker: 'images/clicker_helmet.png' },
    { name: 'Старт', condition: s => true, bg: 'images/bg_start.png', clicker: 'images/click-meme.png' }
];

// --- ЗВУКОВАЯ СИСТЕМА ---
const sounds = {
    click: new Audio('audio/click.mp3'),
    upgrade: new Audio('audio/upgrade.mp3'),
    notification: new Audio('audio/notification.mp3'),
    music: new Audio('audio/background_music.mp3')
};
sounds.music.loop = true;
sounds.music.volume = 0.3;

// --- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ---
let gameState;
let gameLoopInterval, uiLoopInterval;

// --- ОСНОВНАЯ ЛОГИКА ---
function initGame() {
    tg.ready(); tg.expand(); tg.enableClosingConfirmation();
    const user = tg.initDataUnsafe?.user;
    userNameElement.textContent = user?.first_name || 'Пользователь';
    loadGameState();
    updateSoundIcon();
    if (gameState.soundEnabled) { sounds.music.play().catch(e => console.error("Autoplay music failed:", e)); }
    renderAll();
    if (gameLoopInterval) clearInterval(gameLoopInterval);
    if (uiLoopInterval) clearInterval(uiLoopInterval);
    gameLoopInterval = setInterval(gameTick, 1000);
    uiLoopInterval = setInterval(updateProgressBars, 500);
    if (!gameState.activeMission.missionId) scheduleNextBonus();
    setupEventListeners();
}

function gameTick() {
    let passiveIncome = calculateAutoClickPower();
    let scoreToAdd = passiveIncome * gameState.boostMultiplier;
    if (scoreToAdd > 0) gameState.score += scoreToAdd;
    if (passiveIncome > 0) gameState.stats.totalScore += scoreToAdd;
    if (gameState.boostMultiplier > 1 && Date.now() > gameState.boostEndTime) {
        gameState.boostMultiplier = 1;
        showToast('Буст x2 закончился!', 'quest');
    }
    checkMissionComplete();
    checkAllConditions();
    updateUIDynamicContent();
    updateUIDisabledState();
}

function updateProgressBars() {
    document.querySelectorAll('.quest-progress-bar').forEach(bar => {
        const quest = questsData.find(q => q.id === bar.dataset.id);
        if (quest && gameState.quests[quest.id] && !gameState.quests[quest.id].claimed) {
            const progress = getQuestProgress(quest);
            bar.style.width = `${Math.min(progress * 100, 100)}%`;
        }
    });
    const missionBar = document.querySelector('.mission-progress-bar');
    if (missionBar && gameState.activeMission.missionId) {
        const mission = missionsData[gameState.activeMission.missionId];
        const startTime = gameState.activeMission.endTime - mission.duration * 1000;
        const progress = (Date.now() - startTime) / (mission.duration * 1000);
        missionBar.style.width = `${Math.min(progress * 100, 100)}%`;
        const timer = document.querySelector('.mission-timer');
        if (timer) {
            const timeLeft = Math.max(0, Math.ceil((gameState.activeMission.endTime - Date.now()) / 1000));
            timer.textContent = `Возвращение через: ${new Date(timeLeft * 1000).toISOString().substr(11, 8)}`;
        }
    }
    const prestigePane = document.getElementById('prestige-content');
    if(prestigePane && prestigePane.classList.contains('active')) {
        const shevronsToGet = gameState.score >= calculatePrestigeCost() ? calculateShevronsOnPrestige() : 0;
        const shevronCounter = prestigePane.querySelector('#shevrons-to-get');
        if (shevronCounter) shevronCounter.textContent = shevronsToGet.toLocaleString();
    }
}

// --- УПРАВЛЕНИЕ ПАНЕЛЬЮ И UI ---
function setupEventListeners() {
    clickButton.addEventListener('click', handleManualClick);
    openPanelButton.addEventListener('click', () => bottomPanel.classList.add('panel-open'));
    closePanelButton.addEventListener('click', () => bottomPanel.classList.remove('panel-open'));
    panelTabs.addEventListener('click', (e) => {
        if (e.target.classList.contains('tab-button')) {
            const tabId = e.target.dataset.tab;
            panelTabs.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
            panelContent.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            document.getElementById(`${tabId}-content`).classList.add('active');
        }
    });
    panelContent.addEventListener('click', e => {
        const button = e.target.closest('button');
        if (!button) {
            const slot = e.target.closest('.trophy-slot');
            if (slot && slot.dataset.id) {
                if (slot.parentElement.id === 'trophy-slots') unequipTrophy(slot.dataset.id);
                else equipTrophy(slot.dataset.id);
            }
            return;
        };
        const id = button.dataset.id;
        if (button.classList.contains('upgrade-button')) buyUpgrade(id);
        if (button.classList.contains('quest-claim-button')) claimQuestReward(id);
        if (button.classList.contains('shtab-upgrade-button')) buyShtabUpgrade(id);
        if (button.classList.contains('mission-start-button')) startMission(id);
        if (button.classList.contains('prestige-button')) doPrestige();
    });
    userNameElement.addEventListener('click', () => {
        if (gameState.achievements && !gameState.achievements.ach_secret.unlocked) {
            gameState.stats.secretFound = true;
            checkAllConditions();
        }
    });
    soundToggle.addEventListener('click', toggleSound);
}

function toggleSound() {
    gameState.soundEnabled = !gameState.soundEnabled;
    updateSoundIcon();
    if (gameState.soundEnabled) {
        sounds.music.play().catch(e => console.log("Не удалось запустить музыку:", e));
    } else {
        sounds.music.pause();
    }
    saveGameState();
}

function playSound(soundName) {
    if (gameState.soundEnabled) {
        const sound = sounds[soundName];
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(e => console.log(`Не удалось запустить звук ${soundName}:`, e));
        }
    }
}

function updateSoundIcon() {
    soundToggle.querySelector('img').src = gameState.soundEnabled ? 'images/icons/sound_on.png' : 'images/icons/sound_off.png';
}

function renderAll() {
    renderUpgrades(); renderQuests(); renderAchievements();
    renderShtab(); renderMissions(); renderPrestige();
    checkVisualMilestones(); updateUIDynamicContent(); updateUIDisabledState();
}

function updateUIDynamicContent() {
    scoreElement.textContent = Math.floor(gameState.score).toLocaleString();
    shevronsElement.textContent = gameState.shevrons.toLocaleString();
    const passivePower = calculateAutoClickPower();
    autoClickPowerElement.textContent = Math.floor(passivePower).toLocaleString();
    if (gameState.boostMultiplier > 1) {
        const timeLeft = Math.ceil((gameState.boostEndTime - Date.now()) / 1000);
        boostIndicator.textContent = `x2 (${timeLeft}с)`;
    } else { boostIndicator.textContent = ''; }
}

function updateUIDisabledState() {
    document.querySelectorAll('.upgrade-button').forEach(b => { if(gameState.upgrades[b.dataset.id]) b.disabled = gameState.score < getUpgradeCost(b.dataset.id); });
    document.querySelectorAll('.quest-claim-button').forEach(b => { const q = questsData.find(q=>q.id===b.dataset.id); if(q && gameState.quests[q.id]) b.disabled = getQuestProgress(q) < 1 || gameState.quests[q.id].claimed; });
    document.querySelectorAll('.shtab-upgrade-button').forEach(b => { const u = shtabUpgradesData[b.dataset.id]; if(u && gameState.shtabUpgrades[b.dataset.id]) b.disabled = gameState.shevrons < u.cost || (u.maxLevel && gameState.shtabUpgrades[b.dataset.id].level >= u.maxLevel); });
    document.querySelectorAll('.mission-start-button').forEach(b => { const m = missionsData[b.dataset.id]; if(m) { let reqMet = true; for (const unit in m.required) { if (gameState.upgrades[unit].level < m.required[unit]) { reqMet = false; break; } } b.disabled = gameState.score < m.cost || gameState.activeMission.missionId || !reqMet; }});
    const prestigeButton = document.querySelector('.prestige-button');
    if (prestigeButton) prestigeButton.disabled = gameState.score < calculatePrestigeCost();
}

function handleManualClick(event) {
    const clickPower = calculateClickPower();
    const scoreToAdd = clickPower * gameState.boostMultiplier;
    gameState.score += scoreToAdd;
    gameState.stats.totalClicks++;
    gameState.stats.totalScore += scoreToAdd;
    playSound('click');
    tg.HapticFeedback.impactOccurred('light');
    showClickFeedback(event, `+${Math.floor(scoreToAdd).toLocaleString()}`);
    checkAllConditions();
    updateUIDynamicContent();
    updateUIDisabledState();
}

function buyUpgrade(id) {
    const cost = getUpgradeCost(id);
    if (gameState.score >= cost) {
        gameState.score -= cost;
        const state = gameState.upgrades[id];
        state.level++;
        state.cost = Math.floor(upgradesData[id].baseCost * Math.pow(1.15, state.level));
        gameState.stats.totalUpgrades++;
        playSound('upgrade');
        tg.HapticFeedback.notificationOccurred('success');
        saveGameState();
        renderUpgrades();
        checkVisualMilestones();
        updateUIDisabledState();
    }
}

function buyShtabUpgrade(id) {
    const data = shtabUpgradesData[id];
    const state = gameState.shtabUpgrades[id];
    if (gameState.shevrons >= data.cost && (!data.maxLevel || state.level < data.maxLevel)) {
        gameState.shevrons -= data.cost;
        state.level++;
        playSound('upgrade');
        saveGameState();
        renderShtab();
        updateUIDisabledState();
    }
}

function claimQuestReward(id) {
    const questDef = questsData.find(q => q.id === id);
    const questState = gameState.quests[id];
    if (!questState.claimed && getQuestProgress(questDef) >= 1) {
        if (questDef.metric === 'prestigeCount') {
            gameState.shevrons += questDef.reward;
        } else {
            gameState.score += questDef.reward;
        }
        questState.claimed = true;
        showToast(`Задание "${questDef.name}" выполнено!`, 'quest');
        playSound('notification');
        saveGameState();
        renderQuests();
    }
}

function checkAllConditions() {
    achievementsData.forEach(achDef => {
        if (gameState.achievements[achDef.id] && !gameState.achievements[achDef.id].unlocked && achDef.condition(gameState)) {
            gameState.achievements[achDef.id].unlocked = true;
            showToast(`Достижение: ${achDef.name}!`, 'achievement');
            playSound('notification');
            renderAchievements();
            saveGameState();
        }
    });
}

function doPrestige() {
    const currentPrestigeCost = calculatePrestigeCost();
    if (gameState.score < currentPrestigeCost) return;
    const shevronsEarned = calculateShevronsOnPrestige();
    const oldState = {
        shevrons: gameState.shevrons,
        shtabUpgrades: gameState.shtabUpgrades,
        achievements: gameState.achievements,
        trophies: gameState.trophies,
        equippedTrophies: gameState.equippedTrophies,
        prestigeCount: gameState.stats.prestigeCount || 0,
        soundEnabled: gameState.soundEnabled
    };
    gameState = initializeState();
    gameState.soundEnabled = oldState.soundEnabled;
    gameState.shevrons = oldState.shevrons + shevronsEarned;
    gameState.shtabUpgrades = oldState.shtabUpgrades;
    gameState.achievements = oldState.achievements;
    gameState.trophies = oldState.trophies;
    gameState.equippedTrophies = oldState.equippedTrophies;
    gameState.stats.prestigeCount = oldState.prestigeCount + 1;
    if (getShtabEffect('starter_pack') > 0) gameState.score = 1000;
    saveGameState();
    renderAll();
    showToast(`Перерождение! Вы получили ${shevronsEarned} Шевронов!`, 'achievement');
    playSound('notification');
}

function calculatePrestigeCost() {
    return BASE_PRESTIGE_COST * Math.pow(5, gameState.stats.prestigeCount);
}

function calculateShevronsOnPrestige() {
    const currentPrestigeCost = calculatePrestigeCost();
    return Math.floor(10 * Math.pow(Math.max(0, gameState.score) / currentPrestigeCost, 0.5));
}

function startMission(id) {
    const mission = missionsData[id];
    if (gameState.activeMission.missionId || gameState.score < mission.cost) return;
    for (const unit in mission.required) { if (gameState.upgrades[unit].level < mission.required[unit]) { showToast(`Требуется ${mission.required[unit]} ед. ${upgradesData[unit].name}!`); return; } }
    gameState.score -= mission.cost;
    gameState.activeMission = { missionId: id, endTime: Date.now() + mission.duration * 1000 };
    showToast(`Спецоперация "${mission.name}" началась!`);
    playSound('upgrade');
    saveGameState();
    renderMissions();
}

function checkMissionComplete() {
    if (gameState.activeMission.missionId && Date.now() >= gameState.activeMission.endTime) {
        const mission = missionsData[gameState.activeMission.missionId];
        const reward = mission.rewards[Math.floor(Math.random() * mission.rewards.length)];
        if (!gameState.trophies.includes(reward)) {
            gameState.trophies.push(reward);
            showToast(`Миссия завершена! Получен Трофей: "${trophyData[reward].name}"!`, 'achievement');
        } else {
            const shevronReward = 5;
            gameState.shevrons += shevronReward;
            showToast(`Миссия завершена! У вас уже есть этот трофей. Награда: ${shevronReward} Шевронов!`, 'quest');
        }
        playSound('notification');
        gameState.activeMission = { missionId: null, endTime: 0 };
        saveGameState();
        renderMissions();
    }
}

function equipTrophy(id) {
    if (gameState.equippedTrophies.length < 3 && !gameState.equippedTrophies.includes(id)) {
        gameState.equippedTrophies.push(id);
        playSound('upgrade');
        saveGameState();
        renderMissions();
    }
}

function unequipTrophy(id) {
    gameState.equippedTrophies = gameState.equippedTrophies.filter(trophyId => trophyId !== id);
    playSound('upgrade');
    saveGameState();
    renderMissions();
}

function renderUpgrades() {
    let html = '<ul class="item-list">';
    for (const id in upgradesData) {
        const data = upgradesData[id];
        const state = gameState.upgrades[id];
        const cost = getUpgradeCost(id);
        const effect = data.type === 'auto' ? `+${data.power.toLocaleString()}/сек` : data.type === 'click' ? `+${data.power.toLocaleString()} за клик` : `+${data.power * 100}% ко всему`;
        const itemClass = data.type === 'percentage' ? 'item final-upgrade' : 'item';
        html += `<li class="${itemClass}"><div class="item-icon"><img src="${data.icon}"></div><div class="item-info"><h4>${data.name} (Ур. ${state.level})</h4><p>${data.description}</p><p><b>Эффект:</b> ${effect}</p></div><button class="item-action-button upgrade-button" data-id="${id}">${Math.floor(cost).toLocaleString()}</button></li>`;
    }
    upgradesContent.innerHTML = html + '</ul>';
}
function renderQuests() {
    let html = '<ul class="item-list">';
    questsData.forEach(quest => {
        const state = gameState.quests[quest.id]; if (!state) return;
        const progress = getQuestProgress(quest);
        const liClass = state.claimed ? 'item completed' : 'item';
        html += `<li class="${liClass}"><div class="item-icon"><img src="${quest.icon}"></div><div class="item-info"><h4>${quest.name}</h4><p>${quest.description}</p>${!state.claimed ? `<p><b>Награда:</b> ${quest.reward.toLocaleString()} ${quest.metric === 'prestigeCount' ? 'Шевронов' : 'ресурсов'}</p><div class="progress-bar-container"><div class="progress-bar quest-progress-bar" data-id="${quest.id}"></div></div>` : '<p>Выполнено</p>'}</div>${!state.claimed ? `<button class="item-action-button quest-claim-button" data-id="${quest.id}">Забрать</button>` : ''}</li>`;
    });
    questsContent.innerHTML = html + '</ul>';
    updateProgressBars();
}
function renderAchievements() {
    let html = '<ul class="item-list">';
    achievementsData.forEach(ach => {
        const state = gameState.achievements[ach.id]; if (!state || (ach.hidden && !state.unlocked)) return;
        const liClass = state.unlocked ? 'item unlocked' : 'item';
        html += `<li class="${liClass}"><div class="item-icon"><img src="${ach.icon}"></div><div class="item-info"><h4>${state.unlocked ? ach.name : '??????'}</h4><p>${state.unlocked ? ach.description : 'Достижение скрыто'}</p></div></li>`;
    });
    achievementsContent.innerHTML = html + '</ul>';
}
function renderShtab() {
    let html = '<ul class="item-list">';
    for (const id in shtabUpgradesData) {
        const data = shtabUpgradesData[id];
        const state = gameState.shtabUpgrades[id];
        const isMaxLevel = data.maxLevel && state.level >= data.maxLevel;
        html += `<li class="item"><div class="item-icon"><img src="${data.icon}"></div><div class="item-info"><h4>${data.name} ${data.maxLevel ? `(${state.level}/${data.maxLevel})` : ''}</h4><p>${data.description}</p></div>${data.type !== 'passive' ? `<button class="item-action-button shtab-upgrade-button" data-id="${id}" ${isMaxLevel ? 'disabled' : ''}>${isMaxLevel ? 'МАКС' : `${data.cost} Шевронов`}</button>` : ''}</li>`;
    }
    shtabContent.innerHTML = html + '</ul>';
}
function renderMissions() {
    let html = '';
    if (gameState.activeMission.missionId) {
        const mission = missionsData[gameState.activeMission.missionId];
        const timeLeft = Math.max(0, Math.ceil((gameState.activeMission.endTime - Date.now()) / 1000));
        html = `<div class="item"><div class="item-info"><h4 class="mission-title">Выполняется: "${mission.name}"</h4><p class="mission-timer">Возвращение через: ${new Date(timeLeft * 1000).toISOString().substr(11, 8)}</p><div class="progress-bar-container"><div class="progress-bar mission-progress-bar"></div></div></div></div>`;
    } else {
        html += '<ul class="item-list">';
        for (const id in missionsData) {
            const mission = missionsData[id];
            html += `<li class="item"><div class="item-info"><h4>${mission.name}</h4><p>Длительность: ${mission.duration / 60} мин.\nСтоимость: ${mission.cost.toLocaleString()} ресурсов.\nТребуется: ${Object.entries(mission.required).map(([unit, count]) => `${count} ${upgradesData[unit].name}`).join(', ')}</p></div><button class="item-action-button mission-start-button" data-id="${id}">Начать</button></li>`;
        }
        html += '</ul>';
    }
    missionsContent.innerHTML = html;
    renderTrophyShelf();
}
function renderTrophyShelf() {
    const existingShelf = document.getElementById('trophy-shelf'); if(existingShelf) existingShelf.remove();
    let html = `<div id="trophy-shelf"><h4>Экипированные Трофеи</h4><div id="trophy-slots">`;
    for (let i = 0; i < 3; i++) {
        const trophyId = gameState.equippedTrophies[i];
        if (trophyId) {
            const trophy = trophyData[trophyId];
            html += `<div class="trophy-slot" data-id="${trophyId}"><img src="${trophy.icon}" title="${trophy.name}: ${trophy.description}"></div>`;
        } else {
            html += `<div class="trophy-slot"></div>`;
        }
    }
    html += `</div><h4>Склад Трофеев</h4><div id="trophy-storage" style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px;">`;
    gameState.trophies.forEach(id => {
        if (!gameState.equippedTrophies.includes(id)) {
            const trophy = trophyData[id];
            html += `<div class="trophy-slot" data-id="${id}"><img src="${trophy.icon}" title="${trophy.name}: ${trophy.description}"></div>`;
        }
    });
    html += `</div></div>`;
    missionsContent.insertAdjacentHTML('beforeend', html);
}
function renderPrestige() {
    const currentPrestigeCost = calculatePrestigeCost();
    const shevronsToGet = gameState.score >= currentPrestigeCost ? calculateShevronsOnPrestige() : 0;
    prestigeContent.innerHTML = `<h3>Протокол "Возрождение"</h3><p>Сбросьте свой прогресс (уровни и ресурсы), чтобы получить Шевроны и разблокировать мощные вечные улучшения в Штабе.</p><p>Для перерождения необходимо ${currentPrestigeCost.toLocaleString()} ресурсов.</p><p>Вы получите: <strong id="shevrons-to-get">${shevronsToGet.toLocaleString()}</strong> Шевронов</p><button class="prestige-button">Переродиться</button>`;
}
function checkVisualMilestones() {
    for (const milestone of visualMilestones) {
        if (milestone.condition(gameState)) {
            if (gameBackground.style.backgroundImage !== `url("${milestone.bg}")`) gameBackground.style.backgroundImage = `url("${milestone.bg}")`;
            if (!clickButton.src.endsWith(milestone.clicker.split('/').pop())) clickButton.src = milestone.clicker;
            break;
        }
    }
}
function getShtabEffect(id) { const level = gameState.shtabUpgrades[id]?.level || 0; const data = shtabUpgradesData[id]; return data.effect_per_level ? level * data.effect_per_level : level; }
function getTrophyEffect(type, subtype = null) { let total = 0; gameState.equippedTrophies.forEach(id => { const t = trophyData[id]; if (t.effect.type === type && (!subtype || t.effect.unit === subtype)) total += t.effect.value; }); return total; }
function getUpgradeCost(id) { let baseCost = gameState.upgrades[id].cost; const logisticsBonus = 1 - getShtabEffect('logistics'); const trophyBonus = 1 - getTrophyEffect('cost_reduction', id); return baseCost * logisticsBonus * trophyBonus; }
function calculateAutoClickPower() { let p = 0; for (const id in upgradesData) { if (upgradesData[id].type === 'auto') p += upgradesData[id].power * gameState.upgrades[id].level; } p *= (1 + getShtabEffect('foundry')); const shevronBonus = 1 + (gameState.shevrons * 0.01); const percBonus = upgradesData.projectV.power * gameState.upgrades.projectV.level; return p * shevronBonus * (1 + percBonus); }
function calculateClickPower() { let p = 1; for (const id in upgradesData) { if (upgradesData[id].type === 'click') p += upgradesData[id].power * gameState.upgrades[id].level; } p *= (1 + getTrophyEffect('click_multiplier')); const shevronBonus = 1 + (gameState.shevrons * 0.01); const percBonus = upgradesData.projectV.power * gameState.upgrades.projectV.level; return p * shevronBonus * (1 + percBonus); }
function getQuestProgress(questDef) { if (!questDef || !gameState.stats) return 0; let current = 0; switch (questDef.metric) { case 'score': current = gameState.score; break; case 'allSBEULevel10': let count = 0; if (gameState.upgrades.mops.level >= 10) count++; if (gameState.upgrades.gusenica.level >= 10) count++; if (gameState.upgrades.cherepaha.level >= 10) count++; if (gameState.upgrades.komar.level >= 10) count++; current = count; break; case 'prestigeCount': current = gameState.stats.prestigeCount; break; default: if (questDef.metric.startsWith('upgrade_')) { const id = questDef.metric.split('_')[1]; current = gameState.upgrades[id]?.level || 0; } else { current = gameState.stats[questDef.metric] || 0; } break; } return current / questDef.target; }
function showToast(message, type = 'achievement') { const t = document.createElement('div'); t.className = `toast ${type}`; t.textContent = message; toastContainer.appendChild(t); setTimeout(() => t.remove(), 4000); }
function showClickFeedback(event, text) { const f = document.createElement('div'); f.className = 'click-feedback'; const r = clickFeedbackContainer.getBoundingClientRect(); f.style.left = `${event.clientX - r.left}px`; f.style.top = `${event.clientY - r.top}px`; f.textContent = text; clickFeedbackContainer.appendChild(f); setTimeout(() => f.remove(), 1000); }
function scheduleNextBonus() { const bonusChanceMultiplier = 1 + getTrophyEffect('bonus_chance') + (getShtabEffect('intel') * 0.1); const baseInterval = 300000; const d = Math.random() * 60000 + (baseInterval / bonusChanceMultiplier); setTimeout(spawnBonus, d); }
function spawnBonus() { const b = document.createElement('img'); b.src = 'images/icons/bonus-star.png'; b.className = 'bonus-item'; const r = clickButton.getBoundingClientRect(); if (r.width <= 60 || r.height <= 60) { scheduleNextBonus(); return; } const x = r.left + Math.random() * (r.width - 60) - r.left; const y = r.top + Math.random() * (r.height - 60) - r.top; b.style.left = `${x}px`; b.style.top = `${y}px`; clickerZone.appendChild(b); b.onclick = () => { gameState.boostMultiplier = 2; gameState.boostEndTime = Date.now() + 60000; gameState.stats.bonusesClicked++; showToast('Буст x2 активирован на 1 минуту!', 'quest'); playSound('notification'); tg.HapticFeedback.notificationOccurred('success'); b.remove(); checkAllConditions(); scheduleNextBonus(); }; setTimeout(() => { if (b.parentNode) { b.remove(); scheduleNextBonus(); } }, 10000); }
function initializeState() {
    const defaultState = {
        score: 0, shevrons: 0, boostMultiplier: 1, boostEndTime: 0,
        upgrades: {}, stats: { totalClicks: 0, totalScore: 0, bonusesClicked: 0, totalUpgrades: 0, secretFound: false, prestigeCount: 0 },
        quests: {}, achievements: {}, shtabUpgrades: {}, trophies: [], equippedTrophies: [],
        activeMission: { missionId: null, endTime: 0 }, soundEnabled: true
    };
    for (const id in upgradesData) defaultState.upgrades[id] = { level: 0, cost: upgradesData[id].baseCost };
    for (const id in shtabUpgradesData) defaultState.shtabUpgrades[id] = { level: 0 };
    questsData.forEach(q => defaultState.quests[q.id] = { claimed: false });
    achievementsData.forEach(a => defaultState.achievements[a.id] = { unlocked: false });
    return defaultState;
}
function loadGameState() {
    gameState = initializeState();
    try {
        const userId = tg.initDataUnsafe?.user?.id || 'guest';
        const savedData = localStorage.getItem(`sbeuClickerState_v9_${userId}`); // Новый ключ v9
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            Object.keys(gameState).forEach(key => {
                if (parsedData[key] !== undefined) {
                    if (typeof gameState[key] === 'object' && !Array.isArray(gameState[key]) && gameState[key] !== null) {
                        gameState[key] = { ...gameState[key], ...parsedData[key] };
                    } else { gameState[key] = parsedData[key]; }
                }
            });
        }
    } catch (e) { console.error("Не удалось загрузить игру:", e); gameState = initializeState(); }
}
function saveGameState() { try { const userId = tg.initDataUnsafe?.user?.id || 'guest'; localStorage.setItem(`sbeuClickerState_v9_${userId}`, JSON.stringify(gameState)); } catch (e) { console.error("Не удалось сохранить игру:", e); } }

initGame();