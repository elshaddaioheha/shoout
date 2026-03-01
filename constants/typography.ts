import { Platform } from 'react-native';
import { normalize } from '../utils/responsive';

export const typography = {
    display: { fontSize: normalize(32), fontWeight: '700' as const, lineHeight: normalize(40), letterSpacing: 0 },
    h1: { fontSize: normalize(28), fontWeight: '700' as const, lineHeight: normalize(36), letterSpacing: 0 },
    h2: { fontSize: normalize(24), fontWeight: '600' as const, lineHeight: normalize(32), letterSpacing: 0 },
    h3: { fontSize: normalize(20), fontWeight: '600' as const, lineHeight: normalize(28), letterSpacing: 0 },
    body: { fontSize: normalize(16), fontWeight: '400' as const, lineHeight: normalize(24), letterSpacing: 0 },
    bodyBold: { fontSize: normalize(16), fontWeight: '600' as const, lineHeight: normalize(24), letterSpacing: 0 },
    caption: { fontSize: normalize(13), fontWeight: '400' as const, lineHeight: normalize(18), letterSpacing: 0 },
    label: { fontSize: normalize(12), fontWeight: '500' as const, lineHeight: normalize(16), letterSpacing: 0.2 },
    button: { fontSize: normalize(16), fontWeight: '600' as const, lineHeight: normalize(20), letterSpacing: 0.2 },
};

export const FontFamily = {
    regular: 'Poppins-Regular',
    semiBold: 'Poppins-SemiBold',
    bold: 'Poppins-Bold',
};

export const LegacyFonts = Platform.select({
    ios: {
        sans: 'system-ui',
        serif: 'ui-serif',
        rounded: 'ui-rounded',
        mono: 'ui-monospace',
    },
    default: {
        sans: 'normal',
        serif: 'serif',
        rounded: 'normal',
        mono: 'monospace',
    },
    web: {
        sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        serif: "Georgia, 'Times New Roman', serif",
        rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
        mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    },
});
