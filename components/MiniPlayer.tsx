import { usePlaybackStore } from '@/store/usePlaybackStore';
import { BlurView } from 'expo-blur';
import { Music, Pause, Play, SkipForward } from 'lucide-react-native';
import React, { useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FullPlayer from './FullPlayer';

export default function MiniPlayer() {
    const { currentTrack, isPlaying, togglePlayPause, position, duration } = usePlaybackStore();
    const [isFullPlayerVisible, setIsFullPlayerVisible] = useState(false);
    const insets = useSafeAreaInsets();

    if (!currentTrack) return null;

    const tabHeight = Platform.OS === 'ios' ? 90 : (60 + insets.bottom);
    const bottomPos = tabHeight + 8;

    const progress = duration > 0 ? (position / duration) * 100 : 0;

    return (
        <>
            <Pressable
                style={[styles.container, { bottom: bottomPos }]}
                onPress={() => setIsFullPlayerVisible(true)}
            >
                <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
                    <View style={styles.content}>
                        <View style={styles.trackInfo}>
                            <View style={styles.artworkContainer}>
                                {currentTrack.artworkUrl ? (
                                    <Image source={{ uri: currentTrack.artworkUrl }} style={styles.artwork} />
                                ) : (
                                    <Music size={20} color="#EC5C39" />
                                )}
                            </View>
                            <View style={styles.textContainer}>
                                <Text style={styles.title} numberOfLines={1}>{currentTrack.title}</Text>
                                <Text style={styles.artist} numberOfLines={1}>{currentTrack.artist}</Text>
                            </View>
                        </View>

                        <View style={styles.controls}>
                            <TouchableOpacity style={styles.controlButton} onPress={togglePlayPause}>
                                {isPlaying ? (
                                    <Pause size={24} color="#FFF" fill="#FFF" />
                                ) : (
                                    <Play size={24} color="#FFF" fill="#FFF" />
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.controlButton}>
                                <SkipForward size={24} color="#FFF" fill="#FFF" />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={[styles.progressBar, { width: `${progress}%` }]} />
                </BlurView>
            </Pressable>

            <FullPlayer
                visible={isFullPlayerVisible}
                onClose={() => setIsFullPlayerVisible(false)}
            />
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 8,
        right: 8,
        height: 60,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: 'rgba(26, 21, 24, 0.8)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        zIndex: 1000,
    },
    content: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        justifyContent: 'space-between',
    },
    trackInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    artworkContainer: {
        width: 40,
        height: 40,
        borderRadius: 6,
        backgroundColor: 'rgba(236, 92, 57, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    artwork: {
        width: '100%',
        height: '100%',
    },
    textContainer: {
        marginLeft: 12,
        flex: 1,
    },
    title: {
        color: '#FFF',
        fontSize: 14,
        fontFamily: 'Poppins-SemiBold',
    },
    artist: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        fontFamily: 'Poppins-Regular',
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    controlButton: {
        padding: 4,
    },
    progressBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        height: 2,
        backgroundColor: '#EC5C39',
    }
});
