import { auth, db } from '@/firebaseConfig';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';

export type VaultUploadItem = {
  id: string;
  title?: string;
  artist?: string;
  uploaderName?: string;
  audioUrl?: string;
  artworkUrl?: string;
  coverUrl?: string;
  description?: string;
  fileSizeBytes?: number;
  createdAt?: any;
  updatedAt?: any;
  folderId?: string | null;
  shareUrl?: string | null;
};

export type VaultFolder = {
  id: string;
  name: string;
  createdAt?: any;
  updatedAt?: any;
  artworkUrl?: string;
  itemCount?: number;
};

export type VaultShareLink = {
  id: string;
  title?: string;
  url?: string;
  type?: 'track' | 'folder';
  trackId?: string;
  folderId?: string;
  createdAt?: any;
  updatedAt?: any;
};

export type VaultActivity = {
  id: string;
  type: 'upload' | 'folder' | 'share' | 'update';
  title: string;
  subtitle: string;
  createdAtMs: number;
};

function toMs(value: any) {
  if (!value) return 0;
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export function useVaultWorkspaceData() {
  const [uploads, setUploads] = useState<VaultUploadItem[]>([]);
  const [folders, setFolders] = useState<VaultFolder[]>([]);
  const [shareLinks, setShareLinks] = useState<VaultShareLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) {
      setUploads([]);
      setFolders([]);
      setShareLinks([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const uploadsQuery = query(
      collection(db, `users/${auth.currentUser.uid}/uploads`),
      orderBy('createdAt', 'desc')
    );
    const foldersQuery = query(
      collection(db, `users/${auth.currentUser.uid}/folders`),
      orderBy('createdAt', 'desc')
    );
    const shareLinksQuery = query(
      collection(db, `users/${auth.currentUser.uid}/vaultShares`),
      orderBy('createdAt', 'desc')
    );

    const unsubUploads = onSnapshot(uploadsQuery, (snapshot) => {
      setUploads(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as VaultUploadItem[]);
      setLoading(false);
    });

    const unsubFolders = onSnapshot(foldersQuery, (snapshot) => {
      setFolders(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as VaultFolder[]);
    });

    const unsubShareLinks = onSnapshot(
      shareLinksQuery,
      (snapshot) => {
        setShareLinks(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as VaultShareLink[]);
      },
      () => {
        setShareLinks([]);
      }
    );

    return () => {
      unsubUploads();
      unsubFolders();
      unsubShareLinks();
    };
  }, []);

  const usedStorageGB = useMemo(() => {
    const totalBytes = uploads.reduce((sum, item) => sum + Number(item.fileSizeBytes || 0), 0);
    return totalBytes / (1024 * 1024 * 1024);
  }, [uploads]);

  const recentActivities = useMemo(() => {
    const items: VaultActivity[] = [
      ...uploads.slice(0, 8).map((upload) => ({
        id: `upload-${upload.id}`,
        type: upload.updatedAt ? 'update' as const : 'upload' as const,
        title: upload.updatedAt ? `Updated ${upload.title || 'Untitled Track'}` : `Uploaded ${upload.title || 'Untitled Track'}`,
        subtitle: upload.artist || upload.uploaderName || 'Private vault track',
        createdAtMs: Math.max(toMs(upload.updatedAt), toMs(upload.createdAt)),
      })),
      ...folders.slice(0, 6).map((folder) => ({
        id: `folder-${folder.id}`,
        type: 'folder' as const,
        title: `Created folder ${folder.name}`,
        subtitle: `${Number(folder.itemCount || 0)} item${Number(folder.itemCount || 0) === 1 ? '' : 's'}`,
        createdAtMs: Math.max(toMs(folder.updatedAt), toMs(folder.createdAt)),
      })),
      ...shareLinks.slice(0, 6).map((share) => ({
        id: `share-${share.id}`,
        type: 'share' as const,
        title: `Shared ${share.title || 'private link'}`,
        subtitle: share.type === 'folder' ? 'Folder link' : 'Track link',
        createdAtMs: Math.max(toMs(share.updatedAt), toMs(share.createdAt)),
      })),
    ];

    return items
      .filter((item) => item.createdAtMs > 0)
      .sort((a, b) => b.createdAtMs - a.createdAtMs)
      .slice(0, 8);
  }, [folders, shareLinks, uploads]);

  return {
    uploads,
    folders,
    shareLinks,
    recentActivities,
    usedStorageGB,
    loading,
  };
}
