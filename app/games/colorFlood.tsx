import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withSpring,
  Easing,
  runOnJS, withRepeat, interpolateColor, interpolate
} from 'react-native-reanimated';
import { DatabaseService } from "../../services/database";
import {useAudioPlayer} from "expo-audio";
import {useSounds} from "../../components/useSounds";
import {NamesForDB} from "../../constants/NamesForDB";
import {CircleHelp, X} from "lucide-react-native";
import TooltipRulesGames from "../../components/TooltipRulesGames";
import {SizeBoard} from "../settings";

const { width } = Dimensions.get('window');

// --- КОНСТАНТЫ ИГРЫ ---
const COLORS = ['#FF4D4D', '#FFD700', '#9370DB', '#32CD32', '#00BFFF', '#FF69B4'];
const BOARD_WIDTH = width - 40;
const soundSource = require('../../assets/sounds/colorFlood.mp3');
const soundWin = require('../../assets/sounds/win.mp3');

// --- КОМПОНЕНТЫ ---

const Particle = memo(({ color }: { color: string }) => {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * 100 + 50;
    tx.value = withTiming(Math.cos(angle) * dist, { duration: 800 });
    ty.value = withTiming(Math.sin(angle) * dist, { duration: 800 });
    opacity.value = withTiming(0, { duration: 800 });
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
    opacity: opacity.value,
    backgroundColor: color,
  }));

  return <Animated.View style={[styles.particle, style]} />;
});

const Cell = memo(({ color, delayIdx, cellSize, winFlash }: { color: string; delayIdx: number; cellSize: number; winFlash: Animated.SharedValue<number> }) => {
  const backgroundColor = useSharedValue(color);

  useEffect(() => {
    backgroundColor.value = withDelay(
      delayIdx * 40,
      withTiming(color, { duration: 300, easing: Easing.out(Easing.quad) })
    );
  }, [color]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: backgroundColor.value,
      width: cellSize,
      height: cellSize,
      // Вспышка: смешиваем текущий цвет с белым через прозрачность наложения или border
      borderWidth: winFlash.value * 5,
      borderColor: '#FFFFFF',
      opacity: 1 - (winFlash.value * 0.3),
    };
  });

  return (
    <Animated.View style={[styles.cell, animatedStyle]}>
      <View style={styles.glint} />
    </Animated.View>
  );
});

const ColorButton = ({ color, onPress, disabled }: { color: string; onPress: () => void; disabled: boolean }) => {
  const scale = useSharedValue(1);

  const handlePress = () => {
    if (disabled) return;
    scale.value = withSequence(withTiming(1.2, { duration: 100 }), withTiming(1, { duration: 100 }));
    onPress();
  };

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: color,
  }));

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={handlePress} disabled={disabled}>
      <Animated.View style={[styles.colorBtn, style]}>
        <View style={styles.btnGlint} />
      </Animated.View>
    </TouchableOpacity>
  );
};

// --- ОСНОВНАЯ ЛОГИКА ---

