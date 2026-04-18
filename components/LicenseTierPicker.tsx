import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/constants/typography';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { formatUsd } from '@/utils/pricing';
import type { LicenseTierId, LicenseTierOption } from '@/utils/licenseTiers';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type LicenseTierPickerProps = {
    options: LicenseTierOption[];
    selectedTierId: LicenseTierId;
    onSelect: (tierId: LicenseTierId) => void;
};

function useLicenseTierPickerStyles() {
    const appTheme = useAppTheme();
    return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function LicenseTierPicker({
    options,
    selectedTierId,
    onSelect,
}: LicenseTierPickerProps) {
    const styles = useLicenseTierPickerStyles();

    return (
        <View style={styles.container}>
            <Text style={styles.label}>Choose your license</Text>
            <Text style={styles.subLabel}>Pick the rights bundle that matches this release.</Text>

            <View style={styles.rows}>
                {options.map((option) => {
                    const selected = option.id === selectedTierId;
                    return (
                        <Pressable
                            key={option.id}
                            style={[styles.row, selected && styles.rowSelected]}
                            onPress={() => onSelect(option.id)}
                        >
                            <View style={styles.rowHeader}>
                                <View style={styles.rowTitleWrap}>
                                    <Text style={styles.rowTitle}>{option.title}</Text>
                                    {option.badge ? (
                                        <View style={styles.badge}>
                                            <Text style={styles.badgeText}>{option.badge}</Text>
                                        </View>
                                    ) : null}
                                </View>
                                <Text style={[styles.rowPrice, selected && styles.rowPriceSelected]}>
                                    {formatUsd(option.price)}
                                </Text>
                            </View>

                            <View style={styles.rowFooter}>
                                <Text style={styles.rowSummary}>{option.summary}</Text>
                                <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                                    {selected ? <View style={styles.radioInner} /> : null}
                                </View>
                            </View>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

const legacyStyles = {
    container: {
        marginTop: 14,
    },
    label: {
        ...typography.title,
        color: '#FFFFFF',
    },
    subLabel: {
        ...typography.caption,
        color: 'rgba(255,255,255,0.56)',
        marginTop: 3,
    },
    rows: {
        marginTop: 12,
        gap: 10,
    },
    row: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        backgroundColor: 'rgba(255,255,255,0.04)',
        paddingHorizontal: 14,
        paddingVertical: 14,
    },
    rowSelected: {
        borderColor: 'rgba(236,92,57,0.72)',
        backgroundColor: 'rgba(236,92,57,0.10)',
    },
    rowHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    rowTitleWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        flexShrink: 1,
    },
    rowTitle: {
        ...typography.bodyBold,
        color: '#FFFFFF',
    },
    badge: {
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 3,
        backgroundColor: 'rgba(106,167,255,0.16)',
        borderWidth: 1,
        borderColor: 'rgba(106,167,255,0.34)',
    },
    badgeText: {
        ...typography.small,
        color: '#8BBCFF',
    },
    rowPrice: {
        ...typography.title,
        color: '#FFFFFF',
        flexShrink: 0,
    },
    rowPriceSelected: {
        color: '#EC5C39',
    },
    rowFooter: {
        marginTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    rowSummary: {
        ...typography.caption,
        flex: 1,
        color: 'rgba(255,255,255,0.7)',
        lineHeight: 18,
    },
    radioOuter: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.28)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioOuterSelected: {
        borderColor: '#EC5C39',
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#EC5C39',
    },
};
