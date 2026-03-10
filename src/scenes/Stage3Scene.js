import { StageBase } from './StageBase.js';
import Phaser from 'phaser';

export class Stage3Scene extends StageBase {
  constructor() {
    super('Stage3Scene');
  }

  getMapWidth() { return 3500; }
  getMapHeight() { return 800; }

  create() {
    this.createBase();
    this.drawCaveBackground();
    this.buildLevel();
    this.createDarkness();

    this.player1.setPosition(100, 650);
    this.player2.setPosition(140, 650);
    this.setCheckpoint(this.player1, 100, 650);
    this.setCheckpoint(this.player2, 140, 650);
  }

  drawCaveBackground() {
    const bg = this.add.graphics();
    const h = this.mapH;
    const w = this.mapW;

    // Dark cave gradient
    for (let i = 0; i < h; i++) {
      const t = i / h;
      const r = Math.floor(Phaser.Math.Interpolation.Linear([20, 10], t));
      const g = Math.floor(Phaser.Math.Interpolation.Linear([20, 15], t));
      const b = Math.floor(Phaser.Math.Interpolation.Linear([40, 30], t));
      bg.fillStyle(Phaser.Display.Color.GetColor(r, g, b));
      bg.fillRect(0, i, w, 1);
    }

    // Glowing crystals in background
    const crystalColors = [0x9b59b6, 0x3498db, 0x1abc9c, 0xe91e63];
    for (let i = 0; i < 25; i++) {
      const cx = Phaser.Math.Between(0, w);
      const cy = Phaser.Math.Between(50, h - 100);
      const cc = crystalColors[Phaser.Math.Between(0, crystalColors.length - 1)];
      const cs = Phaser.Math.FloatBetween(0.5, 1.5);

      const crystal = this.add.graphics();
      crystal.fillStyle(cc, 0.4);
      crystal.fillTriangle(cx, cy - 15 * cs, cx - 6 * cs, cy + 5 * cs, cx + 6 * cs, cy + 5 * cs);
      crystal.fillStyle(cc, 0.2);
      crystal.fillCircle(cx, cy, 12 * cs);

      this.tweens.add({
        targets: crystal, alpha: 0.3, duration: Phaser.Math.Between(1000, 3000),
        yoyo: true, repeat: -1
      });
    }

    // Fireflies
    for (let i = 0; i < 40; i++) {
      const fx = Phaser.Math.Between(0, w);
      const fy = Phaser.Math.Between(50, h - 100);
      const firefly = this.add.circle(fx, fy, 2, 0xf1c40f, 0.6);

      this.tweens.add({
        targets: firefly,
        x: fx + Phaser.Math.Between(-50, 50),
        y: fy + Phaser.Math.Between(-30, 30),
        alpha: { from: 0.2, to: 0.8 },
        duration: Phaser.Math.Between(2000, 5000),
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });
    }

    // Stalactites
    for (let i = 0; i < 30; i++) {
      const sx = Phaser.Math.Between(0, w);
      bg.fillStyle(0x444455, 0.6);
      const sh = Phaser.Math.Between(20, 60);
      bg.fillTriangle(sx - 8, 0, sx, sh, sx + 8, 0);
    }
  }

  createDarkness() {
    // Darkness overlay - lighter near crystals and players
    this.darknessGfx = this.add.graphics().setDepth(500);

    // Light sources (crystals that illuminate)
    this.lightSources = [
      { x: 400, y: 600, radius: 120 },
      { x: 800, y: 500, radius: 100 },
      { x: 1200, y: 550, radius: 130 },
      { x: 1600, y: 450, radius: 110 },
      { x: 2000, y: 550, radius: 120 },
      { x: 2400, y: 400, radius: 100 },
      { x: 2800, y: 500, radius: 130 },
      { x: 3200, y: 550, radius: 150 },
    ];

    // Draw crystal decorations at light sources
    this.lightSources.forEach(ls => {
      const g = this.add.graphics();
      g.fillStyle(0x9b59b6, 0.7);
      g.fillTriangle(ls.x, ls.y - 25, ls.x - 10, ls.y + 5, ls.x + 10, ls.y + 5);
      g.fillStyle(0x9b59b6, 0.3);
      g.fillCircle(ls.x, ls.y, 20);

      this.tweens.add({
        targets: g, alpha: 0.5, duration: 1500, yoyo: true, repeat: -1
      });
    });
  }