export default function ColorFlood() {
  const [grid, setGrid] = useState<string[][]>([]);
  const [moves, setMoves] = useState(0);
  const [level, setLevel] = useState(1);
  const [isGameOver, setIsGameOver] = useState(false);
  const [particles, setParticles] = useState<{ id: number; color: string }[]>([]);
  const [showLvlUp, setShowLvlUp] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showRules, setShowRules] = useState(true);

  const boardScale = useSharedValue(1);
  const winFlash = useSharedValue(0);
  const lvlUpOpacity = useSharedValue(0);
  const gridSize = level > 10 ? 12 : Math.min(12, 3 + level);
  const cellSize = (BOARD_WIDTH - 20) / gridSize;
  const dynamicMaxMoves = level >= 11 ? 25 :
    level >= 6 ? Math.floor(gridSize * 2.1) - 1 :
      Math.floor(gridSize * 2.1);

  const playFlipSound = useSounds(soundSource);
  const winSound = useSounds(soundWin);

  useEffect(() => {
    try {
      const savedLevel = DatabaseService.getHighScore(NamesForDB.colorFlood) || 1;
      const isShowRules = DatabaseService.getSetting('rules_enabled', 'true');
      setLevel(savedLevel);
      setShowRules(isShowRules === 'true');
    } catch (e) { console.log("DB init error"); }
  }, []);

  const initGame = useCallback(() => {
    const newGrid = Array.from({ length: gridSize }, () =>
      Array.from({ length: gridSize }, () => COLORS[Math.floor(Math.random() * COLORS.length)])
    );
    setGrid(newGrid);
    setMoves(0);
    setIsGameOver(false);
    winFlash.value = 0;
  }, [gridSize, level]);

  useEffect(() => { initGame(); }, [initGame]);

  const triggerZoomAnimation = () => {
    boardScale.value = 0.92;
    boardScale.value = withSpring(1, { damping: 10, stiffness: 100 });
  };

  const startLevelTransition = (nextLevel: number) => {
    setShowLvlUp(true);
    lvlUpOpacity.value = withSequence(
      withTiming(0, { duration: 0 }, () => {
        runOnJS(winSound)();
      }),
      withTiming(1, { duration: 400 }),
      withDelay(800, withTiming(0, { duration: 400 }, (finished) => {
        if (finished) {
          runOnJS(setShowLvlUp)(false);
          runOnJS(proceedToNextLevel)(nextLevel);
        }
      }))
    );
  };

  const proceedToNextLevel = (nextLevel: number) => {
    winFlash.value = withSequence(
      withTiming(0, { duration: 0 }, () => {
        runOnJS(winSound)();
      }),
      withTiming(1, { duration: 100 }),
      withRepeat(withTiming(0.7, { duration: 50 }), 4, true),
      withTiming(1, { duration: 250 }),
      withTiming(0, { duration: 500 }, (finished) => {
        if (finished) {
          runOnJS(setLevel)(nextLevel);
          runOnJS(triggerZoomAnimation)();
        }
      })
    );
  };

  const spawnParticles = (color: string) => {
    const newParticles = Array.from({ length: 12 }, (_, i) => ({ id: Date.now() + i, color }));
    setParticles(newParticles);
    setTimeout(() => setParticles([]), 800);
  };

  const handleColorSelect = (selectedColor: string) => {
    if (!grid || grid.length === 0 || isGameOver) return;
    const startColor = grid[0][0];
    if (selectedColor === startColor) return;

    playFlipSound();

    const newGrid = grid.map((row) => [...row]);
    const queue: [number, number][] = [[0, 0]];
    const seen = new Set<string>(['0,0']);

    while (queue.length > 0) {
      const [r, c] = queue.shift()!;
      newGrid[r][c] = selectedColor;
      const neighbors = [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]];
      for (const [nr, nc] of neighbors) {
        if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize &&
          !seen.has(`${nr},${nc}`) && grid[nr][nc] === startColor) {
          seen.add(`${nr},${nc}`);
          queue.push([nr, nc]);
        }
      }
    }

    const nextMoves = moves + 1;
    setMoves(nextMoves);
    setGrid(newGrid);
    spawnParticles(selectedColor);

    const isWin = newGrid.every((row) => row.every((cell) => cell === selectedColor));
    if (isWin) {
      setIsGameOver(true);
      const nextLevel = level + 1;
      DatabaseService.saveScore(NamesForDB.colorFlood, nextLevel);
      startLevelTransition(nextLevel);
    } else if (nextMoves >= dynamicMaxMoves) {
      setIsGameOver(true);
      Alert.alert("КОНЕЦ ИГРЫ", "Попробуйте снова.", [{ text: "ЗАНОГО", onPress: initGame }]);
    }
  };

  const animatedBoardContainer = useAnimatedStyle(() => ({
    transform: [{ scale: boardScale.value }],
    shadowColor: "#FFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: winFlash.value,
    shadowRadius: interpolate(winFlash.value, [0, 1], [0, 60]),
    elevation: interpolate(winFlash.value, [0, 1], [0, 30]),
    backgroundColor: interpolateColor(
      winFlash.value,
      [0, 1],
      ['#333', 'rgba(255, 255, 255, 0.9)']
    ),
  }));

  const lvlUpStyle = useAnimatedStyle(() => ({
    opacity: lvlUpOpacity.value,
    transform: [{ scale: interpolate(lvlUpOpacity.value, [0, 1], [0.5, 1.2]) }],
  }));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>COLOR FLOOD</Text>
          <Text style={styles.levelSub}>LEVEL {level} ({gridSize}x{gridSize})</Text>
        </View>
        <View style={styles.movesBadge}>
          <Text style={styles.movesText}>{moves} / {dynamicMaxMoves}</Text>
        </View>
      </View>

      <Animated.View style={[styles.boardContainer, animatedBoardContainer]}>
        <View style={styles.board}>
          {grid.map((row, r) => (
            <View key={r} style={styles.row}>
              {row.map((cellColor, c) => (
                <Cell
                  key={`${level}-${r}-${c}`}
                  color={cellColor}
                  delayIdx={r + c}
                  cellSize={cellSize}
                  winFlash={winFlash}
                />
              ))}
            </View>
          ))}

          {showLvlUp && (
            <View style={styles.lvlUpOverlay}>
              <Animated.View style={lvlUpStyle}>
                <Text style={styles.lvlUpText}>LEVEL UP!</Text>
              </Animated.View>
            </View>
          )}

          <View style={styles.particleContainer}>
            {particles.map((p) => <Particle key={p.id} color={p.color} />)}
          </View>
        </View>
      </Animated.View>

      <View style={styles.controls}>
        <View style={styles.colorPalette}>
          {COLORS.map((color, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.colorBtn, { backgroundColor: color }]}
              onPress={() => handleColorSelect(color)}
              disabled={isGameOver}
            >
              <View style={styles.btnGlint} />
            </TouchableOpacity>
          ))}
        </View>

        <TooltipRulesGames
          showTooltip={showTooltip}
          setShowTooltip={setShowTooltip}
          text={<Text>
            Закрасьте поле так, чтобы оно стало одноцветным! Начинайте с <Text style={styles.bold}>верхнего левого угла</Text>, выбирая цвета кнопками внизу.
          </Text>}
        />

        {showRules && <TouchableOpacity
          style={styles.newGameBtn}
          onPress={() => {
            if (showTooltip) return setShowTooltip(false);
            setShowTooltip(true);
          }}
        >
          <CircleHelp color="#fff" size={28} strokeWidth={2.5}/>
        </TouchableOpacity>}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a', alignItems: 'center' },
  header: { width: '90%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 30 },
  title: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: 1 },
  levelSub: { color: '#00BFFF', fontWeight: '900', fontSize: 14, letterSpacing: 2 },
  movesBadge: { backgroundColor: '#333', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12, borderWidth: 2, borderColor: '#444' },
  movesText: { color: '#00FF88', fontWeight: '900', fontSize: 18 },
  boardContainer: { padding: 6, backgroundColor: '#333', borderRadius: 24, borderWidth: 4, borderColor: '#444' },
  board: { width: BOARD_WIDTH, height: BOARD_WIDTH, backgroundColor: '#252525', borderRadius: 18, padding: 10, overflow: 'hidden' },
  row: { flexDirection: 'row' },
  cell: { borderRadius: 4, margin: 0.5 },
  glint: { position: 'absolute', top: 2, left: 2, width: '30%', height: '20%', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 10 },
  controls: { width: '100%', alignItems: 'center', marginTop: 40 },
  colorPalette: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 15, marginBottom: 30 },
  colorBtn: { width: 60, height: 60, borderRadius: 30, borderWidth: 4, borderColor: '#333', elevation: 8 },
  btnGlint: { position: 'absolute', top: 6, left: 10, width: 15, height: 8, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 10 },
  newGameBtn: { width:60,backgroundColor: '#333', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderBottomWidth: 5, borderColor: '#000' },
  newGameText: { color: '#fff', fontWeight: '900', letterSpacing: 2 },
  particleContainer: { position: 'absolute', top: BOARD_WIDTH / 2, left: BOARD_WIDTH / 2, alignItems: 'center', justifyContent: 'center' },
  particle: { width: 8, height: 8, borderRadius: 2, position: 'absolute', bottom:130, right:130 },
  lvlUpOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 100, backgroundColor: 'rgba(0,0,0,0.2)' },
  lvlUpText: { color: '#FFF', fontSize: 48, fontWeight: '900', textShadowColor: 'rgba(0, 191, 255, 0.8)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20, letterSpacing: 4 },
  bold: { fontWeight: 'bold', color: '#000', },
});
