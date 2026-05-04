import { Tabs } from 'expo-router';
import React from 'react';
import { HapticTab } from '@/components/haptic-tab';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Text, View, StyleSheet } from 'react-native';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.light.accent,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.6)',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: Colors.light.primary, // #1a3a2a (Exact Parity with Sidebar)
          borderTopWidth: 1,
          borderTopColor: 'rgba(200,168,75,0.2)', // Subtle gold border
          height: 70,
          paddingBottom: 12,
          paddingTop: 8,
          borderTopLeftRadius: 25,
          borderTopRightRadius: 25,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
        },
        tabBarLabelStyle: {
          fontFamily: Fonts.cairoBold,
          fontSize: 10,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'الرئيسية',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          title: 'المنتجات',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🛒</Text>,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'المكتبة',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>📚</Text>,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'الرسائل',
          tabBarIcon: ({ color }) => (
            <View>
              <Text style={{ fontSize: 22, color }}>💬</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'حسابي',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>👤</Text>,
        }}
      />
      <Tabs.Screen
        name="addProduct"
        options={{ href: null }}
      />
    </Tabs>
  );
}