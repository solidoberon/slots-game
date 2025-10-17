import {GameConstants} from "../consts/GameConstants";

export type GridCoord = { r: number; c: number };

export interface WinsResult {
    // All symbols in a horizontal row or vertical column match
    straight: GridCoord[][];
    // All symbols form a diagonal line from top to bottom (slope of +1 or -1)
    diagonal: GridCoord[][];
    // All symbols form a connected path from the top row to the bottom row
    adjacency: GridCoord[][];
}

const {
    REEL_COUNT,
    SYMBOLS_PER_REEL
} = GameConstants;

/**
 * A class to compute winning paths for a slot machine grid.
 */
export class GameCoreLogic {
    /**
     * Computes all win paths for a given symbol grid.
     * The grid is an array of rows, each an array of symbol names.
     * @param grid The 4x6 grid of symbols.
     * @returns A WinsResult object categorizing all winning paths.
     */
    static computeWins(grid: (string | undefined)[][]): WinsResult {
        if (!this.isValidGrid(grid)) {
            console.error("Invalid grid provided.");
            return {straight: [], diagonal: [], adjacency: []};
        }

        const horizontalWins = this.findHorizontalWins(grid);
        const verticalWins = this.findVerticalWins(grid);
        const diagonalWins = this.findDiagonalWins(grid);
        const adjacencyWins = this.findAdjacencyWins(grid);

        // Straight wins are a combination of horizontal and vertical wins.
        const straight = [...horizontalWins, ...verticalWins];

        // Adjacency wins should not include paths that are also straight or diagonal lines.
        const adjacencyFiltered = adjacencyWins.filter(
            (p) => !this.isStraightOrDiagonalPath(p)
        );

        // Deduplicate paths in case a single path qualifies for multiple categories
        // before filtering. This is a safeguard.
        return {
            straight: this.dedupePaths(straight),
            diagonal: this.dedupePaths(diagonalWins),
            adjacency: this.dedupePaths(adjacencyFiltered),
        };
    }

    /**
     * A method that wraps computeWins and returns all paths in a single array,
     * matching the format expected by the calling game logic.
     * @param grid The 4x6 grid of symbols.
     * @returns An object containing a single `allPaths` array with all winning combinations.
     */
    static checkWin(grid: (string | undefined)[][]): { winningPaths: GridCoord[][]; wins: WinsResult } {
        const wins = this.computeWins(grid);
        const allPaths = [...wins.straight, ...wins.diagonal, ...wins.adjacency];
        return {winningPaths: allPaths, wins};
    }

    /**
     * Checks if the grid is valid (correct dimensions).
     */
    private static isValidGrid(grid: (string | undefined)[][]): boolean {
        if (!grid || grid.length !== REEL_COUNT) {
            return false;
        }
        for (const row of grid) {
            if (!row || row.length !== SYMBOLS_PER_REEL) {
                return false;
            }
        }
        return true;
    }

    /**
     * Finds all horizontal winning lines (full rows of the same symbol) from left to right.
     */
    private static findHorizontalWins(grid: (string | undefined)[][]): GridCoord[][] {
        const wins: GridCoord[][] = [];
        for (let r = 0; r < REEL_COUNT; r++) {
            const firstSymbol = grid[r][0];
            if (firstSymbol && grid[r].every((symbol) => symbol === firstSymbol)) {
                const path: GridCoord[] = [];
                for (let c = 0; c < SYMBOLS_PER_REEL; c++) {
                    path.push({r, c});
                }
                wins.push(path);
            }
        }
        return wins;
    }

    /**
     * Finds all vertical winning lines (full columns of the same symbol) from top to bottom.
     */
    private static findVerticalWins(grid: (string | undefined)[][]): GridCoord[][] {
        const wins: GridCoord[][] = [];
        for (let c = 0; c < SYMBOLS_PER_REEL; c++) {
            const firstSymbol = grid[0][c];
            if (firstSymbol) {
                let allMatch = true;
                for (let r = 1; r < REEL_COUNT; r++) {
                    if (grid[r][c] !== firstSymbol) {
                        allMatch = false;
                        break;
                    }
                }
                if (allMatch) {
                    const path: GridCoord[] = [];
                    for (let r = 0; r < REEL_COUNT; r++) {
                        path.push({r, c});
                    }
                    wins.push(path);
                }
            }
        }
        return wins;
    }

