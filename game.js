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
        fireRate: 500,
        bulletSpeed: 14,
        bulletSize: 4,
        damage: 100,
        piercing: true,
        color: '#ff00ff',
        glowColor: '#ff00ff'
    },
    MACHINEGUN: {
        id: 2,
        name: 'Maschinengewehr',
        description: 'Dauerfeuer',
        detail: 'Geringer Schaden, hohe Feuerrate',
        fireRate: 100,
        bulletSpeed: 10,
        bulletSize: 3,
        damage: 20,
        piercing: false,
        color: '#ffff00',
        glowColor: '#ffaa00'
    },
    SHOTGUN: {
        id: 3,
        name: 'Schrotflinte',
        description: 'Flächenschaden',
        detail: 'Multishot, kurze Reichweite',
        fireRate: 600,
        bulletSpeed: 10,
        bulletSize: 3,
        pellets: 4,
        spreadAngle: 0.3,
        maxRange: 300,
        damage: 30,
        piercing: false,
        color: '#ff8800',
        glowColor: '#ff4400'
    }
};

let selectedClass = null;
let selectedCharacter = null;

// ===== SPIELER =====
const player = {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    size: 20,
    speed: 5,
    color: '#40e0d0',
    health: 100,
    maxHealth: 100,
    angle: 0,
    // XP & Level
    level: 1,
    xp: 0,
    xpToNext: 50,
    // Upgrade-Modifikatoren
    damageMultiplier: 1.0,
    speedMultiplier: 1.0,
    fireRateMultiplier: 1.0,
    bulletSpeedMultiplier: 1.0,
    lifesteal: 0 // 0 = kein Lebensraub, 0.005 = 0.5%
};

// ===== TASTATUR-STATUS =====
const keys = {
    w: false, a: false, s: false, d: false,
    up: false, down: false, left: false, right: false
};

// ===== LISTEN =====
let bullets = [];
let enemies = [];
let particles = [];
let xpCrystals = [];

// ===== MAUS =====
let mouseX = CANVAS_WIDTH / 2;
let mouseY = CANVAS_HEIGHT / 2;
let mouseDown = false;

// ===== HOVER-STATUS =====
let hoveredButton = null; // 'start', 'options', 'character', 'weapon'
let hoveredCharIndex = -1;
let hoveredWeaponIndex = -1;

// ===== CHARAKTER-BILD =====
const charImage_waffenspezialist = new Image();
charImage_waffenspezialist.src = 'assets/waffenspezialist.png';

// ===== SPIEL-VARIABLEN =====
let score = 0;
let difficultyLevel = 1;
let enemyBaseSpeed = 1.2;
let spawnInterval = 2000;
let spawnTimerId = null;
let gridOffsetX = 0;
let gridOffsetY = 0;
let lastShotTime = 0;
let menuParticles = [];

// ===== TIMER =====
let gameTime = 0; // in Sekunden
let lastTimerUpdate = 0;

// ===== LEVEL-UP =====
let levelUpOptions = [];
let levelUpSelected = false;

// ===== TOUCH-STEUERUNG =====
let touchJoystickActive = false;
let touchJoystickX = 0;
let touchJoystickY = 0;
let touchJoystickId = -1;
let touchJoystickLastAngle = 0;
let touchFireActive = false;
let touchFireId = -1;
let touchFireAngle = 0;

const joystickCenterX = () => 140;
const joystickCenterY = () => CANVAS_HEIGHT - 140;
const joystickRadius = 70;
const joystickKnobRadius = 25;

