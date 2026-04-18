import { useAppTheme } from '@/hooks/use-app-theme';
import * as LucideIcons from 'lucide-react-native';
import React from 'react';
import { Platform, StyleProp, ViewStyle } from 'react-native';
import { SymbolView, SymbolViewProps } from 'expo-symbols';

type IconName =
    | 'play'
    | 'pause'
    | 'heart'
    | 'chevron-down'
    | 'chevron-left'
    | 'chevron-right'
    | 'x'
    | 'skip-back'
    | 'skip-forward'
    | 'more-horizontal'
    | 'shuffle'
    | 'repeat'
    | 'repeat-one'
    | 'home'
    | 'library'
    | 'search'
    | 'cart'
    | 'upload'
    | 'megaphone'
    | 'music'
    | 'bell'
    | 'plus'
    | 'check'
    | 'check-circle'
    | 'info'
    | 'eye'
    | 'eye-off'
    | 'view'
    | 'lock'
    | 'shield'
    | 'shield-alert'
    | 'credit-card'
    | 'globe'
    | 'type'
    | 'user'
    | 'user-x'
    | 'share'
    | 'download'
    | 'refresh'
    | 'file-text'
    | 'file-pen-line'
    | 'message-help'
    | 'message-square'
    | 'grid-3x3'
    | 'list'
    | 'folder-plus'
    | 'folder-lock'
    | 'disc3'
    | 'mic'
    | 'mic2'
    | 'upload-cloud'
    | 'circle-dollar-sign'
    | 'rocket'
    | 'trending-up'
    | 'dollar-sign'
    | 'play-circle'
    | 'users'
    | 'link-2'
    | 'archive'
    | 'filter'
    | 'refresh-ccw'
    | 'sparkles'
    | 'log-out'
    | 'zap'
    | 'banknote'
    | 'circle-help'
    | 'history'
    | 'crown'
    | 'settings';

type IconProps = {
    name: IconName;
    size?: number;
    color?: string;
    fill?: boolean;
    strokeWidth?: number;
    style?: StyleProp<ViewStyle>;
    iosAnimation?: {
        effect: 'bounce' | 'pulse' | 'scale';
        wholeSymbol?: boolean;
        direction?: 'up' | 'down';
        speed?: number;
    };
};

