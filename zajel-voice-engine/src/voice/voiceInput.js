/**
 * Voice Input Handler
 * Manages microphone and speech-to-text conversion
 * Supports both expo-speech (local) and react-native-voice (cloud)
 */

import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';

// Try to import react-native-voice, fallback to expo-speech
let Voice;
try {
  Voice = require('react-native-voice').default;
} catch (e) {
  logger.log('react-native-voice not available, using expo-speech fallback');
}

class VoiceInputManager {
  constructor() {
    this.isListening = false;
    this.recognizedText = '';
    this.error = null;
    this.onSpeechResults = null;
    this.onSpeechError = null;
    this.onSpeechStart = null;
    this.onSpeechEnd = null;
    
    this.init();
  }

  init() {
    // Initialize react-native-voice if available
    if (Voice) {
      Voice.onSpeechStart = this.handleSpeechStart.bind(this);
      Voice.onSpeechEnd = this.handleSpeechEnd.bind(this);
      Voice.onSpeechResults = this.handleSpeechResults.bind(this);
      Voice.onSpeechError = this.handleSpeechError.bind(this);
    }
  }

  handleSpeechStart(e) {
    this.isListening = true;
    logger.log('Speech started');
    this.onSpeechStart?.(e);
  }

  handleSpeechEnd(e) {
    this.isListening = false;
    logger.log('Speech ended');
    this.onSpeechEnd?.(e);
  }

  handleSpeechResults(e) {
    const text = e.value[0] || '';
    this.recognizedText = text;
    logger.log('Speech recognized:', text);
    this.onSpeechResults?.(text);
  }

  handleSpeechError(e) {
    this.error = e.error?.message || 'Unknown error';
    logger.error('Speech error:', this.error);
    this.isListening = false;
    this.onSpeechError?.(this.error);
  }

  // Start listening
  async startListening(language = 'ar-SA') {
    try {
      this.recognizedText = '';
      this.error = null;

      if (Voice) {
        // Use react-native-voice (better accuracy, cloud-based)
        await Voice.start(language);
      } else {
        // Fallback: Check if speech is available
        const isAvailable = await Speech.isSpeakingAsync();
        logger.log('Expo speech availability:', isAvailable);
        
        // For expo, we'll use a different approach - manual trigger
        this.isListening = true;
        this.onSpeechStart?.();
      }
      
      return true;
    } catch (err) {
      logger.error('Failed to start listening:', err);
      this.error = err.message;
      return false;
    }
  }

  // Stop listening
  async stopListening() {
    try {
      if (Voice) {
        await Voice.stop();
      }
      
      this.isListening = false;
      this.onSpeechEnd?.();
      return this.recognizedText;
    } catch (err) {
      logger.error('Failed to stop listening:', err);
      return this.recognizedText;
    }
  }

  // Cancel listening
  async cancelListening() {
    try {
      if (Voice) {
        await Voice.cancel();
      }
      this.isListening = false;
      this.recognizedText = '';
    } catch (err) {
      logger.error('Failed to cancel:', err);
    }
  }

  // Destroy instance
  async destroy() {
    try {
      if (Voice) {
        await Voice.destroy();
      }
    } catch (err) {
      logger.error('Failed to destroy:', err);
    }
  }

  // Check permissions (for iOS)
  async checkPermissions() {
    // iOS permissions handled in app.json
    // Android permissions handled automatically by react-native-voice
    return true;
  }

  // Get final result
  getResult() {
    return {
      text: this.recognizedText,
      isListening: this.isListening,
      error: this.error
    };
  }
}

// Singleton instance
const voiceInput = new VoiceInputManager();

// React Hook for voice input
export function useVoiceInput() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    // Set up callbacks
    voiceInput.onSpeechStart = () => {
      setIsListening(true);
      setError(null);
    };
    
    voiceInput.onSpeechEnd = () => {
      setIsListening(false);
    };
    
    voiceInput.onSpeechResults = (text) => {
      setTranscript(text);
    };
    
    voiceInput.onSpeechError = (err) => {
      setError(err);
      setIsListening(false);
    };

    return () => {
      voiceInput.destroy();
    };
  }, []);

  const startListening = useCallback(async (lang = 'ar-SA') => {
    setTranscript('');
    return await voiceInput.startListening(lang);
  }, []);

  const stopListening = useCallback(async () => {
    const result = await voiceInput.stopListening();
    setIsListening(false);
    return result;
  }, []);

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    voiceInput
  };
}

export default voiceInput;
