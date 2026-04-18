import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { colorPalettes } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { FontFamily, typography } from '@/constants/typography';
import { auth, db } from '@/firebaseConfig';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';
import { useCartStore } from '@/store/useCartStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useToastStore } from '@/store/useToastStore';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    AccessibilityInfo,
    ActivityIndicator,
    Animated,
    LayoutChangeEvent,
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
import ImageColors from 'react-native-image-colors';
import Reanimated, {
    FadeIn,
    FadeOut,
    interpolate,
    SlideInDown,
    SlideOutDown,
    useAnimatedStyle,
    useFrameCallback,
    useSharedValue,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PLAYER_DISMISS_NAV_DELAY_MS = 300;
const TRACK_SHARE_BASE_URL = 'https://shoout.app/track';

interface FullPlayerProps {
    visible: boolean;
    onClose: () => void;
    persistentMode?: boolean;
}

interface MenuRowProps {
    icon: React.ReactNode;
    label: string;
    onPress: () => void;
    isDanger?: boolean;
}

function getRgbFromColor(input: string): [number, number, number] | null {
    const color = input.trim();

    if (color.startsWith('#')) {
        const hex = color.slice(1);
        if (hex.length === 3) {
            const r = parseInt(hex[0] + hex[0], 16);
            const g = parseInt(hex[1] + hex[1], 16);
            const b = parseInt(hex[2] + hex[2], 16);
            return [r, g, b];
        }
        if (hex.length === 6) {
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            return [r, g, b];
        }
    }

    const rgbMatch = color.match(/rgba?\(([^)]+)\)/i);
    if (rgbMatch) {
        const parts = rgbMatch[1].split(',').map((part) => Number(part.trim()));
        if (parts.length >= 3 && parts.slice(0, 3).every((value) => Number.isFinite(value))) {
            return [parts[0], parts[1], parts[2]];
        }
    }

    return null;
}

