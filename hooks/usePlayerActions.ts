import { useCartStore } from '@/store/useCartStore';
import type { Track } from '@/store/usePlaybackStore';
import { useToastStore } from '@/store/useToastStore';
import { addTrackToDefaultPlaylist, shareTrack, toggleTrackFavourite } from '@/services/playerActions';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';

export function usePlayerActions() {
  const router = useRouter();
  const { showToast } = useToastStore();
  const { addItem } = useCartStore();
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const guardedToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    if (mountedRef.current) {
      showToast(message, type);
    }
  }, [showToast]);

  const onShare = useCallback(async (track: Track) => {
    try {
      await shareTrack(track);
      guardedToast('Share options opened.', 'info');
    } catch {
      guardedToast('Could not open share options.', 'error');
    }
  }, [guardedToast]);

  const onToggleFavourite = useCallback(async (track: Track, liked: boolean) => {
    try {
      const next = await toggleTrackFavourite(track, liked);
      guardedToast(next ? 'Added to favourites.' : 'Removed from favourites.', 'success');
      return next;
    } catch (error) {
      if ((error as Error).message === 'AUTH_REQUIRED') {
        guardedToast('Sign in to save favourites.', 'info');
        router.push({ pathname: '/(auth)/login', params: { redirectTo: '/(tabs)/index' } });
      } else {
        guardedToast('Could not update favourite right now.', 'error');
      }
      return liked;
    }
  }, [guardedToast, router]);

  const onAddToPlaylist = useCallback(async (track: Track) => {
    try {
      await addTrackToDefaultPlaylist(track);
      guardedToast(`${track.title} added to your playlist.`, 'success');
    } catch (error) {
      if ((error as Error).message === 'AUTH_REQUIRED') {
        guardedToast('Log in to add tracks to playlists.', 'info');
        router.push({ pathname: '/(auth)/login', params: { redirectTo: '/(tabs)/index' } });
        return;
      }
      guardedToast('Could not add track to playlist right now.', 'error');
    }
  }, [guardedToast, router]);

  const onAddToCart = useCallback((track: Track) => {
    addItem({
      id: track.id,
      title: track.title,
      artist: track.artist,
      price: 0,
      audioUrl: track.url,
      uploaderId: track.uploaderId || '',
      category: 'Track',
    });
    guardedToast('Track added to cart.', 'success');
  }, [addItem, guardedToast]);

  const onOpenArtist = useCallback((track: Track) => {
    if (!track.uploaderId) {
      guardedToast('Artist profile is unavailable for this track.', 'info');
      return;
    }
    router.push({ pathname: '/profile/[id]', params: { id: track.uploaderId } } as any);
  }, [guardedToast, router]);

  return { onShare, onToggleFavourite, onAddToPlaylist, onAddToCart, onOpenArtist };
}
