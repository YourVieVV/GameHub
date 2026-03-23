import React, { useEffect } from 'react';
import * as NavigationBar from 'expo-navigation-bar';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import {Link} from 'expo-router';
import { Play, Settings, Gamepad2, History, Trophy } from 'lucide-react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing
} from 'react-native-reanimated';
import {BackgroundParticle} from "../components/Particles/BgParticleMainMenu";
import {useAudioContext} from "../components/useAudioContext";
import {DatabaseService} from "../services/database";

export default function MainMenu() {
  const rotation = useSharedValue(0);
  const { start } = useAudioContext();

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 3000,
        easing: Easing.linear,
      }),
      -1,
      false
    );

      // Скрывает панель и переводит в режим "погружения" (пропадает и статус-бар)
      NavigationBar.setVisibilityAsync("hidden");

      // Устанавливает поведение: панель появится при свайпе и сама скроется
      // NavigationBar.setBehaviorAsync("sticky-immersive");

    const savedMusic = DatabaseService.getSetting('music_enabled', 'true');
    savedMusic === 'true' && start();
  }, []);

  const animatedGearStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View style={styles.container}>
      {/* Слой с плавающими частицами */}
      <View style={StyleSheet.absoluteFill}>
        {[...Array(24)].map((_, i) => (
          <BackgroundParticle key={i} />
        ))}
      </View>

      <View style={styles.glow} />

      <Animated.View
        entering={FadeInUp.delay(200).duration(800)}
        style={styles.header}
      >
        <View style={styles.logoContainer}>
          <Gamepad2 color="#2E97FF" size={64} strokeWidth={2.5} />
          <View style={styles.logoGlint} />
        </View>
        <Text style={styles.title}>СБОРНИК ИГР</Text>

        <View style={styles.badge}>
          <View style={styles.badgeContent}>
            <Text style={styles.subtitle}>PREMIUM ARCADE</Text>
            <Animated.View style={[styles.gearWrapper, animatedGearStyle]}>
              <Settings color="#000" size={16} strokeWidth={3} />
            </Animated.View>
          </View>
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(400).duration(800)}
        style={styles.menuContainer}
      >
        <Link href="/games" asChild>
          <TouchableOpacity style={styles.mainButton} activeOpacity={0.9}>
            <View style={styles.iconCircle}>
              <Play color="#000" fill="#000" size={26} />
              <View style={styles.innerGlint} />
            </View>
            <Text style={styles.buttonText}>ВЫБОР ИГРЫ</Text>
            <View style={styles.buttonTopGlint} />
          </TouchableOpacity>
        </Link>

        <View style={styles.row}>
          <Link href="/history" asChild>
            <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.8}>
              <Trophy color="#fff" size={24} strokeWidth={2.5} />
            </TouchableOpacity>
          </Link>

          <Link href="/settings" asChild>
            <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.8}>
              <Settings color="#fff" size={24} strokeWidth={2.5} />
            </TouchableOpacity>
          </Link>
        </View>
      </Animated.View>

      <View style={styles.footer}>
        <Text style={versionStyles.versionText}>v 1.0.0 • GAME HUB EDITION</Text>
      </View>
    </View>
  );
}

const versionStyles = {
  versionText: { color: '#444', fontSize: 12, fontWeight: 'bold', letterSpacing: 2 },
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    backgroundColor: '#2E97FF',
    borderRadius: 2,
  },
  glow: { position: 'absolute', top: '20%', width: 300, height: 300, backgroundColor: '#2E97FF', borderRadius: 150, opacity: 0.04 },
  header: { alignItems: 'center', marginBottom: 50 },
  logoContainer: { width: 100, height: 100, backgroundColor: '#252525', borderRadius: 30, justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#2E97FF', borderBottomWidth: 10, marginBottom: 20 },
  logoGlint: { position: 'absolute', top: 8, left: 8, width: 20, height: 20, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10 },
  title: { fontSize: 42, fontWeight: '900', color: '#fff', letterSpacing: 2 },
  badge: {
    backgroundColor: '#2E97FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 5,
    transform: ([{ rotate: '-2deg' }] as any),
  },
  badgeContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gearWrapper: { marginLeft: 4 },
  subtitle: { fontSize: 12, color: '#000', fontWeight: '900', letterSpacing: 2 },
  menuContainer: { width: '100%', paddingHorizontal: 40, gap: 16 },
  mainButton: { backgroundColor: '#2E97FF', height: 80, borderRadius: 22, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, borderWidth: 4, borderColor: '#1A5A99', borderBottomWidth: 10, position: 'relative', overflow: 'hidden' },
  buttonTopGlint: { position: 'absolute', top: 0, left: 0, right: 0, height: '40%', backgroundColor: 'rgba(255,255,255,0.2)' },
  iconCircle: { width: 48, height: 48, backgroundColor: '#fff', borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 15, borderWidth: 2, borderColor: '#1A5A99' },
  innerGlint: { position: 'absolute', top: 4, left: 4, width: 10, height: 10, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 5 },
  buttonText: { color: '#000', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  row: { flexDirection: 'row', gap: 16 },
  secondaryButton: { flex: 1, height: 65, borderRadius: 22, borderWidth: 4, borderColor: '#333', borderBottomWidth: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#252525' },
  footer: { position: 'absolute', bottom: 30 },
});
