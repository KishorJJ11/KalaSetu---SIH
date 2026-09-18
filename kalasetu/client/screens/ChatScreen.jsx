import React, { useState, useRef, useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  FlatList,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
// import { Audio } from 'expo-av';
const Audio = {
  requestPermissionsAsync: async () => ({ status: 'denied' }),
  setAudioModeAsync: async () => {},
  Recording: {
    createAsync: async () => { throw new Error("Audio is temporarily disabled"); }
  }
};

import ScreenHeader from '../components/ScreenHeader';
import { COLORS, FONT, RADIUS, SHADOW, SPACING } from '../theme/theme';
import { askAssistant } from '../utils/api';

export default function ChatScreen({ navigation }) {
  const [messages, setMessages] = useState([
    { id: '1', role: 'assistant', text: 'नमस्ते! I am your KalaSetu Assistant. How can I help you with your craft business today? (Tap the microphone to speak)' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const recordingRef = useRef(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    return () => {
      // Cleanup if user leaves while recording
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync();
      }
    };
  }, []);

  const handleSendText = async () => {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText('');
    
    appendMessage('user', text);
    await sendMessageToAI(text, null);
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant microphone access to use voice chat.');
        return;
      }
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (err) {
      console.error('[KalaSetu] Failed to start recording', err);
      Alert.alert('Error', 'Could not start recording');
    }
  };

  const stopRecordingAndSend = async () => {
    if (!recordingRef.current) return;
    
    try {
      setIsRecording(false);
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      
      if (uri) {
        appendMessage('user', '🎤 Voice Note');
        await sendMessageToAI(null, uri);
      }
    } catch (err) {
      console.error('[KalaSetu] Failed to stop recording', err);
    }
  };

  const appendMessage = (role, text) => {
    const newMessage = { id: Date.now().toString(), role, text };
    setMessages((prev) => [...prev, newMessage]);
    
    // Auto-scroll
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const sendMessageToAI = async (text, audioUri) => {
    setIsLoading(true);
    try {
      const response = await askAssistant(text, audioUri);
      if (response && response.text) {
        appendMessage('assistant', response.text);
      }
    } catch (err) {
      console.error('[KalaSetu] LLM Error:', err.message);
      appendMessage('assistant', 'Sorry, I am having trouble connecting to the network right now. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
        {!isUser && (
          <View style={styles.aiAvatar}>
            <Ionicons name="sparkles" size={14} color={COLORS.textOnPrimary} />
          </View>
        )}
        <View style={[styles.messageContent, isUser ? styles.userContent : styles.aiContent]}>
          <Text style={[styles.messageText, isUser ? styles.userText : styles.aiText]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScreenHeader 
        title="KalaSetu Assistant" 
        subtitle="AI Helper for Artisans" 
        onBack={() => navigation.goBack()} 
      />

      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.chatList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {isLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.loadingText}>Assistant is thinking...</Text>
          </View>
        )}

        <View style={styles.inputArea}>
          <TextInput
            style={styles.textInput}
            placeholder="Type your question..."
            placeholderTextColor={COLORS.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={300}
          />

          {inputText.length > 0 ? (
            <TouchableOpacity onPress={handleSendText} style={styles.sendButton}>
              <Ionicons name="send" size={20} color={COLORS.textOnPrimary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              onPressIn={startRecording} 
              onPressOut={stopRecordingAndSend}
              activeOpacity={0.8}
              style={[styles.micButton, isRecording && styles.micButtonRecording]}
            >
              <Ionicons name="mic" size={24} color={COLORS.textOnPrimary} />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1 },
  chatList: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
    maxWidth: '85%',
  },
  userBubble: {
    alignSelf: 'flex-end',
  },
  aiBubble: {
    alignSelf: 'flex-start',
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
    marginTop: 4,
  },
  messageContent: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    ...SHADOW.sm,
  },
  userContent: {
    backgroundColor: COLORS.primary,
    borderTopRightRadius: 4,
  },
  aiContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  messageText: {
    fontSize: FONT.size.sm,
    lineHeight: 20,
  },
  userText: {
    color: COLORS.textOnPrimary,
  },
  aiText: {
    color: COLORS.textPrimary,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  loadingText: {
    marginLeft: SPACING.sm,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  textInput: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    backgroundColor: COLORS.backgroundWarm,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.lg,
    paddingTop: 14,
    paddingBottom: 14,
    fontSize: FONT.size.sm,
    color: COLORS.textPrimary,
    marginRight: SPACING.sm,
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.button,
  },
  micButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.raised,
  },
  micButtonRecording: {
    backgroundColor: COLORS.error,
    transform: [{ scale: 1.15 }],
  },
});
