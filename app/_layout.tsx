import GlobalToast from '@/components/GlobalToast';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold, useFonts } from '@expo-google-fonts/poppins';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [loaded, error] = useFonts({
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Poppins-Bold': Poppins_700Bold,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }

    // Configure Google Sign-In
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '', // Requires Web Client ID from Firebase Console -> Authentication -> Sign-in method -> Google -> Web SDK configuration
    });
  }, [loaded, error]);

  if (!loaded && !error) {
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
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <GlobalToast />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

