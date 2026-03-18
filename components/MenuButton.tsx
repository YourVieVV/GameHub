import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../constants/Colors';

interface MenuButtonProps {
  title: string;
  onPress: () => void;
  style?: ViewStyle;
  variant?: 'primary' | 'outline';
}

export const MenuButton: React.FC<MenuButtonProps> = ({ title, onPress, style, variant = 'primary' }) => {
  const isPrimary = variant === 'primary';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isPrimary ? styles.primary : styles.outline,
        style
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.text, { color: isPrimary ? '#000' : Colors.text }]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 60,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  primary: {
    backgroundColor: Colors.primary,
  },
  outline: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  text: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
