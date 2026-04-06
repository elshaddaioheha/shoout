import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import SettingsHeader from '@/components/settings/SettingsHeader';
import { auth, db } from '@/firebaseConfig';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useCartStore } from '@/store/useCartStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useToastStore } from '@/store/useToastStore';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Heart, MoreVertical, Play, ShoppingCart, Shuffle } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';

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
  durationMs: number;
  price?: number;
  url: string;
  artworkUrl?: string;
  uploaderId: string;
};

function formatDurationFromMs(ms: number) {
  if (!ms || ms < 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function parseDurationMs(raw: any) {
  const direct = Number(raw?.durationMs || raw?.durationMillis || raw?.duration || 0);
  if (Number.isFinite(direct) && direct > 0) {
    return direct > 10000 ? direct : direct * 1000;
  }
  return 190000;
}

function usePlaylistStyles() {
  const appTheme = useAppTheme();
  return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function PlaylistScreen() {
  const appTheme = useAppTheme();
  const styles = usePlaylistStyles();

  const router = useRouter();
  const params = useLocalSearchParams();
  const { addItem } = useCartStore();
  const { showToast } = useToastStore();
  const initializePlaylist = usePlaybackStore(state => state.initializePlaylist);

  const playlistId = String(params.id || '');
  const [loading, setLoading] = useState(true);
  const [playlistName, setPlaylistName] = useState(String(params.title || 'Playlist'));
  const [playlistSubtitle, setPlaylistSubtitle] = useState('Curated selection');
  const [createdByLabel, setCreatedByLabel] = useState('Unknown creator');
  const [createdDateLabel, setCreatedDateLabel] = useState('');
  const [tracks, setTracks] = useState<PlaylistTrack[]>([]);
  const [favouriteIds, setFavouriteIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setFavouriteIds({});
      return;
    }

    const unsub = onSnapshot(collection(db, `users/${uid}/favourites`), (snap) => {
      const map: Record<string, boolean> = {};
      snap.forEach((item) => {
        map[item.id] = true;
      });
      setFavouriteIds(map);
    });

    return () => unsub();
  }, []);

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

          const createdAtDate = data.createdAt?.toDate?.();
          setCreatedDateLabel(createdAtDate ? createdAtDate.toLocaleDateString() : '');

          if (data.ownerId) {
            const ownerSnap = await getDoc(doc(db, `users/${String(data.ownerId)}`));
            if (ownerSnap.exists()) {
              const ownerData = ownerSnap.data() as any;
              const ownerName = String(ownerData.fullName || ownerData.displayName || '').trim();
              setCreatedByLabel(ownerName || `Creator ${String(data.ownerId).slice(-5)}`);
            } else {
              setCreatedByLabel(`Creator ${String(data.ownerId).slice(-5)}`);
            }
          }
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
          const trackDurationMs = parseDurationMs(upload);

          return {
            id: refRow.uploadId,
            title: String(upload.title || refRow.titleSnapshot || 'Untitled'),
            artist: String(upload.uploaderName || upload.artist || refRow.artistSnapshot || 'Artist'),
            duration: formatDurationFromMs(trackDurationMs),
            durationMs: trackDurationMs,
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
  const totalDurationMs = useMemo(() => tracks.reduce((sum, track) => sum + (track.durationMs || 0), 0), [tracks]);

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

  const handleTrackAddToCart = (track: PlaylistTrack) => {
    addItem({
      id: track.id,
      title: track.title,
      artist: track.artist,
      price: track.price || 0,
      audioUrl: track.url,
      uploaderId: track.uploaderId,
      category: 'Track',
    });
    showToast(`${track.title} added to cart.`, 'success');
  };

  const handleToggleFavourite = async (track: PlaylistTrack) => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      showToast('Sign in to save favourites.', 'info');
      return;
    }

    const favRef = doc(db, `users/${uid}/favourites`, track.id);
    try {
      if (favouriteIds[track.id]) {
        await deleteDoc(favRef);
        showToast('Removed from favourites.', 'info');
      } else {
        await setDoc(favRef, {
          id: track.id,
          title: track.title,
          artist: track.artist,
          url: track.url,
          uploaderId: track.uploaderId || '',
          addedAt: new Date().toISOString(),
        });
        showToast('Added to favourites.', 'success');
      }
    } catch (error) {
      console.error('Toggle favourite in playlist failed:', error);
      showToast('Could not update favourite right now.', 'error');
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
              <MoreVertical size={22} color={appTheme.colors.textPrimary} />
            </TouchableOpacity>
          }
          style={{ paddingHorizontal: 0, paddingVertical: 0, marginBottom: 2 }}
        />
        {playlistSubtitle ? <Text style={styles.headerSubtitle}>{playlistSubtitle}</Text> : null}

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={appTheme.colors.primary} />
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
                <Shuffle size={18} color={appTheme.colors.primary} />
                <Text style={[styles.ctaText, styles.ctaGhostText]}>Shuffle</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.cta, styles.ctaSolid]} activeOpacity={0.9} onPress={onPlay}>
                <Play size={18} color={appTheme.colors.background} />
                <Text style={[styles.ctaText, styles.ctaSolidText]}>Play</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaText}>{tracks.length} track{tracks.length === 1 ? '' : 's'}</Text>
              <Text style={styles.metaText}>Total {formatDurationFromMs(totalDurationMs)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>By {createdByLabel}</Text>
              <Text style={styles.metaText}>{createdDateLabel ? `Created ${createdDateLabel}` : ''}</Text>
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
                      <TouchableOpacity style={styles.smallIcon} onPress={() => handleTrackAddToCart(track)}>
                        <ShoppingCart size={16} color={appTheme.colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.smallIcon} onPress={() => handleToggleFavourite(track)}>
                        <Heart size={16} color={appTheme.colors.primary} fill={favouriteIds[track.id] ? appTheme.colors.primary : 'transparent'} />
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

const legacyStyles = {
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
};
