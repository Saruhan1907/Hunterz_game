const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ===== DYNAMISCHE GRÖSSE =====
let CANVAS_WIDTH = window.innerWidth;
let CANVAS_HEIGHT = window.innerHeight;

function resizeCanvas() {
    CANVAS_WIDTH = window.innerWidth;
    CANVAS_HEIGHT = window.innerHeight;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

let levelGridData = {}; 
const TILE_SIZE = 100; // Oder was auch immer du nutzt
// Weltgröße festlegen
const WORLD_WIDTH = 6000;
const WORLD_HEIGHT = 6000;

canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });
// Mobile-Erkennung (wird erst bei erstem Touch-Event aktiv)
let isMobile = false;

// ===== SPIEL-ZUSTÄNDE =====
let gameState = 'MAIN_MENU'; // 'MAIN_MENU' | 'OPTIONS' | 'CHAR_SELECT' | 'WEAPON_SELECT' | 'PLAYING' | 'PAUSED' | 'LEVEL_UP' | 'GAMEOVER'

// ===== CHARACTER-DEFINITIONEN =====
const CHARACTERS = {
    WEAPON_SPECIALIST: {
        id: 1,
        name: 'Waffenspezialist',
        description: 'Experte für alle Waffen',
        color: '#ffaa00'
    }
    // Weitere Charaktere können hier hinzugefügt werden
};

// ===== KLASSEN-DEFINITIONEN (Waffen) =====
const CLASSES = {
    SNIPER: {
        id: 1,
        name: 'Sniper',
        description: 'Langsam, aber tödlich',
        detail: 'Durchschlagende Kugeln',
        fireRate: 550, // Minimal langsamer gemacht (von 500)
        bulletSpeed: 14,
        bulletSize: 4,
        damage: 90,     // Schaden leicht generft (von 100)
        piercing: true,
        color: '#ff00ff',
        glowColor: '#ff00ff'
    },
    MACHINEGUN: {
        id: 2,
        name: 'Maschinengewehr',
        description: 'Dauerfeuer',
        detail: 'Hohe Feuerrate',
        fireRate: 80,   // Schneller ballern! (von 100)
        bulletSpeed: 11,  // Kugeln fliegen minimal schneller (von 10)
        bulletSize: 3,
        damage: 35,     // Schaden fast verdoppelt! (von 20)
        piercing: false,
        color: '#ffff00',
        glowColor: '#ffaa00'
    },
    SHOTGUN: {
        id: 3,
        name: 'Schrotflinte',
        description: 'Flächenschaden',
        detail: 'Multishot',
        fireRate: 500,  // Feuerrate erhöht (von 600)
        bulletSpeed: 10,
        bulletSize: 3,
        pellets: 5,     // Eine Kugel mehr pro Schuss! (von 4)
        spreadAngle: 0.35, // Etwas breiterer Streukreis für besseres Crowd-Control
        maxRange: 320,  // Minimale Reichweiten-Erhöhung (von 300)
        damage: 45,     // Jede einzelne Kugel tut jetzt richtig weh (von 30)
        piercing: false,
        color: '#ff8800',
        glowColor: '#ff4400'
    }
};

let selectedClass = null;
let selectedCharacter = null;

// Oben im Code, bei deinen Konstanten (sicherstellen, dass WORLD_WIDTH/HEIGHT hier schon definiert sind)
const SPAWN_PADDING = 100; 

let player = {}; // Globale Variable

function initPlayer() {
    const SPAWN_PADDING = 100;
    player = {
        x: SPAWN_PADDING + Math.random() * (WORLD_WIDTH - 2 * SPAWN_PADDING),
        y: SPAWN_PADDING + Math.random() * (WORLD_HEIGHT - 2 * SPAWN_PADDING),
        size: 26,
        speed: 3.2,
        color: '#40e0d0',
        health: 100,
        maxHealth: 100,
        angle: 0,
        vx: 0,
        vy: 0,
        xpMultiplier: 1.0,
        multishot: false,
        // XP & Level
        level: 1,
        xp: 0,
        xpToNext: 50,
        // Upgrade-Modifikatoren
        magnetRadius: 100,
        damageMultiplier: 1.0,
        speedMultiplier: 1.0,
        fireRateMultiplier: 1.0,
        bulletSpeedMultiplier: 1.0,
        projectileMultiplier: 1.0,
        lifesteal: 0 
    };
    console.log("Spieler gespawnt bei:", player.x, player.y);
}

// ===== IN-GAME SPIELFIGUR =====
const playerSprite = new Image();
playerSprite.src = 'assets/character1.png';

// ===== MINIBOSS BILD =====
const minibossSprite = new Image();
minibossSprite.src = 'assets/miniboss1.png';

// ===== TASTATUR-STATUS =====
const keys = {
    w: false, a: false, s: false, d: false,
    up: false, down: false, left: false, right: false
};



const CHEST_OPTIONS = [
    {
        id: 'multishot',
        title: 'Multishot',
        description: 'Verdoppelt deine Projektilanzahl pro Schuss dauerhaft.'
    },
    {
        id: 'double',
        title: 'Giga-Schaden',
        description: 'Verdoppelt deinen Schaden dauerhaft.'
    }
];

// ===== CHARAKTER-BILD =====
const charImage_waffenspezialist = new Image();
charImage_waffenspezialist.src = 'assets/waffenspezialist.png';


// ===== SPIEL-VARIABLEN =====
let score = 0;
let difficultyLevel = 1;
let enemyBaseSpeed = 0.9;
let spawnInterval = 2000;
let spawnTimerId = null;
let gridOffsetX = 0;
let gridOffsetY = 0;
let cameraX = 0;
let cameraY = 0;
let lastShotTime = 0;
let menuParticles = [];
let screenDamageFlash=0;

// ===== TIMER =====
let gameTime = 0; // in Sekunden
let lastTimerUpdate = 0;

// ===== AUDIO (Web Audio API) =====
let audioCtx = null;
let masterGain = null;
let masterVolume = 0.5; // Startlautstärke (50%)
let isDraggingSlider = false; // Wird wahr, wenn man den Regler zieht
let isDraggingVolume = false;

// ===== MAUS =====
let mouseX = CANVAS_WIDTH / 2;
let mouseY = CANVAS_HEIGHT / 2;
let mouseDown = false;

// ===== HOVER-STATUS =====
let hoveredButton = null; // 'start', 'options', 'character', 'weapon'
let hoveredCharIndex = -1;
let hoveredWeaponIndex = -1;
let levelUpHoveredOption = -1;

// ===== LISTEN =====
let bullets = [];
let enemies = [];
let particles = [];
let xpCrystals = [];
let chests = [];
let minibossSpawned = false;
let currentChest = null;
let chestSelectedOption = null;
let chestHoveredOption = null;
let lastDamageSoundTime = 0;
let sunrayRotation = 0;
let lastHoveredElement = null;



// ===== LEVEL-UP =====
let levelUpOptions = [];
let levelUpSelected = false;
let levelUpSelectedOption = -1;
let levelUpHoveredContinue = false;

// ===== TOUCH-STEUERUNG =====
let touchJoystickActive = false;
let touchJoystickX = 0;
let touchJoystickY = 0;
let touchJoystickId = -1;
let touchJoystickLastAngle = 0;

// NEU / ANGEPASST für den dynamischen Aim-Stick rechts unten:
let touchFireActive = false;
let touchFireId = -1;
let touchFireCenterX = 0; // Wird beim Touch-Start dynamisch gesetzt
let touchFireCenterY = 0; // Wird beim Touch-Start dynamisch gesetzt
let touchFireX = 0;       // Visuelle Verschiebung des inneren Knopfs
let touchFireY = 0;

const joystickCenterX = () => 140;
const joystickCenterY = () => CANVAS_HEIGHT - 140;
const joystickRadius = 70;
const joystickKnobRadius = 25;

// Standard-Ankerpunkt rechts unten (spiegelt den linken Joystick perfekt)
const fireBtnCenterX = () => CANVAS_WIDTH - 140;
const fireBtnCenterY = () => CANVAS_HEIGHT - 140;
const fireBtnRadius = 70;

const menuBtnX = () => CANVAS_WIDTH - 60;
const menuBtnY = () => 50;
const menuBtnRadius = 28;

const pauseContinueBtn = {
    x: () => CANVAS_WIDTH / 2,
    y: () => CANVAS_HEIGHT / 2 + 10,
    w: 220,
    h: 50
};
const pauseMenuBtn = {
    x: () => CANVAS_WIDTH / 2,
    y: () => CANVAS_HEIGHT / 2 + 75,
    w: 220,
    h: 50
};

// ===== AUDIO (Web Audio API) =====
function ensureAudio() {
    try {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return false;
            audioCtx = new AudioContext();
            masterGain = audioCtx.createGain();
            masterGain.gain.value = masterVolume;
            masterGain.connect(audioCtx.destination);
        }
        // Ganz wichtig: AudioContext "aufwecken", falls der Browser ihn blockiert hat
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return true;
    } catch (e) {
        console.warn("Audio blockiert:", e);
        return false;
    }
}

function setMasterVolume(v) {
    masterVolume = Math.max(0, Math.min(1, v));
    if (masterGain && audioCtx) {
        try {
            masterGain.gain.setTargetAtTime(masterVolume, audioCtx.currentTime, 0.1);
        } catch(e) {}
    }
}

function playSynth({ frequency = 440, type = 'square', duration = 0.12, volume = 0.5, attack = 0.005, decay = 0.08, detune = 0 } = {}) {
    if (!ensureAudio() || !audioCtx) return;
    try {
        const now = audioCtx.currentTime;
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(frequency, now);
        o.detune.value = detune;
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(volume * masterVolume, now + attack);
        g.gain.exponentialRampToValueAtTime(0.0001, now + duration + decay);
        o.connect(g);
        g.connect(masterGain);
        o.start(now);
        o.stop(now + duration + decay + 0.02);
    } catch(e) {}
}

function playNoise({ duration = 0.3, volume = 0.6, filterFreq = 1200 } = {}) {
    if (!ensureAudio() || !audioCtx) return;
    try {
        const now = audioCtx.currentTime;
        const bufferSize = Math.floor(audioCtx.sampleRate * duration);
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
        const src = audioCtx.createBufferSource();
        src.buffer = buffer;
        const f = audioCtx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.setValueAtTime(filterFreq, now);
        const g = audioCtx.createGain();
        g.gain.setValueAtTime(volume * masterVolume, now);
        src.connect(f);
        f.connect(g);
        g.connect(masterGain);
        src.start(now);
        src.stop(now + duration + 0.02);
    } catch(e) {}
}

// UI SOUNDS
function playHoverSound() {
    playSynth({ frequency: 600, type: 'sine', duration: 0.02, volume: 0.1, attack: 0.001 });
}
function playClickSound() {
    playSynth({ frequency: 300, type: 'square', duration: 0.08, volume: 0.2, attack: 0.001, decay: 0.05 });
}

// GAME SOUNDS
function playBossScreamSound() {
    playSynth({ frequency: 80, type: 'sawtooth', duration: 1.0, volume: 0.25, attack: 0.05, decay: 0.5 });
    playSynth({ frequency: 75, type: 'square', duration: 1.0, volume: 0.18, attack: 0.05, decay: 0.5 });
}
function playDamageSound() {
    playSynth({ frequency: 200, type: 'square', duration: 0.05, volume: 0.4, attack: 0.002, decay: 0.1 });
    setTimeout(() => playSynth({ frequency: 100, type: 'sawtooth', duration: 0.08, volume: 0.3, attack: 0.001, decay: 0.15 }), 30);
}
function playShootSound() {
    playSynth({ frequency: 1100 + Math.random() * 150, type: 'square', duration: 0.03, volume: 0.05, attack: 0.001, decay: 0.02 });
}
function playEnemyDeathSound() {
    playNoise({ duration: 0.12, volume: 0.35, filterFreq: 900 });
    setTimeout(() => playSynth({ frequency: 400 + Math.random() * 200, type: 'triangle', duration: 0.18, volume: 0.22, decay: 0.08 }), 20);
}
function playXpSound() {
    playSynth({ frequency: 900 + Math.random() * 300, type: 'sine', duration: 0.12, volume: 0.18, decay: 0.06 });
}
function playChestOpenSound() {
    playSynth({ frequency: 1000, type: 'sawtooth', duration: 0.12, volume: 0.28, decay: 0.06 });
    setTimeout(() => playSynth({ frequency: 1400, type: 'sawtooth', duration: 0.12, volume: 0.22, decay: 0.06 }), 70);
    setTimeout(() => playSynth({ frequency: 1800, type: 'sine', duration: 0.18, volume: 0.26, decay: 0.12 }), 140);
}
function playLevelUpSound() {
    const sequence = [900, 1080, 1260, 1440];
    sequence.forEach((freq, index) => {
        setTimeout(() => playSynth({ frequency: freq, type: 'square', duration: 0.1, volume: 0.3, decay: 0.05 }), index * 70);
    });
}

// ===== MAIN MENÜ PARTIKEL =====
let mainMenuParticles = [];
function initMainMenuParticles() {
    mainMenuParticles = [];
    for (let i = 0; i < 50; i++) {
        mainMenuParticles.push({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            vx: (Math.random() - 0.5) * 0.8,
            vy: (Math.random() - 0.5) * 0.8,
            size: Math.random() * 4 + 2,
            alpha: Math.random() * 0.4 + 0.1,
            color: `hsl(${Math.random() * 60 + 180}, 100%, 60%)`
        });
    }
}

// ===== MENÜ-PARTIKEL =====
function initMenuParticles() {
    menuParticles = [];
    for (let i = 0; i < 30; i++) {
        menuParticles.push({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            size: Math.random() * 3 + 1,
            alpha: Math.random() * 0.5 + 0.1,
            color: `hsl(${Math.random() * 60 + 180}, 100%, 60%)`
        });
    }
}
initMenuParticles();
initMainMenuParticles();
// ==== LEVEL-GENERATION =====
function initLevelGeneration() {
    levelGridData = {}; // Reset
    const cols = Math.ceil(WORLD_WIDTH / 50); // 50 ist deine cellSize
    const rows = Math.ceil(WORLD_HEIGHT / 50);

    for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
            // Speichere die Werte für jedes Tile
            levelGridData[`${x},${y}`] = {
                shade: getDeterministicRandom(x, y), // Für die Grundfarbe
                noise: getDeterministicRandom(y, x)  // Für die "Dreck-Flecken"
            };
        }
    }
}

// ===== MENÜ-KLICK-ERKENNUNG =====
function getClassAtPosition(tx, ty) {
    const classes = [CLASSES.SNIPER, CLASSES.MACHINEGUN, CLASSES.SHOTGUN];
    const cardWidth = Math.min(220, (CANVAS_WIDTH - 80) / 3);
    const cardHeight = Math.min(260, CANVAS_HEIGHT * 0.45);
    const gap = Math.min(30, (CANVAS_WIDTH - 3 * cardWidth) / 4);
    const totalWidth = classes.length * cardWidth + (classes.length - 1) * gap;
    const startX = (CANVAS_WIDTH - totalWidth) / 2;
    const cardY = Math.min(210, CANVAS_HEIGHT * 0.35);

    for (let i = 0; i < classes.length; i++) {
        const cx = startX + i * (cardWidth + gap);
        if (tx >= cx && tx <= cx + cardWidth && ty >= cardY && ty <= cardY + cardHeight) {
            return classes[i];
        }
    }
    return null;
}

function isInsideMenuBtn(tx, ty) {
    const dx = tx - menuBtnX();
    const dy = ty - menuBtnY();
    return Math.sqrt(dx*dx + dy*dy) < menuBtnRadius;
}

function isInsideOptionsBack(tx, ty) {
    // Large touch area top-left
    const bx = 20;
    const by = 20;
    const bw = 160;
    const bh = 52;
    return tx >= bx && tx <= bx + bw && ty >= by && ty <= by + bh;
}
function isInsidePauseBtn(tx, ty, btn) {
    const bx = btn.x();
    const by = btn.y();
    return tx >= bx - btn.w/2 && tx <= bx + btn.w/2 && ty >= by - btn.h/2 && ty <= by + btn.h/2;
}

function isInsideStartBtn(tx, ty) {
    const btnX = CANVAS_WIDTH / 2;
    const btnY = CANVAS_HEIGHT / 2 + 30;
    const btnWidth = 240;
    const btnHeight = 60;
    return tx >= btnX - btnWidth/2 && tx <= btnX + btnWidth/2 && 
           ty >= btnY - btnHeight/2 && ty <= btnY + btnHeight/2;
}

