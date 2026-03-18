import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { View, Text, StyleSheet, Dimensions, Alert } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  BounceIn,
} from 'react-native-reanimated';
import {SnakeSegment} from "../../components/SnakeSegment";
import {useSounds} from "../../components/useSounds";
import {useAudioContext} from "../../components/useAudioContext";
import {DatabaseService} from "../../services/database";
import {NamesForDB} from "../../constants/NamesForDB";
import {useFocusEffect} from "expo-router";

const { width } = Dimensions.get('window');
const GRID_SIZE = 15;
const CELL_SIZE = Math.floor((width - 40) / GRID_SIZE);
const BOARD_HEIGHT = CELL_SIZE * 22;
const MAX_ROWS = Math.floor(BOARD_HEIGHT / CELL_SIZE);
const soundSource = require('../../assets/sounds/apple.mp3');
const soundBg = require('../../assets/sounds/global2.mp3');

type Point = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const Colors = { primary: '#00FF88' };

export default function SmoothClipartSnake() {
  const [snake, setSnake] = useState<Point[]>([{ x: 7, y: 10 }, { x: 7, y: 11 }]);
  const [food, setFood] = useState<Point & {type:string}>({ x: 5, y: 5, type:'apple' });
  const [walls, setWalls] = useState<Point[]>([]); // Состояние лабиринта
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isStarted, setIsStarted] = useState(false);

  const directionRef = useRef<Direction>('UP');
  const inputProcessedInTick = useRef<boolean>(false);
  const speed = Math.max(110, 180 - score * 2);

  const playFlipSound = useSounds(soundSource);
  const playBgSound = useSounds(soundBg, true);
  const { stop } = useAudioContext();

  // Функция генерации случайного лабиринта
  const generateMaze = useCallback(() => {
    const newWalls: Point[] = [];
    const wallCount = 15 + Math.floor(Math.random() * 10); // 15-25 блоков
    for (let i = 0; i < wallCount; i++) {
      const wall = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * MAX_ROWS),
      };
      // Не ставим стены там, где змейка на старте или еда
      const isOnStart = (wall.x === 7 && (wall.y === 10 || wall.y === 11));
      if (!isOnStart) newWalls.push(wall);
    }
    setWalls(newWalls);
    return newWalls;
  }, []);

  useFocusEffect(() => setHighScore(DatabaseService.getHighScore(NamesForDB.snake)));
  useEffect(() => {
    generateMaze();

    stop();
    const savedMusic = DatabaseService.getSetting('music_enabled', 'true');
    savedMusic === 'true' && playBgSound();
  }, []);

  const FRUIT_TYPES = ['apple', 'banana', 'orange'];

  const generateFood = useCallback((currentSnake: Point[], currentWalls: Point[]) => {
    let newFood;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * MAX_ROWS),
        type: FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)], // Добавляем случайный тип
      };
      const onSnake = currentSnake.some(p => p.x === newFood.x && p.y === newFood.y);
      const onWall = currentWalls.some(p => p.x === newFood.x && p.y === newFood.y);
      if (!onSnake && !onWall) break;
    }
    setFood(newFood);
  }, []);


  const onGameOver = (finalScore: number) => {
    setIsGameOver(true);
    setIsStarted(false);
    DatabaseService.saveScore(NamesForDB.snake, finalScore);
    if (finalScore > highScore) setHighScore(finalScore);
    Alert.alert('БАХ!', `Счет: ${finalScore}`, [{ text: 'Ещё раз', onPress: reset }]);
  };

  const moveSnake = useCallback(() => {
    if (isGameOver || !isStarted) return;

    inputProcessedInTick.current = false;

    setSnake(prev => {
      const head = prev[0];
      const newHead = { ...head };
      const currentDir = directionRef.current;

      if (currentDir === 'UP') newHead.y -= 1;
      else if (currentDir === 'DOWN') newHead.y += 1;
      else if (currentDir === 'LEFT') newHead.x -= 1;
      else if (currentDir === 'RIGHT') newHead.x += 1;

      if (newHead.x < 0) newHead.x = GRID_SIZE - 1;
      else if (newHead.x >= GRID_SIZE) newHead.x = 0;
      if (newHead.y < 0) newHead.y = MAX_ROWS - 1;
      else if (newHead.y >= MAX_ROWS) newHead.y = 0;

      // Проверка столкновения с собой или СТЕНАМИ
      const hitSelf = prev.some(p => p.x === newHead.x && p.y === newHead.y);
      const hitWall = walls.some(w => w.x === newHead.x && w.y === newHead.y);

      if (hitSelf || hitWall) {
        runOnJS(onGameOver)(prev.length - 2);
        return prev;
      }

      const newSnake = [newHead, ...prev];
      if (newHead.x === food.x && newHead.y === food.y) {
        runOnJS(playFlipSound)();
        runOnJS(setScore)(s => s + 1);
        runOnJS(generateFood)(newSnake, walls);
      } else {
        newSnake.pop();
      }
      return newSnake;
    });
  }, [food, isGameOver, isStarted, walls]);

  const reset = () => {
    const newWalls = generateMaze();
    setSnake([{ x: 7, y: 10 }, { x: 7, y: 11 }]);
    directionRef.current = 'UP';
    inputProcessedInTick.current = false;
    setScore(0);
    setIsGameOver(false);
    setIsStarted(false);
    generateFood([{ x: 7, y: 10 }, { x: 7, y: 11 }], newWalls);
  };

  useEffect(() => {
    if (!isStarted || isGameOver) return;
    const interval = setInterval(moveSnake, speed);
    return () => clearInterval(interval);
  }, [moveSnake, speed, isStarted, isGameOver]);

  const changeDirection = (newDir: Direction) => {
    if (inputProcessedInTick.current) return;
    const current = directionRef.current;
    if (newDir === 'UP' && current !== 'DOWN') directionRef.current = 'UP';
    else if (newDir === 'DOWN' && current !== 'UP') directionRef.current = 'DOWN';
    else if (newDir === 'LEFT' && current !== 'RIGHT') directionRef.current = 'LEFT';
    else if (newDir === 'RIGHT' && current !== 'LEFT') directionRef.current = 'RIGHT';
    inputProcessedInTick.current = true;
    if (!isStarted) setIsStarted(true);
  };

  const gesture = Gesture.Pan().onUpdate(e => {
    const { velocityX, velocityY } = e;
    const VELOCITY_THRESHOLD = 500;
    if (Math.abs(velocityX) > Math.abs(velocityY)) {
      if (velocityX > VELOCITY_THRESHOLD) runOnJS(changeDirection)('RIGHT');
      else if (velocityX < -VELOCITY_THRESHOLD) runOnJS(changeDirection)('LEFT');
    } else {
      if (velocityY > VELOCITY_THRESHOLD) runOnJS(changeDirection)('DOWN');
      else if (velocityY < -VELOCITY_THRESHOLD) runOnJS(changeDirection)('UP');
    }
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={styles.animatedContainer}>
        <View style={styles.container}>
          <View style={styles.stats}>
            <Text style={styles.scoreText}>🍎 {score}</Text>
            <Text style={styles.bestText}>🏆 {highScore}</Text>
          </View>

          <View style={styles.board}>
            {/* Отрисовка стен лабиринта */}
            {walls.map((wall, i) => (
              <View
                key={`wall-${i}`}
                style={[styles.wall, { left: wall.x * CELL_SIZE, top: wall.y * CELL_SIZE }]}
              />
            ))}

            <Animated.View
              entering={BounceIn}
              key={`${food.x}-${food.y}`} // Добавь key для срабатывания анимации при смене типа
              style={[
                styles.foodClip,
                {
                  left: food.x * CELL_SIZE,
                  top: food.y * CELL_SIZE,
                  backgroundColor: food.type === 'banana' ? '#FFD700' : food.type === 'orange' ? '#FF8C00' : '#FF3366'
                }
              ]}
            >
              <View style={styles.foodLeaf} />
            </Animated.View>


            {snake.map((part, i) => (
              <SnakeSegment key={i} part={part} isHead={i === 0} speed={speed} />
            ))}
          </View>
          <Text style={styles.hint}>{isStarted ? 'СВАЙПНИ ДЛЯ УПРАВЛЕНИЯ' : 'СВАЙПНИ ДЛЯ СТАРТА'}</Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  animatedContainer: { flex: 1 },
  container: { flex: 1, backgroundColor: '#1a1a1a', alignItems: 'center', paddingTop: 60 },
  stats: { flexDirection: 'row', gap: 40, marginBottom: 20 },
  scoreText: { color: '#fff', fontSize: 28, fontWeight: '900' },
  bestText: { color: Colors.primary, fontSize: 28, fontWeight: '900' },
  board: { width: width - 30, height: BOARD_HEIGHT, backgroundColor: '#252525', borderRadius: 20, borderWidth: 4, borderColor: '#333', overflow: 'hidden' },
  wall: { position: 'absolute', width: CELL_SIZE, height: CELL_SIZE, backgroundColor: '#555', borderRadius: 4, borderWidth: 1, borderColor: '#333' },
  foodClip: { position: 'absolute', width: CELL_SIZE, height: CELL_SIZE, backgroundColor: '#FF3366', borderRadius: CELL_SIZE / 2, borderWidth: 2, borderColor: '#990022' },
  foodLeaf: { width: 8, height: 12, backgroundColor: '#22AA55', borderRadius: 4, position: 'absolute', top: -6, right: CELL_SIZE / 4 },
  hint: { marginTop: 20, color: '#666', fontWeight: 'bold', letterSpacing: 2 }
});
