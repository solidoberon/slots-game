import * as PIXI from 'pixi.js';
import 'pixi-spine';
import {Spine} from 'pixi-spine';
import {Reel} from './Reel';
import {Sound} from '../utils/Sound';
import {AssetLoader} from '../utils/AssetLoader';
import {ForceWinHelper} from './ForceWinHelper';
import {GameCoreLogic} from '../core/GameCoreLogic';
import {GameConstants} from "../consts/GameConstants";

const {
    REEL_COUNT,
    SYMBOLS_PER_REEL,
    SYMBOL_SIZE,
    REEL_HEIGHT,
    REEL_SPACING,
    WIN_RESULT_DELAY_MS,
    REEL_SPIN_DELAY_MS,
} = GameConstants;

// Available symbol texture names
const SYMBOL_TEXTURES_LIST = [
    'symbol1.png',
    'symbol2.png',
    'symbol3.png',
    'symbol4.png',
    'symbol5.png',
];

/**
 * Class representing the slot machine game logic and visuals.
 * Manages reels, spinning behavior, win detection, animations, and user interactions.
 * Integrates reel components and coordinates gameplay features such as spins, wins, and UI updates.
 */
export class SlotMachine {
    public container: PIXI.Container;
    private readonly reels: Reel[];
    private app: PIXI.Application;
    private isSpinning: boolean = false;
    private spinButton: PIXI.Sprite | null = null;
    private frameSpine: Spine | null = null;
    private winAnimation: Spine | null = null;
    private bgSprite: PIXI.Sprite | null = null;
    private backgroundScale: number = 1;
    private scaleOffset: number = 5; // Offset pixels for better background fitting

    // Helper variables - used for forcing manual win
    // When set, a manual spin will start with this grid applied (pre-determined symbols)
    private preSpinForcedGrid: string[][] | null = null;
    private manualSpinActive: boolean = false;
    // Toggle for straight win orientation (true => horizontal, false => vertical)
    private nextStraightIsHorizontal: boolean = true;

    constructor(app: PIXI.Application) {
        this.app = app;
        this.container = new PIXI.Container();
        this.reels = [];

        // Center the slot machine
        this.container.x = this.app.screen.width / 2 - ((SYMBOL_SIZE * SYMBOLS_PER_REEL) / 2);
        this.container.y = this.app.screen.height / 2 - ((REEL_HEIGHT * REEL_COUNT + REEL_SPACING * (REEL_COUNT - 1)) / 2);

        this.createBackground();

        this.createReels();

        // Overlay for drawing win lines on top of reels
        this.container.addChild(this.overlay);

        this.initSpineAnimations();
    }

    private createBackground(): void {
        try {
            const tex = AssetLoader.getTexture('background.png');
            const bg = new PIXI.Sprite(tex);

            // Put behind everything else
            this.container.sortableChildren = true;
            bg.zIndex = 0;
            bg.x = 0;
            bg.y = 0;

            this.bgSprite = bg;
            this.container.addChildAt(bg, 0);
        } catch (error) {
            console.error('Error creating background:', error);
        }
    }

    private sizeBackgroundToFrame(): void {
        if (!this.frameSpine || !this.bgSprite) return;

        // Force Spine transforms up-to-date before measuring (in case of freshly set animation)
        this.frameSpine.update(0);
        this.frameSpine.updateTransform();

        const gb = this.frameSpine.getBounds(); // global bounds (world space)

        // Convert global rectangle to SlotMachine.container local space
        const topLeft = this.container.toLocal(new PIXI.Point(gb.x, gb.y));
        const bottomRight = this.container.toLocal(new PIXI.Point(gb.x + gb.width, gb.y + gb.height));

        const w = Math.max(0, bottomRight.x - topLeft.x);
        const h = Math.max(0, bottomRight.y - topLeft.y);

        // Apply scaling factor and center within the frame bounds
        const scaledW = w * this.backgroundScale + this.scaleOffset;
        const scaledH = h * this.backgroundScale - this.scaleOffset;
        const offsetX = (w - scaledW) / 2;
        const offsetY = (h - scaledH) / 2;

        this.bgSprite.x = topLeft.x + offsetX;
        this.bgSprite.y = topLeft.y + offsetY;
        this.bgSprite.width = scaledW;
        this.bgSprite.height = scaledH;
    }

    /**
     * Dynamically adjust the background scaling factor and re-apply sizing.
     * scale = 1 fits the frame exactly; < 1 shrinks it; > 1 enlarges it (may be clipped by the frame if masked).
     */
    public setBackgroundScale(scale: number): void {
        // Clamp to a sane range to avoid accidental negatives or extreme sizes
        if (!Number.isFinite(scale)) return;
        this.backgroundScale = Math.max(0.5, Math.min(2, scale));
        this.sizeBackgroundToFrame();
    }

