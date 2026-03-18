import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing, useDerivedValue
} from 'react-native-reanimated';
import {Dimensions, StyleSheet, View} from "react-native";

const { width } = Dimensions.get('window');
const GRID_SIZE = 15;
const CELL_SIZE = Math.floor((width - 40) / GRID_SIZE);

export const SnakeSegment = ({ part, isHead, speed }: { part: Point; isHead: boolean; speed: number }) => {
  const tx = useSharedValue(part.x * CELL_SIZE);
  const ty = useSharedValue(part.y * CELL_SIZE);

  useDerivedValue(() => {
    const nextX = part.x * CELL_SIZE;
    const nextY = part.y * CELL_SIZE;

    const dx = Math.abs(nextX - tx.value);
    const dy = Math.abs(nextY - ty.value);

    if (dx > CELL_SIZE * 1.5 || dy > CELL_SIZE * 1.5) {
      tx.value = nextX;
      ty.value = nextY;
    } else {
      tx.value = withTiming(nextX, { duration: speed, easing: Easing.linear });
      ty.value = withTiming(nextY, { duration: speed, easing: Easing.linear });
    }
  }, [part.x, part.y, speed]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.snakePart,
        isHead ? styles.snakeHead : styles.snakeBody,
        animatedStyle,
        { zIndex: isHead ? 10 : 1 },
      ]}
    >
      {isHead && (
        <View style={styles.eyesRow}>
          <View style={styles.eye} />
          <View style={styles.eye} />
        </View>
      )}
      {!isHead && <View style={styles.bodyGlint} />}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
snakePart: { position: 'absolute', width: CELL_SIZE, height: CELL_SIZE, borderRadius: CELL_SIZE / 2.5, borderWidth: 2, borderColor: 'rgba(0,0,0,0.2)' },
  snakeHead: { backgroundColor: '#00FF88', justifyContent: 'center', alignItems: 'center' },
  snakeBody: { backgroundColor: '#00CC77' },
  bodyGlint: { width: '30%', height: '30%', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 10, position: 'absolute', top: 4, left: 4 },
  eyesRow: { flexDirection: 'row', gap: 6 },
  eye: { width: 6, height: 6, backgroundColor: '#000', borderRadius: 3 },
});