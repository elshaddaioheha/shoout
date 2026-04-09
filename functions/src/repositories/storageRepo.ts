/**
 * Storage repository — Cloud Storage operations.
 */

import * as admin from 'firebase-admin';

let _storage: admin.storage.Storage | null = null;

function getStorage(): admin.storage.Storage {
  if (!_storage) {
    _storage = admin.storage();
  }
  return _storage;
}

export function bucket(bucketName?: string) {
  const storage = getStorage();
  return bucketName ? storage.bucket(bucketName) : storage.bucket();
}

export async function copyFile(sourcePath: string, destPath: string, bucketName?: string) {
  const b = bucket(bucketName);
  await b.file(sourcePath).copy(b.file(destPath));
}

export async function saveFile(
  filePath: string,
  buffer: Buffer,
  contentType: string,
  bucketName?: string
) {
  const file = bucket(bucketName).file(filePath);
  await file.save(buffer, {
    resumable: false,
    contentType,
    metadata: { cacheControl: 'private, max-age=3600' },
  });
}

export async function getSignedUrl(
  filePath: string,
  expiryMs: number,
  bucketName?: string
): Promise<string> {
  const file = bucket(bucketName).file(filePath);
  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + expiryMs,
  });
  return url;
}
