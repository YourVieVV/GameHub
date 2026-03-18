import React, {FC} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from "react-native";
import {X} from "lucide-react-native";

const TooltipRulesGames: FC<{
  showTooltip:boolean,
  setShowTooltip:(value:boolean) => void,
  text: string | React.ReactNode
}> = ({showTooltip, setShowTooltip, text}) => {
  return (
    showTooltip && (
      <View
        style={styles.tooltip}
      >
        <View style={styles.tooltipArrow} />
        <View style={styles.tooltipHeader}>
          <Text style={styles.tooltipTitle}>КАК ИГРАТЬ?</Text>
          <TouchableOpacity onPress={() => setShowTooltip(false)}>
            <X color="#666" size={20} />
          </TouchableOpacity>
        </View>
        <Text style={styles.tooltipText}>
          {text}
        </Text>
      </View>
    )
  );
};

const styles = StyleSheet.create({
  tooltip: {
    position: 'absolute',
    bottom: 60, // Высота над кнопкой
    right: 60, // Смещение вбок
    width: 240,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    // Тень
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
    zIndex:2
  },
  tooltipArrow: {
    position: 'absolute',
    bottom: -8,
    right: 120,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#fff',
  },
  tooltipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tooltipTitle: {
    color: '#000',
    fontSize: 14,
    fontWeight: '900',
  },
  tooltipText: {
    color: '#444',
    fontSize: 13,
    lineHeight: 18,
  },
  bold: {
    fontWeight: 'bold',
    color: '#000',
  },
});

export default TooltipRulesGames;