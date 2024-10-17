// Initialize canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Define game variables
let player = {
    x: canvas.width / 2,
    y: 600,
    width: 120,
    height: 120,
    health: 10,
    maxHealth: 10,
    exploding: false,
    explosionFrame: 0
};

let potions = [];
let enemies = [];
let bullets = [];
let asids = []; // Array for enemy bullets

const potionHealAmount = 3;
const bulletSpeed = 10;
const asidSpeed = 10; // Increased ASID speed for better gameplay
const enemyDamage = 1;
const asidDamage = 1;
const playerDamageInterval = 1000;
const explosionFrames = 10;
const corpseDuration = 250; // Duration in milliseconds for corpse to remain visible

let lastBulletTime = 0.1;
let lastEnemyDamageTime = 1;
let lastASIDTime = 0.1;

let gameover = false;

// Load sprite images
const images = {
    player: 'player.png',
    potion: 'potion.png',
    enemy: 'enemy.png',
    enemyCorpse: 'enemy-corpse.png',
    bullet: 'bullet.png',
    asid: 'asid.png',
    explosion: 'explosion.png'
};

const imageObjects = {};
let imagesLoaded = 0;
const totalImages = Object.keys(images).length;

// Load all images
Object.keys(images).forEach((key) => {
    const img = new Image();
    img.src = images[key];
    img.onload = () => {
        imagesLoaded++;
        if (imagesLoaded === totalImages) {
            console.log('All images loaded.');
            gameLoop(); // Start game loop when all images are loaded
        }
    };
    img.onerror = () => console.error(`Error loading image: ${images[key]}`);
    imageObjects[key] = img;
});

// Load flame frames for animation
const flameFrames = [];
for (let i = 0; i < 4; i++) { // Adjust the number of frames as needed
    const img = new Image();
    img.src = `flame_frame_${i}.png`; // Replace with the correct path
    img.onload = () => {
        flameFrames[i] = img;
        if (flameFrames.length === 4) {
            console.log('All flame images loaded.');
        }
    };
    img.onerror = () => console.error(`Error loading flame frame ${i}`);
}

const flame = {
    x: player.x - 20,
    y: player.y + player.height / 2 - 30,
    width: 30,
    height: 60,
    visible: false,
    frame: 0, // Current frame
    frameCount: 4, // Number of frames in the animation
    frameDelay: 100, // Delay between frames in milliseconds
    lastFrameUpdate: 0 // Timestamp of the last frame update
};

// Game loop
function gameLoop() {
    if (imagesLoaded < totalImages) return; // Wait until images are loaded

    update();
    render();
    requestAnimationFrame(gameLoop);
}

// Update game state
function update() {
    if (gameover) {
        return; // Stop game updates if game over
    }

    // Player movement
    handlePlayerMovement();

    // Player shooting (auto-fire)
    handlePlayerShooting();

    // Update potions
    updatePotions();

    // Update enemies
    updateEnemies();

    // Check collisions
    handleCollisions();

    // Update player health due to enemy damage over time
    handlePlayerDamageOverTime();

    // Update bullets
    updateBullets();

    // Update ASIDs (enemy bullets)
    updateASIDs();

    // Update flame animation
    if (flame.visible) {
        const now = Date.now();
        if (now - flame.lastFrameUpdate > flame.frameDelay) {
            flame.frame = (flame.frame + 1) % flame.frameCount;
            flame.lastFrameUpdate = now;
        }
    }
}

// Render game objects
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (player.exploding) {
        ctx.drawImage(imageObjects.explosion, player.explosionFrame * 0, 0, 600, 600, player.x - 36, player.y - 36, 192, 192);

        if (player.explosionFrame >= explosionFrames - 1) {
            setTimeout(() => {
                location.reload(); // Refresh the browser 2 seconds after player explodes
            }, 2000);
        }

        return; // Stop rendering other objects during explosion
    }

    // Draw flame if visible
    if (flame.visible) {
        const frameImage = flameFrames[flame.frame];
        if (frameImage && frameImage.complete) {
            ctx.drawImage(frameImage, flame.x, flame.y, flame.width, flame.height);
        } else {
            console.error('Flame image not fully loaded.');
        }
    }

    // Draw player
    ctx.drawImage(imageObjects.player, player.x, player.y, player.width, player.height);

    // Draw potions
    potions.forEach(potion => {
        ctx.drawImage(imageObjects.potion, potion.x, potion.y, 60, 60); // Adjust width and height as needed
    });

    // Draw enemies
    enemies.forEach(enemy => {
        if (enemy.health > 0) {
            ctx.drawImage(imageObjects.enemy, enemy.x, enemy.y, 120, 120); // Adjust width and height as needed
        } else {
            ctx.drawImage(imageObjects.enemyCorpse, enemy.x, enemy.y, 120, 120); // Adjust width and height as needed
        }
    });

    // Draw bullets
    bullets.forEach(bullet => {
        ctx.drawImage(imageObjects.bullet, bullet.x, bullet.y, 30, 30); // Adjust width and height as needed
    });

    // Draw ASIDs (enemy bullets)
    asids.forEach(asid => {
        ctx.drawImage(imageObjects.asid, asid.x, asid.y, 100, 100); // Adjust width and height as needed
    });

    // Draw player health bar
    ctx.fillStyle = 'red';
    for (let i = 0; i < player.health; i++) {
        ctx.fillRect(canvas.width - 20 - i * 12, 10, 12, 12); // Draw health squares
    }
}

