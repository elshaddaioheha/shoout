import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Initialize notifications system: set handler and request permissions.
 */
export async function initNotifications() {
  if (Platform.OS === 'web') {
    return;
  }

  // Set notification handler to define how to handle notifications
  Notifications.setNotificationHandler({
    handleNotification: async (_notification) => {
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      };
    },
  });

  // Request permissions (iOS) or verify permissions (Android runtime permission)
  if (Platform.OS === 'ios') {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.log('iOS notification permission denied');
    }
  } else if (Platform.OS === 'android') {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Android notification permission denied');
      }
    } catch (error) {
      console.log('Android notification permission error:', error);
    }
  }
}

/**
 * Get or fetch the Expo push token.
 * Must be called after initNotifications().
 */
export async function getExpoPushToken(): Promise<string | null> {
  try {
    const token = await Notifications.getExpoPushTokenAsync();
    console.log('Expo push token:', token.data);
    return token.data;
  } catch (error) {
    console.error('Failed to get Expo push token:', error);
    return null;
  }
}

/**
 * Subscribe to incoming notifications (foreground).
 * Call this in your root layout effect.
 */
export function subscribeToNotifications(
  onNotification: (notification: Notifications.Notification) => void
): () => void {
  if (Platform.OS === 'web') {
    return () => undefined;
  }

  const subscription = Notifications.addNotificationResponseReceivedListener(
    ({ notification }) => {
      onNotification(notification);
    }
  );

  return () => subscription.remove();
}

/**
 * Get last notification received (e.g., when app was backgrounded).
 * Useful for handling deep-link navigation on app resume.
 */
export async function getLastNotification(): Promise<Notifications.NotificationResponse | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    return await Notifications.getLastNotificationResponseAsync();
  } catch (error) {
    console.error('Failed to get last notification:', error);
    return null;
  }
}