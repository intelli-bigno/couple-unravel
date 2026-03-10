import Phaser from 'phaser';
import { syncPlayerPosition, onPlayerPosition, syncPuzzleState, onPuzzleState } from '../firebase.js';

const ROPE_MAX = 200;
const ROPE_PULL_FORCE = 300;

export class StageBase extends Phaser.Scene {
  constructor(key) {
    super(key);
    this.stageKey = key;
  }

  // Override in subclass
  getMapWidth() { return 2400; }
  getMapHeight() { return 600; }

  createBase() {
    const { width, height } = this.scale;
    this.mapW = this.getMapWidth();
    this.mapH = this.getMapHeight();

    this.physics.world.setBounds(0, 0, this.mapW, this.mapH);
    this.cameras.main.setBounds(0, 0, this.mapW, this.mapH);

    // Platforms group
    this.platforms = this.physics.add.staticGroup();

    // Puzzle state
    this.puzzleStates = {};
    this.puzzleListeners = [];

    // Create players
    this.createPlayers();
    this.createRopeGraphics();
    this.createControls();
    this.createMobileControls();
    this.createHUD();

    // Camera follow midpoint
    this.camTarget = this.add.rectangle(0, 0, 1, 1, 0, 0);
    this.cameras.main.startFollow(this.camTarget, true, 0.08, 0.08);

    // Sync
    if (window.gameState.mode !== 'solo') {
      this.setupSync();
    }

    // Colliders added after platforms are built
    this.time.delayedCall(100, () => {
      this.physics.add.collider(this.player1, this.platforms);
      this.physics.add.collider(this.player2, this.platforms);
    });

    this.lastSync = 0;
  }

  createPlayers() {
    // Player bodies (using rectangles for physics, graphics overlay for visuals)
    // Create a tiny texture for physics sprites
    if (!this.textures.exists('pixel')) {
      const canvas = this.textures.createCanvas('pixel', 2, 2);
      const ctx = canvas.getContext();
      ctx.fillStyle = 'rgba(0,0,0,0)';
      ctx.fillRect(0, 0, 2, 2);
      canvas.refresh();
    }

    this.player1 = this.physics.add.sprite(100, 400, 'pixel').setVisible(false);
    this.player1.setSize(24, 32).setOffset(4, 4);
    this.player1.setBounce(0.1);
    this.player1.setCollideWorldBounds(true);
    this.player1.body.setMaxVelocityX(200);

    this.player2 = this.physics.add.sprite(140, 400, 'pixel').setVisible(false);
    this.player2.setSize(24, 32).setOffset(4, 4);
    this.player2.setBounce(0.1);
    this.player2.setCollideWorldBounds(true);
    this.player2.body.setMaxVelocityX(200);

    // Visual graphics for each player
    this.p1Gfx = this.add.graphics();
    this.p2Gfx = this.add.graphics();
  }

  drawPlayer(gfx, x, y, color, isGrounded) {
    gfx.clear();

    // Shadow
    gfx.fillStyle(0x000000, 0.2);
    gfx.fillEllipse(x, y + 18, 24, 6);

    // Body
    gfx.fillStyle(color, 1);
    gfx.fillCircle(x, y, 14);

    // Darker shade
    gfx.fillStyle(Phaser.Display.Color.IntegerToColor(color).darken(20).color, 1);
    gfx.fillCircle(x + 3, y + 3, 12);
    gfx.fillStyle(color, 1);
    gfx.fillCircle(x, y, 12);

    // Eyes
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(x - 5, y - 3, 5);
    gfx.fillCircle(x + 5, y - 3, 5);
    gfx.fillStyle(0x000000, 1);
    gfx.fillCircle(x - 3, y - 3, 2.5);
    gfx.fillCircle(x + 3, y - 3, 2.5);

    // Highlight
    gfx.fillStyle(0xffffff, 0.4);
    gfx.fillCircle(x - 4, y - 6, 3);

    // Cheeks
    gfx.fillStyle(0xffaaaa, 0.3);
    gfx.fillCircle(x - 8, y + 2, 3);
    gfx.fillCircle(x + 8, y + 2, 3);

    // Legs
    const legOffset = isGrounded ? Math.sin(Date.now() / 150) * 2 : 3;
    gfx.fillStyle(color, 1);
    gfx.fillRoundedRect(x - 8, y + 12, 6, 8 + legOffset, 2);
    gfx.fillRoundedRect(x + 2, y + 12, 6, 8 - legOffset, 2);
  }

