"use strict";
/**
 * Storage repository — Cloud Storage operations.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.bucket = bucket;
exports.copyFile = copyFile;
exports.saveFile = saveFile;
exports.getSignedUrl = getSignedUrl;
const admin = __importStar(require("firebase-admin"));
let _storage = null;
function getStorage() {
    if (!_storage) {
        _storage = admin.storage();
    }
    return _storage;
}
function bucket(bucketName) {
    const storage = getStorage();
    return bucketName ? storage.bucket(bucketName) : storage.bucket();
}
async function copyFile(sourcePath, destPath, bucketName) {
    const b = bucket(bucketName);
    await b.file(sourcePath).copy(b.file(destPath));
}
async function saveFile(filePath, buffer, contentType, bucketName) {
    const file = bucket(bucketName).file(filePath);
    await file.save(buffer, {
        resumable: false,
        contentType,
        metadata: { cacheControl: 'private, max-age=3600' },
    });
}
async function getSignedUrl(filePath, expiryMs, bucketName) {
    const file = bucket(bucketName).file(filePath);
    const [url] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + expiryMs,
    });
    return url;
}
