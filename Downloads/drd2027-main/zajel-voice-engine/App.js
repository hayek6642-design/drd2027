import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import VoiceScreen from './src/components/VoiceScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <VoiceScreen />
    </SafeAreaProvider>
  );
}
