import Phaser from 'phaser';
import { signIn, createRoom, joinRoom, generateRoomCode } from '../firebase.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    const { width, height } = this.scale;

    // Background gradient
    const bg = this.add.graphics();
    for (let i = 0; i < height; i++) {
      const t = i / height;
      const r = Phaser.Math.Interpolation.Linear([26, 44], t);
      const g = Phaser.Math.Interpolation.Linear([26, 62], t);
      const b = Phaser.Math.Interpolation.Linear([46, 80], t);
      bg.fillStyle(Phaser.Display.Color.GetColor(r, g, b));
      bg.fillRect(0, i, width, 1);
    }

    // Floating particles
    for (let i = 0; i < 30; i++) {
      const px = Phaser.Math.Between(0, width);
      const py = Phaser.Math.Between(0, height);
      const s = Phaser.Math.FloatBetween(1, 3);
      const dot = this.add.circle(px, py, s, 0xffffff, 0.3);
      this.tweens.add({
        targets: dot, y: py - 50, alpha: 0,
        duration: Phaser.Math.Between(2000, 5000),
        repeat: -1, yoyo: true
      });
    }

    // Title
    this.add.text(width / 2, 80, '🧶 Couple Unravel', {
      fontSize: '42px', fontFamily: 'Arial', color: '#ff6b9d',
      fontStyle: 'bold', stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5);

    this.add.text(width / 2, 130, '둘이서 함께하는 모험', {
      fontSize: '18px', fontFamily: 'Arial', color: '#aaa'
    }).setOrigin(0.5);

    // Draw cute characters preview
    this.drawCharacterPreview(width / 2 - 40, 200, 0xe74c3c);
    this.drawCharacterPreview(width / 2 + 40, 200, 0x3498db);
    // Draw rope between them
    const rope = this.add.graphics();
    rope.lineStyle(3, 0xf39c12, 0.8);
    rope.beginPath();
    rope.moveTo(width / 2 - 25, 200);
    rope.quadraticCurveTo(width / 2, 230, width / 2 + 25, 200);
    rope.strokePath();

    // Buttons
    const btnY = 320;
    this.createButton(width / 2, btnY, '🏠 방 만들기', 0xe74c3c, () => this.doCreateRoom());
    this.createButton(width / 2, btnY + 70, '🚪 참가하기', 0x3498db, () => this.doJoinRoom());
    this.createButton(width / 2, btnY + 140, '🎮 혼자 테스트', 0x2ecc71, () => this.doSolo());

    // Status text
    this.statusText = this.add.text(width / 2, height - 40, '', {
      fontSize: '14px', fontFamily: 'Arial', color: '#fff'
    }).setOrigin(0.5);

    // Room code input (hidden by default)
    this.inputText = '';
    this.inputVisible = false;
    this.inputDisplay = this.add.text(width / 2, btnY + 55, '', {
      fontSize: '28px', fontFamily: 'monospace', color: '#fff',
      backgroundColor: '#333', padding: { x: 20, y: 8 }
    }).setOrigin(0.5).setVisible(false);

    this.input.keyboard.on('keydown', (event) => {
      if (!this.inputVisible) return;
      if (event.key === 'Backspace') {
        this.inputText = this.inputText.slice(0, -1);
      } else if (event.key === 'Enter' && this.inputText.length === 6) {
        this.submitJoin();
      } else if (event.key.length === 1 && this.inputText.length < 6) {
        this.inputText += event.key.toUpperCase();
      }
      this.inputDisplay.setText(this.inputText || '______');
    });
  }

  drawCharacterPreview(x, y, color) {
    const g = this.add.graphics();
    // Body
    g.fillStyle(color, 1);
    g.fillCircle(x, y, 18);
    // Eyes
    g.fillStyle(0xffffff, 1);
    g.fillCircle(x - 6, y - 4, 6);
    g.fillCircle(x + 6, y - 4, 6);
    g.fillStyle(0x000000, 1);
    g.fillCircle(x - 4, y - 4, 3);
    g.fillCircle(x + 4, y - 4, 3);
    // Legs
    g.fillStyle(color, 1);
    g.fillRoundedRect(x - 10, y + 14, 7, 10, 3);
    g.fillRoundedRect(x + 3, y + 14, 7, 10, 3);

    // Bounce animation
    this.tweens.add({
      targets: g, y: -5, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });
  }

  createButton(x, y, text, color, callback) {
    const btn = this.add.graphics();
    btn.fillStyle(color, 1);
    btn.fillRoundedRect(x - 120, y - 22, 240, 44, 12);
    btn.fillStyle(0x000000, 0.2);
    btn.fillRoundedRect(x - 120, y - 22 + 3, 240, 44, 12);
    btn.fillStyle(color, 1);
    btn.fillRoundedRect(x - 120, y - 25, 240, 44, 12);

    const label = this.add.text(x, y - 3, text, {
      fontSize: '20px', fontFamily: 'Arial', color: '#fff', fontStyle: 'bold'
    }).setOrigin(0.5);

    const hitArea = this.add.rectangle(x, y - 3, 240, 44).setInteractive({ useHandCursor: true });
    hitArea.setAlpha(0.001);
    hitArea.on('pointerover', () => { label.setScale(1.05); });
    hitArea.on('pointerout', () => { label.setScale(1); });
    hitArea.on('pointerdown', callback);

    return { btn, label, hitArea };
  }

  async doCreateRoom() {
    this.statusText.setText('방 생성 중...');
    try {
      const uid = await signIn();
      const code = generateRoomCode();
      await createRoom(code, uid);
      window.gameState.mode = 'host';
      window.gameState.roomCode = code;
      window.gameState.uid = uid;
      window.gameState.playerNum = 1;
      this.statusText.setText(`방 코드: ${code} — 상대방에게 공유하세요!`);
      // Wait a bit then go to map
      this.time.delayedCall(2000, () => {
        this.scene.start('MapScene');
      });
    } catch (e) {
      this.statusText.setText('오류: ' + e.message);
    }
  }

  doJoinRoom() {
    this.inputVisible = true;
    this.inputDisplay.setVisible(true);
    this.inputDisplay.setText('______');
    this.inputText = '';
    this.statusText.setText('6자리 방 코드를 입력하세요');

    // Mobile: show prompt
    if (this.sys.game.device.os.android || this.sys.game.device.os.iOS) {
      const code = prompt('방 코드 입력 (6자리):');
      if (code && code.length === 6) {
        this.inputText = code.toUpperCase();
        this.submitJoin();
      }
    }
  }

  async submitJoin() {
    this.statusText.setText('참가 중...');
    try {
      const uid = await signIn();
      const result = await joinRoom(this.inputText, uid);
      if (!result) {
        this.statusText.setText('방을 찾을 수 없습니다!');
        return;
      }
      window.gameState.mode = 'guest';
      window.gameState.roomCode = this.inputText;
      window.gameState.uid = uid;
      window.gameState.playerNum = 2;
      this.inputVisible = false;
      this.inputDisplay.setVisible(false);
      this.scene.start('MapScene');
    } catch (e) {
      this.statusText.setText('오류: ' + e.message);
    }
  }

  doSolo() {
    window.gameState.mode = 'solo';
    window.gameState.controllingPlayer = 1;
    window.gameState.startTime = Date.now();
    this.scene.start('MapScene');
  }
}
