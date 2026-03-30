import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import SettingsHeader from '@/components/settings/SettingsHeader';
import { db } from '@/firebaseConfig';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Heart, MoreVertical, Play, ShoppingCart, Shuffle } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { collection, doc, getDoc, getDocs, orderBy, query } from 'firebase/firestore';

type PlaylistTrackRef = {
  id: string;
  uploadId: string;
  uploaderId: string;
  titleSnapshot?: string;
  artistSnapshot?: string;
  artworkSnapshot?: string;
};

type PlaylistTrack = {
  id: string;
  title: string;
  artist: string;
  duration: string;
  price?: number;
  url: string;
  artworkUrl?: string;
  uploaderId: string;
};

export default function PlaylistScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const initializePlaylist = usePlaybackStore(state => state.initializePlaylist);

  const playlistId = String(params.id || '');
  const [loading, setLoading] = useState(true);
  const [playlistName, setPlaylistName] = useState(String(params.title || 'Playlist'));
  const [playlistSubtitle, setPlaylistSubtitle] = useState('Curated selection');
  const [tracks, setTracks] = useState<PlaylistTrack[]>([]);

  useEffect(() => {
    const loadPlaylist = async () => {
      if (!playlistId) {
        setLoading(false);
        return;
      }

      try {
        const playlistSnap = await getDoc(doc(db, `globalPlaylists/${playlistId}`));
        if (playlistSnap.exists()) {
          const data = playlistSnap.data() as any;
          setPlaylistName(String(data.name || params.title || 'Playlist'));
          setPlaylistSubtitle(data.isPublic ? 'Public playlist' : 'Private playlist');
        }

        const refsQuery = query(
          collection(db, `globalPlaylists/${playlistId}/tracks`),
          orderBy('addedAt', 'desc')
        );
        const refsSnap = await getDocs(refsQuery);
        const refs = refsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as PlaylistTrackRef[];

        const resolved = await Promise.all(refs.map(async (refRow): Promise<PlaylistTrack | null> => {
          if (!refRow.uploadId || !refRow.uploaderId) return null;

          const uploadSnap = await getDoc(doc(db, `users/${refRow.uploaderId}/uploads/${refRow.uploadId}`));
          if (!uploadSnap.exists()) return null;

          const upload = uploadSnap.data() as any;
          const audioUrl = String(upload.audioUrl || '');
          if (!audioUrl) return null;

          return {
            id: refRow.uploadId,
            title: String(upload.title || refRow.titleSnapshot || 'Untitled'),
            artist: String(upload.uploaderName || upload.artist || refRow.artistSnapshot || 'Artist'),
            duration: '3:10',
            price: Number(upload.price || 0),
            url: audioUrl,
            artworkUrl: String(upload.coverUrl || upload.artworkUrl || refRow.artworkSnapshot || ''),
            uploaderId: refRow.uploaderId,
          };
        }));

        setTracks(resolved.filter(Boolean) as PlaylistTrack[]);
      } catch (error) {
        console.error('Failed to load playlist detail:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPlaylist();
  }, [params.title, playlistId]);

  const coverUri = useMemo(() => tracks.find((track) => !!track.artworkUrl)?.artworkUrl || '', [tracks]);

  const mapForPlayback = (rows: PlaylistTrack[]) => rows.map((track) => ({
    id: track.id,
    title: track.title,
    artist: track.artist,
    url: track.url,
    artworkUrl: track.artworkUrl,
    uploaderId: track.uploaderId,
  }));

  const onPlay = async () => {
    if (tracks.length === 0) {
      Alert.alert('Error', 'No playable tracks in this playlist');
      return;
    }

    try {
      await initializePlaylist(mapForPlayback(tracks), 0, false);
    } catch (error) {
      console.error('Failed to start playlist:', error);
      Alert.alert('Error', 'Failed to start playback');
    }
  };

  const onShuffle = async () => {
    if (tracks.length === 0) {
      Alert.alert('Error', 'No playable tracks in this playlist');
      return;
    }

    try {
      await initializePlaylist(mapForPlayback(tracks), 0, true);
    } catch (error) {
      console.error('Failed to start shuffled playlist:', error);
      Alert.alert('Error', 'Failed to start playback');
    }
  };

  return (
    <SafeScreenWrapper>
      <View style={styles.container}>
        <SettingsHeader
          title={playlistName}
          onBack={() => router.back()}
          rightElement={
            <TouchableOpacity style={styles.iconButton} onPress={() => Alert.alert('Coming Soon')}>
              <MoreVertical size={22} color="#FFF" />
            </TouchableOpacity>
          }
          style={{ paddingHorizontal: 0, paddingVertical: 0, marginBottom: 2 }}
        />
        {playlistSubtitle ? <Text style={styles.headerSubtitle}>{playlistSubtitle}</Text> : null}

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color="#EC5C39" />
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <View style={styles.coverWrap}>
              {coverUri ? (
                <Image source={{ uri: coverUri }} style={styles.coverImage} />
              ) : (
                <View style={styles.coverPlaceholder}>
                  <Text style={styles.coverInitials}>{playlistName.slice(0, 2).toUpperCase()}</Text>
                </View>
              )}
            </View>

            <Text style={styles.title}>{playlistName}</Text>
            <Text style={styles.subtitle}>{playlistSubtitle}</Text>

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
              <Text style={styles.metaText}>{tracks.length} track{tracks.length === 1 ? '' : 's'}</Text>
            </View>

            <View style={styles.trackList}>
              {tracks.length === 0 ? (
                <Text style={styles.metaText}>No tracks in this playlist yet.</Text>
              ) : (
                tracks.map((track, idx) => (
                  <TouchableOpacity
                    key={`${track.id}-${idx}`}
                    style={styles.trackRow}
                    onPress={() => {
                      initializePlaylist(mapForPlayback(tracks), idx, false).catch((error) => {
                        console.error('Failed to play playlist track:', error);
                        Alert.alert('Error', 'Failed to play this track');
                      });
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.trackInfo}>
                      <View style={styles.trackThumb}>
                        {track.artworkUrl ? (
                          <Image source={{ uri: track.artworkUrl }} style={styles.trackArtImage} />
                        ) : null}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.trackTitle}>{track.title}</Text>
                        <Text style={styles.trackArtist}>{track.artist}</Text>
                      </View>
                    </View>
                    <View style={styles.trackActions}>
                      <Text style={styles.trackDuration}>{track.duration}</Text>
                      <TouchableOpacity style={styles.smallIcon} onPress={() => Alert.alert('Coming Soon')}>
                        <ShoppingCart size={16} color="#EC5C39" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.smallIcon} onPress={() => Alert.alert('Coming Soon')}>
                        <Heart size={16} color="#EC5C39" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </SafeScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#140F10' },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    overflow: 'hidden',
  },
  trackArtImage: {
    width: '100%',
    height: '100%',
  },
  trackTitle: { color: '#FFF', fontFamily: 'Poppins-Medium', fontSize: 14 },
  trackArtist: { color: 'rgba(255,255,255,0.6)', fontFamily: 'Poppins-Regular', fontSize: 12 },
  trackActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  trackDuration: { color: 'rgba(255,255,255,0.6)', fontFamily: 'Poppins-Regular', fontSize: 12 },
  smallIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(236,92,57,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
