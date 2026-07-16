import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../theme';

interface ChatBubbleProps {
  message: string;
  isUser: boolean;
}

export default function ChatBubble({ message, isUser }: ChatBubbleProps) {
  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        <Text style={[styles.text, isUser ? styles.userText : styles.assistantText]}>
          {message}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.xs,
    maxWidth: '85%',
  },
  userContainer: {
    alignSelf: 'flex-end',
  },
  assistantContainer: {
    alignSelf: 'flex-start',
  },
  bubble: {
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  userBubble: {
    backgroundColor: colors.primaryGreen,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: colors.card,
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: typography.fontSize.md,
  },
  userText: {
    color: colors.white,
  },
  assistantText: {
    color: colors.primaryText,
  },
});