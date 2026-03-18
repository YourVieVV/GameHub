import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Alert } from 'react-native';
import Animated, {
  LinearTransition,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  withTiming, runOnJS
} from 'react-native-reanimated';
import { DatabaseService } from '../../services/database';
import {useSounds} from "../../components/useSounds";
import {NamesForDB} from "../../constants/NamesForDB";

const { width } = Dimensions.get('window');
const soundSource = require('../../assets/sounds/swipe2.mp3');
const soundWin = require('../../assets/sounds/win.mp3');

export default function FifteenGame() {
  const [gridSize, setGridSize] = useState(4);
  const [tiles, setTiles] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);

  const [isWon, setIsWon] = useState(false);
  const winAnim = useSharedValue(0);
  const scoreAnim = useSharedValue(0);
  const boardGlowAnim = useSharedValue(0); // Новая анимация для поля

  const BOARD_SIZE = width - 30;
  const TILE_SIZE = (BOARD_SIZE - 24) / gridSize;

  useEffect(() => {
    initGame();
  }, []);

  const playFlipSound = useSounds(soundSource);
  const winSound = useSounds(soundWin);

  const initGame = () => {
    setIsWon(false);
    winAnim.value = 0;
    scoreAnim.value = 0;
    boardGlowAnim.value = 0;
    const diff = DatabaseService.getSetting('fifteen_difficulty', 'MEDIUM');
    const size = diff === 'EASY' ? 3 : diff === 'MEDIUM' ? 4 : 5;
    setGridSize(size);

    let newTiles = Array.from({ length: size * size }, (_, i) => (i + 1) % (size * size));

    do {
      newTiles = [...newTiles].sort(() => Math.random() - 0.5);
    } while (!isSolvable(newTiles, size) || isWin(newTiles));

    setTiles(newTiles);
    setMoves(0);
  };

  const isSolvable = (arr: number[], size: number) => {
    let invCount = 0;
    for (let i = 0; i < arr.length - 1; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        if (arr[i] && arr[j] && arr[i] > arr[j]) invCount++;
      }
    }
    if (size % 2 !== 0) return invCount % 2 === 0;
    const emptyRow = Math.floor(arr.indexOf(0) / size);
    return (invCount + emptyRow) % 2 !== 0;
  };

  const triggerWinAnim = () => {
    setIsWon(true);
    // 1. Анимация надписей
    winAnim.value = withSequence(
      withTiming(0, { duration: 0 }, () => {
        runOnJS(winSound)();
      }),
      withSpring(1),
      withDelay(1500, withTiming(0))
    );
    scoreAnim.value = withSequence(
      withDelay(1000,
        // Звук запустится ТОЛЬКО после задержки 2000мс
        withTiming(0, { duration: 0 }, () => {
          runOnJS(winSound)();
        })
      ),
      withDelay(0, withSpring(1)),
      withDelay(1500, withTiming(0))
    );

    // 2. Вспышка поля после исчезновения надписей
    boardGlowAnim.value = withSequence(
      withDelay(3000, withTiming(1, { duration: 400 })),
      withTiming(0, { duration: 400 }, (finished) => {
        // 3. Вместо setTimeout: запускаем сброс, когда всё закончилось
        if (finished) {
          runOnJS(setIsWon)(false);
          runOnJS(initGame)();
        }
      })
    );
  };

  const handlePress = (index: number) => {
    if (isWon) return;
    playFlipSound()
    const emptyIndex = tiles.indexOf(0);
    const row = Math.floor(index / gridSize);
    const col = index % gridSize;
    const emptyRow = Math.floor(emptyIndex / gridSize);
    const emptyCol = emptyIndex % gridSize;

    const isAdjacent = Math.abs(row - emptyRow) + Math.abs(col - emptyCol) === 1;

    if (isAdjacent) {
      const newTiles = [...tiles];
      [newTiles[index], newTiles[emptyIndex]] = [newTiles[emptyIndex], newTiles[index]];
      setTiles(newTiles);
      setMoves(m => m + 1);
      if (isWin(newTiles)) {
        DatabaseService.saveScore(NamesForDB.fifteen, moves + 1, { size: gridSize });
        triggerWinAnim();
      }
    }
  };

  const isWin = (arr: number[]) => {
    if (arr.length === 0) return false;
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] !== i + 1) return false;
    }
    return arr[arr.length - 1] === 0;
  };

  const winTextStyle = useAnimatedStyle(() => ({
    transform: [{ scale: winAnim.value }, { translateY: -100 }],
    opacity: winAnim.value,
  }));

  const scoreTextStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scoreAnim.value },
      { translateY: (scoreAnim.value * -10) - 80 }
    ],
    opacity: scoreAnim.value,
  }));

  const boardAnimatedStyle = useAnimatedStyle(() => ({
    shadowRadius: boardGlowAnim.value * 50,
    shadowOpacity: boardGlowAnim.value,
    elevation: boardGlowAnim.value * 20,
    borderColor: boardGlowAnim.value > 0 ? '#2E97FF' : '#333',
    transform: [{ scale: 1 + (boardGlowAnim.value * 0.02) }]
  }));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>15 PUZZLE</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity style={styles.testBtn} onPress={triggerWinAnim}>
            <Text style={styles.testBtnText}>TEST</Text>
          </TouchableOpacity>
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreText}>MOVES: {moves}</Text>
          </View>
        </View>
      </View>

      <Animated.View style={[styles.board, { width: BOARD_SIZE, height: BOARD_SIZE }, boardAnimatedStyle]}>
        {tiles.map((value, index) => (
          <Animated.View
            key={value === 0 ? `empty-${gridSize}` : value}
            layout={LinearTransition.duration(200)}
            style={{ width: TILE_SIZE, height: TILE_SIZE, padding: 2 }}
          >
            {value !== 0 && (
              <TouchableOpacity
                style={styles.tile}
                onPress={() => handlePress(index)}
                activeOpacity={0.8}
              >
                <Text style={styles.tileText}>{value}</Text>
                <View style={styles.glint} />
              </TouchableOpacity>
            )}
          </Animated.View>
        ))}
      </Animated.View>

      <TouchableOpacity style={styles.newGameBtn} onPress={initGame}>
        <Text style={styles.newGameText}>NEW GAME</Text>
      </TouchableOpacity>

      {isWon && (
        <View style={styles.winOverlay} pointerEvents="none">
          <Animated.View style={winTextStyle}>
            <Text style={styles.winTextClipart}>SOLVED!</Text>
          </Animated.View>
          <Animated.View style={scoreTextStyle}>
            <Text style={styles.scorePopupClipart}>+REP</Text>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a', alignItems: 'center', paddingTop: 60 },
  header: { width: '90%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  title: { color: '#fff', fontSize: 32, fontWeight: '900' },
  testBtn: { backgroundColor: '#FF4757', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginRight: 10, borderBottomWidth: 3, borderColor: '#B33030' },
  testBtnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  scoreBadge: { backgroundColor: '#333', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  scoreText: { color: '#2E97FF', fontWeight: '900' },
  board: { backgroundColor: '#252525', borderRadius: 20, padding: 8, flexDirection: 'row', flexWrap: 'wrap', borderWidth: 4, borderColor: '#333', shadowColor: '#2E97FF' },
  tile: { flex: 1, backgroundColor: '#2E97FF', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 6, borderColor: '#1A5A99' },
  tileText: { fontSize: 24, fontWeight: '900', color: '#fff' },
  glint: { position: 'absolute', top: 5, left: 5, width: 8, height: 8, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 4 },
  newGameBtn: { marginTop: 40, backgroundColor: '#2E97FF', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 15, borderBottomWidth: 5, borderColor: '#1A5A99' },
  newGameText: { color: '#fff', fontWeight: '900', letterSpacing: 1 },
  winOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  winTextClipart: {
    fontSize: 70,
    fontWeight: '900',
    color: '#fff',
    textShadowColor: '#2E97FF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 25,
    shadowColor: '#2E97FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 70,
    elevation: 30,
  },
  scorePopupClipart: {
    fontSize: 40,
    fontWeight: '900',
    color: '#fff',
    textShadowColor: '#32CD32',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    shadowColor: '#32CD32',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 50,
    elevation: 20,
  }
});
