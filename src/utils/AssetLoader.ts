import * as PIXI from 'pixi.js';
import {Sound} from './Sound';

// Asset paths
const IMAGES_PATH = 'assets/images/';
const SPINES_PATH = 'assets/spines/';
const SOUNDS_PATH = 'assets/sounds/';

// Asset lists
const IMAGES = [
    'symbol1.png',
    'symbol2.png',
    'symbol3.png',
    'symbol4.png',
    'symbol5.png',
    'background.png',
    'button_spin.png',
    'button_spin_disabled.png',
];

const SPINES = [
    'big-boom-h.json',
    'base-feature-frame.json'
];


const SOUNDS = [
    'Reel spin.webm',
    'win.webm',
    'Spin button.webm',
];

const textureCache: Record<string, PIXI.Texture> = {};
const spineCache: Record<string, any> = {};

/**
 * Utility class for loading and caching game assets such as textures, spine animations, and sounds.
 * Handles asynchronous loading of image, spine, and sound bundles required by the slot machine game.
 * Provides cached accessors for these assets to optimize resource usage.
 */
export class AssetLoader {
    constructor() {
        // No-op
    }

    public async loadAssets(): Promise<void> {
        try {
            await PIXI.Assets.init({basePath: ''});

            PIXI.Assets.addBundle('images', IMAGES.map(image => ({
                alias: image,
                src: IMAGES_PATH + image
            })));

            PIXI.Assets.addBundle('spines', SPINES.map(spine => ({
                alias: spine,
                src: SPINES_PATH + spine
            })));

            const imageAssets = await PIXI.Assets.loadBundle('images');
            console.log('Images loaded successfully');

            for (const [key, texture] of Object.entries(imageAssets)) {
                textureCache[key] = texture as PIXI.Texture;
            }

            try {
                const spineAssets = await PIXI.Assets.loadBundle('spines');
                console.log('Spine animations loaded successfully');

                for (const [key, spine] of Object.entries(spineAssets)) {
                    spineCache[key] = spine;
                }
            } catch (error) {
                console.error('Error loading spine animations:', error);
            }

            await this.loadSounds();
            console.log('Assets loaded successfully');
        } catch (error) {
            console.error('Error loading assets:', error);
            throw error;
        }
    }

    private async loadSounds(): Promise<void> {
        try {
            SOUNDS.forEach(soundFile => {
                Sound.add(soundFile.split('.')[0], SOUNDS_PATH + soundFile);
            });
        } catch (error) {
            console.error('Error loading sounds:', error);
            throw error;
        }
    }

    public static getTexture(name: string): PIXI.Texture {
        return textureCache[name];
    }

    public static getSpine(name: string): any {
        return spineCache[name];
    }
}
