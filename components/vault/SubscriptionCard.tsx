import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, Star } from 'lucide-react-native';
import { useAppTheme } from '@/hooks/use-app-theme';
import { Icon } from './Icon';
import { spacing, typography } from '@/constants';

export interface SubscriptionPlan {
  id: string;
  name: string;
  category: string;
  description: string;
  monthlyPriceUsd: number;
  annualPerMonthUsd: number;
  annualTotalUsd: number;
  color: string;
  borderColor: string;
  gradient: readonly [string, string, ...string[]];
  features: string[];
  recommended?: boolean;
}

export interface SubscriptionCardProps {
  plan: SubscriptionPlan;
  isCurrentPlan: boolean;
  isAnnual: boolean;
  onPress: () => void;
  priceDisplay: string;
  dueUsd: number;
  accentColor?: string;
}

export const SubscriptionCard = ({
  plan,
  isCurrentPlan,
  isAnnual,
  onPress,
  priceDisplay,
  dueUsd,
  accentColor,
}: SubscriptionCardProps) => {
  const appTheme = useAppTheme();
  const isHybridPlan = plan.id === 'hybrid';
  const planColor = isHybridPlan 
    ? (appTheme.isDark ? '#E5C158' : '#D4AF37') 
    : plan.color;
  const planTextAccent = isHybridPlan 
    ? (appTheme.isDark ? '#F4D03F' : '#B8860B') 
    : plan.color;
  const planBorderColor = isHybridPlan ? planColor : plan.borderColor;
  const planGradient = isHybridPlan
    ? (appTheme.isDark
      ? (['rgba(244, 208, 63, 0.22)', 'rgba(212, 175, 55, 0.1)', 'rgba(0,0,0,0)'] as const)
      : (['rgba(212, 175, 55, 0.18)', 'rgba(170, 119, 28, 0.08)', 'rgba(0,0,0,0)'] as const))
    : plan.gradient;

  const hexToRgba = (hex: string, alpha: number) => {
    const value = hex.replace('#', '');
    const safe = value.length === 3
      ? value.split('').map((char) => char + char).join('')
      : value;
    const int = Number.parseInt(safe, 16);
    const r = (int >> 16) & 255;
    const g = (int >> 8) & 255;
    const b = int & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return (
    <View style={[styles.cardWrapper, { borderColor: planBorderColor }]}>
      <LinearGradient
        colors={planGradient}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {plan.recommended && (
        <View style={[styles.recommendedBadge, { backgroundColor: planColor }]}>
          <Star
            size={12}
            color={appTheme.colors.background}
            fill={appTheme.colors.background}
          />
          <Text style={styles.recommendedText}>MOST POPULAR</Text>
        </View>
      )}

      <View style={styles.planHeader}>
        <View style={[styles.categoryBadge, { backgroundColor: planColor + '20' }]}>
          <Text style={[styles.categoryText, { color: planTextAccent }]}>
            {plan.category}
          </Text>
        </View>
        <View style={styles.planNameRow}>
          <Text style={styles.planName}>{plan.name}</Text>
          {isCurrentPlan && (
            <View style={styles.activeBadge}>
              <Check size={12} color={appTheme.colors.textPrimary} />
              <Text style={styles.activeText}>Current Plan</Text>
            </View>
          )}
        </View>
        <Text style={styles.planDescription}>{plan.description}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.planPrice}>{priceDisplay}</Text>
          {dueUsd > 0 && (
            <Text style={styles.planPeriod}>
              /{isAnnual ? 'month (annual billing)' : 'month'}
            </Text>
          )}
        </View>
        {isAnnual && plan.annualTotalUsd > 0 ? (
          <Text style={[styles.annualTotalText, { color: hexToRgba(planTextAccent, 0.95) }]}>
            Billed as ${(plan.annualTotalUsd).toFixed(2)} per year (charged in NGN)
          </Text>
        ) : null}
      </View>

      <View style={styles.featuresList}>
        {plan.features.map((feature, idx) => (
          <View key={idx} style={styles.featureItem}>
            <View style={[styles.checkCircle, { backgroundColor: planColor + '15' }]}>
              <Check size={14} color={planTextAccent} strokeWidth={3} />
            </View>
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[
          styles.actionButton,
          isCurrentPlan 
            ? styles.disabledButton 
            : (isHybridPlan ? styles.hybridActionButton : { backgroundColor: planColor }),
        ]}
        onPress={onPress}
        disabled={isCurrentPlan}
      >
        {!isCurrentPlan && isHybridPlan && appTheme.isDark ? (
          <LinearGradient
            colors={['#F4D03F', '#D4AF37']}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        ) : null}
        <Text
          style={[
            styles.actionButtonText,
            isCurrentPlan && { color: appTheme.colors.textDisabled },
            isHybridPlan && !isCurrentPlan ? { color: '#121212' } : null,
          ]}
        >
          {isCurrentPlan ? 'Current Plan' : plan.id === 'shoout' ? 'Switch to Shoouts' : 'Select Plan'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  recommendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  recommendedText: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 0.5,
    color: '#140F10',
  },
  planHeader: {
    marginBottom: spacing.lg,
  },
  categoryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  categoryText: {
    fontSize: 11,
    fontFamily: 'Poppins-SemiBold',
    letterSpacing: 0.3,
  },
  planNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  planName: {
    ...typography.h3,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  activeText: {
    fontSize: 11,
    fontFamily: 'Poppins-SemiBold',
  },
  planDescription: {
    ...typography.body,
    marginBottom: spacing.md,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: spacing.sm,
  },
  planPrice: {
    fontSize: 32,
    fontFamily: 'Poppins-Bold',
    lineHeight: 40,
  },
  planPeriod: {
    ...typography.body,
  },
  annualTotalText: {
    ...typography.caption,
  },
  featuresList: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  featureText: {
    ...typography.body,
    flex: 1,
  },
  actionButton: {
    height: spacing.touchTarget,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  hybridActionButton: {
    backgroundColor: 'rgba(244, 208, 63, 0.15)',
    borderWidth: 1.5,
    borderColor: '#D4AF37',
  },
  actionButtonText: {
    ...typography.button,
  },
});
