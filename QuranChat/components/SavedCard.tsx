import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography } from '../theme';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface SavedCardProps {
  arabic: string;
  translation: string;
  reference: string;
  context?: string;
  expanded: boolean;
  onToggleExpand: () => void;
  onDelete: () => void;
  isLoading?: boolean;
}

export default function SavedCard({
  arabic,
  translation,
  reference,
  context,
  expanded,
  onToggleExpand,
  onDelete,
  isLoading = false,
}: SavedCardProps) {
  useEffect(() => {
    // Animate layout changes when expanded toggles
    LayoutAnimation.configureNext({
      duration: 300,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });
  }, [expanded]);

  const formatReference = (ref: string) => {
    const match = ref.match(/(?:Surah\s+)?([A-Za-zÀ-ÿ\s]+?)?\s*(\d+):(\d+)/);
    if (match) {
      const surahName = match[1]?.trim() || '';
      const surahNum = match[2];
      const verseNum = match[3];
      if (surahName) {
        return `${surahName} ${surahNum}:${verseNum}`;
      }
      return `Surah ${surahNum}:${verseNum}`;
    }
    return ref;
  };

  const displayRef = formatReference(reference);

  return (
    <LinearGradient
      colors={['#2a2a22', '#1f2a2a']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.header}>
        <View style={styles.referenceContainer}>
          <Text style={styles.referenceText}>{displayRef}</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={onToggleExpand}
            style={styles.iconButton}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={24}
              color={colors.goldAccent}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onDelete}
            style={styles.iconButton}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={22} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.arabic}>{arabic}</Text>

      {/* This content is conditionally rendered; LayoutAnimation handles its appearance */}
      {expanded && (
        <View style={styles.expandedContent}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading details...</Text>
            </View>
          ) : (
            <>
              {translation ? (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Translation</Text>
                  <Text style={styles.translation}>{translation}</Text>
                </View>
              ) : null}

              {context ? (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Reason of Revelation</Text>
                  <Text style={styles.context}>{context}</Text>
                </View>
              ) : (
                <Text style={styles.noContext}>No context available.</Text>
              )}
            </>
          )}
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.35)',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 8,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  referenceContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  referenceText: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.goldAccent,
    letterSpacing: 0.5,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 4,
    marginLeft: spacing.xs,
  },
  arabic: {
    fontSize: typography.fontSize.xl + 2,
    textAlign: 'right',
    color: '#FFFFFF',
    marginBottom: spacing.xs,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'serif',
    lineHeight: 34,
  },
  expandedContent: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(212, 175, 55, 0.15)',
  },
  section: {
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.goldAccent,
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  translation: {
    fontSize: typography.fontSize.md,
    color: '#E0E0E0',
    lineHeight: 24,
  },
  context: {
    fontSize: typography.fontSize.md,
    color: '#C0C0C0',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  noContext: {
    fontSize: typography.fontSize.md,
    color: '#888888',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: spacing.xs,
  },
  loadingContainer: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  loadingText: {
    color: '#B8D4D0',
    fontSize: typography.fontSize.md,
  },
});