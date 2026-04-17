import type { UserRole } from '@/store/useUserStore';
import { formatUsd } from '@/utils/pricing';
import { theme } from './theme';
import {
  Crown,
  Download,
  Headphones,
  Mic2,
  Star,
  TrendingUp,
  Zap,
} from 'lucide-react-native';

export type SubscriptionTierConfig = {
  id: UserRole;
  title: string;
  subtitle: string;
  welcomeTitle: string;
  welcomeLine: string;
  icon: any;
  gradient: readonly [string, string];
  selectedGradientOverride?: readonly [string, string];
  accentColor: string;
  features: string[];
  featureIcons: any[];
};

export const SUBSCRIPTION_TIERS: SubscriptionTierConfig[] = [
  {
    id: 'shoout',
    title: 'Shoouts',
    subtitle: 'Free marketplace access',
    welcomeTitle: 'Welcome to Shoouts',
    welcomeLine: 'Browse, buy, and message before you upgrade.',
    icon: Headphones,
    gradient: ['#10223A', '#182F4D'],
    selectedGradientOverride: ['#E7F0FF', '#CFE2FF'],
    accentColor: '#6AA7FF',
    features: ['Marketplace browsing', 'Cart and checkout', 'Buyer messaging'],
    featureIcons: [Headphones, Download, Zap],
  },
  {
    id: 'vault',
    title: 'Vault',
    subtitle: 'Free private storage tier',
    welcomeTitle: 'Welcome to Vault',
    welcomeLine: 'Private space for your masters, demos, and folders.',
    icon: Headphones,
    gradient: [theme.colors.surface, '#3D2A1F'],
    selectedGradientOverride: [theme.colors.surface, '#F1D8D0'],
    accentColor: theme.colors.primary,
    features: ['Private Folder Sharing', 'Shareable Secure Links', 'Basic Tracking'],
    featureIcons: [Download, Mic2, Zap],
  },
  {
    id: 'vault_pro',
    title: 'Vault Pro',
    subtitle: `Professional tier (${formatUsd(5.99)}/mo)`,
    welcomeTitle: 'Welcome to Vault Pro',
    welcomeLine: 'Higher limits and deeper control for your private catalog.',
    icon: Crown,
    gradient: ['#863420', '#4A1D13'],
    accentColor: '#FFD700',
    features: ['Advanced Tracking', 'File Locking & Permissions'],
    featureIcons: [Zap, TrendingUp, Crown],
  },
  {
    id: 'studio',
    title: 'Studio',
    subtitle: `Active sellers (${formatUsd(18.99)}/mo)`,
    welcomeTitle: 'Welcome to Studio',
    welcomeLine: 'Publish, sell, and scale your beat business.',
    icon: TrendingUp,
    gradient: ['#7C3AED', '#4C1D95'],
    accentColor: '#C4B5FD',
    features: ['Unlimited Listings', 'Buyer-Seller Chat', 'Pricing & License Control', 'Payout Access', 'Standard Visibility'],
    featureIcons: [Zap, Mic2, Star, Download, TrendingUp],
  },
  {
    id: 'hybrid',
    title: 'Hybrid',
    subtitle: `Combined creator plan (${formatUsd(24.99)}/mo)`,
    welcomeTitle: 'Welcome to Hybrid',
    welcomeLine: 'One workspace to publish, promote, and manage your vault.',
    icon: Zap,
    gradient: ['#221133', '#4A0E17'],
    accentColor: '#FFD700',
    features: ['Team Collaboration', 'Dedicated Support', '10% Transaction Fee'],
    featureIcons: [Download, Crown, Star, TrendingUp],
  },
];