function isInsideOptionsBtn(tx, ty) {
    const btnX = CANVAS_WIDTH / 2;
    const btnY = CANVAS_HEIGHT / 2 + 110;
    const btnWidth = 240;
    const btnHeight = 60;
    return tx >= btnX - btnWidth/2 && tx <= btnX + btnWidth/2 && 
           ty >= btnY - btnHeight/2 && ty <= btnY + btnHeight/2;
}

function isInsideCharacterCard(tx, ty, charIndex) {
    const cardWidth = Math.min(280, CANVAS_WIDTH * 0.35);
    const cardHeight = Math.min(380, CANVAS_HEIGHT * 0.5);
    const gap = Math.min(40, (CANVAS_WIDTH - 3 * cardWidth) / 4);
    const totalWidth = 3 * cardWidth + 2 * gap;
    const startX = (CANVAS_WIDTH - totalWidth) / 2;
    const cardY = CANVAS_HEIGHT * 0.3;
    
    const cx = startX + charIndex * (cardWidth + gap);
    return tx >= cx && tx <= cx + cardWidth && ty >= cardY && ty <= cardY + cardHeight;
}

// ===== SPIEL STARTEN / CHARAKTER / WAFFE WÄHLEN =====
function goToCharSelect() {
    gameState = 'CHAR_SELECT';
    selectedCharacter = null;
}

function selectCharacter(charIndex) {
    if (charIndex === 0) {
        selectedCharacter = CHARACTERS.WEAPON_SPECIALIST;
        gameState = 'WEAPON_SELECT';
    }
}

function selectWeapon(weaponClass) {
    selectedClass = weaponClass;
    startGame(weaponClass);
}

function goBackToMenu() {
    gameState = 'MAIN_MENU';
    resetGameState();
    selectedClass = null;
    selectedCharacter = null;
    initMainMenuParticles();
}

// ===== RARITÄTEN =====
const RARITIES = [
    { name: 'Gewöhnlich', color: '#cccccc', weight: 50, multiplier: 1.0 },
    { name: 'Ungewöhnlich', color: '#00cc44', weight: 25, multiplier: 1.5 },
    { name: 'Selten', color: '#4488ff', weight: 15, multiplier: 2.0 },
    { name: 'Rar', color: '#aa44ff', weight: 8, multiplier: 3.0 },
    { name: 'Legendär', color: '#ff8800', weight: 2, multiplier: 5.0 }
];

function rollRarity() {
    const totalWeight = RARITIES.reduce((sum, r) => sum + r.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const r of RARITIES) {
        roll -= r.weight;
        if (roll <= 0) return r;
    }
    return RARITIES[0];
}

// ===== LEVEL-UP OPTIONEN =====
function generateLevelUpOptions() {
    const allUpgrades = [
        {
            baseName: '+10% Schaden',
            baseValue: 0.1,
            apply: (mult) => { player.damageMultiplier += 0.1 * mult; }
        },
        {
            // BALANCIERT: Von +15% auf +8% runtergesetzt, damit man nicht unendlich schnell wird
            baseName: '+8% Lauftempo',
            baseValue: 0.08,
            apply: (mult) => { player.speedMultiplier += 0.08 * mult; }
        },
        {
            // BALANCIERT: Von +20% (0.8) auf +12% (0.88) abgeschwächt, da die Feuerrate sonst zu schnell skaliert
            baseName: '+12% Schussrate',
            baseValue: 0.88,
            apply: (mult) => { player.fireRateMultiplier *= Math.pow(0.88, mult); }
        },
        {
            baseName: '+20% Max-Leben',
            baseValue: 20,
            apply: (mult) => { const heal = Math.round(20 * mult); player.maxHealth += heal; player.health = Math.min(player.health + heal, player.maxHealth); }
        },
        {
            // UNVERÄNDERT: Fühlt sich laut dir schon gut an!
            baseName: '+0.5% Lebensraub',
            baseValue: 0.005,
            apply: (mult) => { player.lifesteal += 0.005 * mult; }
        },
        {
            // BALANCIERT: Auf +10% angepasst, damit Kugeln das Spielfeld nicht sofort verlassen
            baseName: '+10% Projektil-Geschw.',
            baseValue: 0.1,
            apply: (mult) => { player.bulletSpeedMultiplier += 0.1 * mult; }
        },
        {
            baseName: 'XP-Booster',
            baseValue: 0.15,
            apply: (mult) => { player.xpMultiplier += 0.15 * mult; }
        },
        {
            baseName: 'Magnet-Reichweite',
            baseValue: 0.1, // Setzt den Basiswert auf 10% (0.1)
            apply: (mult) => { 
                // Erhöht den Radius sauber basierend auf dem Startwert 100
                player.magnetRadius = (player.magnetRadius || 100) + (100 * 0.1 * mult); 
            }
        }
    ];

    // 3 zufällige auswählen
    const shuffled = [...allUpgrades].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 3);

    levelUpOptions = selected.map(upg => {
        const rarity = rollRarity();
        const mult = rarity.multiplier;
        let displayValue;
        if (upg.baseName.includes('Schussrate')) {
            displayValue = Math.round((1 - Math.pow(0.8, mult)) * 100);
        } else if (upg.baseName.includes('Lebensraub')) {
            displayValue = Math.round(upg.baseValue * mult * 100);
        } else if (upg.baseName.includes('Max-Leben')) {
            displayValue = Math.round(upg.baseValue * mult);
        } else if (upg.baseName.includes('Projektil')) {
            displayValue = Math.round(upg.baseValue * mult * 100);
        } else if (upg.baseName.includes('Lauftempo')) {
            displayValue = Math.round(upg.baseValue * mult * 100);
        } else {
            displayValue = Math.round(upg.baseValue * mult * 100);
        }

        let suffix = '%';
        if (upg.baseName.includes('Max-Leben')) suffix = '';

        let displayNameStr;
        if (upg.baseName.includes('XP-Booster')) {
            displayNameStr = `${upg.baseName} (${displayValue}%)`;
        } else {
            displayNameStr = upg.baseName.replace(/\d+%/, displayValue + suffix).replace(/\d+/, displayValue);
        }

        return {
            displayName: displayNameStr,
            rarity: rarity,
            apply: () => upg.apply(mult)
        };
    });
}

function applyLevelUp(index) {
    if (index < 0 || index >= levelUpOptions.length) return;
    levelUpOptions[index].apply();
    player.level++;
    player.xp = 0;
    player.xpToNext = Math.floor(50 * Math.pow(1.25, player.level - 1));
    levelUpSelectedOption = -1;
    gameState = 'PLAYING';
}

// ===== TOUCH-EVENTS =====
function handleTouchStart(e) {
    e.preventDefault();
    isMobile = true;
    const rect = canvas.getBoundingClientRect();

    if (gameState === 'MAIN_MENU') {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const tx = touch.clientX - rect.left;
            const ty = touch.clientY - rect.top;
            if (isInsideStartBtn(tx, ty)) { goToCharSelect(); return; }
            if (isInsideOptionsBtn(tx, ty)) { gameState = 'OPTIONS'; return; }
        }
        return;
    }

    if (gameState === 'CHEST_OPEN') {
        const optW = Math.min(380, CANVAS_WIDTH * 0.4);
        const optH = 110;
        const gap = 40;
        const leftX = CANVAS_WIDTH / 2 - optW - gap / 2;
        const rightX = CANVAS_WIDTH / 2 + gap / 2;
        const optY = 240;
        const leftRect = { x: leftX - 10, y: optY - 5, w: optW + 20, h: optH + 10 };
        const rightRect = { x: rightX - 10, y: optY - 5, w: optW + 20, h: optH + 10 };
        const bw = 260;
        const bh = 64;
        const bx = CANVAS_WIDTH / 2 - bw / 2;
        const by = CANVAS_HEIGHT - 150;

        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const tx = touch.clientX - rect.left;
            const ty = touch.clientY - rect.top;

            if (tx >= leftRect.x && tx <= leftRect.x + leftRect.w && ty >= leftRect.y && ty <= leftRect.y + leftRect.h) {
                chestSelectedOption = 'multishot';
                return;
            }
            if (tx >= rightRect.x && tx <= rightRect.x + rightRect.w && ty >= rightRect.y && ty <= rightRect.y + rightRect.h) {
                chestSelectedOption = 'double';
                return;
            }
            if (tx >= bx && tx <= bx + bw && ty >= by && ty <= by + bh) {
                if (!chestSelectedOption) return;
                if (chestSelectedOption === 'multishot') player.projectileMultiplier *= 2;
                else if (chestSelectedOption === 'double') player.damageMultiplier *= 2;
                chests = chests.filter(c => !c.opened);
                currentChest = null;
                chestSelectedOption = null;
                chestHoveredOption = null;
                gameState = 'PLAYING';
                return;
            }
        }
        return;
    }

    if (gameState === 'CHAR_SELECT') {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const tx = touch.clientX - rect.left;
            const ty = touch.clientY - rect.top;
            if (isInsideCharacterCard(tx, ty, 0)) { selectCharacter(0); return; }
        }
        return;
    }

    if (gameState === 'WEAPON_SELECT') {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const tx = touch.clientX - rect.left;
            const ty = touch.clientY - rect.top;
            const classes = [CLASSES.SNIPER, CLASSES.MACHINEGUN, CLASSES.SHOTGUN];
            const cardWidth = Math.min(220, (CANVAS_WIDTH - 80) / 3);
            const cardHeight = Math.min(260, CANVAS_HEIGHT * 0.45);
            const gap = Math.min(30, (CANVAS_WIDTH - 3 * cardWidth) / 4);
            const totalWidth = classes.length * cardWidth + (classes.length - 1) * gap;
            const startX = (CANVAS_WIDTH - totalWidth) / 2;
            const cardY = Math.min(210, CANVAS_HEIGHT * 0.35);

            for (let j = 0; j < classes.length; j++) {
                const cx = startX + j * (cardWidth + gap);
                if (tx >= cx && tx <= cx + cardWidth && ty >= cardY && ty <= cardY + cardHeight) {
                    selectWeapon(classes[j]);
                    return;
                }
            }
        }
        return;
    }

    if (gameState === 'OPTIONS') {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const tx = touch.clientX - rect.left;
            const ty = touch.clientY - rect.top;
            if (isInsideOptionsBack(tx, ty)) { gameState = 'MAIN_MENU'; initMainMenuParticles(); return; }
        }
        return;
    }

    if (gameState === 'MENU') {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const tx = touch.clientX - rect.left;
            const ty = touch.clientY - rect.top;
            const klasse = getClassAtPosition(tx, ty);
            if (klasse) { startGame(klasse); return; }
        }
        return;
    }

    if (gameState === 'LEVEL_UP') {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const tx = touch.clientX - rect.left;
            const ty = touch.clientY - rect.top;
            const cardW = Math.min(220, (CANVAS_WIDTH - 80) / 3);
            const cardH = Math.min(200, CANVAS_HEIGHT * 0.35);
            const gap = Math.min(30, (CANVAS_WIDTH - 3 * cardW) / 4);
            const totalW = 3 * cardW + 2 * gap;
            const startX = (CANVAS_WIDTH - totalW) / 2;
            const cardY = CANVAS_HEIGHT / 2 - cardH / 2 + 30;

            for (let j = 0; j < 3; j++) {
                const cx = startX + j * (cardW + gap);
                if (tx >= cx && tx <= cx + cardW && ty >= cardY && ty <= cardY + cardH) {
                    levelUpSelectedOption = j;
                    return;
                }
            }

            const bw = 260;
            const bh = 64;
            const bx = CANVAS_WIDTH / 2 - bw / 2;
            const by = CANVAS_HEIGHT - 100;
            if (tx >= bx && tx <= bx + bw && ty >= by && ty <= by + bh) {
                if (levelUpSelectedOption >= 0) applyLevelUp(levelUpSelectedOption);
                return;
            }
        }
        return;
    }

    if (gameState === 'PAUSED') {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const tx = touch.clientX - rect.left;
            const ty = touch.clientY - rect.top;
            if (isInsidePauseBtn(tx, ty, pauseContinueBtn)) { gameState = 'PLAYING'; return; }
            if (isInsidePauseBtn(tx, ty, pauseMenuBtn)) { gameState = 'MAIN_MENU'; resetGameState(); initMainMenuParticles(); return; }
        }
        return;
    }

    if (gameState === 'GAMEOVER') {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const tx = touch.clientX - rect.left;
            const ty = touch.clientY - rect.top;
            const btnX = CANVAS_WIDTH / 2 - 120;
            const btnY = CANVAS_HEIGHT / 2 + 110;
            const btnW = 240;
            const btnH = 52;
            if (tx >= btnX && tx <= btnX + btnW && ty >= btnY && ty <= btnY + btnH) {
                gameState = 'MAIN_MENU'; resetGameState(); initMainMenuParticles(); return; }
        }
        return;
    }

    // --- Ab hier läuft das eigentliche Gameplay (Spielen) ---
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const tx = touch.clientX - rect.left;
        const ty = touch.clientY - rect.top;

        if (isInsideMenuBtn(tx, ty)) {
            gameState = 'PAUSED';
            continue;
        }

        // Linker Stick: Laufen
        if (isInsideJoystickArea(tx, ty)) {
            touchJoystickActive = true;
            touchJoystickId = touch.identifier;
            updateJoystickPosition(tx, ty);
            setJoystickDirection(tx, ty);
            continue;
        }

        // ===== HIER ERSETZEN: Rechter Stick (Ehemals FireButton): Zielen & Feuern =====
        if (isInsideFireButton(tx, ty) || tx > CANVAS_WIDTH / 2) {
            touchFireActive = true;
            touchFireId = touch.identifier;
            
            // DAS HIER FEHLTE: Startpunkt für das dynamische Zielen festlegen!
            touchFireCenterX = tx;
            touchFireCenterY = ty;
            touchFireX = 0;
            touchFireY = 0;
            
            updateAimJoystickPosition(tx, ty);
            continue;
        }
    }
}

function handleTouchMove(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const tx = touch.clientX - rect.left;
        const ty = touch.clientY - rect.top;

        // Bewegung linker Stick
        if (touch.identifier === touchJoystickId) {
            updateJoystickPosition(tx, ty);
            setJoystickDirection(tx, ty);
        }

        // Bewegung rechter Stick (Zielen)
        if (touch.identifier === touchFireId) {
            updateAimJoystickPosition(tx, ty);
        }
    }
}

function handleTouchEnd(e) {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];

        // Linker Stick losgelassen
        if (touch.identifier === touchJoystickId) {
            touchJoystickLastAngle = player.angle;
            touchJoystickActive = false;
            touchJoystickId = -1;
            touchJoystickX = 0;
            touchJoystickY = 0;
            player.vx = 0;
            player.vy = 0;
        }

        // ===== HIER ERSETZEN: Rechter Stick losgelassen (Feuern stoppen) =====
        if (touch.identifier === touchFireId) {
            touchFireActive = false;
            touchFireId = -1;
            
            // NEU: Setzt den inneren Knopf visuell wieder genau in die Mitte zurück, wenn man loslässt
            touchFireX = 0;
            touchFireY = 0;
        }
    }
}

function updateJoystickPosition(tx, ty) {
    const dx = tx - joystickCenterX();
    const dy = ty - joystickCenterY();
    const dist = Math.sqrt(dx*dx + dy*dy);
    const maxDist = joystickRadius - joystickKnobRadius;

    if (dist > maxDist) {
        touchJoystickX = (dx / dist) * maxDist;
        touchJoystickY = (dy / dist) * maxDist;
    } else {
        touchJoystickX = dx;
        touchJoystickY = dy;
    }
}

function setJoystickDirection(tx, ty) {
    const dx = tx - joystickCenterX();
    const dy = ty - joystickCenterY();
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 8) {
        player.vx = dx / len;
        player.vy = dy / len;
    } else {
        player.vx = 0;
        player.vy = 0;
    }
}