const fireBtnCenterX = () => CANVAS_WIDTH - 120;
const fireBtnCenterY = () => CANVAS_HEIGHT - 120;
const fireBtnRadius = 55;

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
            baseName: '+15% Lauftempo',
            baseValue: 0.15,
            apply: (mult) => { player.speedMultiplier += 0.15 * mult; }
        },
        {
            baseName: '+20% Schussrate',
            baseValue: 0.8,
            apply: (mult) => { player.fireRateMultiplier *= Math.pow(0.8, mult); }
        },
        {
            baseName: '+20% Max-Leben',
            baseValue: 20,
            apply: (mult) => { const heal = Math.round(20 * mult); player.maxHealth += heal; player.health = Math.min(player.health + heal, player.maxHealth); }
        },
        {
            baseName: '+0.5% Lebensraub',
            baseValue: 0.005,
            apply: (mult) => { player.lifesteal += 0.005 * mult; }
        },
        {
            baseName: '+15% Projektil-Geschw.',
            baseValue: 0.15,
            apply: (mult) => { player.bulletSpeedMultiplier += 0.15 * mult; }
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

        return {
            displayName: upg.baseName.replace(/\d+%/, displayValue + suffix).replace(/\d+/, displayValue),
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
    gameState = 'PLAYING';
}

// ===== TOUCH-EVENTS =====
function handleTouchStart(e) {
    e.preventDefault();
    isMobile = true;

    if (gameState === 'MAIN_MENU') {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (isInsideStartBtn(touch.clientX, touch.clientY)) {
                goToCharSelect();
                return;
            }
            if (isInsideOptionsBtn(touch.clientX, touch.clientY)) {
                return;
            }
        }
        return;
    }

    if (gameState === 'CHAR_SELECT') {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (isInsideCharacterCard(touch.clientX, touch.clientY, 0)) {
                selectCharacter(0);
                return;
            }
        }
        return;
    }

    if (gameState === 'WEAPON_SELECT') {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const tx = touch.clientX;
            const ty = touch.clientY;
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

    if (gameState === 'MENU' || gameState === 'WEAPON_SELECT') {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const klasse = getClassAtPosition(touch.clientX, touch.clientY);
            if (klasse) {
                startGame(klasse);
                return;
            }
        }
        return;
    }

    if (gameState === 'LEVEL_UP') {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const tx = touch.clientX;
            const ty = touch.clientY;
            const cardW = Math.min(220, (CANVAS_WIDTH - 80) / 3);
            const cardH = Math.min(200, CANVAS_HEIGHT * 0.35);
            const gap = Math.min(30, (CANVAS_WIDTH - 3 * cardW) / 4);
            const totalW = 3 * cardW + 2 * gap;
            const startX = (CANVAS_WIDTH - totalW) / 2;
            const cardY = CANVAS_HEIGHT / 2 - cardH / 2 + 30;

            for (let j = 0; j < 3; j++) {
                const cx = startX + j * (cardW + gap);
                if (tx >= cx && tx <= cx + cardW && ty >= cardY && ty <= cardY + cardH) {
                    applyLevelUp(j);
                    return;
                }
            }
        }
        return;
    }

    if (gameState === 'PAUSED') {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const tx = touch.clientX;
            const ty = touch.clientY;
            if (isInsidePauseBtn(tx, ty, pauseContinueBtn)) {
                gameState = 'PLAYING';
                return;
            }
            if (isInsidePauseBtn(tx, ty, pauseMenuBtn)) {
                gameState = 'MAIN_MENU';
                resetGameState();
                initMainMenuParticles();
                return;
            }
        }
        return;
    }

    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const tx = touch.clientX;
        const ty = touch.clientY;

        if (isInsideMenuBtn(tx, ty)) {
            gameState = 'PAUSED';
            continue;
        }

        const fdx = tx - fireBtnCenterX();
        const fdy = ty - fireBtnCenterY();
        if (Math.sqrt(fdx*fdx + fdy*fdy) < fireBtnRadius) {
            touchFireActive = true;
            touchFireId = touch.identifier;
            touchFireAngle = player.angle;
            touchShoot();
            continue;
        }

        if (tx < CANVAS_WIDTH / 2 && ty > CANVAS_HEIGHT / 2) {
            touchJoystickActive = true;
            touchJoystickId = touch.identifier;
            updateJoystickPosition(tx, ty);
            continue;
        }
    }
}

function handleTouchMove(e) {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const tx = touch.clientX;
        const ty = touch.clientY;

        if (touch.identifier === touchJoystickId) {
            updateJoystickPosition(tx, ty);
        }

        if (touch.identifier === touchFireId) {
            touchFireAngle = player.angle;
        }
    }
}

