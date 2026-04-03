import { ViewMode, useUserStore } from '@/store/useUserStore';
import { useAuthStore } from '@/store/useAuthStore';
import { canAccessAppMode, canUseStudioServices, formatPlanLabel, getDefaultAppModeForPlan, getEffectivePlan } from '@/utils/subscriptions';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Animated } from 'react-native';

export function useAppSwitcher() {
    const { actualRole: serverVerifiedRole, isVerifyingRole } = useAuthStore();
    const { activeAppMode, setActiveAppMode } = useUserStore();
    const router = useRouter();

    const [sheetVisible, setSheetVisible] = useState(false);
    const [transitioning, setTransitioning] = useState(false);
    const [transitionTargetMode, setTransitionTargetMode] = useState<ViewMode>(activeAppMode);

    const overlayAnim = useRef(new Animated.Value(0)).current;
    const welcomeSlideAnim = useRef(new Animated.Value(40)).current;
    const welcomeOpacityAnim = useRef(new Animated.Value(0)).current;
    const contentFadeAnim = useRef(new Animated.Value(1)).current;

    const openSheet = useCallback(() => setSheetVisible(true), []);
    const closeSheet = useCallback(() => setSheetVisible(false), []);

    const currentPlan = getEffectivePlan(serverVerifiedRole);
    const isStudioPaid = canUseStudioServices(currentPlan);
    const studioAccessLevel: 'free' | 'pro' = isStudioPaid ? 'pro' : 'free';

    const isModeAccessible = useCallback((targetViewMode: ViewMode): boolean => {
        return canAccessAppMode(currentPlan, targetViewMode);
    }, [currentPlan]);

    const switchMode = useCallback(async (targetViewMode: ViewMode) => {
        if (targetViewMode === activeAppMode) {
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

        welcomeSlideAnim.setValue(40);
        welcomeOpacityAnim.setValue(0);
        contentFadeAnim.setValue(1);

        await new Promise<void>((resolve) => {
            Animated.parallel([
                Animated.timing(overlayAnim, { toValue: 1, duration: 240, useNativeDriver: true }),
                Animated.timing(contentFadeAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
            ]).start(() => resolve());
        });

        Animated.parallel([
            Animated.spring(welcomeSlideAnim, { toValue: 0, useNativeDriver: true, speed: 16, bounciness: 4 }),
            Animated.timing(welcomeOpacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]).start();

        await new Promise<void>((r) => setTimeout(r, 700));
        setActiveAppMode(targetViewMode);

        await new Promise<void>((resolve) => {
            Animated.parallel([
                Animated.timing(overlayAnim, { toValue: 0, duration: 240, useNativeDriver: true }),
                Animated.timing(welcomeOpacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
                Animated.timing(contentFadeAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
            ]).start(() => resolve());
        });

        setTransitioning(false);
        setTransitionTargetMode(targetViewMode);
    }, [activeAppMode, isModeAccessible, setActiveAppMode, overlayAnim, contentFadeAnim, router, welcomeOpacityAnim, welcomeSlideAnim]);

    return {
        sheetVisible,
        transitioning,
        transitionTargetMode,
        viewMode: activeAppMode,
        currentPlan,
        currentPlanLabel: formatPlanLabel(currentPlan),
        defaultModeForPlan: getDefaultAppModeForPlan(currentPlan),
        isModeAccessible,
        isStudioPaid,
        studioAccessLevel,
        isVerifyingRole,
        openSheet,
        closeSheet,
        switchMode,
        overlayAnim,
        welcomeSlideAnim,
        welcomeOpacityAnim,
        contentFadeAnim,
    };
}
