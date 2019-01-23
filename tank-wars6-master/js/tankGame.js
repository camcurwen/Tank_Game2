// config
var config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
            gravity: {
                y: 0
            } // Top down game, so no gravity
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};
var game = new Phaser.Game(config);
//New bit
var player, enemyTanks = [], maxEnemies = 2, bullets, enemyBullets, bossEnemyTanks = [], maxBossEnemies = 2, bossEnemyBullets;
function preload() {

    this.load.atlas('tank', 'assets/tanks/tanks.png', 'assets/tanks/tanks.json');
    //New bit
    this.load.atlas('enemy', 'assets/tanks/enemy-tanks.png', 'assets/tanks/tanks.json');
    this.load.atlas('bossEnemy', 'assets/tanks/bosstank2.fw.png', 'assets/tanks/bosstank2.fw.json');

    this.load.image('earth', 'assets/tanks/scorched_earth.png');

    this.load.spritesheet('explosion', 'assets/tanks/explosion.png', { frameWidth: 64, frameHeight: 64 });
    this.load.image('bullet', 'assets/tanks/bullet.png');
    this.load.image('tileset', 'assets/tanks/landscape-tileset.png');
    this.load.tilemapTiledJSON("tilemap", "assets/tanks/level1.json");
}

function create() {
    this.cameras.main.setBounds(0, 0, 800, 600);
    this.physics.world.setBounds(0, 0, 800, 600);
    this.physics.world.on('worldbounds', function (body) {
        killBullet(body.gameObject)
    }, this);

    //Load in the tilemap and enable collision for the destructable layer
    this.map = this.make.tilemap({ key: "tilemap" });
    var landscape = this.map.addTilesetImage("landscape-tileset", "tileset");
    this.map.createStaticLayer('floor', landscape, 0, 0);
    var destructLayer = this.map.createDynamicLayer('destructable', landscape, 0, 0);
    destructLayer.setCollisionByProperty({ collides: true });

    var w = game.config.width;
    var h = game.config.height;
    //New bit
    player = new PlayerTank(this, w * 0.5, h * 0.5, 'tank', 'tank1', 'tank2');
    player.enableCollision(destructLayer);
    var outerFrame = new Phaser.Geom.Rectangle(0, 0, w, h);
    var innerFrame = new Phaser.Geom.Rectangle(w * 0.25, h * 0.25, w * 0.5, h * 0.5);
    enemyBullets = this.physics.add.group({
        defaultKey: 'bullet',
        maxSize: 10
    })
    var enemyTank, loc;
    for (var i = 0; i < maxEnemies; i++) {
        loc = Phaser.Geom.Rectangle.RandomOutside(outerFrame, innerFrame)
        enemyTank = new EnemyTank(this, loc.x, loc.y, 'enemy', 'tank1', player);
        enemyTank.enableCollision(destructLayer);
        enemyTank.setBullets(enemyBullets);
        enemyTanks.push(enemyTank);
        this.physics.add.collider(enemyTank.hull, player.hull);
        if (i > 0) {
            for (var j = 0; j < enemyTanks.length - 1; j++) {
                this.physics.add.collider(enemyTank.hull, enemyTanks[j].hull);
            }
        }
    }       //New bit
    bossEnemyBullets = this.physics.add.group({
        defaultKey: 'bullet',
        maxSize: 10
    })
    var bossEnemyTank, loc;
    for (var i = 0; i < maxBossEnemies; i++) {
        loc = Phaser.Geom.Rectangle.RandomOutside(outerFrame, innerFrame)
        bossEnemyTank = new BossEnemyTank(this, loc.x, loc.y, 'bossEnemy', 'tank2', player);
        bossEnemyTank.enableCollision(destructLayer);
        bossEnemyTank.setBullets(bossEnemyBullets);
        bossEnemyTanks.push(bossEnemyTank);
        this.physics.add.collider(bossEnemyTank.hull, player.hull);
        if (i > 0) {
            for (var j = 0; j < bossEnemyTanks.length - 1; j++) {
                this.physics.add.collider(bossEnemyTank.hull, bossEnemyTanks[j].hull);
            }
        }
    }
    bullets = this.physics.add.group({
        defaultKey: 'bullet',
        maxSize: 1
    })
    explosions = this.physics.add.group({
        defaultkey: 'explosion',
        //New bit
        maxsize: maxEnemies + maxBossEnemies
    })
    this.anims.create({
        key: 'explode',
        frames: this.anims.generateFrameNumbers('explosion', { start: 0, end: 23, first: 23 }),
        frameRate: 24

    })

    this.input.on('pointerdown', tryShoot, this);
    this.cameras.main.startFollow(player.hull, true, 0.5, 0.5);
}
function update(time, delta) {
    player.update();
    //New bit
    for (var i = 0; i < enemyTanks.length; i++) {
        enemyTanks[i].update(time, delta);
    }

    for (var i = 0; i < bossEnemyTanks.length; i++) {
        bossEnemyTanks[i].update(time, delta);
    }
}
function tryShoot(pointer) {
    var bullet = bullets.get(player.turret.x, player.turret.y);
    if (bullet) {
        fireBullet.call(this, bullet, player.turret.rotation, null);
    }   //New bit
    
}
function fireBullet(bullet, rotation, target) {
    bullet.setDepth(3);
    bullet.body.collideWorldBounds = true;
    bullet.body.onWorldBounds = true;
    bullet.enableBody(false);
    bullet.setActive(true);
    bullet.setVisible(true);
    bullet.rotation = rotation;
    this.physics.velocityFromRotation(bullet.rotation, 500, bullet.body.velocity);

    var destructLayer = this.map.getLayer("destructable").tilemapLayer;
    this.physics.add.collider(bullet, destructLayer, damageWall, null, this);

    if (target === player) {
        this.physics.add.overlap(player.hull, bullet, bulletHitPlayer, null, this)
    } else {
        for (var i = 0; i < enemyTanks.length; i++) {
            this.physics.add.overlap(enemyTanks[i].hull, bullet, bulletHitEnemy, null, this);
        } 
        for (var i = 0; i < bossEnemyTanks.length; i++) {
            this.physics.add.overlap(bossEnemyTanks[i].hull, bullet, bulletHitBossEnemy, null, this);
        } 
    }//New bit
    
}
function bulletHitPlayer(hull, bullet) {
    killBullet(bullet);
    player.damage();
    if (player.isDestroyed()) {
        this.input.enabled = false;
        //New bit
        enemyTanks = [];
        BossEnemyTank = [];
        this.physics.pause();
        var explosion = explosions.get(hull.x, hull.y);
        if (explosion) {
            activateExplosion(explosion);
            explosion.play('explode');
        }
    }
}
function killBullet(bullet) {
    bullet.disableBody(true, true);
    bullet.setActive(false);
    bullet.setVisible(false);

}

