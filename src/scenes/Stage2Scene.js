import { StageBase } from './StageBase.js';
import Phaser from 'phaser';

export class Stage2Scene extends StageBase {
  constructor() {
    super('Stage2Scene');
  }

  getMapWidth() { return 3200; }
  getMapHeight() { return 1000; }

  create() {
    this.createBase();
    this.drawMountainBackground();
    this.buildLevel();

    this.player1.setPosition(100, 850);
    this.player2.setPosition(140, 850);
    this.setCheckpoint(this.player1, 100, 850);
    this.setCheckpoint(this.player2, 140, 850);
  }

  drawMountainBackground() {
    const bg = this.add.graphics();
    const h = this.mapH;
    const w = this.mapW;

    // Dark sky gradient
    for (let i = 0; i < h; i++) {
      const t = i / h;
      const r = Math.floor(Phaser.Math.Interpolation.Linear([89, 52], t));
      const g = Math.floor(Phaser.Math.Interpolation.Linear([98, 73], t));
      const b = Math.floor(Phaser.Math.Interpolation.Linear([117, 94], t));
      bg.fillStyle(Phaser.Display.Color.GetColor(r, g, b));
      bg.fillRect(0, i, w, 1);
    }

    // Background mountains
    bg.fillStyle(0x5d5d6e, 0.6);
    for (let x = 0; x < w; x += 300) {
      const mh = Phaser.Math.Between(200, 400);
      bg.fillTriangle(x, 600, x + 150, 600 - mh, x + 300, 600);
    }

    // Rocks scattered
    for (let i = 0; i < 20; i++) {
      const rx = Phaser.Math.Between(0, w);
      const ry = Phaser.Math.Between(500, 900);
      bg.fillStyle(0x777788, 0.4);
      bg.fillCircle(rx, ry, Phaser.Math.Between(8, 25));
    }

    // Snow caps on mountains
    bg.fillStyle(0xecf0f1, 0.3);
    for (let x = 0; x < w; x += 300) {
      bg.fillTriangle(x + 120, 300, x + 150, 250, x + 180, 300);
    }
  }

  buildLevel() {
    // Ground level
    this.createPlatform(0, 900, 600, 100, 0x7f8c8d);
    this.createPlatform(800, 900, 400, 100, 0x7f8c8d);
    this.createPlatform(1400, 900, 300, 100, 0x7f8c8d);

    // Ascending platforms (rocky)
    this.createPlatform(200, 800, 100, 20, 0x95a5a6);
    this.createPlatform(400, 720, 100, 20, 0x95a5a6);
    this.createPlatform(250, 640, 100, 20, 0x95a5a6);
    this.createPlatform(450, 560, 120, 20, 0x95a5a6);

    // Spikes in gap
    this.createSpikes(600, 885, 10);

    // Moving platform 1
    this.createMovingPlatform(700, 750, 100, 20, 700, 850, 'y', 2500);

    // Mid section
    this.createPlatform(850, 700, 150, 20, 0x95a5a6);
    this.createPlatform(1050, 620, 120, 20, 0x95a5a6);

    // Checkpoint
    this.time.delayedCall(1000, () => {
      this.setCheckpoint(this.player1, 850, 680);
      this.setCheckpoint(this.player2, 890, 680);
    });

    // Spikes
    this.createSpikes(1200, 885, 10);

    // Tall wall section - need rope mechanic
    this.createPlatform(1200, 500, 200, 20, 0x95a5a6);
    this.createPlatform(1100, 600, 80, 20, 0x95a5a6);

    // High platforms
    this.createPlatform(1400, 400, 150, 20, 0x95a5a6);
    this.createPlatform(1600, 320, 120, 20, 0x95a5a6);

    // Moving platform 2
    this.createMovingPlatform(1800, 400, 100, 20, 1800, 2100, 'x', 3000);

    // Switch puzzle
    const wall = this.createPlatform(2100, 200, 20, 300, 0x95a5a6);
    this.wallGfx = this.add.graphics();

    this.createSwitch(1600, 310, 'switch_wall', (pressed) => {
      wall.body.enable = !pressed;
      this.wallGfx.clear();
      if (!pressed) {
        this.wallGfx.fillStyle(0x95a5a6, 1);
        this.wallGfx.fillRoundedRect(2100, 200, 20, 300, 4);
      }
    });

    // After wall
    this.createPlatform(2200, 350, 150, 20, 0x95a5a6);
    this.createPlatform(2400, 280, 120, 20, 0x95a5a6);

    // More spikes
    this.createSpikes(2300, 585, 5);

    // Moving platform 3
    this.createMovingPlatform(2550, 350, 100, 20, 200, 400, 'y', 2000);

    // Final platforms
    this.createPlatform(2700, 500, 200, 20, 0x95a5a6);
    this.createPlatform(2900, 600, 300, 20, 0x95a5a6);
    this.createPlatform(2600, 900, 600, 100, 0x7f8c8d);

    // Goal
    this.createGoal(3050, 570, () => {
      if (!window.gameState.clearedStages.includes(2)) {
        window.gameState.clearedStages.push(2);
      }
      this.scene.start('MapScene');
    });
  }

  createMovingPlatform(x, y, w, h, from, to, axis, duration) {
    const plat = this.createPlatform(x, y, w, h, 0xbdc3c7);

    // Visual graphics for moving platform
    const gfx = this.add.graphics();

    this.tweens.add({
      targets: plat,
      [axis]: { from, to },
      duration,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        plat.refreshBody();
        gfx.clear();
        gfx.fillStyle(0xbdc3c7, 1);
        gfx.fillRoundedRect(plat.x - w / 2, plat.y - h / 2, w, h, 4);
        gfx.fillStyle(0xdfe6e9, 1);
        gfx.fillRoundedRect(plat.x - w / 2, plat.y - h / 2, w, h / 3, { tl: 4, tr: 4, bl: 0, br: 0 });
      }
    });
  }

  update() {
    this.updateBase();
  }
}