function handleTouchEnd(e) {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];

        if (touch.identifier === touchJoystickId) {
            touchJoystickLastAngle = player.angle;
            touchJoystickActive = false;
            touchJoystickId = -1;
            touchJoystickX = 0;
            touchJoystickY = 0;
        }

        if (touch.identifier === touchFireId) {
            touchFireActive = false;
            touchFireId = -1;
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

function touchShoot() {
    if (gameState !== 'PLAYING' || !selectedClass) return;
    if (!touchFireActive) return;

    const now = Date.now();
    if (now - lastShotTime < selectedClass.fireRate * player.fireRateMultiplier) return;
    lastShotTime = now;

    const angle = player.angle;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    if (dx === 0 && dy === 0) return;

    fireBullet(dx, dy);
}

setInterval(() => {
    if (isMobile && touchFireActive && gameState === 'PLAYING') {
        touchShoot();
    }
}, 50);

// ===== TASTATUR-EVENTS =====
window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();

    if (gameState === 'MAIN_MENU') {
        if (key === 'enter' || key === ' ') { goToCharSelect(); return; }
    }

    if (gameState === 'CHAR_SELECT') {
        if (key === 'escape') { goBackToMenu(); return; }
    }

    if (gameState === 'WEAPON_SELECT') {
        if (key === 'escape') { gameState = 'CHAR_SELECT'; return; }
    }

    if (gameState === 'OPTIONS') {
        if (key === 'escape') { gameState = 'MAIN_MENU'; return; }
    }

    if (key === 'r' && gameState === 'GAMEOVER') {
        gameState = 'MAIN_MENU';
        initMainMenuParticles();
        return;
    }

    if (gameState === 'PAUSED') {
        if (key === 'escape') { gameState = 'PLAYING'; return; }
        if (key === 'm') { gameState = 'MAIN_MENU'; resetGameState(); initMainMenuParticles(); return; }
    }

    if (key === 'escape' && gameState === 'PLAYING') {
        gameState = 'PAUSED';
        return;
    }

    if (key === 'w' || key === 'a' || key === 's' || key === 'd' ||
        key === 'arrowup' || key === 'arrowdown' || key === 'arrowleft' || key === 'arrowright') {
        e.preventDefault();
    }

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

// ===== MAUS-EVENTS =====
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    
    // Hover-Status aktualisieren
    if (isMobile) return;
    
    if (gameState === 'MAIN_MENU') {
        hoveredButton = isInsideStartBtn(mouseX, mouseY) ? 'start' : 
                       isInsideOptionsBtn(mouseX, mouseY) ? 'options' : null;
    } else if (gameState === 'CHAR_SELECT') {
        hoveredCharIndex = -1;
        for (let i = 0; i < 3; i++) {
            if (isInsideCharacterCard(mouseX, mouseY, i)) {
                hoveredCharIndex = i;
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
                break;
            }
        }
    } else {
        hoveredButton = null;
        hoveredCharIndex = -1;
        hoveredWeaponIndex = -1;
    }
});

canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) mouseDown = true;
});

