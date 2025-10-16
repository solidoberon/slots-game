export class GameConstants {
    // ==============================================
    // Game related parameters
    // ==============================================
    public static readonly REEL_COUNT: number = 4;
    public static readonly SYMBOLS_PER_REEL: number = 6;
    public static readonly SYMBOL_SIZE: number = 150;
    public static readonly REEL_HEIGHT: number = GameConstants.SYMBOL_SIZE;
    public static readonly REEL_SPACING: number = 10;
    public static readonly SPIN_SPEED = 50;
    public static readonly SLOWDOWN_RATE = 0.65;
    public static readonly WIN_RESULT_DELAY_MS = 200;
    public static readonly REEL_SPIN_DELAY_MS = 400;

    // ==============================================
    // Asset related parameters
    // ==============================================
    // Source asset folders for manifest generation (Node.js will use these raw strings)
    public static readonly IMAGES_MANIFEST_PATH = 'src/assets/images';
    public static readonly SPINES_MANIFEST_PATH = 'src/assets/spines';
    public static readonly SOUNDS_MANIFEST_PATH = 'src/assets/sounds';

    // Output directory for manifest and assets (relative to project root, for Node.js scripts)
    public static readonly ASSETS_DIR = 'dist/assets';

    // Frontend asset base paths (relative URLs from the server root)
    public static readonly IMAGES_PATH = '/assets/images';
    public static readonly SPINES_PATH = '/assets/spines';
    public static readonly SOUNDS_PATH = '/assets/sounds';

}