import {useAudioPlayer} from "expo-audio";
import {useCallback} from "react";
import {DatabaseService} from "../services/database";

export const useSounds = (soundSource:string, isLoop = false) => {
  const player = useAudioPlayer(soundSource);

  const playFlipSound = useCallback(() => {
    const savedSound = DatabaseService.getSetting('sound_enabled', 'true');
    if (savedSound === 'false') return;
    if (player) {
      if (isLoop) player.loop = true;
      player.seekTo(0);
      player.play();
    }
  }, [player]);

  return playFlipSound;
};