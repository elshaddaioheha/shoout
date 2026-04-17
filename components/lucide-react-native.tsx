import React from 'react';
import * as Hugeicons from 'hugeicons-react-native';
import type { HugeiconsProps } from 'hugeicons-react-native';
import { useAppTheme } from '@/hooks/use-app-theme';

type IconComponent = React.ComponentType<HugeiconsProps & React.RefAttributes<unknown>>;

const HUGEICONS = Hugeicons as unknown as Record<string, IconComponent>;
const FALLBACK_ICON = HUGEICONS.AlertSquareIcon;

const ICON_MAP: Record<string, string> = {
  ArrowLeft: 'ArrowLeft01Icon',
  ArrowRight: 'ArrowRight01Icon',
  ArrowUpRight: 'ArrowUp01Icon',
  ArrowDownRight: 'ArrowDown01Icon',
  ArrowDown: 'ArrowDown01Icon',
  ArrowUp: 'ArrowUp01Icon',
  ArrowReloadHorizontal: 'ArrowReloadHorizontalIcon',
  ArrowReloadVertical: 'ArrowReloadVerticalIcon',
  Banknote: 'DollarSquareIcon',
  Bell: 'Notification01Icon',
  Check: 'CheckmarkCircle01Icon',
  CheckCircle: 'CheckmarkCircle01Icon',
  CheckCircle2: 'CheckmarkCircle01Icon',
  CheckCheck: 'CheckmarkCircle01Icon',
  ChevronDown: 'ArrowDown01Icon',
  ChevronLeft: 'ArrowLeft01Icon',
  ChevronRight: 'ArrowRight01Icon',
  CircleDollarSign: 'DollarCircleIcon',
  CircleHelp: 'BubbleChatPreviewIcon',
  Clock: 'Clock01Icon',
  CreditCard: 'CreditCardIcon',
  Crown: 'HonourStarIcon',
  Disc3: 'Disc01Icon',
  DollarSign: 'DollarCircleIcon',
  Download: 'Download01Icon',
  Edit3: 'Edit01Icon',
  Eye: 'EyeIcon',
  EyeOff: 'ViewOffSlashIcon',
  ExternalLink: 'Link01Icon',
  FileText: 'TextIcon',
  Filter: 'FilterIcon',
  Flame: 'FallingStarIcon',
  FolderLock: 'CircleLock01Icon',
  FolderPlus: 'FolderFavouriteIcon',
  Globe: 'AiViewIcon',
  Grid3x3: 'BoundingBoxIcon',
  Heart: 'FavouriteIcon',
  History: 'ReplayIcon',
  Home: 'Home01Icon',
  Image: 'ImageUpload01Icon',
  ImagePlus: 'ImageUpload01Icon',
  Info: 'BubbleChatPreviewIcon',
  Library: 'LibraryIcon',
  Link2: 'Link01Icon',
  Lock: 'CircleLock01Icon',
  LogOut: 'Logout01Icon',
  Mail: 'Mail01Icon',
  Megaphone: 'Megaphone01Icon',
  MessageCircleQuestion: 'Message01Icon',
  MessageSquare: 'Message01Icon',
  MessageSquarePlus: 'CommentAdd01Icon',
  Mic: 'AiPhone01Icon',
  Mic2: 'AiPhone01Icon',
  MoreHorizontal: 'MoreHorizontalIcon',
  MoreVertical: 'MoreVerticalIcon',
  Music: 'MusicNote01Icon',
  Music2: 'MusicNote02Icon',
  Music4: 'MusicNote01Icon',
  Paperclip: 'Attachment01Icon',
  PartyPopper: 'HonourStarIcon',
  Pause: 'PauseIcon',
  Phone: 'Phone01Icon',
  Play: 'PlayIcon',
  PlayCircle: 'PlayCircleIcon',
  Plus: 'Add01Icon',
  RefreshCcw: 'ArrowReloadVerticalIcon',
  RefreshCw: 'ArrowReloadHorizontalIcon',
  Repeat: 'RepeatIcon',
  Repeat1: 'RepeatIcon',
  Repeat2: 'RepeatIcon',
  Rocket: 'ArrowUp01Icon',
  Save: 'BookmarkAdd01Icon',
  Search: 'Search01Icon',
  Send: 'ArrowRight01Icon',
  SendHorizontal: 'ArrowRight01Icon',
  Settings: 'Settings01Icon',
  Share2: 'Share01Icon',
  Shield: 'ShieldUserIcon',
  ShieldAlert: 'ShieldUserIcon',
  ShieldCheck: 'ShieldCheckIcon',
  ShoppingBag: 'ShoppingBag01Icon',
  ShoppingCart: 'ShoppingCart01Icon',
  Shuffle: 'ShuffleIcon',
  SkipBack: 'ArrowLeft01Icon',
  SkipForward: 'ArrowRight01Icon',
  Sparkles: 'SparklesIcon',
  Square: 'CancelSquareIcon',
  Star: 'StarIcon',
  Tag: 'DiscountTag01Icon',
  Target: 'BoundingBoxIcon',
  Text: 'TextIcon',
  Trash2: 'Delete01Icon',
  TrendingDown: 'ArrowDown01Icon',
  TrendingUp: 'ArrowUp01Icon',
  Type: 'TextIcon',
  Upload: 'Upload01Icon',
  UploadCloud: 'Upload01Icon',
  User: 'UserIcon',
  UserRound: 'UserSquareIcon',
  UserX: 'UserRemove01Icon',
  Users: 'UserIcon',
  Video: 'Video01Icon',
  View: 'AiViewIcon',
  WandSparkles: 'SparklesIcon',
  Wallet: 'DollarSquareIcon',
  X: 'CancelSquareIcon',
  Zap: 'ArrowReloadHorizontalIcon',
};

