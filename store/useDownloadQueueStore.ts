import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type DownloadStatus = 'queued' | 'downloading' | 'completed' | 'failed';

export interface DownloadItem {
  id: string;
  trackId: string;
  title: string;
  artist: string;
  audioUrl: string;
  status: DownloadStatus;
  progress: number;
  localUri: string | null;
  error: string | null;
  createdAt: number;
  updatedAt: number;
}

interface EnqueueInput {
  trackId: string;
  title: string;
  artist: string;
  audioUrl: string;
}

interface DownloadQueueState {
  items: DownloadItem[];
  isProcessing: boolean;
  enqueueTrack: (input: EnqueueInput) => Promise<void>;
  retryDownload: (id: string) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  clearCompleted: () => Promise<void>;
  processQueue: () => Promise<void>;
}

const STORAGE_KEY = 'shoouts-download-queue-v1';
const DOWNLOAD_DIR = `${FileSystem.documentDirectory || ''}offline-audio/`;

let queueInFlight = false;

const now = () => Date.now();

const sanitizeSegment = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '_');

const ensureDownloadDir = async () => {
  if (!FileSystem.documentDirectory) {
    throw new Error('Local filesystem is not available on this device.');
  }

  const info = await FileSystem.getInfoAsync(DOWNLOAD_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(DOWNLOAD_DIR, { intermediates: true });
  }
};

const extensionFromUrl = (audioUrl: string) => {
  const clean = audioUrl.split('?')[0] || '';
  const dot = clean.lastIndexOf('.');
  if (dot < 0 || dot === clean.length - 1) {
    return 'mp3';
  }
  const ext = clean.slice(dot + 1).toLowerCase();
  if (!/^[a-z0-9]+$/.test(ext)) {
    return 'mp3';
  }
  return ext;
};

const updateItem = (id: string, updater: (item: DownloadItem) => DownloadItem) => {
  useDownloadQueueStore.setState((state) => ({
    items: state.items.map((item) => (item.id === id ? updater(item) : item)),
  }));
};

async function processOne(item: DownloadItem): Promise<void> {
  updateItem(item.id, (curr) => ({
    ...curr,
    status: 'downloading',
    progress: 0,
    error: null,
    updatedAt: now(),
  }));

  await ensureDownloadDir();
  const ext = extensionFromUrl(item.audioUrl);
  const filename = `${sanitizeSegment(item.trackId)}.${ext}`;
  const destination = `${DOWNLOAD_DIR}${filename}`;

  const downloadResumable = FileSystem.createDownloadResumable(
    item.audioUrl,
    destination,
    {},
    (progress) => {
      if (!progress.totalBytesExpectedToWrite) {
        return;
      }

      const ratio = progress.totalBytesWritten / progress.totalBytesExpectedToWrite;
      updateItem(item.id, (curr) => ({
        ...curr,
        progress: Math.min(1, Math.max(0, ratio)),
        updatedAt: now(),
      }));
    }
  );

  const result = await downloadResumable.downloadAsync();
  if (!result?.uri) {
    throw new Error('Download did not return a file URI.');
  }

  updateItem(item.id, (curr) => ({
    ...curr,
    status: 'completed',
    progress: 1,
    localUri: result.uri,
    error: null,
    updatedAt: now(),
  }));
}

export const useDownloadQueueStore = create<DownloadQueueState>()(
  persist(
    (set, get) => ({
      items: [],
      isProcessing: false,

      enqueueTrack: async ({ trackId, title, artist, audioUrl }) => {
        if (!audioUrl.trim()) {
          return;
        }

        const existing = get().items.find((item) => item.trackId === trackId);
        if (existing) {
          if (existing.status === 'failed') {
            updateItem(existing.id, (curr) => ({
              ...curr,
              status: 'queued',
              progress: 0,
              error: null,
              updatedAt: now(),
            }));
            await get().processQueue();
          }
          return;
        }

        const id = `${trackId}-${now()}`;
        const queued: DownloadItem = {
          id,
          trackId,
          title,
          artist,
          audioUrl,
          status: 'queued',
          progress: 0,
          localUri: null,
          error: null,
          createdAt: now(),
          updatedAt: now(),
        };

        set((state) => ({ items: [queued, ...state.items] }));
        await get().processQueue();
      },

      retryDownload: async (id) => {
        updateItem(id, (curr) => ({
          ...curr,
          status: 'queued',
          progress: 0,
          error: null,
          updatedAt: now(),
        }));

        await get().processQueue();
      },

      removeItem: async (id) => {
        const target = get().items.find((item) => item.id === id);
        if (target?.localUri) {
          try {
            await FileSystem.deleteAsync(target.localUri, { idempotent: true });
          } catch {
            // Ignore deletion errors and still prune from queue state.
          }
        }

        set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
      },

      clearCompleted: async () => {
        const completed = get().items.filter((item) => item.status === 'completed' && item.localUri);
        for (const item of completed) {
          try {
            await FileSystem.deleteAsync(item.localUri as string, { idempotent: true });
          } catch {
            // Ignore cleanup failures.
          }
        }

        set((state) => ({ items: state.items.filter((item) => item.status !== 'completed') }));
      },

      processQueue: async () => {
        if (queueInFlight) {
          return;
        }

        queueInFlight = true;
        set({ isProcessing: true });

        try {
          while (true) {
            const next = get().items.find((item) => item.status === 'queued');
            if (!next) {
              break;
            }

            try {
              await processOne(next);
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Unknown download error';
              updateItem(next.id, (curr) => ({
                ...curr,
                status: 'failed',
                error: message,
                updatedAt: now(),
              }));
            }
          }
        } finally {
          queueInFlight = false;
          set({ isProcessing: false });
        }
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        items: state.items,
      }),
    }
  )
);