function activateExplosion(explosion) {
    explosion.setDepth(5);
    explosion.setActive(true);
    explosion.setVisible(true);
}

function bulletHitEnemy(hull, bullet) {
    var enemy;
    var index;
    for (var i = 0; i < enemyTanks.length; i++) {
        if (enemyTanks[i].hull === hull) {
            enemy = enemyTanks[i];
            index = i;
            break;
        }
    }
   // console.log('enemy='+enemy )
    killBullet(bullet);
     enemy.damage(); 
    var explosion = explosions.get(hull.x, hull.y);
     if (explosion) {
       activateExplosion(explosion);
       explosion.on('animationcomplete', animComplete, this);
       explosion.play('explode');
      }


    if (enemy.isDestroyed()) {
        // remove from enemyTanks list
        enemyTanks.splice(index, 1);
    }   //New bit

}
function bulletHitBossEnemy(hull, bullet) {
    var bossEnemy;
    var index;
    for (var i = 0; i < bossEnemyTanks.length; i++) {
        if (bossEnemyTanks[i].hull === hull) {
            bossEnemy = bossEnemyTanks[i];
            index = i;
            break;
        }
    }
    killBullet(bullet);
    bossEnemy.damage();
    if (bossEnemy.isDestroyed()) {
        // remove from enemyTanks list
        bossEnemyTanks.splice(index, 1);
    }
}

//TODO
function animComplete(animation, frame, gameObject) {
    gameObject.disableBody(true, true);
}



function damageWall(bullet, tile) {
    killBullet(bullet);
    var destructLayer = this.map.getLayer("destructable").tilemapLayer;

    var index = tile.index + 1;
    var tileProperties = destructLayer.tileset[0].tileProperties[index - 1];
    var checkColl = false;

    if (tileProperties) {
        if (tileProperties.collides) {
            checkColl = true;
        }
    }

    const newTile = destructLayer.putTileAt(index, tile.x, tile.y);
    if (checkColl) {
        newTile.setCollision(true);
    }
}