function createIcon(iconName: string) {
  const HugeiconComponent = HUGEICONS[ICON_MAP[iconName] ?? iconName] ?? FALLBACK_ICON;

  const Icon = React.forwardRef<unknown, HugeiconsProps>(function LucideCompatIcon(props, ref) {
    const appTheme = useAppTheme();
    const { color, variant = 'stroke', type = 'rounded', strokeWidth = 1.5, ...rest } = props;
    return React.createElement(HugeiconComponent, {
      ref,
      color: color ?? appTheme.colors.textPrimary,
      variant,
      type,
      strokeWidth,
      ...rest,
    });
  });

  Icon.displayName = iconName;
  return Icon;
}

export const ArrowDownRight = createIcon('ArrowDownRight');
export const ArrowLeft = createIcon('ArrowLeft');
export const ArrowRight = createIcon('ArrowRight');
export const ArrowUpRight = createIcon('ArrowUpRight');
export const Banknote = createIcon('Banknote');
export const Bell = createIcon('Bell');
export const Building2 = createIcon('Building2');
export const CalendarDays = createIcon('CalendarDays');
export const Camera = createIcon('Camera');
export const Check = createIcon('Check');
export const CheckCheck = createIcon('CheckCheck');
export const CheckCircle = createIcon('CheckCircle');
export const CheckCircle2 = createIcon('CheckCircle2');
export const ChevronDown = createIcon('ChevronDown');
export const ChevronLeft = createIcon('ChevronLeft');
export const ChevronRight = createIcon('ChevronRight');
export const CircleDollarSign = createIcon('CircleDollarSign');
export const CircleHelp = createIcon('CircleHelp');
export const Clock = createIcon('Clock');
export const CreditCard = createIcon('CreditCard');
export const Crown = createIcon('Crown');
export const Delete = createIcon('Delete');
export const Disc3 = createIcon('Disc3');
export const DollarSign = createIcon('DollarSign');
export const Download = createIcon('Download');
export const Edit3 = createIcon('Edit3');
export const Eye = createIcon('Eye');
export const EyeOff = createIcon('EyeOff');
export const ExternalLink = createIcon('ExternalLink');
export const FileText = createIcon('FileText');
export const Filter = createIcon('Filter');
export const Flame = createIcon('Flame');
export const FolderLock = createIcon('FolderLock');
export const FolderPlus = createIcon('FolderPlus');
export const Globe = createIcon('Globe');
export const Grid3x3 = createIcon('Grid3x3');
export const Heart = createIcon('Heart');
export const History = createIcon('History');
export const Home = createIcon('Home');
export const Image = createIcon('Image');
export const ImagePlus = createIcon('ImagePlus');
export const Info = createIcon('Info');
export const Library = createIcon('Library');
export const Link2 = createIcon('Link2');
export const Lock = createIcon('Lock');
export const LogOut = createIcon('LogOut');
export const Mail = createIcon('Mail');
export const Megaphone = createIcon('Megaphone');
export const MessageCircleQuestion = createIcon('MessageCircleQuestion');
export const MessageSquare = createIcon('MessageSquare');
export const MessageSquarePlus = createIcon('MessageSquarePlus');
export const Mic = createIcon('Mic');
export const Mic2 = createIcon('Mic2');
export const MoreHorizontal = createIcon('MoreHorizontal');
export const MoreVertical = createIcon('MoreVertical');
export const Music = createIcon('Music');
export const Music2 = createIcon('Music2');
export const Music4 = createIcon('Music4');
export const Paperclip = createIcon('Paperclip');
export const PartyPopper = createIcon('PartyPopper');
export const Pause = createIcon('Pause');
export const Phone = createIcon('Phone');
export const Play = createIcon('Play');
export const PlayCircle = createIcon('PlayCircle');
export const Plus = createIcon('Plus');
export const RefreshCcw = createIcon('RefreshCcw');
export const RefreshCw = createIcon('RefreshCw');
export const Repeat = createIcon('Repeat');
export const Repeat1 = createIcon('Repeat1');
export const Repeat2 = createIcon('Repeat2');
export const Rocket = createIcon('Rocket');
export const Save = createIcon('Save');
export const Search = createIcon('Search');
export const Send = createIcon('Send');
export const SendHorizontal = createIcon('SendHorizontal');
export const Settings = createIcon('Settings');
export const Share2 = createIcon('Share2');
export const Shield = createIcon('Shield');
export const ShieldAlert = createIcon('ShieldAlert');
export const ShieldCheck = createIcon('ShieldCheck');
export const ShoppingBag = createIcon('ShoppingBag');
export const ShoppingCart = createIcon('ShoppingCart');
export const Shuffle = createIcon('Shuffle');
export const SkipBack = createIcon('SkipBack');
export const SkipForward = createIcon('SkipForward');
export const Sparkles = createIcon('Sparkles');
export const Square = createIcon('Square');
export const Star = createIcon('Star');
export const Tag = createIcon('Tag');
export const Target = createIcon('Target');
export const Text = createIcon('Text');
export const ThumbsDown = createIcon('ThumbsDown');
export const Trash2 = createIcon('Trash2');
export const TrendingDown = createIcon('TrendingDown');
export const TrendingUp = createIcon('TrendingUp');
export const Type = createIcon('Type');
export const Upload = createIcon('Upload');
export const UploadCloud = createIcon('UploadCloud');
export const User = createIcon('User');
export const UserRound = createIcon('UserRound');
export const UserX = createIcon('UserX');
export const Users = createIcon('Users');
export const Video = createIcon('Video');
export const View = createIcon('View');
export const WandSparkles = createIcon('WandSparkles');
export const Wallet = createIcon('Wallet');
export const X = createIcon('X');
export const Zap = createIcon('Zap');