canvas.addEventListener('mouseup', (e) => {
    if (e.button === 0) mouseDown = false;
});

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    if (gameState === 'MAIN_MENU') {
        if (isInsideStartBtn(clickX, clickY)) {
            goToCharSelect();
            return;
        }
        if (isInsideOptionsBtn(clickX, clickY)) {
            gameState = 'OPTIONS';
            return;
        }
        return;
    }

    if (gameState === 'CHAR_SELECT') {
        if (isInsideCharacterCard(clickX, clickY, 0)) {
            selectCharacter(0);
        }
        return;
    }

    if (gameState === 'WEAPON_SELECT') {
        const classes = [CLASSES.SNIPER, CLASSES.MACHINEGUN, CLASSES.SHOTGUN];
        const cardWidth = Math.min(220, (CANVAS_WIDTH - 80) / 3);
        const cardHeight = Math.min(260, CANVAS_HEIGHT * 0.45);
        const gap = Math.min(30, (CANVAS_WIDTH - 3 * cardWidth) / 4);
        const totalWidth = classes.length * cardWidth + (classes.length - 1) * gap;
        const startX = (CANVAS_WIDTH - totalWidth) / 2;
        const cardY = Math.min(210, CANVAS_HEIGHT * 0.35);

        for (let i = 0; i < classes.length; i++) {
            const cx = startX + i * (cardWidth + gap);
            if (clickX >= cx && clickX <= cx + cardWidth && clickY >= cardY && clickY <= cardY + cardHeight) {
                selectWeapon(classes[i]);
                return;
            }
        }
        return;
    }

    if (gameState === 'MENU') {
        const klasse = getClassAtPosition(clickX, clickY);
        if (klasse) startGame(klasse);
        return;
    }

    if (gameState === 'LEVEL_UP') {
        const cardW = Math.min(220, (CANVAS_WIDTH - 80) / 3);
        const cardH = Math.min(200, CANVAS_HEIGHT * 0.35);
        const gap = Math.min(30, (CANVAS_WIDTH - 3 * cardW) / 4);
        const totalW = 3 * cardW + 2 * gap;
        const startX = (CANVAS_WIDTH - totalW) / 2;
        const cardY = CANVAS_HEIGHT / 2 - cardH / 2 + 30;

        for (let j = 0; j < 3; j++) {
            const cx = startX + j * (cardW + gap);
            if (clickX >= cx && clickX <= cx + cardW && clickY >= cardY && clickY <= cardY + cardH) {
                applyLevelUp(j);
                return;
            }
        }
        return;
    }

    if (gameState === 'PAUSED') {
        if (isInsidePauseBtn(clickX, clickY, pauseContinueBtn)) { gameState = 'PLAYING'; return; }
        if (isInsidePauseBtn(clickX, clickY, pauseMenuBtn)) { gameState = 'MAIN_MENU'; resetGameState(); initMainMenuParticles(); return; }
        return;
    }

    if (gameState === 'PLAYING') {
        if (isInsideMenuBtn(clickX, clickY)) { gameState = 'PAUSED'; return; }
    }

    if (gameState !== 'PLAYING' || !selectedClass) return;

    const now = Date.now();
    if (now - lastShotTime < selectedClass.fireRate * player.fireRateMultiplier) return;
    lastShotTime = now;

    const dx = clickX - player.x;
    const dy = clickY - player.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) return;

    fireBullet(dx / length, dy / length);
});

// ===== GEMEINSAME SCHUSS-FUNKTION =====
function fireBullet(dirX, dirY) {
    if (!selectedClass) return;
    const dmg = Math.round(selectedClass.damage * player.damageMultiplier);

    if (selectedClass.id === 1) {
        bullets.push({
            x: player.x - selectedClass.bulletSize,
            y: player.y - selectedClass.bulletSize,
            size: selectedClass.bulletSize * 2,
            vx: dirX * selectedClass.bulletSpeed,
            vy: dirY * selectedClass.bulletSpeed,
            damage: dmg,
            piercing: true,
            color: '#ff88ff',
            glow: '#ff00ff',
            startX: player.x,
            startY: player.y
        });
    } else if (selectedClass.id === 2) {
        bullets.push({
            x: player.x - selectedClass.bulletSize,
            y: player.y - selectedClass.bulletSize,
            size: selectedClass.bulletSize * 2,
            vx: dirX * selectedClass.bulletSpeed + (Math.random() - 0.5) * 1.5,
            vy: dirY * selectedClass.bulletSpeed + (Math.random() - 0.5) * 1.5,
            damage: dmg,
            piercing: false,
            color: '#ffff00',
            glow: '#ffaa00',
            startX: player.x,
            startY: player.y
        });
    } else if (selectedClass.id === 3) {
        const pellets = selectedClass.pellets;
        const spread = selectedClass.spreadAngle;
        const baseAngle = Math.atan2(dirY, dirX);

        for (let i = 0; i < pellets; i++) {
            const offset = (i / (pellets - 1) - 0.5) * spread;
            const angle = baseAngle + offset;
            const spd = selectedClass.bulletSpeed * (0.85 + Math.random() * 0.3);

            bullets.push({
                x: player.x - selectedClass.bulletSize,
                y: player.y - selectedClass.bulletSize,
                size: selectedClass.bulletSize * 2,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                damage: dmg,
                piercing: false,
                maxRange: selectedClass.maxRange,
                color: '#ffaa44',
                glow: '#ff4400',
                startX: player.x,
                startY: player.y
            });
        }
    }
}

