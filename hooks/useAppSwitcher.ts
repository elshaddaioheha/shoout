import { ViewMode, useUserStore } from '@/store/useUserStore';
import { useAuthStore } from '@/store/useAuthStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useToastStore } from '@/store/useToastStore';
import { captureError } from '@/utils/monitoring';
import { notifyError, notifyWarning } from '@/utils/notify';
import { ROUTES } from '@/utils/routes';
import { canAccessAppMode, canUseStudioServices, formatPlanLabel, getDefaultAppModeForPlan, getEffectivePlan } from '@/utils/subscriptions';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Easing, runOnJS, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';

const TRANSITION_INTRO_DELAY_MS = 700;
const TRANSITION_POST_RENDER_HOLD_MS = 3000;
const TRANSITION_RENDER_TIMEOUT_MS = 2500;
const TRANSITION_ENTER_OFFSET_X = 120;
const TRANSITION_EXIT_OFFSET_X = -120;

export function useAppSwitcher() {
    const { actualRole: serverVerifiedRole, isVerifyingRole } = useAuthStore();
    const { activeAppMode, setActiveAppMode } = useUserStore();
    const router = useRouter();

    const [sheetVisible, setSheetVisible] = useState(false);
    const [transitioning, setTransitioning] = useState(false);
    const [waitingForRender, setWaitingForRender] = useState(false);
    const [transitionToken, setTransitionToken] = useState(0);
    const [transitionSourceMode, setTransitionSourceMode] = useState<ViewMode>(activeAppMode);
    const [transitionTargetMode, setTransitionTargetMode] = useState<ViewMode>(activeAppMode);

    const overlayProgress = useSharedValue(0);
    const welcomeProgress = useSharedValue(0);
    const contentProgress = useSharedValue(1);
    const overlayTranslateX = useSharedValue(TRANSITION_ENTER_OFFSET_X);
    const transitionSequence = useSharedValue(0);
    const pendingTargetModeRef = useRef<ViewMode | null>(null);
    const pendingTransitionTokenRef = useRef(0);
    const waitingForRenderRef = useRef(false);
    const renderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const openSheet = useCallback(() => {
        if (transitioning) return;
        setSheetVisible(true);
    }, [transitioning]);
    const closeSheet = useCallback(() => setSheetVisible(false), []);

    const currentPlan = getEffectivePlan(serverVerifiedRole);
    const isStudioPaid = canUseStudioServices(currentPlan);
    const studioAccessLevel: 'free' | 'pro' = isStudioPaid ? 'pro' : 'free';

    const isModeAccessible = useCallback((targetViewMode: ViewMode): boolean => {
        return canAccessAppMode(currentPlan, targetViewMode);
    }, [currentPlan]);

    const resetTransitionValues = useCallback(() => {
        overlayProgress.value = 0;
        welcomeProgress.value = 0;
        contentProgress.value = 1;
        overlayTranslateX.value = TRANSITION_ENTER_OFFSET_X;
        transitionSequence.value = 0;
    }, [contentProgress, overlayProgress, overlayTranslateX, transitionSequence, welcomeProgress]);

    const clearRenderTimeout = useCallback(() => {
        if (renderTimeoutRef.current) {
            clearTimeout(renderTimeoutRef.current);
            renderTimeoutRef.current = null;
        }
    }, []);

    const finishTransition = useCallback(() => {
        clearRenderTimeout();
        pendingTargetModeRef.current = null;
        pendingTransitionTokenRef.current = 0;
        waitingForRenderRef.current = false;
        setWaitingForRender(false);
        setTransitioning(false);
    }, [clearRenderTimeout]);

    const handleTransitionError = useCallback((error: unknown) => {
        captureError(error, {
            scope: 'mode-switch',
            transitionSourceMode,
            transitionTargetMode,
            pendingTargetMode: pendingTargetModeRef.current,
            pendingTransitionToken: pendingTransitionTokenRef.current,
        });
        notifyError('Failed to switch app mode', error);
        useToastStore.getState().showToast('Could not switch experience right now. Please try again.', 'error');
        clearRenderTimeout();
        resetTransitionValues();
        pendingTargetModeRef.current = null;
        pendingTransitionTokenRef.current = 0;
        waitingForRenderRef.current = false;
        setWaitingForRender(false);
        setTransitioning(false);
    }, [clearRenderTimeout, resetTransitionValues, transitionSourceMode, transitionTargetMode]);

    const startExitAnimation = useCallback(() => {
        overlayTranslateX.value = withTiming(TRANSITION_EXIT_OFFSET_X, {
            duration: 320,
            easing: Easing.inOut(Easing.cubic),
        });
        overlayProgress.value = withTiming(0, {
            duration: 320,
            easing: Easing.out(Easing.cubic),
        });
        welcomeProgress.value = withTiming(0, {
            duration: 260,
            easing: Easing.out(Easing.cubic),
        });
        contentProgress.value = withTiming(1, {
            duration: 260,
            easing: Easing.out(Easing.cubic),
        }, (finished) => {
            if (finished) {
                runOnJS(finishTransition)();
            }
        });
    }, [contentProgress, finishTransition, overlayProgress, overlayTranslateX, welcomeProgress]);

    const scheduleRenderFallback = useCallback((targetViewMode: ViewMode, nextToken: number) => {
        clearRenderTimeout();
        renderTimeoutRef.current = setTimeout(() => {
            if (!waitingForRenderRef.current) {
                return;
            }
            if (pendingTargetModeRef.current !== targetViewMode || pendingTransitionTokenRef.current !== nextToken) {
                return;
            }

            captureError(new Error('Mode transition render-ready callback timed out.'), {
                scope: 'mode-switch-render-timeout',
                transitionSourceMode,
                transitionTargetMode: targetViewMode,
                transitionToken: nextToken,
            });
            notifyWarning('[mode-switch] Render-ready callback timed out. Completing transition with fallback.');
            waitingForRenderRef.current = false;
            setWaitingForRender(false);
            startExitAnimation();
        }, TRANSITION_RENDER_TIMEOUT_MS + TRANSITION_POST_RENDER_HOLD_MS);
    }, [clearRenderTimeout, startExitAnimation, transitionSourceMode]);

    const commitModeSwitch = useCallback(async (targetViewMode: ViewMode, nextToken: number) => {
        if (pendingTargetModeRef.current !== targetViewMode || pendingTransitionTokenRef.current !== nextToken) {
            return;
        }

        try {
            try {
                await usePlaybackStore.getState().clearTrack();
            } catch (error) {
                notifyWarning('Failed to clear playback when switching app mode', error);
            }

            setActiveAppMode(targetViewMode);

            if (targetViewMode !== activeAppMode) {
                router.push(ROUTES.tabs.home as any);
            }

            waitingForRenderRef.current = true;
            setWaitingForRender(true);
            setTransitionTargetMode(targetViewMode);
            scheduleRenderFallback(targetViewMode, nextToken);
        } catch (error) {
            handleTransitionError(error);
        }
    }, [activeAppMode, handleTransitionError, router, scheduleRenderFallback, setActiveAppMode]);

    const notifyTransitionContentReady = useCallback((payload: { mode: ViewMode; token: number; pathname?: string }) => {
        const { mode, token } = payload;
        if (!waitingForRenderRef.current) {
            return;
        }
        if (!transitioning) {
            return;
        }
        if (token !== pendingTransitionTokenRef.current) {
            return;
        }
        if (mode !== pendingTargetModeRef.current) {
            return;
        }

        clearRenderTimeout();
        waitingForRenderRef.current = false;
        setWaitingForRender(false);
        transitionSequence.value = withDelay(TRANSITION_POST_RENDER_HOLD_MS, withTiming(1, { duration: 1 }, (finished) => {
            if (finished) {
                runOnJS(startExitAnimation)();
            }
        }));
    }, [clearRenderTimeout, startExitAnimation, transitionSequence, transitioning]);

    const switchMode = useCallback(async (targetViewMode: ViewMode) => {
        if (transitioning) {
            return;
        }
        if (targetViewMode === activeAppMode) {
            setSheetVisible(false);
            return;
        }
        if (!isModeAccessible(targetViewMode)) {
            setSheetVisible(false);
            router.push(ROUTES.settings.subscriptions as any);
            return;
        }

        setSheetVisible(false);
        const nextToken = pendingTransitionTokenRef.current + 1;
        pendingTransitionTokenRef.current = nextToken;
        setTransitionToken(nextToken);
        setTransitionSourceMode(activeAppMode);
        setTransitionTargetMode(targetViewMode);
        setTransitioning(true);
        setWaitingForRender(false);
        pendingTargetModeRef.current = targetViewMode;
        waitingForRenderRef.current = false;

        resetTransitionValues();

        try {
            overlayTranslateX.value = withTiming(0, {
                duration: 360,
                easing: Easing.out(Easing.cubic),
            });
            overlayProgress.value = withTiming(1, {
                duration: 320,
                easing: Easing.out(Easing.cubic),
            });
            contentProgress.value = withTiming(0, {
                duration: 220,
                easing: Easing.out(Easing.cubic),
            });
            welcomeProgress.value = withDelay(120, withSpring(1, {
                damping: 18,
                stiffness: 180,
                mass: 0.9,
            }));
            transitionSequence.value = withDelay(TRANSITION_INTRO_DELAY_MS, withTiming(1, { duration: 1 }, (finished) => {
                if (finished) {
                    runOnJS(commitModeSwitch)(targetViewMode, nextToken);
                }
            }));
        } catch (error) {
            handleTransitionError(error);
        }
    }, [activeAppMode, commitModeSwitch, contentProgress, handleTransitionError, isModeAccessible, overlayProgress, overlayTranslateX, resetTransitionValues, router, transitionSequence, transitioning, welcomeProgress]);

    useEffect(() => {
        return () => {
            clearRenderTimeout();
        };
    }, [clearRenderTimeout]);

    return {
        sheetVisible,
        transitioning,
        waitingForRender,
        transitionToken,
        transitionSourceMode,
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
        notifyTransitionContentReady,
        overlayProgress,
        overlayTranslateX,
        welcomeProgress,
        contentProgress,
    };
}
