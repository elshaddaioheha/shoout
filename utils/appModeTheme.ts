import type { AppMode } from '@/utils/subscriptions';

type ThemeSwatch = {
  accent: string;
  accentStrong: string;
  accentTint: string;
  accentSoft: string;
};

const MODE_THEME: Record<AppMode, ThemeSwatch> = {
  shoout: {
    accent: '#6AA7FF',
    accentStrong: '#2D4E7A',
    accentTint: 'rgba(106,167,255,0.22)',
    accentSoft: 'rgba(106,167,255,0.12)',
  },
  studio: {
    accent: '#4CAF50',
    accentStrong: '#2E7D32',
    accentTint: 'rgba(76,175,80,0.22)',
    accentSoft: 'rgba(76,175,80,0.12)',
  },
  hybrid: {
    accent: '#FFD700',
    accentStrong: '#A67C00',
    accentTint: 'rgba(255,215,0,0.24)',
    accentSoft: 'rgba(255,215,0,0.12)',
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