// Berechnet die visuelle Verschiebung und den Zielwinkel des rechten Sticks
function updateAimJoystickPosition(tx, ty) {
    // Sicherheits-Check falls es beim ersten Klick hakt:
    if (!touchFireCenterX || touchFireCenterX === 0) {
        touchFireCenterX = fireBtnCenterX();
        touchFireCenterY = fireBtnCenterY();
    }

    const dx = tx - touchFireCenterX;
    const dy = ty - touchFireCenterY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = fireBtnRadius - 25; 

    if (dist > maxDist) {
        touchFireX = (dx / dist) * maxDist;
        touchFireY = (dy / dist) * maxDist;
    } else {
        touchFireX = dx;
        touchFireY = dy;
    }

    // Nur den Winkel ändern, wenn der Finger sich wirklich bewegt hat
    if (dist > 5) {
        player.angle = Math.atan2(dy, dx);
    }
}

function isInsideJoystickArea(tx, ty) {
    return tx <= CANVAS_WIDTH * 0.45 && ty >= CANVAS_HEIGHT * 0.45;
}

function isInsideFireButton(tx, ty) {
    const dx = tx - fireBtnCenterX();
    const dy = ty - fireBtnCenterY();
    return Math.sqrt(dx * dx + dy * dy) < fireBtnRadius + 40; // Toleranzbereich vergrößert für dickere Finger
}

function touchShoot() {
    if (gameState !== 'PLAYING' || !selectedClass) return;
    if (!touchFireActive) return; // Schießt nur, wenn der rechte Stick gehalten wird

    const now = Date.now();
    if (now - lastShotTime < selectedClass.fireRate * player.fireRateMultiplier) return;
    lastShotTime = now;

    const angle = player.angle;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    if (dx === 0 && dy === 0) return;

    fireBullet(dx, dy);
}

// ===== TASTATUR-EVENTS =====
window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();

    // 1. ESCAPE-LOGIK (Die wichtigste, zuerst!)
    if (key === 'escape') {
        playClickSound(); // Sound nur einmal abspielen
        
        if (gameState === 'OPTIONS') {
            gameState = window.previousGameState || 'MAIN_MENU';
            if (gameState === 'MAIN_MENU') initMainMenuParticles();
        } 
        else if (gameState === 'PLAYING') {
            gameState = 'PAUSED';
        } 
        else if (gameState === 'PAUSED') {
            gameState = 'PLAYING';
        }
        // Falls wir in einem Auswahlmenü sind, gehen wir zurück
        else if (gameState === 'CHAR_SELECT') {
            goBackToMenu();
        }
        else if (gameState === 'WEAPON_SELECT') {
            gameState = 'CHAR_SELECT';
        }
        return; // ESC beendet die Funktion hier, damit nix anderes passiert
    }

    // 2. RESTLICHE LOGIK (Nur wenn Escape NICHT gedrückt wurde)
    if (gameState === 'MAIN_MENU') {
        if (key === 'enter' || key === ' ') { goToCharSelect(); return; }
    }

    if (key === 'r' && gameState === 'GAMEOVER') {
        gameState = 'MAIN_MENU';
        resetGameState();
        initMainMenuParticles();
        return;
    }

    if (gameState === 'PAUSED') {
        if (key === 'm') { gameState = 'MAIN_MENU'; resetGameState(); initMainMenuParticles(); return; }
    }

    // Bewegung blockieren, wenn wir nicht spielen
    if (gameState === 'PLAYING' && (key === 'w' || key === 'a' || key === 's' || key === 'd' ||
        key === 'arrowup' || key === 'arrowdown' || key === 'arrowleft' || key === 'arrowright')) {
        e.preventDefault();
    }

    // Bewegung aktivieren (nur wenn wir spielen!)
    if (gameState === 'PLAYING') {
        switch (key) {
            case 'w': keys.w = true; break;
            case 'a': keys.a = true; break;
            case 's': keys.s = true; break;
            case 'd': keys.d = true; break;
            case 'arrowup': keys.up = true; break;
            case 'arrowdown': keys.down = true; break;
            case 'arrowleft': keys.left = true; break;
            case 'arrowright': keys.right = true; break;
        }
    }
});

window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    switch (key) {
        case 'w': keys.w = false; break;
        case 'a': keys.a = false; break;
        case 's': keys.s = false; break;
        case 'd': keys.d = false; break;
        case 'arrowup': keys.up = false; break;
        case 'arrowdown': keys.down = false; break;
        case 'arrowleft': keys.left = false; break;
        case 'arrowright': keys.right = false; break;
    }
});

// ===== MAUS & TASTATUR EVENTS =====

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    
    if (isMobile) return;

    // Lautstärkeregler ziehen (Nutzt deine Variable isDraggingVolume)
    if (isDraggingVolume && gameState === 'OPTIONS') {
        const leftX = CANVAS_WIDTH / 2 - 150;
        const sliderX = leftX + 30;
        const sliderW = 300;
        if (typeof updateVolume === 'function') {
            updateVolume(mouseX, sliderX, sliderW);
        } else if (typeof setMasterVolume === 'function') {
            let pct = (mouseX - sliderX) / sliderW;
            setMasterVolume(Math.max(0, Math.min(1, pct)));
        }
        return; // Kein Hover-Sound beim Ziehen
    }
    
    let currentHover = null;

    if (gameState === 'MAIN_MENU') {
        hoveredButton = isInsideStartBtn(mouseX, mouseY) ? 'start' : 
                       isInsideOptionsBtn(mouseX, mouseY) ? 'options' : null;
        currentHover = hoveredButton;
    } else if (gameState === 'CHAR_SELECT') {
        hoveredCharIndex = -1;
        for (let i = 0; i < 3; i++) {
            if (isInsideCharacterCard(mouseX, mouseY, i)) {
                hoveredCharIndex = i;
                currentHover = 'char_' + i;
                break;
            }
        }
    } else if (gameState === 'WEAPON_SELECT') {
        hoveredWeaponIndex = -1;
        const classes = [CLASSES.SNIPER, CLASSES.MACHINEGUN, CLASSES.SHOTGUN];
        const cardWidth = Math.min(220, (CANVAS_WIDTH - 80) / 3);
        const cardHeight = Math.min(260, CANVAS_HEIGHT * 0.45);
        const gap = Math.min(30, (CANVAS_WIDTH - 3 * cardWidth) / 4);
        const totalWidth = classes.length * cardWidth + (classes.length - 1) * gap;
        const startX = (CANVAS_WIDTH - totalWidth) / 2;
        const cardY = Math.min(210, CANVAS_HEIGHT * 0.35);
        
        for (let i = 0; i < classes.length; i++) {
            const cx = startX + i * (cardWidth + gap);
            if (mouseX >= cx && mouseX <= cx + cardWidth && mouseY >= cardY && mouseY <= cardY + cardHeight) {
                hoveredWeaponIndex = i;
                currentHover = 'weapon_' + i;
                break;
            }
        }
    } else if (gameState === 'LEVEL_UP') {
        levelUpHoveredOption = -1;
        levelUpHoveredContinue = false;
        const cardW = Math.min(220, (CANVAS_WIDTH - 80) / 3);
        const cardH = Math.min(200, CANVAS_HEIGHT * 0.35);
        const gap = Math.min(30, (CANVAS_WIDTH - 3 * cardW) / 4);
        const totalW = 3 * cardW + 2 * gap;
        const startX = (CANVAS_WIDTH - totalW) / 2;
        const cardY = CANVAS_HEIGHT / 2 - cardH / 2 + 30;

        for (let i = 0; i < 3; i++) {
            const cx = startX + i * (cardW + gap);
            if (mouseX >= cx && mouseX <= cx + cardW && mouseY >= cardY && mouseY <= cardY + cardH) {
                levelUpHoveredOption = i;
                currentHover = 'levelup_' + i;
                break;
            }
        }

        const bw = 260, bh = 64, bx = CANVAS_WIDTH / 2 - bw / 2, by = CANVAS_HEIGHT - 100;
        if (mouseX >= bx && mouseX <= bx + bw && mouseY >= by && mouseY <= by + bh) {
            levelUpHoveredContinue = true;
            currentHover = 'levelup_continue';
        }
    } else if (gameState === 'CHEST_OPEN') {
        chestHoveredOption = null;
        const optW = Math.min(380, CANVAS_WIDTH * 0.4), optH = 110, gap = 40;
        const leftX = CANVAS_WIDTH / 2 - optW - gap / 2, rightX = CANVAS_WIDTH / 2 + gap / 2, optY = 240;
        const leftRect = { x: leftX - 10, y: optY - 5, w: optW + 20, h: optH + 10 };
        const rightRect = { x: rightX - 10, y: optY - 5, w: optW + 20, h: optH + 10 };
        const bw = 260, bh = 64, bx = CANVAS_WIDTH / 2 - bw / 2, by = CANVAS_HEIGHT - 150;

        if (mouseX >= leftRect.x && mouseX <= leftRect.x + leftRect.w && mouseY >= leftRect.y && mouseY <= leftRect.y + leftRect.h) {
            chestHoveredOption = 'multishot';
            currentHover = 'chest_multishot';
        } else if (mouseX >= rightRect.x && mouseX <= rightRect.x + rightRect.w && mouseY >= rightRect.y && mouseY <= rightRect.y + rightRect.h) {
            chestHoveredOption = 'double';
            currentHover = 'chest_double';
        } else if (mouseX >= bx && mouseX <= bx + bw && mouseY >= by && mouseY <= by + bh) {
            chestHoveredOption = 'continue';
            currentHover = 'chest_continue';
        }
    } else if (gameState === 'PAUSED') {
        const bw = 260, bh = 50, cx = CANVAS_WIDTH / 2;
        const by1 = CANVAS_HEIGHT / 2 - 20, by2 = CANVAS_HEIGHT / 2 + 50, by3 = CANVAS_HEIGHT / 2 + 120;
        if (mouseX >= cx - bw/2 && mouseX <= cx + bw/2) {
            if (mouseY >= by1 && mouseY <= by1 + bh) currentHover = 'pause_continue';
            else if (mouseY >= by2 && mouseY <= by2 + bh) currentHover = 'pause_options';
            else if (mouseY >= by3 && mouseY <= by3 + bh) currentHover = 'pause_menu';
        }
    } else if (gameState === 'OPTIONS') {
        const backBtnX = 20, backBtnY = 20, backBtnW = 160, backBtnH = 52;
        if (mouseX >= backBtnX && mouseX <= backBtnX + backBtnW && mouseY >= backBtnY && mouseY <= backBtnY + backBtnH) {
            currentHover = 'options_back';
        }
        
        const startY = CANVAS_HEIGHT / 2 - 50, lineHeight = 35, leftX = CANVAS_WIDTH / 2 - 150;
        const sliderX = leftX + 30, sliderY = startY + lineHeight * 2, sliderW = 300, sliderH = 10;
        if (mouseX >= sliderX - 15 && mouseX <= sliderX + sliderW + 15 && mouseY >= sliderY - 15 && mouseY <= sliderY + sliderH + 15) {
            currentHover = 'options_slider';
        }
    }

    if (currentHover !== lastHoveredElement && currentHover !== null) {
        playHoverSound();
    }
    lastHoveredElement = currentHover;
});

canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    mouseDown = true;

    // KORREKTUR: Berechne exakte Klick-Koordinaten direkt aus dem Event!
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    if (gameState === 'OPTIONS') {
        const startY = CANVAS_HEIGHT / 2 - 50, lineHeight = 35, leftX = CANVAS_WIDTH / 2 - 150;
        const sliderX = leftX + 30, sliderY = startY + lineHeight * 2, sliderW = 300, sliderH = 10;
        
        // Nutzt die frisch berechneten clickX / clickY Werte
        if (clickX >= sliderX - 15 && clickX <= sliderX + sliderW + 15 && clickY >= sliderY - 15 && clickY <= sliderY + sliderH + 15) {
            isDraggingVolume = true;
            if (typeof updateVolume === 'function') {
                updateVolume(clickX, sliderX, sliderW);
            }
        }
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
        mouseDown = false;
        isDraggingVolume = false;
    }
});

canvas.addEventListener('click', (e) => {
    ensureAudio(); // Audio explizit aktivieren

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    if (gameState === 'MAIN_MENU') {
        if (isInsideStartBtn(clickX, clickY)) {
            playClickSound();
            goToCharSelect();
            return;
        }
        if (isInsideOptionsBtn(clickX, clickY)) {
            playClickSound();
            window.previousGameState = 'MAIN_MENU'; // Merken, wo wir herkamen
            gameState = 'OPTIONS';
            return;
        }
        return;
    }

    if (gameState === 'CHAR_SELECT') {
        if (isInsideCharacterCard(clickX, clickY, 0)) { playClickSound(); selectCharacter(0); }
        return;
    }

    if (gameState === 'WEAPON_SELECT') {
        const classes = [CLASSES.SNIPER, CLASSES.MACHINEGUN, CLASSES.SHOTGUN];
        const cardW = Math.min(220, (CANVAS_WIDTH - 80) / 3), cardH = Math.min(260, CANVAS_HEIGHT * 0.45);
        const gap = Math.min(30, (CANVAS_WIDTH - 3 * cardW) / 4);
        const startX = (CANVAS_WIDTH - (classes.length * cardW + (classes.length - 1) * gap)) / 2;
        const cardY = Math.min(210, CANVAS_HEIGHT * 0.35);

        for (let i = 0; i < classes.length; i++) {
            const cx = startX + i * (cardW + gap);
            if (clickX >= cx && clickX <= cx + cardW && clickY >= cardY && clickY <= cardY + cardH) {
                playClickSound(); selectWeapon(classes[i]); return;
            }
        }
        return;
    }

    if (gameState === 'MENU') {
        const klasse = getClassAtPosition(clickX, clickY);
        if (klasse) { playClickSound(); startGame(klasse); }
        return;
    }

    if (gameState === 'LEVEL_UP') {
        const cardW = Math.min(220, (CANVAS_WIDTH - 80) / 3), cardH = Math.min(200, CANVAS_HEIGHT * 0.35);
        const gap = Math.min(30, (CANVAS_WIDTH - 3 * cardW) / 4);
        const startX = (CANVAS_WIDTH - (3 * cardW + 2 * gap)) / 2, cardY = CANVAS_HEIGHT / 2 - cardH / 2 + 30;

        for (let j = 0; j < 3; j++) {
            const cx = startX + j * (cardW + gap);
            if (clickX >= cx && clickX <= cx + cardW && clickY >= cardY && clickY <= cardY + cardH) {
                playClickSound(); levelUpSelectedOption = j; return;
            }
        }

        const bw = 260, bh = 64, bx = CANVAS_WIDTH / 2 - bw / 2, by = CANVAS_HEIGHT - 100;
        if (clickX >= bx && clickX <= bx + bw && clickY >= by && clickY <= by + bh) {
            if (levelUpSelectedOption >= 0) { playClickSound(); applyLevelUp(levelUpSelectedOption); }
            return;
        }
        return;
    }

    if (gameState === 'PAUSED') {
        const bw = 260, bh = 50, cx = CANVAS_WIDTH / 2;
        const by1 = CANVAS_HEIGHT / 2 - 20, by2 = CANVAS_HEIGHT / 2 + 50, by3 = CANVAS_HEIGHT / 2 + 120;

        if (clickX >= cx - bw/2 && clickX <= cx + bw/2) {
            if (clickY >= by1 && clickY <= by1 + bh) { 
                playClickSound(); gameState = 'PLAYING'; return; 
            }
            if (clickY >= by2 && clickY <= by2 + bh) { 
                playClickSound(); window.previousGameState = 'PAUSED'; gameState = 'OPTIONS'; return; 
            }
            if (clickY >= by3 && clickY <= by3 + bh) { 
                playClickSound(); gameState = 'MAIN_MENU'; resetGameState(); initMainMenuParticles(); return; 
            }
        }
        return;
    }

    if (gameState === 'CHEST_OPEN') {
        const optW = Math.min(380, CANVAS_WIDTH * 0.4), optH = 110, gap = 40;
        const leftX = CANVAS_WIDTH / 2 - optW - gap / 2, rightX = CANVAS_WIDTH / 2 + gap / 2, optY = 240;
        const leftRect = { x: leftX - 10, y: optY - 5, w: optW + 20, h: optH + 10 };
        const rightRect = { x: rightX - 10, y: optY - 5, w: optW + 20, h: optH + 10 };
        const bw = 260, bh = 64, bx = CANVAS_WIDTH / 2 - bw / 2, by = CANVAS_HEIGHT - 150;

        if (clickX >= leftRect.x && clickX <= leftRect.x + leftRect.w && clickY >= leftRect.y && clickY <= leftRect.y + leftRect.h) {
            playClickSound(); chestSelectedOption = 'multishot'; return;
        }
        if (clickX >= rightRect.x && clickX <= rightRect.x + rightRect.w && clickY >= rightRect.y && clickY <= rightRect.y + rightRect.h) {
            playClickSound(); chestSelectedOption = 'double'; return;
        }
        if (clickX >= bx && clickX <= bx + bw && clickY >= by && clickY <= by + bh) {
            if (!chestSelectedOption) return;
            playClickSound();
            if (chestSelectedOption === 'multishot') player.projectileMultiplier *= 2;
            else if (chestSelectedOption === 'double') player.damageMultiplier *= 2;
            
            chests = chests.filter(c => !c.opened);
            currentChest = null;
            chestSelectedOption = null;
            chestHoveredOption = null;
            gameState = 'PLAYING';
            return;
        }
        return;
    }

    if (gameState === 'OPTIONS') {
        const backBtnX = 20, backBtnY = 20, backBtnW = 160, backBtnH = 52;
        if (clickX >= backBtnX && clickX <= backBtnX + backBtnW && clickY >= backBtnY && clickY <= backBtnY + backBtnH) {
            playClickSound();
            // Geht exakt dorthin zurück, wo wir herkommen (Pause oder Main Menu)
            gameState = window.previousGameState || 'MAIN_MENU';
            if (gameState === 'MAIN_MENU') initMainMenuParticles();
            return;
        }
        return;
    }

    if (gameState === 'GAMEOVER') {
        const btnX = CANVAS_WIDTH / 2 - 120, btnY = CANVAS_HEIGHT / 2 + 110, btnW = 240, btnH = 52;
        if (clickX >= btnX && clickX <= btnX + btnW && clickY >= btnY && clickY <= btnY + btnH) {
            playClickSound(); gameState = 'MAIN_MENU'; resetGameState(); initMainMenuParticles(); return;
        }
        return;
    }

    if (gameState === 'PLAYING') {
        if (isInsideMenuBtn(clickX, clickY)) { playClickSound(); gameState = 'PAUSED'; return; }
    }

    if (gameState !== 'PLAYING' || !selectedClass) return;
    const now = Date.now();
    if (now - lastShotTime < selectedClass.fireRate * player.fireRateMultiplier) return;
    lastShotTime = now;
    const dx = clickX - CANVAS_WIDTH / 2;
    const dy = clickY - CANVAS_HEIGHT / 2;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) return;
    fireBullet(dx / length, dy / length);
});


