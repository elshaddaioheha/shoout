import { MiniPlayerBar } from '@/components/player/MiniPlayerBar';
import React from 'react';

type MiniPlayerProps = {
  onPress?: () => void;
};

export default function MiniPlayer({ onPress }: MiniPlayerProps) {
  return <MiniPlayerBar onExpand={onPress ?? (() => undefined)} />;
}
