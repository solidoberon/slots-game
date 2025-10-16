import fs from 'fs';
import path from 'path';
import {GameConstants} from "./src/consts/GameConstants";

// Same getFiles function as before (filter by extensions)
function getFiles(dir: string, allowedExtensions: string[]): string[] {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter(file => {
        const fullPath = path.join(dir, file);
        return fs.statSync(fullPath).isFile() && allowedExtensions.some(ext => file.toLowerCase().endsWith(ext));
    });
}

const assets = {
    images: getFiles(GameConstants.IMAGES_MANIFEST_PATH, ['.png']),
    spines: getFiles(GameConstants.SPINES_MANIFEST_PATH, ['.json']),
    sounds: getFiles(GameConstants.SOUNDS_MANIFEST_PATH, ['.webm', '.mp3']),
};

// Create dist/assets folder if missing
if (!fs.existsSync(GameConstants.ASSETS_DIR)) {
    fs.mkdirSync(GameConstants.ASSETS_DIR, { recursive: true });
}

const MANIFEST_PATH = path.join(GameConstants.ASSETS_DIR, 'asset-manifest.json');
fs.writeFileSync(MANIFEST_PATH, JSON.stringify(assets, null, 2));

console.log(`Asset manifest generated at ${MANIFEST_PATH}`);