// ===== GEMEINSAME SCHUSS-FUNKTION =====
function fireBullet(dirX, dirY) {
    if (!selectedClass) return;

    const mult = Number(player.projectileMultiplier) || 1;
    const basePellets = Number(selectedClass.pellets) || 1;
    const finalCount = Math.max(1, Math.round(basePellets * mult));
    const dmg = Math.round((Number(selectedClass.damage) || 0) * (Number(player.damageMultiplier) || 1));
    const bulletSize = Number(selectedClass.bulletSize) || 4;
    const bulletSpeed = Number(selectedClass.bulletSpeed) || 10;

    try { playShootSound(); } catch (e) { /* ignore */ }

    if (selectedClass.id === 1) {
        const baseAngle = Math.atan2(dirY, dirX);
        const spread = 0.04;

        for (let i = 0; i < finalCount; i++) {
            const offset = (i - (finalCount - 1) / 2) * spread;
            const angle = baseAngle + offset;
            bullets.push({
                x: player.x - bulletSize,
                y: player.y - bulletSize,
                size: bulletSize * 2,
                vx: Math.cos(angle) * bulletSpeed,
                vy: Math.sin(angle) * bulletSpeed,
                damage: dmg,
                piercing: true,
                hitEnemies: [], // NEU: Verhindert Mehrfachtreffer pro Gegner
                color: '#ff88ff',
                glow: '#ff00ff',
                startX: player.x,
                startY: player.y,
                life: 300
            });
        }

    } else if (selectedClass.id === 2) {
        for (let i = 0; i < finalCount; i++) {
            bullets.push({
                x: player.x - bulletSize,
                y: player.y - bulletSize,
                size: bulletSize * 2,
                vx: dirX * bulletSpeed + (Math.random() - 0.5) * 1.5 + (i - (finalCount - 1) / 2) * 0.6,
                vy: dirY * bulletSpeed + (Math.random() - 0.5) * 1.5 + (i - (finalCount - 1) / 2) * 0.6,
                damage: dmg,
                piercing: false,
                hitEnemies: [], // NEU: Einheitlich für alle Projektile
                color: '#ffff00',
                glow: '#ffaa00',
                startX: player.x,
                startY: player.y,
                life: 300
            });
        }

    } else if (selectedClass.id === 3) {
        const spread = Number(selectedClass.spreadAngle) || 0.6;
        const baseAngle = Math.atan2(dirY, dirX);

        for (let i = 0; i < finalCount; i++) {
            const offset = finalCount > 1 ? (i / (finalCount - 1) - 0.5) * spread : 0;
            const angle = baseAngle + offset;
            const spd = bulletSpeed * (0.85 + Math.random() * 0.3);
            bullets.push({
                x: player.x - bulletSize,
                y: player.y - bulletSize,
                size: bulletSize * 2,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                damage: dmg,
                piercing: false,
                hitEnemies: [], // NEU: Einheitlich für alle Projektile
                maxRange: Number(selectedClass.maxRange) || 300,
                color: '#ffaa44',
                glow: '#ff4400',
                startX: player.x,
                startY: player.y,
                life: 300
            });
        }
    }
}



// ===== SPIEL STARTEN =====
function startGame(klasse) {
    // 1. WICHTIG: erst Karte generieren bevor wir in PLAYING übergehen
    initLevelGeneration();

    selectedClass = klasse;
    gameState = 'PLAYING';
    
    resetPlayerPosition();
    resetGameState();
    lastShotTime = 0;
    gameTime = 0;
    lastTimerUpdate = Date.now();

    spawnInterval = 2000;
    if (spawnTimerId) clearInterval(spawnTimerId);
    spawnTimerId = setInterval(spawnEnemy, spawnInterval);

    spawnEnemy();
    spawnEnemy();
}

function resetGameState() {
    player.maxHealth = 100;
    player.health = player.maxHealth;
    player.level = 1;
    player.xp = 0;
    player.xpToNext = 50;
    player.vx = 0;
    player.vy = 0;
    player.damageMultiplier = 1.0;
    player.speedMultiplier = 1.0;
    player.fireRateMultiplier = 1.0;
    player.bulletSpeedMultiplier = 1.0;
    player.projectileMultiplier = 1.0;
    player.xpMultiplier = 1.0;
    player.lifesteal = 0;
    bullets = [];
    enemies = [];
    particles = [];
    xpCrystals = [];
    score = 0;
    difficultyLevel = 1;
    enemyBaseSpeed = 1.2;
    minibossSpawned = false;
    gridOffsetX = 0;
    gridOffsetY = 0;
    gameTime = 0;

    if (spawnTimerId) {
        clearInterval(spawnTimerId);
        spawnTimerId = null;
    }
}

function resetPlayerPosition() {
    const worldSize = 6000;
    const spawnRange = 3000; 
    const center = worldSize / 2; // 3000
    const offset = spawnRange / 2; // 1500

    // Das ergibt einen Bereich zwischen 1500 und 4500
    player.x = (center - offset) + Math.random() * spawnRange;
    player.y = (center - offset) + Math.random() * spawnRange;

    // Kamera synchronisieren
    cameraX = player.x;
    cameraY = player.y;
    gridOffsetX = cameraX;
    gridOffsetY = cameraY;
}

// ===== GEGNER SPAWNEN =====
function spawnEnemy() {
    if (gameState !== 'PLAYING') return;

    const size = 22;
    const baseSpeed = enemyBaseSpeed + (difficultyLevel - 1) * 0.18;
    let x, y;
    const side = Math.floor(Math.random() * 4);

    switch (side) {
        case 0: x = cameraX - CANVAS_WIDTH / 2 + Math.random() * CANVAS_WIDTH; y = cameraY - size - 20; break;
        case 1: x = cameraX + CANVAS_WIDTH / 2 + size + 20; y = cameraY - CANVAS_HEIGHT / 2 + Math.random() * CANVAS_HEIGHT; break;
        case 2: x = cameraX - CANVAS_WIDTH / 2 + Math.random() * CANVAS_WIDTH; y = cameraY + CANVAS_HEIGHT / 2 + size + 20; break;
        case 3: x = cameraX - CANVAS_WIDTH / 2 - size - 20; y = cameraY - CANVAS_HEIGHT / 2 + Math.random() * CANVAS_HEIGHT; break;
    }

    // Ensure enemy does not spawn too close to the player (safe radius)
    const safeRadius = 300;
    let attempts = 0;
    while (attempts < 8) {
        const dxp = x - player.x;
        const dyp = y - player.y;
        const dist = Math.sqrt(dxp * dxp + dyp * dyp);
        if (dist >= safeRadius) break;
        // push the spawn point away along its vector from player
        let nx = dxp;
        let ny = dyp;
        const nlen = Math.sqrt(nx * nx + ny * ny) || 1;
        nx = nx / nlen;
        ny = ny / nlen;
        x = player.x + nx * safeRadius + (Math.random() - 0.5) * 80;
        y = player.y + ny * safeRadius + (Math.random() - 0.5) * 80;
        attempts++;
    }

    // Determine enemy type based on elapsed time
    const minute = Math.floor(gameTime / 60);
    const possibleTypes = [];
    // Type 1 always
    possibleTypes.push(1);
    if (minute >= 1) possibleTypes.push(2);
    if (minute >= 2) possibleTypes.push(3);

    const chosen = possibleTypes[Math.floor(Math.random() * possibleTypes.length)];

    let etype = 'STANDARD';
    let ecolor = '#ff3333';
    let eglow = '#ff0000';
    let espeed = baseSpeed;
    let ehealth = 100;
    let expValue = 1;

    if (chosen === 1) {
        etype = 'STANDARD';
        ecolor = '#ff3333'; eglow = '#ff0000'; espeed = baseSpeed; ehealth = 100; expValue = 1;
    } else if (chosen === 2) {
        etype = 'TANK';
        ecolor = '#ffff55'; eglow = '#ffff88'; espeed = baseSpeed * 0.45; ehealth = 500; expValue = 3;
    } else if (chosen === 3) {
        etype = 'RUNNER';
        ecolor = '#ff55ff'; eglow = '#ff88ff'; espeed = baseSpeed * 1.8; ehealth = 40; expValue = 2;
    }

    enemies.push({
        x, y, size, speed: espeed,
        color: ecolor, glow: eglow,
        angle: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.03,
        health: ehealth,
        maxHealth: ehealth,
        type: etype,
        xpValue: expValue
    });
}

// ==== MINIBOSS SPAWNEN =====
function spawnMiniboss() {
    if (gameState !== 'PLAYING') return;
    
    const size = 70; 
    const hp = 5000; 
    
    // Zufällige Himmelsrichtung berechnen
    const randomAngle = Math.random() * Math.PI * 2;
    const spawnDistance = 450; 
    
    const bx = player.x + Math.cos(randomAngle) * spawnDistance;
    const by = player.y + Math.sin(randomAngle) * spawnDistance;
    
    enemies.push({
        x: bx, 
        y: by, 
        size: size, 
        baseSize: size, // NEU: Wichtig für den pulsierenden Herzschlag-Effekt
        speed: enemyBaseSpeed * 1.2, 
        color: '#aa44ff', 
        glow: '#ff88ff',
        angle: 0,
        rotSpeed: 0.005,
        health: hp,
        maxHealth: hp,
        type: 'MINIBOSS',
        xpValue: 500, 
        dropCount: 25,
        // NEU: Boss-Attacken-Werte
        lastAttackTime: Date.now() - 3000, 
        lastDamageTime: 0,
        attackCooldown: 3000 // Greift alle 3 Sekunden an (3000 Millisekunden)
    });
    
    minibossSpawned = true;
}

// ===== XP-KRISTALL DROPPEN =====
function dropXpCrystal(x, y, count = 1, totalValue = 1) {
    // Berechne den Wert pro Kristall (z.B. 500 XP / 25 Kristalle = 20 XP pro Kristall)
    const valuePerCrystal = totalValue / count;

    for (let i = 0; i < count; i++) {
        xpCrystals.push({
            // Streue die Kristalle in einem schönen Kreis um den Todesort des Bosses
            x: x + (Math.random() - 0.5) * 60,
            y: y + (Math.random() - 0.5) * 60,
            size: count > 1 ? 8 : 6, // Boss-Kristalle sind ein kleines bisschen größer!
            color: count > 1 ? '#aa44ff' : '#4488ff', // Lila für Boss-Loot, Blau für Standard
            glow: count > 1 ? '#ff88ff' : '#0044ff',
            collected: false,
            value: valuePerCrystal
        });
    }
}

// ===== EXPLOSION =====
function createExplosion(x, y, count, color, glowColor, speed) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = (Math.random() * 0.5 + 0.5) * speed;
        particles.push({
            x, y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            size: Math.random() * 4 + 2,
            life: 1.0,
            decay: Math.random() * 0.02 + 0.015,
            color, glow: glowColor
        });
    }
}

// ===== SCHWIERIGKEIT =====
function increaseDifficulty() {
    if (gameState !== 'PLAYING') return;
    difficultyLevel++;
    const newInterval = Math.max(500, spawnInterval - 150);
    if (newInterval !== spawnInterval) {
        spawnInterval = newInterval;
        clearInterval(spawnTimerId);
        spawnTimerId = setInterval(spawnEnemy, spawnInterval);
    }
}
setInterval(increaseDifficulty, 15000);

function getDeterministicRandom(x, y) {
    // Ein einfacher Hash, der aus Koordinaten eine Zahl macht
    const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return hash - Math.floor(hash);
}

