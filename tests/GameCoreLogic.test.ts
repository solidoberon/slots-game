import {GameCoreLogic, GridCoord} from '../src/core/GameCoreLogic';

/**
 * Helper to pretty print a path for debugging failures.
 */
const pathToStr = (p: GridCoord[]) => p.map(pt => `(${pt.r},${pt.c})`).join('->');

describe('GameCoreLogic.computeWins', () => {
    test('detects a full horizontal row win only', () => {
        // Given
        const grid = [
            ['A', 'A', 'A', 'A', 'A', 'A'],
            ['B', 'C', 'D', 'E', 'A', 'B'],
            ['B', 'C', 'D', 'E', 'B', 'C'],
            ['B', 'C', 'D', 'E', 'A', 'B']
        ];

        // When
        const wins = GameCoreLogic.computeWins(grid);

        // Then
        expect(wins.straight).toHaveLength(1);
        expect(wins.diagonal).toHaveLength(0);
        expect(wins.adjacency).toHaveLength(0);
        expect(wins.straight[0]).toEqual([
            {r: 0, c: 0}, {r: 0, c: 1}, {r: 0, c: 2}, {r: 0, c: 3}, {r: 0, c: 4}, {r: 0, c: 5},
        ]);
    });

    test('detects a vertical straight win only', () => {
        // Given
        const grid = [
            ['X', 'A', 'B', 'C', 'C', 'B'],
            ['X', 'C', 'D', 'A', 'E', 'F'],
            ['X', 'E', 'F', 'D', 'F', 'E'],
            ['X', 'G', 'H', 'E', 'A', 'A'],
        ];

        // When
        const wins = GameCoreLogic.computeWins(grid);

        // Then
        // One vertical straight, slope 0
        expect(wins.straight).toHaveLength(1);
        const path = wins.straight[0];
        expect(path).toEqual([
            {r: 0, c: 0},
            {r: 1, c: 0},
            {r: 2, c: 0},
            {r: 3, c: 0},
        ]);
    });

    test('detects a diagonal straight (+1 slope) only', () => {
        // Given
        const grid = [
            ['Q', 'W', 'E', 'R', 'A', 'B'],
            ['A', 'Q', 'S', 'D', 'E', 'F'],
            ['Z', 'X', 'Q', 'V', 'C', 'D'],
            ['Z', 'X', 'F', 'Q', 'C', 'D'],
        ];
        // Force a +1 diagonal of Q from (0,0)->(3,3)
        const forced = grid.map(row => row.slice());
        forced[0][0] = 'Q';
        forced[1][1] = 'Q';
        forced[2][2] = 'Q';
        forced[3][3] = 'Q';

        // When
        const wins = GameCoreLogic.computeWins(forced);

        // Then
        expect(wins.adjacency).toHaveLength(0);
        expect(wins.diagonal.length).toBeGreaterThanOrEqual(1);
        // Ensure one of the diagonal paths is our expected diagonal
        const diag = wins.diagonal.find(p => p.length === 4 && p[0].r === 0 && p[0].c === 0 && p[1].r === 1 && p[1].c === 1 && p[2].r === 2 && p[2].c === 2 && p[3].r === 3 && p[3].c === 3);
        if (!diag) {
            const dbg = wins.diagonal.map(pathToStr).join(', ');
            throw new Error(`Expected diagonal path (0,0)->(3,3). Found diagonal paths: ${dbg}`);
        }
        expect(diag).toBeTruthy();
    });

    test('detects adjacency (non-straight) path only and filters straight-like adjacency', () => {
        // Given
        // 6 rows x 4 columns grid (6x4), with a zigzag path of 'Z' from top to bottom - delta column (dc) alternates: +1, -1
        const grid: string[][] = [
            // c: 0   1   2   3   4   5
            ['A', 'Z', 'A', 'A', 'E', 'G'], // r0, c1
            ['B', 'A', 'Z', 'B', 'F', 'F'], // r1, c2
            ['C', 'Z', 'A', 'D', 'C', 'E'], // r2, c1
            ['A', 'A', 'Z', 'E', 'B', 'D'], // r3, c2
        ];

        // When
        const wins = GameCoreLogic.computeWins(grid);

        // Then
        // No full rows/columns or perfect diagonals here; should be adjacency-only
        expect(wins.straight).toHaveLength(0);
        expect(wins.diagonal).toHaveLength(0);
        expect(wins.adjacency.length).toBeGreaterThanOrEqual(1);

        // Given
        // Now build a straight-like (vertical) path in column 1 — must be categorized as straight, not adjacency
        const grid2: string[][] = [
            // c: 0   1   2   3   4   5
            ['A', 'Z', 'A', 'A', 'E', 'G'], // r0, c1
            ['B', 'Z', 'E', 'B', 'F', 'F'], // r1, c1
            ['C', 'Z', 'A', 'D', 'C', 'E'], // r2, c1
            ['A', 'Z', 'F', 'E', 'B', 'D'], // r3, c1
        ];

        // When
        const wins2 = GameCoreLogic.computeWins(grid2);

        // Then
        // Vertical column should be a single straight line; adjacency category must not include it
        expect(wins2.adjacency).toHaveLength(0);  // filtered out as straight
        expect(wins2.straight).toHaveLength(1);   // exactly one vertical straight
    });
});

describe('GameCoreLogic.checkWin', () => {
    test('aggregates all paths', () => {
        // Given
        const grid = [
            ['A', 'A', 'A', 'A', 'A', 'A'],
            ['B', 'B', 'B', 'B', 'B', 'B'],
            ['C', 'D', 'E', 'A', 'C', 'G'],
            ['A', 'B', 'F', 'E', 'C', 'G'],
        ];

        // When
        const {winningPaths, wins} = GameCoreLogic.checkWin(grid);

        // Then
        expect(wins.straight).toHaveLength(2);
        expect(winningPaths.length).toBe(wins.straight.length + wins.diagonal.length + wins.adjacency.length);
    });
});
