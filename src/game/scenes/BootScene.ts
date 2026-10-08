import Phaser from 'phaser';
import { detectLang, setLang } from '../../i18n';
import { ZOOM } from '../../config';
import { createManifestAnims, createPlaceholderTextures, dropMissingArt, MANIFEST_KEY, queueManifest, type Manifest } from '../art';
import { loadSave } from '../save';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    this.load.json(MANIFEST_KEY, 'assets/manifest.json');
  }

  create(): void {
    this.cameras.main.setOrigin(0, 0).setZoom(ZOOM);
    const save = loadSave();
    setLang(save.lang ?? detectLang());

    const manifest = this.cache.json.get(MANIFEST_KEY) as Manifest | undefined;
    queueManifest(this, manifest);
    // A missing art file must not break the game: its placeholder is used instead.
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`Art not found, using placeholder: ${file.src}`);
      dropMissingArt(this, file.key);
    });
    this.load.once('complete', () => {
      createPlaceholderTextures(this);
      createManifestAnims(this, manifest);
      this.scene.start('Menu');
    });
    this.load.start();
  }
}
