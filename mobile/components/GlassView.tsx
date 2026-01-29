import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    intensity?: number;
}

export const GlassView: React.FC<Props> = ({ children, style, intensity = 0.8 }) => {
    return (
        <View style={[styles.container, style]}>
            <LinearGradient
                colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />
            {/* 
               Note: Real blur on Android requires expo-blur (which has performance cost)
               or native modules. For this UI kit, we use a gradient overlay simulation
               to maintain high FPS on low-end devices.
            */}
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
    }
});
