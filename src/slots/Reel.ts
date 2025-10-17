import * as PIXI from 'pixi.js';
import {AssetLoader} from '../utils/AssetLoader';
import {GameConstants} from "../consts/GameConstants";

const {
    SPIN_SPEED,
    SLOWDOWN_RATE
} = GameConstants;

/**
 * Represents a single reel in the slot machine.
 * Handles symbol creation, spinning animation, symbol recycling, and manual controls.
 * Manages the position and state of symbols on the reel and provides visible symbols for win detection.
 */
export class Reel {
    public container: PIXI.Container;
    private symbols: PIXI.Sprite[];
    private readonly symbolSize: number;
    private readonly symbolCount: number;
    private speed: number = 0;
    private isSpinning: boolean = false;
    // Manual spin control: when true, do not randomize textures during recycling,
    // and preserve the initial sprite order on snap.
    private manualLockTextures: boolean = false;
    private initialOrderSprites: PIXI.Sprite[] | null = null;
    public static SYMBOL_TEXTURES: readonly string[] = [];

    constructor(symbolCount: number, symbolSize: number) {
        this.container = new PIXI.Container();
        this.symbols = [];
        this.symbolSize = symbolSize;
        this.symbolCount = symbolCount;

        this.createSymbols();
    }

    private createSymbols(): void {
        // Create symbols for the reel, arranged horizontally
        this.symbols = [];
        for (let i = 0; i < this.symbolCount; i++) {
            const sprite = this.createRandomSymbol();
            sprite.x = i * this.symbolSize;
            sprite.y = 0;
            sprite.width = this.symbolSize;
            sprite.height = this.symbolSize;
            this.container.addChild(sprite);
            this.symbols.push(sprite);
        }
        // Ensure perfect initial alignment
        this.snapToGrid();
    }

    private createRandomSymbol(): PIXI.Sprite {
        // Get a random symbol texture
        const textureName = Reel.SYMBOL_TEXTURES[Math.floor(Math.random() * Reel.SYMBOL_TEXTURES.length)];
        const texture = AssetLoader.getTexture(textureName);

        // Create a sprite with the texture
        const sprite = new PIXI.Sprite(texture);
        sprite.anchor.set(0, 0); // top-left anchor for simpler grid math
        sprite.name = textureName; // track which symbol this sprite shows
        return sprite;
    }

    public update(delta: number): void {
        if (!this.isSpinning && this.speed === 0) return;

        // Move symbols horizontally to the left
        const dx = this.speed * (delta || 1);
        for (const sprite of this.symbols) {
            sprite.x -= dx;
        }

        // Recycle symbols that moved off the left edge to the right end
        // Determine the current rightmost x among sprites
        let rightmost = Math.max(...this.symbols.map(s => s.x));
        for (const sprite of this.symbols) {
            if (sprite.x + this.symbolSize <= -1) {
                // Move this sprite to the immediate position after the current rightmost
                if (!this.manualLockTextures) {
                    const newName = Reel.SYMBOL_TEXTURES[Math.floor(Math.random() * Reel.SYMBOL_TEXTURES.length)];
                    sprite.texture = AssetLoader.getTexture(newName);
                    sprite.name = newName;
                }
                sprite.x = rightmost + this.symbolSize;
                rightmost = sprite.x; // update rightmost
            }
        }

        // If we're stopping, slow down the reel
        if (!this.isSpinning && this.speed > 0) {
            this.speed *= SLOWDOWN_RATE;

            // If speed is very low, stop completely and snap to grid
            if (this.speed < 0.5) {
                this.speed = 0;
                this.snapToGrid();
            }
        }
    }

    private snapToGrid(): void {
        // Perfectly align symbols so that columns sit exactly on the grid (0, S, 2S, ...)
        // If we are in a manual-locked spin, keep the initial sprite order.
        if (this.manualLockTextures && this.initialOrderSprites && this.initialOrderSprites.length === this.symbols.length) {
            for (let i = 0; i < this.initialOrderSprites.length; i++) {
                const sprite = this.initialOrderSprites[i];
                sprite.x = i * this.symbolSize;
            }
            return;
        }
        // Default: sort by x to keep visual order, then hard-set positions.
        this.symbols.sort((a, b) => a.x - b.x);
        for (let i = 0; i < this.symbols.length; i++) {
            const sprite = this.symbols[i];
            sprite.x = i * this.symbolSize;
        }
    }

    // Expose ordered symbols for win detection - Reel sorted by 'x' coordinate
    public getVisibleSymbols(): PIXI.Sprite[] {
        return [...this.symbols].sort((a, b) => a.x - b.x);
    }

    // Force this reel to display specific symbols per column (left->right)
    public setColumns(names: string[]): void {
        if (!Array.isArray(names) || names.length !== this.symbolCount) {
            console.warn('setColumns: invalid names length', names?.length, 'expected', this.symbolCount);
            return;
        }
        const ordered = [...this.symbols].sort((a, b) => a.x - b.x);
        for (let i = 0; i < ordered.length; i++) {
            const sprite = ordered[i];
            const name = names[i];
            const tex = AssetLoader.getTexture(name);
            if (tex) {
                sprite.texture = tex;
                sprite.name = name;
            } else {
                console.warn('Texture not found for', name);
            }
        }
        // Ensure alignment after forcing textures
        this.snapToGrid();
    }

    public startSpin(): void {
        this.isSpinning = true;
        this.speed = SPIN_SPEED;
    }

    public stopSpin(): void {
        this.isSpinning = false;
        // The reel will gradually slow down in the update method
    }

    public enableManualLock(lock: boolean): void {
        this.manualLockTextures = lock;
        if (lock) {
            // Capture the current visible order by x so we can restore it on snap
            this.initialOrderSprites = [...this.symbols].sort((a, b) => a.x - b.x);
        } else {
            this.initialOrderSprites = null;
        }
    }
}
