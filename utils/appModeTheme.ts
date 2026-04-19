import type { AppMode } from '@/utils/subscriptions';

type ThemeSwatch = {
  accent: string;
  accentStrong: string;
  accentTint: string;
  accentSoft: string;
};

type ModeSurfaceTheme = ThemeSwatch & {
  accentLabel: string;
  actionSurface: string;
  actionBorder: string;
  onAccent: string;
};

const MODE_THEME: Record<AppMode, ThemeSwatch> = {
  shoout: {
    accent: '#1C71F2',
    accentStrong: '#1253C2',
    accentTint: 'rgba(28,113,242,0.22)',
    accentSoft: 'rgba(28,113,242,0.12)',
  },
  studio: {
    accent: '#4CAF50',
    accentStrong: '#2E7D32',
    accentTint: 'rgba(76,175,80,0.22)',
    accentSoft: 'rgba(76,175,80,0.12)',
  },
  hybrid: {
    accent: '#D4AF37',
    accentStrong: '#AA771C',
    accentTint: 'rgba(212,175,55,0.24)',
    accentSoft: 'rgba(212,175,55,0.12)',
  },
  vault: {
    accent: '#EC5C39',
    accentStrong: '#863420',
    accentTint: 'rgba(236,92,57,0.22)',
    accentSoft: 'rgba(236,92,57,0.12)',
  },
  vault_pro: {
    accent: '#EC5C39',
    accentStrong: '#863420',
    accentTint: 'rgba(236,92,57,0.22)',
    accentSoft: 'rgba(236,92,57,0.12)',
  },
};

export function getModeTheme(mode: AppMode): ThemeSwatch {
  return MODE_THEME[mode] || MODE_THEME.vault;
}

function rgbaFromHex(hex: string, alpha: number) {
  const value = hex.replace('#', '');
  const normalized = value.length === 3 ? value.split('').map((char) => `${char}${char}`).join('') : value;

  if (normalized.length !== 6) {
    return `rgba(0,0,0,${alpha})`;
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${r},${g},${b},${alpha})`;
}

export function getModeSurfaceTheme(mode: AppMode, isDark: boolean): ModeSurfaceTheme {
  const theme = getModeTheme(mode);
  const accentLabel = mode === 'hybrid'
    ? (isDark ? '#F4D03F' : '#9A6B12')
    : (isDark ? theme.accent : theme.accentStrong);

  return {
    ...theme,
    accentLabel,
    actionSurface: rgbaFromHex(theme.accent, isDark ? 0.16 : 0.1),
    actionBorder: rgbaFromHex(theme.accent, isDark ? 0.3 : 0.22),
    onAccent: mode === 'hybrid' ? '#171213' : '#FFFFFF',
  };
}
