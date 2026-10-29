// Android back button (and Escape on desktop): each scene may define onBack() to decide what
// "back" means there (close a panel, pause the battle, go to the previous screen). Without a
// handler the app is sent to the background instead of being closed abruptly.
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import type Phaser from 'phaser';

interface BackAware {
  onBack?: () => void;
}

function back(game: Phaser.Game): void {
  const scene = game.scene.getScenes(true).find((s) => s.sys.settings.key !== 'Boot') as (Phaser.Scene & BackAware) | undefined;
  if (scene?.onBack) scene.onBack();
  else if (Capacitor.isNativePlatform()) void App.minimizeApp();
}

export function initBackButton(game: Phaser.Game): void {
  if (Capacitor.isNativePlatform()) void App.addListener('backButton', () => back(game));
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') back(game);
  });
}

/** Leaves the app (to the home screen) from the main menu. */
export function minimizeApp(): void {
  if (Capacitor.isNativePlatform()) void App.minimizeApp();
}
