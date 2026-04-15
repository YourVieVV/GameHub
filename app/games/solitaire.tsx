import React, { useState, useEffect, useCallback, useRef } from 'react';
import {StyleSheet, View, Text, Dimensions, Pressable, TouchableOpacity} from 'react-native';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  runOnJS, cancelAnimation, useAnimatedRef, measure
} from 'react-native-reanimated';
import { useAudioPlayer } from 'expo-audio';
import {useSounds} from "../../components/useSounds";
import {DatabaseService} from "../../services/database";
import {NamesForDB} from "../../constants/NamesForDB";
import {CircleHelp} from "lucide-react-native";
import TooltipRulesGames from "../../components/TooltipRulesGames";

const { width, height } = Dimensions.get('window');
const CARD_W = width * 0.13;
const CARD_H = CARD_W * 1.4;
const SPACING = 4;

const soundSource = require('../../assets/sounds/rolling.mp3');
const soundTouch = require('../../assets/sounds/touchCart.mp3');
const soundDestroy = require('../../assets/sounds/destroyCart.mp3');
const soundWin = require('../../assets/sounds/win.mp3');

const Particle = ({ x, y, color }: { x: number, y: number, color: string }) => {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const op = useSharedValue(1);
  const scale = useSharedValue(1);

  useEffect(() => {
    const angle = Math.random() * Math.PI * 2;
    const dist = 30 + Math.random() * 50;
    tx.value = withTiming(Math.cos(angle) * dist, { duration: 800 });
    ty.value = withTiming(Math.sin(angle) * dist, { duration: 800 });
    op.value = withTiming(0, { duration: 800 });
    scale.value = withTiming(0, { duration: 800 });

    // ИЗМЕНЕНО: добавлена очистка анимаций при размонтировании компонента
    return () => {
      cancelAnimation(tx);
      cancelAnimation(ty);
      cancelAnimation(op);
      cancelAnimation(scale);
    };
  }, []);

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: x,
    top: y,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: color,
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
    opacity: op.value,
    zIndex: 2000,
  }));

  return <Animated.View style={style} />;
};

