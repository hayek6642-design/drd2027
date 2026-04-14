import React from 'react';
import { TouchableOpacity, View, StyleSheet, Animated } from 'react-native';

export default function MicButton({ isListening, onPress, status }) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  
  React.useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scaleAnim.setValue(1);
    }
  }, [isListening]);

  const getButtonColor = () => {
    if (status === 'processing') return '#f59e0b';
    if (isListening) return '#ef4444';
    return '#00d4ff';
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Animated.View 
        style={[
          styles.button,
          { 
            backgroundColor: getButtonColor(),
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <View style={styles.innerCircle}>
          <View style={styles.micIcon}>
            <View style={styles.micHead} />
            <View style={styles.micBody} />
            <View style={styles.micStand} />
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  innerCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micIcon: {
    alignItems: 'center',
  },
  micHead: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    marginBottom: 2,
  },
  micBody: {
    width: 12,
    height: 18,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  micStand: {
    width: 16,
    height: 3,
    backgroundColor: '#fff',
    marginTop: 2,
    borderRadius: 2,
  },
});
