// Initialize canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Define game variables
let player = {
    x: 1920 / 2,
    y: 600,
    width: 120,
    height: 120,
    health: 3,
    maxHealth: 3,
    exploding: false,
    explosionFrame: 0
};

let player2 = {
    x: 1920 / 2 - 200, // Adjusted position for Player 2
    y: 600,
    width: 120,
    height: 120,
    health: 9,
    maxHealth: 9,
    exploding: false,
    explosionFrame: 0
};

let potions = [];
let enemies = [];
let bullets = [];
let asids = []; // Array for enemy bullets

const potionHealAmount =3;
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
const playerSprite = new Image();
playerSprite.src = 'player.png';

const player2Sprite = new Image();
player2Sprite.src = 'player2.png'; // Replace with Player 2 image URL

const potionSprite = new Image();
potionSprite.src = 'potion.png';

const enemySprite = new Image();
enemySprite.src = 'enemy.png';

const enemyCorpseSprite = new Image();
enemyCorpseSprite.src = 'enemy-corpse.png';

const bulletSprite = new Image();
bulletSprite.src = 'bullet.png';

const asidSprite = new Image();
asidSprite.src = 'asid.png';

const explosionSprite = new Image();
explosionSprite.src = 'explosion.png';

// Game loop
function gameLoop() {
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
    handlePlayerMovement(player);
    handlePlayerMovement(player2); // Handle Player 2 movement

    // Player shooting (auto-fire for Player 1)
    handlePlayerShooting();

    // Player 2 shooting (Minus key)
    handlePlayer2Shooting();

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
}

// Render game objects
function render() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (player.exploding || player2.exploding) {
        // Draw player explosions
        if (player.exploding) {
            ctx.drawImage(explosionSprite, player.explosionFrame * 0, 0, 600, 600, player.x - 36, player.y - 36, 192, 192);
        }
        if (player2.exploding) {
            ctx.drawImage(explosionSprite, player2.explosionFrame * 0, 0, 600, 600, player2.x - 36, player2.y - 36, 192, 192);
        }

        // Check if explosion animations have finished
        if (player.exploding && player.explosionFrame >= explosionFrames - 1) {
            setTimeout(() => {
                location.reload(); // Refresh the browser 2 seconds after player 1 explodes
            }, 2000);
        }
        if (player2.exploding && player2.explosionFrame >= explosionFrames - 1) {
            setTimeout(() => {
                location.reload(); // Refresh the browser 2 seconds after player 2 explodes
            }, 2000);
        }

        return; // Stop rendering other objects during explosion
    }

    // Draw players
    ctx.drawImage(playerSprite, player.x, player.y, player.width, player.height);
    ctx.drawImage(player2Sprite, player2.x, player2.y, player2.width, player2.height);

    // Draw potions
    potions.forEach(potion => {
        ctx.drawImage(potionSprite, potion.x, potion.y, 60, 60); // Adjust width and height as needed
    });

    // Draw enemies
    enemies.forEach(enemy => {
        if (enemy.health > 0) {
            ctx.drawImage(enemySprite, enemy.x, enemy.y, 120, 120); // Adjust width and height as needed
        } else {
            // Draw enemy corpse if health is 0
            ctx.drawImage(enemyCorpseSprite, enemy.x, enemy.y, 120, 120); // Adjust width and height as needed
        }
    });

    // Draw bullets
    bullets.forEach(bullet => {
        ctx.drawImage(bulletSprite, bullet.x, bullet.y, 30, 30); // Adjust width and height as needed
    });

    // Draw ASIDs (enemy bullets)
    asids.forEach(asid => {
        ctx.drawImage(asidSprite, asid.x, asid.y, 100, 100); // Adjust width and height as needed
    });

    // Draw player health bars
    ctx.fillStyle = 'Cyan';
    for (let i = 0; i < player.health; i++) {
        ctx.fillRect(canvas.width - 20 - i * 12, 10, 12, 12); // Draw health squares for Player 1
    }
    ctx.fillStyle = 'Orange';
    for (let i = 0; i < player2.health; i++) {
        ctx.fillRect(canvas.width - 20 - i * 12, 30, 12, 12); // Draw health squares for Player 2
    }
}