const Card = ({ card, isAvailable, isSelected, onMatch, index, playSound }: any) => {
  const scale = useSharedValue(1);
  const flyAnim = useSharedValue(0);
  const shake = useSharedValue(0);
  const prevFrozen = useRef(card.isFrozen);
  const cardRef = useAnimatedRef<Animated.View>();

  useEffect(() => {
    if (prevFrozen.current && !card.isFrozen) {
      shake.value = withSequence(
        withTiming(-5, { duration: 50 }),
        withTiming(5, { duration: 50 }),
        withTiming(-5, { duration: 50 }),
        withTiming(5, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
      scale.value = withSequence(withTiming(1.1, { duration: 100 }), withSpring(1));
      flyAnim.value = 1;
    } else {
      flyAnim.value = 0;
      flyAnim.value = withDelay(index * 25, withTiming(1, { duration: 600 }));
    }
    prevFrozen.current = card.isFrozen;
  }, [card.id, card.isFrozen]);

  const tap = Gesture.Tap().onEnd(() => {
    if (isAvailable && !card.isFrozen) {
      const layout = measure(cardRef);
      scale.value = withSequence(withTiming(1.2, { duration: 100 }), withTiming(1, { duration: 100 }));
      runOnJS(playSound)();
      runOnJS(onMatch)(card, layout.pageX, layout.pageY);
    }
  });

  const animatedStyle = useAnimatedStyle(() => ({
    width: CARD_W,
    height: CARD_H,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: isSelected ? 'gold' : (card.isFrozen ? '#00FFFF' : '#000'),
    backgroundColor: card.isFrozen ? '#E0FFFF' : (isAvailable ? '#FFF' : '#CCC'),
    justifyContent: 'center',
    alignItems: 'center',
    transform: [
      { scale: scale.value * flyAnim.value },
      { translateY: (1 - flyAnim.value) * -500 },
      { translateX: shake.value }
    ],
    opacity: flyAnim.value,
    zIndex: isSelected ? 100 : 1,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  }));

  return (
    <GestureDetector gesture={tap}>
      <Animated.View style={animatedStyle} ref={cardRef}>
        <Text style={[styles.rank, { color: card.isFrozen ? '#4682B4' : ((card.suit === '♥' || card.suit === '♦') ? '#FF4757' : '#000') }]}>
          {card.rank}
        </Text>
        <Text style={[styles.suit, { color: card.isFrozen ? '#4682B4' : 'black' }]}>{card.suit}</Text>
        {card.isFrozen && <View style={styles.iceOverlay} />}
      </Animated.View>
    </GestureDetector>
  );
};

export default function PyramidGame() {
  const [deck, setDeck] = useState<any[]>([]);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [particles, setParticles] = useState<{ id: number, x: number, y: number, color: string }[]>([]);
  const [currScore, setCurrScore] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showRules, setShowRules] = useState(true);

  // Состояния выигрыша
  const [isWon, setIsWon] = useState(false);
  const winAnim = useSharedValue(0);
  const scoreAnim = useSharedValue(0);

  const playFlipSound = useSounds(soundSource);
  const cartDestroyFlipSound = useSounds(soundDestroy);
  const cartTouchFlipSound = useSounds(soundTouch);
  const cartWinSound = useSounds(soundWin);

  const initGame = () => {
    setCurrScore(DatabaseService.getScore(NamesForDB.solitaire));
    setIsWon(false);
    winAnim.value = 0;
    scoreAnim.value = 0;
    const suits = ['♠', '♥', '♣', '♦'];
    const ranks = [{ n: 'A', v: 1 }, { n: '2', v: 2 }, { n: '3', v: 3 }, { n: '4', v: 4 }, { n: '5', v: 5 }, { n: '6', v: 6 }, { n: '7', v: 7 }, { n: '8', v: 8 }, { n: '9', v: 9 }, { n: '10', v: 10 }, { n: 'J', v: 11 }, { n: 'Q', v: 12 }, { n: 'K', v: 13 }];
    let newDeck: any[] = [];
    suits.forEach(s => ranks.forEach(r => newDeck.push({ id: Math.random().toString(), suit: s, rank: r.n, val: r.v, isStock: false, isFrozen: false })));
    newDeck = newDeck.sort(() => Math.random() - 0.5);

    let idx = 0;
    for (let r = 0; r < 7; r++) {
      let rowIceIndices: number[] = [];
      for (let c = 0; c <= r; c++) {
        newDeck[idx].row = r;
        newDeck[idx].col = c;
        // Шанс появления ледяной карты
        let coefficient;
        if (currScore > 100 && currScore <= 500) coefficient = 0.09;
        if (currScore > 500 && currScore <= 900) coefficient = 0.08;
        if (currScore > 900) coefficient = 0.07;

        if (r > 0 && (coefficient && (Math.random() < coefficient))) {
          newDeck[idx].isFrozen = true;
          rowIceIndices.push(idx);
        }
        idx++;
      }
      if (rowIceIndices.length === 1) {
        newDeck[rowIceIndices].isFrozen = false;
      }
    }
    for (let i = idx; i < newDeck.length; i++) {
      newDeck[i].isStock = true; newDeck[i].row = -1;
    }
    setDeck(newDeck);
    setRemovedIds(new Set());
    setSelectedId(null);

    playFlipSound();
  };

  const triggerWin = () => {
    DatabaseService.saveScore(NamesForDB.solitaire, currScore + 100);
    setIsWon(true);

    winAnim.value = withSequence(
      withTiming(0, { duration: 0 }, () => {
        runOnJS(cartWinSound)();
      }),
      withDelay(200, withSpring(1, {})),
      withDelay(1500, withTiming(0))
    );

    // 2. Вторая анимация (Счет)
    scoreAnim.value = withSequence(
      withDelay(2000,
        // Звук запустится ТОЛЬКО после задержки 2000мс
        withTiming(0, { duration: 0 }, () => {
          runOnJS(cartWinSound)();
        })
      ),
      withDelay(0, withSpring(1, {})),
      withDelay(1500, withTiming(0, {}, (finished) => {
        // 3. Вместо setTimeout: запускаем сброс, когда всё закончилось
        if (finished) runOnJS(initGame)();
      }))
    );
  };

  const testWin = () => {
    setRemovedIds(new Set(deck.map(c => c.id)));
    triggerWin();
  };

  useEffect(() => {
    if (deck.length > 0 && removedIds.size === deck.length && !isWon) {
      triggerWin();
    }
  }, [removedIds, deck]);

  const unfreezeNeighbors = (row: number, col: number, currentDeck: any[]) => {
    return currentDeck.map(card => {
      if (card.isFrozen && card.row === row && (card.col === col - 1 || card.col === col + 1)) {
        return { ...card, isFrozen: false };
      }
      return card;
    });
  };

  const handleMatch = (card: any, x: number, y: number) => {
    const cardColor = (card.suit === '♥' || card.suit === '♦') ? '#525252' : '#FF4757';
    const processMatch = (ids: string[], r?: number, c?: number, r2?: number, c2?: number) => {
      setRemovedIds(prev => new Set([...prev, ...ids]));
      setDeck(curr => {
        let u = unfreezeNeighbors(r ?? -1, c ?? -1, curr);
        if (r2 !== undefined) u = unfreezeNeighbors(r2, c2 ?? -1, u);
        return u;
      });
      cartDestroyFlipSound();
    };

    if (card.val === 13) {
      createExplosion(x, y, cardColor);
      processMatch([card.id], card.row, card.col);
      setSelectedId(null);
      return;
    }
    if (!selectedId) {
      setSelectedId(card.id);
      setLastPos({ x, y });
    } else {
      const other = deck.find(d => d.id === selectedId);
      if (other && other.id !== card.id && other.val + card.val === 13) {
        createExplosion(x, y, 'gold'); createExplosion(lastPos.x, lastPos.y, 'gold');
        processMatch([card.id, other.id], card.row, card.col, other.row, other.col);
        setSelectedId(null);
      } else {
        setSelectedId(card.id); setLastPos({ x, y });
      }
    }
  };

  const shuffleGame = () => {
    const removed = deck.filter(c => removedIds.has(c.id));
    const frozen = deck.filter(c => !removedIds.has(c.id) && c.isFrozen);
    const movable = deck.filter(c => !removedIds.has(c.id) && !c.isFrozen);

    const movablePositions = movable.map(c => ({ row: c.row, col: c.col, isStock: c.isStock }));
    const shuffledData = [...movable].sort(() => Math.random() - 0.5);

    const newMovableCards = shuffledData.map((data, i) => ({
      ...data,
      id: Math.random().toString(),
      row: movablePositions[i].row,
      col: movablePositions[i].col,
      isStock: movablePositions[i].isStock
    }));

    const finalDeck = [...removed, ...frozen, ...newMovableCards].sort((a, b) => {
      if (a.isStock !== b.isStock) return a.isStock ? 1 : -1;
      return a.row - b.row;
    });

    setDeck(finalDeck);
    setSelectedId(null);
    playFlipSound();
  };

  useEffect(() => {
    initGame();
    const isShowRules = DatabaseService.getSetting('rules_enabled', 'true');
    setShowRules(isShowRules === 'true');
  }, []);

  const createExplosion = (x: number, y: number, color: string) => {
    const newP = Array.from({ length: 20 }).map(() => ({ id: Math.random(), x: x + 20, y: y - 60, color }));
    setParticles(prev => [...prev, ...newP]);
    setTimeout(() => setParticles(prev => prev.filter(p => !newP.includes(p))), 1000);
  };

  const checkAvailable = (card: any) => {
    if (removedIds.has(card.id)) return false;
    if (card.isStock) return true;
    const r = card.row, c = card.col;
    return !deck.some(d => !removedIds.has(d.id) && d.row === r + 1 && (d.col === c || d.col === c + 1));
  };

  // Стили анимации текста
  const winTextStyle = useAnimatedStyle(() => ({
    opacity: winAnim.value,
    transform: [{ scale: winAnim.value }],
  }));

  const scoreTextStyle = useAnimatedStyle(() => ({
    opacity: scoreAnim.value,
    transform: [{ scale: scoreAnim.value }],
  }));

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>ПИРАМИДА 13</Text>
        <View style={{ flexDirection: 'row' }}>
          {/*<Pressable onPress={testWin} style={[styles.btn, { marginRight: 10, backgroundColor: '#FF4757' }]}><Text style={styles.btnText}>TEST WIN</Text></Pressable>*/}
          <Pressable onPress={shuffleGame} style={[styles.btn, { marginRight: 10, backgroundColor: '#FF9F43' }]}><Text style={styles.btnText}>ПЕРЕТАСОВАТЬ</Text></Pressable>
          <Pressable onPress={initGame} style={styles.btn}><Text style={styles.btnText}>НОВАЯ РАЗДАЧА</Text></Pressable>
        </View>
      </View>

      <View style={styles.board}>
        {deck.filter(c => !c.isStock && !removedIds.has(c.id)).map((card, i) => {
          const l = (width / 2 - CARD_W / 2) + (card.col * (CARD_W + SPACING)) - (card.row * (CARD_W + SPACING) / 2);
          const t = card.row * (CARD_H * 0.6);
          const absY = t + 120;
          return (
            <View key={card.id} style={{ position: 'absolute', left: l, top: t }}>
              <Card card={card} isAvailable={checkAvailable(card)} isSelected={selectedId === card.id} onMatch={handleMatch} index={i} playSound={cartTouchFlipSound} />
            </View>
          );
        })}
      </View>

      <View style={styles.stock}>
        {deck.filter(c => c.isStock && !removedIds.has(c.id)).slice(0, 4).map((c, i) => {
          const l = (width / 2 - (2 * CARD_W)) + (i * (CARD_W / 2 + 10));
          const t = height - 170;
          return (
            <View key={c.id} style={{ marginLeft: i ? 10 : 0 }}>
              <Card card={c} isAvailable={true} isSelected={selectedId === c.id} onMatch={handleMatch} index={28 + i} playSound={cartTouchFlipSound} />
            </View>
          );
        })}
      </View>

      {showRules && <View style={{alignItems: 'center', marginTop: 40}}>
        <TooltipRulesGames
          showTooltip={showTooltip}
          setShowTooltip={setShowTooltip}
          text={'Выбирайте пары карт, сумма которых равна 13.\n- Король убирается по нажатию\n- Дама(12) + Туз(1)\n- Валет(11) + Двойка(2)\n' +
          'Можно выбирать только открытые карты, которые не перекрыты другими.'}
        />
        <TouchableOpacity
          style={styles.newGameBtn}
          onPress={() => {
            if (showTooltip) return setShowTooltip(false);
            setShowTooltip(true);
          }}
        >
          <CircleHelp color="#fff" size={28} strokeWidth={2.5}/>
        </TouchableOpacity>
      </View>}

      {/* Оверлей выигрыша */}
      {isWon && (
        <View style={styles.winOverlay} pointerEvents="none">
          <Animated.Text style={[styles.winText, winTextStyle]}>YOU WIN!</Animated.Text>
          <Animated.Text style={[styles.scorePopup, scoreTextStyle]}>+100 POINTS</Animated.Text>
        </View>
      )}

      {particles.map(p => <Particle key={p.id} x={p.x} y={p.y} color={p.color} />)}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  header: { marginTop: 20, paddingHorizontal: 20, flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', gap:10 },
  title: { color: '#FFF', fontSize: 28, fontWeight: '900', letterSpacing: 2 },
  btn: { backgroundColor: '#2E97FF', padding: 10, borderRadius: 8, borderWidth: 2, borderColor: '#000' },
  btnText: { fontWeight: '900' },
  board: { marginTop: 40, height:400 },
  stock: { height: 70, flexDirection: 'row', justifyContent: 'center',alignItems:'center' },
  rank: { fontSize: 16, fontWeight: '900' },
  suit: { fontSize: 14 },
  iceOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(135, 206, 250, 0.3)', borderRadius: 6, borderWidth: 1, borderColor: '#FFF' },
  winOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 3000 },
  winText: {
    fontSize: 60,
    fontWeight: '900',
    color: '#FFD700',
    textShadowColor: '#FFA500',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    marginBottom: 20
  },
  scorePopup: {
    fontSize: 40,
    fontWeight: '900',
    color: '#32CD32',
    textShadowColor: '#00FF00',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  newGameBtn: { width:60,backgroundColor: '#333', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderBottomWidth: 5, borderColor: '#000' },
});
