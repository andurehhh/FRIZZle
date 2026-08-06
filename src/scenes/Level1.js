import Phaser from 'phaser';
import { WIDTH, HEIGHT, COLORS } from '../config/constants.js';

/**
 * Level1 — placeholder stub.
 * Will be fleshed out on Day 3.
 */
export default class Level1 extends Phaser.Scene {
  constructor() {
    super({ key: 'Level1' });
  }

  create() {
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, COLORS.awsNavy);
    this.add.text(WIDTH / 2, HEIGHT / 2, 'LEVEL 1 — Coming Day 3', {
      fontSize: '32px',
      fontFamily: 'monospace',
      color: '#FF9900',
    }).setOrigin(0.5);

    this.input.once('pointerdown', () => this.scene.start('Attract'));
  }
}
