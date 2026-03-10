import Phaser from 'phaser';
import { MenuScene } from './scenes/MenuScene.js';
import { MapScene } from './scenes/MapScene.js';
import { Stage1Scene } from './scenes/Stage1Scene.js';
import { Stage2Scene } from './scenes/Stage2Scene.js';
import { Stage3Scene } from './scenes/Stage3Scene.js';
import { VictoryScene } from './scenes/VictoryScene.js';

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: document.body,
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 800 },
      debug: false
    }
  },
  input: {
    activePointers: 3
  },
  scene: [MenuScene, MapScene, Stage1Scene, Stage2Scene, Stage3Scene, VictoryScene]
};

const game = new Phaser.Game(config);

// Global game state
window.gameState = {
  mode: 'solo', // 'solo', 'host', 'guest'
  roomCode: null,
  uid: null,
  playerNum: 1,
  controllingPlayer: 1,
  clearedStages: [],
  startTime: null
};