// Handle player movement
function handlePlayerMovement(playerObj) {
    // Move player with arrow keys for Player 1
    if (playerObj === player) {
        if (keys['ArrowLeft'] && player.x > 0) {
            player.x -= 14;
        }
        if (keys['ArrowRight'] && player.x < canvas.width - player.width) {
            player.x += 14;
        }
        if (keys['ArrowUp'] && player.y > 0) {
            player.y -= 7;
        }
        if (keys['ArrowDown'] && player.y < canvas.height - player.height) {
            player.y += 7;
        }
    }
    // Move player with WSAD keys for Player 2
    else if (playerObj === player2) {
        if (keys['KeyA'] && player2.x > 0) {
            player2.x -= 14;
        }
        if (keys['KeyD'] && player2.x < canvas.width - player2.width) {
            player2.x += 14;
        }
        if (keys['KeyW'] && player2.y > 0) {
            player2.y -= 7;
        }
        if (keys['KeyS'] && player2.y < canvas.height - player2.height) {
            player2.y += 7;
        }
    }
}

// Handle player shooting (auto-fire for Player 1)
function handlePlayerShooting() {
    // Shoot bullets automatically for Player 1
    if (Date.now() - lastBulletTime > 300) { // Adjust fire rate as needed
        bullets.push({ x: player.x + player.width / 2.3 - 7.5, y: player.y - 20, direction: 'up' }); // Adjust bullet offset as needed
        lastBulletTime = Date.now();
    }
}

// Handle player 2 shooting (Minus key)
function handlePlayer2Shooting() {
    // Shoot bullets when Minus is pressed for Player 2
    if (keys['Minus']) {
        bullets.push({ x: player2.x + player2.width / 2.3 - 7.5, y: player2.y - 20, direction: 'up' }); // Adjust bullet offset as needed
    }
}

// Update potions (spawn new potions randomly)
function updatePotions() {
    if (Math.random() < 0.002) { // Adjust spawn rate as needed
        potions.push({ x: Math.random() * (canvas.width - 60), y: -60 });
    }

    // Move potions
    potions.forEach(potion => {
        potion.y += 2; // Adjust potion speed as needed
    });

    // Remove potions that are off-screen
    potions = potions.filter(potion => potion.y < canvas.height);
}

// Update enemies (spawn new enemies randomly)
function updateEnemies() {
    if (Math.random() < 0.005) { // Adjust spawn rate as needed (lowered for easier gameplay)
        enemies.push({ x: Math.random() * (canvas.width - 120), y: -120, health: 3 });
    }

    // Move enemies
    enemies.forEach(enemy => {
        enemy.y += 2; // Adjust enemy speed as needed

        // Enemy shoots ASID (enemy bullet) downwards randomly
        if (Math.random() < 0.005 && enemy.health > 0) { // Adjust shoot rate and check if enemy is alive
            asids.push({ x: enemy.x + 10, y: enemy.y + 120, direction: 'down' });
        }
    });

    // Remove enemies that are off-screen
    enemies = enemies.filter(enemy => enemy.y < canvas.height);
}

// Update bullets
function updateBullets() {
    // Move bullets
    bullets.forEach(bullet => {
        if (bullet.direction === 'up') {
            bullet.y -= bulletSpeed;
        }
    });

    // Remove bullets that are off-screen
    bullets = bullets.filter(bullet => bullet.y > 0);
}

// Update ASIDs (enemy bullets)
function updateASIDs() {
    // Move ASIDs (enemy bullets)
    asids.forEach(asid => {
        if (asid.direction === 'down') {
            asid.y += asidSpeed;
        }
    });

    // Remove ASIDs that are off-screen
    asids = asids.filter(asid => asid.y < canvas.height);
}