    private createReels(): void {
        // Create each reel
        for (let i = 0; i < REEL_COUNT; i++) {
            const reel = new Reel(SYMBOLS_PER_REEL, SYMBOL_SIZE);
            reel.container.y = i * (REEL_HEIGHT + REEL_SPACING);
            this.container.addChild(reel.container);
            this.reels.push(reel);
        }
    }

    public update(delta: number): void {
        // Update each reel
        for (const reel of this.reels) {
            reel.update(delta);
        }
    }

    private overlay: PIXI.Graphics = new PIXI.Graphics();

    public spin(): void {
        if (this.isSpinning) return;

        // If a manual forced grid is present, apply it before starting the spin
        if (this.preSpinForcedGrid) {
            this.applyGrid(this.preSpinForcedGrid);
            // Lock reels so textures don't randomize during the spin
            for (const r of this.reels) r.enableManualLock(true);
            this.manualSpinActive = true;
            this.preSpinForcedGrid = null;
        } else {
            this.manualSpinActive = false;
        }

        this.isSpinning = true;

        // Notify listeners that spin has started
        (this.container as any).emit?.('spin:start');

        // Clear previous win lines
        this.overlay.clear();

        // Play spin sound (loop until reels finish)
        Sound.loop('Reel spin', true);
        Sound.play('Reel spin');

        // Disable spin button
        if (this.spinButton) {
            this.spinButton.texture = AssetLoader.getTexture('button_spin_disabled.png');
            this.spinButton.interactive = false;
        }

        for (let i = 0; i < this.reels.length; i++) {
            setTimeout(() => {
                this.reels[i].startSpin();
            }, i * 200);
        }

        // Stop all reels after a delay
        setTimeout(() => {
            this.stopSpin();
        }, 500 + (this.reels.length - 1) * 200);

    }

    private stopSpin(): void {
        for (let i = 0; i < this.reels.length; i++) {
            setTimeout(() => {
                this.reels[i].stopSpin();
                // Using 'Spin button' sound for reel stop as placeholder - can be replaced
                Sound.play('click');

                // If this is the last reel, check for wins and enable spin button
                if (i === this.reels.length - 1) {
                    setTimeout(() => {
                        // Stop the reel spin sound once all reels have finished their animation
                        Sound.loop('Reel spin', false);
                        Sound.stop('Reel spin');

                        // Disable manual lock after reels have come to rest (snap already maintains initial order)
                        if (this.manualSpinActive) {
                            for (const r of this.reels) r.enableManualLock(false);
                            this.manualSpinActive = false;
                        }

                        const grid = this.buildGridFromReels();
                        const {winningPaths} = GameCoreLogic.checkWin(grid);
                        this.overlay.clear();
                        if (winningPaths.length > 0) {
                            Sound.play('win');
                            console.log('Winner! Paths:', winningPaths.length.valueOf());
                            winningPaths.forEach((path, index) => {
                                console.log(`Winning path ${index + 1}:`, path);
                            });
                            this.drawWinPaths(winningPaths);

                            if (this.winAnimation) {
                                try {
                                    const width = SYMBOL_SIZE * SYMBOLS_PER_REEL;
                                    const height = REEL_HEIGHT * REEL_COUNT + REEL_SPACING * (REEL_COUNT - 1);
                                    this.winAnimation.x = Math.random() * width;
                                    this.winAnimation.y = Math.random() * height;

                                    this.winAnimation.visible = true;
                                    const state = this.winAnimation.state;
                                    const candidates = ['boom', 'win', 'animation', 'idle'];
                                    let chosen: string | undefined = undefined;
                                    for (const name of candidates) {
                                        if (state.hasAnimation(name)) {
                                            chosen = name;
                                            break;
                                        }
                                    }
                                    if (!chosen) {
                                        const list = this.winAnimation.skeleton?.data?.animations;
                                        if (Array.isArray(list) && list.length > 0 && list[0]?.name) {
                                            chosen = list[0].name;
                                        }
                                    }
                                    if (chosen) {
                                        state.setAnimation(0, chosen, false);
                                        state.addListener({
                                            complete: () => {
                                                this.winAnimation && (this.winAnimation.visible = false);
                                            }
                                        });
                                    } else {
                                        this.winAnimation.visible = false;
                                    }
                                } catch (e) {
                                    console.error('Failed to play win animation:', e);
                                    this.winAnimation.visible = false;
                                }
                            }
                        }

                        this.isSpinning = false;

                        if (this.spinButton) {
                            this.spinButton.texture = AssetLoader.getTexture('button_spin.png');
                            this.spinButton.interactive = true;
                        }

                        // Notify listeners that spin has ended
                        (this.container as any).emit?.('spin:end');
                    }, WIN_RESULT_DELAY_MS);
                }
            }, i * REEL_SPIN_DELAY_MS);
        }
    }

    private buildGridFromReels(): (string | undefined)[][] {
        const rowsCount = REEL_COUNT;
        const colsCount = SYMBOLS_PER_REEL;
        const grid: (string | undefined)[][] = [];
        const ordered = this.reels.map(r => r.getVisibleSymbols());
        for (let r = 0; r < rowsCount; r++) {
            const row: (string | undefined)[] = [];
            for (let c = 0; c < colsCount; c++) {
                const nm: string | undefined = (ordered[r][c]?.name ?? undefined);
                row.push(nm);
            }
            grid.push(row);
        }
        return grid;
    }

