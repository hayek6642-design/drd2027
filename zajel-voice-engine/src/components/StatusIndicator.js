import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

export default function StatusIndicator({ status }) {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  
  React.useEffect(() => {
    if (status === 'listening') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.5,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status]);

  const getStatusConfig = () => {
    switch (status) {
      case 'listening':
        return { 
          text: 'جاري الاستماع...', 
          color: '#ef4444',
          showPulse: true 
        };
      case 'processing':
        return { 
          text: 'جاري المعالجة...', 
          color: '#f59e0b',
          showPulse: false 
        };
      case 'speaking':
        return { 
          text: 'يتحدث...', 
          color: '#10b981',
          showPulse: false 
        };
      default:
        return { 
          text: 'جاهز', 
          color: '#00d4ff',
          showPulse: false 
        };
    }
  };

  const config = getStatusConfig();

  return (
    <View style={styles.container}>
      {config.showPulse && (
        <Animated.View 
          style={[
            styles.pulse,
            { 
              backgroundColor: config.color,
              transform: [{ scale: pulseAnim }],
              opacity: pulseAnim.interpolate({
                inputRange: [1, 1.5],
                outputRange: [0.5, 0]
              })
            }
          ]} 
        />
      )}
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text style={[styles.text, { color: config.color }]}>
        {config.text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pulse: {
    position: 'absolute',
    left: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
});
