import { Archivo_500Medium, Archivo_700Bold } from '@expo-google-fonts/archivo';
import { ArchivoBlack_400Regular } from '@expo-google-fonts/archivo-black';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/features/auth/AuthContext';
import { RealtimeProvider } from '@/features/realtime/RealtimeProvider';
import { queryClient } from '@/lib/queryClient';
import { Loading, Screen, colors } from '@/ui';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Archivo_500Medium, Archivo_700Bold, ArchivoBlack_400Regular });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RealtimeProvider>
            <StatusBar style="dark" />
            <RootNavigator />
          </RealtimeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

/** Three zones, one visible at a time: signed out, signed in but not onboarded, and the app itself. */
function RootNavigator() {
  const auth = useAuth();
  if (auth.status === 'loading') {
    return (
      <Screen>
        <Loading label="Opening Campus" />
      </Screen>
    );
  }
  const signedIn = auth.status === 'signedIn';
  const onboarded = signedIn && auth.user.onboarded;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !onboarded}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={onboarded}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="profile/edit" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="user/[id]" />
        <Stack.Screen name="people/new" />
      </Stack.Protected>
    </Stack>
  );
}
