import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ChatBubble({ message }) {
  const isUser = message.role === 'user';
  const isInstruction = message.type === 'instruction_confirmation';
  
  return (
    <View style={[
      styles.container,
      isUser ? styles.userContainer : styles.assistantContainer
    ]}>
      <View style={[
        styles.bubble,
        isUser ? styles.userBubble : 
          isInstruction ? styles.instructionBubble : styles.assistantBubble
      ]}>
        <Text style={[
          styles.text,
          isUser ? styles.userText : styles.assistantText
        ]}>
          {message.content}
        </Text>
        
        {isInstruction && (
          <View style={styles.instructionBadge}>
            <Text style={styles.instructionBadgeText}>✓ تعليم</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.timestamp}>
        {new Date(message.id).toLocaleTimeString('ar-SA', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    maxWidth: '85%',
  },
  userContainer: {
    alignSelf: 'flex-end',
  },
  assistantContainer: {
    alignSelf: 'flex-start',
  },
  bubble: {
    padding: 14,
    borderRadius: 20,
    minWidth: 60,
  },
  userBubble: {
    backgroundColor: '#00d4ff',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#334155',
    borderBottomLeftRadius: 4,
  },
  instructionBubble: {
    backgroundColor: '#10b981',
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#0f172a',
  },
  assistantText: {
    color: '#f1f5f9',
  },
  instructionBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  instructionBadgeText: {
    color: '#d1fae5',
    fontSize: 12,
    fontWeight: 'bold',
  },
  timestamp: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
    marginHorizontal: 4,
  },
});
