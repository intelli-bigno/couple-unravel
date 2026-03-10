import { StageBase } from './StageBase.js';
import Phaser from 'phaser';

export class Stage1Scene extends StageBase {
  constructor() {
    super('Stage1Scene');
  }

  getMapWidth() { return 3000; }
  getMapHeight() { return 700; }

  create() {
    this.createBase();
    this.drawForestBackground();
    this.buildLevel();

    // Tutorial text
    const tut = this.add.text(150, 350, '← → 이동  |  ↑ 점프!', {
      fontSize: '16px', fontFamily: 'Arial', color: '#fff',
      backgroundColor: '#00000088', padding: { x: 10, y: 6 }
    });
    this.tweens.add({ targets: tut, alpha: 0, delay: 5000, duration: 1000 });

    // Set spawn
    this.player1.setPosition(100, 550);
    this.player2.setPosition(140, 550);
    this.setCheckpoint(this.player1, 100, 550);
    this.setCheckpoint(this.player2, 140, 550);
  }

  drawForestBackground() {
    const bg = this.add.graphics();
    const h = this.mapH;
    const w = this.mapW;

    // Sky gradient
    for (let i = 0; i < h; i++) {
      const t = i / h;
      const r = Math.floor(Phaser.Math.Interpolation.Linear([135, 76], t));
      const g = Math.floor(Phaser.Math.Interpolation.Linear([206, 175], t));
      const b = Math.floor(Phaser.Math.Interpolation.Linear([250, 80], t));
      bg.fillStyle(Phaser.Display.Color.GetColor(r, g, b));
      bg.fillRect(0, i, w, 1);
    }

    // Distant mountains
    bg.fillStyle(0x5d8a68, 0.4);
    for (let x = 0; x < w; x += 200) {
      bg.fillTriangle(x, 400, x + 100, 200, x + 200, 400);
    }

    // Trees in background
    for (let i = 0; i < 30; i++) {
      const tx = Phaser.Math.Between(0, w);
      const ty = Phaser.Math.Between(350, 500);
      const s = Phaser.Math.FloatBetween(0.5, 1.2);
      this.drawTree(bg, tx, ty, s);
    }

    // Clouds
    for (let i = 0; i < 8; i++) {
      const cloud = this.add.graphics();
      const cx = Phaser.Math.Between(0, w);
      const cy = Phaser.Math.Between(30, 150);
      cloud.fillStyle(0xffffff, 0.5);
      cloud.fillCircle(cx, cy, 25);
      cloud.fillCircle(cx + 20, cy - 8, 18);
      cloud.fillCircle(cx - 15, cy + 3, 15);
      cloud.fillCircle(cx + 8, cy + 5, 20);
      this.tweens.add({
        targets: cloud, x: 60, duration: Phaser.Math.Between(10000, 20000),
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });
    }

    // Flowers
    for (let i = 0; i < 40; i++) {
      const fx = Phaser.Math.Between(0, w);
      const fy = Phaser.Math.Between(600, 650);
      const colors = [0xff6b9d, 0xf1c40f, 0xe74c3c, 0x9b59b6, 0xff9ff3];
      const fc = colors[Phaser.Math.Between(0, colors.length - 1)];
      const flower = this.add.graphics();
      flower.fillStyle(fc, 0.8);
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        flower.fillCircle(fx + Math.cos(a) * 4, fy + Math.sin(a) * 4, 3);
      }
      flower.fillStyle(0xf1c40f, 1);
      flower.fillCircle(fx, fy, 2);
    }
  }

  drawTree(g, x, y, scale) {
    // Trunk
    g.fillStyle(0x6b4423, 1);
    g.fillRect(x - 4 * scale, y - 20 * scale, 8 * scale, 30 * scale);
    // Leaves
    g.fillStyle(0x27ae60, 0.8);
    g.fillCircle(x, y - 30 * scale, 20 * scale);
    g.fillCircle(x - 12 * scale, y - 20 * scale, 15 * scale);
    g.fillCircle(x + 12 * scale, y - 20 * scale, 15 * scale);
    g.fillStyle(0x2ecc71, 0.6);
    g.fillCircle(x + 5 * scale, y - 35 * scale, 12 * scale);
  }

  buildLevel() {
    // Ground
    this.createPlatform(0, 620, 800, 80, 0x4a7c59);
    this.createPlatform(900, 620, 500, 80, 0x4a7c59);
    this.createPlatform(1600, 620, 400, 80, 0x4a7c59);
    this.createPlatform(2200, 620, 800, 80, 0x4a7c59);

    // Step platforms
    this.createPlatform(300, 520, 120, 20, 0x8B6914);
    this.createPlatform(500, 450, 120, 20, 0x8B6914);
    this.createPlatform(700, 380, 150, 20, 0x8B6914);

    // Puzzle 1: Switch opens bridge over gap
    const bridge1 = this.createPlatform(800, 550, 100, 15, 0x8B6914);
    bridge1.setVisible(false);
    bridge1.body.enable = false;
    this.bridge1Gfx = this.add.graphics();

    this.createSwitch(750, 370, 'switch1', (pressed) => {
      bridge1.body.enable = pressed;
      this.bridge1Gfx.clear();
      if (pressed) {
        this.bridge1Gfx.fillStyle(0x8B6914, 1);
        this.bridge1Gfx.fillRoundedRect(800, 550, 100, 15, 4);
        this.bridge1Gfx.fillStyle(0xA0792C, 1);
        this.bridge1Gfx.fillRoundedRect(800, 550, 100, 5, { tl: 4, tr: 4, bl: 0, br: 0 });
      }
    });

    // After bridge - more platforms
    this.createPlatform(1000, 500, 100, 20, 0x8B6914);
    this.createPlatform(1150, 430, 100, 20, 0x8B6914);
    this.createPlatform(1350, 500, 120, 20, 0x8B6914);

    // Puzzle 2: Switch opens second bridge
    const bridge2 = this.createPlatform(1400, 550, 200, 15, 0x8B6914);
    bridge2.setVisible(false);
    bridge2.body.enable = false;
    this.bridge2Gfx = this.add.graphics();

    this.createSwitch(1300, 490, 'switch2', (pressed) => {
      bridge2.body.enable = pressed;
      this.bridge2Gfx.clear();
      if (pressed) {
        this.bridge2Gfx.fillStyle(0x8B6914, 1);
        this.bridge2Gfx.fillRoundedRect(1400, 550, 200, 15, 4);
        this.bridge2Gfx.fillStyle(0xA0792C, 1);
        this.bridge2Gfx.fillRoundedRect(1400, 550, 200, 5, { tl: 4, tr: 4, bl: 0, br: 0 });
      }
    });

    // Platforms to reach gap area
    this.createPlatform(1700, 520, 100, 20, 0x8B6914);
    this.createPlatform(1900, 450, 120, 20, 0x8B6914);
    this.createPlatform(2100, 520, 100, 20, 0x8B6914);

    // Puzzle 3: Both on switches
    const bridge3 = this.createPlatform(2000, 400, 200, 15, 0x8B6914);
    bridge3.setVisible(false);
    bridge3.body.enable = false;
    this.bridge3Gfx = this.add.graphics();

    this.puzzleStates['switch3a'] = false;
    this.puzzleStates['switch3b'] = false;

    const checkBridge3 = () => {
      const open = this.puzzleStates['switch3a'] || this.puzzleStates['switch3b'];
      bridge3.body.enable = open;
      this.bridge3Gfx.clear();
      if (open) {
        this.bridge3Gfx.fillStyle(0x8B6914, 1);
        this.bridge3Gfx.fillRoundedRect(2000, 400, 200, 15, 4);
      }
    };

    this.createSwitch(1950, 510, 'switch3a', () => checkBridge3());
    this.createSwitch(2150, 510, 'switch3b', () => checkBridge3());

    // Final area
    this.createPlatform(2400, 500, 200, 20, 0x8B6914);

    // Goal
    this.createGoal(2700, 580, () => {
      if (!window.gameState.clearedStages.includes(1)) {
        window.gameState.clearedStages.push(1);
      }
      this.scene.start('MapScene');
    });
  }

  update() {
    this.updateBase();
  }
}
