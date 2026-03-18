import {createContext, useContext} from "react";
import {AudioContext} from "./BackgroundAudioProvider";

export const useAudioContext = () => {
  const ctx = useContext(AudioContext);
  if (!ctx) {
    throw new Error('useAudioContext must be used within AudioProvider');
  }
  return ctx;
};