  createRopeGraphics() {
    this.ropeGfx = this.add.graphics();
  }

  drawRope() {
    this.ropeGfx.clear();
    const x1 = this.player1.x, y1 = this.player1.y;
    const x2 = this.player2.x, y2 = this.player2.y;
    const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    const taut = Math.min(dist / ROPE_MAX, 1);

    // Rope color based on tension
    const r = Math.floor(Phaser.Math.Interpolation.Linear([243, 231], taut));
    const g2 = Math.floor(Phaser.Math.Interpolation.Linear([156, 76], taut));
    const b = Math.floor(Phaser.Math.Interpolation.Linear([18, 60], taut));
    const ropeColor = Phaser.Display.Color.GetColor(r, g2, b);

    this.ropeGfx.lineStyle(3, ropeColor, 0.8);
    this.ropeGfx.beginPath();
    this.ropeGfx.moveTo(x1, y1);
    // Catenary sag
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2 + (1 - taut) * 40 + 10;
    this.ropeGfx.lineTo(midX, midY); this.ropeGfx.lineTo(x2, y2);
    this.ropeGfx.strokePath();

    // Small knots
    this.ropeGfx.fillStyle(ropeColor, 1);
    this.ropeGfx.fillCircle(x1, y1, 3);
    this.ropeGfx.fillCircle(x2, y2, 3);
  }

  enforceRope() {
    const p1 = this.player1, p2 = this.player2;
    const dist = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
    if (dist > ROPE_MAX) {
      const angle = Phaser.Math.Angle.Between(p1.x, p1.y, p2.x, p2.y);
      const controlled = this.getControlledPlayer();
      const other = controlled === p1 ? p2 : p1;

      if (window.gameState.mode === 'solo') {
        // Pull the non-controlled player
        other.setVelocity(
          Math.cos(angle) * (controlled === p1 ? 1 : -1) * ROPE_PULL_FORCE,
          Math.sin(angle) * (controlled === p1 ? 1 : -1) * ROPE_PULL_FORCE
        );
      } else {
        // In multiplayer, restrict movement
        const myPlayer = window.gameState.playerNum === 1 ? p1 : p2;
        const otherPlayer = window.gameState.playerNum === 1 ? p2 : p1;
        const pullAngle = Phaser.Math.Angle.Between(myPlayer.x, myPlayer.y, otherPlayer.x, otherPlayer.y);
        myPlayer.x += Math.cos(pullAngle) * 2;
        myPlayer.y += Math.sin(pullAngle) * 2;
      }
    }
  }

