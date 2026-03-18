import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, Dimensions, StatusBar } from 'react-native';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';
import { useAudioPlayer } from "expo-audio";
import {useSounds} from "../../components/useSounds";
configureReanimatedLogger({ level: ReanimatedLogLevel.warn, strict: false });

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const soundSource = require('../../assets/sounds/colorFlood2.mp3');
const GRID_SIZE = 6;
const BUBBLE_MARGIN = 4;
const BUBBLE_SIZE = (SCREEN_WIDTH * 0.9) / GRID_SIZE - 10;
const ROWS_COLORS = ['#FF5252', '#FF9800', '#FFEB3B', '#4CAF50', '#2196F3', '#9C27B0'];

const Particle = ({ color, x, y }: { color: string, x: number, y: number, id: string }) => {
  const anim = useSharedValue(0);
  const randomX = useMemo(() => (Math.random() - 0.5) * 150, []);
  const randomY = useMemo(() => (Math.random() - 0.5) * 150, []);

  React.useEffect(() => {
    anim.value = withTiming(1, { duration: 600 });
  }, []);

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: x + BUBBLE_SIZE / 2,
    top: y + BUBBLE_SIZE / 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: color,
    opacity: interpolate(anim.value, [0, 0.8, 1], [1, 1, 0]),
    transform: [
      { translateX: anim.value * randomX },
      { translateY: anim.value * randomY },
      { scale: interpolate(anim.value, [0, 1], [1, 0.2]) }
    ]
  }));

  return <Animated.View pointerEvents="none" style={style} />;
};

const Bubble = React.memo(({ row, col, isPopped }: any) => {
  const scale = useSharedValue(1);
  const color = ROWS_COLORS[row];

  React.useEffect(() => {
    if (isPopped) {
      scale.value = withSequence(withTiming(0.8, { duration: 50 }), withSpring(1));
    }
  }, [isPopped]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: isPopped ? '#1a1a1a' : color,
    opacity: isPopped ? 0.6 : 1,
    shadowOffset: { width: 0, height: isPopped ? 0 : 4 },
  }));

  return (
    <Animated.View style={[styles.bubble, animatedStyle]}>
      <View style={styles.gloss} />
      {isPopped && <View style={styles.innerShadow} />}
    </Animated.View>
  );
});

export default function PopIt() {
  const [poppedState, setPoppedState] = useState(
    Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(false))
  );
  const [score, setScore] = useState(0);
  const [particles, setParticles] = useState<any[]>([]);

  const rotation = useSharedValue(0);
  const scoreScale = useSharedValue(1);

  const playFlipSound = useSounds(soundSource);

  const handlePop = useCallback((r: number, c: number) => {
    setPoppedState(prev => {
      playFlipSound();
      if (prev[r][c]) return prev;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      runOnJS(() => setScore(s => s + 1))();
      scoreScale.value = withSequence(withTiming(1.3, { duration: 100 }), withSpring(1));

      const timestamp = Date.now();
      const newParticles = Array(3).fill(0).map((_, i) => ({
        id: `${timestamp}-${r}-${c}-${i}`,
        color: ROWS_COLORS[r],
        x: c * (BUBBLE_SIZE + BUBBLE_MARGIN * 2),
        y: r * (BUBBLE_SIZE + BUBBLE_MARGIN * 2),
      }));

      runOnJS(() => setParticles(prevP => [...prevP.slice(-15), ...newParticles]))();

      const newState = prev.map(row => [...row]);
      newState[r][c] = true;

      if (newState.flat().every(v => v)) {
        runOnJS(() => setTimeout(resetBoard, 300))();
      }
      return newState;
    });
  }, [playFlipSound]);

  const resetBoard = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    rotation.value = withTiming(rotation.value + 180, { duration: 600 });
    setTimeout(() => {
      setPoppedState(Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(false)));
    }, 300);
  };

  const dragGesture = Gesture.Pan()
    .averageTouches(true)
    .onUpdate((e) => {
      const col = Math.floor(e.x / (BUBBLE_SIZE + BUBBLE_MARGIN * 2));
      const row = Math.floor(e.y / (BUBBLE_SIZE + BUBBLE_MARGIN * 2));
      if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
        runOnJS(handlePop)(row, col);
      }
    })
    .onBegin((e) => {
      const col = Math.floor(e.x / (BUBBLE_SIZE + BUBBLE_MARGIN * 2));
      const row = Math.floor(e.y / (BUBBLE_SIZE + BUBBLE_MARGIN * 2));
      if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
        runOnJS(handlePop)(row, col);
      }
    });

  const boardStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${rotation.value}deg` }]
  }));

  const scoreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scoreScale.value }]
  }));

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />

        <View style={styles.header}>
          <Text style={styles.label}>TOTAL POPS</Text>
          <Animated.Text style={[styles.score, scoreStyle]}>{score}</Animated.Text>
        </View>

        <Animated.View style={[styles.board, boardStyle]}>
          <GestureDetector gesture={dragGesture}>
            <View style={styles.grid}>
              {poppedState.map((row, rIdx) => (
                <View key={rIdx} style={styles.row}>
                  {row.map((isPopped, cIdx) => (
                    <Bubble
                      key={`${rIdx}-${cIdx}`}
                      row={rIdx} col={cIdx}
                      isPopped={isPopped}
                    />
                  ))}
                </View>
              ))}
              {particles.map(p => (
                <Particle key={p.id} {...p} />
              ))}
            </View>
          </GestureDetector>
        </Animated.View>

        <Text style={styles.footer}>POP ALL TO FLIP!</Text>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
  header: { marginBottom: 40, alignItems: 'center' },
  label: { color: '#666', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  score: { color: '#fff', fontSize: 64, fontWeight: '900' },
  board: { backgroundColor: '#252525', padding: 10, borderRadius: 30, borderWidth: 8, borderColor: '#333', elevation: 20 },
  grid: { position: 'relative' },
  row: { flexDirection: 'row' },
  bubble: { width: BUBBLE_SIZE, height: BUBBLE_SIZE, borderRadius: BUBBLE_SIZE / 2, margin: BUBBLE_MARGIN, borderWidth: 3, borderColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  gloss: { position: 'absolute', top: '15%', left: '20%', width: '30%', height: '25%', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 20 },
  innerShadow: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  footer: { marginTop: 60, color: '#444', fontSize: 16, fontWeight: 'bold' }
});
