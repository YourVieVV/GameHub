import React, { useState, useEffect } from 'react';
import {View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView} from 'react-native';
import { DatabaseService } from '../services/database';
import {useAudioContext} from "../components/useAudioContext";
import {EASY, HARD, MEDIUM} from "../constants/Text";

type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type SizeBoard = 'STANDARD' | 'INCREASED';

export default function SettingsScreen() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [rulesEnabled, setRulesEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [difficulty, setDifficulty] = useState<Difficulty>(EASY);
  const [fifteenDiff, setFifteenDiff] = useState<Difficulty>(MEDIUM); // Для Пятнашек
  const [board2048, setBoard2048] = useState<SizeBoard>('STANDARD');

  const { start, stop } = useAudioContext();

  useEffect(() => {
    const savedDiff = DatabaseService.getSetting('sudoku_difficulty', EASY) as Difficulty;
    const savedFifteen = DatabaseService.getSetting('fifteen_difficulty', MEDIUM) as Difficulty;
    const savedBoard2048Default = DatabaseService.getSetting('game2048_default', 'STANDARD') as SizeBoard;
    const savedSound = DatabaseService.getSetting('sound_enabled', 'true');
    const savedMusic = DatabaseService.getSetting('music_enabled', 'true');
    const savedRules = DatabaseService.getSetting('rules_enabled', 'true');

    setDifficulty(savedDiff);
    setFifteenDiff(savedFifteen);
    setBoard2048(savedBoard2048Default);
    setSoundEnabled(savedSound === 'true');
    setMusicEnabled(savedMusic === 'true');
    setRulesEnabled(savedRules === 'true');
  }, []);

  const changeDifficulty = (level: Difficulty) => {
    setDifficulty(level);
    DatabaseService.setSetting('sudoku_difficulty', level);
  };

  const changeFifteenDiff = (level: Difficulty) => {
    setFifteenDiff(level);
    DatabaseService.setSetting('fifteen_difficulty', level);
  };

  const changeSizeBoard = (size: SizeBoard) => {
    setBoard2048(size);
    DatabaseService.setSetting('game2048_default', size);
  };

  const toggleSound = (value: boolean) => {
    setSoundEnabled(value);
    DatabaseService.setSetting('sound_enabled', value.toString());
  };

  const toggleRules = (value: boolean) => {
    setRulesEnabled(value);
    DatabaseService.setSetting('rules_enabled', value.toString());
  };

  const toggleMusic = (value: boolean) => {
    setMusicEnabled(value);
    DatabaseService.setSetting('music_enabled', value.toString());
    if (value) {
      start();
    } else {
      stop();
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.settingItem}>
        <View>
          <Text style={styles.label}>Музыка</Text>
          <Text style={styles.description}>Музыка в меню и играх</Text>
        </View>
        <Switch
          trackColor={{ false: '#333', true: '#00FF88' }}
          thumbColor={musicEnabled ? '#fff' : '#f4f3f4'}
          onValueChange={toggleMusic}
          value={musicEnabled}
        />
      </View>

      <View style={styles.settingItem}>
        <View>
          <Text style={styles.label}>ЗВУКОВЫЕ ЭФФЕКТЫ</Text>
          <Text style={styles.description}>Эффекты кликов и побед</Text>
        </View>
        <Switch
          trackColor={{ false: '#333', true: '#00FF88' }}
          thumbColor={soundEnabled ? '#fff' : '#f4f3f4'}
          onValueChange={toggleSound}
          value={soundEnabled}
        />
      </View>

      <View style={styles.settingItem}>
        <View>
          <Text style={styles.label}>ПОДСКАЗКИ ПРАВИЛ</Text>
          <Text style={styles.description}>{'Видимость кнопок, подсказывающих\nправила в играх'}</Text>
        </View>
        <Switch
          trackColor={{ false: '#333', true: '#00FF88' }}
          thumbColor={rulesEnabled ? '#fff' : '#f4f3f4'}
          onValueChange={toggleRules}
          value={rulesEnabled}
        />
      </View>

      {/* НОВЫЙ БЛОК: ПОЛЕ 2048 */}
      <View style={[styles.difficultySection]}>
        <Text style={styles.label}>РАЗМЕР ПОЛЯ 2048</Text>
        <View style={styles.tabContainer}>
          {(['STANDARD', 'INCREASED'] as SizeBoard[]).map((size) => (
            <TouchableOpacity
              key={size}
              style={[styles.tab, board2048 === size && { backgroundColor: '#00FF88' }]}
              onPress={() => changeSizeBoard(size)}
            >
              <Text style={[styles.tabText, board2048 === size && { color: '#000' }]}>{size}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* НОВЫЙ БЛОК: СЛОЖНОСТЬ ПЯТНАШЕК */}
      <View style={[styles.difficultySection, { marginTop: 25 }]}>
        <Text style={styles.label}>СЛОЖНОСТЬ ПЯТНАШЕК</Text>
        <View style={styles.tabContainer}>
          {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map((level) => (
            <TouchableOpacity
              key={level}
              style={[styles.tab, fifteenDiff === level && { backgroundColor: '#00FF88' }]}
              onPress={() => changeFifteenDiff(level)}
            >
              <Text style={[styles.tabText, fifteenDiff === level && { color: '#000' }]}>{level}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={[styles.difficultySection, { marginTop: 25 }]}>
        <Text style={styles.label}>СЛОЖНОСТЬ СУДОКУ</Text>
        <View style={styles.tabContainer}>
          {([EASY, MEDIUM, HARD] as Difficulty[]).map((level) => (
            <TouchableOpacity
              key={level}
              style={[styles.tab, difficulty === level && { backgroundColor: '#00FF88' }]}
              onPress={() => changeDifficulty(level)}
            >
              <Text style={[styles.tabText, difficulty === level && { color: '#000' }]}>{level}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={styles.footerHint}>НАСТРОЙКИ СОХРАНЯЮТСЯ В БД</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#1a1a1a' },
  settingItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#252525', padding: 20, borderRadius: 22, borderWidth: 3,
    borderBottomWidth: 8, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 25,
  },
  difficultySection: {
    backgroundColor: '#252525', padding: 20, borderRadius: 22, borderWidth: 3,
    borderBottomWidth: 8, borderColor: 'rgba(255,255,255,0.05)',
  },
  label: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  description: { color: '#888', fontSize: 12, marginTop: 4, fontWeight: '600' },
  tabContainer: { flexDirection: 'row', marginTop: 15, backgroundColor: '#111', borderRadius: 15, padding: 5 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  tabText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  footerHint: { textAlign: 'center', marginTop: 30, color: '#444', fontWeight: 'bold', letterSpacing: 2 }
});
