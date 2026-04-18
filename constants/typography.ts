import { Platform } from 'react-native';
import { normalize } from '../utils/responsive';

export const FontFamily = {
    regular: 'Poppins-Regular',
    medium: 'Poppins-Medium',
    semiBold: 'Poppins-SemiBold',
    bold: 'Poppins-Bold',
    mono: Platform.select({
        ios: 'ui-monospace',
        default: 'monospace',
        web: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    }) ?? 'monospace',
};

export const typography = {
    display: { fontSize: normalize(32), fontWeight: '700' as const, lineHeight: normalize(40), letterSpacing: 0, fontFamily: FontFamily.bold },
    h1: { fontSize: normalize(28), fontWeight: '700' as const, lineHeight: normalize(36), letterSpacing: 0, fontFamily: FontFamily.bold },
    h2: { fontSize: normalize(24), fontWeight: '600' as const, lineHeight: normalize(32), letterSpacing: 0, fontFamily: FontFamily.semiBold },
    h3: { fontSize: normalize(20), fontWeight: '600' as const, lineHeight: normalize(28), letterSpacing: 0, fontFamily: FontFamily.semiBold },
    title: { fontSize: normalize(18), fontWeight: '700' as const, lineHeight: normalize(24), letterSpacing: 0, fontFamily: FontFamily.bold },
    section: { fontSize: normalize(17), fontWeight: '600' as const, lineHeight: normalize(22), letterSpacing: 0, fontFamily: FontFamily.semiBold },
    body: { fontSize: normalize(16), fontWeight: '400' as const, lineHeight: normalize(24), letterSpacing: 0, fontFamily: FontFamily.regular },
    bodyBold: { fontSize: normalize(16), fontWeight: '600' as const, lineHeight: normalize(24), letterSpacing: 0, fontFamily: FontFamily.semiBold },
    button: { fontSize: normalize(16), fontWeight: '600' as const, lineHeight: normalize(20), letterSpacing: 0.2, fontFamily: FontFamily.semiBold },
    buttonSm: { fontSize: normalize(14), fontWeight: '600' as const, lineHeight: normalize(20), letterSpacing: 0.2, fontFamily: FontFamily.semiBold },
    label: { fontSize: normalize(12), fontWeight: '500' as const, lineHeight: normalize(16), letterSpacing: 0.2, fontFamily: FontFamily.medium },
    chip: { fontSize: normalize(13), fontWeight: '600' as const, lineHeight: normalize(18), letterSpacing: 0, fontFamily: FontFamily.semiBold },
    caption: { fontSize: normalize(13), fontWeight: '400' as const, lineHeight: normalize(18), letterSpacing: 0, fontFamily: FontFamily.regular },
    small: { fontSize: normalize(11), fontWeight: '400' as const, lineHeight: normalize(15), letterSpacing: 0, fontFamily: FontFamily.regular },
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