function update() {
    const W_WIDTH = (typeof WORLD_WIDTH !== 'undefined') ? WORLD_WIDTH : 6000;
    const W_HEIGHT = (typeof WORLD_HEIGHT !== 'undefined') ? WORLD_HEIGHT : 6000;

    // 1. Menü-Partikel (laufen immer, wenn wir im Hauptmenü sind)
    if (gameState === 'MENU') {
        for (const p of menuParticles) {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0) p.x = CANVAS_WIDTH;
            if (p.x > CANVAS_WIDTH) p.x = 0;
            if (p.y < 0) p.y = CANVAS_HEIGHT;
            if (p.y > CANVAS_HEIGHT) p.y = 0;
        }
        lastTimerUpdate = Date.now();
        return;
    }

    // 2. Andere Menüs/Zustände: Spiel-Logik pausieren
    if (['PAUSED', 'GAMEOVER', 'LEVEL_UP', 'CHEST_OPEN', 'MAIN_MENU', 'OPTIONS', 'CHAR_SELECT', 'WEAPON_SELECT'].includes(gameState)) {
        lastTimerUpdate = Date.now();
        return;
    }

    // 3. PLAYING: Spiel-Logik
    if (gameState === 'PLAYING') {
        // NaN Sicherheits-Reset
        if (isNaN(player.x)) player.x = 100;
        if (isNaN(player.y)) player.y = 100;

        const now = Date.now();
        if (lastTimerUpdate > 0) {
            gameTime += (now - lastTimerUpdate) / 1000;
        }
        lastTimerUpdate = now;

        const speed = (player.speed || 3.2) * (player.speedMultiplier || 1.0);

        if (keys.w || keys.up) player.y -= speed;
        if (keys.s || keys.down) player.y += speed;
        if (keys.a || keys.left) player.x -= speed;
        if (keys.d || keys.right) player.x += speed;

        if (isMobile && touchJoystickActive) {
            player.x += (player.vx || 0) * speed;
            player.y += (player.vy || 0) * speed;
        }

        player.x = Math.max(0, Math.min(W_WIDTH, player.x));
        player.y = Math.max(0, Math.min(W_HEIGHT, player.y));

        cameraX = player.x;
        cameraY = player.y;
        gridOffsetX = cameraX;
        gridOffsetY = cameraY;

        if (!minibossSpawned && gameTime >= 10) {
            spawnMiniboss();
        }

        if (!isMobile) {
            player.angle = Math.atan2(mouseY - CANVAS_HEIGHT / 2, mouseX - CANVAS_WIDTH / 2);
        }

        for (let i = bullets.length - 1; i >= 0; i--) {
            const b = bullets[i];
            b.x += b.vx;
            b.y += b.vy;

            if (b.maxRange) {
                const dist = Math.sqrt((b.x - b.startX) ** 2 + (b.y - b.startY) ** 2);
                if (dist > b.maxRange) { bullets.splice(i, 1); continue; }
            }

            b.life--;
            if (b.life <= 0) {
                bullets.splice(i, 1);
                continue;
            }

            if (b.isEnemyBullet) {
                const distToPlayer = Math.sqrt((b.x - player.x) ** 2 + (b.y - player.y) ** 2);
                if (distToPlayer < (player.size || 12) + b.size) {
                    player.health -= b.damage;
                    createExplosion(player.x, player.y, 10, '#ff0055', '#ff0000', 3);
                    bullets.splice(i, 1);
                    if (player.health <= 0) {
                        player.health = 0;
                        gameState = 'GAMEOVER';
                        if (spawnTimerId) clearInterval(spawnTimerId);
                    }
                    continue;
                }
            }
        }

        for (let i = 0; i < enemies.length; i++) {
            const e = enemies[i];
            const dx = player.x - e.x;
            const dy = player.y - e.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const isScreaming = (Date.now() - (e.lastAttackTime || 0)) < 1000;

            if (length > 0) {
                if (e.type !== 'MINIBOSS' || !isScreaming) {
                    e.x += (dx / length) * e.speed;
                    e.y += (dy / length) * e.speed;
                }
            }

            if (e.type !== 'MINIBOSS') {
                e.angle += e.rotSpeed;
            } else {
                e.angle = Math.atan2(dy, dx);
            }

            if (e.type === 'MINIBOSS') {
                if (!e.lastAttackTime) e.lastAttackTime = Date.now();
                if (!e.lastDamageTime) e.lastDamageTime = 0;
                const now = Date.now();

                if (now - e.lastAttackTime > 6000) {
                    e.lastAttackTime = now;
                    try { playBossScreamSound(); } catch (err) {}
                }

                const timeSinceAttack = now - e.lastAttackTime;
                const isScreamingNow = timeSinceAttack > 0 && timeSinceAttack < 1000;

                if (isScreamingNow) {
                    const distToPlayer = Math.sqrt((player.x - e.x)**2 + (player.y - e.y)**2);
                    const angleToPlayer = Math.atan2(player.y - e.y, player.x - e.x);
                    let angleDiff = Math.abs(angleToPlayer - e.angle);
                    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

                    if (distToPlayer < 350 && angleDiff < Math.PI / 6) {
                        if (now - e.lastDamageTime > 100) {
                            player.health -= 2.5;
                            e.lastDamageTime = now;
                            screenDamageFlash = 0.4;
                            createExplosion(player.x, player.y, 5, '#ff4400', '#ff0000', 1);
                        }
                    }
                }
            }
        }

        for (let i = 0; i < chests.length; i++) {
            const ch = chests[i];
            if (ch.opened) continue;
            const dx = player.x - ch.x;
            const dy = player.y - ch.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 30) {
                ch.opened = true;
                currentChest = ch;
                chestSelectedOption = null;
                gameState = 'CHEST_OPEN';
                try { playChestOpenSound(); } catch (e) {}
                for (let p = 0; p < 24; p++) {
                    const ang = Math.random() * Math.PI * 2;
                    const spd = 2 + Math.random() * 4;
                    particles.push({ x: ch.x, y: ch.y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - 0.6, size: 2 + Math.random() * 3, life: 1.2, decay: 0.02 + Math.random() * 0.03, color: '#fff9c4', glow: '#ffd700' });
                }
                break;
            }
        }

        for (let i = bullets.length - 1; i >= 0; i--) {
            const b = bullets[i];
            let bulletRemoved = false;
            if (!b.hitEnemies) b.hitEnemies = [];

            for (let j = enemies.length - 1; j >= 0; j--) {
                const e = enemies[j];
                if (b.hitEnemies.includes(e)) continue;

                if (b.x < e.x + e.size && b.x + b.size > e.x - e.size &&
                    b.y < e.y + e.size && b.y + b.size > e.y - e.size) {
                    b.hitEnemies.push(e);
                    e.health -= b.damage;

                    if (player.lifesteal > 0) {
                        const healAmount = Math.round(b.damage * player.lifesteal);
                        player.health = Math.min(player.health + healAmount, player.maxHealth);
                    }

                    if (e.health <= 0) {
                        try { playEnemyDeathSound(); } catch (err) {}
                        createExplosion(e.x, e.y, 20, e.color || '#ff4444', e.glow || '#ff0000', 4);
                        createExplosion(e.x, e.y, 6, '#ffaa00', '#ff6600', 2);

                        if (e.type === 'MINIBOSS') {
                            chests.push({ x: e.x, y: e.y, opened: false });
                            createExplosion(e.x, e.y, 30, '#ffdd77', '#ffd700', 6);
                            dropXpCrystal(e.x, e.y, e.dropCount || 25, e.xpValue || 500);
                            score += 2000;
                            enemies.splice(j, 1);
                            bulletRemoved = true;
                            break;
                        } else {
                            const drops = e.xpValue || 1;
                            dropXpCrystal(e.x, e.y, drops, drops);
                            enemies.splice(j, 1);
                            score += 100 * (e.xpValue || 1);
                            bulletRemoved = true;
                            break;
                        }
                    }
                    if (!b.piercing) {
                        bullets.splice(i, 1);
                        bulletRemoved = true;
                        break;
                    }
                }
            }
            if (bulletRemoved) continue;
        }

        for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            const dist = Math.sqrt((e.x - player.x) ** 2 + (e.y - player.y) ** 2);

            if (dist < e.size + 15) {
                let damageToPlayer = 10;
                if (e.type === 'MINIBOSS') {
                    damageToPlayer = 40;
                } else if (e.size > 20) {
                    damageToPlayer = 30;
                } else if (e.speed < 2.5) {
                    damageToPlayer = 20;
                }

                player.health -= damageToPlayer;
                screenDamageFlash = 0.4;
                const now = Date.now();
                if (now - lastDamageSoundTime > 100) {
                    try { playDamageSound(); } catch (err) {}
                    lastDamageSoundTime = now;
                }
                createExplosion(player.x, player.y, 8, '#ff4444', '#ff0000', 2);

                if (e.type === 'MINIBOSS') {
                    const angle = Math.atan2(player.y - e.y, player.x - e.x);
                    player.x += Math.cos(angle) * 20;
                    player.y += Math.sin(angle) * 20;
                } else {
                    enemies.splice(i, 1);
                }

                if (player.health <= 0) {
                    player.health = 0;
                    gameState = 'GAMEOVER';
                    if (spawnTimerId) clearInterval(spawnTimerId);
                }
            }
        }

        const magnetRadius = player.magnetRadius || 100;
        const collectRadius = 15;

        for (let i = xpCrystals.length - 1; i >= 0; i--) {
            const c = xpCrystals[i];
            const dx = player.x - c.x;
            const dy = player.y - c.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < magnetRadius) {
                const speed = 6;
                c.x += (dx / dist) * speed;
                c.y += (dy / dist) * speed;
            }

            if (dist < collectRadius) {
                player.xp += 10 * c.value * player.xpMultiplier;
                try { playXpSound(); } catch (e) {}
                for (let k = 0; k < 8; k++) {
                    const ang = Math.random() * Math.PI * 2;
                    const spd = 1 + Math.random() * 2.5;
                    particles.push({ x: c.x, y: c.y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, size: Math.random() * 3 + 1, life: 1.0, decay: 0.02 + Math.random() * 0.02, color: '#88ff88', glow: '#66ff66' });
                }
                xpCrystals.splice(i, 1);

                if (player.xp >= player.xpToNext) {
                    gameState = 'LEVEL_UP';
                    generateLevelUpOptions();
                    levelUpSelectedOption = -1;
                    try { playLevelUpSound(); } catch (e) {}
                }
            }
        }

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.98;
            p.vy *= 0.98;
            p.life -= p.decay;
            p.size *= 0.99;
            if (p.life <= 0 || p.size < 0.5) particles.splice(i, 1);
        }
    }
}

// ===== ZEICHNEN =====
function drawMinimap() {
    const mapSize = 187.5; // Größe der Minimap in Pixeln
    const margin = 20;   // Abstand vom rechten unteren Rand
    const mapX = CANVAS_WIDTH - mapSize - margin;
    const mapY = CANVAS_HEIGHT - mapSize - margin;

    // Hintergrund der Minimap
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.fillRect(mapX, mapY, mapSize, mapSize);
    ctx.strokeRect(mapX, mapY, mapSize, mapSize);

    // Skalierungsfaktor (Welt zu Minimap)
    const scaleX = mapSize / WORLD_WIDTH;
    const scaleY = mapSize / WORLD_HEIGHT;

    // Truhen zeichnen
    ctx.fillStyle = 'gold';
    for (const ch of chests) {
        if (!ch.opened) {
            const chX = mapX + (ch.x * scaleX);
            const chY = mapY + (ch.y * scaleY);
            // Größe von 3 auf 4 erhöht (wegen der 25% größeren Map)
            ctx.fillRect(chX - 1.5, chY - 1.5, 4, 4); 
        }
    }

    // Spieler zeichnen
    ctx.fillStyle = '#00ffcc';
    const pX = mapX + (player.x * scaleX);
    const pY = mapY + (player.y * scaleY);
    // Größe von 4 auf 5 erhöht
    ctx.fillRect(pX - 2.5, pY - 2.5, 5, 5);
}


function drawGrid() {
    if (isNaN(cameraX)) cameraX = 0; 
    const cellSize = 50;
    
    // Bezugspunkt
    const worldStartX = -cameraX + CANVAS_WIDTH / 2;
    const worldStartY = -cameraY + CANVAS_HEIGHT / 2;

    // 1. Hintergrund-Basis (Falls was fehlt)
    ctx.fillStyle = '#1a1a2e'; 
    ctx.fillRect(worldStartX, worldStartY, WORLD_WIDTH, WORLD_HEIGHT);

    // 2. Prozedurale Tiles zeichnen
    // Wir iterieren über das Gitter und holen uns die Daten aus dem Cache
    for (let x = 0; x < WORLD_WIDTH; x += cellSize) {
        for (let y = 0; y < WORLD_HEIGHT; y += cellSize) {
            
            const drawX = worldStartX + x;
            const drawY = worldStartY + y;

            // Performance-Check: Nur zeichnen, was auf dem Bildschirm ist
            if (drawX > -cellSize && drawX < CANVAS_WIDTH && drawY > -cellSize && drawY < CANVAS_HEIGHT) {
                
                // Index für das Grid-Cache
                const gridX = Math.floor(x / cellSize);
                const gridY = Math.floor(y / cellSize);
                const data = levelGridData[`${gridX},${gridY}`] || { shade: 0.5, noise: 0.5 };

                // A. Bodenfarbe (Erdtöne)
                const lightness = 15 + (data.shade * 10); // Helligkeit leicht variieren
                ctx.fillStyle = `hsl(30, 20%, ${lightness}%)`; 
                ctx.fillRect(drawX, drawY, cellSize, cellSize);

                // B. Kleine "Dreck-Flecken" (Textur-Ersatz)
                if (data.noise > 0.75) {
                    ctx.fillStyle = `hsl(30, 25%, ${lightness - 5}%)`; // Etwas dunkler
                    ctx.fillRect(drawX + 10, drawY + 10, 10, 10);
                }
                if (data.noise > 0.9) {
                    ctx.fillStyle = `hsl(30, 25%, ${lightness - 8}%)`;
                    ctx.fillRect(drawX + 30, drawY + 30, 8, 8);
                }
            }
        }
    }

    // 3. Goldener Rahmen (Grenze der Welt)
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 15;
    ctx.strokeRect(worldStartX, worldStartY, WORLD_WIDTH, WORLD_HEIGHT);
}

function drawPlayer() {
    ctx.save();
    
    ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

    // Bewegungserkennung (bleibt gleich)
    const dx = player.x - (player.lastX || player.x);
    const dy = player.y - (player.lastY || player.y);
    const isMoving = Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1;

    player.lastX = player.x;
    player.lastY = player.y;
    
    // Wackel-Effekt
    const wobbleAngle = isMoving ? Math.sin(Date.now() / 120) * 0.15 : 0; 
    const bobY = isMoving ? Math.abs(Math.sin(Date.now() / 120)) * 4 : 0; 
    
    // Spiegelung
    const faceRight = Math.cos(player.angle) > 0; 

    // Transformationen
    ctx.translate(0, -bobY);
    ctx.rotate(wobbleAngle);
    
    if (faceRight) {
        ctx.scale(-1, 1);
    }

    const imgW = 64;
    const imgH = 94;

    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00ffcc'; 

    if (playerSprite.complete && playerSprite.naturalWidth !== 0) {
        ctx.drawImage(playerSprite, -imgW / 2, -imgH * 0.6, imgW, imgH);
    } else {
        ctx.fillStyle = 'gray';
        ctx.fillRect(-imgW / 2, -imgH * 0.6, imgW, imgH);
    }

    ctx.restore();
}

function drawEnemy(e) {
    ctx.save();
    const drawX = e.x - cameraX + CANVAS_WIDTH / 2;
    const drawY = e.y - cameraY + CANVAS_HEIGHT / 2;
    ctx.translate(drawX, drawY);
    ctx.rotate(e.angle);
    const s = e.size;

    // ===== NEU: MINIBOSS BILD & HERZSCHLAG & SCHREI-EFFEKT =====
    if (e.type === 'MINIBOSS') {
        const hpRatio = e.health / e.maxHealth;
        const pulseSpeed = 100 + (hpRatio * 200); 
        const pulse = Math.sin(Date.now() / pulseSpeed) * 0.15; 
        const currentSize = e.baseSize * (1 + pulse); 
        const imgW = currentSize * 1.9; // Breite des Bildes
        const imgH = currentSize * 2.2; // Höhe des Bildes (soldatiger / hochkant)

        // Prüfen, ob der Boss gerade "schreit" (Dauer jetzt 1000ms)
        const timeSinceAttack = Date.now() - (e.lastAttackTime || 0);
        const isScreaming = timeSinceAttack > 0 && timeSinceAttack < 1000;

        // 1. Schrei-Kegel mit "Schallwellen-Effekt"
if (isScreaming) {
    ctx.save();
    
    // Kegel-Grundform
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(-Math.PI / 6) * 350, Math.sin(-Math.PI / 6) * 350);
    ctx.lineTo(Math.cos(Math.PI / 6) * 350, Math.sin(Math.PI / 6) * 350);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 0, 0, 0.25)';
    ctx.fill();

    // SCHALLWELLEN-EFFEKT:
    // Wir zeichnen 3 weiße Bögen, die vom Boss weg nach außen driften
    const time = Date.now() % 1000; // 0 bis 1000ms
    const waveProgress = time / 1000; // Fortschritt 0.0 bis 1.0

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;

    for (let i = 1; i <= 3; i++) {
        // Die Welle startet beim Boss und wandert bis zum Ende (400px)
        const waveDist = (waveProgress * 350 + (i * 130)) % 350;
        
        ctx.beginPath();
        // Wir zeichnen einen Bogen, der den Kegel schneidet
        ctx.arc(0, 0, waveDist, -Math.PI / 6, Math.PI / 6);
        ctx.stroke();
    }
    ctx.restore();
}

        // 2. Boss zeichnen
        ctx.shadowBlur = isScreaming ? 60 : 40;
        ctx.shadowColor = isScreaming ? '#ff0000' : (e.glow || '#9900ff');

        if (minibossSprite.complete && minibossSprite.naturalWidth !== 0) {
            ctx.drawImage(minibossSprite, -imgW / 2, -imgH / 2, imgW, imgH);
        } else {
            // Falls kein Bild geladen ist, zeichnen wir ein Rechteck, das auch hochkant ist
            ctx.fillStyle = e.color || '#9900ff';
            ctx.fillRect(-imgW / 2, -imgH / 2, imgW, imgH);
}
        
        ctx.restore();
        return; 
    }

    // --- ALTE LOGIK FÜR NORMALE GEGNER ---
    let colorStart = '#ff6666';
    let colorMid = '#ff3333';
    let colorEnd = '#880000';
    let shadowColor = '#ff0000';

    if (e.type === 'TANK') {
        colorStart = '#ffff88';
        colorMid = '#ffff00';
        colorEnd = '#bbbb00';
        shadowColor = '#ffff00';
    } else if (e.type === 'RUNNER') {
        colorStart = '#ff99ff';
        colorMid = '#ff00ff';
        colorEnd = '#cc00cc';
        shadowColor = '#ff00ff';
    } 

    ctx.shadowBlur = 15;
    ctx.shadowColor = shadowColor;

    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s, 0);
    ctx.lineTo(0, s);
    ctx.lineTo(-s, 0);
    ctx.closePath();

    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, s);
    grad.addColorStop(0, colorStart);
    grad.addColorStop(0.5, colorMid);
    grad.addColorStop(1, colorEnd);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.shadowBlur = 20;
    ctx.shadowColor = shadowColor;
    ctx.strokeStyle = colorMid;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.restore();
}

