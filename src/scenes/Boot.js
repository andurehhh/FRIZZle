import Phaser from 'phaser';

/**
 * Boot — first scene to run.
 * Loads all game assets, then hands off to Attract.
 */
export default class Boot extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  preload() {
    // Penguin sprites — loaded at high res to avoid pixelation when scaled up
    this.load.svg('penguin-idle', '/assets/sprites/sprite_idle.svg', { width: 256, height: 256 });
    this.load.svg('penguin-up',   '/assets/sprites/sprite_up.svg',   { width: 256, height: 256 });
    this.load.svg('penguin-down', '/assets/sprites/sprite_down.svg', { width: 256, height: 256 });

    // Title logo
    this.load.svg('title-logo', '/assets/FRIZZLE.svg', { width: 500, height: 120 });

    // Background
    this.load.image('ice-bg', '/assets/ice-bg.png');
    this.load.image('glitch-bg', '/assets/glitch-bg.png');

    // UI icons
    this.load.svg('icon-leaderboard', '/assets/leaderboard.svg', { width: 64, height: 64 });
    this.load.svg('icon-share',       '/assets/share.svg',       { width: 64, height: 64 });
    this.load.svg('awssbg-logo',      '/assets/awssbg-logo.svg', { width: 128, height: 128 });
    this.load.svg('awssbg-logo1',      '/assets/awssbg-logo1.svg', { width: 128, height: 128 });


    // Audio — flap variants (played randomly, 1 in 4 chance per flap)
    this.load.audio('flap1', '/assets/audio/flap1.mp3');
    this.load.audio('flap2', '/assets/audio/flap2.mp3');
    this.load.audio('flap3', '/assets/audio/flap3.mp3');

    // Audio — death variants (random pick, always plays on death)
    this.load.audio('death1', '/assets/audio/death1.mp3');
    this.load.audio('death2', '/assets/audio/death2.mp3');

    // Audio — music & transitions
    this.load.audio('transition', '/assets/audio/transition.mp3');
    this.load.audio('snowy-hill', '/assets/audio/Snowy Hill.mp3');
    this.load.audio('glitch',     '/assets/audio/glitch.mp3');
    this.load.audio('title-bgm',  '/assets/audio/title-bgm.mp3');
    this.load.audio('pickup',     '/assets/audio/pickup.mp3');
    this.load.audio('enemy',      '/assets/audio/enemy.mp3');
    this.load.audio('win',        '/assets/audio/win.mp3');
  }

  create() {
    // Wait for Google Fonts before showing any text scenes
    document.fonts.ready.then(() => {
      this.scene.start('Attract');
    });
  }
}
