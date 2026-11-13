import Phaser from 'phaser';
import GameScene from './scenes/GameScene.js';

const config = {
  type: Phaser.AUTO,          // WebGL se disponível, senão Canvas
  width: 640,
  height: 640,
  backgroundColor: '#1d2b3a',
  scene: [GameScene],         // lista de cenas; a primeira inicia sozinha
};

new Phaser.Game(config);
