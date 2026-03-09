import { useUserStore, ViewMode } from '@/store/useUserStore';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Animated } from 'react-native';

export function useAppSwitcher() {
    const { role, viewMode, setViewMode } = useUserStore();
    const router = useRouter();

    const [sheetVisible, setSheetVisible] = useState(false);
    const [transitioning, setTransitioning] = useState(false);

    // Animation values
    const overlayAnim = useRef(new Animated.Value(0)).current;        // dims screen
    const welcomeSlideAnim = useRef(new Animated.Value(40)).current;  // card slides up
    const welcomeOpacityAnim = useRef(new Animated.Value(0)).current; // card fades
    const contentFadeAnim = useRef(new Animated.Value(1)).current;    // content fades in

    const openSheet = useCallback(() => setSheetVisible(true), []);
    const closeSheet = useCallback(() => setSheetVisible(false), []);

    // Checks if a mode is accessible given the user's current role
    const isModeAccessible = useCallback((mode: ViewMode): boolean => {
        if (mode === 'vault') {
            // Vault is available to everyone
            return true;
        }
        if (mode === 'studio') {
            // Studio requires a studio or hybrid role
            return role.startsWith('studio') || role.startsWith('hybrid');
        }
        return false;
    }, [role]);

    const switchMode = useCallback(async (newMode: ViewMode) => {
        if (newMode === viewMode) {
            setSheetVisible(false);
            return;
        }
        if (!isModeAccessible(newMode)) {
            // Redirect to upgrade instead
            setSheetVisible(false);
            router.push('/settings/subscriptions' as any);
            return;
        }

        setSheetVisible(false);
        setTransitioning(true);

        // Reset card animations
        welcomeSlideAnim.setValue(40);
        welcomeOpacityAnim.setValue(0);
        contentFadeAnim.setValue(1);

        // Step 1 — Fade overlay IN + slide welcome card up
        await new Promise<void>((resolve) => {
            Animated.parallel([
                Animated.timing(overlayAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
                Animated.timing(contentFadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
            ]).start(() => resolve());
        });

        // Step 2 — Welcome card appears
        Animated.parallel([
            Animated.spring(welcomeSlideAnim, { toValue: 0, useNativeDriver: true, speed: 16, bounciness: 4 }),
            Animated.timing(welcomeOpacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]).start();

        // Step 3 — Hold briefly
        await new Promise<void>((r) => setTimeout(r, 1200));

        // Step 4 — Apply the mode change (React re-render)
        setViewMode(newMode);

        // Step 5 — Fade out overlay, fade in new content
        await new Promise<void>((resolve) => {
            Animated.parallel([
                Animated.timing(overlayAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
                Animated.timing(welcomeOpacityAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
                Animated.timing(contentFadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
            ]).start(() => resolve());
        });

        setTransitioning(false);
    }, [viewMode, isModeAccessible, setViewMode, overlayAnim, welcomeSlideAnim, welcomeOpacityAnim, contentFadeAnim, router]);

    return {
        sheetVisible,
        transitioning,
        viewMode,
        role,
        isModeAccessible,
        openSheet,
        closeSheet,
        switchMode,
        // Animation values exposed for overlay rendering
        overlayAnim,
        welcomeSlideAnim,
        welcomeOpacityAnim,
        contentFadeAnim,
    };
}
