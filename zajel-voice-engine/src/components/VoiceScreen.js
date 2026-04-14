import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { useVoiceInput } from '../voice/voiceInput';
import { useInstructionClassifier } from '../engine/instructionClassifier';
import { instructionParser } from '../engine/instructionParser';
import memoryManager from '../memory/memoryManager';
import zagelBridge from '../integration/zagelBridge';

import MicButton from './MicButton';
import ChatBubble from './ChatBubble';
import StatusIndicator from './StatusIndicator';

export default function VoiceScreen() {
  // State
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('ready'); // ready, listening, processing, speaking
  const [inputText, setInputText] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);

  // Hooks
  const { isListening, transcript, error, startListening, stopListening } = useVoiceInput();
  const { classify, extract } = useInstructionClassifier();

  // Initialize
  useEffect(() => {
    memoryManager.init();
  }, []);

  // Handle voice transcript changes
  useEffect(() => {
    if (transcript && !isListening) {
      handleInput(transcript);
    }
  }, [transcript, isListening]);

  // Handle mic button press
  const handleMicPress = useCallback(async () => {
    if (isListening) {
      setStatus('processing');
      const finalText = await stopListening();
      if (finalText) {
        await handleInput(finalText);
      }
    } else {
      setStatus('listening');
      await startListening('ar-SA');
    }
  }, [isListening, stopListening, startListening]);

  // Process input (voice or text)
  const handleInput = async (text) => {
    if (!text.trim()) return;
    
    setStatus('processing');
    
    // Add user message
    const userMsg = { id: Date.now(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    
    // Classify
    const classification = classify(text);
    
    if (classification.isInstruction) {
      // Handle instruction
      await handleInstruction(text, classification);
    } else {
      // Send to Zagel
      await handleZagelMessage(text);
    }
    
    setStatus('ready');
  };

  // Handle instruction
  const handleInstruction = async (text, classification) => {
    const details = extract(classification);
    const rule = instructionParser.parse(details, text);
    const confirmation = instructionParser.generateConfirmation(rule);
    
    // Save instruction
    await zagelBridge.confirmInstruction(rule, confirmation);
    
    // Show confirmation
    const confirmMsg = {
      id: Date.now() + 1,
      role: 'assistant',
      content: confirmation,
      type: 'instruction_confirmation',
      rule: rule
    };
    
    setMessages(prev => [...prev, confirmMsg]);
  };

  // Handle normal message
  const handleZagelMessage = async (text) => {
    const response = await zagelBridge.sendMessageToZagel(text);
    
    const assistantMsg = {
      id: Date.now() + 1,
      role: 'assistant',
      content: response.text,
      metadata: response.metadata
    };
    
    setMessages(prev => [...prev, assistantMsg]);
  };

  // Handle text input submit
  const handleTextSubmit = () => {
    if (inputText.trim()) {
      handleInput(inputText);
      setInputText('');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>زاجل</Text>
        <StatusIndicator status={status} />
      </View>
      
      {/* Chat Area */}
      <ScrollView 
        style={styles.chatContainer}
        contentContainerStyle={styles.chatContent}
      >
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
      </ScrollView>
      
      {/* Input Area */}
      <View style={styles.inputContainer}>
        {showTextInput ? (
          <View style={styles.textInputRow}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="اكتب رسالتك..."
              placeholderTextColor="#666"
              onSubmitEditing={handleTextSubmit}
              returnKeyType="send"
            />
            <TouchableOpacity onPress={handleTextSubmit} style={styles.sendButton}>
              <Text style={styles.sendButtonText}>→</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setShowTextInput(false)} 
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.controlsRow}>
            <TouchableOpacity 
              onPress={() => setShowTextInput(true)}
              style={styles.keyboardButton}
            >
              <Text style={styles.keyboardButtonText}>⌨️</Text>
            </TouchableOpacity>
            
            <MicButton 
              isListening={isListening}
              onPress={handleMicPress}
              status={status}
            />
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  chatContainer: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    paddingBottom: 100,
  },
  inputContainer: {
    padding: 16,
    paddingBottom: 30,
    backgroundColor: '#1e293b',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  textInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#334155',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00d4ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  keyboardButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardButtonText: {
    fontSize: 24,
  },
});
