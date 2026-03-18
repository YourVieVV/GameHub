import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
  withRepeat,
  interpolate,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

const TYPES = { FRUIT: 'fruit', TRASH: 'trash' };
const ITEMS = [
  { char: '🍎', type: TYPES.FRUIT },
  { char: '🍌', type: TYPES.FRUIT },
  { char: '🍇', type: TYPES.FRUIT },
  { char: '🍓', type: TYPES.FRUIT },
  { char: '🔋', type: TYPES.TRASH },
  { char: '👟', type: TYPES.TRASH },
  { char: '🥫', type: TYPES.TRASH },
  { char: '📦', type: TYPES.TRASH },
];

const SPAWN_INTERVAL = 1500;
const INITIAL_SPEED = 4000;

// --- Компонент частицы (Салют) ---
const ParticleItem = ({ color, startX, startY, isSteam }) => {
  const anim = useSharedValue(0);
  const targetX = (Math.random() - 0.5) * (isSteam ? 120 : 350);
  const targetY = (Math.random() - 0.7) * (isSteam ? 150 : 400);
  const rotation = (Math.random() - 0.5) * 720;

  useEffect(() => {
    // Единая плавная анимация без прерываний
    anim.value = withTiming(1, {
      duration: isSteam ? 800 : 1000,
      easing: Easing.out(Easing.quad)
    });
  }, []);

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: startX,
    top: startY,
    width: isSteam ? 35 : 8,
    height: isSteam ? 35 : 8,
    borderRadius: isSteam ? 17 : 4,
    backgroundColor: color,
    opacity: 1 - anim.value,
    transform: [
      { translateX: anim.value * targetX },
      { translateY: anim.value * targetY },
      { scale: isSteam ? 0.5 + anim.value : 1.5 * (1 - anim.value) },
      { rotate: `${anim.value * rotation}deg` }
    ],
  }));

  return <Animated.View style={style} />;
};

const ConveyorLines = () => {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  return (
    <View style={styles.conveyorLine}>
      {[...Array(15)].map((_, i) => {
        const animatedStyle = useAnimatedStyle(() => ({
          transform: [{ translateY: progress.value * 60 }]
        }));
        return <Animated.View key={i} style={[styles.beltStripe, animatedStyle]} />;
      })}
    </View>
  );
};

