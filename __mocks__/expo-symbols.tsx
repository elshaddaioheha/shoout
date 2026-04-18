import React from 'react';
import { View } from 'react-native';

export function SymbolView(props: any) {
    const { style, ...rest } = props;
    return <View accessibilityLabel={rest.name} style={style} />;
}