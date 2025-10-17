import * as PIXI from 'pixi.js';
import {SlotMachine} from './slots/SlotMachine';
import {AssetLoader} from './utils/AssetLoader';
import {UI} from './ui/UI';
import {GameConstants} from './consts/GameConstants';
import { Reel } from './slots/Reel';

/**
 * Main entry point for the slot machine game application.
 * Initializes PIXI application, loads assets, and sets up game components including the SlotMachine and UI.
 * Handles game lifecycle events like resizing and update loop to drive game progression.
 */
export class Game {
    private readonly app: PIXI.Application;
    private slotMachine!: SlotMachine;
    private ui!: UI;
    private assetLoader: AssetLoader;

    constructor() {
        this.app = new PIXI.Application({
            width: GameConstants.BASE_WIDTH,
            height: GameConstants.BASE_HEIGHT,
            backgroundColor: 0x1099bb,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
        });

        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.appendChild(this.app.view as HTMLCanvasElement);
        }

        this.assetLoader = new AssetLoader();

        this.init = this.init.bind(this);
        this.resize = this.resize.bind(this);

        window.addEventListener('resize', this.resize);
    }

    public async init(): Promise<void> {
        try {
            await this.assetLoader.loadAssets();

            Reel.SYMBOL_TEXTURES = AssetLoader.symbolTextures;

            this.slotMachine = new SlotMachine(this.app);
            this.app.stage.addChild(this.slotMachine.container);

            this.ui = new UI(this.app, this.slotMachine);
            this.app.stage.addChild(this.ui.container);

            this.app.ticker.add(this.update.bind(this)); // Binding update() to PIXI

            // Call resize AFTER all game elements are initialized
            // This ensures proper scaling on page load/refresh
            this.resize();

            console.log('Game initialized successfully');
        } catch (error) {
            console.error('Error initializing game:', error);
        }
    }

    private update(delta: number): void {
        if (this.slotMachine) {
            this.slotMachine.update(delta); // Using ticker's time elapsed since last frame (delta)
        }
    }

    private resize(): void {
        if (!this.app || !this.app.renderer) return;

        const gameContainer = document.getElementById('game-container');
        if (!gameContainer) return;

        const w = gameContainer.clientWidth;
        const h = gameContainer.clientHeight;

        // Calculate scale to fit the container while maintaining aspect ratio
        const scale = Math.min(w / GameConstants.BASE_WIDTH, h / GameConstants.BASE_HEIGHT);

        this.app.stage.scale.set(scale);

        // Resize the renderer to fill the container
        this.app.renderer.resize(w, h);
        this.app.stage.position.set(w / 2, h / 2);
        this.app.stage.pivot.set(GameConstants.BASE_WIDTH / 2, GameConstants.BASE_HEIGHT / 2);
    }
}
