import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const wp = (percent: number) => (SCREEN_WIDTH * percent) / 100;
export const hp = (percent: number) => (SCREEN_HEIGHT * percent) / 100;
export const normalize = (size: number) => {
    const scale = SCREEN_WIDTH / 390;
    return Math.round(PixelRatio.roundToNearestPixel(size * scale));
};
