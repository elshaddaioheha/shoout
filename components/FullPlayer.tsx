import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useCartStore } from '@/store/useCartStore';
import { useToastStore } from '@/store/useToastStore';
import { auth, db } from '@/firebaseConfig';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
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
    Repeat1,
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
    Pressable,
    ScrollView,
    Share,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
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
    const reduceMotion = useReducedMotion();
    const styles = useFullPlayerStyles();
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const mutedControlColor = adaptLegacyColor('rgba(255,255,255,0.45)', 'color', appTheme);
    const darkIconOnLight = adaptLegacyColor('#140F10', 'color', appTheme);
    const isLightMode = !appTheme.isDark;
    const textPrimaryStrong = isLightMode ? '#2F2624' : appTheme.colors.textPrimary;
    const textSecondaryStrong = isLightMode ? '#6F5A53' : appTheme.colors.textSecondary;
    const textMutedStrong = isLightMode ? '#907B74' : appTheme.colors.textDisabled;
    const optionBackdropBlur = reduceMotion ? 0 : 18;
    const shortestSide = Math.min(screenWidth, screenHeight);
    const isTabletLayout = shortestSide >= 700;
    const isFoldLike = screenWidth >= 520 && shortestSide < 700;
    const isCompactHeight = screenHeight < 760;
    const horizontalPadding = isTabletLayout ? 54 : isFoldLike ? 42 : screenWidth < 360 ? 22 : 36;
    const artworkSizeByWidth = Math.min(
        screenWidth * (isTabletLayout ? 0.54 : isFoldLike ? 0.62 : 0.78),
        isTabletLayout ? 440 : 360
    );
    const artworkSizeByHeight = Math.max(isCompactHeight ? 188 : 220, screenHeight * (isTabletLayout ? 0.36 : 0.33));
    const artworkSize = Math.min(artworkSizeByWidth, artworkSizeByHeight);

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
        repeatMode,
        cycleRepeatMode,
        shuffleActive,
        setShuffleMode,
        queue,
        currentTrackIndex,
    } = usePlaybackStore();
    const insets = useSafeAreaInsets();

    const [liked, setLiked] = useState(false);
    const [alreadyPurchased, setAlreadyPurchased] = useState(false);
    const [showTotalOnRight, setShowTotalOnRight] = useState(false);
    const [showOptionsMenu, setShowOptionsMenu] = useState(false);
    const [menuMounted, setMenuMounted] = useState(false);

    // Slider state
    const sliderWidth = useRef(0);
    const [sliderTrackWidth, setSliderTrackWidth] = useState(0);
    const isDragging = useRef(false);
    const [dragProgress, setDragProgress] = useState<number | null>(null); // 0–1, null when idle
    const knobAnim = useRef(new Animated.Value(0)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;
    const heartAnim = useRef(new Animated.Value(0)).current;
    const playPauseAnim = useRef(new Animated.Value(0)).current;
    const menuAnim = useRef(new Animated.Value(0)).current;
    const previousTapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
            const result = await Share.share({
                message: `🎵 Listening to "${currentTrack.title}" by ${currentTrack.artist} on Shoouts!`,
                title: currentTrack.title,
            });
            if ((result as any)?.action) {
                showToast('Share options opened.', 'info');
            }
        } catch (_error) {
            showToast('Could not open share options.', 'error');
        }
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

    const openTrackDetails = () => {
        if (!currentTrack) return;
        router.push({ pathname: '/vault/track/[id]', params: { id: currentTrack.id } } as any);
    };

    const goToArtist = () => {
        if (!currentTrack?.uploaderId) {
            showToast('Artist profile is unavailable for this track.', 'info');
            return;
        }
        router.push({ pathname: '/profile/[id]', params: { id: currentTrack.uploaderId } } as any);
    };

    const reportTrack = () => {
        if (!currentTrack) return;
        router.push({ pathname: '/settings/privacy', params: { highlight: 'report-track', trackId: currentTrack.id } } as any);
    };

    const runMenuAction = (action: () => void | Promise<void>) => {
        setShowOptionsMenu(false);
        Promise.resolve(action()).catch((error) => {
            console.error('Menu action failed:', error);
            showToast('Action could not be completed.', 'error');
        });
    };

    const handleMoreOptions = () => {
        if (!currentTrack) return;
        setShowOptionsMenu(true);
    };

    const handlePreviousPress = () => {
        const windowMs = 260;

        if (previousTapTimeoutRef.current) {
            clearTimeout(previousTapTimeoutRef.current);
            previousTapTimeoutRef.current = null;
            playPreviousTrack({ goToPreviousTrack: true }).catch((error) => {
                console.error('Double-tap previous failed:', error);
                showToast('Could not play previous track.', 'error');
            });
            showToast('Playing previous track.', 'info');
            return;
        }

        previousTapTimeoutRef.current = setTimeout(() => {
            previousTapTimeoutRef.current = null;
            playPreviousTrack().catch((error) => {
                console.error('Restart track failed:', error);
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
            console.error('Play/pause failed:', error);
            showToast('Could not change playback state.', 'error');
        }
    };

    const handleNextPress = async () => {
        try {
            await playNextTrack();
            showToast('Playing next track.', 'info');
        } catch (error) {
            console.error('Next track failed:', error);
            showToast('Could not play next track.', 'error');
        }
    };

    const handleShuffleToggle = async () => {
        try {
            await setShuffleMode(!shuffleActive);
            showToast(!shuffleActive ? 'Shuffle enabled.' : 'Shuffle disabled.', 'info');
        } catch (error) {
            console.error('Shuffle toggle failed:', error);
            showToast('Could not update shuffle mode.', 'error');
        }
    };

    const handleRepeatCycle = () => {
        try {
            const nextMode = cycleRepeatMode();
            const message = nextMode === 'off'
                ? 'Repeat off.'
                : nextMode === 'all'
                    ? 'Repeat all enabled.'
                    : 'Repeat one enabled.';
            showToast(message, 'info');
        } catch (error) {
            console.error('Repeat toggle failed:', error);
            showToast('Could not update repeat mode.', 'error');
        }
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

    useEffect(() => {
        if (visible && !currentTrack) {
            onClose();
        }
    }, [visible, currentTrack, onClose]);

    useEffect(() => {
        if (!visible) {
            setShowOptionsMenu(false);
        }
    }, [visible]);

    useEffect(() => {
        if (showOptionsMenu) {
            setMenuMounted(true);
            Animated.timing(menuAnim, {
                toValue: 1,
                duration: reduceMotion ? 80 : 220,
                useNativeDriver: true,
            }).start();
            return;
        }

        Animated.timing(menuAnim, {
            toValue: 0,
            duration: reduceMotion ? 80 : 180,
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (finished) {
                setMenuMounted(false);
            }
        });
    }, [menuAnim, reduceMotion, showOptionsMenu]);

    useEffect(() => {
        return () => {
            if (previousTapTimeoutRef.current) {
                clearTimeout(previousTapTimeoutRef.current);
                previousTapTimeoutRef.current = null;
            }
        };
    }, []);

    if (!currentTrack) {
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
                    <LinearGradient
                        colors={[appTheme.colors.backgroundElevated, appTheme.colors.background, appTheme.colors.backgroundElevated]}
                        style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.emptyStateContainer}>
                        <Text style={styles.emptyStateTitle}>No track selected</Text>
                        <Text style={styles.emptyStateSubtitle}>Pick a track to continue playback.</Text>
                        <TouchableOpacity style={styles.emptyStateButton} onPress={onClose} activeOpacity={0.85}>
                            <Text style={styles.emptyStateButtonLabel}>Close Player</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    }

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
        router.push('/(tabs)/cart');
    };

    const knobScale = knobAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] });
    const knobGlow = knobAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
    const heartScale = heartAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
    const playScale = playPauseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.96] });
    const animatedFillWidth = Animated.multiply(progressAnim, sliderTrackWidth || 1);
    const animatedKnobX = Animated.multiply(progressAnim, sliderTrackWidth || 1);
    const albumMeta = ((currentTrack as any)?.albumName as string | undefined) || 'Single' || 'Unknown Album';
    const releaseYear = ((currentTrack as any)?.releaseYear as string | number | undefined) || '2025' || 'Unknown Year';

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

                <ScrollView
                    contentContainerStyle={[
                        styles.scrollContent,
                        {
                            paddingBottom: Math.max(insets.bottom + 10, 16),
                        },
                    ]}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
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
                            <Text style={[styles.headerLabel, { color: textMutedStrong }]}>NOW PLAYING</Text>
                            <Text style={[styles.headerTrackName, { color: textPrimaryStrong }]} numberOfLines={1}>{currentTrack.title}</Text>
                            <TouchableOpacity
                                style={styles.queueChip}
                                onPress={() => Alert.alert('Up Next', nextTrack ? `${nextTrack.title} • ${nextTrack.artist}` : 'No track queued next yet.')}
                                activeOpacity={0.82}
                            >
                                <Text style={[styles.queueChipText, { color: isLightMode ? textMutedStrong : accents.textSoft }]}>Up Next</Text>
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
                    <View style={[styles.artworkContainer, isCompactHeight && { marginVertical: 14 }]}>
                        <View style={[styles.artworkShadow, { width: artworkSize * 0.98, height: artworkSize * 0.98 }]} />
                        <View style={[styles.artworkCard, { width: artworkSize, height: artworkSize }]}>
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
                    <View style={[styles.trackInfoContainer, { paddingHorizontal: horizontalPadding, marginBottom: isCompactHeight ? 14 : 24 }]}>
                        <View style={styles.trackInfoLeft}>
                            <Text numberOfLines={1} style={[styles.trackTitle, { color: textPrimaryStrong }]}>{currentTrack.title}</Text>
                            <Text numberOfLines={1} style={[styles.trackArtist, { color: textSecondaryStrong }]}>{currentTrack.artist}</Text>
                            <Text numberOfLines={1} style={[styles.trackMeta, { color: isLightMode ? textMutedStrong : accents.textSoft }]}>{`${albumMeta} • ${releaseYear}`}</Text>
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
                    <View style={[styles.sliderContainer, { paddingHorizontal: horizontalPadding, marginBottom: isCompactHeight ? 16 : 28 }]}>
                        <View
                            ref={sliderRef}
                            style={styles.sliderTouchArea}
                            onLayout={handleSliderLayout}
                            onStartShouldSetResponder={() => true}
                            {...panResponder.panHandlers}
                            onResponderGrant={measureSlider}
                        >
                            <View style={[styles.sliderTrack, { backgroundColor: isLightMode ? 'rgba(47,38,36,0.12)' : 'rgba(255,255,255,0.12)' }]}>
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
                            <Text style={[styles.timeTextStrong, { color: textPrimaryStrong }]}>{formatTime(elapsed)}</Text>
                            <TouchableOpacity onPress={() => setShowTotalOnRight((v) => !v)}>
                                <Text style={[styles.timeTextStrong, { color: textPrimaryStrong }]}>{showTotalOnRight ? formatTime(duration) : `-${formatTime(remaining)}`}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Controls */}
                    <View style={[styles.controlsContainer, { paddingHorizontal: horizontalPadding, marginBottom: isCompactHeight ? 20 : 36 }]}>
                        <TouchableOpacity
                            onPress={handleShuffleToggle}
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
                                onPress={handlePreviousPress}
                                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                                style={styles.skipButton}
                            >
                                <SkipBack size={30} color={appTheme.colors.textPrimary} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handlePlayPausePress}
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
                                onPress={handleNextPress}
                                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                                style={styles.skipButton}
                            >
                                <SkipForward size={30} color={appTheme.colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            onPress={handleRepeatCycle}
                            hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                            style={[styles.modeButton, repeatMode !== 'off' && { borderColor: accents.greenA, backgroundColor: 'rgba(111,165,111,0.15)' }]}
                        >
                            {repeatMode === 'one' ? (
                                <Repeat1
                                    size={22}
                                    color={accents.greenA}
                                    strokeWidth={2.5}
                                />
                            ) : (
                                <Repeat
                                    size={22}
                                    color={repeatMode === 'all' ? accents.greenA : mutedControlColor}
                                    strokeWidth={repeatMode === 'all' ? 2.5 : 1.8}
                                />
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.purchaseCtaWrap, { paddingHorizontal: horizontalPadding, paddingBottom: isCompactHeight ? 8 : insets.bottom + (isTabletLayout ? 26 : 16) }]}>
                        <TouchableOpacity
                            style={[
                                styles.purchaseWideButton,
                                { backgroundColor: accents.warmB, borderColor: accents.warmA },
                                alreadyPurchased && styles.purchaseButtonDisabled,
                            ]}
                            onPress={handlePurchase}
                            disabled={alreadyPurchased}
                        >
                            <Text style={styles.purchaseWideLabel}>{alreadyPurchased ? 'Purchased' : 'Purchase Track'}</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>

                {menuMounted ? (
                    <View style={styles.menuOverlay}>
                        <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowOptionsMenu(false)}>
                            <Animated.View style={[StyleSheet.absoluteFill, { opacity: menuAnim }]}>
                                <BlurView intensity={optionBackdropBlur} tint={appTheme.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                                <View style={[styles.menuBackdrop, { backgroundColor: isLightMode ? 'rgba(255,246,239,0.44)' : 'rgba(17,12,12,0.46)' }]} />
                            </Animated.View>
                        </Pressable>

                        <Animated.View
                            style={[
                                styles.menuCard,
                                {
                                    top: insets.top + 66,
                                    right: 20,
                                    backgroundColor: isLightMode ? 'rgba(255,245,235,0.96)' : 'rgba(38,26,22,0.94)',
                                    borderColor: isLightMode ? 'rgba(236,92,57,0.26)' : 'rgba(241,197,82,0.26)',
                                    opacity: menuAnim,
                                    transform: [
                                        {
                                            translateY: menuAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [-14, 0],
                                            }),
                                        },
                                        {
                                            scale: menuAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [0.97, 1],
                                            }),
                                        },
                                    ],
                                },
                            ]}
                        >
                            <TouchableOpacity style={styles.menuItem} onPress={() => runMenuAction(toggleFavourite)}>
                                <Text style={[styles.menuItemText, { color: textPrimaryStrong }]}>{liked ? 'Remove from Favourites' : 'Add to Favourites'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.menuItem} onPress={() => runMenuAction(addCurrentTrackToPlaylist)}>
                                <Text style={[styles.menuItemText, { color: textPrimaryStrong }]}>Add to Playlist</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.menuItem} onPress={() => runMenuAction(quickAddToCart)}>
                                <Text style={[styles.menuItemText, { color: textPrimaryStrong }]}>Add to Cart</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.menuItem} onPress={() => runMenuAction(openTrackDetails)}>
                                <Text style={[styles.menuItemText, { color: textPrimaryStrong }]}>View Track Details</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.menuItem} onPress={() => runMenuAction(goToArtist)}>
                                <Text style={[styles.menuItemText, { color: textPrimaryStrong }]}>Go to Artist</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.menuItem} onPress={() => runMenuAction(handleShare)}>
                                <Text style={[styles.menuItemText, { color: textPrimaryStrong }]}>Share</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.menuItem, styles.menuItemDanger]} onPress={() => runMenuAction(reportTrack)}>
                                <Text style={[styles.menuItemText, styles.menuItemDangerText]}>Report</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    </View>
                ) : null}
            </View>
        </Modal>
    );
}