const ICON_MAP: Record<IconName, { sf: string; sfFill?: string; lucide: keyof typeof LucideIcons }> = {
    play: { sf: 'play.fill', lucide: 'Play' },
    pause: { sf: 'pause.fill', lucide: 'Pause' },
    heart: { sf: 'heart', sfFill: 'heart.fill', lucide: 'Heart' },
    'chevron-down': { sf: 'chevron.down', lucide: 'ChevronDown' },
    'chevron-left': { sf: 'chevron.left', lucide: 'ChevronLeft' },
    'chevron-right': { sf: 'chevron.right', lucide: 'ChevronRight' },
    x: { sf: 'xmark', lucide: 'X' },
    'skip-back': { sf: 'backward.fill', lucide: 'SkipBack' },
    'skip-forward': { sf: 'forward.fill', lucide: 'SkipForward' },
    'more-horizontal': { sf: 'ellipsis', lucide: 'MoreHorizontal' },
    shuffle: { sf: 'shuffle', lucide: 'Shuffle' },
    repeat: { sf: 'repeat', lucide: 'Repeat' },
    'repeat-one': { sf: 'repeat.1', lucide: 'Repeat1' },
    home: { sf: 'house', sfFill: 'house.fill', lucide: 'Home' },
    library: { sf: 'books.vertical', sfFill: 'books.vertical.fill', lucide: 'Library' },
    search: { sf: 'magnifyingglass', lucide: 'Search' },
    cart: { sf: 'cart', sfFill: 'cart.fill', lucide: 'ShoppingCart' },
    upload: { sf: 'square.and.arrow.up', lucide: 'Upload' },
    megaphone: { sf: 'megaphone', lucide: 'Megaphone' },
    music: { sf: 'music.note', lucide: 'Music' },
    bell: { sf: 'bell', sfFill: 'bell.fill', lucide: 'Bell' },
    'check-circle': { sf: 'checkmark.circle', lucide: 'CheckCircle' },
    info: { sf: 'info.circle', lucide: 'Info' },
    'shield-alert': { sf: 'shield.lefthalf.filled', lucide: 'ShieldAlert' },
    'file-pen-line': { sf: 'square.and.pencil', lucide: 'FilePenLine' },
    'circle-dollar-sign': { sf: 'dollarsign.circle', lucide: 'CircleDollarSign' },
    'folder-lock': { sf: 'folder.badge.lock.fill', lucide: 'FolderLock' },
    disc3: { sf: 'opticaldisc', lucide: 'Disc3' },
    mic2: { sf: 'mic.fill', lucide: 'Mic2' },
    rocket: { sf: 'rocket.fill', lucide: 'Rocket' },
    'trending-up': { sf: 'chart.line.uptrend.xyaxis', lucide: 'TrendingUp' },
    'dollar-sign': { sf: 'dollarsign.circle', lucide: 'DollarSign' },
    'play-circle': { sf: 'play.circle.fill', lucide: 'PlayCircle' },
    users: { sf: 'person.2.fill', lucide: 'Users' },
    'link-2': { sf: 'link', lucide: 'Link2' },
    view: { sf: 'eye', lucide: 'Eye' },
    archive: { sf: 'archivebox.fill', lucide: 'Archive' },
    filter: { sf: 'line.horizontal.3.decrease.circle', lucide: 'Filter' },
    plus: { sf: 'plus', lucide: 'Plus' },
    check: { sf: 'checkmark', lucide: 'Check' },
    eye: { sf: 'eye', sfFill: 'eye.fill', lucide: 'Eye' },
    'eye-off': { sf: 'eye.slash', lucide: 'EyeOff' },
    lock: { sf: 'lock.fill', lucide: 'Lock' },
    shield: { sf: 'shield.fill', lucide: 'Shield' },
    'credit-card': { sf: 'creditcard.fill', lucide: 'CreditCard' },
    globe: { sf: 'globe', lucide: 'Globe' },
    type: { sf: 'textformat', lucide: 'Type' },
    user: { sf: 'person.fill', lucide: 'User' },
    'user-x': { sf: 'person.fill.xmark', lucide: 'UserX' },
    share: { sf: 'square.and.arrow.up', lucide: 'Share2' },
    download: { sf: 'arrow.down.circle', lucide: 'Download' },
    refresh: { sf: 'arrow.clockwise', lucide: 'RefreshCw' },
    'file-text': { sf: 'doc.text', lucide: 'FileText' },
    'message-help': { sf: 'message.fill', lucide: 'MessageCircleQuestion' },
    'message-square': { sf: 'message', lucide: 'MessageSquare' },
    'grid-3x3': { sf: 'square.grid.3x3', lucide: 'Grid3x3' },
    list: { sf: 'list.bullet', lucide: 'List' },
    'folder-plus': { sf: 'folder.badge.plus', lucide: 'FolderPlus' },
    mic: { sf: 'mic.fill', lucide: 'Mic' },
    'upload-cloud': { sf: 'square.and.arrow.up', lucide: 'UploadCloud' },
    'refresh-ccw': { sf: 'arrow.counterclockwise', lucide: 'RefreshCcw' },
    sparkles: { sf: 'sparkles', lucide: 'Sparkles' },
    'log-out': { sf: 'rectangle.portrait.and.arrow.right', lucide: 'LogOut' },
    zap: { sf: 'bolt.fill', lucide: 'Zap' },
    banknote: { sf: 'banknote', lucide: 'Banknote' },
    'circle-help': { sf: 'questionmark.circle', lucide: 'CircleHelp' },
    history: { sf: 'clock', lucide: 'History' },
    crown: { sf: 'crown.fill', lucide: 'Crown' },
    settings: { sf: 'gearshape.fill', lucide: 'Settings' },
};

export function Icon({ name, size = 24, color, fill = false, strokeWidth, style, iosAnimation }: IconProps) {
    const theme = useAppTheme();
    const resolvedColor = color ?? theme.colors.textPrimary;
    const iconConfig = ICON_MAP[name];

    if (Platform.OS === 'ios') {
        const symbolName = fill && iconConfig.sfFill ? iconConfig.sfFill : iconConfig.sf;
        const animationSpec: SymbolViewProps['animationSpec'] | undefined = iosAnimation
            ? {
                effect: {
                    type: iosAnimation.effect,
                    wholeSymbol: iosAnimation.wholeSymbol,
                    direction: iosAnimation.direction,
                },
                speed: iosAnimation.speed,
            }
            : undefined;

        return (
            <SymbolView
                name={symbolName as any}
                tintColor={resolvedColor}
                resizeMode="scaleAspectFit"
                animationSpec={animationSpec}
                style={[{ width: size, height: size }, style]}
            />
        );
    }

    const LucideIcon = LucideIcons[iconConfig.lucide] as React.ComponentType<any>;

    return (
        <LucideIcon
            size={size}
            color={resolvedColor}
            fill={fill ? resolvedColor : 'none'}
            strokeWidth={strokeWidth}
            style={style}
        />
    );
}

export type { IconName };