function getRelativeLuminance(color: string): number | null {
    const rgb = getRgbFromColor(color);
    if (!rgb) {
        return null;
    }

    const [r, g, b] = rgb.map((channel) => {
        const value = channel / 255;
        return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function useFullPlayerStyles() {
    const appTheme = useAppTheme();
    return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function FullPlayer({ visible, onClose, persistentMode = false }: FullPlayerProps) {
    const appTheme = useAppTheme();
    const reduceMotion = useReducedMotion();
    const screenReaderEnabled = useAccessibilityStore((state) => state.screenReaderEnabled);
    const styles = useFullPlayerStyles();
    const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
    const isLargeViewport = persistentMode || viewportWidth >= 1024;

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
    } = usePlaybackStore();
    const insets = useSafeAreaInsets();

    const [liked, setLiked] = useState(false);
    const [alreadyPurchased, setAlreadyPurchased] = useState(false);
    const [showTotalOnRight, setShowTotalOnRight] = useState(false);
    const [showOptionsMenu, setShowOptionsMenu] = useState(false);
    const [artColors, setArtColors] = useState({ dominant: '#140F10', vibrant: '#EC5C39' });
    const dominantLuminance = React.useMemo(() => getRelativeLuminance(artColors.dominant), [artColors.dominant]);
    const isLightArtwork = (dominantLuminance ?? (appTheme.isDark ? 0 : 1)) > 0.56;
    const contrastTokens = isLightArtwork ? colorPalettes.light : colorPalettes.dark;
    const controlDeckTint = isLightArtwork ? 'light' : 'dark';
    const controlDeckBackground = contrastTokens.backgroundElevated;
    const controlDeckBorderColor = contrastTokens.borderStrong;
    const controlDeckBackdropColor = contrastTokens.overlay;
    const foregroundPrimary = contrastTokens.textPrimary;
    const foregroundSecondary = contrastTokens.textSecondary;
    const foregroundTertiary = contrastTokens.textTertiary;
    const foregroundDisabled = contrastTokens.textDisabled;
    const controlSurfaceColor = contrastTokens.surfaceMuted;
    const controlSurfaceBorder = contrastTokens.borderStrong;
    const playGlyphColor = colorPalettes.light.textPrimary;
    const seekTrackBackground = controlSurfaceColor;
    const seekTrackFillStart = contrastTokens.primaryLight;
    const seekTrackFillEnd = contrastTokens.primary;
    const seekKnobBackground = colorPalettes.light.textPrimary;
    const seekKnobBorder = contrastTokens.primary;
    const purchaseButtonBackground = contrastTokens.primary;
    const purchaseButtonForeground = isLightArtwork ? colorPalettes.dark.textPrimary : colorPalettes.light.textPrimary;

    // Slider state
    const sliderWidth = useRef(0);
    const isDragging = useRef(false);
    const [dragProgress, setDragProgress] = useState<number | null>(null); // 0–1, null when idle
    const knobAnim = useRef(new Animated.Value(0)).current;
    const liveProgress = useSharedValue(0);
    const sliderTrackWidth = useSharedValue(0);
    const durationShared = useSharedValue(1);
    const isPlayingShared = useSharedValue(false);
    const isDraggingShared = useSharedValue(false);
    const heartScaleAnim = useSharedValue(1);
    const playStateAnim = useSharedValue(isPlaying ? 1 : 0);
    const playButtonScaleAnim = useSharedValue(1);
    const previousTapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const purchaseNavTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const displayProgress = dragProgress !== null ? dragProgress : (duration > 0 ? position / duration : 0);
    const clampedProgress = Math.min(1, Math.max(0, displayProgress));
    const elapsed = clampedProgress * duration;
    const remaining = Math.max(0, duration - elapsed);
    const sliderFillAnimatedStyle = useAnimatedStyle(() => ({
        width: liveProgress.value * sliderTrackWidth.value,
    }));
    const sliderKnobAnimatedStyle = useAnimatedStyle(() => ({
        left: liveProgress.value * sliderTrackWidth.value,
    }));
    const heartAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: heartScaleAnim.value }],
    }));
    const playPauseButtonAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: playButtonScaleAnim.value }],
    }));
    const playGlyphAnimatedStyle = useAnimatedStyle(() => ({
        opacity: 1 - playStateAnim.value,
        transform: [{ scale: interpolate(playStateAnim.value, [0, 1], [1, 0.9]) }],
    }));
    const pauseGlyphAnimatedStyle = useAnimatedStyle(() => ({
        opacity: playStateAnim.value,
        transform: [{ scale: interpolate(playStateAnim.value, [0, 1], [0.9, 1]) }],
    }));

    useEffect(() => {
        if (!currentTrack?.artworkUrl) {
            return;
        }

        let active = true;
        ImageColors.getColors(currentTrack.artworkUrl, {
            fallback: '#140F10',
            cache: true,
            key: currentTrack.artworkUrl,
        })
            .then((colors) => {
                if (!active) {
                    return;
                }

                const dominant = colors.platform === 'ios' ? colors.background : colors.dominant;
                const vibrant = colors.platform === 'ios' ? colors.primary : colors.vibrant;

                setArtColors({
                    dominant: dominant ?? '#140F10',
                    vibrant: vibrant ?? '#EC5C39',
                });
            })
            .catch(() => {
                // Keep fallback colors if extraction fails.
            });

        return () => {
            active = false;
        };
    }, [currentTrack?.artworkUrl]);

    const formatTime = (millis: number) => {
        if (!millis || millis < 0) return '0:00';
        const totalSeconds = Math.floor(millis / 1000);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const announceForA11y = useCallback((message: string) => {
        if (!screenReaderEnabled) {
            return;
        }

        AccessibilityInfo.announceForAccessibility(message);
    }, [screenReaderEnabled]);

    useFrameCallback((frame) => {
        if (isDraggingShared.value || !isPlayingShared.value) {
            return;
        }

        const deltaMs = frame.timeSincePreviousFrame ?? 16.67;
        const durationMs = Math.max(durationShared.value, 1);
        const nextProgress = liveProgress.value + (deltaMs / durationMs);
        liveProgress.value = Math.max(0, Math.min(1, nextProgress));
    });

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (e) => {
                isDragging.current = true;
                isDraggingShared.value = true;
                const pct = Math.max(0, Math.min(1, e.nativeEvent.locationX / (sliderWidth.current || 1)));
                setDragProgress(pct);
                liveProgress.value = pct;
                Animated.spring(knobAnim, { toValue: 1, useNativeDriver: true, speed: 30 }).start();
            },
            onPanResponderMove: (e) => {
                const pct = Math.max(0, Math.min(1, e.nativeEvent.locationX / (sliderWidth.current || 1)));
                setDragProgress(pct);
                liveProgress.value = pct;
            },
            onPanResponderRelease: (e) => {
                const pct = Math.max(0, Math.min(1, e.nativeEvent.locationX / (sliderWidth.current || 1)));
                isDragging.current = false;
                isDraggingShared.value = false;
                setDragProgress(null);
                liveProgress.value = pct;
                Animated.spring(knobAnim, { toValue: 0, useNativeDriver: true, speed: 30 }).start();
                seekTo(pct * (usePlaybackStore.getState().duration));
            },
            onPanResponderTerminate: () => {
                isDragging.current = false;
                isDraggingShared.value = false;
                setDragProgress(null);
                Animated.spring(knobAnim, { toValue: 0, useNativeDriver: true, speed: 30 }).start();
            },
        })
    ).current;

    const handleSliderLayout = (e: LayoutChangeEvent) => {
        sliderWidth.current = e.nativeEvent.layout.width;
        sliderTrackWidth.value = e.nativeEvent.layout.width;
    };

    useEffect(() => {
        durationShared.value = Math.max(duration, 1);
    }, [duration, durationShared]);

    useEffect(() => {
        isPlayingShared.value = isPlaying;
    }, [isPlaying, isPlayingShared]);

    useEffect(() => {
        if (isDragging.current) {
            return;
        }

        liveProgress.value = clampedProgress;
    }, [clampedProgress, liveProgress]);

    useEffect(() => {
        playStateAnim.value = withTiming(isPlaying ? 1 : 0, {
            duration: reduceMotion ? 0 : 220,
        });

        playButtonScaleAnim.value = withSequence(
            withSpring(0.94, { damping: 16, stiffness: 260, mass: 0.55 }),
            withSpring(1, { damping: 16, stiffness: 220, mass: 0.6 })
        );
    }, [isPlaying, playButtonScaleAnim, playStateAnim, reduceMotion]);

    useEffect(() => {
        if (reduceMotion) {
            heartScaleAnim.value = 1;
            return;
        }

        heartScaleAnim.value = withSequence(
            withSpring(liked ? 1.24 : 1.14, { damping: 11, stiffness: 280, mass: 0.5 }),
            withSpring(1, { damping: 13, stiffness: 220, mass: 0.6 })
        );
    }, [heartScaleAnim, liked, reduceMotion]);

    const handleShare = async () => {
        if (!currentTrack) return;
        try {
            const shareUrl = `${TRACK_SHARE_BASE_URL}/${encodeURIComponent(currentTrack.id)}`;
            const result = await Share.share({
                message: `🎵 Listening to "${currentTrack.title}" by ${currentTrack.artist} on Shoouts! Listen here: ${shareUrl}`,
                title: currentTrack.title,
                url: shareUrl,
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
        announceForA11y('Track actions closed');
        Promise.resolve(action()).catch((error) => {
            console.error('Menu action failed:', error);
            showToast('Action could not be completed.', 'error');
        });
    };

    const handleMoreOptions = () => {
        if (!currentTrack) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
        setShowOptionsMenu(true);
        announceForA11y('Track actions opened');
    };

    const MenuRow = ({ icon, label, onPress, isDanger }: MenuRowProps) => (
        <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.72}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityHint={isDanger ? 'Use caution. This is a destructive action.' : undefined}
            onPress={() => {
                Haptics.selectionAsync().catch(() => null);
                onPress();
            }}
        >
            <View style={styles.menuIconContainer}>{icon}</View>
            <Text
                style={[
                    styles.menuText,
                    { color: isDanger ? contrastTokens.error : foregroundPrimary },
                ]}
            >
                {label}
            </Text>
        </TouchableOpacity>
    );

    const handlePreviousPress = () => {
        const windowMs = 260;

        if (previousTapTimeoutRef.current) {
            clearTimeout(previousTapTimeoutRef.current);
            previousTapTimeoutRef.current = null;
            playPreviousTrack({ goToPreviousTrack: true }).catch((error) => {
                console.error('Double-tap previous failed:', error);
            });
            return;
        }

        previousTapTimeoutRef.current = setTimeout(() => {
            previousTapTimeoutRef.current = null;
            playPreviousTrack().catch((error) => {
                console.error('Restart track failed:', error);
            });
        }, windowMs);
    };

    const handlePlayPausePress = () => {
        void Haptics.selectionAsync().catch(() => null);
        void togglePlayPause().catch((error) => {
            console.error('Play/pause failed:', error);
        });
    };

    const handleNextPress = () => {
        void Haptics.selectionAsync().catch(() => null);
        void playNextTrack().catch((error) => {
            console.error('Next track failed:', error);
        });
    };

    const handleShuffleToggle = () => {
        void Haptics.selectionAsync().catch(() => null);
        void setShuffleMode(!shuffleActive).catch((error) => {
            console.error('Shuffle toggle failed:', error);
        });
    };

    const handleRepeatCycle = () => {
        void Haptics.selectionAsync().catch(() => null);
        return cycleRepeatMode();
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
        return () => {
            if (previousTapTimeoutRef.current) {
                clearTimeout(previousTapTimeoutRef.current);
                previousTapTimeoutRef.current = null;
            }

            if (purchaseNavTimeoutRef.current) {
                clearTimeout(purchaseNavTimeoutRef.current);
                purchaseNavTimeoutRef.current = null;
            }
        };
    }, []);

    if (!visible) {
        return null;
    }

    if (!currentTrack) {
        return (
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
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => null);
            if (liked) {
                await deleteDoc(favRef);
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => null);
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
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => null);
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

        if (purchaseNavTimeoutRef.current) {
            clearTimeout(purchaseNavTimeoutRef.current);
        }

        purchaseNavTimeoutRef.current = setTimeout(() => {
            router.push('/(tabs)/cart');
            purchaseNavTimeoutRef.current = null;
        }, PLAYER_DISMISS_NAV_DELAY_MS);
    };

    const knobScale = knobAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] });
    const knobGlow = knobAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
    const albumMeta = ((currentTrack as any)?.albumName as string | undefined) || 'Single' || 'Unknown Album';
    const releaseYear = ((currentTrack as any)?.releaseYear as string | number | undefined) || '2025' || 'Unknown Year';

    return (
        <View style={[styles.container, isLargeViewport && styles.containerLarge]}>
            <StatusBar barStyle={appTheme.isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

            <LinearGradient
                colors={[`${artColors.vibrant}40`, artColors.dominant, '#0A0A0A']}
                style={StyleSheet.absoluteFill}
            />

            <View style={styles.artworkBackdrop}>
                <View style={styles.headerRow}>
                    <IconButton
                        onPress={onClose}
                        style={[styles.headerButton, { backgroundColor: controlSurfaceColor, borderColor: controlSurfaceBorder }]}
                        icon="chevron-down"
                        size={30}
                        color={foregroundPrimary}
                        accessibilityRole="button"
                        accessibilityLabel="Close player"
                        accessibilityHint={screenReaderEnabled ? 'Dismisses the full player.' : undefined}
                    />
                    <IconButton
                        style={[styles.headerButton, { backgroundColor: controlSurfaceColor, borderColor: controlSurfaceBorder }]}
                        onPress={handleMoreOptions}
                        icon="more-horizontal"
                        size={26}
                        color={foregroundPrimary}
                        accessibilityRole="button"
                        accessibilityLabel="More options"
                        accessibilityHint={screenReaderEnabled ? 'Opens the track actions menu.' : undefined}
                    />
                </View>

                <View
                    style={[
                        styles.artworkFrame,
                        isLargeViewport ? { minHeight: Math.max(260, Math.floor(viewportHeight * 0.42)) } : null,
                    ]}
                >
                    <View style={[styles.artworkGlow, { shadowColor: artColors.vibrant, backgroundColor: artColors.vibrant }]} />
                    <LinearGradient
                        colors={[`${artColors.vibrant}66`, 'rgba(10,10,10,0.1)', 'rgba(10,10,10,0.75)']}
                        style={StyleSheet.absoluteFill}
                    />
                    {currentTrack.artworkUrl ? (
                        <Image
                            source={{ uri: currentTrack.artworkUrl }}
                            style={[styles.artworkImage, { shadowColor: artColors.vibrant }]}
                            contentFit="cover"
                        />
                    ) : null}
                    {isBuffering && (
                        <View style={styles.bufferingOverlay}>
                            <ActivityIndicator size="large" color="#FFFFFF" />
                            <Text style={styles.bufferingText}>Loading...</Text>
                        </View>
                    )}
                </View>
            </View>

            <BlurView
                intensity={40}
                tint={controlDeckTint}
                style={[
                    styles.controlDeck,
                    isLargeViewport && styles.controlDeckLarge,
                    {
                        paddingBottom: insets.bottom + spacing.md + (isLargeViewport ? spacing.sm : 0),
                        borderColor: controlDeckBorderColor,
                        backgroundColor: controlDeckBackground,
                    },
                ]}
            >
                <View pointerEvents="none" style={[styles.controlDeckBackdrop, { backgroundColor: controlDeckBackdropColor }]} />
                <View style={[styles.controlDeckInner, isLargeViewport && styles.controlDeckInnerLarge]}>
                    <View style={styles.topControlRow}>
                        <View style={styles.trackInfoLeft}>
                            <Text numberOfLines={1} style={[styles.trackTitle, { color: foregroundPrimary }]}>{currentTrack.title}</Text>
                            <Text numberOfLines={1} style={[styles.trackArtist, { color: foregroundSecondary }]}>{currentTrack.artist}</Text>
                            <Text numberOfLines={1} style={[styles.trackMeta, { color: foregroundTertiary }]}>{`${albumMeta} • ${releaseYear}`}</Text>
                        </View>
                        <View style={styles.socialActionRow}>
                            <Reanimated.View style={heartAnimatedStyle}>
                                <IconButton
                                    onPress={toggleFavourite}
                                    style={[styles.socialButton, { backgroundColor: controlSurfaceColor, borderColor: controlSurfaceBorder }]}
                                    icon="heart"
                                    size={26}
                                    color={liked ? artColors.vibrant : foregroundPrimary}
                                    fill={liked}
                                    iosAnimation={reduceMotion ? undefined : { effect: 'bounce', wholeSymbol: true, speed: 1.05 }}
                                    accessibilityRole="button"
                                    accessibilityLabel={liked ? 'Remove from favourites' : 'Add to favourites'}
                                    accessibilityState={{ selected: liked }}
                                    accessibilityHint={screenReaderEnabled ? 'Toggles this track in your favourites list.' : undefined}
                                />
                            </Reanimated.View>
                            <IconButton
                                onPress={handleShare}
                                style={[styles.socialButton, { backgroundColor: controlSurfaceColor, borderColor: controlSurfaceBorder }]}
                                icon="share"
                                size={22}
                                color={foregroundPrimary}
                                accessibilityRole="button"
                                accessibilityLabel="Share track"
                                accessibilityHint={screenReaderEnabled ? 'Opens the share sheet for this track.' : undefined}
                            />
                        </View>
                    </View>

                    <View style={styles.sliderContainer}>
                        <View
                            style={styles.sliderTouchArea}
                            onLayout={handleSliderLayout}
                            onStartShouldSetResponder={() => true}
                            {...panResponder.panHandlers}
                        >
                            <View style={styles.sliderTrack}>
                                <Reanimated.View style={[styles.sliderFill, { backgroundColor: seekTrackBackground }, sliderFillAnimatedStyle]}>
                                    <LinearGradient
                                        colors={[seekTrackFillStart, seekTrackFillEnd]}
                                        start={{ x: 0, y: 0.5 }}
                                        end={{ x: 1, y: 0.5 }}
                                        style={StyleSheet.absoluteFill}
                                    />
                                </Reanimated.View>
                                <Reanimated.View
                                    style={[
                                        styles.sliderKnob,
                                        {
                                            transform: [{ translateX: -10 }, { scale: knobScale }],
                                            borderColor: seekKnobBorder,
                                            shadowColor: seekKnobBorder,
                                            opacity: knobGlow,
                                            backgroundColor: seekKnobBackground,
                                        },
                                        sliderKnobAnimatedStyle,
                                    ]}
                                />
                            </View>
                        </View>

                        <View style={styles.timeRow}>
                            <Text style={[styles.timeText, { color: foregroundPrimary }]}>{formatTime(elapsed)}</Text>
                            <TouchableOpacity onPress={() => setShowTotalOnRight((v) => !v)}>
                                <Text style={[styles.timeText, { color: foregroundPrimary }]}>{showTotalOnRight ? formatTime(duration) : `-${formatTime(remaining)}`}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.playbackSection}>
                        <IconButton
                            onPress={handlePreviousPress}
                            style={styles.skipButton}
                            icon="skip-back"
                            size={30}
                            color={foregroundPrimary}
                            fill
                            accessibilityRole="button"
                            accessibilityLabel="Previous track"
                            accessibilityHint={screenReaderEnabled ? 'Restarts or goes to the previous track.' : undefined}
                        />

                        <IconButton
                            onPress={handlePlayPausePress}
                            style={styles.playPauseButton}
                            accessibilityRole="button"
                            accessibilityLabel={isPlaying ? 'Pause track' : 'Play track'}
                            accessibilityState={{ selected: isPlaying }}
                            accessibilityHint={screenReaderEnabled ? (isPlaying ? 'Pauses current playback.' : 'Starts current playback.') : undefined}
                        >
                            <Reanimated.View style={playPauseButtonAnimatedStyle}>
                                {isBuffering ? (
                                    <ActivityIndicator size="large" color={playGlyphColor} />
                                ) : (
                                    <View style={styles.playGlyphStack}>
                                        <Reanimated.View style={[styles.playGlyphLayer, playGlyphAnimatedStyle]}>
                                            <Icon
                                                name="play"
                                                size={38}
                                                color={playGlyphColor}
                                                fill
                                                iosAnimation={reduceMotion ? undefined : { effect: 'scale', wholeSymbol: true, speed: 1 }}
                                                style={{ marginLeft: spacing.xs }}
                                            />
                                        </Reanimated.View>
                                        <Reanimated.View style={[styles.playGlyphLayer, pauseGlyphAnimatedStyle]}>
                                            <Icon
                                                name="pause"
                                                size={38}
                                                color={playGlyphColor}
                                                fill
                                                iosAnimation={reduceMotion ? undefined : { effect: 'scale', wholeSymbol: true, speed: 1 }}
                                            />
                                        </Reanimated.View>
                                    </View>
                                )}
                            </Reanimated.View>
                        </IconButton>

                        <IconButton
                            onPress={handleNextPress}
                            style={styles.skipButton}
                            icon="skip-forward"
                            size={30}
                            color={foregroundPrimary}
                            fill
                            accessibilityRole="button"
                            accessibilityLabel="Next track"
                            accessibilityHint={screenReaderEnabled ? 'Plays the next track in the queue.' : undefined}
                        />
                    </View>

                    <View style={styles.secondaryModeRow}>
                        <IconButton
                            onPress={handleShuffleToggle}
                            style={[
                                styles.modeButton,
                                { backgroundColor: controlSurfaceColor, borderColor: controlSurfaceBorder },
                                shuffleActive && { borderColor: artColors.vibrant, backgroundColor: controlSurfaceColor },
                            ]}
                            icon="shuffle"
                            size={18}
                            color={shuffleActive ? artColors.vibrant : foregroundTertiary}
                            strokeWidth={shuffleActive ? 2.5 : 1.8}
                            accessibilityRole="button"
                            accessibilityLabel={shuffleActive ? 'Disable shuffle' : 'Enable shuffle'}
                            accessibilityState={{ selected: shuffleActive }}
                            accessibilityHint={screenReaderEnabled ? 'Toggles shuffle playback mode.' : undefined}
                        />
                        <IconButton
                            onPress={handleRepeatCycle}
                            style={[
                                styles.modeButton,
                                { backgroundColor: controlSurfaceColor, borderColor: controlSurfaceBorder },
                                repeatMode !== 'off' && { borderColor: artColors.vibrant, backgroundColor: controlSurfaceColor },
                            ]}
                            icon={repeatMode === 'one' ? 'repeat-one' : 'repeat'}
                            size={18}
                            color={repeatMode === 'off' ? foregroundTertiary : artColors.vibrant}
                            strokeWidth={repeatMode === 'off' ? 1.8 : 2.5}
                            accessibilityRole="button"
                            accessibilityLabel={repeatMode === 'off' ? 'Enable repeat all' : repeatMode === 'all' ? 'Enable repeat one' : 'Disable repeat'}
                            accessibilityState={{ selected: repeatMode !== 'off' }}
                            accessibilityHint={screenReaderEnabled ? 'Cycles through repeat modes.' : undefined}
                        />
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.purchaseButton,
                            { backgroundColor: purchaseButtonBackground, borderColor: controlDeckBorderColor },
                            alreadyPurchased && styles.purchaseButtonDisabled,
                            alreadyPurchased && { backgroundColor: controlSurfaceColor, borderColor: controlSurfaceBorder },
                        ]}
                        onPress={handlePurchase}
                        activeOpacity={0.8}
                        disabled={alreadyPurchased}
                    >
                        <Text style={[styles.purchaseButtonText, { color: alreadyPurchased ? foregroundDisabled : purchaseButtonForeground }]}>
                            {alreadyPurchased ? 'License Owned' : 'Purchase Beat • $29.99'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </BlurView>

            {showOptionsMenu ? (
                <Reanimated.View
                    style={styles.menuOverlay}
                    entering={FadeIn.duration(reduceMotion ? 0 : 200)}
                    exiting={FadeOut.duration(reduceMotion ? 0 : 200)}
                >
                    <Pressable
                        style={StyleSheet.absoluteFill}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
                            setShowOptionsMenu(false);
                            announceForA11y('Track actions closed');
                        }}
                    >
                        <View style={styles.menuBackdrop} />
                    </Pressable>

                    <Reanimated.View
                        entering={reduceMotion ? FadeIn.duration(0) : SlideInDown.springify().damping(20).stiffness(200)}
                        exiting={reduceMotion ? FadeOut.duration(0) : SlideOutDown.duration(200)}
                        style={[styles.floatingMenuContainer, { bottom: insets.bottom + spacing.md }]}
                        accessibilityViewIsModal
                    >
                        <BlurView intensity={80} tint="dark" style={styles.glassBackground}>
                            <View style={[StyleSheet.absoluteFill, { backgroundColor: `${artColors.dominant}40` }]} />
                            <View style={styles.dragIndicator} />

                            <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={styles.menuScroll}>
                                <MenuRow
                                    icon={<Icon name="heart" size={20} color={liked ? artColors.vibrant : foregroundPrimary} fill={liked} />}
                                    label={liked ? 'Remove from Favourites' : 'Add to Favourites'}
                                    onPress={() => runMenuAction(toggleFavourite)}
                                />
                                <MenuRow
                                    icon={<Icon name="list" size={20} color={foregroundPrimary} />}
                                    label="Add to Playlist"
                                    onPress={() => runMenuAction(addCurrentTrackToPlaylist)}
                                />
                                <MenuRow
                                    icon={<Icon name="cart" size={20} color={foregroundPrimary} />}
                                    label="Add to Cart"
                                    onPress={() => runMenuAction(quickAddToCart)}
                                />

                                <View style={styles.menuDivider} />

                                <MenuRow
                                    icon={<Icon name="info" size={20} color={foregroundPrimary} />}
                                    label="View Track Details"
                                    onPress={() => runMenuAction(openTrackDetails)}
                                />
                                <MenuRow
                                    icon={<Icon name="user" size={20} color={foregroundPrimary} />}
                                    label="Go to Artist"
                                    onPress={() => runMenuAction(goToArtist)}
                                />
                                <MenuRow
                                    icon={<Icon name="share" size={20} color={foregroundPrimary} />}
                                    label="Share Track"
                                    onPress={() => runMenuAction(handleShare)}
                                />

                                <View style={styles.menuDivider} />

                                <MenuRow
                                    icon={<Icon name="shield-alert" size={20} color={contrastTokens.error} />}
                                    label="Report Audio"
                                    isDanger
                                    onPress={() => runMenuAction(reportTrack)}
                                />
                            </ScrollView>
                        </BlurView>
                    </Reanimated.View>
                </Reanimated.View>
            ) : null}
        </View>
    );
}

