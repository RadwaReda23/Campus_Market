/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#1a3a2a',
    background: '#f5f0e8',
    tint: '#c8a84b',
    icon: '#8a7d6b',
    tabIconDefault: '#8a7d6b',
    tabIconSelected: '#c8a84b',
    primary: '#1a3a2a',
    accent: '#c8a84b',
    light: '#f5f0e8',
    white: '#ffffff',
    muted: '#8a7d6b',
    danger: '#c0392b',
    success: '#27ae60',
    border: '#ddd3c0',
    cardBg: '#fffdf8',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: '#fff',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#fff',
  },
};

export const Fonts = {
  cairo: 'Cairo_400Regular',
  cairoBold: 'Cairo_700Bold',
  cairoExtraBold: 'Cairo_900Black',
  amiri: 'Amiri_400Regular',
  amiriBold: 'Amiri_700Bold',
};
