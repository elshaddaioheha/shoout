export type AppColorTokens = {
    shooutPrimary: string;
    primary: string;
    primaryDark: string;
    primaryLight: string;
    background: string;
    backgroundElevated: string;
    surface: string;
    surfaceMuted: string;
    border: string;
    borderLight: string;
    borderStrong: string;
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    textDisabled: string;
    textPlaceholder: string;
    icon: string;
    error: string;
    success: string;
    warning: string;
    placeholder: string;
    overlay: string;
};

export const colorPalettes: { light: AppColorTokens; dark: AppColorTokens } = {
    dark: {
        shooutPrimary: '#6AA7FF',
        primary: '#EC5C39',
        primaryDark: '#D32626',
        primaryLight: '#C96F6F',
        background: '#140F10',
        backgroundElevated: '#1A1516',
        surface: '#1E1A1B',
        surfaceMuted: 'rgba(255,255,255,0.05)',
        border: '#464646',
        borderLight: '#333333',
        borderStrong: 'rgba(255,255,255,0.18)',
        textPrimary: '#FFFFFF',
        textSecondary: 'rgba(255, 255, 255, 0.7)',
        textTertiary: 'rgba(255, 255, 255, 0.55)',
        textDisabled: 'rgba(255, 255, 255, 0.4)',
        textPlaceholder: 'rgba(255, 255, 255, 0.6)',
        icon: 'rgba(255,255,255,0.65)',
        error: '#FF4D4D',
        success: '#319F43',
        warning: '#F5A623',
        placeholder: '#D9D9D9',
        overlay: 'rgba(0,0,0,0.4)',
    },
    light: {
        shooutPrimary: '#6AA7FF',
        primary: '#D84A28',
        primaryDark: '#B7331B',
        primaryLight: '#E8836B',
        background: '#F8F5F4',
        backgroundElevated: '#FFFFFF',
        surface: '#FFFFFF',
        surfaceMuted: 'rgba(20,15,16,0.05)',
        border: '#D9D0CE',
        borderLight: '#E8DFDC',
        borderStrong: 'rgba(20,15,16,0.14)',
        textPrimary: '#171213',
        textSecondary: 'rgba(23, 18, 19, 0.72)',
        textTertiary: 'rgba(23, 18, 19, 0.56)',
        textDisabled: 'rgba(23, 18, 19, 0.4)',
        textPlaceholder: 'rgba(23, 18, 19, 0.48)',
        icon: 'rgba(23,18,19,0.62)',
        error: '#D33A2A',
        success: '#2E8D40',
        warning: '#D28A14',
        placeholder: '#A89E9B',
        overlay: 'rgba(10,10,12,0.2)',
    },
};

// Legacy default export remains dark to avoid breaking existing screens.
export const colors = colorPalettes.dark;
