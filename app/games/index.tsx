import React from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Dimensions } from 'react-native';
import {Link, useFocusEffect} from 'expo-router';
import {Zap,ChevronRight, Focus, Combine, LayoutGrid, Mountain, Smile, Droplet, FlaskConical, Spade} from 'lucide-react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { Game } from '../../types/game';
import {useAudioContext} from "../../components/useAudioContext";
import {DatabaseService} from "../../services/database";

const { width } = Dimensions.get('window');

const GAMES: Game[] = [
  { id: '1', title: 'Змейка', description: 'Snake', icon: Zap, route: '/games/snake', color: '#00FF88' },
  { id: '2', title: 'Островной мост', description: 'Rock Climber', icon: Mountain, route: '/games/rockClimber', color: '#82b2ff' },
  { id: '3', title: '2048: Дзен', description: '2048', icon: Combine, route: '/games/game2048', color: '#FDE047' },
  { id: '4', title: 'Цветовая заливка', description: 'Color Flood', icon: Droplet, route: '/games/colorFlood', color: '#F472B6' },
  { id: '5', title: 'Пятнашки', description: 'Slide Puzzle', icon: LayoutGrid, route: '/games/fifteen', color: '#2E97FF' },
  { id: '6', title: 'Антистресс', description: 'PopIt', icon: Smile, route: '/games/popIt', color: '#F87171' },
  { id: '7', title: 'Пасьянс «13»', description: 'Royal Cards', icon: Spade, route: '/games/solitaire', color: '#FB923C' },
  { id: '8', title: 'Судоку', description: 'Sudoku', icon: Focus, route: '/games/sudoku', color: '#8d8fff' },
];

export default function GamesList() {
  const { start, stop } = useAudioContext();

  useFocusEffect(() => {
    const savedMusic = DatabaseService.getSetting('music_enabled', 'true');
    savedMusic === 'true' && start();
  });

  const renderItem = ({ item, index }: { item: Game; index: number }) => (
    <Animated.View entering={FadeInRight.delay(index * 100).duration(500)}>
      <Link href={item.route as any} asChild>
        <TouchableOpacity
          style={[styles.card, { borderColor: item.color }]}
          activeOpacity={0.85}
        >
          {/* Декоративный блик на карточке */}
          <View style={styles.cardGlint} />

          <View style={styles.contentRow}>
            {/* Иконка слева */}
            <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
              <item.icon color="#000" size={24} strokeWidth={3} />
              <View style={styles.iconGlint} />
            </View>

            {/* Текстовый блок: Описание сверху, Название снизу */}
            <View style={styles.textContainer}>
              <Text style={[styles.cardDescription, { color: item.color }]}>
                {item.description.toUpperCase()}
              </Text>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.title.toUpperCase()}
              </Text>
            </View>

            {/* Стрелка перехода */}
            <ChevronRight color={item.color} size={22} strokeWidth={4} />
          </View>
        </TouchableOpacity>
      </Link>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={GAMES}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  listContent: {
    padding: 20,
    gap:24
  },
  card: {},
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    // zIndex: 2,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.15)',
  },
  iconGlint: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 10,
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 5,
  },
  textContainer: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  cardDescription: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: -2, // Сближаем с основным названием
  },
  cardTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 1,
  },
  cardGlint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    // zIndex: 1,
  },
});
