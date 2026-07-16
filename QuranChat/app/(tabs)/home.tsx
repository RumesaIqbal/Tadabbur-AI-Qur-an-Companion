import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  Modal,
  RefreshControl,
  ActivityIndicator,
  LayoutAnimation,
  Alert,
} from 'react-native';
import { Text, FAB, Surface } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context'; // ✅ added
import { colors, spacing, typography } from '../../theme';
import { SearchBar, DailyVerseCard } from '../../components';
import { supabase } from '../../services/supabase';
import { API_BASE_URL } from '../../constants/config';

// ---------- Helper: get JWT token ----------
async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

// ---------- Types ----------
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

interface DailyVerse {
  surah: number;
  verse: number;
  arabic: string;
  translation: string;
  tafsir: string;
  reference: string;
}

interface PrayerTimings {
  timings: Record<string, string>;
  date: string;
  nextPrayer: string;
  nextTime: string;
}

// The five obligatory prayers
const OBLIGATORY_PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

// ---------- Component ----------
export default function HomeScreen() {
  const router = useRouter();
  const [savedVerses, setSavedVerses] = useState<SavedVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Daily verse
  const [dailyVerse, setDailyVerse] = useState<DailyVerse | null>(null);
  const [loadingDaily, setLoadingDaily] = useState(true);

  // Prayer times
  const [prayerModalVisible, setPrayerModalVisible] = useState(false);
  const [prayerData, setPrayerData] = useState<PrayerTimings | null>(null);
  const [loadingPrayer, setLoadingPrayer] = useState(false);

  // Modal state for saved verse details
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState<SavedVerse | null>(null);
  const [verseDetails, setVerseDetails] = useState<VerseDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // ---------- Fetch Daily Verse ----------
  const fetchDailyVerse = async () => {
    try {
      setLoadingDaily(true);
      const token = await getAuthToken();
      if (!token) return;
      const response = await fetch(`${API_BASE_URL}/api/daily-verse`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch daily verse');
      const data = await response.json();
      setDailyVerse(data);
    } catch (error) {
      console.error('Error fetching daily verse:', error);
    } finally {
      setLoadingDaily(false);
    }
  };

  // ---------- Fetch Saved Verses ----------
  const fetchSavedVerses = async () => {
    try {
      const token = await getAuthToken();
      if (!token) {
        setSavedVerses([]);
        return;
      }
      const response = await fetch(`${API_BASE_URL}/api/saved/recent`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch saved verses');
      const data = await response.json();
      setSavedVerses(data);
    } catch (error) {
      console.error('Error fetching saved verses:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ---------- Fetch Prayer Timings ----------
  const fetchPrayerTimings = async () => {
    try {
      setLoadingPrayer(true);
      // Get location
      let latitude = 24.8607;
      let longitude = 67.0011;
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        latitude = location.coords.latitude;
        longitude = location.coords.longitude;
      }

      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(
        `${API_BASE_URL}/api/prayer-timings?latitude=${latitude}&longitude=${longitude}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error('Failed to fetch prayer timings');
      const data = await response.json();
      setPrayerData(data);
      setPrayerModalVisible(true);
    } catch (error: any) {
      console.error('Error fetching prayer timings:', error);
      Alert.alert('Error', error.message || 'Could not load prayer times.');
    } finally {
      setLoadingPrayer(false);
    }
  };

  useEffect(() => {
    fetchDailyVerse();
    fetchSavedVerses();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDailyVerse();
    fetchSavedVerses();
  };

  // ---------- Fetch Verse Details (translation + context) ----------
  const fetchVerseDetails = async (verse: SavedVerse) => {
    setLoadingDetails(true);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');
      const response = await fetch(`${API_BASE_URL}/api/verse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          surah_number: verse.surah_number,
          verse_number: verse.verse_number,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to fetch verse details');
      }
      const data = await response.json();
      setVerseDetails({
        translation: data.translation || '',
        context: data.context || '',
      });
    } catch (error: any) {
      console.error('Error fetching verse details:', error);
      setVerseDetails({
        translation: 'Translation not available.',
        context: 'Context not available.',
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  // ---------- Open Saved Verse Modal ----------
  const openVerseModal = (verse: SavedVerse) => {
    setSelectedVerse(verse);
    setVerseDetails(null);
    setModalVisible(true);
    fetchVerseDetails(verse);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedVerse(null);
    setVerseDetails(null);
  };

  // ---------- Helpers ----------
  const formatReference = (surah: number, verse: number) => `${surah}:${verse}`;

  function timeAgo(dateString: string): string {
    const now = new Date();
    const diff = now.getTime() - new Date(dateString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateString).toLocaleDateString();
  }

  // ---------- Render Prayer Modal ----------
  const renderPrayerModal = () => {
    // Filter only the 5 obligatory prayers
    const filteredTimings = prayerData
      ? Object.fromEntries(
          Object.entries(prayerData.timings).filter(([name]) =>
            OBLIGATORY_PRAYERS.includes(name)
          )
        )
      : {};

    // Determine next prayer among the filtered ones
    let nextPrayerName = prayerData?.nextPrayer || 'Fajr';
    if (!OBLIGATORY_PRAYERS.includes(nextPrayerName)) {
      nextPrayerName = 'Fajr'; // fallback
    }

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={prayerModalVisible}
        onRequestClose={() => setPrayerModalVisible(false)}
      >
        <View style={styles.prayerModalOverlay}>
          <LinearGradient
            colors={['#0c1a2b', '#142b44', '#1a3a5a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.prayerModalContainer}
          >
            <View style={styles.prayerModalHeader}>
              <Text style={styles.prayerModalTitle}>🕌 Prayer Times</Text>
              <TouchableOpacity
                onPress={() => setPrayerModalVisible(false)}
                style={styles.prayerModalClose}
              >
                <Ionicons name="close" size={28} color="#F5D76E" />
              </TouchableOpacity>
            </View>

            {loadingPrayer ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color="#F5D76E" />
                <Text style={styles.modalLoadingText}>Loading prayer times...</Text>
              </View>
            ) : prayerData ? (
              <>
                <Text style={styles.prayerDate}>{prayerData.date}</Text>
                <View style={styles.prayerList}>
                  {Object.entries(filteredTimings).map(([name, time]) => {
                    const isNext = name === nextPrayerName;
                    return (
                      <View
                        key={name}
                        style={[styles.prayerItem, isNext && styles.prayerItemNext]}
                      >
                        <Text style={[styles.prayerName, isNext && styles.prayerNameNext]}>
                          {name}
                        </Text>
                        <Text style={[styles.prayerTime, isNext && styles.prayerTimeNext]}>
                          {time}
                        </Text>
                        {isNext && (
                          <View style={styles.nextBadge}>
                            <Text style={styles.nextBadgeText}>Next</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </>
            ) : (
              <Text style={styles.errorText}>Could not load prayer times.</Text>
            )}
          </LinearGradient>
        </View>
      </Modal>
    );
  };

  // ---------- Main Render ----------
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <LinearGradient
          colors={['#0a1a1a', '#0F2E2E', '#1a3a3a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.gradientBackground}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#D4AF37"
            />
          }
        >
          {/* Header with Logo, App Name, and Prayer Button */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerLogoCircle}>
                <Image
                  source={require('../../assets/images/logo.png')}
                  style={styles.headerLogoImage}
                  resizeMode="cover"
                />
              </View>
              <Text style={styles.appName}>Tadabbur</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity
                onPress={fetchPrayerTimings}
                style={styles.prayerButton}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="time-outline" size={28} color="#D4AF37" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar */}
          <SearchBar
            placeholder="Ask anything about the Qur'an"
            style={styles.searchBar}
            inputStyle={styles.searchInput}
            placeholderTextColor="#6B7280"
            iconColor="#D4AF37"
          />

          {/* Daily Verse */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Daily Verse</Text>
          </View>

          {loadingDaily ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#D4AF37" />
            </View>
          ) : dailyVerse ? (
            <DailyVerseCard
              verse={{
                arabic: dailyVerse.arabic,
                translation: dailyVerse.translation,
                reference: dailyVerse.reference,
                tafsir: dailyVerse.tafsir,
              }}
            />
          ) : (
            <Text style={styles.errorText}>Could not load daily verse</Text>
          )}

          {/* Recently Saved Verses */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recently Saved Verses</Text>
            <TouchableOpacity onPress={() => router.push('/saved')}>
              <Text style={styles.viewAll}>View All →</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#D4AF37" />
            </View>
          ) : savedVerses.length === 0 ? (
            <Surface style={styles.emptyCard}>
              <Ionicons name="bookmark-outline" size={40} color="#D4AF37" />
              <Text style={styles.emptyText}>No verses saved yet</Text>
              <Text style={styles.emptySubText}>
                Start saving verses from your chat
              </Text>
            </Surface>
          ) : (
            savedVerses.map((verse) => (
              <TouchableOpacity
                key={verse.id}
                style={styles.verseCard}
                onPress={() => openVerseModal(verse)}
                activeOpacity={0.7}
              >
                <View style={styles.verseCardHeader}>
                  <Text style={styles.verseReference}>
                    {formatReference(verse.surah_number, verse.verse_number)}
                  </Text>
                  <Ionicons name="bookmark" size={18} color="#D4AF37" />
                </View>
                <Text style={styles.verseArabic} numberOfLines={2}>
                  {verse.verse_text}
                </Text>
                <Text style={styles.verseTime}>{timeAgo(verse.created_at)}</Text>
              </TouchableOpacity>
            ))
          )}

          <Text style={styles.version}>Tadabbur v1.0.0</Text>
        </ScrollView>

        {/* FAB */}
        <FAB
          style={styles.fab}
          icon="plus"
          color="#0a1a1a"
          onPress={() => router.push('/chat')}
          label="New Chat"
          labelStyle={styles.fabLabel}
        />

        {/* Saved Verse Details Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={closeModal}
        >
          <View style={styles.modalOverlay}>
            <Surface style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {selectedVerse
                    ? `${selectedVerse.surah_number}:${selectedVerse.verse_number}`
                    : ''}
                </Text>
                <TouchableOpacity onPress={closeModal} style={styles.modalCloseButton}>
                  <Ionicons name="close" size={28} color="#D4AF37" />
                </TouchableOpacity>
              </View>

              {loadingDetails ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator size="large" color="#D4AF37" />
                  <Text style={styles.modalLoadingText}>Loading details...</Text>
                </View>
              ) : verseDetails ? (
                <View style={styles.modalContent}>
                  {selectedVerse && (
                    <Text style={styles.modalArabic}>{selectedVerse.verse_text}</Text>
                  )}
                  <View style={styles.modalDivider} />
                  <Text style={styles.modalLabel}>Translation</Text>
                  <Text style={styles.modalTranslation}>{verseDetails.translation}</Text>
                  <View style={styles.modalDivider} />
                  <Text style={styles.modalLabel}>Context</Text>
                  <Text style={styles.modalContext}>{verseDetails.context}</Text>
                  <TouchableOpacity
                    style={styles.modalViewSavedButton}
                    onPress={() => {
                      closeModal();
                      router.push('/saved');
                    }}
                  >
                    <Text style={styles.modalViewSavedText}>View All Saved Verses</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </Surface>
          </View>
        </Modal>

        {/* Prayer Times Modal */}
        {renderPrayerModal()}
      </View>
    </SafeAreaView>
  );
}

// ---------- Styles ----------
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0a1a1a',
  },
  container: {
    flex: 1,
    backgroundColor: '#0a1a1a',
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.sm, // reduced because SafeAreaView adds top padding
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerRight: {
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
    borderColor: '#D4AF37',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  headerLogoImage: {
    width: '100%',
    height: '100%',
  },
  appName: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  prayerButton: {
    padding: 12, // even larger touch area
    marginRight: spacing.xs,
  },

  // Search Bar
  searchBar: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    elevation: 0,
    shadowColor: 'transparent',
    height: 50,
    marginBottom: spacing.md,
  },
  searchInput: {
    fontSize: typography.fontSize.md,
    color: '#FFFFFF',
  },

  // Section titles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: '#D4AF37',
    letterSpacing: 0.3,
  },
  viewAll: {
    fontSize: typography.fontSize.sm,
    color: '#D4AF37',
    fontWeight: '500',
  },

  // Loading / error
  loadingContainer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  errorText: {
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: spacing.md,
  },

  // Saved verses
  emptyCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.15)',
    marginBottom: spacing.md,
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: typography.fontSize.md,
    marginTop: spacing.sm,
  },
  emptySubText: {
    color: '#6B7280',
    fontSize: typography.fontSize.sm,
    marginTop: 4,
  },
  verseCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.15)',
    marginBottom: spacing.sm,
  },
  verseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  verseReference: {
    fontSize: typography.fontSize.sm,
    color: '#D4AF37',
    fontWeight: '500',
  },
  verseArabic: {
    fontSize: typography.fontSize.xl,
    color: '#FFFFFF',
    textAlign: 'right',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'serif',
    lineHeight: 32,
  },
  verseTime: {
    fontSize: typography.fontSize.sm,
    color: '#6B7280',
    marginTop: spacing.xs,
    textAlign: 'right',
  },
  version: {
    textAlign: 'center',
    color: '#4A5568',
    fontSize: 15,
    fontWeight: '500',
    marginTop: spacing.md,
  },

  // FAB
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    backgroundColor: '#D4AF37',
    borderRadius: 30,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  fabLabel: {
    color: '#0a1a1a',
    fontWeight: '600',
  },

  // ----- Modals -----
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContainer: {
    backgroundColor: '#1a2a2a',
    borderRadius: 28,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: '#D4AF37',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalLoading: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  modalLoadingText: {
    color: '#B8D4D0',
    marginTop: spacing.sm,
  },
  modalContent: {
    paddingVertical: spacing.xs,
  },
  modalArabic: {
    fontSize: typography.fontSize.xl + 2,
    color: '#FFFFFF',
    textAlign: 'right',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'serif',
    lineHeight: 34,
    marginBottom: spacing.sm,
  },
  modalDivider: {
    height: 1,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    marginVertical: spacing.sm,
  },
  modalLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: '#D4AF37',
    marginBottom: 2,
  },
  modalTranslation: {
    fontSize: typography.fontSize.md,
    color: '#E0E0E0',
    lineHeight: 24,
  },
  modalContext: {
    fontSize: typography.fontSize.md,
    color: '#C0C0C0',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  modalViewSavedButton: {
    marginTop: spacing.md,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    padding: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    alignItems: 'center',
  },
  modalViewSavedText: {
    color: '#D4AF37',
    fontWeight: '600',
    fontSize: typography.fontSize.md,
  },

  // ----- Prayer Modal (Distinct colors) -----
  prayerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  prayerModalContainer: {
    borderRadius: 28,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#F5D76E',
    shadowColor: '#F5D76E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  prayerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  prayerModalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: '#F5D76E',
  },
  prayerModalClose: {
    padding: 4,
  },
  prayerDate: {
    color: '#A8D8EA',
    fontSize: typography.fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  prayerList: {
    marginTop: spacing.xs,
  },
  prayerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  prayerItemNext: {
    backgroundColor: 'rgba(245, 215, 110, 0.15)',
    borderColor: '#F5D76E',
    borderWidth: 1.5,
    shadowColor: '#F5D76E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  prayerName: {
    color: '#E8E8E8',
    fontSize: typography.fontSize.md,
    fontWeight: '500',
  },
  prayerNameNext: {
    color: '#F5D76E',
    fontWeight: '700',
  },
  prayerTime: {
    color: '#A8D8EA',
    fontSize: typography.fontSize.md,
  },
  prayerTimeNext: {
    color: '#F5D76E',
    fontWeight: '700',
  },
  nextBadge: {
    backgroundColor: '#F5D76E',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
  },
  nextBadgeText: {
    color: '#0a1a1a',
    fontSize: 10,
    fontWeight: '700',
  },
});