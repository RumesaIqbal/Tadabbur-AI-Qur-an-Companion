import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface DailyVerseCardProps {
  verse: {
    arabic: string;
    translation: string;
    reference: string;
    tafsir?: string; // optional tafsir text
  };
  onReadTafsir?: () => void; // optional external handler (e.g., open modal)
}

export default function DailyVerseCard({ verse, onReadTafsir }: DailyVerseCardProps) {
  const [showTafsir, setShowTafsir] = useState(false);

  const toggleTafsir = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowTafsir(!showTafsir);
  };

  const handleTafsirPress = () => {
    if (onReadTafsir) {
      // If external handler exists (e.g., open modal), use it
      onReadTafsir();
    } else {
      // Otherwise toggle inline
      toggleTafsir();
    }
  };

  return (
    <LinearGradient
      colors={['rgba(212, 175, 55, 0.12)', 'rgba(212, 175, 55, 0.04)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      {/* Decorative top border with gold accent */}
      <View style={styles.topBorder} />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="sparkles" size={18} color="#D4AF37" />
          <Text style={styles.label}>Daily Inspiration</Text>
        </View>
        <Ionicons name="moon" size={22} color="#D4AF37" opacity={0.6} />
      </View>

      {/* Reference */}
      <Text style={styles.reference}>{verse.reference}</Text>

      {/* Arabic text */}
      <Text style={styles.arabic}>{verse.arabic}</Text>

      {/* Translation */}
      <Text style={styles.translation}>{verse.translation}</Text>

      {/* Tafsir Toggle / Button */}
      {verse.tafsir && !onReadTafsir ? (
        // Inline tafsir toggle (no external handler)
        <>
          <TouchableOpacity style={styles.tafsirToggle} onPress={toggleTafsir} activeOpacity={0.7}>
            <Text style={styles.tafsirToggleText}>
              {showTafsir ? 'Hide Tafsir' : 'Read Tafsir'}
            </Text>
            <Ionicons
              name={showTafsir ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#D4AF37"
            />
          </TouchableOpacity>
          {showTafsir && (
            <View style={styles.tafsirContainer}>
              <Text style={styles.tafsirText}>{verse.tafsir}</Text>
            </View>
          )}
        </>
      ) : (
        // External button (e.g., opens modal)
        <TouchableOpacity style={styles.tafsirButton} onPress={handleTafsirPress} activeOpacity={0.7}>
          <Text style={styles.tafsirButtonText}>Read Tafsir</Text>
          <Ionicons name="arrow-forward" size={16} color="#D4AF37" />
        </TouchableOpacity>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
  },
  topBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#D4AF37',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: '#D4AF37',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: spacing.xs,
  },
  reference: {
    fontSize: typography.fontSize.sm,
    color: '#B8D4D0',
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  arabic: {
    fontSize: typography.fontSize.xl + 4,
    textAlign: 'right',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'serif',
    lineHeight: 38,
    marginBottom: spacing.xs,
  },
  translation: {
    fontSize: typography.fontSize.md,
    color: '#E0E0E0',
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  tafsirToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(212, 175, 55, 0.15)',
    marginTop: spacing.xs,
  },
  tafsirToggleText: {
    fontSize: typography.fontSize.sm,
    color: '#D4AF37',
    fontWeight: '500',
    marginRight: 4,
  },
  tafsirContainer: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(212, 175, 55, 0.15)',
  },
  tafsirText: {
    fontSize: typography.fontSize.md,
    color: '#C0C0C0',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  tafsirButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(212, 175, 55, 0.15)',
    marginTop: spacing.xs,
  },
  tafsirButtonText: {
    fontSize: typography.fontSize.sm,
    color: '#D4AF37',
    fontWeight: '500',
    marginRight: spacing.xs,
  },
});