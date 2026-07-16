import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  Image,
} from 'react-native';
import { Text, IconButton, Searchbar, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { SavedCard, EmptyState } from '../../components';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { supabase } from '../../services/supabase';
import { API_BASE_URL } from '../../constants/config';

interface SavedVerse {
  id: string;
  surah_number: number;
  verse_number: number;
  verse_text: string;
  created_at: string;
}

interface VerseDetails {
  translation: string;
  context: string;
}

const fetchWithTimeout = (url: string, options: RequestInit, timeoutMs = 10000) => {
  return Promise.race([
    fetch(url, options),
    new Promise<Response>((_, reject) =>
      setTimeout(() => reject(new Error('Network request timed out')), timeoutMs)
    ),
  ]);
};

const AnimatedSavedCard = React.memo(
  ({
    item,
    index,
    isGrid,
    isExpanded,
    isLoadingDetails,
    details,
    onToggleExpand,
    onDelete,
  }: {
    item: SavedVerse;
    index: number;
    isGrid: boolean;
    isExpanded: boolean;
    isLoadingDetails: boolean;
    details?: VerseDetails;
    onToggleExpand: (id: string) => void;
    onDelete: (id: string) => void;
  }) => {
    return (
      <Animated.View
        entering={FadeInUp.delay(index * 50)}
        style={[styles.cardWrapper, isGrid && styles.gridCard]}
      >
        <SavedCard
          arabic={item.verse_text}
          translation={details?.translation || ''}
          reference={`${item.surah_number}:${item.verse_number}`}
          context={details?.context || ''}
          expanded={isExpanded}
          onToggleExpand={() => onToggleExpand(item.id)}
          onDelete={() => onDelete(item.id)}
          isLoading={isLoadingDetails}
        />
      </Animated.View>
    );
  }
);

export default function SavedScreen() {
  const [isGrid, setIsGrid] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [savedVerses, setSavedVerses] = useState<SavedVerse[]>([]);
  const [filteredVerses, setFilteredVerses] = useState<SavedVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [verseDetails, setVerseDetails] = useState<Record<string, VerseDetails>>({});
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({});

  const fetchSavedVerses = useCallback(async () => {
    try {
      setError(null);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw new Error('Session error: ' + sessionError.message);
      if (!session) {
        setError('Please log in to see your saved verses.');
        setLoading(false);
        return;
      }

      const token = session.access_token;
      const url = `${API_BASE_URL}/api/saved?limit=100`;
      const response = await fetchWithTimeout(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status}`);
      }

      const result = await response.json();
      setSavedVerses(result.data || []);
      applySearch(result.data || [], searchQuery);
    } catch (err: any) {
      console.error('❌ Error in fetchSavedVerses:', err);
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery]);

  const applySearch = useCallback((data: SavedVerse[], query: string) => {
    if (!query.trim()) {
      setFilteredVerses(data);
      return;
    }
    const lowerQuery = query.toLowerCase();
    const filtered = data.filter((v) =>
      v.verse_text?.toLowerCase().includes(lowerQuery) ||
      `${v.surah_number}:${v.verse_number}`.includes(lowerQuery)
    );
    setFilteredVerses(filtered);
  }, []);

  useEffect(() => {
    fetchSavedVerses();
  }, []);

  useEffect(() => {
    applySearch(savedVerses, searchQuery);
  }, [searchQuery, savedVerses, applySearch]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSavedVerses();
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Remove Saved Verse',
      'Are you sure you want to remove this saved verse?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) throw new Error('Not authenticated');

              const response = await fetch(`${API_BASE_URL}/api/saved/${id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${session.access_token}`,
                },
              });

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete');
              }

              const updated = savedVerses.filter((v) => v.id !== id);
              setSavedVerses(updated);
              applySearch(updated, searchQuery);
              setVerseDetails((prev) => {
                const newDetails = { ...prev };
                delete newDetails[id];
                return newDetails;
              });
              if (expandedId === id) setExpandedId(null);
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ],
    );
  };

  const fetchVerseDetails = async (verse: SavedVerse) => {
    const { id, surah_number, verse_number } = verse;
    if (verseDetails[id]) return;

    setLoadingDetails((prev) => ({ ...prev, [id]: true }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE_URL}/api/verse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ surah_number, verse_number }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to fetch verse details');
      }

      const data = await response.json();
      setVerseDetails((prev) => ({
        ...prev,
        [id]: {
          translation: data.translation || '',
          context: data.context || '',
        },
      }));
    } catch (error: any) {
      console.error('Error fetching verse details:', error);
      Alert.alert('Error', error.message || 'Could not load verse details.');
    } finally {
      setLoadingDetails((prev) => ({ ...prev, [id]: false }));
    }
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      const verse = savedVerses.find((v) => v.id === id);
      if (verse && !verseDetails[id]) {
        fetchVerseDetails(verse);
      }
    }
  };

  const dismissKeyboard = () => Keyboard.dismiss();

  const handleSearchSubmit = () => {
    dismissKeyboard();
  };

  const clearSearch = () => {
    setSearchQuery('');
    dismissKeyboard();
  };

  const renderItem = useCallback(
    ({ item, index }: { item: SavedVerse; index: number }) => {
      const details = verseDetails[item.id];
      const isExpanded = expandedId === item.id;
      const isLoadingDetails = loadingDetails[item.id] || false;

      return (
        <AnimatedSavedCard
          item={item}
          index={index}
          isGrid={isGrid}
          isExpanded={isExpanded}
          isLoadingDetails={isLoadingDetails}
          details={details}
          onToggleExpand={toggleExpand}
          onDelete={handleDelete}
        />
      );
    },
    [isGrid, expandedId, verseDetails, loadingDetails, toggleExpand, handleDelete]
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.goldAccent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={{ color: '#E0E0E0', textAlign: 'center', marginBottom: spacing.md }}>
          {error}
        </Text>
        <TouchableOpacity onPress={fetchSavedVerses} style={styles.retryButton}>
          <Text style={{ color: colors.goldAccent, fontWeight: 'bold' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <LinearGradient
        colors={['#0a1a1a', '#0F2E2E', '#1a3a3a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.container}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerLogoCircle}>
              <Image
                source={require('../../assets/images/logo.png')}
                style={styles.headerLogoImage}
                resizeMode="cover"
              />
            </View>
            <Text style={styles.title}>Saved Verses</Text>
          </View>
          <View style={styles.headerActions}>
            <IconButton
              icon={isGrid ? 'view-list' : 'view-grid'}
              size={24}
              color={colors.goldAccent}
              onPress={() => setIsGrid(!isGrid)}
            />
          </View>
        </View>

        <View style={styles.searchRow}>
          <Searchbar
            placeholder="Search saved verses..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={[styles.searchBar, isSearchFocused && styles.searchBarFocused]}
            inputStyle={styles.searchInput}
            iconColor={colors.goldAccent}
            placeholderTextColor="#6B7280"
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            onSubmitEditing={handleSearchSubmit}
            theme={{
              colors: {
                text: '#FFFFFF',
                placeholder: '#6B7280',
                primary: colors.goldAccent,
                background: 'rgba(255,255,255,0.05)',
              },
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>

        {filteredVerses.length === 0 ? (
          <EmptyState
            title="No saved verses"
            description={
              searchQuery.trim()
                ? 'No results match your search.'
                : 'Start saving verses from your chat or verse details.'
            }
            icon="bookmark-outline"
          />
        ) : (
          <FlatList
            data={filteredVerses}
            key={isGrid ? 'grid' : 'list'}
            numColumns={isGrid ? 2 : 1}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.goldAccent}
              />
            }
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </LinearGradient>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    backgroundColor: '#0a1a1a', // ✅ Fixed: dark background for loading/error states
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogoCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1a2a2a',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.goldAccent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  headerLogoImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: 'row',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  searchBar: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    elevation: 0,
    shadowColor: 'transparent',
    height: 50,
  },
  searchBarFocused: {
    borderColor: colors.goldAccent,
    borderWidth: 1.5,
  },
  searchInput: {
    fontSize: typography.fontSize.md,
    color: '#FFFFFF',
  },
  cancelButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  cancelButtonText: {
    color: colors.goldAccent,
    fontWeight: '600',
    fontSize: typography.fontSize.md,
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  cardWrapper: {
    marginBottom: spacing.md,
    marginRight: spacing.sm,
  },
  gridCard: {
    flex: 1,
    maxWidth: '48%',
    marginHorizontal: '1%',
  },
  retryButton: {
    padding: spacing.md,
    marginTop: spacing.sm,
  },
});