import { FullPlayerView } from '@/components/player/FullPlayerView';
import React from 'react';

interface FullPlayerProps {
  visible: boolean;
  onClose: () => void;
  persistentMode?: boolean;
}

export default function FullPlayer({ onClose }: FullPlayerProps) {
  return <FullPlayerView onCollapse={onClose} />;
}
