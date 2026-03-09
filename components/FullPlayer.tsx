import { usePlaybackStore } from '@/store/usePlaybackStore';
import { LinearGradient } from 'expo-linear-gradient';
import {
    ChevronDown,
    Heart,
    MoreHorizontal,
    Pause,
    Play,
    Repeat,
    Share2,
    Shuffle,
    SkipBack,
    SkipForward,
} from 'lucide-react-native';
import React, { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    LayoutChangeEvent,
    Modal,
    PanResponder,
    Share,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

interface FullPlayerProps {
    visible: boolean;
    onClose: () => void;
}

export default function FullPlayer({ visible, onClose }: FullPlayerProps) {
    const {
        currentTrack,
        isPlaying,
        isBuffering,
        togglePlayPause,
        skipForward,
        skipBack,
        seekTo,
        position,
        duration,
        repeatActive,
        setRepeat,
    } = usePlaybackStore();
    const insets = useSafeAreaInsets();

    const [shuffleActive, setShuffleActive] = useState(false);
    const [liked, setLiked] = useState(false);

    // Slider state
    const sliderWidth = useRef(0);
    const isDragging = useRef(false);
    const [dragProgress, setDragProgress] = useState<number | null>(null); // 0–1, null when idle
    const knobAnim = useRef(new Animated.Value(0)).current;

    const displayProgress = dragProgress !== null ? dragProgress : (duration > 0 ? position / duration : 0);
    const clampedProgress = Math.min(1, Math.max(0, displayProgress));

    const formatTime = (millis: number) => {
        if (!millis || millis < 0) return '0:00';
        const totalSeconds = Math.floor(millis / 1000);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const getSeekPosFromPageX = useCallback((pageX: number, sliderPageX: number): number => {
        const tapX = pageX - sliderPageX;
        const pct = Math.max(0, Math.min(1, tapX / sliderWidth.current));
        return pct * duration;
    }, [duration]);

    // Measure the slider's on-screen position when we need it
    const sliderRef = useRef<View>(null);
    const sliderPageXRef = useRef(0);
    const measureSlider = () => {
        sliderRef.current?.measureInWindow((x, _y, _w, _h) => {
            sliderPageXRef.current = x;
        });
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (e) => {
                isDragging.current = true;
                const pct = Math.max(0, Math.min(1, (e.nativeEvent.pageX - sliderPageXRef.current) / (sliderWidth.current || 1)));
                setDragProgress(pct);
                Animated.spring(knobAnim, { toValue: 1, useNativeDriver: true, speed: 30 }).start();
            },
            onPanResponderMove: (e) => {
                const pct = Math.max(0, Math.min(1, (e.nativeEvent.pageX - sliderPageXRef.current) / (sliderWidth.current || 1)));
                setDragProgress(pct);
            },
            onPanResponderRelease: (e) => {
                const pct = Math.max(0, Math.min(1, (e.nativeEvent.pageX - sliderPageXRef.current) / (sliderWidth.current || 1)));
                isDragging.current = false;
                setDragProgress(null);
                Animated.spring(knobAnim, { toValue: 0, useNativeDriver: true, speed: 30 }).start();
                seekTo(pct * (usePlaybackStore.getState().duration));
            },
            onPanResponderTerminate: () => {
                isDragging.current = false;
                setDragProgress(null);
                Animated.spring(knobAnim, { toValue: 0, useNativeDriver: true, speed: 30 }).start();
            },
        })
    ).current;

    const handleSliderLayout = (e: LayoutChangeEvent) => {
        sliderWidth.current = e.nativeEvent.layout.width;
        sliderRef.current?.measureInWindow((x) => {
            sliderPageXRef.current = x;
        });
    };

    const handleShare = async () => {
        if (!currentTrack) return;
        try {
            await Share.share({
                message: `🎵 Listening to "${currentTrack.title}" by ${currentTrack.artist} on Shoouts!`,
                title: currentTrack.title,
            });
        } catch (_) { }
    };

    const handleMoreOptions = () => {
        if (!currentTrack) return;
        Alert.alert(currentTrack.title, 'Track Options', [
            { text: 'Add to Playlist', onPress: () => { } },
            { text: 'Go to Artist', onPress: () => { } },
            { text: 'Share', onPress: handleShare },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    if (!currentTrack) return null;

    const knobScale = knobAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] });

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View style={styles.container}>
                <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

                {/* Background */}
                <LinearGradient
                    colors={['#2a1a18', '#140F10', '#0e0b0c']}
                    style={StyleSheet.absoluteFill}
                />

                {/* Header */}
                <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                    <TouchableOpacity
                        onPress={onClose}
                        style={styles.headerButton}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <ChevronDown size={30} color="white" />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerLabel}>NOW PLAYING</Text>
                        <Text style={styles.headerTrackName} numberOfLines={1}>{currentTrack.title}</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={handleMoreOptions}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <MoreHorizontal size={26} color="white" />
                    </TouchableOpacity>
                </View>

                {/* Artwork */}
                <View style={styles.artworkContainer}>
                    <View style={styles.artworkShadow} />
                    <View style={styles.artworkCard}>
                        <LinearGradient
                            colors={['#EC5C39', '#7a2e1c']}
                            style={StyleSheet.absoluteFill}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        />
                        {isBuffering && (
                            <View style={styles.bufferingOverlay}>
                                <ActivityIndicator size="large" color="white" />
                                <Text style={styles.bufferingText}>Loading...</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Track Info & Like */}
                <View style={styles.trackInfoContainer}>
                    <View style={styles.trackInfoLeft}>
                        <Text numberOfLines={1} style={styles.trackTitle}>{currentTrack.title}</Text>
                        <Text numberOfLines={1} style={styles.trackArtist}>{currentTrack.artist}</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => setLiked(!liked)}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        style={styles.likeButton}
                    >
                        <Heart
                            size={28}
                            color={liked ? '#EC5C39' : 'white'}
                            fill={liked ? '#EC5C39' : 'none'}
                        />
                    </TouchableOpacity>
                </View>

                {/* Seekable Progress Slider */}
                <View style={styles.sliderContainer}>
                    <View
                        ref={sliderRef}
                        style={styles.sliderTouchArea}
                        onLayout={handleSliderLayout}
                        onStartShouldSetResponder={() => true}
                        {...panResponder.panHandlers}
                        onResponderGrant={measureSlider}
                    >
                        <View style={styles.sliderTrack}>
                            {/* Filled portion */}
                            <View style={[styles.sliderFill, { width: `${clampedProgress * 100}%` as any }]} />
                            {/* Draggable knob */}
                            <Animated.View
                                style={[
                                    styles.sliderKnob,
                                    {
                                        left: `${clampedProgress * 100}%` as any,
                                        transform: [{ translateX: -8 }, { scale: knobScale }],
                                    },
                                ]}
                            />
                        </View>
                    </View>

                    {/* Time Labels */}
                    <View style={styles.timeRow}>
                        <Text style={styles.timeText}>{formatTime(clampedProgress * duration)}</Text>
                        <Text style={styles.timeText}>{formatTime(duration)}</Text>
                    </View>
                </View>

                {/* Controls */}
                <View style={styles.controlsContainer}>
                    {/* Shuffle */}
                    <TouchableOpacity
                        onPress={() => setShuffleActive(v => !v)}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <Shuffle
                            size={24}
                            color={shuffleActive ? '#EC5C39' : 'rgba(255,255,255,0.45)'}
                            strokeWidth={shuffleActive ? 2.5 : 1.8}
                        />
                    </TouchableOpacity>

                    {/* Playback Row */}
                    <View style={styles.playbackRow}>
                        {/* Skip Back 15s */}
                        <TouchableOpacity
                            onPress={() => skipBack(15)}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            style={styles.skipButton}
                        >
                            <SkipBack size={34} color="white" fill="white" />
                        </TouchableOpacity>

                        {/* Play / Pause */}
                        <TouchableOpacity
                            onPress={togglePlayPause}
                            style={styles.playPauseButton}
                            activeOpacity={0.75}
                        >
                            {isBuffering ? (
                                <ActivityIndicator size="large" color="#140F10" />
                            ) : isPlaying ? (
                                <Pause size={38} color="#140F10" fill="#140F10" />
                            ) : (
                                <Play size={38} color="#140F10" fill="#140F10" style={{ marginLeft: 4 }} />
                            )}
                        </TouchableOpacity>

                        {/* Skip Forward 15s */}
                        <TouchableOpacity
                            onPress={() => skipForward(15)}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            style={styles.skipButton}
                        >
                            <SkipForward size={34} color="white" fill="white" />
                        </TouchableOpacity>
                    </View>

                    {/* Repeat */}
                    <TouchableOpacity
                        onPress={() => setRepeat(!repeatActive)}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <Repeat
                            size={24}
                            color={repeatActive ? '#EC5C39' : 'rgba(255,255,255,0.45)'}
                            strokeWidth={repeatActive ? 2.5 : 1.8}
                        />
                    </TouchableOpacity>
                </View>

                {/* Bottom Row */}
                <View style={[styles.bottomRow, { paddingBottom: insets.bottom + 16 }]}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={handleShare}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Share2 size={22} color="rgba(255,255,255,0.7)" />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }} />
                    <TouchableOpacity style={styles.lyricsButton}>
                        <Text style={styles.lyricsLabel}>Lyrics</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#140F10',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    headerButton: {
        padding: 6,
        minWidth: 44,
        alignItems: 'center',
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerLabel: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 10,
        fontFamily: 'Poppins-Bold',
        letterSpacing: 2,
    },
    headerTrackName: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 13,
        fontFamily: 'Poppins-SemiBold',
        maxWidth: 200,
    },
    artworkContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 24,
    },
    artworkShadow: {
        position: 'absolute',
        width: width * 0.76,
        height: width * 0.76,
        backgroundColor: '#EC5C39',
        borderRadius: 24,
        opacity: 0.18,
        transform: [{ translateY: 18 }, { scale: 0.94 }],
    },
    artworkCard: {
        width: width * 0.78,
        height: width * 0.78,
        borderRadius: 24,
        backgroundColor: '#333',
        overflow: 'hidden',
        elevation: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 24,
    },
    bufferingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.45)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    bufferingText: {
        color: 'white',
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
        marginTop: 8,
    },
    trackInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 36,
        marginBottom: 24,
    },
    trackInfoLeft: {
        flex: 1,
        paddingRight: 12,
    },
    trackTitle: {
        color: 'white',
        fontSize: 22,
        fontFamily: 'Poppins-Bold',
    },
    trackArtist: {
        color: 'rgba(255,255,255,0.55)',
        fontSize: 16,
        fontFamily: 'Poppins-Regular',
        marginTop: 2,
    },
    likeButton: {
        padding: 4,
    },
    sliderContainer: {
        paddingHorizontal: 36,
        marginBottom: 28,
    },
    sliderTouchArea: {
        height: 36,
        justifyContent: 'center',
    },
    sliderTrack: {
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: 2,
        position: 'relative',
        overflow: 'visible',
    },
    sliderFill: {
        height: '100%',
        backgroundColor: '#EC5C39',
        borderRadius: 2,
    },
    sliderKnob: {
        position: 'absolute',
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: 'white',
        top: -6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 4,
        elevation: 4,
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    timeText: {
        color: 'rgba(255,255,255,0.45)',
        fontSize: 12,
        fontFamily: 'Poppins-Regular',
    },
    controlsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 36,
        marginBottom: 36,
    },
    playbackRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 24,
    },
    skipButton: {
        padding: 4,
    },
    playPauseButton: {
        width: 78,
        height: 78,
        borderRadius: 39,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#EC5C39',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    bottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 36,
    },
    actionButton: {
        padding: 8,
    },
    lyricsButton: {
        backgroundColor: 'rgba(255,255,255,0.07)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    lyricsLabel: {
        color: 'white',
        fontSize: 13,
        fontFamily: 'Poppins-SemiBold',
    },
});
