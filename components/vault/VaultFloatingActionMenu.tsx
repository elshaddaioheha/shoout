import { BlurView } from 'expo-blur';
import { useAppTheme } from '@/hooks/use-app-theme';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { FolderPlus, RefreshCcw, Shapes, UploadCloud } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type VaultLauncherAction = {
  key: string;
  label: string;
  onPress: () => void;
};

interface VaultFloatingActionMenuProps {
  actions: VaultLauncherAction[];
}

const ACTION_ICONS = {
  import: UploadCloud,
  convert: RefreshCcw,
  project: Shapes,
  folder: FolderPlus,
} as const;

function useVaultFloatingMenuStyles() {
  const appTheme = useAppTheme();
  return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function VaultFloatingActionMenu({ actions }: VaultFloatingActionMenuProps) {
  const appTheme = useAppTheme();
  const styles = useVaultFloatingMenuStyles();

  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [visible, setVisible] = useState(false);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const menuTranslateY = useRef(new Animated.Value(20)).current;
  const menuOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const buttonRotate = useRef(new Animated.Value(0)).current;
  const actionAnimations = useRef(actions.map(() => ({
    opacity: new Animated.Value(0),
    translateY: new Animated.Value(14),
    scale: new Animated.Value(0.96),
  }))).current;

  const launcherWidth = Math.min(124, width - 44);
  const menuHorizontalInset = width >= 768 ? Math.max(56, (width - 620) / 2) : 20;

  useEffect(() => {
    if (actionAnimations.length === actions.length) return;
    actionAnimations.splice(
      0,
      actionAnimations.length,
      ...actions.map(() => ({
        opacity: new Animated.Value(0),
        translateY: new Animated.Value(14),
        scale: new Animated.Value(0.96),
      }))
    );
  }, [actionAnimations, actions]);

  useEffect(() => {
    if (!visible) return;

    const itemAnimations = actionAnimations.map((item, index) =>
      Animated.parallel([
        Animated.timing(item.opacity, {
          toValue: 1,
          duration: 180,
          delay: 55 + (index * 35),
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(item.translateY, {
          toValue: 0,
          duration: 220,
          delay: 55 + (index * 35),
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(55 + (index * 35)),
          Animated.spring(item.scale, {
            toValue: 1,
            friction: 8,
            tension: 95,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(menuTranslateY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(menuOpacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(buttonScale, {
        toValue: 1.04,
        friction: 7,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonRotate, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.stagger(28, itemAnimations),
    ]).start();
  }, [actionAnimations, buttonRotate, buttonScale, menuOpacity, menuTranslateY, overlayOpacity, visible]);

  const closeMenu = () => {
    const reverseItemAnimations = [...actionAnimations].reverse().map((item) =>
      Animated.parallel([
        Animated.timing(item.opacity, {
          toValue: 0,
          duration: 110,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(item.translateY, {
          toValue: 10,
          duration: 120,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(item.scale, {
          toValue: 0.97,
          duration: 110,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 160,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(menuTranslateY, {
        toValue: 18,
        duration: 160,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(menuOpacity, {
        toValue: 0,
        duration: 130,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(buttonScale, {
        toValue: 1,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonRotate, {
        toValue: 0,
        duration: 160,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.stagger(18, reverseItemAnimations),
    ]).start(({ finished }) => {
      if (finished) setVisible(false);
    });
  };

  const openMenu = () => {
    setVisible(true);
  };

  const handleLauncherPressIn = () => {
    Animated.spring(buttonScale, {
      toValue: visible ? 1.02 : 0.96,
      friction: 8,
      tension: 120,
      useNativeDriver: true,
    }).start();
  };

  const handleLauncherPressOut = () => {
    Animated.spring(buttonScale, {
      toValue: visible ? 1.04 : 1,
      friction: 8,
      tension: 120,
      useNativeDriver: true,
    }).start();
  };

  const iconRotation = buttonRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <>
      <View style={[styles.launcherWrap, { bottom: Math.max(insets.bottom, 14) + 16 }]}>
        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity
            style={[styles.launcherButton, { width: launcherWidth }]}
            activeOpacity={0.94}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={openMenu}
            onPressIn={handleLauncherPressIn}
            onPressOut={handleLauncherPressOut}
          >
            <BlurView intensity={51} tint={appTheme.isDark ? 'dark' : 'light'} style={styles.launcherBlur}>
              <Animated.Text style={[styles.launcherPlus, { transform: [{ rotate: iconRotation }] }]}>+</Animated.Text>
            </BlurView>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <Modal visible={visible} transparent animationType="none" onRequestClose={closeMenu}>
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu}>
            <Animated.View style={[styles.backdrop, { opacity: overlayOpacity }]} />
          </Pressable>

          <Animated.View
            style={[
              styles.menuWrap,
              {
                bottom: Math.max(insets.bottom, 14) + 96,
                left: menuHorizontalInset,
                right: menuHorizontalInset,
                opacity: menuOpacity,
                transform: [{ translateY: menuTranslateY }],
              },
            ]}
          >
            <BlurView intensity={28} tint={appTheme.isDark ? 'dark' : 'light'} style={styles.menuBlur}>
              <View style={styles.menuGrid}>
                {actions.map((action, index) => {
                  const Icon = ACTION_ICONS[action.key as keyof typeof ACTION_ICONS] ?? FolderPlus;
                  const itemAnimation = actionAnimations[index];
                  return (
                    <Animated.View
                      key={action.key}
                      style={{
                        width: '47%',
                        opacity: itemAnimation?.opacity ?? 1,
                        transform: [
                          { translateY: itemAnimation?.translateY ?? 0 },
                          { scale: itemAnimation?.scale ?? 1 },
                        ],
                      }}
                    >
                      <TouchableOpacity
                        style={styles.menuAction}
                        activeOpacity={0.9}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        onPress={() => {
                          closeMenu();
                          setTimeout(action.onPress, 140);
                        }}
                      >
                        <View style={styles.menuIconWrap}>
                          <Icon size={18} color={appTheme.colors.primary} />
                        </View>
                        <Text style={styles.menuLabel}>{action.label}</Text>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
              </View>
            </BlurView>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const legacyStyles = {
  launcherWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 40,
  },
  launcherButton: {
    height: 58,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 12,
  },
  launcherBlur: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 27, 0.52)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  launcherPlus: {
    color: '#FFFFFF',
    fontSize: 34,
    lineHeight: 38,
    fontFamily: 'Poppins-SemiBold',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 10, 15, 0.48)',
  },
  menuWrap: {
    position: 'absolute',
    borderRadius: 28,
    overflow: 'hidden',
    maxWidth: 620,
    alignSelf: 'center',
  },
  menuBlur: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(26, 26, 27, 0.76)',
    padding: 16,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  menuAction: {
    minHeight: 88,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 14,
    justifyContent: 'space-between',
  },
  menuIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: 'rgba(236,92,57,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
  },
};
