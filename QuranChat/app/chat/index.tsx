import { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text, IconButton, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { colors, spacing, typography } from '../../theme';
import { ChatBubble, VerseCard } from '../../components';
import Animated, { FadeInUp } from 'react-native-reanimated';

const mockMessages = [
  { id: '1', type: 'assistant', text: 'Assalamu Alaikum! How can I help you with the Qur\'an today?' },
  { id: '2', type: 'user', text: 'What does the Qur\'an say about patience?' },
  {
    id: '3',
    type: 'assistant',
    text: 'Patience is mentioned many times. Here is a beautiful verse:',
    verse: {
      arabic: 'وَاسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ',
      translation: 'And seek help through patience and prayer.',
      reference: 'Surah Al-Baqarah (2:45)',
    },
  },
];

const suggestions = [
  'What is the meaning of Tawheed?',
  'Explain Surah Al-Fatiha',
  'Virtues of Surah Al-Kahf',
  'Duas in the Qur\'an',
];

export default function ChatScreen() {
  const [messages, setMessages] = useState(mockMessages);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();

  const sendMessage = () => {
    if (!inputText.trim()) return;
    const newMessage = { id: Date.now().toString(), type: 'user', text: inputText };
    setMessages((prev) => [...prev, newMessage]);
    setInputText('');
    setIsTyping(true);

    // Simulate assistant response (placeholder)
    setTimeout(() => {
      const response = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        text: 'This is a simulated response. Backend integration will connect to AI.',
      };
      setMessages((prev) => [...prev, response]);
      setIsTyping(false);
    }, 1500);
  };

  const renderItem = ({ item }: any) => {
    if (item.verse) {
      return (
        <View style={styles.verseContainer}>
          <VerseCard
            arabic={item.verse.arabic}
            translation={item.verse.translation}
            reference={item.verse.reference}
            onPress={() => {}}
          />
        </View>
      );
    }
    return <ChatBubble message={item.text} isUser={item.type === 'user'} />;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Chat</Text>
        <IconButton icon="trash-can-outline" onPress={() => setMessages([])} />
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.chatContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        onLayout={() => flatListRef.current?.scrollToEnd()}
      />

      {isTyping && (
        <View style={styles.typingIndicator}>
          <ActivityIndicator animating color={colors.primaryGreen} />
          <Text style={styles.typingText}>Assistant is typing...</Text>
        </View>
      )}

      {/* Suggestions */}
      <View style={styles.suggestionsContainer}>
        {suggestions.map((s, index) => (
          <TouchableOpacity
            key={index}
            style={styles.suggestionChip}
            onPress={() => {
              setInputText(s);
              // Optionally auto-send? We'll just fill the input.
            }}
          >
            <Text style={styles.suggestionText}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Ask a question..."
          placeholderTextColor={colors.secondaryText}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxHeight={100}
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <IconButton icon="send" color={colors.white} size={24} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primaryText,
    textAlign: 'center',
  },
  chatContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingBottom: spacing.xl,
  },
  verseContainer: {
    marginVertical: spacing.sm,
    alignSelf: 'center',
    width: '100%',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  typingText: {
    marginLeft: spacing.sm,
    color: colors.secondaryText,
    fontSize: typography.fontSize.sm,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  suggestionChip: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionText: {
    fontSize: typography.fontSize.sm,
    color: colors.primaryGreen,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 100,
    fontSize: typography.fontSize.md,
    color: colors.primaryText,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 45,
  },
  sendButton: {
    backgroundColor: colors.primaryGreen,
    borderRadius: 30,
    marginLeft: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    width: 45,
    height: 45,
  },
});