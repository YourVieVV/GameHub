import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from "react-native-reanimated";
import React, {useEffect} from "react";
import {Dimensions, StyleSheet} from "react-native";

const { width, height } = Dimensions.get('window');

export const BackgroundParticle = () => {
  const tx = useSharedValue(Math.random() * width);
  const ty = useSharedValue(Math.random() * height);
  const opacity = useSharedValue(Math.random() * 0.3 + 0.2);

  useEffect(() => {
    tx.value = withRepeat(
      withSequence(
        withTiming(Math.random() * width, { duration: 10000 + Math.random() * 5000 }),
        withTiming(Math.random() * width, { duration: 10000 + Math.random() * 5000 })
      ),
      -1,
      true
    );
    ty.value = withRepeat(
      withSequence(
        withTiming(Math.random() * height, { duration: 8000 + Math.random() * 4000 }),
        withTiming(Math.random() * height, { duration: 8000 + Math.random() * 4000 })
      ),
      -1,
      true
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.particle, style]} />;
};

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    backgroundColor: '#2E97FF',
    borderRadius: 2,
  },
});
