/**
 * FilterSheet — a bottom sheet for filtering/sorting lists.
 * Usage:
 *   <FilterSheet
 *     visible={filterOpen}
 *     onClose={() => setFilterOpen(false)}
 *     sortOptions={['Newest', 'Price: Low to High', 'Most Popular']}
 *     selectedSort={sort}
 *     onSortChange={setSort}
 *     categories={['All', 'Apparel', 'Digital', 'Vinyl']}
 *     selectedCategory={category}
 *     onCategoryChange={setCategory}
 *   />
 */
import { BlurView } from 'expo-blur';
import React, { useEffect } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

interface Props {
    visible: boolean;
    onClose: () => void;
    sortOptions?: string[];
    selectedSort?: string;
    onSortChange?: (sort: string) => void;
    categories?: string[];
    selectedCategory?: string;
    onCategoryChange?: (cat: string) => void;
    onReset?: () => void;
}

export default function FilterSheet({
    visible, onClose,
    sortOptions, selectedSort, onSortChange,
    categories, selectedCategory, onCategoryChange,
    onReset,
}: Props) {
    const slideAnim = useSharedValue(400);
    const fadeAnim = useSharedValue(0);

    useEffect(() => {
        slideAnim.value = withTiming(visible ? 0 : 400, {
            duration: visible ? 240 : 200,
            easing: Easing.out(Easing.cubic),
        });
        fadeAnim.value = withTiming(visible ? 1 : 0, {
            duration: visible ? 240 : 200,
        });
    }, [visible, slideAnim, fadeAnim]);

    const overlayAnimatedStyle = useAnimatedStyle(() => ({
        opacity: fadeAnim.value,
    }));

    const sheetAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: slideAnim.value }],
    }));

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <Animated.View style={[styles.overlay, overlayAnimatedStyle]}>
                    <BlurView intensity={24} tint="dark" style={StyleSheet.absoluteFill} />
                </Animated.View>
            </TouchableWithoutFeedback>

            <Animated.View style={[styles.sheet, sheetAnimatedStyle]}>
                <View style={styles.handle} />

                <View style={styles.sheetHeader}>
                    <Text style={styles.sheetTitle}>Filter & Sort</Text>
                    {onReset && (
                        <TouchableOpacity onPress={onReset}>
                            <Text style={styles.resetText}>Reset</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Sort */}
                    {sortOptions && sortOptions.length > 0 && (
                        <>
                            <Text style={styles.sectionLabel}>Sort By</Text>
                            <View style={styles.chipRow}>
                                {sortOptions.map((opt) => (
                                    <TouchableOpacity
                                        key={opt}
                                        style={[styles.chip, selectedSort === opt && styles.chipActive]}
                                        onPress={() => onSortChange?.(opt)}
                                    >
                                        <Text style={[styles.chipText, selectedSort === opt && styles.chipTextActive]}>
                                            {opt}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </>
                    )}

                    {/* Categories */}
                    {categories && categories.length > 0 && (
                        <>
                            <Text style={styles.sectionLabel}>Category</Text>
                            <View style={styles.chipRow}>
                                {categories.map((cat) => (
                                    <TouchableOpacity
                                        key={cat}
                                        style={[styles.chip, selectedCategory === cat && styles.chipActive]}
                                        onPress={() => onCategoryChange?.(cat)}
                                    >
                                        <Text style={[styles.chipText, selectedCategory === cat && styles.chipTextActive]}>
                                            {cat}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </>
                    )}

                    <View style={{ height: 20 }} />
                </ScrollView>

                {/* Apply */}
                <TouchableOpacity style={styles.applyButton} onPress={onClose}>
                    <Text style={styles.applyText}>Apply Filters</Text>
                </TouchableOpacity>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#1E1A1B',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingBottom: 34,
        paddingHorizontal: 20,
        paddingTop: 12,
        maxHeight: '70%',
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignSelf: 'center',
        marginBottom: 20,
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    sheetTitle: {
        color: '#FFF',
        fontFamily: 'Poppins-Bold',
        fontSize: 18,
    },
    resetText: {
        color: '#EC5C39',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 14,
    },
    sectionLabel: {
        color: 'rgba(255,255,255,0.5)',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
        marginTop: 4,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 20,
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    chipActive: {
        backgroundColor: 'rgba(236,92,57,0.15)',
        borderColor: '#EC5C39',
    },
    chipText: {
        color: 'rgba(255,255,255,0.6)',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 13,
    },
    chipTextActive: {
        color: '#EC5C39',
    },
    applyButton: {
        backgroundColor: '#EC5C39',
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 8,
    },
    applyText: {
        color: '#FFF',
        fontFamily: 'Poppins-Bold',
        fontSize: 15,
    },
});
