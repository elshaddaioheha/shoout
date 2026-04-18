import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useToastStore } from '@/store/useToastStore';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';
import { useAppTheme } from '@/hooks/use-app-theme';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { usePlayerControls } from '@/hooks/usePlayerControls';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import React from 'react';
import {
    GestureResponderEvent,
    Image,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type MiniPlayerProps = {
    onPress?: () => void;
};

function useMiniPlayerStyles() {
    const appTheme = useAppTheme();
    return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function MiniPlayer({ onPress }: MiniPlayerProps) {
    const appTheme = useAppTheme();
    const reduceMotion = useReducedMotion();
    const screenReaderEnabled = useAccessibilityStore((state) => state.screenReaderEnabled);
    const styles = useMiniPlayerStyles();
    const { showToast } = useToastStore();
    const { handlePrevious } = usePlayerControls();

    const {
        currentTrack,
        isPlaying,
        isBuffering,
        togglePlayPause,
        playNextTrack,
        clearTrack,
        position,
        duration,
    } = usePlaybackStore();
    const insets = useSafeAreaInsets();

    const handlePreviousPress = () => {
        handlePrevious({
            onGoToPreviousTrack: () => showToast('Playing previous track.', 'info'),
            onRestart: () => showToast('Track restarted.', 'info'),
            onError: (error) => {
                console.error('MiniPlayer previous track failed:', error);
                showToast('Could not change previous track.', 'error');
            },
        });
    };

    const handlePlayPausePress = async () => {
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
            await togglePlayPause();
            showToast(isPlaying ? 'Playback paused.' : 'Playback resumed.', 'info');
        } catch (error) {
            console.error('MiniPlayer play/pause failed:', error);
            showToast('Could not change playback state.', 'error');
        }
    };

    const handleNextPress = async () => {
        try {
            await playNextTrack();
            showToast('Playing next track.', 'info');
        } catch (error) {
            console.error('MiniPlayer next track failed:', error);
            showToast('Could not play next track.', 'error');
        }
    };

    const handleClearTrack = async () => {
        try {
            await clearTrack();
            showToast('Player cleared.', 'info');
        } catch (error) {
            console.error('MiniPlayer clear track failed:', error);
            showToast('Could not clear track.', 'error');
        }
    };

    if (!currentTrack) return null;

    const tabHeight = Platform.OS === 'ios' ? 90 : (60 + insets.bottom);
    const bottomPos = tabHeight + 8;
    const progress = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;
    const glassBackground = appTheme.isDark ? 'rgba(20, 15, 16, 0.46)' : 'rgba(255,255,255,0.72)';
    const glassBorder = appTheme.colors.borderStrong;
    const blurIntensity = reduceMotion ? 0 : 34;

    return (
        <>
            {/* Mini Player bar */}
            <Pressable
                style={[
                    styles.container,
                    {
                        bottom: bottomPos,
                        backgroundColor: glassBackground,
                        borderColor: glassBorder,
                    },
                ]}
                onPress={onPress}
                android_ripple={{ color: appTheme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(23,18,19,0.06)' }}
            >
                <BlurView intensity={blurIntensity} tint={appTheme.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />

                {/* Content layer above BlurView */}
                <View style={styles.content}>
                    {/* Artwork */}
                    <View style={styles.artworkContainer}>
                        {currentTrack.artworkUrl ? (
                            <Image source={{ uri: currentTrack.artworkUrl }} style={styles.artwork} />
                        ) : (
                            <Icon name="music" size={20} color={appTheme.colors.primary} />
                        )}
                    </View>

                    {/* Title & Artist */}
                    <View style={styles.textContainer}>
                        <Text style={styles.title} numberOfLines={1}>{currentTrack.title}</Text>
                        <Text style={styles.artist} numberOfLines={1}>{currentTrack.artist}</Text>
                    </View>

                    {/* Controls – each stops the Pressable from opening the full player */}
                    <View style={styles.controls}>
                        <IconButton
                            style={styles.controlButton}
                            onPress={(e: GestureResponderEvent) => { e.stopPropagation(); handlePreviousPress(); }}
                            icon="skip-back"
                            size={20}
                            color={appTheme.colors.textPrimary}
                            fill
                            accessibilityRole="button"
                            accessibilityLabel="Previous track"
                            accessibilityHint={screenReaderEnabled ? 'Plays the previous track in the queue.' : undefined}
                        />

                        <IconButton
                            style={styles.controlButton}
                            onPress={(e: GestureResponderEvent) => { e.stopPropagation(); handlePlayPausePress(); }}
                            accessibilityRole="button"
                            accessibilityLabel={isPlaying ? 'Pause track' : 'Play track'}
                            accessibilityState={{ selected: isPlaying }}
                            accessibilityHint={screenReaderEnabled ? (isPlaying ? 'Pauses current playback.' : 'Starts current playback.') : undefined}
                        >
                            {isBuffering ? (
                                <View style={styles.bufferingDot} />
                            ) : isPlaying ? (
                                <Icon name="pause" size={24} color={appTheme.colors.textPrimary} fill />
                            ) : (
                                <Icon name="play" size={24} color={appTheme.colors.textPrimary} fill />
                            )}
                        </IconButton>

                        <IconButton
                            style={styles.controlButton}
                            onPress={(e: GestureResponderEvent) => { e.stopPropagation(); handleNextPress(); }}
                            icon="skip-forward"
                            size={20}
                            color={appTheme.colors.textPrimary}
                            fill
                            accessibilityRole="button"
                            accessibilityLabel="Next track"
                            accessibilityHint={screenReaderEnabled ? 'Plays the next track in the queue.' : undefined}
                        />

                        <IconButton
                            style={styles.controlButton}
                            onPress={(e: GestureResponderEvent) => { e.stopPropagation(); handleClearTrack(); }}
                            icon="x"
                            size={18}
                            color={appTheme.colors.textDisabled}
                            accessibilityRole="button"
                            accessibilityLabel="Clear player"
                            accessibilityHint={screenReaderEnabled ? 'Stops playback and clears the current track.' : undefined}
                        />
                    </View>
                </View>

                {/* Progress bar pinned to the very bottom */}
                <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${progress}%` as any }]} />
                </View>
            </Pressable>

        </>
    );
}

const legacyStyles = {
    container: {
        position: 'absolute',
        left: 8,
        right: 8,
        height: 68,
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: 'rgba(26, 21, 24, 0.9)',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.1)',
        zIndex: 1000,
    },
    content: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        justifyContent: 'space-between',
        // Reserve bottom space for progress bar
        paddingBottom: 4,
    },
    artworkContainer: {
        width: 42,
        height: 42,
        borderRadius: 8,
        backgroundColor: 'rgba(236, 92, 57, 0.12)',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        marginRight: 10,
    },
    artwork: {
        width: '100%',
        height: '100%',
    },
    textContainer: {
        flex: 1,
        marginRight: 8,
    },
    title: {
        ...typography.chip,
        color: '#FFF',
    },
    artist: {
        ...typography.small,
        color: 'rgba(255,255,255,0.55)',
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    controlButton: {
        minWidth: spacing.touchTarget,
        minHeight: spacing.touchTarget,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.sm,
        borderRadius: 20,
    },
    bufferingDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#fff',
        borderTopColor: 'transparent',
    },
    progressTrack: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#EC5C39',
        borderRadius: 1,
    },
};
