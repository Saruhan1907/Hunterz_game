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
let gameState = 'MENU'; // 'MENU' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'

// ===== KLASSEN-DEFINITIONEN =====
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
        detail: '4 Kugeln pro Schuss, kurze Reichweite',
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

// ===== SPIELER =====
const player = {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    size: 20,
    speed: 5,
    color: '#40e0d0',
    health: 100,
    maxHealth: 100,
    angle: 0
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

// ===== MAUS =====
let mouseX = CANVAS_WIDTH / 2;
let mouseY = CANVAS_HEIGHT / 2;
let mouseDown = false;

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

// ===== TOUCH-STEUERUNG =====
let touchJoystickActive = false;
let touchJoystickX = 0;
let touchJoystickY = 0;
let touchJoystickId = -1;
let touchJoystickLastAngle = 0; // friert Blickrichtung bei Loslassen ein
let touchFireActive = false;
let touchFireId = -1;
let touchFireAngle = 0;

// Joystick-Position (unten links)
const joystickCenterX = () => 140;
const joystickCenterY = () => CANVAS_HEIGHT - 140;
const joystickRadius = 70;
const joystickKnobRadius = 25;

// Feuer-Button (unten rechts)
const fireBtnCenterX = () => CANVAS_WIDTH - 120;
const fireBtnCenterY = () => CANVAS_HEIGHT - 120;
const fireBtnRadius = 55;

// Menü-Pause-Button (oben rechts)
const menuBtnX = () => CANVAS_WIDTH - 60;
const menuBtnY = () => 50;
const menuBtnRadius = 28;

// Pause-Menü-Buttons
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

// Prüft ob ein Punkt innerhalb des Menü-Buttons (oben rechts) liegt
function isInsideMenuBtn(tx, ty) {
    const dx = tx - menuBtnX();
    const dy = ty - menuBtnY();
    return Math.sqrt(dx*dx + dy*dy) < menuBtnRadius;
}

// Prüft ob ein Punkt innerhalb eines Pause-Menü-Buttons liegt
function isInsidePauseBtn(tx, ty, btn) {
    const bx = btn.x();
    const by = btn.y();
    return tx >= bx - btn.w/2 && tx <= bx + btn.w/2 && ty >= by - btn.h/2 && ty <= by + btn.h/2;
}

// ===== TOUCH-EVENTS =====
function handleTouchStart(e) {
    e.preventDefault();
    isMobile = true;

    if (gameState === 'MENU') {
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

    // PAUSED: Prüfe Buttons
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
                gameState = 'MENU';
                resetGameState();
                initMenuParticles();
                return;
            }
        }
        return;
    }

    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const tx = touch.clientX;
        const ty = touch.clientY;

        // Prüfen ob Menü-Button (oben rechts) getroffen
        if (isInsideMenuBtn(tx, ty)) {
            gameState = 'PAUSED';
            continue;
        }

        // Prüfen ob Feuer-Button getroffen
        const fdx = tx - fireBtnCenterX();
        const fdy = ty - fireBtnCenterY();
        if (Math.sqrt(fdx*fdx + fdy*fdy) < fireBtnRadius) {
            touchFireActive = true;
            touchFireId = touch.identifier;
            touchFireAngle = player.angle;
            touchShoot();
            continue;
        }

        // Prüfen ob Joystick-Bereich getroffen (linke untere Hälfte)
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
            // Blickrichtung einfrieren beim Loslassen
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

// Touch-Shoot-Funktion für Dauerfeuer per Touch
function touchShoot() {
    if (gameState !== 'PLAYING' || !selectedClass) return;
    if (!touchFireActive) return;

    const now = Date.now();
    if (now - lastShotTime < selectedClass.fireRate) return;
    lastShotTime = now;

    // In Blickrichtung schießen
    const angle = player.angle;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    if (dx === 0 && dy === 0) return;

    fireBullet(dx, dy);
}

// Touch-Dauerfeuer-Intervall
setInterval(() => {
    if (isMobile && touchFireActive && gameState === 'PLAYING') {
        touchShoot();
    }
}, 50);

