import Phaser from 'phaser';

export class MapScene extends Phaser.Scene {
  constructor() {
    super('MapScene');
  }

  create() {
    const { width, height } = this.scale;
    const cleared = window.gameState.clearedStages;

    // Background
    const bg = this.add.graphics();
    for (let i = 0; i < height; i++) {
      const t = i / height;
      const r = Math.floor(Phaser.Math.Interpolation.Linear([135, 80], t));
      const g = Math.floor(Phaser.Math.Interpolation.Linear([206, 140], t));
      const b = Math.floor(Phaser.Math.Interpolation.Linear([235, 180], t));
      bg.fillStyle(Phaser.Display.Color.GetColor(r, g, b));
      bg.fillRect(0, i, width, 1);
    }

    // Clouds
    this.drawCloud(100, 80, 1.2);
    this.drawCloud(500, 50, 0.8);
    this.drawCloud(650, 120, 1);

    // Title
    this.add.text(width / 2, 50, '🗺️ 모험의 지도', {
      fontSize: '32px', fontFamily: 'Arial', color: '#fff',
      fontStyle: 'bold', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5);

    // Path line
    const path = this.add.graphics();
    path.lineStyle(4, 0xffffff, 0.4);
    path.beginPath();
    path.moveTo(200, 380);
    path.lineTo(400, 280);
    path.lineTo(600, 380);
    path.strokePath();

    // Dotted path
    for (let i = 0; i < 20; i++) {
      const t = i / 20;
      let x, y;
      if (t < 0.5) {
        x = Phaser.Math.Interpolation.Linear([200, 400], t * 2);
        y = Phaser.Math.Interpolation.Linear([380, 280], t * 2);
      } else {
        x = Phaser.Math.Interpolation.Linear([400, 600], (t - 0.5) * 2);
        y = Phaser.Math.Interpolation.Linear([280, 380], (t - 0.5) * 2);
      }
      this.add.circle(x, y, 3, 0xffffff, 0.5);
    }

    // Stage nodes
    const stages = [
      { x: 200, y: 380, name: '🌲 숲속 산책', stage: 1, color: 0x2ecc71 },
      { x: 400, y: 280, name: '🏔️ 바위 산', stage: 2, color: 0x95a5a6 },
      { x: 600, y: 380, name: '🌙 별빛 동굴', stage: 3, color: 0x9b59b6 }
    ];

    stages.forEach((s, i) => {
      const unlocked = i === 0 || cleared.includes(i);
      this.drawStageNode(s.x, s.y, s.name, s.stage, s.color, unlocked, cleared.includes(s.stage));
    });

    // Mode info
    const modeText = window.gameState.mode === 'solo' ? '🎮 혼자 테스트' :
      window.gameState.mode === 'host' ? `🏠 방장 (${window.gameState.roomCode})` :
      `🚪 참가자 (${window.gameState.roomCode})`;
    this.add.text(width / 2, height - 40, modeText, {
      fontSize: '14px', fontFamily: 'Arial', color: '#fff', backgroundColor: '#00000066',
      padding: { x: 10, y: 5 }
    }).setOrigin(0.5);

    // Back button
    const backBtn = this.add.text(30, 20, '← 메뉴', {
      fontSize: '16px', fontFamily: 'Arial', color: '#fff'
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));
  }

  drawCloud(x, y, scale) {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.3);
    g.fillCircle(x, y, 20 * scale);
    g.fillCircle(x + 20 * scale, y - 5 * scale, 15 * scale);
    g.fillCircle(x - 18 * scale, y + 2 * scale, 12 * scale);
    g.fillCircle(x + 10 * scale, y + 5 * scale, 18 * scale);
    this.tweens.add({
      targets: g, x: 30, duration: 8000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });
  }

  drawStageNode(x, y, name, stage, color, unlocked, cleared) {
    const g = this.add.graphics();
    
    // Glow
    if (unlocked) {
      g.fillStyle(color, 0.3);
      g.fillCircle(x, y, 45);
    }

    // Circle
    g.fillStyle(unlocked ? color : 0x555555, 1);
    g.fillCircle(x, y, 35);
    g.lineStyle(3, 0xffffff, unlocked ? 0.8 : 0.3);
    g.strokeCircle(x, y, 35);

    // Icon
    const icon = cleared ? '⭐' : (unlocked ? (stage === 1 ? '🌲' : stage === 2 ? '🏔️' : '🌙') : '🔒');
    this.add.text(x, y - 2, icon, {
      fontSize: '28px'
    }).setOrigin(0.5);

    // Label
    this.add.text(x, y + 50, name, {
      fontSize: '14px', fontFamily: 'Arial', color: unlocked ? '#fff' : '#888',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    if (unlocked) {
      const hitArea = this.add.circle(x, y, 35).setInteractive({ useHandCursor: true });
      hitArea.setAlpha(0.001);
      hitArea.on('pointerdown', () => {
        window.gameState.startTime = window.gameState.startTime || Date.now();
        this.scene.start(`Stage${stage}Scene`);
      });

      // Pulse animation
      this.tweens.add({
        targets: g, scaleX: 1.05, scaleY: 1.05, duration: 1000, yoyo: true, repeat: -1
      });
    }
  }
}
