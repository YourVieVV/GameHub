import { useAudioPlayer } from 'expo-audio';
import {createContext} from "react";

const bgSource = require('../assets/sounds/global1.mp3');

export const AudioContext = createContext<{
  start: () => void;
  stop: () => void;
} | null>(null);

export function BackgroundAudioProvider({ children }) {
  const player = useAudioPlayer(bgSource);

  // включаем управление с локскрина (особенно важно на Android)
  const start = () => {
    if (player){
      // player.setActiveForLockScreen(true, {
      //   title: 'Background music',
      // });
      player.loop = true;
      player.volume = 0.4;
      player.play();
    }

  };

  const stop = () => {
    if (player){
      player.pause();
      // player.setActiveForLockScreen(false);
    }

  };

  return (
    <AudioContext.Provider value={{ start, stop }}>
      {children}
    </AudioContext.Provider>
  );
}