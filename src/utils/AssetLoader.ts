import * as PIXI from 'pixi.js';
import {Sound} from './Sound';
import {GameConstants} from "../consts/GameConstants";

interface AssetManifest {
    images: string[];
    spines: string[];
    sounds: string[];
}

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

            const response = await fetch('/assets/asset-manifest.json');
            const manifest: AssetManifest = await response.json();

            PIXI.Assets.addBundle(
                'images',
                manifest.images.map(img => ({
                    alias: img,
                    src: `${GameConstants.IMAGES_PATH}/${img}`,
                }))
            );

            PIXI.Assets.addBundle(
                'spines',
                manifest.spines.map(sp => ({
                    alias: sp,
                    src: `${GameConstants.SPINES_PATH}/${sp}`,
                }))
            );

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

            await this.loadSounds(manifest);
            console.log('Assets loaded successfully');
        } catch (error) {
            console.error('Error loading assets:', error);
            throw error;
        }
    }

    private async loadSounds(manifest: AssetManifest): Promise<void> {
        try {
            manifest.sounds.forEach(soundFile => {
                Sound.add(soundFile.split('.')[0], `${GameConstants.SOUNDS_PATH}/${soundFile}`);
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
