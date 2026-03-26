import { ViewMode, useUserStore, UserRole } from '@/store/useUserStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Animated } from 'react-native';

export function useAppSwitcher() {
    // SECURITY: Use server-verified role from useAuthStore, never the local role
    const { actualRole: serverVerifiedRole, isVerifyingRole } = useAuthStore();
    const { viewMode, setViewMode, setRole } = useUserStore();
    const router = useRouter();

    const [sheetVisible, setSheetVisible] = useState(false);
    const [transitioning, setTransitioning] = useState(false);
    const [transitionTargetMode, setTransitionTargetMode] = useState<ViewMode>(viewMode);

    // Animation values
    const overlayAnim = useRef(new Animated.Value(0)).current;        // dims screen
    const welcomeSlideAnim = useRef(new Animated.Value(40)).current;  // card slides up
    const welcomeOpacityAnim = useRef(new Animated.Value(0)).current; // card fades
    const contentFadeAnim = useRef(new Animated.Value(1)).current;    // content fades in

    const openSheet = useCallback(() => setSheetVisible(true), []);
    const closeSheet = useCallback(() => setSheetVisible(false), []);

    // Vault is accessible to everyone — studio users already have all vault benefits.
    // Studio requires a studio or hybrid subscription (VERIFIED ON SERVER).
    const isStudioPaid = (serverVerifiedRole?.startsWith('studio') || serverVerifiedRole?.startsWith('hybrid')) ?? false;
    const studioAccessLevel: 'free' | 'pro' = isStudioPaid ? 'pro' : 'free';

    const isModeAccessible = useCallback((targetViewMode: ViewMode): boolean => {
        // Vault always accessible. Studio accessible with free tier; paid perks checked elsewhere.
        if (targetViewMode === 'vault') return true;
        if (targetViewMode === 'studio') return true;
        return false;
    }, []);

    const switchMode = useCallback(async (targetViewMode: ViewMode) => {
        if (targetViewMode === viewMode) {
            setSheetVisible(false);
            return;
        }
        if (!isModeAccessible(targetViewMode)) {
            setSheetVisible(false);
            router.push('/settings/subscriptions' as any);
            return;
        }

        setSheetVisible(false);
        setTransitionTargetMode(targetViewMode);
        setTransitioning(true);

        // Reset card animations
        welcomeSlideAnim.setValue(40);
        welcomeOpacityAnim.setValue(0);
        contentFadeAnim.setValue(1);

        // Step 1 — Fade overlay IN + slide welcome card up
        await new Promise<void>((resolve) => {
            Animated.parallel([
                Animated.timing(overlayAnim, { toValue: 1, duration: 240, useNativeDriver: true }),
                Animated.timing(contentFadeAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
            ]).start(() => resolve());
        });

        // Step 2 — Welcome card appears
        Animated.parallel([
            Animated.spring(welcomeSlideAnim, { toValue: 0, useNativeDriver: true, speed: 16, bounciness: 4 }),
            Animated.timing(welcomeOpacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]).start();

        // Step 3 — Hold briefly
        await new Promise<void>((r) => setTimeout(r, 700));

        // Step 4 — Apply the mode change (React re-render)
        if (targetViewMode === 'studio') {
            if (isStudioPaid) {
                setRole((serverVerifiedRole as UserRole) || 'studio');
            } else {
                setRole('studio_free');
            }
        } else {
            setRole((serverVerifiedRole as UserRole) || 'vault');
        }
        setViewMode(targetViewMode);

        // Step 5 — Fade out overlay, fade in new content
        await new Promise<void>((resolve) => {
            Animated.parallel([
                Animated.timing(overlayAnim, { toValue: 0, duration: 240, useNativeDriver: true }),
                Animated.timing(welcomeOpacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
                Animated.timing(contentFadeAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
            ]).start(() => resolve());
        });

        setTransitioning(false);
        setTransitionTargetMode(targetViewMode);
    }, [viewMode, isModeAccessible, setViewMode, overlayAnim, welcomeSlideAnim, welcomeOpacityAnim, contentFadeAnim, router, setTransitionTargetMode, isStudioPaid, serverVerifiedRole, setRole]);

    return {
        sheetVisible,
        transitioning,
        transitionTargetMode,
        viewMode,
        isModeAccessible,
        isStudioPaid,
        studioAccessLevel,
        isVerifyingRole, // Expose verification state in case UI needs to show loading
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
