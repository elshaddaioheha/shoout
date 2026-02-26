import React, { useRef, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Dimensions,
    StatusBar,
    PanResponder,
    GestureResponderEvent,
    ActivityIndicator,
    Share,
    Alert,
} from 'react-native';
import {
    ChevronDown,
    Play,
    Pause,
    SkipBack,
    SkipForward,
    Shuffle,
    Repeat,
    Share2,
    Heart,
    MoreHorizontal,
} from 'lucide-react-native';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface FullPlayerProps {
    visible: boolean;
    onClose: () => void;
}

export default function FullPlayer({ visible, onClose }: FullPlayerProps) {
    const { currentTrack, isPlaying, isBuffering, togglePlayPause, position, duration, seekTo } = usePlaybackStore();
    const insets = useSafeAreaInsets();
    const sliderRef = useRef<View>(null);

    const [isSeeking, setIsSeeking] = useState(false);
    const [seekPosition, setSeekPosition] = useState(0);
    const [shuffleActive, setShuffleActive] = useState(false);
    const [repeatActive, setRepeatActive] = useState(false);
    const [liked, setLiked] = useState(false);

    // Keep seekPosition in a ref so PanResponder callbacks always see latest value
    const seekPositionRef = useRef(0);

    if (!currentTrack) return null;

    const formatTime = (millis: number) => {
        if (!millis || millis < 0) return '0:00';
        const totalSeconds = Math.floor(millis / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    const displayPosition = isSeeking ? seekPosition : position;
    const progress = duration > 0 ? Math.min(100, (displayPosition / duration) * 100) : 0;

    const computeSeekPos = (pageX: number, sliderPageX: number, sliderWidth: number): number => {
        const tapX = pageX - sliderPageX;
        const percentage = Math.max(0, Math.min(1, tapX / sliderWidth));
        return percentage * duration;
    };

    // Handle tap on the progress bar to seek
    const handleSliderPress = (e: GestureResponderEvent) => {
        sliderRef.current?.measure((_x, _y, sliderWidth, _h, pageX) => {
            const newPosition = computeSeekPos(e.nativeEvent.pageX, pageX, sliderWidth);
            seekTo(newPosition);
        });
    };

    // PanResponder for drag-to-seek — uses ref to avoid stale closure
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (e) => {
                setIsSeeking(true);
                sliderRef.current?.measure((_x, _y, sliderWidth, _h, pageX) => {
                    const pos = computeSeekPos(e.nativeEvent.pageX, pageX, sliderWidth);
                    seekPositionRef.current = pos;
                    setSeekPosition(pos);
                });
            },
            onPanResponderMove: (e) => {
                sliderRef.current?.measure((_x, _y, sliderWidth, _h, pageX) => {
                    const pos = computeSeekPos(e.nativeEvent.pageX, pageX, sliderWidth);
                    seekPositionRef.current = pos;
                    setSeekPosition(pos);
                });
            },
            onPanResponderRelease: () => {
                seekTo(seekPositionRef.current);
                setIsSeeking(false);
            },
            onPanResponderTerminate: () => {
                setIsSeeking(false);
            },
        })
    ).current;

    const handleShare = async () => {
        try {
            await Share.share({
                message: `🎵 Listening to "${currentTrack.title}" by ${currentTrack.artist} on Shouuts!`,
                title: currentTrack.title,
            });
        } catch (error) {
            // User cancelled or error
        }
    };

    const handleSkipBack = () => {
        // If more than 3 seconds in, restart track; else skip back
        if (position > 3000) {
            seekTo(0);
        }
        // Could add previous-track logic here
    };

    const handleSkipForward = () => {
        // Skip forward 15 seconds
        const newPos = Math.min(position + 15000, duration);
        seekTo(newPos);
    };

    const handleMoreOptions = () => {
        Alert.alert(
            currentTrack.title,
            'Track Options',
            [
                { text: 'Add to Playlist', onPress: () => { } },
                { text: 'Go to Artist', onPress: () => { } },
                { text: 'Share', onPress: handleShare },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

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

                {/* Background Gradient */}
                <View style={StyleSheet.absoluteFill}>
                    <View style={[styles.bgPlaceholder, { backgroundColor: '#1E1A1B' }]} />
                    <LinearGradient
                        colors={['rgba(20,15,16,0.2)', '#140F10']}
                        style={StyleSheet.absoluteFill}
                    />
                </View>

                {/* Header */}
                <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                    <TouchableOpacity onPress={onClose} style={styles.headerButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <ChevronDown size={28} color="white" />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>NOW PLAYING</Text>
                    </View>
                    <TouchableOpacity style={styles.headerButton} onPress={handleMoreOptions} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <MoreHorizontal size={24} color="white" />
                    </TouchableOpacity>
                </View>

                {/* Artwork */}
                <View style={styles.artworkContainer}>
                    <View style={styles.artworkShadow} />
                    <View style={styles.artworkCard}>
                        <LinearGradient
                            colors={['#EC5C39', '#863420']}
                            style={StyleSheet.absoluteFill}
                        />
                        {/* Buffering overlay on artwork */}
                        {isBuffering && (
                            <View style={styles.bufferingOverlay}>
                                <ActivityIndicator size="large" color="white" />
                                <Text style={styles.bufferingText}>Loading...</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Info & Like */}
                <View style={styles.trackInfoContainer}>
                    <View style={styles.trackInfoLeft}>
                        <Text numberOfLines={1} style={styles.trackTitle}>{currentTrack.title}</Text>
                        <Text numberOfLines={1} style={styles.trackArtist}>{currentTrack.artist}</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => setLiked(!liked)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Heart size={28} color={liked ? '#EC5C39' : 'white'} fill={liked ? '#EC5C39' : 'none'} />
                    </TouchableOpacity>
                </View>

                {/* Progress Bar — Seekable */}
                <View style={styles.controlsContainer}>
                    <View style={styles.sliderContainer}>
                        <View
                            ref={sliderRef}
                            style={styles.sliderTouchArea}
                            {...panResponder.panHandlers}
                            onTouchEnd={handleSliderPress}
                        >
                            <View style={styles.sliderBg}>
                                <View style={[styles.sliderFill, { width: `${progress}%` }]} />
                                <View style={[styles.sliderKnob, { left: `${progress}%` }]} />
                            </View>
                        </View>
                        <View style={styles.timeContainer}>
                            <Text style={styles.timeText}>{formatTime(displayPosition)}</Text>
                            <Text style={styles.timeText}>{formatTime(duration)}</Text>
                        </View>
                    </View>

                    {/* Main Controls */}
                    <View style={styles.mainControls}>
                        <TouchableOpacity
                            onPress={() => setShuffleActive(!shuffleActive)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Shuffle size={24} color={shuffleActive ? '#EC5C39' : 'rgba(255,255,255,0.5)'} />
                        </TouchableOpacity>

                        <View style={styles.playbackRow}>
                            <TouchableOpacity
                                onPress={handleSkipBack}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <SkipBack size={36} color="white" fill="white" />
                            </TouchableOpacity>

                            <TouchableOpacity onPress={togglePlayPause} style={styles.playPauseButton}>
                                {isBuffering ? (
                                    <ActivityIndicator size="large" color="black" />
                                ) : isPlaying ? (
                                    <Pause size={40} color="black" fill="black" />
                                ) : (
                                    <Play size={40} color="black" fill="black" style={{ marginLeft: 4 }} />
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleSkipForward}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <SkipForward size={36} color="white" fill="white" />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            onPress={() => setRepeatActive(!repeatActive)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Repeat size={24} color={repeatActive ? '#EC5C39' : 'rgba(255,255,255,0.5)'} />
                        </TouchableOpacity>
                    </View>

                    {/* Bottom Actions */}
                    <View style={styles.bottomActions}>
                        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                            <Share2 size={24} color="white" />
                        </TouchableOpacity>
                        <View style={{ flex: 1 }} />
                        <TouchableOpacity style={styles.lyricsButton}>
                            <Text style={styles.lyricsLabel}>Lyrics</Text>
                        </TouchableOpacity>
                    </View>
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
    bgPlaceholder: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    headerButton: {
        padding: 8,
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        fontFamily: 'Poppins-Bold',
        letterSpacing: 1,
    },
    artworkContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        marginBottom: 40,
    },
    artworkShadow: {
        position: 'absolute',
        width: width * 0.75,
        height: width * 0.75,
        backgroundColor: '#EC5C39',
        borderRadius: 20,
        opacity: 0.15,
        transform: [{ translateY: 20 }, { scale: 0.95 }],
    },
    artworkCard: {
        width: width * 0.8,
        height: width * 0.8,
        borderRadius: 24,
        backgroundColor: '#333',
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    bufferingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
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
        paddingHorizontal: 40,
        marginBottom: 30,
    },
    trackInfoLeft: {
        flex: 1,
        paddingRight: 12,
    },
    trackTitle: {
        color: 'white',
        fontSize: 24,
        fontFamily: 'Poppins-Bold',
    },
    trackArtist: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 18,
        fontFamily: 'Poppins-Regular',
    },
    controlsContainer: {
        paddingHorizontal: 40,
    },
    sliderContainer: {
        marginBottom: 30,
    },
    sliderTouchArea: {
        height: 30,
        justifyContent: 'center',
    },
    sliderBg: {
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 2,
        width: '100%',
        position: 'relative',
        justifyContent: 'center',
    },
    sliderFill: {
        height: '100%',
        backgroundColor: '#EC5C39',
        borderRadius: 2,
    },
    sliderKnob: {
        position: 'absolute',
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: 'white',
        transform: [{ translateX: -7 }],
        top: -5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    timeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    timeText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        fontFamily: 'Poppins-Regular',
    },
    mainControls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 40,
    },
    playbackRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 30,
    },
    playPauseButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
    },
    bottomActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButton: {
        padding: 8,
    },
    lyricsButton: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
    },
    lyricsLabel: {
        color: 'white',
        fontSize: 12,
        fontFamily: 'Poppins-SemiBold',
    },
});
