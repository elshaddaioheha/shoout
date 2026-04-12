import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useToastStore } from '@/store/useToastStore';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { BlurView } from 'expo-blur';
import { Music, Pause, Play, SkipBack, SkipForward, X } from 'lucide-react-native';
import React from 'react';
import {
    Image,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FullPlayer from './FullPlayer';

function useMiniPlayerStyles() {
    const appTheme = useAppTheme();
    return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function MiniPlayer() {
    const appTheme = useAppTheme();
    const reduceMotion = useReducedMotion();
    const styles = useMiniPlayerStyles();
    const { showToast } = useToastStore();

    const {
        currentTrack,
        isPlaying,
        isBuffering,
        togglePlayPause,
        playNextTrack,
        playPreviousTrack,
        clearTrack,
        position,
        duration,
    } = usePlaybackStore();
    const [isFullPlayerVisible, setIsFullPlayerVisible] = React.useState(false);
    const previousTapTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const insets = useSafeAreaInsets();

    const handlePreviousPress = () => {
        const windowMs = 260;

        if (previousTapTimeoutRef.current) {
            clearTimeout(previousTapTimeoutRef.current);
            previousTapTimeoutRef.current = null;
            playPreviousTrack({ goToPreviousTrack: true }).catch((error) => {
                console.error('MiniPlayer double-tap previous failed:', error);
                showToast('Could not play previous track.', 'error');
            });
            showToast('Playing previous track.', 'info');
            return;
        }

        previousTapTimeoutRef.current = setTimeout(() => {
            previousTapTimeoutRef.current = null;
            playPreviousTrack().catch((error) => {
                console.error('MiniPlayer restart track failed:', error);
                showToast('Could not restart track.', 'error');
            });
            showToast('Track restarted.', 'info');
        }, windowMs);
    };

    const handlePlayPausePress = async () => {
        try {
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

    React.useEffect(() => {
        return () => {
            if (previousTapTimeoutRef.current) {
                clearTimeout(previousTapTimeoutRef.current);
                previousTapTimeoutRef.current = null;
            }
        };
    }, []);

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
                onPress={() => setIsFullPlayerVisible(true)}
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
                            <Music size={20} color={appTheme.colors.primary} />
                        )}
                    </View>

                    {/* Title & Artist */}
                    <View style={styles.textContainer}>
                        <Text style={styles.title} numberOfLines={1}>{currentTrack.title}</Text>
                        <Text style={styles.artist} numberOfLines={1}>{currentTrack.artist}</Text>
                    </View>

                    {/* Controls – each stops the Pressable from opening the full player */}
                    <View style={styles.controls}>
                        <TouchableOpacity
                            style={styles.controlButton}
                            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                            onPress={(e) => { e.stopPropagation(); handlePreviousPress(); }}
                        >
                            <SkipBack size={20} color={appTheme.colors.textPrimary} fill={appTheme.colors.textPrimary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.controlButton}
                            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                            onPress={(e) => { e.stopPropagation(); handlePlayPausePress(); }}
                        >
                            {isBuffering ? (
                                <View style={styles.bufferingDot} />
                            ) : isPlaying ? (
                                <Pause size={24} color={appTheme.colors.textPrimary} fill={appTheme.colors.textPrimary} />
                            ) : (
                                <Play size={24} color={appTheme.colors.textPrimary} fill={appTheme.colors.textPrimary} />
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.controlButton}
                            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                            onPress={(e) => { e.stopPropagation(); handleNextPress(); }}
                        >
                            <SkipForward size={20} color={appTheme.colors.textPrimary} fill={appTheme.colors.textPrimary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.controlButton}
                            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                            onPress={(e) => { e.stopPropagation(); handleClearTrack(); }}
                        >
                            <X size={18} color={appTheme.colors.textDisabled} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Progress bar pinned to the very bottom */}
                <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${progress}%` as any }]} />
                </View>
            </Pressable>

            {/* Full Screen Player */}
            <FullPlayer
                visible={isFullPlayerVisible}
                onClose={() => setIsFullPlayerVisible(false)}
            />
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
        borderWidth: 1,
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
        color: '#FFF',
        fontSize: 13,
        fontFamily: 'Poppins-SemiBold',
    },
    artist: {
        color: 'rgba(255,255,255,0.55)',
        fontSize: 11,
        fontFamily: 'Poppins-Regular',
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    controlButton: {
        padding: 6,
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
