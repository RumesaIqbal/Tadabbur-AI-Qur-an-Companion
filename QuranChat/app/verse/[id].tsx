import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing, typography } from '../../theme';
import Animated, { FadeInUp } from 'react-native-reanimated';

// Placeholder data – in real app this would come from API/params
const verseData = {
  arabic: 'إِنَّ اللَّهَ مَعَ الصَّابِرِينَ',
  translation: 'Indeed, Allah is with the patient.',
  reference: 'Surah Al-Baqarah (2:153)',
  tafsir:
    'This verse reassures believers that Allah’s support and guidance are with those who remain patient in the face of trials.',
};

export default function VerseDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Verse Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View entering={FadeInUp.duration(600)}>
          <Text style={styles.arabic}>{verseData.arabic}</Text>
          <Text style={styles.translation}>{verseData.translation}</Text>
          <Text style={styles.reference}>{verseData.reference}</Text>

          <View style={styles.divider} />

          <Text style={styles.tafsirTitle}>Tafsir</Text>
          <Text style={styles.tafsirText}>{verseData.tafsir}</Text>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionButton}>
              <IconButton icon="bookmark-outline" size={28} color={colors.primaryGreen} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <IconButton icon="share-variant" size={28} color={colors.primaryGreen} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <IconButton icon="content-copy" size={28} color={colors.primaryGreen} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primaryText,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  arabic: {
    fontSize: 32,
    textAlign: 'center',
    color: colors.primaryText,
    marginBottom: spacing.md,
    fontFamily: 'System',
  },
  translation: {
    fontSize: typography.fontSize.lg,
    textAlign: 'center',
    color: colors.primaryText,
    marginBottom: spacing.sm,
  },
  reference: {
    fontSize: typography.fontSize.md,
    textAlign: 'center',
    color: colors.secondaryText,
    marginBottom: spacing.xl,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  tafsirTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primaryText,
    marginBottom: spacing.sm,
  },
  tafsirText: {
    fontSize: typography.fontSize.md,
    color: colors.primaryText,
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.md,
  },
  actionButton: {
    backgroundColor: colors.card,
    borderRadius: 30,
    padding: spacing.sm,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
});