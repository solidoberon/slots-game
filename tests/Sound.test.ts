/**
 * Unit tests for src/utils/Sound.ts using a mocked Howl from 'howler'.
 */
import {Sound} from '../src/utils/Sound';

const playMock = jest.fn();
const stopMock = jest.fn();
const loopMock = jest.fn();
const unloadMock = jest.fn();

jest.mock('howler', () => {
    return {
        Howl: jest.fn().mockImplementation(() => ({
            play: playMock,
            stop: stopMock,
            loop: loopMock,
            unload: unloadMock,
        })),
    };
});

describe('sound registry', () => {
    beforeEach(() => {
        playMock.mockClear();
        stopMock.mockClear();
        loopMock.mockClear();
        unloadMock.mockClear();
    });

    test('add registers a sound and unloads if alias already existed', () => {
        // First add
        Sound.add('click', 'assets/sounds/click.webm');
        expect(unloadMock).not.toHaveBeenCalled();

        // Add again with same alias should unload previous
        Sound.add('click', 'assets/sounds/click2.webm');
        expect(unloadMock).toHaveBeenCalledTimes(1);
    });

    test('play warns when alias is missing and does not throw', () => {
        // Given
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {
        });

        // When
        Sound.play('missing');

        // Then
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Sound alias not found: missing'));
        warnSpy.mockRestore();
    });

    test('play/stop/loop call underlying Howl methods', () => {
        // Given
        Sound.add('spin', 'assets/sounds/spin.webm');
        Sound.play('spin');
        Sound.loop('spin', true);
        Sound.stop('spin');

        // Then
        expect(playMock).toHaveBeenCalledTimes(1);
        expect(loopMock).toHaveBeenCalledWith(true);
        expect(stopMock).toHaveBeenCalledTimes(1);
    });

    test('methods handle exceptions gracefully and log errors', () => {
        // Given
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {
        });

        // Force Howl.play to throw
        playMock.mockImplementationOnce(() => {
            throw new Error('boom');
        });

        // When
        Sound.add('boom', 'assets/sounds/boom.webm');
        Sound.play('boom');

        // Then
        expect(errorSpy).toHaveBeenCalled();
        errorSpy.mockRestore();
    });
});