    private drawWinPaths(paths: { r: number; c: number }[][]): void {
        this.overlay.lineStyle({width: 8, color: 0xffe800, alpha: 1});
        for (const path of paths) {
            if (path.length === 0) continue;
            // Convert grid coords to pixel centers
            const first = path[0];
            const startX = first.c * SYMBOL_SIZE + SYMBOL_SIZE / 2;
            const startY = first.r * (REEL_HEIGHT + REEL_SPACING) + REEL_HEIGHT / 2;
            this.overlay.moveTo(startX, startY);
            for (let i = 1; i < path.length; i++) {
                const pt = path[i];
                const x = pt.c * SYMBOL_SIZE + SYMBOL_SIZE / 2;
                const y = pt.r * (REEL_HEIGHT + REEL_SPACING) + REEL_HEIGHT / 2;
                this.overlay.lineTo(x, y);
            }
        }
    }

    public setSpinButton(button: PIXI.Sprite): void {
        this.spinButton = button;
    }

    private initSpineAnimations(): void {
        try {
            const frameSpineData = AssetLoader.getSpine('base-feature-frame.json');
            if (frameSpineData) {
                this.frameSpine = new Spine(frameSpineData.spineData);

                this.frameSpine.y = (REEL_HEIGHT * REEL_COUNT + REEL_SPACING * (REEL_COUNT - 1)) / 2;
                this.frameSpine.x = (SYMBOL_SIZE * SYMBOLS_PER_REEL) / 2;

                if (this.frameSpine.state.hasAnimation('idle')) {
                    this.frameSpine.state.setAnimation(0, 'idle', true);
                }

                this.container.addChild(this.frameSpine);
                this.container.sortableChildren = true;
                this.frameSpine.zIndex = 3;

                this.sizeBackgroundToFrame();
                this.setBackgroundScale(0.93);
                // Run once on next tick as well to catch any late transform changes
                this.app.ticker.addOnce(() => this.sizeBackgroundToFrame());
            }

            const winSpineData = AssetLoader.getSpine('big-boom-h.json');
            if (winSpineData) {
                this.winAnimation = new Spine(winSpineData.spineData);

                this.winAnimation.x = (REEL_HEIGHT * REEL_COUNT + REEL_SPACING * (REEL_COUNT - 1)) / 2;
                this.winAnimation.y = (SYMBOL_SIZE * SYMBOLS_PER_REEL) / 2;

                this.winAnimation.visible = false;

                this.container.addChild(this.winAnimation);
            }
        } catch (error) {
            console.error('Error initializing spine animations:', error);
        }
    }


    private applyGrid(grid: string[][]): void {
        // Safety checks
        if (grid.length !== REEL_COUNT) {
            console.warn('applyGrid: invalid row count', grid.length);
            return;
        }
        for (let r = 0; r < REEL_COUNT; r++) {
            const row = grid[r];
            if (!row || row.length !== SYMBOLS_PER_REEL) {
                console.warn('applyGrid: invalid columns at row', r, row?.length);
                return;
            }
        }
        // Apply to reels
        for (let r = 0; r < REEL_COUNT; r++) {
            this.reels[r].setColumns(grid[r]);
        }
        // Clear old overlays and recompute wins next
        this.overlay.clear();
    }

    public forceStraightWinInAnyColumn(): void {
        ForceWinHelper.forceStraightWinInAnyColumn(
            REEL_COUNT,
            SYMBOLS_PER_REEL,
            SYMBOL_TEXTURES_LIST,
            () => this.isSpinning,
            () => this.nextStraightIsHorizontal,
            (val) => {
                this.nextStraightIsHorizontal = val;
            },
            (grid) => {
                this.preSpinForcedGrid = grid;
            },
            () => this.spin(),
            (grid) => GameCoreLogic.computeWins(grid)
        );
    }

    public forceRandomDiagonalWin(): void {
        ForceWinHelper.forceRandomDiagonalWin(
            REEL_COUNT,
            SYMBOLS_PER_REEL,
            SYMBOL_TEXTURES_LIST,
            () => this.isSpinning,
            (grid) => {
                this.preSpinForcedGrid = grid;
            },
            () => this.spin(),
            (g) => GameCoreLogic.computeWins(g)
        );
    }

    public forceRandomStraightConnectingLineWin(): void {
        ForceWinHelper.forceRandomStraightConnectingLineWin(
            REEL_COUNT,
            SYMBOLS_PER_REEL,
            SYMBOL_TEXTURES_LIST,
            () => this.isSpinning,
            (grid) => {
                this.preSpinForcedGrid = grid;
            },
            () => this.spin(),
            (g) => GameCoreLogic.computeWins(g)
        );
    }

}