// ===== MASCHINENGEWEHR: Dauerfeuer bei gedrückter Maustaste =====
setInterval(() => {
    if (isMobile) return;
    if (gameState !== 'PLAYING' || !selectedClass || selectedClass.id !== 2) return;
    if (!mouseDown) return;

    const now = Date.now();
    if (now - lastShotTime < selectedClass.fireRate * player.fireRateMultiplier) return;
    lastShotTime = now;

    const dx = mouseX - player.x;
    const dy = mouseY - player.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) return;

    fireBullet(dx / length, dy / length);
}, 50);

// ===== SPIEL STARTEN =====
function startGame(klasse) {
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
    player.health = player.maxHealth;
    player.level = 1;
    player.xp = 0;
    player.xpToNext = 50;
    player.damageMultiplier = 1.0;
    player.speedMultiplier = 1.0;
    player.fireRateMultiplier = 1.0;
    player.bulletSpeedMultiplier = 1.0;
    player.lifesteal = 0;
    bullets = [];
    enemies = [];
    particles = [];
    xpCrystals = [];
    score = 0;
    difficultyLevel = 1;
    enemyBaseSpeed = 1.2;
    gridOffsetX = 0;
    gridOffsetY = 0;
    gameTime = 0;

    if (spawnTimerId) {
        clearInterval(spawnTimerId);
        spawnTimerId = null;
    }
}

function resetPlayerPosition() {
    player.x = CANVAS_WIDTH / 2;
    player.y = CANVAS_HEIGHT / 2;
    player.angle = 0;
}

// ===== GEGNER SPAWNEN =====
function spawnEnemy() {
    if (gameState !== 'PLAYING') return;

    const size = 22;
    const speed = enemyBaseSpeed + (difficultyLevel - 1) * 0.3;
    let x, y;
    const side = Math.floor(Math.random() * 4);

    switch (side) {
        case 0: x = Math.random() * CANVAS_WIDTH; y = -size; break;
        case 1: x = CANVAS_WIDTH + size; y = Math.random() * CANVAS_HEIGHT; break;
        case 2: x = Math.random() * CANVAS_WIDTH; y = CANVAS_HEIGHT + size; break;
        case 3: x = -size; y = Math.random() * CANVAS_HEIGHT; break;
    }

    enemies.push({
        x, y, size, speed,
        color: '#ff3333', glow: '#ff0000',
        angle: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.03,
        health: 100
    });
}

// ===== XP-KRISTALL DROPPEN =====
function dropXpCrystal(x, y) {
    xpCrystals.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        size: 6,
        color: '#4488ff',
        glow: '#0044ff',
        collected: false
    });
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

