import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApps, initializeApp } from 'firebase/app';
import {
    getAuth,
    // @ts-ignore — getReactNativePersistence exists in firebase/auth but is not typed for RN
    getReactNativePersistence,
    initializeAuth
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
// Firebase Project Config
// Values are loaded from .env via Expo's EXPO_PUBLIC_ prefix.
// ─────────────────────────────────────────────────────────────────────────────
const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// ─────────────────────────────────────────────────────────────────────────────
// App Initialization (guard against hot-reload double-init)
// ─────────────────────────────────────────────────────────────────────────────
const app = getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApps()[0];

// ─────────────────────────────────────────────────────────────────────────────
// Auth — use AsyncStorage persistence on native, default on web
// ─────────────────────────────────────────────────────────────────────────────
let auth: ReturnType<typeof getAuth>;

try {
    if (Platform.OS === 'web') {
        auth = getAuth(app);
    } else {
        auth = initializeAuth(app, {
            persistence: getReactNativePersistence(AsyncStorage),
        });
    }
} catch (e: any) {
    // initializeAuth throws if already initialized (e.g. fast refresh)
    auth = getAuth(app);
}

// ─────────────────────────────────────────────────────────────────────────────
// Firestore — primary database
// ─────────────────────────────────────────────────────────────────────────────
const db = getFirestore(app);

// ─────────────────────────────────────────────────────────────────────────────
// Cloud Storage — Vault file uploads
// ─────────────────────────────────────────────────────────────────────────────
const storage = getStorage(app);

export { app, auth, db, storage };
