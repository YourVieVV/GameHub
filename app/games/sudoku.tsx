import React, {useState, useEffect, useMemo} from 'react';
import { StyleSheet, View, Text, Dimensions, TouchableOpacity, ScrollView, Alert } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  withTiming, runOnJS
} from 'react-native-reanimated';
import {useSounds} from "../../components/useSounds";
import {DatabaseService} from "../../services/database";
import {NamesForDB} from "../../constants/NamesForDB";
import {EASY, HARD, MEDIUM} from "../../constants/Text";

const { width } = Dimensions.get('window');
const CELL_SIZE = Math.floor((width - 40) / 9);
const soundSource = require('../../assets/sounds/pencil2.mp3');
const soundWin = require('../../assets/sounds/win.mp3');

export default function SudokuGame() {
  const [grid, setGrid] = useState<number[][]>(Array(9).fill(null).map(() => Array(9).fill(0)));
  const [solution, setSolution] = useState<number[][]>([]);
  const [initialMask, setInitialMask] = useState<boolean[][]>(Array(9).fill(null).map(() => Array(9).fill(false)));
  const [selectedCell, setSelectedCell] = useState<{ r: number, c: number } | null>(null);
  const [currScore, setCurrScore] = useState(0);
  const [savedDiff, setSavedDiff] = useState('EASY');
  const [showRules, setShowRules] = useState(true);

  const [isWon, setIsWon] = useState(false);
  const winAnim = useSharedValue(0);
  const scoreAnim = useSharedValue(0);

  useEffect(() => {
    const diff = DatabaseService.getSetting('sudoku_difficulty', EASY)
    setSavedDiff(diff);
    setCurrScore(DatabaseService.getScore(NamesForDB.sudoku));
    generateNewBoard(diff);

    const isShowRules = DatabaseService.getSetting('rules_enabled', 'true');
    setShowRules(isShowRules === 'true');
  }, []);

  const playFlipSound = useSounds(soundSource);
  const winSound = useSounds(soundWin);

  const score = useMemo(() => {
    if (savedDiff === MEDIUM) return 300;
    if (savedDiff === HARD) return 600;
    return 100;
  },[savedDiff]);

  const generateNewBoard = (savedDiff:string) => {
    setIsWon(false);
    winAnim.value = 0;
    scoreAnim.value = 0;
    const holes = savedDiff === EASY ? 20 : savedDiff === MEDIUM ? 30 : 40;
    const newGrid = Array(9).fill(null).map(() => Array(9).fill(0));

    for (let i = 0; i < 9; i += 3) fillBox(newGrid, i, i);
    solveSudoku(newGrid);

    const solvedCopy = newGrid.map(row => [...row]);
    setSolution(solvedCopy);
    pokeHoles(newGrid, holes);

    setGrid(newGrid);
    setInitialMask(newGrid.map(row => row.map(cell => cell !== 0)));
    setSelectedCell(null);
  };

  const fillBox = (g: number[][], row: number, col: number) => {
    let num;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        do { num = Math.floor(Math.random() * 9) + 1; }
        while (!isSafeInBox(g, row, col, num));
        g[row + i][col + j] = num;
      }
    }
  };

  const isSafeInBox = (g: number[][], rowStart: number, colStart: number, num: number) => {
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        if (g[rowStart + i][colStart + j] === num) return false;
    return true;
  };

  const solveSudoku = (g: number[][]): boolean => {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (g[row][col] === 0) {
          const nums = [1,2,3,4,5,6,7,8,9].sort(() => Math.random() - 0.5);
          for (let num of nums) {
            if (isValid(g, row, col, num)) {
              g[row][col] = num;
              if (solveSudoku(g)) return true;
              g[row][col] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  };

  const isValid = (g: number[][], r: number, c: number, n: number) => {
    for (let i = 0; i < 9; i++) if (g[r][i] === n || g[i][c] === n) return false;
    const br = r - r % 3, bc = c - c % 3;
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        if (g[br + i][bc + j] === n) return false;
    return true;
  };

  const pokeHoles = (g: number[][], count: number) => {
    let removed = 0;
    while (removed < count) {
      let r = Math.floor(Math.random() * 9);
      let c = Math.floor(Math.random() * 9);
      if (g[r][c] !== 0) {
        g[r][c] = 0;
        removed++;
      }
    }
  };

  const handleCellPress = (r: number, c: number) => {
    if (initialMask[r][c]) return;
    setSelectedCell({ r, c });
  };

  const triggerWinAnim = () => {
    setIsWon(true);
    winAnim.value = withSequence(
      withTiming(0, { duration: 0 }, () => {
        runOnJS(winSound)();
      }),
      withSpring(1),
      withDelay(1500, withTiming(0))
    );
    scoreAnim.value = withSequence(
      withDelay(1500,
        // Звук запустится ТОЛЬКО после задержки 2000мс
        withTiming(0, { duration: 0 }, () => {
          runOnJS(winSound)();
        })
      ),
      withDelay(0, withSpring(1)),
      withDelay(1500, withTiming(0, {}, (finished) => {
        // 3. Вместо setTimeout: запускаем сброс, когда всё закончилось
        if (finished) {
          runOnJS(setIsWon)(false);
          runOnJS(generateNewBoard)(savedDiff);
        }
      }))
    );
  };

  const setNumber = (num: number) => {
    if (!selectedCell || isWon) return;
    const { r, c } = selectedCell;
    const newGrid = grid.map(row => [...row]);
    newGrid[r][c] = num;
    setGrid(newGrid);
    playFlipSound()

    const isComplete = newGrid.every((row, ri) => row.every((cell, ci) => cell === solution[ri][ci]));
    if (isComplete) {
      DatabaseService.saveScore(NamesForDB.sudoku, currScore + score, { difficulty: savedDiff });
      triggerWinAnim();
    }
  };

  const clearSelectedCell = () => {
    if (!selectedCell) return;
    const { r, c } = selectedCell;
    const newGrid = grid.map(row => [...row]);
    newGrid[r][c] = 0;
    setGrid(newGrid);
  };

  const showHelp = () => {
    Alert.alert(
      "КАК ИГРАТЬ?",
      "1. Заполни пустые клетки цифрами от 1 до 9.\n\n" +
      "2. Каждая цифра должна встречаться ТОЛЬКО ОДИН РАЗ в каждой строке, каждом столбце и каждом малом квадрате 3x3.\n\n" +
      "3. Начальные (белые) цифры изменять нельзя.",
      [{ text: "ПОНЯТНО", style: "default" }]
    );
  };

  const winStyle = useAnimatedStyle(() => ({
    transform: [{ scale: winAnim.value }, { translateY: -100 }],
    opacity: winAnim.value,
  }));

  const scoreStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scoreAnim.value },
      { translateY: (scoreAnim.value * -10) - 80 }
    ],
    opacity: scoreAnim.value,
  }));

  return (
    <View style={styles.mainWrapper}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>SUDOKU</Text>
          <View style={styles.btnRow}>
            {/*<TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FF4757' }]} onPress={triggerWinAnim}>*/}
            {/*  <Text style={styles.btnText}>TEST</Text>*/}
            {/*</TouchableOpacity>*/}
            <TouchableOpacity style={styles.actionBtn} onPress={clearSelectedCell}>
              <Text style={styles.btnText}>СБРОС</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#2E97FF' }]} onPress={generateNewBoard}>
              <Text style={[styles.btnText, { color: '#fff' }]}>НОВАЯ</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.board}>
          {grid.map((row, r) => (
            <View key={r} style={[styles.row, r % 3 === 2 && r !== 8 && styles.borderBottom]}>
              {row.map((cell, c) => {
                const isSelected = selectedCell?.r === r && selectedCell?.c === c;
                const isInitial = initialMask[r][c];
                return (
                  <TouchableOpacity
                    key={c}
                    onPress={() => handleCellPress(r, c)}
                    style={[styles.cell, c % 3 === 2 && c !== 8 && styles.borderRight, isSelected && styles.selectedCell]}
                  >
                    <Text style={[styles.cellText, isInitial ? styles.initialText : styles.playerText]}>
                      {cell !== 0 ? cell : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        <View style={styles.numPad}>
          {[1,2,3,4,5,6,7,8,9].map(num => (
            <TouchableOpacity key={num} style={styles.numBtn} onPress={() => setNumber(num)}>
              <Text style={styles.numBtnText}>{num}</Text>
              <View style={styles.btnGlint} />
            </TouchableOpacity>
          ))}
          {showRules && <TouchableOpacity style={[styles.numBtn, styles.helpBtn]} onPress={showHelp}>
            <Text style={[styles.numBtnText, {color: '#fff'}]}>?</Text>
            <View style={styles.btnGlint}/>
          </TouchableOpacity>}
        </View>
      </ScrollView>

      {isWon && (
        <View style={styles.winOverlay} pointerEvents="none">
          <Animated.View style={winStyle}>
            <Text style={styles.winTextClipart}>EXCELLENT!</Text>
          </Animated.View>
          <Animated.View style={scoreStyle}>
            <Text style={styles.scorePopupClipart}>+{score} POINTS</Text>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: '#1a1a1a' },
  container: { alignItems: 'center', paddingTop: 50, paddingBottom: 30 },
  header: { width: '90%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: 2 },
  btnRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderBottomWidth: 4, borderColor: 'rgba(0,0,0,0.4)', backgroundColor: '#333' },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  board: { backgroundColor: '#252525', borderWidth: 4, borderColor: '#333', borderRadius: 18, overflow: 'hidden', elevation: 10 },
  row: { flexDirection: 'row' },
  cell: { width: CELL_SIZE, height: CELL_SIZE, justifyContent: 'center', alignItems: 'center', borderWidth: 0.5, borderColor: '#333' },
  borderRight: { borderRightWidth: 4, borderRightColor: '#444' },
  borderBottom: { borderBottomWidth: 4, borderBottomColor: '#444' },
  selectedCell: { backgroundColor: 'rgba(46, 151, 255, 0.3)' },
  cellText: { fontSize: 22, fontWeight: '900' },
  initialText: { color: '#fff' },
  playerText: { color: '#2E97FF' },
  numPad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 30, paddingHorizontal: 20 },
  numBtn: { width: 58, height: 58, backgroundColor: '#2E97FF', borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 6, borderColor: '#1A5A99' },
  helpBtn: { backgroundColor: '#333', borderColor: '#111' },
  numBtnText: { color: '#fff', fontSize: 24, fontWeight: '900' },
  btnGlint: { position: 'absolute', top: 5, left: 5, width: 8, height: 8, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 4 },
  winOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  winTextClipart: {
    fontSize: 55,
    fontWeight: '900',
    color: '#2E97FF',
    textShadowColor: '#000',
    textShadowOffset: { width: 4, height: 4 },
    textShadowRadius: 1,
    shadowColor: '#2E97FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 30,
  },
  scorePopupClipart: {
    fontSize: 35,
    fontWeight: '900',
    color: '#32CD32',
    textShadowColor: '#000',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 1,
    shadowColor: '#32CD32',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
  }
});
