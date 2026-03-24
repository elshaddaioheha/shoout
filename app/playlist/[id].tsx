import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, MoreVertical, Play, Shuffle, Heart, ShoppingCart } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Template-only screen for playlist detail. Pass real data via route params or wire to store later.
export default function PlaylistScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const meta = {
    id: (params.id as string) || 'playlist',
    title: (params.title as string) || 'Playlist Title',
    subtitle: (params.subtitle as string) || 'Curated selection',
    price: (params.price as string) || '',
    cover: (params.cover as string) || '',
  };

  const tracks = useMemo(() => {
    if (typeof params.tracks === 'string') {
      try {
        const parsed = JSON.parse(params.tracks);
        if (Array.isArray(parsed)) return parsed.slice(0, 20);
      } catch (e) {
        // ignore parse errors, fall back to template placeholders
      }
    }
    return Array.from({ length: 6 }).map((_, idx) => ({
      id: `placeholder-${idx}`,
      title: 'Track title',
      artist: 'Artist name',
      duration: '3:10',
      price: meta.price,
    }));
  }, [params.tracks, meta.price]);

  const onPlay = () => {
    // TODO: hook into existing player / playback store with playlist id
  };

  const onShuffle = () => {
    // TODO: hook shuffle into existing player / playback store
  };

  return (
    <SafeScreenWrapper>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
            <ChevronLeft size={22} color="#FFF" />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.headerTitle}>{meta.title}</Text>
            <Text style={styles.headerSubtitle}>{meta.subtitle}</Text>
          </View>
          <TouchableOpacity style={styles.iconButton}>
            <MoreVertical size={22} color="#FFF" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.coverWrap}>
            {meta.cover ? (
              <Image source={{ uri: meta.cover }} style={styles.coverImage} />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Text style={styles.coverInitials}>{meta.title.slice(0, 2).toUpperCase()}</Text>
              </View>
            )}
          </View>

          <Text style={styles.title}>{meta.title}</Text>
          <Text style={styles.subtitle}>{meta.subtitle}</Text>
          {meta.price ? <Text style={styles.price}>{meta.price}</Text> : null}

          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.cta, styles.ctaGhost]} activeOpacity={0.9} onPress={onShuffle}>
              <Shuffle size={18} color="#EC5C39" />
              <Text style={[styles.ctaText, styles.ctaGhostText]}>Shuffle</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.cta, styles.ctaSolid]} activeOpacity={0.9} onPress={onPlay}>
              <Play size={18} color="#140F10" />
              <Text style={[styles.ctaText, styles.ctaSolidText]}>Play</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>Template playlist · {tracks.length} tracks</Text>
            {meta.price ? <Text style={styles.metaText}>{meta.price}</Text> : null}
          </View>

          <View style={styles.trackList}>
            {tracks.map((t, idx) => (
              <View key={t.id || idx} style={styles.trackRow}>
                <View style={styles.trackInfo}>
                  <View style={styles.trackThumb} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.trackTitle}>{t.title}</Text>
                    <Text style={styles.trackArtist}>{t.artist}</Text>
                  </View>
                </View>
                <View style={styles.trackActions}>
                  {t.price ? <Text style={styles.trackPrice}>{t.price}</Text> : <Text style={styles.trackDuration}>{t.duration}</Text>}
                  <TouchableOpacity style={styles.smallIcon}>
                    <ShoppingCart size={16} color="#EC5C39" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.smallIcon}>
                    <Heart size={16} color="#EC5C39" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </SafeScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#140F10' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#FFF', fontFamily: 'Poppins-Bold', fontSize: 16 },
  headerSubtitle: { color: 'rgba(255,255,255,0.6)', fontFamily: 'Poppins-Regular', fontSize: 12 },
  content: { padding: 20, paddingBottom: 60 },
  coverWrap: { alignItems: 'center', marginBottom: 18 },
  coverImage: { width: 260, height: 260, borderRadius: 16, resizeMode: 'cover' },
  coverPlaceholder: {
    width: 260,
    height: 260,
    borderRadius: 16,
    backgroundColor: '#1F1719',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverInitials: { color: '#EC5C39', fontFamily: 'Poppins-Bold', fontSize: 42, letterSpacing: 1 },
  title: { color: '#FFF', fontFamily: 'Poppins-Bold', fontSize: 22, textAlign: 'center' },
  subtitle: { color: 'rgba(255,255,255,0.7)', fontFamily: 'Poppins-Regular', fontSize: 14, textAlign: 'center', marginTop: 6 },
  price: { color: '#EC5C39', fontFamily: 'Poppins-Medium', fontSize: 14, textAlign: 'center', marginTop: 4 },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 18, marginBottom: 8 },
  cta: {
    flex: 1,
    flexDirection: 'row',
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
  },
  ctaGhost: { borderColor: '#EC5C39', backgroundColor: 'rgba(236,92,57,0.08)' },
  ctaSolid: { borderColor: '#EC5C39', backgroundColor: '#EC5C39' },
  ctaText: { fontFamily: 'Poppins-Bold', fontSize: 14 },
  ctaGhostText: { color: '#EC5C39' },
  ctaSolidText: { color: '#140F10' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  metaText: { color: 'rgba(255,255,255,0.6)', fontFamily: 'Poppins-Regular', fontSize: 12 },
  trackList: { marginTop: 16, gap: 14 },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  trackInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  trackThumb: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  trackTitle: { color: '#FFF', fontFamily: 'Poppins-Medium', fontSize: 14 },
  trackArtist: { color: 'rgba(255,255,255,0.6)', fontFamily: 'Poppins-Regular', fontSize: 12 },
  trackActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  trackDuration: { color: 'rgba(255,255,255,0.6)', fontFamily: 'Poppins-Regular', fontSize: 12 },
  trackPrice: { color: '#EC5C39', fontFamily: 'Poppins-Bold', fontSize: 12 },
  smallIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(236,92,57,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