export default function App() {
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [gameActive, setGameActive] = useState(false);
  const [objects, setObjects] = useState([]);
  const [particles, setParticles] = useState([]);

  const speedRef = useRef(INITIAL_SPEED);

  const spawnParticles = (x, y, isSteam) => {
    const id = Math.random();
    setParticles(prev => [...prev, { id, x, y, isSteam }]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== id));
    }, 1500);
  };

  const startGame = () => {
    setScore(0);
    setLives(3);
    setObjects([]);
    setParticles([]);
    setGameOver(false);
    setGameActive(true);
    speedRef.current = INITIAL_SPEED;
  };

  useEffect(() => {
    if (!gameActive || gameOver) return;
    const interval = setInterval(() => {
      spawnObject();
      if (speedRef.current > 1500) speedRef.current -= 50;
    }, SPAWN_INTERVAL);
    return () => clearInterval(interval);
  }, [gameActive, gameOver]);

  const spawnObject = () => {
    const id = Math.random().toString();
    const item = ITEMS[Math.floor(Math.random() * ITEMS.length)];
    setObjects((prev) => [...prev, { ...item, id }]);
  };

  const handleFail = useCallback((id, x, y) => {
    spawnParticles(x, y, true);
    setObjects(prev => prev.filter(o => o.id !== id));
    setLives((prev) => {
      const newLives = prev - 1;
      if (newLives <= 0) {
        setGameOver(true);
        setGameActive(false);
      }
      return newLives;
    });
  }, []);

  const handleScore = useCallback((id, x, y) => {
    spawnParticles(x, y, false);
    setScore((s) => s + 1);
    setObjects(prev => prev.filter(o => o.id !== id));
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <ConveyorLines />

        <View style={styles.header}>
          <Text style={styles.scoreText}>Счет: {score}</Text>
          <Text style={styles.livesText}>{'❤️'.repeat(lives)}</Text>
        </View>

        <View style={styles.zones}>
          <View style={[styles.zone, styles.trashZone]}>
            <Text style={styles.zoneIcon}>🗑️</Text>
            <Text style={styles.zoneText}>МУСОР</Text>
          </View>
          <View style={[styles.zone, styles.fruitZone]}>
            <Text style={styles.zoneIcon}>🧺</Text>
            <Text style={styles.zoneText}>ФРУКТЫ</Text>
          </View>
        </View>

        {objects.map((obj) => (
          <DraggableItem
            key={obj.id}
            item={obj}
            speed={speedRef.current}
            onScore={handleScore}
            onFail={handleFail}
          />
        ))}

        {particles.map(p => (
          <View key={p.id} pointerEvents="none" style={StyleSheet.absoluteFill}>
            {[...Array(p.isSteam ? 8 : 25)].map((_, i) => (
              <ParticleItem
                key={i}
                isSteam={p.isSteam}
                color={p.isSteam ? 'rgba(200,200,200,0.4)' : ['#FFD700', '#FF4500', '#00FF7F', '#1E90FF', '#FF00FF', '#FFFFFF'][i % 6]}
                startX={p.x}
                startY={p.y}
              />
            ))}
          </View>
        ))}

        {!gameActive && (
          <Modal transparent visible>
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>{gameOver ? 'ИГРА ОКОНЧЕНА' : 'SORT IT OUT'}</Text>
                {gameOver && <Text style={styles.finalScore}>Ваш счет: {score}</Text>}
                <TouchableOpacity style={styles.button} onPress={startGame}>
                  <Text style={styles.buttonText}>{gameOver ? 'ЕЩЕ РАЗ' : 'ИГРАТЬ'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </GestureHandlerRootView>
  );
}

function DraggableItem({ item, speed, onScore, onFail }) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(-100);
  const isFinished = useSharedValue(false);

  useEffect(() => {
    // Меняем конечную точку с height + 100 на height - 100
    translateY.value = withTiming(height - 100, { duration: speed, easing: Easing.linear }, (finished) => {
      if (finished && !isFinished.value) {
        isFinished.value = true;
        // Передаем текущие координаты для взрыва пара
        runOnJS(onFail)(item.id, translateX.value + width / 2 - 35, height - 100);
      }
    });
  }, []);

  const checkSort = (targetType) => {
    if (isFinished.value) return;
    const currentX = translateX.value + width / 2 - 35;

    if (item.type === targetType) {
      isFinished.value = true;
      const remainingDist = (height - 180) - translateY.value;
      const finishTime = (remainingDist / (height + 200)) * speed;

      setTimeout(() => {
        runOnJS(onScore)(item.id, currentX, height - 180);
      }, Math.max(0, finishTime));

    } else {
      isFinished.value = true;
      runOnJS(onFail)(item.id, currentX, translateY.value);
    }
  };

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      if (!isFinished.value) translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (isFinished.value) return;
      if (event.translationX > 80) runOnJS(checkSort)(TYPES.FRUIT);
      else if (event.translationX < -80) runOnJS(checkSort)(TYPES.TRASH);
      else translateX.value = withSpring(0);
    });

  const animatedStyle = useAnimatedStyle(() => {
    // Эффект уменьшения до 0.5 только перед корзиной (от 60% высоты экрана)
    const currentScale = interpolate(
      translateY.value,
      [-100, height * 0.6, height - 180],
      [1, 1, 0.5],
      'clamp'
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${translateX.value * 0.1}deg` },
        { scale: currentScale }
      ]
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.item, animatedStyle]}>
        <Text style={styles.itemText}>{item.char}</Text>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2c3e50' },
  header: { marginTop: 50, alignItems: 'center', zIndex: 20 },
  scoreText: { fontSize: 32, color: '#ecf0f1', fontWeight: 'bold' },
  livesText: { fontSize: 24, marginTop: 5 },
  conveyorLine: { position: 'absolute', left: width / 2 - 40, width: 80, height: '100%', backgroundColor: '#34495e', borderLeftWidth: 4, borderRightWidth: 4, borderColor: '#23303d' },
  beltStripe: { width: '100%', height: 4, backgroundColor: 'rgba(0,0,0,0.2)', marginBottom: 56 },
  zones: { position: 'absolute', bottom: 20, width: '100%', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, zIndex: 5 },
  zone: { width: 100, height: 120, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  trashZone: { borderColor: '#e74c3c', backgroundColor: 'rgba(231, 76, 60, 0.2)' },
  fruitZone: { borderColor: '#2ecc71', backgroundColor: 'rgba(46, 204, 113, 0.2)' },
  zoneIcon: { fontSize: 40 },
  zoneText: { color: '#fff', fontSize: 12, fontWeight: 'bold', marginTop: 5 },
  item: { position: 'absolute', left: width / 2 - 35, width: 70, height: 70, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', borderRadius: 35, elevation: 5, zIndex: 15 },
  itemText: { fontSize: 40 },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  modalContent: { backgroundColor: '#fff', padding: 40, borderRadius: 20, alignItems: 'center', width: '80%' },
  modalTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  finalScore: { fontSize: 18, marginBottom: 20 },
  button: { backgroundColor: '#3498db', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 10 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});