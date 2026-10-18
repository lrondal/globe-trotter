import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
} from '@expo-google-fonts/hanken-grotesk';
import {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
} from '@expo-google-fonts/instrument-serif';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { ShowOnGlobeProvider } from '@/globe/ShowOnGlobeProvider';
import { JournalProvider } from '@/journal/JournalProvider';
import { LocationProvider, useLocation } from '@/location/LocationProvider';
import { colors } from '@/theme/tokens';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <JournalProvider>
      <LocationProvider>
        <ShowOnGlobeProvider>
          <App />
        </ShowOnGlobeProvider>
      </LocationProvider>
    </JournalProvider>
  );
}

/** Keeps the splash screen up until the fonts and the globe's launch view are ready. */
function App() {
  const { launch } = useLocation();
  const [fontsLoaded, error] = useFonts({
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  const loaded = fontsLoaded && launch !== null;
  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surfacePage } }}
      />
    </GestureHandlerRootView>
  );
}