// ===== UPDATE =====
function update() {
    if (gameState === 'MENU') {
        for (const p of menuParticles) {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0) p.x = CANVAS_WIDTH;
            if (p.x > CANVAS_WIDTH) p.x = 0;
            if (p.y < 0) p.y = CANVAS_HEIGHT;
            if (p.y > CANVAS_HEIGHT) p.y = 0;
        }
        return;
    }

    if (gameState === 'PAUSED' || gameState === 'GAMEOVER' || gameState === 'LEVEL_UP') return;

    // === Timer ===
    const now = Date.now();
    if (lastTimerUpdate > 0) {
        gameTime += (now - lastTimerUpdate) / 1000;
    }
    lastTimerUpdate = now;

    // === Spieler-Bewegung (Tastatur) ===
    let moving = false;
    const currentSpeed = player.speed * player.speedMultiplier;
    if (keys.w || keys.up) { player.y -= currentSpeed; moving = true; }
    if (keys.s || keys.down) { player.y += currentSpeed; moving = true; }
    if (keys.a || keys.left) { player.x -= currentSpeed; moving = true; }
    if (keys.d || keys.right) { player.x += currentSpeed; moving = true; }

    // === Spieler-Bewegung (Touch-Joystick) ===
    if (isMobile && touchJoystickActive) {
        const threshold = 10;
        const jx = touchJoystickX;
        const jy = touchJoystickY;
        const jLen = Math.sqrt(jx*jx + jy*jy);

        if (jLen > threshold) {
            const normX = jx / jLen;
            const normY = jy / jLen;
            player.x += normX * currentSpeed;
            player.y += normY * currentSpeed;
            moving = true;
        }
    }

    // Randbegrenzung
    if (player.x < 0) player.x = 0;
    if (player.y < 0) player.y = 0;
    if (player.x > CANVAS_WIDTH) player.x = CANVAS_WIDTH;
    if (player.y > CANVAS_HEIGHT) player.y = CANVAS_HEIGHT;

    if (moving) {
        if (keys.w || keys.up || (touchJoystickActive && touchJoystickY < 0)) gridOffsetY -= 1.5;
        if (keys.s || keys.down || (touchJoystickActive && touchJoystickY > 0)) gridOffsetY += 1.5;
        if (keys.a || keys.left || (touchJoystickActive && touchJoystickX < 0)) gridOffsetX -= 1.5;
        if (keys.d || keys.right || (touchJoystickActive && touchJoystickX > 0)) gridOffsetX += 1.5;
    }

    // Spieler-Winkel
    if (isMobile && touchJoystickActive) {
        const jLen = Math.sqrt(touchJoystickX * touchJoystickX + touchJoystickY * touchJoystickY);
        if (jLen > 10) {
            player.angle = Math.atan2(touchJoystickY, touchJoystickX);
            touchJoystickLastAngle = player.angle;
        }
    } else if (isMobile && !touchJoystickActive) {
        player.angle = touchJoystickLastAngle;
    } else {
        player.angle = Math.atan2(mouseY - player.y, mouseX - player.x);
    }

    // === Projektile bewegen ===
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.x += b.vx;
        b.y += b.vy;

        if (b.maxRange) {
            const dist = Math.sqrt((b.x - b.startX) ** 2 + (b.y - b.startY) ** 2);
            if (dist > b.maxRange) { bullets.splice(i, 1); continue; }
        }

        if (b.x + b.size < 0 || b.x > CANVAS_WIDTH || b.y + b.size < 0 || b.y > CANVAS_HEIGHT) {
            bullets.splice(i, 1);
            continue;
        }
    }

    // === Gegner bewegen ===
    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        const dx = player.x - e.x;
        const dy = player.y - e.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length > 0) {
            e.x += (dx / length) * e.speed;
            e.y += (dy / length) * e.speed;
        }
        e.angle += e.rotSpeed;
    }

    // === Kollision: Projektil trifft Gegner ===
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        let bulletRemoved = false;

        for (let j = enemies.length - 1; j >= 0; j--) {
            const e = enemies[j];

            if (b.x < e.x + e.size && b.x + b.size > e.x - e.size &&
                b.y < e.y + e.size && b.y + b.size > e.y - e.size) {

                e.health -= b.damage;

                // Lebensraub: heile % des verursachten Schadens
                if (player.lifesteal > 0) {
                    const healAmount = Math.round(b.damage * player.lifesteal);
                    player.health = Math.min(player.health + healAmount, player.maxHealth);
                }

                if (e.health <= 0) {
                    createExplosion(e.x, e.y, 15, '#ff4444', '#ff0000', 4);
                    createExplosion(e.x, e.y, 5, '#ffaa00', '#ff6600', 2);
                    dropXpCrystal(e.x, e.y);
                    enemies.splice(j, 1);
                    score += 100;
                }

                if (!b.piercing) {
                    bullets.splice(i, 1);
                    bulletRemoved = true;
                }
                break;
            }
        }

        if (bulletRemoved) continue;
    }

    // === Kollision: Gegner trifft Spieler ===
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        const dist = Math.sqrt((e.x - player.x) ** 2 + (e.y - player.y) ** 2);

        if (dist < e.size + 12) {
            player.health -= 10;
            createExplosion(e.x, e.y, 8, '#ff4444', '#ff0000', 2);
            enemies.splice(i, 1);

            if (player.health <= 0) {
                player.health = 0;
                gameState = 'GAMEOVER';
                if (spawnTimerId) clearInterval(spawnTimerId);
            }
        }
    }

    // === XP-Kristalle: Magnet-Effekt + Einsammeln ===
    const magnetRadius = 120;
    const collectRadius = 15;

    for (let i = xpCrystals.length - 1; i >= 0; i--) {
        const c = xpCrystals[i];
        const dx = player.x - c.x;
        const dy = player.y - c.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < magnetRadius) {
            // Magnet: zum Spieler fliegen
            const speed = 6;
            c.x += (dx / dist) * speed;
            c.y += (dy / dist) * speed;
        }

        if (dist < collectRadius) {
            // Eingesammelt
            player.xp += 10;
            xpCrystals.splice(i, 1);

            // Prüfen ob Level-Up
            if (player.xp >= player.xpToNext) {
                gameState = 'LEVEL_UP';
                generateLevelUpOptions();
            }
        }
    }

    // === Partikel aktualisieren ===
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