function drawBullet(b) {
    ctx.save();
    const drawX = b.x - cameraX + CANVAS_WIDTH / 2;
    const drawY = b.y - cameraY + CANVAS_HEIGHT / 2;
    ctx.shadowBlur = 12;
    ctx.shadowColor = b.glow;
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(drawX + b.size / 2, drawY + b.size / 2, b.size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
}

function drawParticles() {
    for (const p of particles) {
        const drawX = p.x - cameraX + CANVAS_WIDTH / 2;
        const drawY = p.y - cameraY + CANVAS_HEIGHT / 2;
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.glow;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(drawX, drawY, Math.max(p.size, 0.5), 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.restore();
    }
}

function drawXpCrystals() {
    for (const c of xpCrystals) {
        const drawX = c.x - cameraX + CANVAS_WIDTH / 2;
        const drawY = c.y - cameraY + CANVAS_HEIGHT / 2;
        ctx.save();
        ctx.shadowBlur = 12;
        ctx.shadowColor = c.glow;
        ctx.fillStyle = c.color;
        ctx.beginPath();
        ctx.arc(drawX, drawY, c.size, 0, Math.PI * 2);
        ctx.fill();

        // Leuchtender Kern
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#aaccff';
        ctx.beginPath();
        ctx.arc(drawX, drawY, c.size * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// ==== CASINO-EFFEKT (V4.0: ECHTE ROTATION) ====
function drawRadiantCasinoEffect(cx, cy, maxRadius) {
    const now = Date.now();
    
    // Geschwindigkeit erhöht (von 3000 auf 1000), damit es sich spürbar dreht
    const rotation = (Date.now() / 2000) % (Math.PI * 2);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-rotation); // Jetzt dreht sich das gesamte Koordinatensystem (MINUS für gegen-Uhrzeiger)

    // --- 1. DIE STRAHLEN (DREHEND) ---
    for (let i = 0; i < 12; i++) {
        ctx.rotate(Math.PI / 6); // Immer ein Stück weiter rotieren pro Strahl
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -maxRadius * 2); // Schön lang, damit es den Screen füllt
        
        // Transparenz für bessere Lesbarkeit
        ctx.strokeStyle = i % 2 === 0 ? 'rgba(255, 215, 0, 0.15)' : 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 80; 
        ctx.stroke();
    }
    ctx.restore(); // Rotation hier beenden, damit Partikel ihr eigenes Ding machen
    
    // --- 2. DIE PARTIKEL (BLEIBEN GEEIGNET SCHÖN) ---
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';

    for (let i = 0; i < 60; i++) {
        // Partikel-Position berechnen
        const angle = (i * Math.PI * 2 / 60) + (now / 3000); 
        const dist = (maxRadius * 0.4) + Math.sin(now / 500 + i) * 50; 
        
        const sx = cx + Math.cos(angle) * dist;
        const sy = cy + Math.sin(angle) * dist;
        const size = 2 + Math.sin(now / 300 + i) * 2;
        
        ctx.fillStyle = (i % 2 === 0) ? '#ffd700' : '#ffffff';
        
        ctx.beginPath();
        ctx.arc(sx, sy, size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

// ===== MAIN MENÜ =====
function drawMainMenu() {
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Partikel animieren
    for (const p of mainMenuParticles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = CANVAS_WIDTH;
        if (p.x > CANVAS_WIDTH) p.x = 0;
        if (p.y < 0) p.y = CANVAS_HEIGHT;
        if (p.y > CANVAS_HEIGHT) p.y = 0;
    }

    for (const p of mainMenuParticles) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    ctx.textAlign = 'center';

    // Titel
    ctx.shadowBlur = 40;
    ctx.shadowColor = '#00ffcc';
    ctx.fillStyle = '#00ffcc';
    const titleSize = Math.min(100, CANVAS_WIDTH * 0.12);
    ctx.font = `bold ${titleSize}px Arial`;
    ctx.fillText('HUNTERZ', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);
    ctx.shadowBlur = 0;

    // Start Button
    const startBtnX = CANVAS_WIDTH / 2;
    const startBtnY = CANVAS_HEIGHT / 2 + 30;
    const btnWidth = 240;
    const btnHeight = 60;
    const startHoverScale = (hoveredButton === 'start') ? 1.05 : 1;
    const startW = btnWidth * startHoverScale;
    const startH = btnHeight * startHoverScale;
    
    ctx.fillStyle = 'rgba(0, 200, 150, 0.3)';
    ctx.strokeStyle = '#00cc99';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00ffcc';
    roundRect(ctx, startBtnX - startW/2, startBtnY - startH/2, startW, startH, 15);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    ctx.fillStyle = '#00ffcc';
    ctx.font = `bold 28px Arial`;
    ctx.fillText('Spiel Starten', startBtnX, startBtnY + 10);

    // Options Button
    const optBtnX = CANVAS_WIDTH / 2;
    const optBtnY = CANVAS_HEIGHT / 2 + 110;
    const optHoverScale = (hoveredButton === 'options') ? 1.05 : 1;
    const optW = btnWidth * optHoverScale;
    const optH = btnHeight * optHoverScale;
    
    ctx.fillStyle = 'rgba(100, 100, 200, 0.3)';
    ctx.strokeStyle = '#6666cc';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#6666cc';
    roundRect(ctx, optBtnX - optW/2, optBtnY - optH/2, optW, optH, 15);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    ctx.fillStyle = '#aaaaff';
    ctx.font = `bold 28px Arial`;
    ctx.fillText('Optionen', optBtnX, optBtnY + 10);

    ctx.textAlign = 'left';
}

// ===== CHARAKTER AUSWAHL =====
function drawCharSelect() {
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Hintergrund-Partikel
    for (const p of menuParticles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = CANVAS_WIDTH;
        if (p.x > CANVAS_WIDTH) p.x = 0;
        if (p.y < 0) p.y = CANVAS_HEIGHT;
        if (p.y > CANVAS_HEIGHT) p.y = 0;
    }
    for (const p of menuParticles) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    ctx.textAlign = 'center';

    // Titel
    ctx.shadowBlur = 30;
    ctx.shadowColor = '#00ffcc';
    ctx.fillStyle = '#00ffcc';
    const titleSize = Math.min(56, CANVAS_WIDTH * 0.08);
    ctx.font = `bold ${titleSize}px Arial`;
    ctx.fillText('Wähle deinen Charakter', CANVAS_WIDTH / 2, titleSize + 50);
    ctx.shadowBlur = 0;

    // Beschreibender Text oben am Bildschirmrand
    const char = CHARACTERS.WEAPON_SPECIALIST;
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px Arial';
    ctx.fillText(char.description, CANVAS_WIDTH / 2, 130);

    // Charakter-Karten
    const cardWidth = Math.min(280, CANVAS_WIDTH * 0.35);
    const cardHeight = Math.min(380, CANVAS_HEIGHT * 0.5);
    const gap = Math.min(40, (CANVAS_WIDTH - 3 * cardWidth) / 4);
    const totalWidth = 3 * cardWidth + 2 * gap;
    const startX = (CANVAS_WIDTH - totalWidth) / 2;
    const cardY = CANVAS_HEIGHT * 0.3;

    // Verfügbarer Charakter (Waffenspezialist)
    const cx1 = startX;
    const hoverScale = (hoveredCharIndex === 0) ? 1.05 : 1;
    const drawW = cardWidth * hoverScale;
    const drawH = cardHeight * hoverScale;
    const drawX = cx1 - (drawW - cardWidth) / 2;
    const drawY = cardY - (drawH - cardHeight) / 2;
    
    // Karten-Hintergrund (mit Bild falls vorhanden, sonst Fallback)
    ctx.fillStyle = 'rgba(20, 20, 50, 0.9)';
    ctx.strokeStyle = char.color;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 20;
    ctx.shadowColor = char.color;
    roundRect(ctx, drawX, drawY, drawW, drawH, 16);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Charakter-Bild (gestretcht auf volle Kartengröße, mit Clip-Maske & Fallback)
    if (charImage_waffenspezialist.complete && charImage_waffenspezialist.naturalWidth > 0) {
        ctx.save();
        // Abgerundeten Kartenpfad als Clip-Maske verwenden
        roundRect(ctx, drawX, drawY, drawW, drawH, 16);
        ctx.clip();
        ctx.drawImage(charImage_waffenspezialist, drawX, drawY, drawW, drawH);
        ctx.restore();
    }

    // Dunkler Verlauf am unteren Rand für bessere Textlesbarkeit
    const textGrad = ctx.createLinearGradient(0, drawY + drawH * 0.6, 0, drawY + drawH);
    textGrad.addColorStop(0, 'rgba(10, 10, 30, 0)');
    textGrad.addColorStop(1, 'rgba(10, 10, 30, 0.85)');
    ctx.fillStyle = textGrad;
    ctx.save();
    roundRect(ctx, drawX, drawY, drawW, drawH, 16);
    ctx.clip();
    ctx.fillRect(drawX, drawY + drawH * 0.6, drawW, drawH * 0.4);
    ctx.restore();

    // Text im unteren Drittel der Karte mit Padding & Schatten
    const fs = Math.min(24, cardWidth * 0.085);

    ctx.textAlign = 'center';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 4;

    // Charakter-Name
    ctx.fillStyle = char.color;
    ctx.font = `bold ${fs}px Arial`;
    ctx.fillText(char.name, drawX + drawW / 2, drawY + drawH * 0.75);

    // Beschreibung direkt unter dem Namen (kompakter Block)
    ctx.fillStyle = '#ffffff';
    ctx.font = `${fs * 0.6}px Arial`;
    ctx.fillText(char.description, drawX + drawW / 2, drawY + drawH * 0.75 + fs * 0.65);

    ctx.shadowBlur = 0;

    // Platzhalter 1 und 2 (ausgegraut)
    for (let i = 1; i <= 2; i++) {
        const cx = startX + i * (cardWidth + gap);
        const phoverScale = (hoveredCharIndex === i) ? 1.05 : 1;
        const pdrawW = cardWidth * phoverScale;
        const pdrawH = cardHeight * phoverScale;
        const pdrawX = cx - (pdrawW - cardWidth) / 2;
        const pdrawY = cardY - (pdrawH - cardHeight) / 2;
        
        ctx.fillStyle = 'rgba(40, 40, 60, 0.7)';
        ctx.strokeStyle = 'rgba(100, 100, 100, 0.4)';
        ctx.lineWidth = 2;
        roundRect(ctx, pdrawX, pdrawY, pdrawW, pdrawH, 16);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'rgba(150, 150, 150, 0.6)';
        ctx.font = `${fs * 0.75}px Arial`;
        ctx.fillText('Demnächst verfügbar...', pdrawX + pdrawW/2, pdrawY + pdrawH/2);
    }

    ctx.fillStyle = '#666666';
    ctx.font = '16px Arial';
    ctx.fillText('ESC = Zurück | Klicke auf einen Charakter', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 30);

    ctx.textAlign = 'left';
}

// ===== WAFFEN AUSWAHL =====
function drawWeaponSelect() {
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    for (const p of menuParticles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = CANVAS_WIDTH;
        if (p.x > CANVAS_WIDTH) p.x = 0;
        if (p.y < 0) p.y = CANVAS_HEIGHT;
        if (p.y > CANVAS_HEIGHT) p.y = 0;
    }
    for (const p of menuParticles) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    ctx.textAlign = 'center';

    // Titel
    ctx.shadowBlur = 30;
    ctx.shadowColor = '#00ffcc';
    ctx.fillStyle = '#00ffcc';
    const titleSize = Math.min(56, CANVAS_WIDTH * 0.08);
    ctx.font = `bold ${titleSize}px Arial`;
    ctx.fillText('Wähle deine Waffe', CANVAS_WIDTH / 2, titleSize + 50);
    ctx.shadowBlur = 0;

    if (selectedCharacter) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px Arial';
        ctx.fillText('Charakter: ' + selectedCharacter.name, CANVAS_WIDTH / 2, titleSize + 90);
    }

    // Waffen-Karten
    const classes = [CLASSES.SNIPER, CLASSES.MACHINEGUN, CLASSES.SHOTGUN];
    const cardWidth = Math.min(220, (CANVAS_WIDTH - 80) / 3);
    const cardHeight = Math.min(260, CANVAS_HEIGHT * 0.45);
    const gap = Math.min(30, (CANVAS_WIDTH - 3 * cardWidth) / 4);
    const totalWidth = classes.length * cardWidth + (classes.length - 1) * gap;
    const startX = (CANVAS_WIDTH - totalWidth) / 2;
    const cardY = Math.min(210, CANVAS_HEIGHT * 0.35);

    for (let i = 0; i < classes.length; i++) {
        const c = classes[i];
        const cx = startX + i * (cardWidth + gap);
        
        // Hover-Effekt: 5% größer
        const hoverScale = (hoveredWeaponIndex === i) ? 1.05 : 1;
        const drawW = cardWidth * hoverScale;
        const drawH = cardHeight * hoverScale;
        const drawX = cx - (drawW - cardWidth) / 2;
        const drawY = cardY - (drawH - cardHeight) / 2;

        ctx.fillStyle = 'rgba(20, 20, 50, 0.8)';
        ctx.strokeStyle = c.color;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 15;
        ctx.shadowColor = c.color;

        const r = 12;
        ctx.beginPath();
        ctx.moveTo(drawX + r, drawY);
        ctx.lineTo(drawX + drawW - r, drawY);
        ctx.quadraticCurveTo(drawX + drawW, drawY, drawX + drawW, drawY + r);
        ctx.lineTo(drawX + drawW, drawY + drawH - r);
        ctx.quadraticCurveTo(drawX + drawW, drawY + drawH, drawX + drawW - r, drawY + drawH);
        ctx.lineTo(drawX + r, drawY + drawH);
        ctx.quadraticCurveTo(drawX, drawY + drawH, drawX, drawY + drawH - r);
        ctx.lineTo(drawX, drawY + r);
        ctx.lineTo(drawX, drawY + r);
        ctx.quadraticCurveTo(drawX, drawY, drawX + r, drawY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        const fs = Math.min(24, cardWidth * 0.11);
        ctx.fillStyle = c.color;
        ctx.font = `bold ${fs}px Arial`;
        
        // Name ohne [ID]
        ctx.fillText(c.name, drawX + drawW / 2, drawY + fs + 10);

        ctx.fillStyle = '#aaaaaa';
        ctx.font = `${fs * 0.6}px Arial`;
        ctx.fillText(c.description, drawX + drawW / 2, drawY + fs * 2.8 + 20);

        ctx.fillStyle = c.color;
        ctx.font = `${fs * 0.55}px Arial`;
        ctx.fillText(c.detail, drawX + drawW / 2, drawY + fs * 3.5 + 25);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.moveTo(drawX + 20, drawY + fs * 4.2 + 25);
        ctx.lineTo(drawX + drawW - 20, drawY + fs * 4.2 + 25);
        ctx.stroke();

        ctx.fillStyle = '#cccccc';
        ctx.font = `${fs * 0.5}px Arial`;
        const stats = getClassStats(c);
        for (let s = 0; s < stats.length; s++) {
            ctx.fillText(stats[s], drawX + drawW / 2, drawY + fs * 5 + 30 + s * fs * 0.9);
        }
    }

    ctx.fillStyle = '#666666';
    ctx.font = '14px Arial';
    ctx.fillText('ESC = Zurück | Wähle eine Waffe zum Starten', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 30);

    ctx.textAlign = 'left';
}

// ===== MENÜ ZEICHNEN =====
function drawMenu() {
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    drawGrid();

    for (const p of menuParticles) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    ctx.textAlign = 'center';

    ctx.shadowBlur = 30;
    ctx.shadowColor = '#00ffcc';
    ctx.fillStyle = '#00ffcc';
    const titleSize = Math.min(72, CANVAS_WIDTH * 0.09);
    ctx.font = `bold ${titleSize}px Arial`;
    ctx.fillText('HUNTERZ', CANVAS_WIDTH / 2, titleSize + 30);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#888888';
    ctx.font = '18px Arial';
    ctx.fillText('Wähle deine Klasse', CANVAS_WIDTH / 2, titleSize + 80);

    const classes = [CLASSES.SNIPER, CLASSES.MACHINEGUN, CLASSES.SHOTGUN];
    const cardWidth = Math.min(220, (CANVAS_WIDTH - 80) / 3);
    const cardHeight = Math.min(260, CANVAS_HEIGHT * 0.45);
    const gap = Math.min(30, (CANVAS_WIDTH - 3 * cardWidth) / 4);
    const totalWidth = classes.length * cardWidth + (classes.length - 1) * gap;
    const startX = (CANVAS_WIDTH - totalWidth) / 2;
    const cardY = Math.min(210, CANVAS_HEIGHT * 0.35);

    for (let i = 0; i < classes.length; i++) {
        const c = classes[i];
        const cx = startX + i * (cardWidth + gap);

        ctx.fillStyle = 'rgba(20, 20, 50, 0.8)';
        ctx.strokeStyle = c.color;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 15;
        ctx.shadowColor = c.color;

        const r = 12;
        ctx.beginPath();
        ctx.moveTo(cx + r, cardY);
        ctx.lineTo(cx + cardWidth - r, cardY);
        ctx.quadraticCurveTo(cx + cardWidth, cardY, cx + cardWidth, cardY + r);
        ctx.lineTo(cx + cardWidth, cardY + cardHeight - r);
        ctx.quadraticCurveTo(cx + cardWidth, cardY + cardHeight, cx + cardWidth - r, cardY + cardHeight);
        ctx.lineTo(cx + r, cardY + cardHeight);
        ctx.quadraticCurveTo(cx, cardY + cardHeight, cx, cardY + cardHeight - r);
        ctx.lineTo(cx, cardY + r);
        ctx.quadraticCurveTo(cx, cardY, cx + r, cardY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        const fs = Math.min(24, cardWidth * 0.11);
        ctx.fillStyle = c.color;
        ctx.font = `bold ${fs}px Arial`;
        ctx.fillText(c.name, cx + cardWidth / 2, cardY + fs + 10);

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${fs * 0.9}px Arial`;
        ctx.fillText(c.name, cx + cardWidth / 2, cardY + fs * 2 + 15);

        ctx.fillStyle = '#aaaaaa';
        ctx.font = `${fs * 0.6}px Arial`;
        ctx.fillText(c.description, cx + cardWidth / 2, cardY + fs * 2.8 + 20);

        ctx.fillStyle = c.color;
        ctx.font = `${fs * 0.55}px Arial`;
        ctx.fillText(c.detail, cx + cardWidth / 2, cardY + fs * 3.5 + 25);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.moveTo(cx + 20, cardY + fs * 4.2 + 25);
        ctx.lineTo(cx + cardWidth - 20, cardY + fs * 4.2 + 25);
        ctx.stroke();

        ctx.fillStyle = '#cccccc';
        ctx.font = `${fs * 0.5}px Arial`;
        const stats = getClassStats(c);
        for (let s = 0; s < stats.length; s++) {
            ctx.fillText(stats[s], cx + cardWidth / 2, cardY + fs * 5 + 30 + s * fs * 0.9);
        }
    }

    ctx.fillStyle = '#666666';
    ctx.font = '14px Arial';
    ctx.fillText('Klicke zum Starten', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 30);

    ctx.textAlign = 'left';
}

function getClassStats(klasse) {
    if (klasse.id === 1) return ['Schaden: 100 (1 Hit)', 'Feuerrate: Langsam', 'Durchschlag: Ja'];
    if (klasse.id === 2) return ['Schaden: 20 (5 Hits)', 'Feuerrate: Sehr schnell', 'Dauerfeuer: Ja'];
    if (klasse.id === 3) return ['Schaden: 30 pro Kugel', 'Reichweite: Kurz', '5 Kugeln pro Schuss'];
    return [];
}

// ===== MENÜ-BUTTON (oben rechts) =====
function drawMenuButton() {
    if (gameState !== 'PLAYING') return;

    const cx = menuBtnX();
    const cy = menuBtnY();

    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, menuBtnRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillRect(cx - 8, cy - 11, 5, 22);
    ctx.fillRect(cx + 3, cy - 11, 5, 22);

    ctx.restore();
}
// ===== MOBILE CONTROLS =====
function drawMobileControls() {
    const joyX = joystickCenterX();
    const joyY = joystickCenterY();

    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 2;

    // 1. Linker Joystick (Bewegung) - Bleibt sauber wie er war
    ctx.beginPath();
    ctx.arc(joyX, joyY, joystickRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(joyX + touchJoystickX, joyY + touchJoystickY, joystickKnobRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 2. Rechter Joystick (Zielen) - DYNAMISCH & RECHTS UNTEN
    // Wenn aktiv: Zeichne dort wo der Finger ist. Wenn inaktiv: Standardposition rechts unten.
    const aimX = touchFireActive ? touchFireCenterX : fireBtnCenterX();
    const aimY = touchFireActive ? touchFireCenterY : fireBtnCenterY();

    ctx.globalAlpha = 1; // Alpha separat regeln für geilen Look

    // Äußerer Ring (Zielscheiben/Stick-Basis)
    ctx.beginPath();
    ctx.arc(aimX, aimY, fireBtnRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.fill();
    ctx.strokeStyle = touchFireActive ? 'rgba(0, 255, 200, 0.5)' : 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Ein dezenter, kleinerer Innenring für die Optik
    ctx.beginPath();
    ctx.arc(aimX, aimY, fireBtnRadius * 0.4, 0, Math.PI * 2);
    ctx.strokeStyle = touchFireActive ? 'rgba(0, 255, 200, 0.2)' : 'rgba(255, 255, 255, 0.05)';
    ctx.stroke();

    // Der steuerbare Innenknopf (Knob)
    const knobX = aimX + (touchFireActive ? touchFireX : 0);
    const knobY = aimY + (touchFireActive ? touchFireY : 0);

    ctx.beginPath();
    ctx.arc(knobX, knobY, 22, 0, Math.PI * 2);
    ctx.fillStyle = touchFireActive ? 'rgba(0, 255, 200, 0.6)' : 'rgba(255, 255, 255, 0.1)';
    
    // Cooler Neon-Glow-Effekt, wenn man zielt!
    if (touchFireActive) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00ffcc';
    }
    
    ctx.fill();
    ctx.strokeStyle = touchFireActive ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.2)';
    ctx.stroke();

    ctx.restore();
}

// ===== PAUSE-MENÜ =====
function drawPauseMenu() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.textAlign = 'center';

    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00ffcc';
    ctx.font = 'bold 56px Arial';
    ctx.fillText('PAUSE', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 100);
    ctx.shadowBlur = 0;

    const bw = 260;
    const bh = 50;
    const cx = CANVAS_WIDTH / 2;

    // 1. Weiter Button
    const by1 = CANVAS_HEIGHT / 2 - 20;
    ctx.fillStyle = 'rgba(0, 200, 150, 0.3)';
    ctx.strokeStyle = '#00cc99';
    ctx.lineWidth = 2;
    roundRect(ctx, cx - bw/2, by1, bw, bh, 10);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#00cc99';
    ctx.font = 'bold 22px Arial';
    ctx.fillText('Weiter (ESC)', cx, by1 + 32);

    // 2. Optionen Button
    const by2 = CANVAS_HEIGHT / 2 + 50;
    ctx.fillStyle = 'rgba(100, 100, 255, 0.3)';
    ctx.strokeStyle = '#6666ff';
    ctx.lineWidth = 2;
    roundRect(ctx, cx - bw/2, by2, bw, bh, 10);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#6666ff';
    ctx.font = 'bold 22px Arial';
    ctx.fillText('Optionen', cx, by2 + 32);

    // 3. Menü Button
    const by3 = CANVAS_HEIGHT / 2 + 120;
    ctx.fillStyle = 'rgba(200, 50, 50, 0.3)';
    ctx.strokeStyle = '#cc4444';
    ctx.lineWidth = 2;
    roundRect(ctx, cx - bw/2, by3, bw, bh, 10);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#cc4444';
    ctx.font = 'bold 22px Arial';
    ctx.fillText('Hauptmenü (M)', cx, by3 + 32);

    ctx.textAlign = 'left';
}

function roundRect(ctx, x, y, w, h, r) {
    if (isNaN(x) || isNaN(y) || isNaN(w) || isNaN(h)) return; // Crash-Schutz
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(x, y, w, h, r);
    } else {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }
}

// ===== LEVEL-UP MENÜ =====
function drawLevelUpMenu() {
    ctx.fillStyle = 'rgba(5, 5, 15, 0.85)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
// 2. CASINO-EFFEKT REINBALLERN (In der Mitte des Bildschirms)
    drawRadiantCasinoEffect(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, Math.max(CANVAS_WIDTH, CANVAS_HEIGHT) * 0.6);

    ctx.textAlign = 'center';

    ctx.fillStyle = '#00ffcc';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00ffcc';
    ctx.font = 'bold 42px Arial';
    ctx.fillText('LEVEL UP!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 120);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ffffff';
    ctx.font = '20px Arial';
    ctx.fillText('Wähle ein Upgrade', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 75);

    const cardW = Math.min(220, (CANVAS_WIDTH - 80) / 3);
    const cardH = Math.min(200, CANVAS_HEIGHT * 0.35);
    const gap = Math.min(30, (CANVAS_WIDTH - 3 * cardW) / 4);
    const totalW = 3 * cardW + 2 * gap;
    const startX = (CANVAS_WIDTH - totalW) / 2;
    const cardY = CANVAS_HEIGHT / 2 - cardH / 2 + 30;

    for (let i = 0; i < levelUpOptions.length; i++) {
        const cx = startX + i * (cardW + gap);
        const opt = levelUpOptions[i];
        const rarityColor = opt.rarity.color;
        const isHovered = levelUpHoveredOption === i;
        const isSelected = levelUpSelectedOption === i;

        ctx.fillStyle = isSelected ? 'rgba(60, 60, 100, 0.95)' : (isHovered ? 'rgba(45, 45, 75, 0.95)' : 'rgba(20, 20, 50, 0.9)');
        ctx.strokeStyle = isSelected ? '#ffffff' : (isHovered ? '#ffffff' : rarityColor);
        ctx.lineWidth = isSelected ? 5 : (isHovered ? 4 : 2);
        ctx.shadowBlur = isSelected ? 30 : (isHovered ? 24 : 15);
        ctx.shadowColor = isSelected ? '#ffffff' : (isHovered ? '#ffffff' : rarityColor);

        const r = 12;
        ctx.beginPath();
        ctx.moveTo(cx + r, cardY);
        ctx.lineTo(cx + cardW - r, cardY);
        ctx.quadraticCurveTo(cx + cardW, cardY, cx + cardW, cardY + r);
        ctx.lineTo(cx + cardW, cardY + cardH - r);
        ctx.quadraticCurveTo(cx + cardW, cardY + cardH, cx + cardW - r, cardY + cardH);
        ctx.lineTo(cx + r, cardY + cardH);
        ctx.quadraticCurveTo(cx, cardY + cardH, cx, cardY + cardH - r);
        ctx.lineTo(cx, cardY + r);
        ctx.quadraticCurveTo(cx, cardY, cx + r, cardY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = isSelected ? '#ffffff' : (isHovered ? '#ffffff' : rarityColor);
        ctx.font = 'bold 16px Arial';
        ctx.fillText(opt.displayName, cx + cardW / 2, cardY + cardH / 2 + 6);

        // Selection indicator
        if (isSelected) {
            ctx.fillStyle = '#00ffcc';
            ctx.font = 'bold 12px Arial';
            ctx.fillText('✓ Ausgewählt', cx + cardW / 2, cardY + cardH - 15);
        }
    }

    // "Weiter" Button (like chest menu)
    const bw = 260;
    const bh = 64;
    const bx = CANVAS_WIDTH / 2 - bw / 2;
    const by = CANVAS_HEIGHT - 100;

    const hasSelection = levelUpSelectedOption >= 0;
    const continueFill = hasSelection
        ? (levelUpHoveredContinue ? 'rgba(255,170,0,0.24)' : 'rgba(255,170,0,0.18)')
        : (levelUpHoveredContinue ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)');
    const continueStroke = hasSelection
        ? (levelUpHoveredContinue ? '#ffffff' : '#ffaa00')
        : (levelUpHoveredContinue ? 'rgba(255,255,255,0.4)' : 'rgba(100,100,100,0.4)');

    roundRect(ctx, bx, by, bw, bh, 20);
    ctx.fillStyle = continueFill;
    ctx.fill();
    ctx.strokeStyle = continueStroke;
    ctx.lineWidth = levelUpHoveredContinue ? 4 : 3;
    ctx.stroke();

    ctx.fillStyle = hasSelection ? '#ffffff' : '#888888';
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Weiter', CANVAS_WIDTH / 2, by + bh / 2 + 8);

    // Farb-Legende: Wörter in Farbe nebeneinander, getrennt durch ' | '
    const legendY = by - 30;
    ctx.font = '15px Arial';

    const legendColors = ['#cccccc', '#00cc44', '#4488ff', '#aa44ff', '#ff8800'];
    const words = ['Gewöhnlich', 'Ungewöhnlich', 'Selten', 'Rar', 'Legendär'];
    const separator = ' | ';

    // Gesamtbreite berechnen
    let totalLegendWidth = 0;
    for (let i = 0; i < words.length; i++) {
        totalLegendWidth += ctx.measureText(words[i]).width;
        if (i < words.length - 1) totalLegendWidth += ctx.measureText(separator).width;
    }

    let legendX = (CANVAS_WIDTH - totalLegendWidth) / 2;
    ctx.textAlign = 'left';

    for (let i = 0; i < words.length; i++) {
        ctx.fillStyle = legendColors[i];
        ctx.fillText(words[i], legendX, legendY);
        legendX += ctx.measureText(words[i]).width;
        if (i < words.length - 1) {
            ctx.fillStyle = '#888888';
            ctx.fillText(separator, legendX, legendY);
            legendX += ctx.measureText(separator).width;
        }
    }

    ctx.fillStyle = '#666666';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Klicke auf eine Karte, dann auf Weiter', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 15);

    ctx.textAlign = 'left';
}

// ===== OPTIONS MENÜ =====
function drawOptionsMenu() {
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

     // Hintergrund-Partikel
    for (const p of menuParticles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = CANVAS_WIDTH;
        if (p.x > CANVAS_WIDTH) p.x = 0;
        if (p.y < 0) p.y = CANVAS_HEIGHT;
        if (p.y > CANVAS_HEIGHT) p.y = 0;
    }
    for (const p of menuParticles) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    // Sicherheits-Fallback für die Lautstärke
    const vol = (typeof masterVolume === 'number' && !isNaN(masterVolume)) ? masterVolume : 0.5;

    // KORREKTUR: Prüfen, ob die Maus über dem Zurück-Button schwebt
    const isBackHovered = (typeof lastHoveredElement !== 'undefined' && lastHoveredElement === 'options_back');

    // Back button (oben links)
    const backBtnX = 20, backBtnY = 20, backBtnW = 160, backBtnH = 52;
    
    // Hintergrund leuchtet bei Hover stärker auf
    ctx.fillStyle = isBackHovered ? 'rgba(0, 255, 204, 0.18)' : 'rgba(255, 255, 255, 0.08)';
    roundRect(ctx, backBtnX, backBtnY, backBtnW, backBtnH, 14);
    ctx.fill();
    
    // Rahmen wird bei Hover dicker und glüht
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = isBackHovered ? 3 : 2;
    if (isBackHovered) {
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00ffcc';
    }
    ctx.stroke();
    ctx.shadowBlur = 0; // Schatten direkt wieder zurücksetzen!

    ctx.fillStyle = '#00ffcc';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Zurück', backBtnX + backBtnW / 2, backBtnY + backBtnH / 2 + 6);

    // Titel
    ctx.shadowBlur = 30;
    ctx.shadowColor = '#00ffcc';
    ctx.fillStyle = '#00ffcc';
    const titleSize = Math.min(56, CANVAS_WIDTH * 0.08);
    ctx.font = `bold ${titleSize}px Arial`;
    ctx.fillText('Optionen', CANVAS_WIDTH / 2, titleSize + 80);
    ctx.shadowBlur = 0;

    // Einstellungen-Startposition
    const startY = CANVAS_HEIGHT / 2 - 50;
    const lineHeight = 35;
    const leftX = CANVAS_WIDTH / 2 - 150;

    // Audio Überschrift
    ctx.fillStyle = '#00ffcc';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Audio-Einstellungen:', leftX, startY);
    
    // Text Prozentanzeige
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '18px Arial';
    ctx.fillText(`Gesamtlautstärke: ${Math.round(vol * 100)}%`, leftX + 30, startY + lineHeight);

    // Interaktiver Slider Zeichnen
    const sliderX = leftX + 30;
    const sliderY = startY + lineHeight * 2;
    const sliderW = 300;
    const sliderH = 10;

    // Slider Hintergrund
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    roundRect(ctx, sliderX, sliderY, sliderW, sliderH, 5);
    ctx.fill();

    // Slider Ausfüllung
    ctx.fillStyle = '#00ffcc';
    roundRect(ctx, sliderX, sliderY, sliderW * vol, sliderH, 5);
    ctx.fill();

    // Slider-Knopf
    ctx.beginPath();
    ctx.arc(sliderX + sliderW * vol, sliderY + sliderH / 2, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00ffcc';
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Grafik
    ctx.fillStyle = '#00ffcc';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('Grafik:', leftX, startY + lineHeight * 4);
    
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '18px Arial';
    ctx.fillText('Partikeleffekte (Aktiviert)', leftX + 30, startY + lineHeight * 5);

    // Hilfetext unten
    ctx.textAlign = 'center';
    ctx.fillStyle = '#666666';
    ctx.font = '14px Arial';
    ctx.fillText('Klicke und ziehe den Regler, um die Lautstärke zu ändern.', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 30);
    ctx.textAlign = 'left';
}

// ===== GAME OVER =====
function drawGameOver() {
    drawGrid();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff0000';
    ctx.font = 'bold 60px Arial';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ff0000';
    ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ffffff';
    ctx.font = '24px Arial';
    ctx.fillText('Score: ' + score, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);
    ctx.fillText('Level: ' + player.level, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 45);

    const btnX = CANVAS_WIDTH / 2 - 120;
    const btnY = CANVAS_HEIGHT / 2 + 110;
    const btnW = 240;
    const btnH = 52;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    roundRect(ctx, btnX, btnY, btnW, btnH, 12);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px Arial';
    ctx.fillText('Zurück zum Hauptmenü', CANVAS_WIDTH / 2, btnY + btnH / 2 + 7);

    ctx.fillStyle = '#888888';
    ctx.font = '18px Arial';
    ctx.fillText('TRY AGAIN?', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 100);

    ctx.textAlign = 'left';
}

// ===== AUTOMATISCHES FEUER =====
function checkAutoFire() {
    if (gameState !== 'PLAYING' || !selectedClass) return;

    // Mobile: always auto-fire (all weapons, using aiming angle)
    if (isMobile) {
        const now = Date.now();
        const rateMult = player.fireRateMultiplier !== undefined ? player.fireRateMultiplier : 1;
        if (now - lastShotTime < selectedClass.fireRate * rateMult) return;
        lastShotTime = now;

        // Use the aiming angle
        const angle = player.angle;
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        if (dx === 0 && dy === 0) return;

        fireBullet(dx, dy);
        return;
    }

    // Desktop: only machinegun auto-fire on mouse hold
    if (selectedClass.id !== 2) return;
    if (!mouseDown) return;

    const now = Date.now();
    const rateMult = player.fireRateMultiplier !== undefined ? player.fireRateMultiplier : 1;
    if (now - lastShotTime < selectedClass.fireRate * rateMult) return;
    lastShotTime = now;

    const dx = mouseX - CANVAS_WIDTH / 2;
    const dy = mouseY - CANVAS_HEIGHT / 2;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) return;

    fireBullet(dx / length, dy / length);
}

// ===== NEUE HILFSFUNKTION FÜR MENÜ-HINTERGRUND =====
function drawMenuBackground() {
    // 1. Hintergrund
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 2. Zeichne DIE ERSTEN (mainMenuParticles)
    for (const p of mainMenuParticles) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }

    // 3. Zeichne DIE ZWEITEN (menuParticles)
    for (const p of menuParticles) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.globalAlpha = 1.0; // Wichtig: Reset!
}

// ===== KORRIGIERTER GAME LOOP =====
function gameLoop() {
    // 1. ALLES LÖSCHEN
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 2. LOGIK
    checkAutoFire();
    update();

    // 3. ZEICHNEN
    // Alle Menü-Zustände zusammengefasst
    if (['MAIN_MENU', 'OPTIONS', 'CHAR_SELECT', 'WEAPON_SELECT', 'MENU'].includes(gameState)) {
        drawMenuBackground(); // Zeichnet jetzt überall den Hintergrund + Partikel
        
        if (gameState === 'MAIN_MENU') drawMainMenu();
        else if (gameState === 'OPTIONS') drawOptionsMenu();
        else if (gameState === 'CHAR_SELECT') drawCharSelect();
        else if (gameState === 'WEAPON_SELECT') drawWeaponSelect();
        else if (gameState === 'MENU') drawMenu();
    }
    // Alle Spiel-Zustände
    else if (gameState === 'PLAYING') {
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        ctx.save(); 
        if (isMobile) {
            ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
            ctx.scale(0.75, 0.75);
            ctx.translate(-CANVAS_WIDTH / 2, -CANVAS_HEIGHT / 2);
        }

        drawGrid();
        drawXpCrystals();
        for (const e of enemies) drawEnemy(e);
        for (const b of bullets) drawBullet(b);
        
        // Truhen
        for (const ch of chests) {
            if (ch.opened) continue;
            const w = 48; const h = 36;
            const dx = ch.x - cameraX + CANVAS_WIDTH / 2;
            const dy = ch.y - cameraY + CANVAS_HEIGHT / 2;
            ctx.save();
            ctx.strokeStyle = '#4a2500'; ctx.lineWidth = 3;
            ctx.fillStyle = '#FFD700'; ctx.shadowBlur = 15; ctx.shadowColor = '#FFD700';
            roundRect(ctx, dx - w/2, dy - h/2, w, h, 6);
            ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#DAA520'; 
            roundRect(ctx, dx - w/2, dy - h/2, w, h/3, 6);
            ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#FFF8DC'; ctx.fillRect(dx - 6, dy - 2, 12, 8); 
            ctx.fillStyle = '#8B4513'; ctx.fillRect(dx - 3, dy + 1, 6, 3);
            ctx.restore();
        }

        drawPlayer();
        drawBossPointer();
        drawParticles();
        ctx.restore(); 

        drawMenuButton();

        // XP-Balken
        const xpBarH = 8;
        const xpBarX = 20;
        const xpBarW = CANVAS_WIDTH - xpBarX;
        const xpFillW = xpBarW * (player.xp / player.xpToNext);
        ctx.fillStyle = 'rgba(30, 30, 60, 0.8)';
        ctx.fillRect(xpBarX, 0, xpBarW, xpBarH);
        const xpGrad = ctx.createLinearGradient(xpBarX, 0, xpBarX + xpBarW, 0);
        xpGrad.addColorStop(0, '#4488ff');
        xpGrad.addColorStop(1, '#aa44ff');
        ctx.fillStyle = xpGrad;
        ctx.fillRect(xpBarX, 0, xpFillW, xpBarH);

        // UI-Elemente
        ctx.textAlign = 'left';
        ctx.fillStyle = '#00ffcc';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('LVL ' + player.level, 20, 25);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Arial';
        ctx.fillText('Score: ' + score, 20, 50);

        // Lebensbalken
        const hpBarW = 200;
        const hpBarH = 18;
        const hpBarX = 20;
        const hpBarY = 70;
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);
        ctx.fillStyle = '#00ff66';
        ctx.fillRect(hpBarX, hpBarY, hpBarW * (player.health / player.maxHealth), hpBarH);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(hpBarX, hpBarY, hpBarW, hpBarH);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(Math.round(player.health) + ' / ' + player.maxHealth, hpBarX + hpBarW / 2, hpBarY + hpBarH / 2);
        ctx.textBaseline = 'alphabetic';

        // Timer
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        const mins = Math.floor(gameTime / 60);
        const secs = Math.floor(gameTime % 60);
        ctx.fillText(`${mins}:${secs.toString().padStart(2, '0')}`, CANVAS_WIDTH / 2, 30);

        // Boss Balken
        const boss = enemies.find(e => e.isBoss || e.type === 'MINIBOSS');
        if (boss) {
            const bossBarW = CANVAS_WIDTH * 0.6;
            const bossBarH = 24;
            const bossBarX = (CANVAS_WIDTH - bossBarW) / 2;
            const bossBarY = 44;
            const hpPercent = Math.max(0, Math.min(1, (boss.health !== undefined ? boss.health : boss.hp) / (boss.maxHealth !== undefined ? boss.maxHealth : boss.maxHp)));
            const bossFillW = bossBarW * hpPercent;
            ctx.fillStyle = 'rgba(30, 30, 30, 0.9)';
            roundRect(ctx, bossBarX, bossBarY, bossBarW, bossBarH, 14);
            ctx.fill();
            ctx.fillStyle = 'rgba(255, 60, 60, 0.95)';
            roundRect(ctx, bossBarX + 2, bossBarY + 2, Math.max(4, bossFillW - 4), bossBarH - 4, 12);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('MINIBOSS', CANVAS_WIDTH / 2, bossBarY + bossBarH / 2);
            ctx.textBaseline = 'alphabetic';
        }

        ctx.textAlign = 'left';
        if (isMobile) drawMobileControls();

        // Roter Schaden-Effekt
        if (screenDamageFlash > 0) {
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0); 
            const gradient = ctx.createRadialGradient(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH * 0.2, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH * 0.6);
            gradient.addColorStop(0, 'rgba(255, 0, 0, 0)');
            gradient.addColorStop(1, `rgba(255, 0, 0, ${screenDamageFlash})`);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            ctx.restore();
            screenDamageFlash -= 0.03;
            if (screenDamageFlash < 0) screenDamageFlash = 0;
        }
        drawMinimap();
    }
    else if (gameState === 'PAUSED') {
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        drawGrid();
        drawXpCrystals();
        for (const e of enemies) drawEnemy(e);
        for (const b of bullets) drawBullet(b);
        drawPlayer();
        drawParticles();
        drawPauseMenu();
    }
    else if (gameState === 'CHEST_OPEN') {
        // 1. Spielfeld im Hintergrund zeichnen
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        drawGrid();
        drawXpCrystals();
        for (const e of enemies) drawEnemy(e);
        for (const b of bullets) drawBullet(b);
        drawPlayer();
        drawParticles();

        // 2. Das Menü drüberlegen (das jetzt transparent sein kann)
        drawChestMenu();
    }
    else if (gameState === 'LEVEL_UP') {
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        drawGrid();
        drawXpCrystals();
        for (const e of enemies) drawEnemy(e);
        for (const b of bullets) drawBullet(b);
        drawPlayer();
        drawParticles();
        drawLevelUpMenu();
    }
    else if (gameState === 'GAMEOVER') {
        drawGameOver();
    }

    requestAnimationFrame(gameLoop);
}

function drawChestMenu() {
    // 1. Hintergrund abdunkeln (Ganzflächig, wie beim Level Up)
    ctx.fillStyle = 'rgba(5, 5, 15, 0.85)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 2. CASINO-EFFEKT REINBALLERN (Immer unter der UI)
    drawRadiantCasinoEffect(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, Math.max(CANVAS_WIDTH, CANVAS_HEIGHT) * 0.7);
    
    // 3. UI Container (Wir zeichnen kein volles Rechteck mehr als Hintergrund, 
    // sondern nutzen die Transparenz des Screens)
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 36px Arial';
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'black';
    ctx.fillText('LEGENDÄRE TRUHE', CANVAS_WIDTH / 2, 120);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ffffff';
    ctx.font = '20px Arial';
    ctx.fillText('Wähle deine Belohnung:', CANVAS_WIDTH / 2, 160);

    // Layout der Auswahl-Karten
    const optW = Math.min(320, CANVAS_WIDTH * 0.35);
    const optH = 140;
    const gap = 40;
    const leftX = CANVAS_WIDTH / 2 - optW - gap / 2;
    const rightX = CANVAS_WIDTH / 2 + gap / 2;
    const optY = 220;

    // ... (Hier bleibt deine Hover/Klick-Logik für leftHovered / rightHovered genau gleich) ...
    const leftHovered = chestHoveredOption === 'multishot';
    const rightHovered = chestHoveredOption === 'double';
    const continueHovered = chestHoveredOption === 'continue';

    // Auswahl-Boxen zeichnen (Dezenter, wie beim Level Up)
    drawOptionBox(leftX, optY, optW, optH, 'Multishot', '+ 100% Projektile', leftHovered, chestSelectedOption === 'multishot');
    drawOptionBox(rightX, optY, optW, optH, 'Giga-Schaden', '+ 100% Schaden', rightHovered, chestSelectedOption === 'double');

    // "Weiter"-Button
    const bw = 200;
    const bh = 50;
    const bx = CANVAS_WIDTH / 2 - bw / 2;
    const by = CANVAS_HEIGHT - 120;
    
    ctx.fillStyle = continueHovered ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255, 255, 255, 0.1)';
    roundRect(ctx, bx, by, bw, bh, 15);
    ctx.fill();
    ctx.strokeStyle = continueHovered ? '#ffd700' : '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('Weiter', CANVAS_WIDTH / 2, by + bh / 2 + 7);
}

// Hilfsfunktion damit der Code sauber bleibt
function drawOptionBox(x, y, w, h, title, desc, hovered, selected) {
    ctx.fillStyle = selected ? 'rgba(255, 215, 0, 0.2)' : (hovered ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)');
    roundRect(ctx, x, y, w, h, 20);
    ctx.fill();
    
    ctx.strokeStyle = selected ? '#ffd700' : (hovered ? '#ffffff' : '#444444');
    ctx.lineWidth = hovered || selected ? 3 : 1;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Arial';
    ctx.fillText(title, x + w / 2, y + 50);
    ctx.fillStyle = '#cccccc';
    ctx.font = '16px Arial';
    ctx.fillText(desc, x + w / 2, y + 90);
}

// ===== BOSS POINTER =====
function drawBossPointer() {
    // Nur aktiv, wenn das Spiel läuft und der Miniboss existiert
    if (gameState !== 'PLAYING') return;

    const boss = enemies.find(e => e.type === 'MINIBOSS');
    if (!boss) return;

    // Position des Bosses relativ zum Bildschirm berechnen
    const screenBossX = boss.x - cameraX + CANVAS_WIDTH / 2;
    const screenBossY = boss.y - cameraY + CANVAS_HEIGHT / 2;

    // Prüfen, ob der Boss außerhalb des sichtbaren Bildschirms ist (mit 20px Puffer)
    const padding = 30;
    if (screenBossX < padding || screenBossX > CANVAS_WIDTH - padding ||
        screenBossY < padding || screenBossY > CANVAS_HEIGHT - padding) {

        // Winkel vom Spieler (Bildschirmmitte) zum Boss berechnen
        const angle = Math.atan2(screenBossY - CANVAS_HEIGHT / 2, screenBossX - CANVAS_WIDTH / 2);

        // Pfeil am Bildschirmrand positionieren
        const arrowX = CANVAS_WIDTH / 2 + Math.cos(angle) * (CANVAS_WIDTH / 2 - padding);
        const arrowY = CANVAS_HEIGHT / 2 + Math.sin(angle) * (CANVAS_HEIGHT / 2 - padding);

        // Pfeil zeichnen
        ctx.save();
        ctx.translate(arrowX, arrowY);
        ctx.rotate(angle);

        // Schicker Neon-Effekt (passend zu deinem Style)
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#9900ff'; // Lila Boss-Farbe
        ctx.fillStyle = '#cc99ff';

        ctx.beginPath();
        ctx.moveTo(15, 0);       // Spitze zeigt nach rechts (wegen rotate)
        ctx.lineTo(-10, -10);    // Ecke oben links
        ctx.lineTo(-5, 0);       // Einkerbung hinten Mitte
        ctx.lineTo(-10, 10);     // Ecke unten links
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
}

// ===== START GAME LOOP =====
requestAnimationFrame(gameLoop);