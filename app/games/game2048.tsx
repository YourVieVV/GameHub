import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, Dimensions, Alert, TouchableOpacity } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  LinearTransition,
  runOnJS,
  FadeIn,
  ZoomIn
} from 'react-native-reanimated';
import { DatabaseService } from '../../services/database';
import {useSounds} from "../../components/useSounds";
import {SizeBoard} from "../settings";
import {NamesForDB} from "../../constants/NamesForDB";

const { width } = Dimensions.get('window');
const CELL_MARGIN = 8;
const BOARD_PADDING = 12;
const soundSource = require('../../assets/sounds/swipe2.mp3');

type Tile = {
  id: number;
  value: number;
  row: number;
  col: number;
};

const TILE_COLORS: Record<number, string> = {
  2: '#eee4da', 4: '#ede0c8', 8: '#f2b179', 16: '#f59563',
  32: '#f67c5f', 64: '#f65e3b', 128: '#edcf72', 256: '#edcc61',
  512: '#edc850', 1024: '#edc53f', 2048: '#00FF88',
};

export default function Game2048() {
  const [rows, setRows] = useState(4);
  const [cols, setCols] = useState(4);
  const [grid, setGrid] = useState<Tile[]>([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [nextId, setNextId] = useState(0);

  // Вычисляемый размер ячейки на основе количества колонок
  const CELL_SIZE = Math.floor((width - 40 - (BOARD_PADDING * 2) - (CELL_MARGIN * (cols - 1))) / cols);

  useEffect(() => {
    setHighScore(DatabaseService.getHighScore(NamesForDB.game2048));
    const savedBoard2048 = DatabaseService.getSetting('game2048_default', 'STANDARD') as SizeBoard;
    if (savedBoard2048 === 'INCREASED') setRows(5);
    initGame();
  }, []); // Перезапуск при смене размера

  const playFlipSound = useSounds(soundSource);

  const initGame = () => {
    setScore(0);
    const first = createTile([], 0);
    const second = createTile([first], 1);
    setGrid([first, second]);
    setNextId(2);
  };

  const createTile = (currentGrid: Tile[], id: number): Tile => {
    const occupied = new Set(currentGrid.map(t => `${t.row},${t.col}`));
    const empty = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!occupied.has(`${r},${c}`)) empty.push({ r, c });
      }
    }
    const spot = empty[Math.floor(Math.random() * empty.length)];
    return { id, value: Math.random() > 0.1 ? 2 : 4, row: spot.r, col: spot.c };
  };

  const move = async (direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    let hasMoved = false;
    let newScore = score;
    let currentGrid = [...grid].sort((a, b) => {
      if (direction === 'UP') return a.row - b.row;
      if (direction === 'DOWN') return b.row - a.row;
      if (direction === 'LEFT') return a.col - b.col;
      return b.col - a.col;
    });

    await playFlipSound();

    const newGrid: Tile[] = [];
    const mergedIds = new Set<number>();

    const outerLimit = (direction === 'UP' || direction === 'DOWN') ? cols : rows;

    for (let i = 0; i < outerLimit; i++) {
      const line = currentGrid.filter(t => (direction === 'UP' || direction === 'DOWN') ? t.col === i : t.row === i);

      let pos = (direction === 'UP' || direction === 'LEFT') ? 0 : (direction === 'DOWN' ? rows - 1 : cols - 1);
      const step = (direction === 'UP' || direction === 'LEFT') ? 1 : -1;

      for (let j = 0; j < line.length; j++) {
        const tile = { ...line[j] };
        const nextTile = line[j + 1];

        if (nextTile && tile.value === nextTile.value && !mergedIds.has(nextTile.id)) {
          tile.value *= 2;
          newScore += tile.value;
          mergedIds.add(tile.id);
          if (direction === 'UP' || direction === 'DOWN') tile.row = pos; else tile.col = pos;
          newGrid.push(tile);
          j++;
          hasMoved = true;
        } else {
          if (direction === 'UP' || direction === 'DOWN') {
            if (tile.row !== pos) hasMoved = true;
            tile.row = pos;
          } else {
            if (tile.col !== pos) hasMoved = true;
            tile.col = pos;
          }
          newGrid.push(tile);
        }
        pos += step;
      }
    }

    if (hasMoved) {
      const spawned = createTile(newGrid, nextId);
      setGrid([...newGrid, spawned]);
      setNextId(nextId + 1);
      setScore(newScore);
      if (newScore > highScore) {
        DatabaseService.saveScore(NamesForDB.game2048, newScore);
        setHighScore(newScore);
      }
    } else if (newGrid.length === rows * cols) {
      checkGameOver();
    }
  };

  const checkGameOver = () => {
    DatabaseService.saveScore(NamesForDB.game2048, score);
    Alert.alert("ИГРА ОКОНЧЕНА", `Ваш счет: ${score}`, [{ text: "ЗАНОВО", onPress: initGame }]);
  };

  const gesture = Gesture.Pan().onEnd((e) => {
    const { velocityX, velocityY } = e;
    if (Math.abs(velocityX) > Math.abs(velocityY)) {
      if (velocityX > 500) runOnJS(move)('RIGHT');
      else if (velocityX < -500) runOnJS(move)('LEFT');
    } else {
      if (velocityY > 500) runOnJS(move)('DOWN');
      else if (velocityY < -500) runOnJS(move)('UP');
    }
  });

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreLabel}>SCORE</Text>
            <Text style={styles.scoreValue}>{score}</Text>
          </View>
          <View style={[styles.scoreContainer, { backgroundColor: '#333' }]}>
            <Text style={styles.scoreLabel}>BEST</Text>
            <Text style={styles.scoreValue}>{highScore}</Text>
          </View>
        </View>

        <View style={[styles.board, { height: rows * (CELL_SIZE + CELL_MARGIN) + BOARD_PADDING * 2 - CELL_MARGIN + 10 }]}>
          {Array(rows * cols).fill(0).map((_, i) => (
            <View key={i} style={[styles.emptyCell, { width: CELL_SIZE, height: CELL_SIZE }]} />
          ))}

          {grid.map((tile) => (
            <Animated.View
              key={tile.id}
              entering={ZoomIn}
              layout={LinearTransition.duration(150)}
              style={[
                styles.tile,
                {
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  left: tile.col * (CELL_SIZE + CELL_MARGIN) + BOARD_PADDING,
                  top: tile.row * (CELL_SIZE + CELL_MARGIN) + BOARD_PADDING,
                  backgroundColor: TILE_COLORS[tile.value] || '#3c3a32',
                }
              ]}
            >
              <Text style={[styles.tileText, { fontSize: CELL_SIZE / 3, color: tile.value <= 4 ? '#776e65' : '#fff' }]}>
                {tile.value}
              </Text>
              <View style={styles.glint} />
            </Animated.View>
          ))}
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a', alignItems: 'center', paddingTop: 60 },
  header: { flexDirection: 'row', gap: 15, marginBottom: 60 },
  scoreContainer: {
    backgroundColor: '#00FF88',
    padding: 10,
    borderRadius: 15,
    minWidth: 100,
    alignItems: 'center',
    borderBottomWidth: 5,
    borderColor: 'rgba(0,0,0,0.2)'
  },
  scoreLabel: { fontSize: 12, fontWeight: '900', color: 'rgba(0,0,0,0.5)' },
  scoreValue: { fontSize: 24, fontWeight: '900', color: '#000' },
  board: {
    width: width - 20,
    backgroundColor: '#252525',
    borderRadius: 20,
    padding: BOARD_PADDING,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CELL_MARGIN,
    borderWidth: 4,
    borderColor: '#333',
  },
  emptyCell: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },
  tile: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderBottomWidth: 6,
    borderColor: 'rgba(0,0,0,0.15)',
  },
  tileText: { fontWeight: '900' },
  glint: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 12,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 6,
  },
  sizeButton: {
    marginTop: 40,
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#00FF88'
  },
  sizeButtonText: {
    color: '#00FF88',
    fontWeight: '900',
    fontSize: 16
  }
});