  updateDarkness() {
    // Simple darkness: just dim overlay, skip heavy per-pixel for performance
    // Players emit light (indicated by glow circles)
    if (!this.p1Light) {
      this.p1Light = this.add.graphics().setDepth(499);
      this.p2Light = this.add.graphics().setDepth(499);
    }
    
    this.p1Light.clear();
    this.p1Light.fillStyle(0xf1c40f, 0.08);
    this.p1Light.fillCircle(this.player1.x, this.player1.y, 80);
    
    this.p2Light.clear();
    this.p2Light.fillStyle(0x3498db, 0.08);
    this.p2Light.fillCircle(this.player2.x, this.player2.y, 80);
  }

  buildLevel() {
    // Ground
    this.createPlatform(0, 700, 500, 100, 0x2c2c3e);
    this.createPlatform(600, 700, 400, 100, 0x2c2c3e);
    this.createPlatform(1100, 700, 300, 100, 0x2c2c3e);
    this.createPlatform(1500, 700, 400, 100, 0x2c2c3e);
    this.createPlatform(2100, 700, 400, 100, 0x2c2c3e);
    this.createPlatform(2700, 700, 300, 100, 0x2c2c3e);
    this.createPlatform(3100, 700, 400, 100, 0x2c2c3e);

    // Platforms
    this.createPlatform(300, 600, 100, 20, 0x444466);
    this.createPlatform(500, 530, 100, 20, 0x444466);
    this.createPlatform(700, 600, 120, 20, 0x444466);

    // Crystal puzzle 1: Stand near crystal to open path
    const door1 = this.createPlatform(1000, 500, 20, 200, 0x555577);
    this.door1Gfx = this.add.graphics();
    this.door1Gfx.fillStyle(0x555577, 1);
    this.door1Gfx.fillRoundedRect(1000, 500, 20, 200, 4);

    this.createCrystalSwitch(800, 520, 'crystal1', (active) => {
      door1.body.enable = !active;
      this.door1Gfx.clear();
      if (!active) {
        this.door1Gfx.fillStyle(0x555577, 1);
        this.door1Gfx.fillRoundedRect(1000, 500, 20, 200, 4);
      }
    });

    // More platforms after door
    this.createPlatform(1100, 600, 120, 20, 0x444466);
    this.createPlatform(1300, 530, 100, 20, 0x444466);
    this.createPlatform(1500, 600, 100, 20, 0x444466);

    // Crystal puzzle 2: BOTH players on different crystals
    const door2 = this.createPlatform(1900, 400, 20, 300, 0x555577);
    this.door2Gfx = this.add.graphics();
    this.door2Gfx.fillStyle(0x555577, 1);
    this.door2Gfx.fillRoundedRect(1900, 400, 20, 300, 4);

    this.puzzleStates['crystal2a'] = false;
    this.puzzleStates['crystal2b'] = false;

    const checkDoor2 = () => {
      const open = this.puzzleStates['crystal2a'] && this.puzzleStates['crystal2b'];
      door2.body.enable = !open;
      this.door2Gfx.clear();
      if (!open) {
        this.door2Gfx.fillStyle(0x555577, 1);
        this.door2Gfx.fillRoundedRect(1900, 400, 20, 300, 4);
      }
    };

    this.createCrystalSwitch(1650, 500, 'crystal2a', () => checkDoor2());
    this.createCrystalSwitch(1800, 680, 'crystal2b', () => checkDoor2());

    // Hint text
    this.add.text(1700, 450, '둘 다 수정 위에 서세요!', {
      fontSize: '12px', fontFamily: 'Arial', color: '#9b59b6',
      backgroundColor: '#00000088', padding: { x: 6, y: 3 }
    });

    // After door 2
    this.createPlatform(2000, 600, 150, 20, 0x444466);
    this.createPlatform(2200, 530, 120, 20, 0x444466);
    this.createPlatform(2400, 450, 100, 20, 0x444466);
    this.createPlatform(2600, 530, 120, 20, 0x444466);
    this.createPlatform(2800, 600, 100, 20, 0x444466);

    // Crystal puzzle 3
    const door3 = this.createPlatform(3000, 400, 20, 300, 0x555577);
    this.door3Gfx = this.add.graphics();
    this.door3Gfx.fillStyle(0x555577, 1);
    this.door3Gfx.fillRoundedRect(3000, 400, 20, 300, 4);

    this.createCrystalSwitch(2900, 590, 'crystal3', (active) => {
      door3.body.enable = !active;
      this.door3Gfx.clear();
      if (!active) {
        this.door3Gfx.fillStyle(0x555577, 1);
        this.door3Gfx.fillRoundedRect(3000, 400, 20, 300, 4);
      }
    });

    // Final heart goal
    this.createHeart(3300, 650, () => {
      if (!window.gameState.clearedStages.includes(3)) {
        window.gameState.clearedStages.push(3);
      }
      this.scene.start('VictoryScene');
    });
  }

