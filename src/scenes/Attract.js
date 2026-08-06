import Phaser from 'phaser';
import { WIDTH, HEIGHT, COLORS } from '../config/constants.js';

/**
 * Attract — idle/attract screen shown when no one is playing.
 * Tap/click anywhere to start.
 */
export default class Attract extends Phaser.Scene {
  constructor() {
    super({ key: 'Attract' });
  }

  create() {
    // Background
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, COLORS.awsNavy);

    // Title text
    this.add.text(WIDTH / 2, HEIGHT / 2 - 80, 'FRIZZLE', {
      fontSize: '96px',
      fontFamily: 'monospace',
      color: '#FF9900',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(WIDTH / 2, HEIGHT / 2 + 20, 'FLAPPY GAME', {
      fontSize: '36px',
      fontFamily: 'monospace',
      color: '#B3E5FC',
    }).setOrigin(0.5);

    // Prompt
    const prompt = this.add.text(WIDTH / 2, HEIGHT / 2 + 120, 'TAP ANYWHERE TO START', {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: '#FFFFFF',
    }).setOrigin(0.5);

    // Blink the prompt
    this.tweens.add({
      targets: prompt,
      alpha: 0,
      duration: 600,
      ease: 'Linear',
      yoyo: true,
      repeat: -1,
    });

    // Matrix green particle accent (placeholder — just a few moving dots for now)
    for (let i = 0; i < 30; i++) {
      const x = Phaser.Math.Between(0, WIDTH);
      const y = Phaser.Math.Between(0, HEIGHT);
      const dot = this.add.rectangle(x, y, 4, 12, COLORS.matrixGreen, 0.6);
      this.tweens.add({
        targets: dot,
        y: HEIGHT + 20,
        duration: Phaser.Math.Between(2000, 5000),
        repeat: -1,
        delay: Phaser.Math.Between(0, 3000),
        onRepeat: (tween, target) => {
          target.x = Phaser.Math.Between(0, WIDTH);
          target.y = -20;
        },
      });
    }

    // Click/tap to proceed
    this.input.once('pointerdown', () => {
      this.scene.start('Level1');
    });
  }
}