  createControls() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = {
      left: this.input.keyboard.addKey('A'),
      right: this.input.keyboard.addKey('D'),
      up: this.input.keyboard.addKey('W'),
      jump: this.input.keyboard.addKey('SPACE')
    };
  }

  getControlledPlayer() {
    if (window.gameState.mode === 'solo') {
      return window.gameState.controllingPlayer === 1 ? this.player1 : this.player2;
    }
    return window.gameState.playerNum === 1 ? this.player1 : this.player2;
  }

  createMobileControls() {
    const { width, height } = this.scale;

    // Create UI camera that doesn't scroll
    this.uiCam = this.cameras.add(0, 0, width, height);
    this.uiCam.setScroll(0, 0);
    
    // Left button
    this.mobileLeft = false;
    this.mobileRight = false;
    this.mobileJump = false;

    const btnAlpha = 0.35;
    const btnSize = 50;

    // Left arrow
    const leftBtn = this.add.circle(60, height - 60, btnSize, 0xffffff, btnAlpha)
      .setScrollFactor(0).setDepth(1000).setInteractive();
    this.add.text(60, height - 60, '◀', { fontSize: '24px' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(1001);
    leftBtn.on('pointerdown', () => this.mobileLeft = true);
    leftBtn.on('pointerup', () => this.mobileLeft = false);
    leftBtn.on('pointerout', () => this.mobileLeft = false);

    // Right arrow
    const rightBtn = this.add.circle(170, height - 60, btnSize, 0xffffff, btnAlpha)
      .setScrollFactor(0).setDepth(1000).setInteractive();
    this.add.text(170, height - 60, '▶', { fontSize: '24px' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(1001);
    rightBtn.on('pointerdown', () => this.mobileRight = true);
    rightBtn.on('pointerup', () => this.mobileRight = false);
    rightBtn.on('pointerout', () => this.mobileRight = false);

    // Jump button
    const jumpBtn = this.add.circle(width - 70, height - 60, btnSize + 5, 0xffdd57, btnAlpha)
      .setScrollFactor(0).setDepth(1000).setInteractive();
    this.add.text(width - 70, height - 60, '⬆', { fontSize: '28px' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(1001);
    jumpBtn.on('pointerdown', () => this.mobileJump = true);
    jumpBtn.on('pointerup', () => this.mobileJump = false);
    jumpBtn.on('pointerout', () => this.mobileJump = false);

    // Ignore UI elements from main camera scroll
    this.cameras.main.ignore([leftBtn, rightBtn, jumpBtn]);
  }

  createHUD() {
    const { width } = this.scale;

    // Solo mode toggle
    if (window.gameState.mode === 'solo') {
      this.toggleBtn = this.add.text(width / 2, 20, '🔴 P1 조작 중', {
        fontSize: '16px', fontFamily: 'Arial', color: '#fff',
        backgroundColor: '#e74c3c88', padding: { x: 12, y: 6 }
      }).setOrigin(0.5).setScrollFactor(0).setDepth(1000).setInteractive({ useHandCursor: true });

      this.toggleBtn.on('pointerdown', () => {
        window.gameState.controllingPlayer = window.gameState.controllingPlayer === 1 ? 2 : 1;
        const p = window.gameState.controllingPlayer;
        this.toggleBtn.setText(p === 1 ? '🔴 P1 조작 중' : '🔵 P2 조작 중');
        this.toggleBtn.setStyle({
          backgroundColor: p === 1 ? '#e74c3c88' : '#3498db88'
        });
      });
    }

    // Back button
    this.add.text(15, 15, '← 맵', {
      fontSize: '14px', fontFamily: 'Arial', color: '#fff',
      backgroundColor: '#00000066', padding: { x: 8, y: 4 }
    }).setScrollFactor(0).setDepth(1000).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('MapScene'));
  }

  setupSync() {
    const code = window.gameState.roomCode;
    const myNum = window.gameState.playerNum;
    const otherNum = myNum === 1 ? 2 : 1;

    onPlayerPosition(code, otherNum, (data) => {
      const other = otherNum === 1 ? this.player1 : this.player2;
      if (other && other.body) {
        other.setPosition(data.x, data.y);
      }
    });

    onPuzzleState(code, (data) => {
      this.puzzleStates = data || {};
      this.onPuzzleSync(data);
    });
  }

  onPuzzleSync(data) {
    // Override in subclass
  }

  handleMovement() {
    const player = this.getControlledPlayer();
    if (!player || !player.body) return;

    const left = this.cursors.left.isDown || this.wasd.left.isDown || this.mobileLeft;
    const right = this.cursors.right.isDown || this.wasd.right.isDown || this.mobileRight;
    const jump = Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
                 Phaser.Input.Keyboard.JustDown(this.wasd.jump) ||
                 Phaser.Input.Keyboard.JustDown(this.wasd.up) ||
                 this.mobileJump;

    if (left) {
      player.setVelocityX(-180);
    } else if (right) {
      player.setVelocityX(180);
    } else {
      player.setVelocityX(player.body.velocity.x * 0.85);
    }

    if (jump && player.body.touching.down) {
      player.setVelocityY(-420);
      this.spawnJumpDust(player.x, player.y + 16);
    }

    // Reset mobile jump
    if (this.mobileJump && player.body.touching.down) {
      player.setVelocityY(-420);
      this.spawnJumpDust(player.x, player.y + 16);
      this.mobileJump = false;
    }
  }

  spawnJumpDust(x, y) {
    for (let i = 0; i < 5; i++) {
      const dust = this.add.circle(
        x + Phaser.Math.Between(-10, 10),
        y,
        Phaser.Math.Between(2, 4),
        0xcccccc, 0.6
      );
      this.tweens.add({
        targets: dust,
        y: y + Phaser.Math.Between(5, 15),
        x: dust.x + Phaser.Math.Between(-15, 15),
        alpha: 0,
        scale: 0,
        duration: 400,
        onComplete: () => dust.destroy()
      });
    }
  }

  syncPosition() {
    if (window.gameState.mode === 'solo') return;
    const now = Date.now();
    if (now - this.lastSync < 100) return;
    this.lastSync = now;
    const p = this.getControlledPlayer();
    syncPlayerPosition(
      window.gameState.roomCode,
      window.gameState.playerNum,
      p.x, p.y, p.body.velocity.x, p.body.velocity.y
    );
  }

  updateBase() {
    this.handleMovement();
    this.enforceRope();
    this.drawRope();

    // Draw player visuals
    this.drawPlayer(this.p1Gfx, this.player1.x, this.player1.y, 0xe74c3c, this.player1.body.touching.down);
    this.drawPlayer(this.p2Gfx, this.player2.x, this.player2.y, 0x3498db, this.player2.body.touching.down);

    // Camera midpoint
    this.camTarget.x = (this.player1.x + this.player2.x) / 2;
    this.camTarget.y = (this.player1.y + this.player2.y) / 2;

    this.syncPosition();
  }

  createPlatform(x, y, w, h, color = 0x8B4513) {
    const g = this.add.graphics();
    // Shadow
    g.fillStyle(0x000000, 0.2);
    g.fillRoundedRect(x + 2, y + 2, w, h, 6);
    // Main
    g.fillStyle(color, 1);
    g.fillRoundedRect(x, y, w, h, 6);
    // Top highlight
    const lighter = Phaser.Display.Color.IntegerToColor(color).lighten(20).color;
    g.fillStyle(lighter, 1);
    g.fillRoundedRect(x, y, w, h / 3, { tl: 6, tr: 6, bl: 0, br: 0 });

    // Grass on top for green platforms
    if (color === 0x4a7c59 || color === 0x2ecc71) {
      g.fillStyle(0x27ae60, 1);
      for (let i = 0; i < w; i += 8) {
        g.fillTriangle(x + i, y, x + i + 4, y - 5, x + i + 8, y);
      }
    }

    const plat = this.platforms.create(x + w / 2, y + h / 2, '__DEFAULT').setVisible(false);
    plat.body.setSize(w, h);
    plat.setDisplaySize(w, h);
    plat.refreshBody();
    return plat;
  }

  createSwitch(x, y, id, callback) {
    const g = this.add.graphics();
    const drawSwitch = (pressed) => {
      g.clear();
      g.fillStyle(pressed ? 0x2ecc71 : 0xe74c3c, 1);
      g.fillRoundedRect(x - 15, pressed ? y - 3 : y - 8, 30, pressed ? 6 : 12, 3);
      g.fillStyle(0x888888, 1);
      g.fillRect(x - 3, y + 4, 6, 10);
    };
    drawSwitch(false);

    const zone = this.add.zone(x, y, 40, 40);
    this.physics.world.enable(zone, Phaser.Physics.Arcade.STATIC_BODY);

    const check = () => {
      const p1On = Phaser.Geom.Intersects.RectangleToRectangle(
        this.player1.getBounds(), zone.getBounds()
      );
      const p2On = Phaser.Geom.Intersects.RectangleToRectangle(
        this.player2.getBounds(), zone.getBounds()
      );
      const pressed = p1On || p2On;
      if (pressed !== this.puzzleStates[id]) {
        this.puzzleStates[id] = pressed;
        drawSwitch(pressed);
        if (window.gameState.mode !== 'solo') {
          syncPuzzleState(window.gameState.roomCode, id, pressed);
        }
        if (callback) callback(pressed);
      }
    };

    this.time.addEvent({ delay: 100, callback: check, loop: true });
    return { graphics: g, zone };
  }

  createGoal(x, y, callback) {
    const g = this.add.graphics();
    const drawStar = () => {
      g.clear();
      g.fillStyle(0xf1c40f, 1);
      // Star shape
      const points = [];
      for (let i = 0; i < 10; i++) {
        const angle = (i * Math.PI * 2) / 10 - Math.PI / 2;
        const r = i % 2 === 0 ? 20 : 10;
        points.push(x + Math.cos(angle) * r);
        points.push(y + Math.sin(angle) * r);
      }
      g.fillPoints(points, true);

      // Glow
      g.fillStyle(0xf1c40f, 0.2);
      g.fillCircle(x, y, 30);
    };
    drawStar();

    this.tweens.add({
      targets: g, scaleX: 1.1, scaleY: 1.1, duration: 800, yoyo: true, repeat: -1
    });

    const zone = this.add.zone(x, y, 40, 40);
    this.physics.world.enable(zone, Phaser.Physics.Arcade.STATIC_BODY);

    const check = () => {
      const p1On = Phaser.Geom.Intersects.RectangleToRectangle(
        this.player1.getBounds(), zone.getBounds()
      );
      const p2On = Phaser.Geom.Intersects.RectangleToRectangle(
        this.player2.getBounds(), zone.getBounds()
      );
      if (p1On && p2On) {
        this.spawnClearEffect(x, y);
        callback();
      }
    };

    this.time.addEvent({ delay: 200, callback: check, loop: true });
  }

  spawnClearEffect(x, y) {
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const star = this.add.star(x, y, 5, 3, 6, 0xf1c40f);
      this.tweens.add({
        targets: star,
        x: x + Math.cos(angle) * 100,
        y: y + Math.sin(angle) * 100,
        alpha: 0, scale: 0,
        duration: 800,
        onComplete: () => star.destroy()
      });
    }
  }

  createSpikes(x, y, count) {
    const g = this.add.graphics();
    g.fillStyle(0xc0392b, 1);
    for (let i = 0; i < count; i++) {
      const sx = x + i * 20;
      g.fillTriangle(sx, y + 15, sx + 10, y, sx + 20, y + 15);
    }

    const zone = this.add.zone(x + (count * 10), y + 7, count * 20, 15);
    this.physics.world.enable(zone, Phaser.Physics.Arcade.STATIC_BODY);

    const check = () => {
      [this.player1, this.player2].forEach(p => {
        if (Phaser.Geom.Intersects.RectangleToRectangle(p.getBounds(), zone.getBounds())) {
          this.respawnPlayer(p);
        }
      });
    };
    this.time.addEvent({ delay: 100, callback: check, loop: true });
  }

  respawnPlayer(player) {
    if (player._respawning) return;
    player._respawning = true;
    
    // Flash effect
    this.tweens.add({
      targets: player, alpha: 0, duration: 200, yoyo: true, repeat: 2,
      onComplete: () => {
        player.setPosition(player._checkpointX || 100, player._checkpointY || 400);
        player.setVelocity(0, 0);
        player._respawning = false;
      }
    });
  }

  setCheckpoint(player, x, y) {
    player._checkpointX = x;
    player._checkpointY = y;
  }
}
