import AsyncStorage from '@react-native-async-storage/async-storage';
import { getExpoPushToken } from '@/app/notifications';

const PUSH_TOKEN_STORAGE_KEY = 'shoouts-expo-push-token';

/**
 * Get or refresh the stored push token.
 */
export async function getPushToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to get push token from storage:', error);
    return null;
  }
}

/**
 * Store the push token.
 */
export async function setPushToken(token: string | null): Promise<void> {
  try {
    if (token) {
      await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
    } else {
      await AsyncStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
    }
  } catch (error) {
    console.error('Failed to store push token:', error);
  }
}

/**
 * Fetch fresh push token from Expo and cache it.
 * Call this on app startup or after login.
 */
export async function refreshPushToken(): Promise<string | null> {
  try {
    const token = await getExpoPushToken();
    if (token) {
      await setPushToken(token);
    }
    return token;
  } catch (error) {
    console.error('Failed to refresh push token:', error);
    return null;
  }
}

/**
 * Clear the stored push token (e.g., on logout).
 */
export async function clearPushToken(): Promise<void> {
  await setPushToken(null);
}
