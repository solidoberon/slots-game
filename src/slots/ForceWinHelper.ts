import type {GridCoord} from '../core/GameCoreLogic';
import type {WinsResult} from '../core/GameCoreLogic';

/**
 * Pure helper utilities for generating and evaluating data related to "force a win" features.
 * These helpers are intentionally stateless and do not depend on PIXI/SlotMachine internals.
 */
export class ForceWinHelper {
    /**
     * Pick a random symbol name from provided list.
     */
    static randomSymbolName(symbols: string[]): string {
        if (!symbols || symbols.length === 0) throw new Error('randomSymbolName: empty symbol list');
        const i = Math.floor(Math.random() * symbols.length);
        return symbols[i];
    }

    /**
     * Build a random grid of (rows x cols) filled with symbols from the provided list.
     * Optionally exclude a specific symbol to prevent accidental extra wins around a forced path.
     */
    static makeRandomGrid(rows: number, cols: number, symbols: string[], excludeSymbol?: string): string[][] {
        if (rows <= 0 || cols <= 0) throw new Error('makeRandomGrid: invalid dimensions');
        const pool = (excludeSymbol ? symbols.filter(n => n !== excludeSymbol) : symbols);
        if (pool.length === 0) throw new Error('makeRandomGrid: empty pool');

        const grid: string[][] = Array.from({length: rows}, () => Array(cols).fill(''));
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                grid[r][c] = pool[Math.floor(Math.random() * pool.length)];
            }
        }
        return grid;
    }

    /**
     * Compute the horizontal step (slope in columns per row) of a straight path, if determinable.
     * Returns null if the path has fewer than two points.
     */
    static slopeOfPath(path: GridCoord[]): number | null {
        if (!path || path.length < 2) return null;
        return path[1].c - path[0].c;
    }

    /**
     * Generate a grid that has exactly one straight-line win, either a full horizontal row or a full vertical column.
     * The target orientation is controlled by wantHorizontal toggle. Returns a grid and the next toggle value on success; otherwise null.
     */
    static getStraightWinGrid(
        rows: number,
        cols: number,
        symbols: string[],
        wantHorizontal: boolean,
        validate: (grid: string[][]) => WinsResult
    ): { grid: string[][]; nextHorizontal: boolean } | null {
        const sym = this.randomSymbolName(symbols);
        let attempts = 0;
        const maxAttempts = 300;
        while (attempts++ < maxAttempts) {
            const grid = this.makeRandomGrid(rows, cols, symbols, sym);
            if (wantHorizontal) {
                const r = Math.floor(Math.random() * rows);
                for (let c = 0; c < cols; c++) grid[r][c] = sym;
                const wins = validate(grid);
                const onlyStraight = (wins.straight.length === 1) && (wins.diagonal.length === 0) && (wins.adjacency.length === 0);
                const path = wins.straight[0];
                const isHorizontal = onlyStraight && path && path.length === cols && path.every(pt => pt.r === path[0].r);
                if (isHorizontal) return {grid, nextHorizontal: !wantHorizontal};
            } else {
                const c = Math.floor(Math.random() * cols);
                for (let r = 0; r < rows; r++) grid[r][c] = sym;
                const wins = validate(grid);
                const onlyStraight = (wins.straight.length == 1) && (wins.diagonal.length == 0) && (wins.adjacency.length == 0);
                const k = onlyStraight ? this.slopeOfPath(wins.straight[0]) : null;
                const isVertical = onlyStraight && k === 0;
                if (isVertical) return {grid, nextHorizontal: !wantHorizontal};
            }
        }
        // Fallback honoring current orientation
        const fallback = this.makeRandomGrid(rows, cols, symbols, sym);
        if (wantHorizontal) {
            const rr = Math.floor(Math.random() * rows);
            for (let c = 0; c < cols; c++) fallback[rr][c] = sym;
        } else {
            const cc = Math.floor(Math.random() * cols);
            for (let r = 0; r < rows; r++) fallback[r][cc] = sym;
        }
        return {grid: fallback, nextHorizontal: !wantHorizontal};
    }

    /**
     * Generate a grid with exactly one straight diagonal win (slope +1 or -1). Returns null if not found in attempts.
     */
    static generateRandomDiagonalWin(
        rows: number,
        cols: number,
        symbols: string[],
        validate: (grid: string[][]) => WinsResult
    ): string[][] | null {
        const sym = this.randomSymbolName(symbols);
        let attempts = 0;
        const maxAttempts = 200;
        while (attempts++ < maxAttempts) {
            const k: 1 | -1 = Math.random() < 0.5 ? -1 : 1;
            let minC0: number, maxC0: number;
            if (k >= 0) {
                minC0 = 0;
                maxC0 = cols - 1 - k * (rows - 1);
            } else {
                minC0 = -k * (rows - 1);
                maxC0 = cols - 1;
            }
            if (minC0 > maxC0) continue;
            const c0 = Math.floor(minC0 + Math.random() * (maxC0 - minC0 + 1));
            const grid = this.makeRandomGrid(rows, cols, symbols, sym);
            for (let r = 0; r < rows; r++) {
                const c = c0 + k * r;
                grid[r][c] = sym;
            }
            const wins = validate(grid);
            const ok = (wins.straight.length == 0) && (wins.adjacency.length == 0) && (wins.diagonal.length == 1);
            if (ok) return grid;
        }
        return null;
    }

    /**
     * Generate a grid that has exactly one adjacency-based connecting path from top to bottom that is not a straight line.
     * Returns null if not found in attempts.
     */
    static generateRandomStraightConnectingLineWin(
        rows: number,
        cols: number,
        symbols: string[],
        validate: (grid: string[][]) => WinsResult
    ): string[][] | null {
        const sym = this.randomSymbolName(symbols);
        const maxAttempts = 200;
        let attempts = 0;
        while (attempts++ < maxAttempts) {
            const grid = this.makeRandomGrid(rows, cols, symbols, sym);

            // Build a non-straight, adjacency-based path from top to bottom.
            const steps: number[] = [];
            const colsPath: number[] = [];
            let c = Math.floor(Math.random() * cols);
            colsPath.push(c);
            for (let r = 0; r < rows - 1; r++) {
                const choices = [-1, 0, 1].filter(dc => c + dc >= 0 && c + dc < cols);
                let dc = choices[Math.floor(Math.random() * choices.length)];
                if (r === rows - 2) {
                    const allEqual = steps.length > 0 && steps.every(s => s === steps[0]);
                    if (allEqual) {
                        const alt = choices.filter(x => x !== steps[0]);
                        if (alt.length > 0) dc = alt[Math.floor(Math.random() * alt.length)];
                    }
                }
                steps.push(dc);
                c = c + dc;
                colsPath.push(c);
            }
            const allZero = steps.every(s => s === 0);
            const allPos = steps.every(s => s === 1);
            const allNeg = steps.every(s => s === -1);
            if (allZero || allPos || allNeg) continue; // reject straight

            // Paint the path
            for (let r = 0; r < rows; r++) {
                const cc = colsPath[r];
                grid[r][cc] = sym;
            }

            const wins = validate(grid);
            const ok = (wins.straight.length == 0) && (wins.diagonal.length == 0) && (wins.adjacency.length == 1);
            if (ok) return grid;
        }
        return null;
    }

    /**
     * High-level: Try to produce a diagonal win; if not possible, fall back to a straight win.
     * Returns a grid and, when falling back to straight, the toggled nextHorizontal value.
     */
    static getDiagonalWinGrid(
        rows: number,
        cols: number,
        symbols: string[],
        validate: (grid: string[][]) => WinsResult
    ): { grid: string[][]; } | null {
        // Keep retrying until we find a diagonal win; do not fall back to straight.
        // Diagonal doesn't consume/toggle horizontal/vertical preference.
        while (true) {
            const diagonal = this.generateRandomDiagonalWin(rows, cols, symbols, validate);
            if (diagonal) {
                return {grid: diagonal};
            }
        }
    }

    /**
     * High-level: Keep retrying until we produce a non-straight adjacency connecting win; no fallback.
     */
    static getConnectingOrRandomGrid(
        rows: number,
        cols: number,
        symbols: string[],
        validate: (grid: string[][]) => WinsResult
    ): string[][] {
        // Do not fall back to a random grid; continuously attempt until a valid connecting path is generated.
        while (true) {
            const connected = this.generateRandomStraightConnectingLineWin(rows, cols, symbols, validate);
            if (connected) return connected;
        }
    }

    // Orchestrator (UI-callback friendly) helpers that keep SlotMachine free of business logic
    static forceStraightWinInAnyColumn(
        rows: number,
        cols: number,
        symbols: string[],
        getIsSpinning: () => boolean,
        getNextHorizontal: () => boolean,
        setNextHorizontal: (val: boolean) => void,
        setForcedGrid: (grid: string[][]) => void,
        spin: () => void,
        validate: (grid: string[][]) => WinsResult
    ): void {
        if (getIsSpinning()) return;
        const res = ForceWinHelper.getStraightWinGrid(
            rows,
            cols,
            symbols,
            getNextHorizontal(),
            validate
        );
        if (res) {
            setForcedGrid(res.grid);
            setNextHorizontal(res.nextHorizontal);
            spin();
        }
    }

    static forceRandomDiagonalWin(
        rows: number,
        cols: number,
        symbols: string[],
        getIsSpinning: () => boolean,
        setForcedGrid: (grid: string[][]) => void,
        spin: () => void,
        validate: (grid: string[][]) => WinsResult
    ): void {
        if (getIsSpinning()) return;
        const res = ForceWinHelper.getDiagonalWinGrid(
            rows,
            cols,
            symbols,
            validate
        );
        if (!res) return;
        setForcedGrid(res.grid);
        spin();
    }

    static forceRandomStraightConnectingLineWin(
        rows: number,
        cols: number,
        symbols: string[],
        getIsSpinning: () => boolean,
        setForcedGrid: (grid: string[][]) => void,
        spin: () => void,
        validate: (grid: string[][]) => WinsResult
    ): void {
        if (getIsSpinning()) return;
        const grid = ForceWinHelper.getConnectingOrRandomGrid(
            rows,
            cols,
            symbols,
            validate
        );
        setForcedGrid(grid);
        spin();
    }
}

