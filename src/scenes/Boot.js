import Phaser from 'phaser';

/**
 * Boot — first scene to run.
 * Handles any pre-load setup, then immediately hands off to Attract.
 */
export default class Boot extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  preload() {
    // Placeholder: no real assets yet — all visuals are drawn with Phaser shapes
  }

  create() {
    this.scene.start('Attract');
  }
}
