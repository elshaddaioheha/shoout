import React from 'react';
import { StyleSheet, TouchableOpacity, TouchableOpacityProps, ViewStyle } from 'react-native';

import { Icon, IconName } from './Icon';

type IconButtonProps = TouchableOpacityProps & {
    icon?: IconName;
    size?: number;
    color?: string;
    fill?: boolean;
    strokeWidth?: number;
    iconStyle?: ViewStyle;
    iosAnimation?: {
        effect: 'bounce' | 'pulse' | 'scale';
        wholeSymbol?: boolean;
        direction?: 'up' | 'down';
        speed?: number;
    };
};

export function IconButton({
    icon,
    size = 24,
    color,
    fill,
    strokeWidth,
    iosAnimation,
    style,
    iconStyle,
    activeOpacity,
    children,
    ...rest
}: IconButtonProps) {
    return (
        <TouchableOpacity
            {...rest}
            activeOpacity={activeOpacity ?? 0.7}
            style={[styles.container, style, styles.minTouchTarget]}
        >
            {children ?? (
                icon
                    ? <Icon name={icon} size={size} color={color} fill={fill} strokeWidth={strokeWidth} style={iconStyle} iosAnimation={iosAnimation} />
                    : null
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    minTouchTarget: {
        minWidth: 44,
        minHeight: 44,
    },
});