    /**
     * Finds all diagonal winning lines that span from the top row to the bottom row.
     */
    private static findDiagonalWins(grid: (string | undefined)[][]): GridCoord[][] {
        const wins: GridCoord[][] = [];

        // Check for diagonals with slope +1 (top-left to bottom-right)
        for (let c = 0; c <= SYMBOLS_PER_REEL - REEL_COUNT; c++) {
            const firstSymbol = grid[0][c];
            if (firstSymbol) {
                let allMatch = true;
                const path: GridCoord[] = [{r: 0, c: c}];
                for (let r = 1; r < REEL_COUNT; r++) {
                    if (grid[r][c + r] !== firstSymbol) {
                        allMatch = false;
                        break;
                    }
                    path.push({r, c: c + r});
                }
                if (allMatch) wins.push(path);
            }
        }

        // Check for diagonals with slope -1 (top-right to bottom-left)
        for (let c = SYMBOLS_PER_REEL - 1; c >= REEL_COUNT - 1; c--) {
            const firstSymbol = grid[0][c];
            if (firstSymbol) {
                let allMatch = true;
                const path: GridCoord[] = [{r: 0, c: c}];
                for (let r = 1; r < REEL_COUNT; r++) {
                    if (grid[r][c - r] !== firstSymbol) {
                        allMatch = false;
                        break;
                    }
                    path.push({r, c: c - r});
                }
                if (allMatch) wins.push(path);
            }
        }

        return wins;
    }

    /**
     * Finds all connecting paths of same symbols from the top row to the bottom row.
     * Uses a Breadth-First Search (BFS) approach.
     */
    private static findAdjacencyWins(grid: (string | undefined)[][]): GridCoord[][] {
        const allPaths: GridCoord[][] = [];
        // 1. Flatten grid and fetch unique symbols through Set
        const uniqueSymbols = new Set(grid.flat().filter(Boolean) as string[]);

        for (const symbol of uniqueSymbols) {
            // 2. Start a search for each occurrence of the symbol in the top row
            for (let c = 0; c < SYMBOLS_PER_REEL; c++) {
                if (grid[0][c] === symbol) {
                    // 3. BFS queue items carry both current coord and the full path
                    /**
                     Each queue entry stores:
                     coord: the current cell to expand.
                     path: the sequence of cells from the start to coord.
                     */
                    const queue: { coord: GridCoord; path: GridCoord[] }[] = [
                        {coord: {r: 0, c}, path: [{r: 0, c}]},
                    ];
                    // 4. Visited set to prevent reprocessing the same cell in this search
                    const visited = new Set<string>([`0,${c}`]);

                    while (queue.length > 0) {
                        const {coord, path} = queue.shift()!;

                        // 5. If we've reached the bottom row, we found a winning path
                        if (coord.r === REEL_COUNT - 1) {
                            allPaths.push(path);
                            // Continue searching for other paths, but don't extend this one
                            continue;
                        }

                        // 6. Expanding neighbors: down-left, down, down-right
                        /**
                         * dc is “delta column.” It tries moving left (-1), staying (0), or right (+1) while always moving down one row.
                         * Boundary checks ensure nextC is in [0, SYMBOLS_PER_REEL).
                         * The neighbor must contain the same symbol to be considered part of the path.
                         * newPath is created via spread to avoid mutating other branches.
                         */
                        for (const dc of [-1, 0, 1]) {
                            const nextR = coord.r + 1;
                            const nextC = coord.c + dc;
                            const visitedKey = `${nextR},${nextC}`;

                            if (
                                nextC >= 0 &&
                                nextC < SYMBOLS_PER_REEL &&
                                !visited.has(visitedKey) &&
                                grid[nextR][nextC] === symbol
                            ) {
                                visited.add(visitedKey);
                                const newPath = [...path, {r: nextR, c: nextC}];
                                queue.push({coord: {r: nextR, c: nextC}, path: newPath});
                            }
                        }
                    }
                }
            }
        }
        return allPaths;
    }

    /**
     * Determines if a path is a straight or diagonal line.
     * A path is straight if the column delta between steps is constant.
     */
    private static isStraightOrDiagonalPath(path: GridCoord[]): boolean {
        if (path.length <= 1) {
            return true; // A single point is trivially straight.
        }
        const deltaC = path[1].c - path[0].c;
        for (let i = 2; i < path.length; i++) {
            // Check for consistent row and column steps
            const currentDeltaR = path[i].r - path[i - 1].r;
            const currentDeltaC = path[i].c - path[i - 1].c;
            if (currentDeltaR !== 1 || currentDeltaC !== deltaC) {
                return false;
            }
        }
        return true;
    }

    /**
     * Removes duplicate paths from an array of paths.
     */
    private static dedupePaths(paths: GridCoord[][]): GridCoord[][] {
        const seen = new Set<string>();
        const result: GridCoord[][] = [];
        for (const path of paths) {
            // Sort in ascending order to ensure paths with same coords but different order are treated as same
            const sortedPath = [...path].sort((a, b) => a.r - b.r || a.c - b.c);
            const key = sortedPath.map((p) => `${p.r},${p.c}`).join("-");
            if (!seen.has(key)) {
                seen.add(key);
                result.push(path);
            }
        }
        return result;
    }
}