  createCrystalSwitch(x, y, id, callback) {
    // Visual crystal
    const g = this.add.graphics();
    const drawCrystal = (active) => {
      g.clear();
      const color = active ? 0x2ecc71 : 0x9b59b6;
      g.fillStyle(color, 0.8);
      g.fillTriangle(x, y - 20, x - 12, y + 8, x + 12, y + 8);
      g.fillStyle(color, 0.3);
      g.fillCircle(x, y, active ? 25 : 18);
      g.lineStyle(2, color, 0.6);
      g.strokeCircle(x, y, active ? 30 : 22);
    };
    drawCrystal(false);

    const zone = this.add.zone(x, y, 50, 50);
    this.physics.world.enable(zone, Phaser.Physics.Arcade.STATIC_BODY);

    const check = () => {
      const p1On = Phaser.Geom.Intersects.RectangleToRectangle(
        this.player1.getBounds(), zone.getBounds()
      );
      const p2On = Phaser.Geom.Intersects.RectangleToRectangle(
        this.player2.getBounds(), zone.getBounds()
      );
      const active = p1On || p2On;
      if (active !== this.puzzleStates[id]) {
        this.puzzleStates[id] = active;
        drawCrystal(active);
        if (callback) callback(active);
      }
    };

    this.time.addEvent({ delay: 100, callback: check, loop: true });
  }

  createHeart(x, y, callback) {
    const g = this.add.graphics();
    const drawHeart = () => {
      g.clear();
      g.fillStyle(0xe74c3c, 1);
      // Heart shape using circles and triangle
      g.fillCircle(x - 10, y - 8, 12);
      g.fillCircle(x + 10, y - 8, 12);
      g.fillTriangle(x - 22, y - 2, x + 22, y - 2, x, y + 20);

      // Glow
      g.fillStyle(0xe74c3c, 0.2);
      g.fillCircle(x, y, 35);
    };
    drawHeart();

    this.tweens.add({
      targets: g, scaleX: 1.15, scaleY: 1.15, duration: 600, yoyo: true, repeat: -1
    });

    // Sparkle particles around heart
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const sparkle = this.add.circle(
        x + Math.cos(angle) * 30, y + Math.sin(angle) * 30,
        2, 0xf1c40f, 0.6
      );
      this.tweens.add({
        targets: sparkle, alpha: 0, scale: 0,
        duration: 1000, delay: i * 125, repeat: -1,
        onRepeat: () => {
          sparkle.setPosition(
            x + Math.cos(angle) * 30, y + Math.sin(angle) * 30
          );
          sparkle.setAlpha(0.6).setScale(1);
        }
      });
    }

    const zone = this.add.zone(x, y, 50, 50);
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

  update() {
    this.updateBase();
    this.updateDarkness();
  }
}
