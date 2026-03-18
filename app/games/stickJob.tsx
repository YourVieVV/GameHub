import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Dimensions, TouchableWithoutFeedback, Alert } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  cancelAnimation,
  FadeInRight,
} from 'react-native-reanimated';
import {runOnJS} from 'react-native-worklets';
import { DatabaseService } from '../../services/database';

const { width, height } = Dimensions.get('window');

const PLAYER_SIZE = 30;
const ISLAND_HEIGHT = 450;
const GROUND_Y = height - ISLAND_HEIGHT;
const MIN_DIST = 80;
const MAX_DIST = 180;

// Ширина одного полного цикла гор (чтобы третья гора на 500 не обрезалась)
const MOUNTAIN_LOOP_WIDTH = 800;

export default function StickHero() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  const active = useSharedValue(true);
  const isMoving = useSharedValue(false);
  const stickHeight = useSharedValue(0);
  const stickRotation = useSharedValue(0);
  const playerX = useSharedValue(50);
  const playerYOffset = useSharedValue(0);
  const worldX = useSharedValue(0);

  const [islands, setIslands] = useState([
    { x: 0, w: 80 },
    { x: 220, w: 70 }
  ]);

  useEffect(() => {
    setHighScore(DatabaseService.getHighScore('stick'));
    resetGame();
  }, []);

  const startGrowing = () => {
    if (isMoving.value || !active.value) return;
    stickHeight.value = withTiming(height / 1.5, {
      duration: 1500,
      easing: Easing.linear
    });
  };

  const stopGrowing = () => {
    if (isMoving.value || !active.value || stickHeight.value === 0) return;
    isMoving.value = true;
    const finalLen = stickHeight.value;
    cancelAnimation(stickHeight);
    stickHeight.value = finalLen;

    stickRotation.value = withTiming(90, { duration: 300 }, () => {
      runOnJS(checkLanding)(finalLen);
    });
  };

  const checkLanding = (len: number) => {
    const bridgeTip = islands[0].w + len;
    const targetStart = islands[1].x - islands[0].x;
    const targetEnd = targetStart + islands[1].w;

    if (bridgeTip >= targetStart && bridgeTip <= targetEnd) {
      playerX.value = withTiming(islands[1].x + islands[1].w - PLAYER_SIZE, { duration: 700 }, () => {
        runOnJS(nextLevel)();
      });
    } else {
      playerX.value = withTiming(islands[0].x + bridgeTip, { duration: 500 }, () => {
        playerYOffset.value = withTiming(ISLAND_HEIGHT, {
          duration: 400,
          easing: Easing.in(Easing.quad)
        }, () => {
          runOnJS(gameOver)();
        });
      });
    }
  };

  const nextLevel = () => {
    runOnJS(setScore)(score + 1);
    const lastIsland = islands[1];
    // коэффициент сложности расстояние между платформами
    let coefficientDiffDist = MAX_DIST - MIN_DIST;
    // коэффициент сложности ширина платформы
    let coefficientDiffW = 60;

    if (score > 10 && score < 20){
      coefficientDiffDist = MAX_DIST - 40;
      coefficientDiffW = 50;
    }
    if (score > 20 && score < 30){
      coefficientDiffDist = MAX_DIST;
      coefficientDiffW = 40;
    }
    if (score > 30){
      coefficientDiffDist = MAX_DIST + 20;
      coefficientDiffW = 30;
    }
    // расстояние между платформами
    const nextDist = Math.random() * coefficientDiffDist + MIN_DIST;
    // ширина платформы
    const nextW = Math.random() * coefficientDiffW + 40;

    const newIsland = { x: lastIsland.x + lastIsland.w + nextDist, w: nextW };

    worldX.value = withTiming(-lastIsland.x, { duration: 500 }, () => {
      runOnJS(updateIslands)(lastIsland, newIsland);
    });
  };

  const updateIslands = (current: any, next: any) => {
    setIslands([current, next]);
    stickHeight.value = 0;
    stickRotation.value = 0;
    isMoving.value = false;
  };

  const gameOver = () => {
    active.value = false;
    DatabaseService.saveScore('stick', score);
    Alert.alert("GAME OVER", `Счет: ${score}`, [{ text: "RETRY", onPress: resetGame }]);
  };

  const resetGame = () => {
    setScore(0);
    setIslands([{ x: 0, w: 80 }, { x: 220, w: 70 }]);
    playerX.value = 80 - PLAYER_SIZE;
    playerYOffset.value = 0;
    stickHeight.value = 0;
    stickRotation.value = 0;
    worldX.value = 0;
    active.value = true;
    isMoving.value = false;
  };

  const animatedStick = useAnimatedStyle(() => ({
    height: stickHeight.value,
    transform: [
      { translateY: stickHeight.value / 2 },
      { rotate: `${stickRotation.value}deg` },
      { translateY: -stickHeight.value / 2 },
    ],
  }));

  const animatedPlayer = useAnimatedStyle(() => ({
    transform: [
      { translateX: playerX.value },
      { translateY: playerYOffset.value }
    ],
  }));

  const animatedWorld = useAnimatedStyle(() => ({
    transform: [{ translateX: worldX.value }],
  }));

  // Зацикливание гор на MOUNTAIN_LOOP_WIDTH
  const animatedMountains = useAnimatedStyle(() => ({
    transform: [{ translateX: (worldX.value * 0.2) % MOUNTAIN_LOOP_WIDTH }],
  }));

  const animatedClouds = useAnimatedStyle(() => ({
    transform: [{ translateX: (worldX.value * 0.3) % width }],
  }));

  const MountainSet = () => (
    <View style={{ width: MOUNTAIN_LOOP_WIDTH, height: '100%' }}>
      <View style={[styles.mountain, { left: -110, borderBottomColor: '#6fa3c4', borderBottomWidth: 370, borderLeftWidth: 270, borderRightWidth: 270 }]} />
      <View style={[styles.mountain, { left: 140, scaleX: 1.5, borderBottomColor: '#5d8aa8', borderBottomWidth: 460, borderLeftWidth: 310, borderRightWidth: 310 }]} />
      <View style={[styles.mountain, { left: 500, borderBottomColor: '#6fa3c4', borderBottomWidth: 380, borderLeftWidth: 250, borderRightWidth: 250 }]} />
    </View>
  );

  return (
    <TouchableWithoutFeedback onPressIn={startGrowing} onPressOut={stopGrowing}>
      <View style={styles.container}>
        <View style={styles.skyGradient}>
          <Animated.View style={[StyleSheet.absoluteFillObject, animatedClouds, { width: width * 2, flexDirection: 'row' }]}>
            <View style={{ width }}>
              <View style={[styles.cloud, { top: 90, left: 40, width: 100 }]} />
              <View style={[styles.cloud, { top: 130, right: 30, width: 120 }]} />
              <View style={[styles.cloud, { top: 230, left: 10, width: 80 }]} />
            </View>
            <View style={{ width }}>
              <View style={[styles.cloud, { top: 90, left: 40, width: 100 }]} />
              <View style={[styles.cloud, { top: 130, right: 30, width: 120 }]} />
              <View style={[styles.cloud, { top: 230, left: 10, width: 80 }]} />
            </View>
          </Animated.View>
        </View>

        {/* Дублируем набор гор для плавного перехода */}
        <Animated.View style={[styles.mountainsContainer, animatedMountains, { width: MOUNTAIN_LOOP_WIDTH * 2, flexDirection: 'row' }]}>
          <MountainSet />
          <MountainSet />
        </Animated.View>

        <View style={styles.header}>
          <Text style={styles.scoreText}>{score}</Text>
          <Text style={styles.bestText}>BEST: {highScore}</Text>
        </View>

        <Animated.View style={[styles.world, animatedWorld]}>
          {islands.map((isl, i) => (
            <Animated.View
              key={`${isl.x}-${isl.w}`}
              entering={FadeInRight.duration(600).springify()}
              style={[styles.island, { width: isl.w, left: isl.x }]}
            />
          ))}

          <View style={[styles.stickAnchor, { left: islands[0].x + islands[0].w - 2 }]}>
            <Animated.View style={[styles.stick, animatedStick]} />
          </View>

          <Animated.View style={[styles.player, animatedPlayer]}>
            <View style={styles.eye} />
            <View style={styles.glint} />
          </Animated.View>
        </Animated.View>

        <Text style={styles.hint}>HOLD TO EXTEND</Text>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#87CEEB', overflow: 'hidden' },
  skyGradient: { ...StyleSheet.absoluteFillObject, backgroundColor: '#87CEEB', overflow: 'hidden' },
  cloud: { position: 'absolute', height: 35, backgroundColor: '#fff', borderRadius: 20, opacity: 0.7 },
  mountainsContainer: {
    position: 'absolute',
    top: GROUND_Y - 90,
    height: 450,
  },
  mountain: {
    position: 'absolute',
    bottom: 0,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  header: {
    marginTop: 50,
    alignItems: 'center',
    zIndex: 100
  },
  scoreText: { fontSize: 72, fontWeight: '900', color: '#fff', textShadowColor: 'rgba(0,0,0,0.2)', textShadowRadius: 10 },
  bestText: { fontSize: 16, color: '#fff', opacity: 0.8, fontWeight: 'bold', marginTop: -5 },
  world: { flex: 1 },
  island: {
    position: 'absolute',
    top: GROUND_Y,
    height: ISLAND_HEIGHT,
    backgroundColor: '#252525',
    borderTopWidth: 4,
    borderColor: '#000',
  },
  player: {
    position: 'absolute',
    top: GROUND_Y - PLAYER_SIZE,
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    backgroundColor: '#FF4444',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#900',
    zIndex: 10,
  },
  eye: { width: 5, height: 5, backgroundColor: '#000', borderRadius: 3, position: 'absolute', right: 6, top: 6 },
  glint: { width: 8, height: 8, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 4, position: 'absolute', left: 4, top: 4 },
  stickAnchor: { position: 'absolute', top: GROUND_Y, width: 4, zIndex: 5 },
  stick: { width: 4, backgroundColor: '#000', borderRadius: 2, bottom: 0, position: 'absolute' },
  hint: { position: 'absolute', bottom: 100, width: '100%', textAlign: 'center', color: '#fff', fontWeight: 'bold', opacity: 0.5 }
});
