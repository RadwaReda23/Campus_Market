import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { useRouter } from 'expo-router';
import {
  Cairo_400Regular,
  Cairo_700Bold,
  Cairo_900Black,
  useFonts
} from '@expo-google-fonts/cairo';
import {
  Amiri_400Regular,
  Amiri_700Bold
} from '@expo-google-fonts/amiri';
import * as SplashScreen from 'expo-splash-screen';
import { Colors } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

function AuthGate() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!checked) {
        setChecked(true);
        if (user) {
          router.replace('/(tabs)');
        } else {
          router.replace('/Register');
        }
      }
    });
    return () => unsub();
  }, [checked, router]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    Cairo_400Regular,
    Cairo_700Bold,
    Cairo_900Black,
    Amiri_400Regular,
    Amiri_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  const customDefaultTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: Colors.light.primary,
      background: Colors.light.background,
      card: Colors.light.primary,
      text: Colors.light.text,
      border: Colors.light.border,
      notification: Colors.light.accent,
    },
  };

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : customDefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="Register" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="ForgetPassword" options={{ headerShown: false }} />
        <Stack.Screen name="userProfile" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <AuthGate />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}