import type { AppMode } from '@/utils/subscriptions';

type RouteParams = Record<string, string>;

type RouteDestination = {
  pathname: string;
  params?: RouteParams;
};

const PATH_ALIASES: Record<string, string> = {
  '/': '/(tabs)',
  '/(tabs)/index': '/(tabs)',
  '/index': '/(tabs)',
  '/(tabs)/search': '/search',
  '/search/index': '/search',
  '/(tabs)/cart': '/cart',
  '/(tabs)/marketplace': '/marketplace',
  '/(tabs)/library': '/library',
  '/(tabs)/more': '/more',
  '/(tabs)/profile': '/profile',
  '/chat/index': '/chat',
};

export const ROUTES = {
  tabs: {
    home: '/(tabs)',
    search: '/search',
    cart: '/cart',
    marketplace: '/marketplace',
    library: '/library',
    more: '/more',
    profile: '/profile',
  },
  auth: {
    onboarding: '/(auth)/onboarding',
    roleSelection: '/(auth)/role-selection',
    login: '/(auth)/login',
    signup: '/(auth)/signup',
    signupOtp: '/(auth)/signup-otp',
    studioCreation: '/(auth)/studio-creation',
    forgotPassword: '/(auth)/forgot-password',
    forgotPasswordCode: '/(auth)/forgot-password-code',
    resetPassword: '/(auth)/reset-password',
  },
  settings: {
    subscriptions: '/settings/subscriptions',
    downloads: '/settings/downloads',
    localization: '/settings/localization',
    helpCenter: '/settings/help-center',
    appearance: '/settings/appearance',
    notifications: '/settings/notifications',
    paymentMethods: '/settings/payment-methods',
    privacy: '/settings/privacy',
  },
  notifications: '/notifications',
  checkoutReview: '/checkout-review',
  modal: '/modal',
  chat: {
    index: '/chat',
    thread: (id: string): RouteDestination => ({
      pathname: '/chat/[id]',
      params: { id },
    }),
  },
  listing: (id: string, uploaderId?: string): RouteDestination => ({
    pathname: '/listing/[id]',
    params: uploaderId ? { id, uploaderId } : { id },
  }),
  profile: {
    current: '/profile',
    user: (id: string): RouteDestination => ({
      pathname: '/profile/[id]',
      params: { id },
    }),
  },
  studio: {
    analytics: '/studio/analytics',
    upload: '/studio/upload',
    withdraw: '/studio/withdraw',
    messages: '/studio/messages',
    messageThread: '/studio/message-thread',
    settings: '/studio/settings',
    adsIntro: '/studio/ads-intro',
    adsCreation: '/studio/ads-creation',
    adsExample: '/studio/ads-example',
    adsSuccess: '/studio/ads-success',
    earnings: '/studio/earnings',
  },
  vault: {
    convert: '/vault/convert',
    links: '/vault/links',
    record: '/vault/record',
    upload: '/vault/upload',
    updates: '/vault/updates',
    player: (id: string) => '/vault/player?trackId=' + id,
    folder: (id: string, name?: string): RouteDestination => ({
      pathname: '/vault/folder/[id]',
      params: name ? { id, name } : { id },
    }),
    track: (id: string): RouteDestination => ({
      pathname: '/vault/track/[id]',
      params: { id },
    }),
  },
} as const;

export function normalizeAppPath(pathname: string | null | undefined): string | null {
  if (typeof pathname !== 'string') {
    return null;
  }

  const trimmed = pathname.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return null;
  }

  const match = trimmed.match(/^([^?#]+)(.*)$/);
  const basePath = match?.[1] ?? trimmed;
  const suffix = match?.[2] ?? '';
  const normalizedBase = PATH_ALIASES[basePath] ?? basePath;
  return `${normalizedBase}${suffix}`;
}

export function sanitizeRedirectPath(pathname: string | null | undefined): string | null {
  return normalizeAppPath(pathname);
}

export function resolveModeHomePath(_mode?: AppMode | null): string {
  return ROUTES.tabs.home;
}

export function resolveModeHomeDestination(mode?: AppMode | null): RouteDestination {
  return {
    pathname: resolveModeHomePath(mode),
  };
}
