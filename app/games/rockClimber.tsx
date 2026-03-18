import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Dimensions, TouchableWithoutFeedback, Alert } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  runOnJS,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { DatabaseService } from '../../services/database';
import {useSounds} from "../../components/useSounds";
import {useAudioContext} from "../../components/useAudioContext";
import {NamesForDB} from "../../constants/NamesForDB";
import {useFocusEffect} from "expo-router";

const { width, height } = Dimensions.get('window');

const PLAYER_SIZE = 30;
const LEG_HEIGHT = 6;
const ISLAND_HEIGHT = 450;
const GROUND_Y = height - ISLAND_HEIGHT;
const MIN_DIST = 80;
const MAX_DIST = 180;
const STEP_UP = 60;
const MOUNTAIN_LOOP_WIDTH = 800;
const soundBg = require('../../assets/sounds/climbBg.mp3');

export default function HillClimber() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  const active = useSharedValue(true);
  const isMoving = useSharedValue(false);
  const stickHeight = useSharedValue(0);
  const stickRotation = useSharedValue(0);
  const playerX = useSharedValue(50);
  const playerYOffset = useSharedValue(0);
  const legMove = useSharedValue(0);
  const worldX = useSharedValue(0);
  const worldY = useSharedValue(0);

  const [islands, setIslands] = useState([
    { x: 0, y: 0, w: 80 },
    { x: 220, y: -STEP_UP, w: 70 }
  ]);

  const playBgSound = useSounds(soundBg, true);
  const { stop } = useAudioContext();

  useFocusEffect(() => setHighScore(DatabaseService.getHighScore(NamesForDB.rockClimber)));
  useEffect(() => {
    resetGame();

    stop();
    const savedMusic = DatabaseService.getSetting('music_enabled', 'true');
    savedMusic === 'true' && playBgSound();
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

    const dx = islands[1].x - (islands[0].x + islands[0].w);
    const dy = Math.abs(islands[1].y - islands[0].y);
    const targetAngle = Math.atan2(dx, dy) * (180 / Math.PI);

    stickRotation.value = withTiming(targetAngle, { duration: 400 }, () => {
      runOnJS(checkLanding)(finalLen);
    });
  };

  const checkLanding = (len: number) => {
    // 1. Расстояния между точкой крепления палочки и целевым островом
    const dxStart = islands[1].x - (islands[0].x + islands[0].w); // Расстояние до начала
    const dxEnd = (islands[1].x + islands[1].w) - (islands[0].x + islands[0].w); // Расстояние до конца
    const dy = islands[0].y - islands[1].y; // Разница высот

    // 2. Вычисляем угол, под которым палочка коснется БЛИЖНЕГО угла острова
    const angle = Math.atan2(dy, dxStart);

    // 3. Вычисляем ПРАВИЛЬНУЮ максимальную длину (len), при которой палочка еще касается поверхности острова
    // На наклонной поверхности крайняя точка — это dxEnd деленное на cos угла наклона
    const minRequiredLen = Math.sqrt(dxStart * dxStart + dy * dy);
    const maxRequiredLen = dxEnd / Math.cos(angle);

    // 4. Проверка попадания (теперь без люфтов и разброса)
    const isSuccess = len >= minRequiredLen && len <= maxRequiredLen;

    if (isSuccess) {
      // Анимация успеха
      legMove.value = withRepeat(
        withSequence(withTiming(4, { duration: 100 }), withTiming(-4, { duration: 100 })),
        -1,
        true
      );

      const finalDashDuration = score > 30 ? 300 : 700;

      playerX.value = withTiming(islands[1].x, { duration: 800 });
      playerYOffset.value = withTiming(islands[1].y, { duration: 800 }, () => {
        playerX.value = withTiming(islands[1].x + islands[1].w - PLAYER_SIZE, {
          duration: finalDashDuration
        }, () => {
          cancelAnimation(legMove);
          legMove.value = 0;
          runOnJS(nextLevel)();
        });
      });

    } else {
      if (score > 30){
        // Координаты кончика палочки, где игрок должен начать падение
        const endStickX = islands[0].x + islands[0].w + len * Math.cos(angle);
        const endStickY = islands[0].y - len * Math.sin(angle);

        playerX.value = withTiming(endStickX, { duration: 500 });
        playerYOffset.value = withTiming(endStickY, { duration: 500 }, () => {

          if (len < minRequiredLen) {
            stickRotation.value = withTiming(110, { duration: 300 });
          }

          playerYOffset.value = withTiming(ISLAND_HEIGHT, {
            duration: 400,
            easing: Easing.in(Easing.quad)
          }, () => {
            runOnJS(gameOver)();
          });
        });
      } else {
        const fallX = islands[0].x + islands[0].w + len;

        playerX.value = withTiming(fallX, { duration: 500 }, () => {
          if (len < minRequiredLen) {
            stickRotation.value = withTiming(110, { duration: 300 });
          }

          playerYOffset.value = withTiming(ISLAND_HEIGHT, {
            duration: 400,
            easing: Easing.in(Easing.quad)
          }, () => {
            runOnJS(gameOver)();
          });
        });
      }
    }
  };

  const nextLevel = () => {
    runOnJS(setScore)(score + 1);
    const lastIsland = islands[1];
    // коэффициент сложности расстояние между платформами
    let coefficientDiffDist = MIN_DIST;
    // коэффициент сложности ширина платформы
    let coefficientDiffW = 60;

    if (score > 10 && score < 20){
      coefficientDiffDist = MAX_DIST - 40;
      coefficientDiffW = 40;
    }
    if (score > 20 && score < 30){
      coefficientDiffDist = MAX_DIST - 10;
      coefficientDiffW = 30;
    }
    if (score > 30){
      coefficientDiffDist = MAX_DIST + 20;
      coefficientDiffW = 20;
    }
    // расстояние между платформами
    const nextDist = Math.random() * coefficientDiffDist + MIN_DIST;
    // ширина платформы
    const nextW = Math.random() * coefficientDiffW + 40;

    let yHeight = lastIsland.y
    // острова становятся выше
    if (score >= 30) yHeight = lastIsland.y - STEP_UP;

    const newIsland = { x: lastIsland.x + lastIsland.w + nextDist, y: yHeight, w: nextW };

    worldX.value = withTiming(-lastIsland.x, { duration: 500 });
    worldY.value = withTiming(-lastIsland.y, { duration: 500 }, () => {
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
    DatabaseService.saveScore(NamesForDB.rockClimber, score);
    Alert.alert("Уууупс...", `Счет: ${score}`, [{ text: "ПОВТОРИТЬ", onPress: resetGame }]);
  };

  const resetGame = () => {
    setScore(0);
    // y:-STEP_UP
    setIslands([{ x: 0, y: 0, w: 80 }, { x: 220, y: 0, w: 70 }]);
    playerX.value = 80 - PLAYER_SIZE;
    playerYOffset.value = 0;
    stickHeight.value = 0;
    stickRotation.value = 0;
    worldX.value = 0;
    worldY.value = 0;
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

  const animatedLegL = useAnimatedStyle(() => ({ transform: [{ translateX: legMove.value }] }));
  const animatedLegR = useAnimatedStyle(() => ({ transform: [{ translateX: -legMove.value }] }));

  const animatedWorld = useAnimatedStyle(() => ({
    transform: [{ translateX: worldX.value }, { translateY: worldY.value }],
  }));

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
            </View>
            <View style={{ width }}>
              <View style={[styles.cloud, { top: 90, left: 40, width: 100 }]} />
              <View style={[styles.cloud, { top: 130, right: 30, width: 120 }]} />
            </View>
          </Animated.View>
        </View>

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
              style={[styles.island, { width: isl.w, left: isl.x, top: GROUND_Y + isl.y }]}
            />
          ))}

          <View style={[styles.stickAnchor, { left: islands[0].x + islands[0].w - 2, top: GROUND_Y + islands[0].y }]}>
            <Animated.View style={[styles.stick, animatedStick]} />
          </View>

          <Animated.View style={[styles.player, animatedPlayer, { top: GROUND_Y - PLAYER_SIZE - 3 }]}>
            <Animated.View style={[styles.leg, { left: 6 }, animatedLegL]} />
            <Animated.View style={[styles.leg, { right: 6 }, animatedLegR]} />
            <View style={styles.eye} />
            <View style={styles.glint} />
          </Animated.View>

        </Animated.View>

        <Text style={styles.hint}>НАЖМИ ДЛЯ ВЫДВИЖЕНИЯ ТРОСТИ</Text>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#87CEEB', overflow: 'hidden' },
  skyGradient: { ...StyleSheet.absoluteFillObject, backgroundColor: '#87CEEB', overflow: 'hidden' },
  cloud: { position: 'absolute', height: 35, backgroundColor: '#fff', borderRadius: 20, opacity: 0.7 },
  mountainsContainer: { position: 'absolute', top: GROUND_Y - 90, height: 450 },
  mountain: { position: 'absolute', bottom: 0, width: 0, height: 0, borderStyle: 'solid', borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  header: { marginTop: 50, alignItems: 'center', zIndex: 100 },
  scoreText: { fontSize: 72, fontWeight: '900', color: '#fff', textShadowColor: 'rgba(0,0,0,0.2)', textShadowRadius: 10 },
  bestText: { fontSize: 16, color: '#fff', opacity: 0.8, fontWeight: 'bold', marginTop: -5 },
  world: { flex: 1 },
  island: { position: 'absolute', height: height, backgroundColor: '#252525', borderTopWidth: 4, borderColor: '#000' },
  player: { position: 'absolute', width: PLAYER_SIZE, height: PLAYER_SIZE, backgroundColor: '#FF4444', borderRadius: 8, borderWidth: 2, borderColor: '#900', zIndex: 10 },
  leg: { position: 'absolute', bottom: -LEG_HEIGHT, width: 6, height: LEG_HEIGHT, backgroundColor: '#900', borderRadius: 1 },
  eye: { width: 5, height: 5, backgroundColor: '#000', borderRadius: 3, position: 'absolute', right: 6, top: 6 },
  glint: { width: 8, height: 8, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 4, position: 'absolute', left: 4, top: 4 },
  stickAnchor: { position: 'absolute', width: 4, zIndex: 5 },
  stick: { width: 4, backgroundColor: '#000', borderRadius: 2, bottom: 0, position: 'absolute' },
  hint: { position: 'absolute', bottom: 60, width: '100%', textAlign: 'center', color: '#fff', fontWeight: 'bold', opacity: 0.5 }
});
