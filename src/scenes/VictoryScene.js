import Phaser from 'phaser';

export class VictoryScene extends Phaser.Scene {
  constructor() {
    super('VictoryScene');
  }

  create() {
    const { width, height } = this.scale;

    // Background
    const bg = this.add.graphics();
    for (let i = 0; i < height; i++) {
      const t = i / height;
      const r = Math.floor(Phaser.Math.Interpolation.Linear([26, 44], t));
      const g = Math.floor(Phaser.Math.Interpolation.Linear([26, 30], t));
      const b = Math.floor(Phaser.Math.Interpolation.Linear([46, 80], t));
      bg.fillStyle(Phaser.Display.Color.GetColor(r, g, b));
      bg.fillRect(0, i, width, 1);
    }

    // Star particles
    for (let i = 0; i < 50; i++) {
      const sx = Phaser.Math.Between(0, width);
      const sy = Phaser.Math.Between(0, height);
      const colors = [0xf1c40f, 0xe74c3c, 0x3498db, 0x2ecc71, 0x9b59b6, 0xff6b9d];
      const star = this.add.star(sx, sy, 5, 3, 7, colors[i % colors.length]);
      star.setAlpha(0);

      this.tweens.add({
        targets: star,
        alpha: 1,
        scale: { from: 0, to: 1 },
        angle: 360,
        delay: i * 80,
        duration: 600,
      });

      this.tweens.add({
        targets: star,
        y: sy + Phaser.Math.Between(-20, 20),
        x: sx + Phaser.Math.Between(-10, 10),
        duration: 2000,
        yoyo: true,
        repeat: -1,
        delay: i * 80 + 600,
        ease: 'Sine.easeInOut'
      });
    }

    // Trophy
    this.add.text(width / 2, 120, '🏆', {
      fontSize: '80px'
    }).setOrigin(0.5);

    // Title
    const title = this.add.text(width / 2, 220, '모험 완료!', {
      fontSize: '48px', fontFamily: 'Arial', color: '#f1c40f',
      fontStyle: 'bold', stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5).setScale(0);

    this.tweens.add({
      targets: title, scale: 1, duration: 800, ease: 'Back.easeOut', delay: 500
    });

    // Subtitle
    const sub = this.add.text(width / 2, 280, '💕 둘이 함께라서 가능했어요!', {
      fontSize: '20px', fontFamily: 'Arial', color: '#ff6b9d'
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: sub, alpha: 1, y: 275, duration: 600, delay: 1200
    });

    // Time
    const elapsed = window.gameState.startTime ? Date.now() - window.gameState.startTime : 0;
    const min = Math.floor(elapsed / 60000);
    const sec = Math.floor((elapsed % 60000) / 1000);
    const timeStr = `⏱️ 클리어 시간: ${min}분 ${sec}초`;

    this.add.text(width / 2, 340, timeStr, {
      fontSize: '18px', fontFamily: 'Arial', color: '#ecf0f1'
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: this.children.list[this.children.list.length - 1],
      alpha: 1, delay: 1800, duration: 500
    });

    // Characters celebrating
    this.drawCelebratingCharacter(width / 2 - 60, 420, 0xe74c3c);
    this.drawCelebratingCharacter(width / 2 + 60, 420, 0x3498db);

    // Rope between them
    const rope = this.add.graphics();
    rope.lineStyle(3, 0xf39c12, 0.8);
    rope.beginPath();
    rope.moveTo(width / 2 - 45, 420);
    rope.quadraticCurveTo(width / 2, 440, width / 2 + 45, 420);
    rope.strokePath();

    // Heart between characters
    const heart = this.add.text(width / 2, 400, '💕', { fontSize: '24px' }).setOrigin(0.5);
    this.tweens.add({
      targets: heart, y: 390, scale: 1.2, duration: 800, yoyo: true, repeat: -1
    });

    // Replay button
    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x2ecc71, 1);
    btnBg.fillRoundedRect(width / 2 - 100, 490, 200, 50, 12);

    const btn = this.add.text(width / 2, 515, '🔄 다시 하기', {
      fontSize: '20px', fontFamily: 'Arial', color: '#fff', fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => {
      window.gameState.clearedStages = [];
      window.gameState.startTime = null;
      this.scene.start('MenuScene');
    });

    btn.on('pointerover', () => btn.setScale(1.1));
    btn.on('pointerout', () => btn.setScale(1));
  }

  drawCelebratingCharacter(x, y, color) {
    const g = this.add.graphics();

    const draw = () => {
      g.clear();
      g.fillStyle(color, 1);
      g.fillCircle(x, y, 18);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(x - 6, y - 4, 6);
      g.fillCircle(x + 6, y - 4, 6);
      g.fillStyle(0x000000, 1);
      g.fillCircle(x - 4, y - 4, 3);
      g.fillCircle(x + 4, y - 4, 3);
      // Happy mouth
      g.lineStyle(2, 0x000000, 1);
      g.beginPath();
      g.arc(x, y + 2, 5, 0, Math.PI);
      g.strokePath();
      // Cheeks
      g.fillStyle(0xffaaaa, 0.4);
      g.fillCircle(x - 10, y + 2, 4);
      g.fillCircle(x + 10, y + 2, 4);
      // Legs
      g.fillStyle(color, 1);
      g.fillRoundedRect(x - 10, y + 14, 7, 10, 3);
      g.fillRoundedRect(x + 3, y + 14, 7, 10, 3);
    };
    draw();

    // Jump animation
    this.tweens.add({
      targets: g, y: -15, duration: 500, yoyo: true, repeat: -1,
      ease: 'Sine.easeOut', delay: color === 0xe74c3c ? 0 : 250
    });
  }
}
