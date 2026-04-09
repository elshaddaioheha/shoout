import { Easing } from 'react-native';

export function getAuthMotionDurations(reduceMotion: boolean) {
  if (reduceMotion) {
    return {
      splashHold: 120,
      splashExit: 120,
      contentEnter: 120,
      slideChange: 140,
      progress: 140,
    };
  }

  return {
    splashHold: 560,
    splashExit: 320,
    contentEnter: 320,
    slideChange: 280,
    progress: 260,
  };
}

export const authMotionEasing = {
  standard: Easing.out(Easing.cubic),
  emphasized: Easing.bezier(0.2, 0.9, 0.2, 1),
};