// Handle collisions
function handleCollisions() {
    // Player and potion collision
    potions.forEach(potion => {
        if (player.x < potion.x + 60 &&
            player.x + player.width > potion.x &&
            player.y < potion.y + 60 &&
            player.y + player.height > potion.y) {
            player.health += potionHealAmount;
            potions = potions.filter(p => p !== potion);
        }
        if (player2.x < potion.x + 60 &&
            player2.x + player2.width > potion.x &&
            player2.y < potion.y + 60 &&
            player2.y + player2.height > potion.y) {
            player2.health += potionHealAmount;
            potions = potions.filter(p => p !== potion);
        }
    });

    // Bullet and enemy collision
    bullets.forEach(bullet => {
        enemies.forEach(enemy => {
            if (bullet.x < enemy.x + 120 &&
                bullet.x + 15 > enemy.x &&
                bullet.y < enemy.y + 120 &&
                bullet.y + 15 > enemy.y) {
                enemy.health--;
                bullets = bullets.filter(b => b !== bullet);
                if (enemy.health <= 0) {
                    // Set enemy to dead state
                    enemy.health = 0;
                    setTimeout(() => {
                        // Remove enemy and its ASIDs after corpseDuration milliseconds (corpse animation duration)
                        enemies = enemies.filter(e => e !== enemy);
                        asids = asids.filter(asid => asid.enemy !== enemy);
                    }, corpseDuration);
                }
            }
        });
    });

    // Player and enemy collision (damage over time)
    const currentTime = Date.now();
    if (currentTime - lastEnemyDamageTime > playerDamageInterval) {
        enemies.forEach(enemy => {
            if (player.x < enemy.x + 180 &&
                player.x + player.width > enemy.x &&
                player.y < enemy.y + 180 &&
                player.y + player.height > enemy.y) {
                player.health -= enemyDamage;
            }
            if (player2.x < enemy.x + 180 &&
                player2.x + player2.width > enemy.x &&
                player2.y < enemy.y + 180 &&
                player2.y + player2.height > enemy.y) {
                player2.health -= enemyDamage;
                if (enemy.health > 0) {
                    // Player 2 kills enemy on contact
                    enemy.health = 0;
                    setTimeout(() => {
                        enemies = enemies.filter(e => e !== enemy);
                        asids = asids.filter(asid => asid.enemy !== enemy);
                    }, corpseDuration);
                }
            }
        });
        lastEnemyDamageTime = currentTime;
    }

    // Player and ASID collision (damage on touch)
    asids.forEach(asid => {
        if (player.x < asid.x + 15 &&
            player.x + player.width > asid.x &&
            player.y < asid.y + 15 &&
            player.y + player.height > asid.y) {
            player.health -= asidDamage;
            // Remove ASID upon collision with player
            asids = asids.filter(a => a !== asid);
        }
        if (player2.x < asid.x + 15 &&
            player2.x + player2.width > asid.x &&
            player2.y < asid.y + 15 &&
            player2.y + player2.height > asid.y) {
            player2.health -= asidDamage;
            // Remove ASID upon collision with player 2
            asids = asids.filter(a => a !== asid);
        }
    });

    // Limit player health to maximum of 10
    if (player.health > player.maxHealth) {
        player.health = player.maxHealth;
    }
    if (player2.health > player2.maxHealth) {
        player2.health = player2.maxHealth;
    }

    // Check if players' health is zero
    if (player.health <= 0 && !player.exploding) {
        player.exploding = true;
        player.explosionFrame = 0;
        setTimeout(() => {
            location.reload(); // Refresh the browser 2 seconds after player 1 explodes
        }, 2000); // Wait 2 seconds before refreshing
    }
    if (player2.health <= 0 && !player2.exploding) {
        player2.exploding = true;
        player2.explosionFrame = 0;
        setTimeout(() => {
            location.reload(); // Refresh the browser 2 seconds after player 2 explodes
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
    keys[e.code] = true;
});
document.addEventListener('keyup', function (e) {
    keys[e.code] = false;
});

// Start the game loop
gameLoop();
