import { Icon } from '@/components/ui/Icon';
import { useAppTheme } from '@/hooks/use-app-theme';
import { usePlayerActions } from '@/hooks/usePlayerActions';
import type { Track } from '@/store/usePlaybackStore';
import { useToastStore } from '@/store/useToastStore';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect } from 'react';
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, {
    Easing,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SHEET_HEIGHT = 380;

type MenuItem = {
  id: string;
  label: string;
  icon: string;
  destructive?: boolean;
};

const MENU_ITEMS: MenuItem[] = [
  { id: 'download', label: 'Download', icon: 'download' },
  { id: 'playlist', label: 'Add to Playlist', icon: 'plus-circle' },
  { id: 'cart', label: 'Add to Cart', icon: 'cart' },
  { id: 'details', label: 'View Song Details', icon: 'info' },
  { id: 'artist', label: 'View Artist', icon: 'user' },
  { id: 'report', label: 'Report', icon: 'flag', destructive: true },
];

type Props = {
  visible: boolean;
  track: Track | null;
  onClose: () => void;
};

export function PlayerMenuSheet({ visible, track, onClose }: Props) {
  const appTheme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToastStore();
  const router = useRouter();
  const { onAddToCart, onAddToPlaylist, onOpenArtist } = usePlayerActions();

  const translateY = useSharedValue(SHEET_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  const animateIn = useCallback(() => {
    translateY.value = withTiming(0, {
      duration: 320,
      easing: Easing.out(Easing.cubic),
    });
    backdropOpacity.value = withTiming(1, { duration: 260 });
  }, [translateY, backdropOpacity]);

  const animateOut = useCallback(
    (onDone?: () => void) => {
      translateY.value = withTiming(
        SHEET_HEIGHT,
        { duration: 240, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (finished && onDone) runOnJS(onDone)();
        },
      );
      backdropOpacity.value = withTiming(0, { duration: 200 });
    },
    [translateY, backdropOpacity],
  );

  useEffect(() => {
    if (visible) {
      translateY.value = SHEET_HEIGHT;
      animateIn();
    }
  }, [visible, animateIn, translateY]);

  const handleClose = useCallback(() => {
    animateOut(onClose);
  }, [animateOut, onClose]);

  const handleItem = useCallback(
    (id: string) => {
      if (!track) return;
      switch (id) {
        case 'download':
          router.push('/settings/downloads' as any);
          break;
        case 'playlist':
          void onAddToPlaylist(track);
          break;
        case 'cart':
          onAddToCart(track);
          break;
        case 'details':
          if (track?.id && track?.uploaderId) {
            router.push({ pathname: '/listing/[id]', params: { id: track.id, uploaderId: track.uploaderId } } as any);
          } else {
            showToast('Track details are unavailable for this source.', 'info');
          }
          break;
        case 'artist':
          onOpenArtist(track);
          break;
        case 'report':
          showToast('Thank you for your report.', 'info');
          break;
      }
      handleClose();
    },
    [track, handleClose, showToast, onAddToPlaylist, onAddToCart, onOpenArtist, router],
  );

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const bg = appTheme.isDark ? '#111111' : '#FFFFFF';
  const divider = appTheme.isDark
    ? 'rgba(255,255,255,0.08)'
    : 'rgba(0,0,0,0.07)';

  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="none"
      visible={visible}
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        {/* Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: bg, paddingBottom: insets.bottom + 12 },
            sheetStyle,
          ]}
        >
          {/* Handle pill */}
          <View
            style={[styles.handle, { backgroundColor: divider }]}
          />

          {/* Track title */}
          {track && (
            <View style={styles.trackHeader}>
              <Text
                numberOfLines={1}
                style={[styles.trackTitle, { color: appTheme.colors.textPrimary }]}
              >
                {track.title}
              </Text>
              <Text
                numberOfLines={1}
                style={[styles.trackArtist, { color: appTheme.colors.textSecondary }]}
              >
                {track.artist}
              </Text>
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: divider }]} />

          {/* Menu items */}
          {MENU_ITEMS.map((item, index) => {
            return (
              <PlayerMenuItemRow
                key={item.id}
                item={item}
                index={index}
                divider={divider}
                appTheme={appTheme}
                onPress={() => handleItem(item.id)}
                styles={styles}
              />
            );
          })}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    overflow: 'hidden',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  trackHeader: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  trackTitle: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
  },
  trackArtist: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  menuItemInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  menuLabel: {
    fontSize: 15,
    fontFamily: 'Poppins-Medium',
  },
});

type PlayerMenuItemRowProps = {
  item: MenuItem;
  index: number;
  divider: string;
  appTheme: ReturnType<typeof useAppTheme>;
  onPress: () => void;
  styles: typeof styles;
};

function PlayerMenuItemRow({ item, index, divider, appTheme, onPress, styles }: PlayerMenuItemRowProps) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => (scale.value = withSpring(0.97, { stiffness: 300, damping: 20 }))}
      onPressOut={() => (scale.value = withSpring(1))}
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        pressed && {
          backgroundColor: appTheme.isDark
            ? 'rgba(255,255,255,0.06)'
            : 'rgba(0,0,0,0.04)',
        },
        index < MENU_ITEMS.length - 1 && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: divider,
        },
      ]}
    >
      <Animated.View style={[styles.menuItemInner, animStyle]}>
        <Icon
          name={item.icon as any}
          size={20}
          color={item.destructive ? appTheme.colors.error : appTheme.colors.textPrimary}
        />
        <Text
          style={[
            styles.menuLabel,
            {
              color: item.destructive
                ? appTheme.colors.error
                : appTheme.colors.textPrimary,
            },
          ]}
        >
          {item.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}
