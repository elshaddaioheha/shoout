/**
 * Jest setup shim for Expo projects.
 *
 * Expo's winter runtime (runtime.native.ts) installs polyfills lazily via
 * Object.defineProperty getters. One of those polyfills is `structuredClone`,
 * which on first access tries to require() ImportMetaRegistry.ts — a file that
 * uses `import.meta` (ESM-only). This crashes Jest's CommonJS environment.
 *
 * We pre-populate all the globals that Expo's winter runtime would install,
 * so the lazy getters never fire.
 */

// Ensure structuredClone exists (Node 17+ has it natively; Jest may run on older)
if (typeof global.structuredClone === 'undefined') {
    global.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

// Stub __ExpoImportMetaRegistry so Expo's installGlobal getter short-circuits
if (typeof global.__ExpoImportMetaRegistry === 'undefined') {
    Object.defineProperty(global, '__ExpoImportMetaRegistry', {
        value: { url: '' },
        configurable: true,
        writable: true,
    });
}

// Stub URL / URLSearchParams if needed (Node 10+)
if (typeof global.URL === 'undefined') {
    const { URL, URLSearchParams } = require('url');
    global.URL = URL;
    global.URLSearchParams = URLSearchParams;
}

jest.mock('react-native-reanimated', () => {
    const React = require('react');
    const ReactNative = require('react-native');

    const resolveValue = (value, currentValue) => (typeof value === 'function' ? value(currentValue) : value);
    const createSharedValue = (initialValue) => {
        let currentValue = initialValue;

        return {
            get value() {
                return currentValue;
            },
            set value(nextValue) {
                currentValue = resolveValue(nextValue, currentValue);
            },
            get() {
                return currentValue;
            },
            set(nextValue) {
                currentValue = resolveValue(nextValue, currentValue);
            },
        };
    };

    const interpolate = (value, inputRange, outputRange) => {
        if (!Array.isArray(inputRange) || !Array.isArray(outputRange) || inputRange.length < 2 || outputRange.length < 2) {
            return outputRange?.[0] ?? value;
        }

        const lastIndex = inputRange.length - 1;
        let upperIndex = inputRange.findIndex((input) => value <= input);
        if (upperIndex <= 0) upperIndex = 1;
        if (upperIndex > lastIndex) upperIndex = lastIndex;

        const lowerIndex = upperIndex - 1;
        const inputMin = inputRange[lowerIndex];
        const inputMax = inputRange[upperIndex];
        const outputMin = outputRange[lowerIndex];
        const outputMax = outputRange[upperIndex];
        const progress = inputMax === inputMin ? 0 : (value - inputMin) / (inputMax - inputMin);

        return outputMin + progress * (outputMax - outputMin);
    };

    const Animated = {
        View: ReactNative.View,
        Text: ReactNative.Text,
        Image: ReactNative.Image,
        ScrollView: ReactNative.ScrollView,
        FlatList: ReactNative.FlatList,
        SectionList: ReactNative.SectionList,
        createAnimatedComponent: (Component) => Component,
    };

    const Easing = {
        linear: (t) => t,
        ease: (t) => t,
        quad: (t) => t * t,
        cubic: (t) => t * t * t,
        bezier: () => (t) => t,
        in: (easing) => easing,
        out: (easing) => (t) => 1 - easing(1 - t),
        inOut: (easing) => (t) => (t < 0.5 ? easing(t * 2) / 2 : 1 - easing((1 - t) * 2) / 2),
    };

    return {
        __esModule: true,
        default: Animated,
        Animated,
        Easing,
        Extrapolation: {
            CLAMP: 'clamp',
            EXTEND: 'extend',
            IDENTITY: 'identity',
        },
        cancelAnimation: jest.fn(),
        interpolate,
        runOnJS: (fn) => fn,
        useAnimatedReaction: jest.fn(),
        useAnimatedRef: () => React.createRef(),
        useAnimatedStyle: (updater) => updater(),
        useDerivedValue: (updater) => createSharedValue(updater()),
        useSharedValue: createSharedValue,
        withDelay: (_delay, animation) => animation,
        withRepeat: (animation) => animation,
        withSequence: (...animations) => animations[animations.length - 1],
        withSpring: (value) => value,
        withTiming: (value) => value,
    };
});