// Handle player movement
function handlePlayerMovement() {
    if (keys['ArrowLeft'] && player.x > 0) {
        player.x -= 14;
        flame.visible = false; // Hide flame if moving left
    }
    if (keys['ArrowRight'] && player.x < canvas.width - player.width) {
        player.x += 14;
        flame.visible = false; // Hide flame if moving right
    }
    if (keys['ArrowDown'] && player.y < canvas.height - player.height) {
        player.y += 3.5;
    }
    if (keys['ArrowUp']) { // Player is moving forward
        player.y -= 7; // Move player forward (upward)
        flame.visible = true; // Show flame
        flame.x = player.x + 45; // Adjust as needed
        flame.y = player.y + player.height; // Center flame behind player
    } else {
        flame.visible = false; // Hide flame if not moving forward
        flame.frame = 0; // Reset frame to the first frame
    }
}

// Handle player shooting (auto-fire)
function handlePlayerShooting() {
    if (Date.now() - lastBulletTime > 300) { // Adjust fire rate as needed
        bullets.push({ x: player.x + player.width / 2.3 - 7.5, y: player.y - 20, direction: 'up' }); // Adjust bullet offset as needed
        lastBulletTime = Date.now();
    }
}

// Update potions (spawn new potions randomly)
function updatePotions() {
    if (Math.random() < 0.002) { // Adjust spawn rate as needed
        potions.push({ x: Math.random() * (canvas.width - 60), y: -60 });
    }

    potions.forEach(potion => {
        potion.y += 2; // Adjust potion speed as needed
    });

    potions = potions.filter(potion => potion.y < canvas.height);
}

// Update enemies (spawn new enemies randomly)
function updateEnemies() {
    if (Math.random() < 0.005) { // Adjust spawn rate as needed (lowered for easier gameplay)
        enemies.push({ x: Math.random() * (canvas.width - 120), y: -120, health: 3 });
    }

    enemies.forEach(enemy => {
        enemy.y += 2; // Adjust enemy speed as needed

        if (Math.random() < 0.005 && enemy.health > 0) { // Adjust shoot rate and check if enemy is alive
            asids.push({ x: enemy.x + 10, y: enemy.y + 120, direction: 'down' });
        }
    });

    enemies = enemies.filter(enemy => enemy.y < canvas.height);
}

// Update bullets
function updateBullets() {
    bullets.forEach(bullet => {
        if (bullet.direction === 'up') {
            bullet.y -= bulletSpeed;
        }
    });

    bullets = bullets.filter(bullet => bullet.y > 0);
}

// Update ASIDs (enemy bullets)
function updateASIDs() {
    asids.forEach(asid => {
        if (asid.direction === 'down') {
            asid.y += asidSpeed;
        }
    });

    asids = asids.filter(asid => asid.y < canvas.height);
}

// Handle collisions
function handleCollisions() {
    potions.forEach(potion => {
        if (player.x < potion.x + 60 &&
            player.x + player.width > potion.x &&
            player.y < potion.y + 60 &&
            player.y + player.height > potion.y) {
            player.health += potionHealAmount;
            potions = potions.filter(p => p !== potion);
        }
    });

    bullets.forEach(bullet => {
        enemies.forEach(enemy => {
            if (bullet.x < enemy.x + 120 &&
                bullet.x + 15 > enemy.x &&
                bullet.y < enemy.y + 120 &&
                bullet.y + 15 > enemy.y) {
                enemy.health--;
                bullets = bullets.filter(b => b !== bullet);
                if (enemy.health <= 0) {
                    enemy.health = 0;
                    setTimeout(() => {
                        enemies = enemies.filter(e => e !== enemy);
                        asids = asids.filter(asid => asid.enemy !== enemy);
                    }, corpseDuration);
                }
            }
        });
    });

    const currentTime = Date.now();
    if (currentTime - lastEnemyDamageTime > playerDamageInterval) {
        enemies.forEach(enemy => {
            if (player.x < enemy.x + 120 &&
                player.x + player.width > enemy.x &&
                player.y < enemy.y + 120 &&
                player.y + player.height > enemy.y) {
                player.health -= enemyDamage;
            }
        });
        lastEnemyDamageTime = currentTime;
    }

    asids.forEach(asid => {
        if (player.x < asid.x + 15 &&
            player.x + player.width > asid.x &&
            player.y < asid.y + 15 &&
            player.y + player.height > asid.y) {
            player.health -= asidDamage;
            asids = asids.filter(a => a !== asid);
        }
    });

    if (player.health > player.maxHealth) {
        player.health = player.maxHealth;
    }

    if (player.health <= 0 && !player.exploding) {
        player.exploding = true;
        player.explosionFrame = 0;
        setTimeout(() => {
            location.reload(); // Refresh the browser 2 seconds after player explodes
        }, 2000); // Wait 2 seconds before refreshing
    }
}

// Handle player damage over time
function handlePlayerDamageOverTime() {
    // Implement as needed
}

// Keyboard event listeners
const keys = {};
document.addEventListener('keydown', function (e) {
    keys[e.key] = true;
});
document.addEventListener('keyup', function (e) {
    keys[e.key] = false;
});
