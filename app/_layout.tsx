import GlobalToast from '@/components/GlobalToast';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold, useFonts } from '@expo-google-fonts/poppins';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { auth } from '../firebaseConfig';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [authResolved, setAuthResolved] = useState(false);

  const [loaded, error] = useFonts({
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Poppins-Bold': Poppins_700Bold,
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace('/(tabs)');
      }
      setAuthResolved(true);
    });

    return unsub;
  }, [router]);

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }

    // Configure Google Sign-In
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '', // Requires Web Client ID from Firebase Console -> Authentication -> Sign-in method -> Google -> Web SDK configuration
    });
  }, [loaded, error]);

  if ((!loaded && !error) || !authResolved) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack initialRouteName="(auth)/role-selection">
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/role-selection" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/signup" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings/payment-methods" options={{ headerShown: false }} />
        <Stack.Screen name="settings/subscriptions" options={{ headerShown: false }} />
        <Stack.Screen name="settings/notifications" options={{ headerShown: false }} />
        <Stack.Screen name="settings/privacy" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="studio/analytics" options={{ headerShown: false }} />
        <Stack.Screen name="studio/ads-intro" options={{ headerShown: false }} />
        <Stack.Screen name="studio/ads-creation" options={{ headerShown: false }} />
        <Stack.Screen name="studio/ads-success" options={{ headerShown: false }} />
        <Stack.Screen name="studio/ads-example" options={{ headerShown: false }} />
        <Stack.Screen name="studio/earnings" options={{ headerShown: false }} />
        <Stack.Screen name="studio/upload" options={{ headerShown: false }} />
        <Stack.Screen name="studio/withdraw" options={{ headerShown: false }} />
        <Stack.Screen name="studio/messages" options={{ headerShown: false }} />
        <Stack.Screen name="studio/message-thread" options={{ headerShown: false }} />
        <Stack.Screen name="cart" options={{ headerShown: false }} />
        <Stack.Screen name="chat/index" options={{ headerShown: false }} />
        <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="merch/index" options={{ headerShown: false }} />
        <Stack.Screen name="profile/[id]" options={{ headerShown: false }} />
        <Stack.Screen
          name="listing/[id]"
          options={{
            headerShown: false,
            presentation: 'transparentModal',
            animation: 'slide_from_bottom',
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <GlobalToast />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

