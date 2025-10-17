/**
 * Unit tests for SlotMachine.ts (UI-less, Node environment)
 * We mock PIXI, Reel, AssetLoader, Spine, and sound to isolate SlotMachine behavior.
 */

import {jest} from '@jest/globals';

import * as PIXI from 'pixi.js';
import {SlotMachine} from '../../src/slots/SlotMachine';

// --- Mocks ---

// Mock pixi.js with minimal classes used by SlotMachine
jest.mock('pixi.js', () => {
    class Container {
        public x = 0;
        public y = 0;
        public children: any[] = [];

        addChild(..._c: any[]) { /* no-op */
        }

        addListener() { /* no-op */
        }
    }

    class Graphics {
        lineStyle(_: any) { /* no-op */
            return this;
        }

        moveTo(_: number, __: number) { /* no-op */
            return this;
        }

        lineTo(_: number, __: number) { /* no-op */
            return this;
        }

        clear() { /* no-op */
            return this;
        }

        beginFill(_: any, __?: any) { /* no-op */
            return this;
        }

        drawRect(_: number, __: number, ___: number, ____: number) { /* no-op */
            return this;
        }

        endFill() { /* no-op */
            return this;
        }
    }

    class Sprite {
        static from(_: any) {
            return new Sprite({});
        }

        public texture: any;
        public interactive = false;
        public cursor = '';
        public width = 0;
        public height = 0;
        public x = 0;
        public y = 0;
        public anchor = {
            set: (_: number, __?: number) => {
            }
        };
        public name?: string;

        constructor(tex: any) {
            this.texture = tex;
        }
    }

    class Application {
        public screen = {width: 1280, height: 800};
        public stage = new Container();
        public renderer = {
            resize: (_w: number, _h: number) => {
            }
        };
        public ticker = {
            add: (_cb: any) => {
            }
        };
        public view: any = {};

        constructor(_: any) {
        }
    }

    class Text {
    }

    class TextStyle {
    }

    const Assets = {
        init: (_: any) => {
        },
        addBundle: (_: any) => {
        },
        loadBundle: async (_: any) => ({}),
    };
    return {Container, Graphics, Sprite, Application, Text, TextStyle, Assets};
});

// Mock pixi-spine to avoid real Spine usage
jest.mock('pixi-spine', () => ({
    Spine: class {
        public state = {
            hasAnimation: () => false, setAnimation: () => {
            }, addListener: (_: any) => {
            }
        };
        public skeleton = {data: {animations: [] as any[]}};
        public visible = false;
        public x = 0;
        public y = 0;

        constructor(_: any) {
        }
    }
}));

// Mock AssetLoader static methods
jest.mock('../../src/utils/AssetLoader', () => ({
    AssetLoader: class {
        static getTexture(_name: string) {
            return {};
        }

        static getSpine(_name: string) {
            return undefined;
        }
    }
}));

// Capture mocks for sound
const loopMock = jest.fn();
const playMock = jest.fn();
const stopMock = jest.fn();
jest.mock('../../src/utils/Sound', () => ({
    Sound: {
        loop: (alias: string, val: boolean) => loopMock(alias, val),
        play: (alias: string) => playMock(alias),
        stop: (alias: string) => stopMock(alias),
    }
}));

// Mock Reel with minimal behavior so SlotMachine can apply and read grid
jest.mock('../../src/slots/Reel', () => {
    return {
        Reel: class {
            public container: any;
            private _columns: string[];

            constructor(symbolCount: number, _symbolSize: number) {
                this.container = {y: 0};
                // initialize with random-ish per-reel values to avoid accidental wins
                this._columns = Array.from({length: symbolCount}, (_v, i) => `S_${Math.random()}_${i}`);
            }

            update(_delta: number) {
            }

            startSpin() {
            }

            stopSpin() {
            }

            enableManualLock(_lock: boolean) {
            }

            setColumns(names: string[]) {
                this._columns = names.slice();
            }

            getVisibleSymbols() {
                return this._columns.map(n => ({name: n, x: 0}));
            }
        }
    };
});

describe('SlotMachine', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        loopMock.mockClear();
        playMock.mockClear();
        stopMock.mockClear();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    function makeApp(): PIXI.Application {
        // Any provided options are ignored by our mock
        return new (PIXI as any).Application({width: 1280, height: 800});
    }

    test('spin lifecycle plays/loops reel sound and re-enables button after stop', () => {
        // Given
        const app = makeApp();
        const sm = new SlotMachine(app as any);

        // Provide a spin button so SlotMachine can toggle state
        const btn = new (PIXI as any).Sprite({});
        (sm as any).setSpinButton(btn);

        expect(btn.interactive).not.toBe(true);

        // When
        sm.spin();

        // Then
        // During spin
        expect(loopMock).toHaveBeenCalledWith('Reel spin', true);
        expect(playMock).toHaveBeenCalledWith('Reel spin');

        // Fast-forward all timers: start delays, stop scheduling, and final win check delay
        jest.advanceTimersByTime(4000);

        // After stopping
        expect(loopMock).toHaveBeenCalledWith('Reel spin', false);
        expect(stopMock).toHaveBeenCalledWith('Reel spin');

        // Spin button should be re-enabled
        expect(btn.interactive).toBe(true);
    });

    test('when a forced winning grid is applied, win sound is played at the end', () => {
        // Given
        const app = makeApp();
        const sm = new SlotMachine(app as any);

        // Attach a spin button to avoid null checks
        const btn = new (PIXI as any).Sprite({});
        (sm as any).setSpinButton(btn);

        // Force a simple horizontal win on the first row (grid is 4x6 in implementation)
        const rows = 4, cols = 6;
        // Apply forced grid for the upcoming spin
        (sm as any).preSpinForcedGrid = Array.from({length: rows}, (_r, r) =>
            Array.from({length: cols}, (_c, c) => (r === 0 ? 'X' : `N${r}_${c}`))
        );

        // When
        sm.spin();

        // Run timers until completion
        jest.advanceTimersByTime(4000);

        // Then
        // Win path should have been detected and win sound played
        expect(playMock).toHaveBeenCalledWith('win');

        // And the reel spin sound should have been stopped
        expect(stopMock).toHaveBeenCalledWith('Reel spin');
    });
});