// ===== TASTATUR-EVENTS =====
window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();

    // MENÜ: Klassenauswahl
    if (gameState === 'MENU') {
        if (key === '1') { startGame(CLASSES.SNIPER); return; }
        if (key === '2') { startGame(CLASSES.MACHINEGUN); return; }
        if (key === '3') { startGame(CLASSES.SHOTGUN); return; }
    }

    // GAMEOVER: zurück zum Menü
    if (key === 'r' && gameState === 'GAMEOVER') {
        gameState = 'MENU';
        initMenuParticles();
        return;
    }

    // PAUSED: ESC oder M
    if (gameState === 'PAUSED') {
        if (key === 'escape') {
            gameState = 'PLAYING';
            return;
        }
        if (key === 'm') {
            gameState = 'MENU';
            resetGameState();
            initMenuParticles();
            return;
        }
    }

    // PLAYING: Escape zum Pausieren
    if (key === 'escape' && gameState === 'PLAYING') {
        gameState = 'PAUSED';
        return;
    }

    // Spieler-Steuerung
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

    // MENÜ: Klassenauswahl per Klick
    if (gameState === 'MENU') {
        const klasse = getClassAtPosition(clickX, clickY);
        if (klasse) {
            startGame(klasse);
        }
        return;
    }

    // PAUSED: Buttons per Klick
    if (gameState === 'PAUSED') {
        if (isInsidePauseBtn(clickX, clickY, pauseContinueBtn)) {
            gameState = 'PLAYING';
            return;
        }
        if (isInsidePauseBtn(clickX, clickY, pauseMenuBtn)) {
            gameState = 'MENU';
            resetGameState();
            initMenuParticles();
            return;
        }
        return;
    }

    // PLAYING: Menü-Button oben rechts
    if (gameState === 'PLAYING') {
        if (isInsideMenuBtn(clickX, clickY)) {
            gameState = 'PAUSED';
            return;
        }
    }

    if (gameState !== 'PLAYING' || !selectedClass) return;

    const now = Date.now();
    if (now - lastShotTime < selectedClass.fireRate) return;
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

    if (selectedClass.id === 1) {
        bullets.push({
            x: player.x - selectedClass.bulletSize,
            y: player.y - selectedClass.bulletSize,
            size: selectedClass.bulletSize * 2,
            vx: dirX * selectedClass.bulletSpeed,
            vy: dirY * selectedClass.bulletSpeed,
            damage: selectedClass.damage,
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
            damage: selectedClass.damage,
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
                damage: selectedClass.damage,
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
    if (now - lastShotTime < selectedClass.fireRate) return;
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

    spawnInterval = 2000;
    if (spawnTimerId) clearInterval(spawnTimerId);
    spawnTimerId = setInterval(spawnEnemy, spawnInterval);

    spawnEnemy();
    spawnEnemy();
}

function resetGameState() {
    player.health = player.maxHealth;
    bullets = [];
    enemies = [];
    particles = [];
    score = 0;
    difficultyLevel = 1;
    enemyBaseSpeed = 1.2;
    gridOffsetX = 0;
    gridOffsetY = 0;

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

    if (gameState === 'PAUSED' || gameState === 'GAMEOVER') return;

    // === Spieler-Bewegung (Tastatur) ===
    let moving = false;
    if (keys.w || keys.up) { player.y -= player.speed; moving = true; }
    if (keys.s || keys.down) { player.y += player.speed; moving = true; }
    if (keys.a || keys.left) { player.x -= player.speed; moving = true; }
    if (keys.d || keys.right) { player.x += player.speed; moving = true; }

    // === Spieler-Bewegung (Touch-Joystick) ===
    if (isMobile && touchJoystickActive) {
        const threshold = 10;
        const jx = touchJoystickX;
        const jy = touchJoystickY;
        const jLen = Math.sqrt(jx*jx + jy*jy);

        if (jLen > threshold) {
            const normX = jx / jLen;
            const normY = jy / jLen;
            player.x += normX * player.speed;
            player.y += normY * player.speed;
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
        // Touch: Winkel basierend auf Joystick-Richtung
        const jLen = Math.sqrt(touchJoystickX * touchJoystickX + touchJoystickY * touchJoystickY);
        if (jLen > 10) {
            player.angle = Math.atan2(touchJoystickY, touchJoystickX);
            touchJoystickLastAngle = player.angle; // aktualisieren
        }
    } else if (isMobile && !touchJoystickActive) {
        // Touch, Joystick losgelassen: eingefrorenen Winkel beibehalten
        player.angle = touchJoystickLastAngle;
    } else {
        // PC: Winkel zur Maus
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

                if (e.health <= 0) {
                    createExplosion(e.x, e.y, 15, '#ff4444', '#ff0000', 4);
                    createExplosion(e.x, e.y, 5, '#ffaa00', '#ff6600', 2);
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
        ctx.fillText('[' + c.id + ']', cx + cardWidth / 2, cardY + fs + 10);

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
    ctx.fillText('Drücke 1, 2 oder 3 um zu starten', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 30);

    ctx.textAlign = 'left';
}

function getClassStats(klasse) {
    if (klasse.id === 1) return ['Schaden: 100 (1 Hit)', 'Feuerrate: Langsam', 'Durchschlag: Ja'];
    if (klasse.id === 2) return ['Schaden: 20 (5 Hits)', 'Feuerrate: Sehr schnell', 'Dauerfeuer: Ja'];
    if (klasse.id === 3) return ['Schaden: 30 pro Kugel', 'Reichweite: Kurz', '4 Kugeln pro Schuss'];
    return [];
}

// ===== MENÜ-BUTTON (oben rechts) ZEICHNEN =====
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

    // Pausen-Symbol (zwei Striche)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillRect(cx - 8, cy - 11, 5, 22);
    ctx.fillRect(cx + 3, cy - 11, 5, 22);

    ctx.restore();
}

// ===== PAUSE-MENÜ ZEICHNEN =====
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

    // Button: Weiter (ESC)
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

    // Button: Zurück zum Menü (M)
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

// ===== GAME OVER ZEICHNEN =====
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

    if (selectedClass) {
        ctx.fillStyle = selectedClass.color;
        ctx.font = '20px Arial';
        ctx.fillText('Klasse: ' + selectedClass.name, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Arial';
    ctx.fillText('Score: ' + score, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);

    ctx.font = '22px Arial';
    ctx.fillText('Drücke R für Menü', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 90);
    ctx.textAlign = 'left';
}

// ===== TOUCH-UI ZEICHNEN =====
function drawTouchUI() {
    if (!isMobile) return;

    const jcx = joystickCenterX();
    const jcy = joystickCenterY();

    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(jcx, jcy, joystickRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(jcx + touchJoystickX, jcy + touchJoystickY, joystickKnobRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();

    const fcx = fireBtnCenterX();
    const fcy = fireBtnCenterY();
    const isPressed = touchFireActive;

    ctx.save();
    ctx.globalAlpha = isPressed ? 0.5 : 0.3;
    ctx.fillStyle = isPressed ? '#ff4444' : 'rgba(255, 100, 100, 0.4)';
    ctx.strokeStyle = isPressed ? '#ff0000' : 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(fcx, fcy, fireBtnRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.strokeStyle = isPressed ? '#ffffff' : 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 2;
    const crossSize = 18;
    ctx.beginPath();
    ctx.moveTo(fcx - crossSize, fcy);
    ctx.lineTo(fcx + crossSize, fcy);
    ctx.moveTo(fcx, fcy - crossSize);
    ctx.lineTo(fcx, fcy + crossSize);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(fcx, fcy, 8, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = isPressed ? '#ffffff' : 'rgba(255, 255, 255, 0.6)';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('FEUER', fcx, fcy + fireBtnRadius + 20);
    ctx.textAlign = 'left';
    ctx.restore();
}

// ===== HUD =====
function drawHUD() {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Arial';
    ctx.shadowBlur = 4;
    ctx.shadowColor = '#000000';
    ctx.fillText('Score: ' + score, 15, 25);

    ctx.font = '20px Arial';
    ctx.fillText('Leben: ' + player.health + '/' + player.maxHealth, 15, 55);
    ctx.shadowBlur = 0;

    const barWidth = Math.min(200, CANVAS_WIDTH * 0.25);
    const barHeight = 20;
    const barX = 15;
    const barY = 65;
    const healthPercent = player.health / player.maxHealth;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    ctx.fillStyle = healthPercent > 0.6 ? '#00ff00' : healthPercent > 0.3 ? '#ffff00' : '#ff0000';
    ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    if (selectedClass) {
        ctx.fillStyle = selectedClass.color;
        ctx.font = 'bold 16px Arial';
        ctx.shadowBlur = 4;
        ctx.shadowColor = '#000000';
        ctx.fillText('Klasse: ' + selectedClass.name, 15, 110);
        ctx.shadowBlur = 0;
    }

    ctx.fillStyle = '#aaaaaa';
    ctx.font = '14px Arial';
    ctx.fillText('Schwierigkeit: Level ' + difficultyLevel, 15, 135);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('ESC = Pause', CANVAS_WIDTH - 15, 25);
    ctx.textAlign = 'left';
}

// ===== DRAW =====
function draw() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (gameState === 'MENU') {
        drawMenu();
        return;
    }

    if (gameState === 'GAMEOVER') {
        drawGameOver();
        return;
    }

    // PLAYING or PAUSED
    drawGrid();
    drawParticles();

    for (const e of enemies) drawEnemy(e);
    for (const b of bullets) drawBullet(b);
    drawPlayer();
    drawHUD();
    drawTouchUI();
    drawMenuButton();

    if (gameState === 'PAUSED') {
        drawPauseMenu();
    }
}

// ===== GAME LOOP =====
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

gameLoop();