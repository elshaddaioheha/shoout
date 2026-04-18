import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useCallback, useEffect, useRef } from 'react';

type PreviousTapCallbacks = {
    onRestart?: () => void;
    onGoToPreviousTrack?: () => void;
    onError?: (error: unknown) => void;
};

export function usePlayerControls() {
    const { playPreviousTrack } = usePlaybackStore();
    const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return () => {
            if (tapTimeoutRef.current) {
                clearTimeout(tapTimeoutRef.current);
                tapTimeoutRef.current = null;
            }
        };
    }, []);

    const handlePrevious = useCallback((callbacks?: PreviousTapCallbacks) => {
        if (tapTimeoutRef.current) {
            clearTimeout(tapTimeoutRef.current);
            tapTimeoutRef.current = null;
            playPreviousTrack({ goToPreviousTrack: true })
                .then(() => callbacks?.onGoToPreviousTrack?.())
                .catch((error) => callbacks?.onError?.(error));
            return;
        }

        tapTimeoutRef.current = setTimeout(() => {
            tapTimeoutRef.current = null;
            playPreviousTrack()
                .then(() => callbacks?.onRestart?.())
                .catch((error) => callbacks?.onError?.(error));
        }, 260);
    }, [playPreviousTrack]);

    return { handlePrevious };
}