const legacyStyles = {
    container: {
        flex: 1,
        backgroundColor: '#140F10',
    },
    scrollContent: {
        flexGrow: 1,
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
    purchaseCtaWrap: {
        width: '100%',
        alignItems: 'center',
    },
    purchaseWideButton: {
        width: '100%',
        minHeight: 54,
        borderRadius: 18,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
        elevation: 8,
    },
    purchaseWideLabel: {
        color: '#FFFFFF',
        fontSize: 15,
        fontFamily: 'Poppins-SemiBold',
        letterSpacing: 0.3,
    },
    menuOverlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 44,
    },
    menuBackdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    menuCard: {
        position: 'absolute',
        width: 220,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: 'rgba(18, 15, 16, 0.92)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
    },
    menuItem: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    menuItemText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontFamily: 'Poppins-Medium',
    },
    menuItemDanger: {
        borderBottomWidth: 0,
    },
    menuItemDangerText: {
        color: '#FFB4A9',
    },
    emptyStateContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    emptyStateTitle: {
        color: '#FFFFFF',
        fontSize: 24,
        fontFamily: 'Poppins-SemiBold',
    },
    emptyStateSubtitle: {
        marginTop: 8,
        color: 'rgba(255,255,255,0.75)',
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
    },
    emptyStateButton: {
        marginTop: 20,
        borderRadius: 12,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.25)',
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    emptyStateButtonLabel: {
        color: '#FFFFFF',
        fontSize: 13,
        fontFamily: 'Poppins-SemiBold',
    },
};
