import {Howl} from 'howler';

const registry: Map<string, Howl> = new Map();

export const Sound = {
    add: (alias: string, url: string): void => {
        try {
            const existing = registry.get(alias);
            if (existing) {
                existing.unload();
            }
            const howl = new Howl({src: [url]});
            registry.set(alias, howl);
        } catch (e) {
            console.error(`Failed to add sound '${alias}' from ${url}:`, e);
        }
    },
    play: (alias: string): void => {
        const howl = registry.get(alias);
        if (!howl) {
            console.warn(`Sound alias not found: ${alias}`);
            return;
        }
        try {
            howl.play();
        } catch (e) {
            console.error(`Failed to play sound '${alias}':`, e);
        }
    },
    stop: (alias: string): void => {
        const howl = registry.get(alias);
        if (!howl) return;
        try {
            howl.stop();
        } catch (e) {
            console.error(`Failed to stop sound '${alias}':`, e);
        }
    },
    loop: (alias: string, value: boolean): void => {
        const howl = registry.get(alias);
        if (!howl) return;
        try {
            howl.loop(value);
        } catch (e) {
            console.error(`Failed to set loop on sound '${alias}':`, e);
        }
    }
};
