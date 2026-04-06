type AppThemeLike = {
  isDark: boolean;
  colors: {
    background: string;
    backgroundElevated: string;
    surface: string;
    surfaceMuted: string;
    border: string;
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
  };
};

const COLOR_STYLE_KEYS = new Set([
  'color',
  'backgroundColor',
  'borderColor',
  'borderTopColor',
  'borderBottomColor',
  'borderLeftColor',
  'borderRightColor',
  'shadowColor',
]);

const BRAND_COLORS = new Set([
  '#EC5C39',
  '#D32626',
  '#C96F6F',
  '#863420',
  '#AB452D',
  '#319F43',
  '#1E1B86',
  '#9C671A',
  '#2C74F2',
  '#EE3788',
  '#7E2FE5',
  '#EB001B',
  '#F79E1B',
  '#F38744',
  '#67E3F9',
]);

function toNormalized(color: string) {
  return color.replace(/\s+/g, '').toUpperCase();
}

function toRgba(hex: string, alpha: number) {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map((ch) => ch + ch).join('')
    : clean;

  if (full.length !== 6) {
    return `rgba(0,0,0,${alpha})`;
  }

  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function mapLegacyColor(value: string, key: string, theme: AppThemeLike) {
  if (theme.isDark) return value;

  const normalized = toNormalized(value);

  if (BRAND_COLORS.has(normalized)) {
    return value;
  }

  if (key === 'shadowColor') {
    return 'rgba(0,0,0,0.22)';
  }

  if (normalized === '#140F10') {
    if (key === 'color') return theme.colors.textPrimary;
    return theme.colors.background;
  }

  if (['#1A1516', '#1A1A1B', '#292727', '#4E544C', '#4A4546', '#181617'].includes(normalized)) {
    if (key === 'backgroundColor') return theme.colors.surface;
    if (key.startsWith('border')) return theme.colors.border;
    return theme.colors.textSecondary;
  }

  if (['#464646', '#767676', '#737373', '#4C4E54', '#9E9FAD'].includes(normalized)) {
    if (key === 'backgroundColor') return theme.colors.surfaceMuted;
    if (key.startsWith('border')) return theme.colors.border;
    return theme.colors.textTertiary;
  }

  if (['#FFF', '#FFFFFF', '#F8F8F8'].includes(normalized)) {
    if (key === 'color') return theme.colors.textPrimary;
    if (key.startsWith('border')) return theme.colors.border;
    if (key === 'backgroundColor') return theme.colors.backgroundElevated;
    return value;
  }

  if (['#D9D9D9', '#9C9C9C'].includes(normalized)) {
    if (key === 'color') return theme.colors.textTertiary;
    if (key.startsWith('border')) return theme.colors.border;
    if (key === 'backgroundColor') return theme.colors.surfaceMuted;
    return value;
  }

  const whiteRgbaMatch = value.match(/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*([\d.]+)\s*\)/i);
  if (whiteRgbaMatch) {
    const alpha = Number.parseFloat(whiteRgbaMatch[1]);
    if (Number.isNaN(alpha)) return value;

    if (key === 'color') {
      return toRgba(theme.colors.textPrimary, Math.min(0.95, alpha));
    }

    if (key.startsWith('border')) {
      return toRgba(theme.colors.textPrimary, Math.min(0.2, alpha * 0.35));
    }

    if (key === 'backgroundColor') {
      return toRgba(theme.colors.textPrimary, Math.min(0.12, alpha * 0.2));
    }
  }

  const blackRgbaMatch = value.match(/rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*([\d.]+)\s*\)/i);
  if (blackRgbaMatch) {
    const alpha = Number.parseFloat(blackRgbaMatch[1]);
    if (Number.isNaN(alpha)) return value;

    if (key === 'backgroundColor') {
      return `rgba(0,0,0,${Math.min(0.4, alpha * 0.6)})`;
    }
  }

  if (normalized === '#000' || normalized === '#000000') {
    if (key === 'color') return theme.colors.textPrimary;
    return value;
  }

  return value;
}

function adaptNode(node: unknown, key: string, theme: AppThemeLike): unknown {
  if (Array.isArray(node)) {
    return node.map((item) => adaptNode(item, key, theme));
  }

  if (node && typeof node === 'object') {
    const out: Record<string, unknown> = {};
    for (const [childKey, childValue] of Object.entries(node as Record<string, unknown>)) {
      out[childKey] = adaptNode(childValue, childKey, theme);
    }
    return out;
  }

  if (typeof node === 'string' && COLOR_STYLE_KEYS.has(key)) {
    return mapLegacyColor(node, key, theme);
  }

  return node;
}

export function adaptLegacyStyles<T extends Record<string, unknown>>(styleObject: T, theme: AppThemeLike): T {
  if (theme.isDark) {
    return styleObject;
  }
  return adaptNode(styleObject, '', theme) as T;
}

export function adaptLegacyColor(value: string, key: string, theme: AppThemeLike) {
  return mapLegacyColor(value, key, theme);
}
