import { UserRole, useUserStore } from '@/store/useUserStore';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Animated } from 'react-native';

export function useAppSwitcher() {
    const { role, actualRole, viewMode, setRole } = useUserStore();
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

    // Checks if a subscription tier mode is accessible given the user's ACTUAL role
    const isModeAccessible = useCallback((targetRole: UserRole): boolean => {
        if (actualRole === 'hybrid_executive' || actualRole === 'hybrid_creator') {
            return true; // Hybrids can switch to anything
        }

        // Let's implement basic hierarchy:
        if (actualRole === 'vault_free') return targetRole === 'vault_free';
        if (actualRole === 'studio_free') return targetRole === 'vault_free' || targetRole === 'studio_free';
        if (actualRole === 'vault_creator') return ['vault_free', 'vault_creator'].includes(targetRole);
        if (actualRole === 'vault_pro') return ['vault_free', 'vault_creator', 'vault_pro'].includes(targetRole);
        if (actualRole === 'vault_executive') return ['vault_free', 'vault_creator', 'vault_pro', 'vault_executive'].includes(targetRole);
        if (actualRole === 'studio_pro') return targetRole.startsWith('vault') || ['studio_free', 'studio_pro'].includes(targetRole);
        if (actualRole === 'studio_plus') return targetRole.startsWith('vault') || targetRole.startsWith('studio');

        return false;
    }, [actualRole]);

    const switchMode = useCallback(async (newRole: UserRole) => {
        if (newRole === role) {
            setSheetVisible(false);
            return;
        }
        if (!isModeAccessible(newRole)) {
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
        setRole(newRole);

        // Step 5 — Fade out overlay, fade in new content
        await new Promise<void>((resolve) => {
            Animated.parallel([
                Animated.timing(overlayAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
                Animated.timing(welcomeOpacityAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
                Animated.timing(contentFadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
            ]).start(() => resolve());
        });

        setTransitioning(false);
    }, [role, isModeAccessible, setRole, overlayAnim, welcomeSlideAnim, welcomeOpacityAnim, contentFadeAnim, router]);

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