// ===== ZEICHNEN =====

function drawGrid() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = gridOffsetX % gridSize; x < CANVAS_WIDTH; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke();
    }
    for (let y = gridOffsetY % gridSize; y < CANVAS_HEIGHT; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke();
    }
}

function drawPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    const s = player.size;

    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00ffcc';

    ctx.beginPath();
    ctx.moveTo(s, 0);
    ctx.lineTo(-s * 0.7, -s * 0.6);
    ctx.lineTo(-s * 0.3, 0);
    ctx.lineTo(-s * 0.7, s * 0.6);
    ctx.closePath();

    const grad = ctx.createLinearGradient(-s, -s, s, s);
    grad.addColorStop(0, '#00ffcc');
    grad.addColorStop(1, '#0088aa');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.shadowBlur = 30;
    ctx.shadowColor = '#00ffcc';
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.restore();
}

function drawEnemy(e) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.angle);
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff0000';
    const s = e.size;

    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s, 0);
    ctx.lineTo(0, s);
    ctx.lineTo(-s, 0);
    ctx.closePath();

    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, s);
    grad.addColorStop(0, '#ff6666');
    grad.addColorStop(0.5, '#ff3333');
    grad.addColorStop(1, '#880000');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ff0000';
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.restore();
}

function drawBullet(b) {
    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = b.glow;
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(b.x + b.size / 2, b.y + b.size / 2, b.size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
}

function drawParticles() {
    for (const p of particles) {
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.glow;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(p.size, 0.5), 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.restore();
    }
}

function drawXpCrystals() {
    for (const c of xpCrystals) {
        ctx.save();
        ctx.shadowBlur = 12;
        ctx.shadowColor = c.glow;
        ctx.fillStyle = c.color;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
        ctx.fill();

        // Leuchtender Kern
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#aaccff';
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.size * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
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

    drawGrid();

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

    drawGrid();

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
    ctx.fillText('ESC = Zurück | Klicke zum Starten', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 30);

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
    if (klasse.id === 3) return ['Schaden: 30 pro Kugel', 'Reichweite: Kurz', '4 Kugeln pro Schuss'];
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

// ===== PAUSE-MENÜ =====
function drawPauseMenu() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.textAlign = 'center';

    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00ffcc';
    ctx.font = 'bold 56px Arial';
    ctx.fillText('PAUSE', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 80);
    ctx.shadowBlur = 0;

    const cb = pauseContinueBtn;
    const bx = cb.x();
    const by = cb.y();
    ctx.fillStyle = 'rgba(0, 200, 150, 0.3)';
    ctx.strokeStyle = '#00cc99';
    ctx.lineWidth = 2;
    roundRect(ctx, bx - cb.w/2, by - cb.h/2, cb.w, cb.h, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#00cc99';
    ctx.font = 'bold 22px Arial';
    ctx.fillText('Weiter (ESC)', bx, by + 8);

    const mb = pauseMenuBtn;
    const mbx = mb.x();
    const mby = mb.y();
    ctx.fillStyle = 'rgba(200, 50, 50, 0.3)';
    ctx.strokeStyle = '#cc4444';
    ctx.lineWidth = 2;
    roundRect(ctx, mbx - mb.w/2, mby - mb.h/2, mb.w, mb.h, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#cc4444';
    ctx.font = 'bold 22px Arial';
    ctx.fillText('Zurück zum Menü (M)', mbx, mby + 8);

    ctx.textAlign = 'left';
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

// ===== LEVEL-UP MENÜ =====
function drawLevelUpMenu() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

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

        ctx.fillStyle = 'rgba(20, 20, 50, 0.9)';
        ctx.strokeStyle = rarityColor;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 15;
        ctx.shadowColor = rarityColor;

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

        ctx.fillStyle = rarityColor;
        ctx.font = 'bold 16px Arial';
        ctx.fillText(opt.displayName, cx + cardW / 2, cardY + cardH / 2 + 6);
    }

    // Farb-Legende: Wörter in Farbe nebeneinander, getrennt durch ' | '
    const legendY = CANVAS_HEIGHT - 50;
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
    ctx.fillText('Klicke oder tippe auf ein Upgrade', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 15);

    ctx.textAlign = 'left';
}

// ===== OPTIONS MENÜ =====
function drawOptionsMenu() {
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    drawGrid();

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
    ctx.fillText('Optionen', CANVAS_WIDTH / 2, titleSize + 50);
    ctx.shadowBlur = 0;

    // Einstellungen-Startposition
    const startY = CANVAS_HEIGHT / 2 - 50;
    const lineHeight = 35;

    // Spieleinstellungen
    ctx.fillStyle = '#00ffcc';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'left';
    const leftX = CANVAS_WIDTH / 2 - 150;
    ctx.fillText('Spieleinstellungen:', leftX, startY);
    
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '18px Arial';
    ctx.fillText('Schwierigkeitsgrad (Normal)', leftX + 30, startY + lineHeight);

    // Audio
    ctx.fillStyle = '#00ffcc';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('Audio:', leftX, startY + lineHeight * 2.5);
    
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '18px Arial';
    ctx.fillText('Musik-Lautstärke (80%)  |  Soundeffekte (100%)', leftX + 30, startY + lineHeight * 3.5);

    // Video
    ctx.fillStyle = '#00ffcc';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('Video:', leftX, startY + lineHeight * 5);
    
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '18px Arial';
    ctx.fillText('Kontrast (Standard)', leftX + 30, startY + lineHeight * 6);

    // Hilfetext unten
    ctx.textAlign = 'center';
    ctx.fillStyle = '#666666';
    ctx.font = '14px Arial';
    ctx.fillText('ESC = Zurück zum Hauptmenü', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 30);

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

    ctx.fillStyle = '#888888';
    ctx.font = '18px Arial';
    ctx.fillText('Drücke R um zurück zum Menü zu kommen', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 100);

    ctx.textAlign = 'left';
}

// ===== GAME LOOP =====
function gameLoop() {
    update();

    // Zeichnen
    if (gameState === 'MAIN_MENU') drawMainMenu();
    else if (gameState === 'OPTIONS') drawOptionsMenu();
    else if (gameState === 'CHAR_SELECT') drawCharSelect();
    else if (gameState === 'WEAPON_SELECT') drawWeaponSelect();
    else if (gameState === 'MENU') drawMenu();
    else if (gameState === 'PLAYING') {
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        drawGrid();
        drawXpCrystals();
        for (const e of enemies) drawEnemy(e);
        for (const b of bullets) drawBullet(b);
        drawPlayer();
        drawParticles();
        drawMenuButton();

        // === XP-Balken (ganz oben, 8px, Neon-Blau/Lila-Verlauf) ===
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

        // LVL X unter dem XP-Balken
        ctx.textAlign = 'left';
        ctx.fillStyle = '#00ffcc';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('LVL ' + player.level, 20, 25);

        // Score unter LVL
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Arial';
        ctx.fillText('Score: ' + score, 20, 50);

        // Lebensbalken (unter Score)
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

        // HP-Text zentriert auf dem Lebensbalken
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
        ctx.textAlign = 'left';
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

requestAnimationFrame(gameLoop);

// ============================================================
// TODO: BALANCING & GAMEPLAY UPGRADES
// ============================================================
// - Level-Up Karten nerfen/buffen
// - Rare Gegner & Minibosse integrieren
// - Truppen-Drops bei Bossen (Vampire Survivors Style) für Sonderfähigkeiten
// ============================================================
