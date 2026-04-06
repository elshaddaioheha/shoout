import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useCartStore } from '@/store/useCartStore';
import { useToastStore } from '@/store/useToastStore';
import { auth, db } from '@/firebaseConfig';
import { useAppTheme } from '@/hooks/use-app-theme';
import { adaptLegacyColor, adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
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
import React, { useCallback, useEffect, useRef, useState } from 'react';
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

function useFullPlayerStyles() {
    const appTheme = useAppTheme();
    return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function FullPlayer({ visible, onClose }: FullPlayerProps) {
    const appTheme = useAppTheme();
    const styles = useFullPlayerStyles();
    const mutedControlColor = adaptLegacyColor('rgba(255,255,255,0.45)', 'color', appTheme);
    const darkIconOnLight = adaptLegacyColor('#140F10', 'color', appTheme);

    const router = useRouter();
    const { addItem } = useCartStore();
    const { showToast } = useToastStore();
    const {
        currentTrack,
        isPlaying,
        isBuffering,
        togglePlayPause,
        playNextTrack,
        playPreviousTrack,
        seekTo,
        position,
        duration,
        repeatActive,
        setRepeat,
        queue,
        currentTrackIndex,
    } = usePlaybackStore();
    const insets = useSafeAreaInsets();

    const [shuffleActive, setShuffleActive] = useState(false);
    const [liked, setLiked] = useState(false);
    const [alreadyPurchased, setAlreadyPurchased] = useState(false);
    const [showTotalOnRight, setShowTotalOnRight] = useState(false);

    // Slider state
    const sliderWidth = useRef(0);
    const [sliderTrackWidth, setSliderTrackWidth] = useState(0);
    const isDragging = useRef(false);
    const [dragProgress, setDragProgress] = useState<number | null>(null); // 0–1, null when idle
    const knobAnim = useRef(new Animated.Value(0)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;
    const heartAnim = useRef(new Animated.Value(0)).current;
    const playPauseAnim = useRef(new Animated.Value(0)).current;

    const displayProgress = dragProgress !== null ? dragProgress : (duration > 0 ? position / duration : 0);
    const clampedProgress = Math.min(1, Math.max(0, displayProgress));
    const elapsed = clampedProgress * duration;
    const remaining = Math.max(0, duration - elapsed);

    const deriveArtworkAccents = useCallback((artworkUrl?: string) => {
        const lower = artworkUrl?.toLowerCase() ?? '';
        if (lower.includes('balloon')) {
            return {
                warmA: '#FAD44D',
                warmB: '#EC5C39',
                greenA: '#4D9D5E',
                greenB: '#2E6B45',
                textSoft: 'rgba(255, 247, 226, 0.85)',
            };
        }

        return {
            warmA: '#F1C552',
            warmB: '#EA6A3C',
            greenA: '#6FA56F',
            greenB: '#3A7A54',
            textSoft: 'rgba(255, 244, 224, 0.85)',
        };
    }, []);

    const accents = deriveArtworkAccents(currentTrack?.artworkUrl);

    const nextTrack = queue[currentTrackIndex + 1] ?? null;

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
        setSliderTrackWidth(e.nativeEvent.layout.width);
        sliderRef.current?.measureInWindow((x) => {
            sliderPageXRef.current = x;
        });
    };

    useEffect(() => {
        if (isDragging.current) {
            progressAnim.setValue(clampedProgress);
            return;
        }

        Animated.timing(progressAnim, {
            toValue: clampedProgress,
            duration: 160,
            useNativeDriver: false,
        }).start();
    }, [clampedProgress, progressAnim]);

    useEffect(() => {
        Animated.spring(heartAnim, {
            toValue: liked ? 1 : 0,
            speed: 18,
            bounciness: 9,
            useNativeDriver: true,
        }).start();
    }, [heartAnim, liked]);

    useEffect(() => {
        Animated.spring(playPauseAnim, {
            toValue: isPlaying ? 1 : 0,
            speed: 16,
            bounciness: 8,
            useNativeDriver: true,
        }).start();
    }, [isPlaying, playPauseAnim]);

    const handleShare = async () => {
        if (!currentTrack) return;
        try {
            await Share.share({
                message: `🎵 Listening to "${currentTrack.title}" by ${currentTrack.artist} on Shoouts!`,
                title: currentTrack.title,
            });
        } catch (_) { }
    };

    const addCurrentTrackToPlaylist = async () => {
        if (!currentTrack?.id || !currentTrack.uploaderId) {
            showToast('Track reference is missing.', 'error');
            return;
        }

        const uid = auth.currentUser?.uid;
        if (!uid) {
            showToast('Log in to add tracks to playlists.', 'error');
            router.push({ pathname: '/(auth)/login', params: { redirectTo: '/(tabs)/index' } });
            return;
        }

        try {
            const uploadRef = doc(db, `users/${currentTrack.uploaderId}/uploads/${currentTrack.id}`);
            const uploadSnap = await getDoc(uploadRef);

            if (!uploadSnap.exists()) {
                showToast('Track is not available for playlist use.', 'error');
                return;
            }

            const uploadData = uploadSnap.data() as any;
            if (uploadData.published !== true || uploadData.isPublic !== true) {
                showToast('Only published tracks can be added to playlists.', 'info');
                return;
            }

            const playlistQ = query(
                collection(db, 'globalPlaylists'),
                where('ownerId', '==', uid),
                limit(1)
            );
            const playlistSnap = await getDocs(playlistQ);

            let playlistId = '';
            if (playlistSnap.empty) {
                const created = await addDoc(collection(db, 'globalPlaylists'), {
                    ownerId: uid,
                    name: 'My Playlist',
                    isPublic: false,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
                playlistId = created.id;
            } else {
                playlistId = playlistSnap.docs[0].id;
                await setDoc(doc(db, `globalPlaylists/${playlistId}`), {
                    updatedAt: serverTimestamp(),
                }, { merge: true });
            }

            const trackRefId = `${currentTrack.id}_${currentTrack.uploaderId}`;
            await setDoc(doc(db, `globalPlaylists/${playlistId}/tracks/${trackRefId}`), {
                uploadId: currentTrack.id,
                uploaderId: currentTrack.uploaderId,
                titleSnapshot: currentTrack.title,
                artistSnapshot: currentTrack.artist,
                artworkSnapshot: currentTrack.artworkUrl || null,
                addedAt: serverTimestamp(),
            }, { merge: true });

            showToast(`${currentTrack.title} added to your playlist.`, 'success');
        } catch (error) {
            console.error('Add to playlist failed:', error);
            showToast('Could not add track to playlist right now.', 'error');
        }
    };

    const quickAddToCart = () => {
        if (!currentTrack) return;
        addItem({
            id: currentTrack.id,
            title: currentTrack.title,
            artist: currentTrack.artist,
            price: 0,
            audioUrl: currentTrack.url,
            uploaderId: currentTrack.uploaderId || '',
            category: 'Track',
        });
        showToast('Track added to cart.', 'success');
    };

    const handleMoreOptions = () => {
        if (!currentTrack) return;
        Alert.alert(currentTrack.title, 'Track Options', [
            { text: liked ? 'Remove from Favourites' : 'Add to Favourites', onPress: () => { toggleFavourite(); } },
            { text: 'Add to Playlist', onPress: () => { addCurrentTrackToPlaylist(); } },
            { text: 'Add to Cart', onPress: quickAddToCart },
            {
                text: 'Go to Artist',
                onPress: () => {
                    if (!currentTrack.uploaderId) {
                        showToast('Artist profile is unavailable for this track.', 'info');
                        return;
                    }
                    router.push({ pathname: '/profile/[id]', params: { id: currentTrack.uploaderId } } as any);
                }
            },
            { text: 'Share', onPress: handleShare },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    useEffect(() => {
        const uid = auth.currentUser?.uid;
        if (!uid || !currentTrack?.id) {
            setLiked(false);
            setAlreadyPurchased(false);
            return;
        }

        const favRef = doc(db, `users/${uid}/favourites`, currentTrack.id);
        const unsubFav = onSnapshot(favRef, (snap) => setLiked(snap.exists()));

        const purchaseQ = query(
            collection(db, `users/${uid}/purchases`),
            where('trackId', '==', currentTrack.id),
            limit(1)
        );
        const unsubPurchase = onSnapshot(purchaseQ, (snap) => setAlreadyPurchased(!snap.empty));

        return () => {
            unsubFav();
            unsubPurchase();
        };
    }, [currentTrack?.id]);

    if (!currentTrack) return null;

    const toggleFavourite = async () => {
        const uid = auth.currentUser?.uid;
        if (!uid || !currentTrack) {
            showToast('Sign in to save favourites.', 'info');
            return;
        }

        const favRef = doc(db, `users/${uid}/favourites`, currentTrack.id);

        try {
            if (liked) {
                await deleteDoc(favRef);
                showToast('Removed from favourites.', 'info');
            } else {
                await setDoc(favRef, {
                    id: currentTrack.id,
                    title: currentTrack.title,
                    artist: currentTrack.artist,
                    url: currentTrack.url,
                    uploaderId: currentTrack.uploaderId || '',
                    addedAt: new Date().toISOString(),
                });
                showToast('Added to favourites.', 'success');
            }
        } catch (_err) {
            showToast('Could not update favourite right now.', 'error');
        }
    };

    const handlePurchase = () => {
        if (!currentTrack) return;

        if (!auth.currentUser) {
            showToast('Please sign in to purchase tracks.', 'error');
            router.push({ pathname: '/(auth)/login', params: { redirectTo: '/cart' } });
            return;
        }

        if (alreadyPurchased) {
            showToast('You already purchased this track.', 'info');
            return;
        }

        addItem({
            id: currentTrack.id,
            title: currentTrack.title,
            artist: currentTrack.artist,
            price: 0,
            audioUrl: currentTrack.url,
            uploaderId: currentTrack.uploaderId || '',
            category: 'Track',
        });

        showToast('Track added to cart. Complete purchase in cart.', 'success');
        onClose();
        router.push('/cart');
    };

    const knobScale = knobAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] });
    const knobGlow = knobAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
    const heartScale = heartAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
    const playScale = playPauseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.96] });
    const animatedFillWidth = Animated.multiply(progressAnim, sliderTrackWidth || 1);
    const animatedKnobX = Animated.multiply(progressAnim, sliderTrackWidth || 1);
    const albumMeta = ((currentTrack as any)?.albumName as string | undefined) || 'Single';
    const releaseYear = ((currentTrack as any)?.releaseYear as string | number | undefined) || '2025';

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View style={styles.container}>
                <StatusBar barStyle={appTheme.isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

                {/* Background */}
                <LinearGradient
                    colors={[accents.greenB, appTheme.colors.background, appTheme.colors.backgroundElevated]}
                    style={StyleSheet.absoluteFill}
                />

                {/* Header */}
                <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                    <TouchableOpacity
                        onPress={onClose}
                        style={styles.headerButton}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <ChevronDown size={30} color={appTheme.colors.textPrimary} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerLabel}>NOW PLAYING</Text>
                        <Text style={styles.headerTrackName} numberOfLines={1}>{currentTrack.title}</Text>
                        <TouchableOpacity
                            style={styles.queueChip}
                            onPress={() => Alert.alert('Up Next', nextTrack ? `${nextTrack.title} • ${nextTrack.artist}` : 'No track queued next yet.')}
                            activeOpacity={0.82}
                        >
                            <Text style={[styles.queueChipText, { color: accents.textSoft }]}>Up Next</Text>
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={handleMoreOptions}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <MoreHorizontal size={26} color={appTheme.colors.textPrimary} />
                    </TouchableOpacity>
                </View>

                {/* Artwork */}
                <View style={styles.artworkContainer}>
                    <View style={styles.artworkShadow} />
                    <View style={styles.artworkCard}>
                        <LinearGradient
                            colors={[accents.warmA, accents.warmB]}
                            style={StyleSheet.absoluteFill}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        />
                        {currentTrack.artworkUrl ? (
                            <Image source={{ uri: currentTrack.artworkUrl }} style={styles.artworkImage} contentFit="cover" />
                        ) : null}
                        {isBuffering && (
                            <View style={styles.bufferingOverlay}>
                                <ActivityIndicator size="large" color={appTheme.colors.textPrimary} />
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
                        <Text numberOfLines={1} style={[styles.trackMeta, { color: accents.textSoft }]}>{`${albumMeta} • ${releaseYear}`}</Text>
                    </View>
                    <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                        <TouchableOpacity
                            onPress={toggleFavourite}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            style={styles.likeButton}
                        >
                            <Heart
                                size={30}
                                color={liked ? accents.warmA : appTheme.colors.textPrimary}
                                fill={liked ? accents.warmB : 'none'}
                            />
                        </TouchableOpacity>
                    </Animated.View>
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
                            <Animated.View style={[styles.sliderFill, { width: animatedFillWidth }]}> 
                                <LinearGradient
                                    colors={[accents.warmA, accents.warmB]}
                                    start={{ x: 0, y: 0.5 }}
                                    end={{ x: 1, y: 0.5 }}
                                    style={StyleSheet.absoluteFill}
                                />
                            </Animated.View>
                            {/* Draggable knob */}
                            <Animated.View
                                style={[
                                    styles.sliderKnob,
                                    {
                                        left: animatedKnobX,
                                        transform: [{ translateX: -10 }, { scale: knobScale }],
                                        borderColor: accents.warmA,
                                        shadowColor: accents.warmA,
                                        opacity: knobGlow,
                                    },
                                ]}
                            />
                        </View>
                    </View>

                    {/* Time Labels */}
                    <View style={styles.timeRow}>
                        <Text style={styles.timeTextStrong}>{formatTime(elapsed)}</Text>
                        <TouchableOpacity onPress={() => setShowTotalOnRight((v) => !v)}>
                            <Text style={styles.timeTextStrong}>{showTotalOnRight ? formatTime(duration) : `-${formatTime(remaining)}`}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Controls */}
                <View style={styles.controlsContainer}>
                    <TouchableOpacity
                        onPress={() => setShuffleActive(v => !v)}
                        hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                        style={[styles.modeButton, shuffleActive && { borderColor: accents.greenA, backgroundColor: 'rgba(111,165,111,0.15)' }]}
                    >
                        <Shuffle
                            size={22}
                            color={shuffleActive ? accents.greenA : mutedControlColor}
                            strokeWidth={shuffleActive ? 2.5 : 1.8}
                        />
                    </TouchableOpacity>

                    <View style={styles.playbackRow}>
                        <TouchableOpacity
                            onPress={playPreviousTrack}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            style={styles.skipButton}
                        >
                            <SkipBack size={30} color={appTheme.colors.textPrimary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={togglePlayPause}
                            style={styles.playPauseButton}
                            activeOpacity={0.75}
                        >
                            <Animated.View style={{ transform: [{ scale: playScale }] }}>
                                {isBuffering ? (
                                    <ActivityIndicator size="large" color={darkIconOnLight} />
                                ) : isPlaying ? (
                                    <Pause size={38} color={darkIconOnLight} fill={darkIconOnLight} />
                                ) : (
                                    <Play size={38} color={darkIconOnLight} fill={darkIconOnLight} style={{ marginLeft: 4 }} />
                                )}
                            </Animated.View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={playNextTrack}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            style={styles.skipButton}
                        >
                            <SkipForward size={30} color={appTheme.colors.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        onPress={() => setRepeat(!repeatActive)}
                        hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                        style={[styles.modeButton, repeatActive && { borderColor: accents.greenA, backgroundColor: 'rgba(111,165,111,0.15)' }]}
                    >
                        <Repeat
                            size={22}
                            color={repeatActive ? accents.greenA : mutedControlColor}
                            strokeWidth={repeatActive ? 2.5 : 1.8}
                        />
                    </TouchableOpacity>
                </View>

                {/* Bottom Row */}
                <View style={[styles.bottomRow, { paddingBottom: insets.bottom + 16 }]}>
                    <BlurView intensity={38} tint={appTheme.isDark ? 'dark' : 'light'} style={styles.bottomGlass}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={handleShare}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Share2 size={22} color={accents.textSoft} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.purchaseButton,
                                { backgroundColor: accents.warmB, borderColor: accents.warmA },
                                alreadyPurchased && styles.purchaseButtonDisabled,
                            ]}
                            onPress={handlePurchase}
                            disabled={alreadyPurchased}
                        >
                            <Text style={styles.purchaseLabel}>{alreadyPurchased ? 'Purchased' : 'Purchase'}</Text>
                        </TouchableOpacity>
                    </BlurView>
                </View>
            </View>
        </Modal>
    );
}

const legacyStyles = {
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
    queueChip: {
        marginTop: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)',
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    queueChipText: {
        fontSize: 10,
        fontFamily: 'Poppins-SemiBold',
        letterSpacing: 0.4,
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
    artworkImage: {
        ...StyleSheet.absoluteFillObject,
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
    trackMeta: {
        fontSize: 12,
        fontFamily: 'Poppins-Medium',
        marginTop: 6,
        letterSpacing: 0.2,
    },
    likeButton: {
        padding: 6,
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
        height: 9,
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: 999,
        position: 'relative',
        overflow: 'visible',
    },
    sliderFill: {
        height: '100%',
        borderRadius: 999,
        overflow: 'hidden',
    },
    sliderKnob: {
        position: 'absolute',
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'white',
        borderWidth: 1.5,
        top: -6,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.8,
        shadowRadius: 12,
        elevation: 12,
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    timeTextStrong: {
        color: 'rgba(255,255,255,0.92)',
        fontSize: 15,
        fontFamily: 'Poppins-SemiBold',
        letterSpacing: 0.4,
    },
    controlsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        paddingHorizontal: 36,
        marginBottom: 36,
    },
    modeButton: {
        width: 52,
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
        backgroundColor: 'rgba(255,255,255,0.04)',
    },
    playbackRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    skipButton: {
        padding: 8,
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
    bottomGlass: {
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        backgroundColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: 12,
        paddingVertical: 10,
        overflow: 'hidden',
    },
    actionButton: {
        padding: 8,
    },
    purchaseButton: {
        backgroundColor: '#EC5C39',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
        minWidth: 136,
        alignItems: 'center',
        borderWidth: 1,
        marginHorizontal: 10,
    },
    purchaseButtonDisabled: {
        backgroundColor: 'rgba(255,255,255,0.18)',
    },
    purchaseLabel: {
        color: '#FFFFFF',
        fontSize: 13,
        fontFamily: 'Poppins-SemiBold',
    },
};
