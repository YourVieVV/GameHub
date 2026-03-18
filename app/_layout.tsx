import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../constants/Colors';
import {useEffect} from "react";
import {initDatabase} from "../services/database";
import {BackgroundAudioProvider} from "../components/BackgroundAudioProvider";
import {setAudioModeAsync} from "expo-audio";

export default function RootLayout() {
  useEffect(() => {
    try {
      initDatabase();
      console.log('Database initialized');
    } catch (e) {
      console.error('DB Init Error', e);
    }
  }, []);

  // useEffect(() => {
  //   setAudioModeAsync({
  //     playsInSilentMode: true,
  //     shouldPlayInBackground: true,
  //     interruptionMode: 'doNotMix',
  //   });
  // }, []);

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
