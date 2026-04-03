import { Stack } from 'expo-router';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../constants/Colors';
import {useEffect, useState} from "react";
import {initDatabase} from "../services/database";
import {BackgroundAudioProvider} from "../components/BackgroundAudioProvider";
import {setAudioModeAsync} from "expo-audio";

export default function RootLayout() {
  const [isDbReady, setIsDbReady] = useState(false);

  useEffect(() => {
    try {
      initDatabase();
      console.log('Database initialized');
      setIsDbReady(true);
    } catch (e) {
      console.error('DB Init Error', e);
    }
  }, []);

  if (!isDbReady) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="64" color="#666" />
        <Text style={styles.textLoading}>LOADING...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <BackgroundAudioProvider>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: Colors.background },
            headerTintColor: Colors.text,
            headerShadowVisible: false,
            headerTitleStyle: { fontWeight: 'bold' },
            contentStyle: { backgroundColor: Colors.background },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ title: 'Настройки', presentation: 'modal' }} />
          <Stack.Screen name="games" options={{ headerShown: false }} />
          <Stack.Screen name="history" options={{ title: 'История', }} />
        </Stack>
      </BackgroundAudioProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a', // или ваш фоновый цвет
  },
  textLoading:{
    color:'white'
  }
});
