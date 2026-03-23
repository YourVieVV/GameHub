import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { DatabaseService } from '../services/database';
import { Colors } from '../constants/Colors';
import {
  Trophy,
  Gamepad2,
  LayoutGrid,
  Mountain,
  RotateCcw, Zap, Combine, Droplet, Spade, Focus
} from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { NamesForDB } from "../constants/NamesForDB";
import {TextHist } from "../constants/Text";

export default function HistoryScreen() {
  const [history, setHistory] = useState({
    snake: 0,
    rockClimber: 0,
    game2048: 0,
    colorFlood: 0,
    fifteen: 0,
    solitaire: 0,
    sudoku: 0,
  });

  const Games = {
    [NamesForDB.snake]: {
      name: 'Змейка',
      textScore: TextHist.score,
      icon: Zap
    },
    [NamesForDB.rockClimber]: {
      name: 'Островной мост',
      textScore: TextHist.score,
      icon: Mountain
    },
    [NamesForDB.game2048]: {
      name: '2048: Дзен',
      textScore: TextHist.score,
      icon: Combine
    },
    [NamesForDB.colorFlood]: {
      name: 'Цветовая заливка',
      textScore: TextHist.lvl,
      icon: Droplet
    },
    [NamesForDB.fifteen]: {
      name: 'Пятнашки',
      textScore: TextHist.res,
      icon: LayoutGrid
    },
    [NamesForDB.solitaire]: {
      name: 'Пасьянс «13»',
      textScore: TextHist.res,
      icon: Spade
    },
    [NamesForDB.sudoku]: {
      name: 'Судоку',
      textScore: TextHist.res,
      icon: Focus
    },
  }

  const loadData = () => {
    setHistory({
      snake: DatabaseService.getHighScore(NamesForDB.snake),
      rockClimber: DatabaseService.getHighScore(NamesForDB.rockClimber),
      game2048: DatabaseService.getHighScore(NamesForDB.game2048),
      colorFlood: DatabaseService.getHighScore(NamesForDB.colorFlood),
      fifteen: DatabaseService.getMinScore(NamesForDB.fifteen),
      solitaire: DatabaseService.getHighScore(NamesForDB.solitaire),
      sudoku: DatabaseService.getHighScore(NamesForDB.sudoku),
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetScore = (gameId: string) => {
    const gameLabel = Games[gameId]?.name || gameId;
    Alert.alert(
      "СБРОС",
      `Обнулить рекорд игры ${gameLabel.toUpperCase()}?`,
      [
        { text: "ОТМЕНА", style: "cancel" },
        {
          text: "ДА",
          style: "destructive",
          onPress: () => {
            DatabaseService.resetScore(gameId);
            loadData();
          }
        }
      ]
    );
  };

  const historyData = Object.entries(history).map(([key, value]) => ({
    id: key,
    score: value,
  }));

  const renderItem = ({ item, index }: { item: { id: string; score: number }; index: number }) => {
    const IconComponent = Games[item.id]?.icon || Gamepad2;
    const gameName = Games[item.id]?.name || item.id;
    const gameText = Games[item.id]?.textScore || '';

    return (
      <Animated.View entering={FadeInUp.delay(index * 50)}>
        <View style={styles.card}>
          <View style={styles.iconBox}>
            <IconComponent color={Colors.primary} size={24} />
          </View>

          <View style={styles.info}>
            <Text style={styles.gameTitle}>{gameName.toUpperCase()}</Text>
            <Text style={styles.recordLabel}>{gameText}</Text>
          </View>

          <View style={styles.rightActions}>
            <View style={styles.scoreBox}>
              <Trophy size={14} color="#FFD700" />
              <Text style={styles.scoreText}>{item.score}</Text>
            </View>

            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => resetScore(item.id)}
              activeOpacity={0.7}
            >
              <RotateCcw size={18} color="#FF4444" />
            </TouchableOpacity>
          </View>

          <View style={styles.cardGlint} />
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={historyData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>ИСТОРИЯ ПОКА ПУСТА 🕹️</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  list: { padding: 20 },
  card: {
    backgroundColor: '#252525',
    borderRadius: 18,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderBottomWidth: 6,
    borderColor: '#333',
    position: 'relative',
    overflow: 'hidden',
  },
  iconBox: { width: 45, height: 45, backgroundColor: '#111', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1, marginLeft: 15 },
  gameTitle: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  recordLabel: { color: '#666', fontSize: 9, fontWeight: 'bold', marginTop: 2, letterSpacing: 1 },
  rightActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scoreBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 65,
    justifyContent: 'center',
    gap: 4
  },
  scoreText: { color: '#FFD700', fontSize: 16, fontWeight: '900' },
  resetBtn: {
    width: 40,
    height: 40,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333'
  },
  cardGlint: { position: 'absolute', top: 0, left: 0, right: 0, height: '40%', backgroundColor: 'rgba(255,255,255,0.02)' },
  empty: { color: '#444', textAlign: 'center', marginTop: 100, fontSize: 16, fontWeight: 'bold' }
});
