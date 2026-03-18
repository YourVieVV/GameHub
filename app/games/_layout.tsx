import {Stack, useFocusEffect} from 'expo-router';
import { Colors } from '../../constants/Colors';
import {useAudioContext} from "../../components/useAudioContext";

export default function GamesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.text, // Игровой раздел подсвечен акцентом
        headerTitleStyle: { fontWeight: '900' },
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'На главную' }} />
      <Stack.Screen name="snake" options={{ title: 'Snake Retro' }} />
      {/* Другие игры добавятся сюда автоматически */}
    </Stack>
  );
}