const legacyStyles = {
    container: {
        flex: 1,
        backgroundColor: '#140F10',
    },
    containerLarge: {
        minHeight: 520,
    },
    scrollContent: {
        flexGrow: 1,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 8,
    },
    headerButton: {
        minWidth: spacing.touchTarget,
        minHeight: spacing.touchTarget,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.sm,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    artworkBackdrop: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    artworkFrame: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    artworkGlow: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        opacity: 0.18,
        transform: [{ scale: 1.04 }],
        borderRadius: 0,
    },
    artworkImage: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
    },
    bufferingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.45)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    bufferingText: {
        color: 'white',
        ...typography.body,
        fontFamily: FontFamily.regular,
        marginTop: spacing.sm,
    },
    controlDeck: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.28)',
        backgroundColor: 'rgba(8, 8, 10, 0.86)',
        overflow: 'hidden',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.36,
        shadowRadius: 24,
        elevation: 18,
    },
    controlDeckBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.36)',
    },
    controlDeckLarge: {
        maxHeight: '58%',
    },
    controlDeckInner: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.lg,
        gap: spacing.md,
    },
    controlDeckInnerLarge: {
        width: '100%',
        maxWidth: 540,
        alignSelf: 'center',
    },
    topControlRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: spacing.md,
    },
    trackInfoLeft: {
        flex: 1,
        paddingRight: spacing.sm,
    },
    trackTitle: {
        color: 'white',
        ...typography.h2,
        fontFamily: FontFamily.bold,
        letterSpacing: 0.1,
        textShadowColor: 'rgba(0,0,0,0.45)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    trackArtist: {
        color: 'rgba(255,255,255,0.82)',
        ...typography.body,
        fontFamily: FontFamily.regular,
        marginTop: spacing.xs,
    },
    trackMeta: {
        ...typography.label,
        fontFamily: FontFamily.mono,
        marginTop: spacing.sm,
        letterSpacing: 1.1,
        color: 'rgba(255,255,255,0.68)',
    },
    socialActionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    socialButton: {
        minWidth: spacing.touchTarget,
        minHeight: spacing.touchTarget,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.sm,
        borderRadius: 18,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.3)',
        backgroundColor: 'rgba(255,255,255,0.16)',
    },
    sliderContainer: {
        gap: spacing.xs,
    },
    sliderTouchArea: {
        height: 32,
        justifyContent: 'center',
    },
    sliderTrack: {
        height: 4,
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
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: StyleSheet.hairlineWidth,
        top: -6,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.7,
        shadowRadius: 8,
        elevation: 8,
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 2,
    },
    timeText: {
        color: 'rgba(255,255,255,0.98)',
        ...typography.label,
        fontFamily: FontFamily.mono,
        letterSpacing: 1.1,
    },
    playbackSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
    },
    modeButton: {
        width: 38,
        height: 38,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.24)',
        backgroundColor: 'rgba(255,255,255,0.14)',
    },
    skipButton: {
        minWidth: spacing.touchTarget,
        minHeight: spacing.touchTarget,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.sm,
    },
    playPauseButton: {
        width: 92,
        height: 92,
        borderRadius: 46,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#EC5C39',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    playGlyphStack: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    playGlyphLayer: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryModeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    purchaseButton: {
        width: '100%',
        minHeight: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: StyleSheet.hairlineWidth,
        marginTop: spacing.sm,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
        elevation: 8,
    },
    purchaseButtonDisabled: {
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
    purchaseButtonText: {
        color: '#FFFFFF',
        ...typography.button,
        fontFamily: FontFamily.semiBold,
        letterSpacing: 0.3,
    },
    menuOverlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 44,
    },
    menuBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    floatingMenuContainer: {
        position: 'absolute',
        left: spacing.md,
        right: spacing.md,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.15)',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    glassBackground: {
        width: '100%',
        paddingTop: spacing.sm + spacing.xs,
        paddingBottom: spacing.sm,
    },
    dragIndicator: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.3)',
        alignSelf: 'center',
        marginBottom: spacing.sm + spacing.xs,
    },
    menuScroll: {
        paddingHorizontal: spacing.sm,
    },
    menuRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md - 2,
        paddingHorizontal: spacing.md,
        borderRadius: 12,
    },
    menuIconContainer: {
        width: 28,
        alignItems: 'flex-start',
    },
    menuText: {
        ...typography.bodyBold,
        fontFamily: FontFamily.semiBold,
        color: '#FFFFFF',
        letterSpacing: 0.3,
    },
    menuTextDanger: {
        color: '#FFB4A9',
    },
    menuDivider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginVertical: spacing.xs,
        marginHorizontal: spacing.md,
    },
    emptyStateContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
    },
    emptyStateTitle: {
        color: '#FFFFFF',
        fontSize: 24,
        fontFamily: 'Poppins-SemiBold',
    },
    emptyStateSubtitle: {
        marginTop: spacing.sm,
        color: 'rgba(255,255,255,0.75)',
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
    },
    emptyStateButton: {
        marginTop: spacing.lg,
        borderRadius: 12,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm + spacing.xs,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.25)',
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    emptyStateButtonLabel: {
        color: '#FFFFFF',
        fontSize: 13,
        fontFamily: 'Poppins-SemiBold',
    },
};
