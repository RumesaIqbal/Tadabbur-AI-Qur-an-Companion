import React, { useState, useEffect, useRef } from 'react';
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
  Alert,
} from 'react-native';
import { Text, FAB } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../../theme';
import { SearchBar, DailyVerseCard } from '../../components';
import { supabase } from '../../services/supabase';
import { API_BASE_URL } from '../../constants/config';

// ---------- Helper ----------
async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

// Helper: convert 24h to 12h with AM/PM
function formatTimeToAMPM(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
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

const OBLIGATORY_PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

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

  // Qibla
  const [qiblaModalVisible, setQiblaModalVisible] = useState(false);
  const [qiblaHeading, setQiblaHeading] = useState<number | null>(null);
  const [qiblaBearing, setQiblaBearing] = useState<number | null>(null);
  const [qiblaLocationError, setQiblaLocationError] = useState<string | null>(null);
  const headingSubscription = useRef<any>(null);

  // Saved verse details modal
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

  // ---------- Qibla ----------
  function computeQiblaBearing(lat: number, lon: number): number {
    const latMecca = 21.4225;
    const lonMecca = 39.8262;
    const φ1 = (lat * Math.PI) / 180;
    const φ2 = (latMecca * Math.PI) / 180;
    const Δλ = ((lonMecca - lon) * Math.PI) / 180;
    const x = Math.cos(φ2) * Math.sin(Δλ);
    const y = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    let bearing = (Math.atan2(x, y) * 180) / Math.PI;
    bearing = (bearing + 360) % 360;
    return bearing;
  }

  async function openQiblaModal() {
    setQiblaModalVisible(true);
    setQiblaHeading(null);
    setQiblaBearing(null);
    setQiblaLocationError(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setQiblaLocationError('Location permission is required to determine Qibla direction.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      const bearing = computeQiblaBearing(latitude, longitude);
      setQiblaBearing(bearing);

      headingSubscription.current = await Location.watchHeadingAsync((headingData) => {
        if (headingData.trueHeading !== -1) {
          setQiblaHeading(headingData.trueHeading);
        } else if (headingData.magneticHeading !== -1) {
          setQiblaHeading(headingData.magneticHeading);
        }
      });
    } catch (error) {
      console.error('Qibla setup error:', error);
      setQiblaLocationError('Failed to access location or sensors.');
    }
  }

  function closeQiblaModal() {
    if (headingSubscription.current) {
      headingSubscription.current.remove();
      headingSubscription.current = null;
    }
    setQiblaModalVisible(false);
    setQiblaHeading(null);
    setQiblaBearing(null);
  }

  const getNeedleAngle = (): number => {
    if (qiblaHeading === null || qiblaBearing === null) return 0;
    let angle = qiblaBearing - qiblaHeading;
    angle = (angle + 360) % 360;
    return angle;
  };

  useEffect(() => {
    fetchDailyVerse();
    fetchSavedVerses();
    return () => {
      if (headingSubscription.current) {
        headingSubscription.current.remove();
      }
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDailyVerse();
    fetchSavedVerses();
  };

  // ---------- Fetch Verse Details ----------
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

  // ---------- Render Prayer Modal (with AM/PM) ----------
  const renderPrayerModal = () => {
    const filteredTimings = prayerData
      ? Object.fromEntries(
          Object.entries(prayerData.timings).filter(([name]) =>
            OBLIGATORY_PRAYERS.includes(name)
          )
        )
      : {};

    // Compute next obligatory prayer from filtered timings
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    let nextPrayerName = 'Fajr';
    let smallestDiff = Infinity;
    for (const [name, time] of Object.entries(filteredTimings)) {
      const [hours, minutes] = time.split(':').map(Number);
      const totalMinutes = hours * 60 + minutes;
      if (totalMinutes > currentMinutes) {
        const diff = totalMinutes - currentMinutes;
        if (diff < smallestDiff) {
          smallestDiff = diff;
          nextPrayerName = name;
        }
      }
    }

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={prayerModalVisible}
        onRequestClose={() => setPrayerModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <LinearGradient
            colors={['#0c1a2b', '#142b44', '#1a3a5a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.locationModalContainer}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.locationModalTitle}>🕌 Prayer Times</Text>
              <TouchableOpacity
                onPress={() => setPrayerModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={28} color="#F5D76E" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalDivider} />

            {loadingPrayer ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color="#F5D76E" />
                <Text style={styles.modalLoadingText}>Loading prayer times...</Text>
              </View>
            ) : prayerData ? (
              <>
                <Text style={styles.locationDate}>{prayerData.date}</Text>
                <View style={styles.prayerList}>
                  {Object.entries(filteredTimings).map(([name, time]) => {
                    const isNext = name === nextPrayerName;
                    const displayTime = formatTimeToAMPM(time);
                    return (
                      <View
                        key={name}
                        style={[styles.prayerItem, isNext && styles.prayerItemNext]}
                      >
                        <Text style={[styles.prayerName, isNext && styles.prayerNameNext]}>
                          {name}
                        </Text>
                        <Text style={[styles.prayerTime, isNext && styles.prayerTimeNext]}>
                          {displayTime}
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

  // ---------- Render Qibla Modal ----------
  const renderQiblaModal = () => {
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={qiblaModalVisible}
        onRequestClose={closeQiblaModal}
      >
        <View style={styles.modalOverlay}>
          <LinearGradient
            colors={['#0c1a2b', '#142b44', '#1a3a5a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.locationModalContainer}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.locationModalTitle}>Qibla Direction</Text>
              <TouchableOpacity onPress={closeQiblaModal} style={styles.closeButton}>
                <Ionicons name="close" size={28} color="#F5D76E" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalDivider} />

            {qiblaLocationError ? (
              <View style={styles.qiblaErrorContainer}>
                <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
                <Text style={styles.qiblaErrorText}>{qiblaLocationError}</Text>
                <TouchableOpacity
                  style={styles.qiblaRetryButton}
                  onPress={openQiblaModal}
                >
                  <Text style={styles.qiblaRetryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : qiblaHeading === null || qiblaBearing === null ? (
              <View style={styles.qiblaLoadingContainer}>
                <ActivityIndicator size="large" color="#F5D76E" />
                <Text style={styles.qiblaLoadingText}>Initializing...</Text>
              </View>
            ) : (
              <View style={styles.qiblaContainer}>
                <View style={styles.compassWrapper}>
                  <View style={styles.compassCircle}>
                    <Text style={[styles.cardinal, { top: 0, left: '50%', transform: [{ translateX: -8 }] }]}>N</Text>
                    <Text style={[styles.cardinal, { bottom: 0, left: '50%', transform: [{ translateX: -8 }] }]}>S</Text>
                    <Text style={[styles.cardinal, { left: 0, top: '50%', transform: [{ translateY: -8 }] }]}>W</Text>
                    <Text style={[styles.cardinal, { right: 0, top: '50%', transform: [{ translateY: -8 }] }]}>E</Text>
                    {Array.from({ length: 36 }).map((_, i) => {
                      const angle = i * 10;
                      const isMajor = angle % 30 === 0;
                      return (
                        <View
                          key={i}
                          style={[
                            styles.tick,
                            {
                              transform: [
                                { rotate: `${angle}deg` },
                                { translateY: -70 },
                              ],
                              height: isMajor ? 12 : 6,
                              width: isMajor ? 3 : 2,
                              backgroundColor: isMajor ? '#1F2937' : '#9CA3AF',
                            },
                          ]}
                        />
                      );
                    })}
                    <View style={styles.forwardMarker}>
                      <Ionicons name="caret-up" size={20} color="#EF4444" />
                    </View>
                    <View
                      style={[
                        styles.needleContainer,
                        {
                          transform: [{ rotate: `${getNeedleAngle()}deg` }],
                        },
                      ]}
                    >
                      <View style={styles.needle}>
                        <View style={styles.needleTip} />
                        <View style={styles.needleShaft} />
                      </View>
                      <Text style={styles.needleLabel}>Qibla</Text>
                    </View>
                    <View style={styles.kaabaIcon}>
                      <Text style={{ fontSize: 36 }}>🕋</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.qiblaInfo}>
                  <Text style={styles.qiblaBearingText}>
                    Bearing: {Math.round(qiblaBearing)}° from North
                  </Text>
                  <Text style={styles.qiblaHeadingText}>
                    Device Heading: {Math.round(qiblaHeading)}°
                  </Text>
                  <Text style={styles.qiblaHint}>
                    Rotate your phone until the <Text style={{ fontWeight: 'bold', color: '#F5D76E' }}>gold arrow</Text> points to the <Text style={{ color: '#EF4444' }}>red ▲</Text> at the top.
                  </Text>
                </View>
              </View>
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
                onPress={openQiblaModal}
                style={styles.headerIconButton}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="compass-outline" size={28} color="#D4AF37" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={fetchPrayerTimings}
                style={styles.headerIconButton}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="time-outline" size={28} color="#D4AF37" />
              </TouchableOpacity>
            </View>
          </View>

         
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
            <View style={styles.emptyCard}>
              <Ionicons name="bookmark-outline" size={40} color="#D4AF37" />
              <Text style={styles.emptyText}>No verses saved yet</Text>
              <Text style={styles.emptySubText}>
                Start saving verses from your chat
              </Text>
            </View>
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
            <View style={styles.modalContainer}>
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
            </View>
          </View>
        </Modal>

        {renderPrayerModal()}
        {renderQiblaModal()}
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
    paddingTop: spacing.sm,
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
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
  headerIconButton: {
    padding: 8,
  },

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

  loadingContainer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  errorText: {
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: spacing.md,
  },

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

  // Shared modal styles
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
  modalDivider: {
    height: 1,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    marginVertical: spacing.sm,
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

  // Location modals (Prayer & Qibla) - unified styling
  locationModalContainer: {
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
  locationModalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: '#F5D76E',
  },
  locationDate: {
    color: '#A8D8EA',
    fontSize: typography.fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.md,
  },

  // Prayer specific
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

  // Qibla specific
  qiblaErrorContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  qiblaErrorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  qiblaRetryButton: {
    backgroundColor: '#D4AF37',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  qiblaRetryText: {
    color: '#0a1a1a',
    fontWeight: '600',
  },
  qiblaLoadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  qiblaLoadingText: {
    marginTop: spacing.sm,
    fontSize: 16,
    color: '#B8D4D0',
  },
  qiblaContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  compassWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.md,
  },
  compassCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#2a3a3a',
    borderWidth: 2,
    borderColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cardinal: {
    position: 'absolute',
    fontSize: 16,
    fontWeight: '700',
    color: '#D4AF37',
  },
  tick: {
    position: 'absolute',
    borderRadius: 1,
    backgroundColor: '#9CA3AF',
    top: '50%',
    left: '50%',
    marginLeft: -1,
    marginTop: -1,
    transform: [{ translateY: -70 }],
  },
  forwardMarker: {
    position: 'absolute',
    top: -12,
    left: '50%',
    transform: [{ translateX: -10 }],
    zIndex: 10,
  },
  needleContainer: {
    position: 'absolute',
    width: 60,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    top: '50%',
    left: '50%',
    marginLeft: -30,
    marginTop: -50,
    zIndex: 5,
  },
  needle: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 100,
  },
  needleTip: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 24,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#D4AF37',
    transform: [{ rotate: '0deg' }],
    marginBottom: -2,
  },
  needleShaft: {
    width: 6,
    height: 70,
    backgroundColor: '#D4AF37',
    borderRadius: 3,
    marginTop: -2,
  },
  needleLabel: {
    position: 'absolute',
    bottom: -20,
    fontSize: 14,
    fontWeight: '700',
    color: '#D4AF37',
    backgroundColor: 'rgba(26,42,42,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  kaabaIcon: {
    position: 'absolute',
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
    backgroundColor: 'rgba(26,42,42,0.9)',
    zIndex: 6,
  },
  qiblaInfo: {
    marginTop: spacing.md,
    alignItems: 'center',
    width: '100%',
  },
  qiblaBearingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#D4AF37',
  },
  qiblaHeadingText: {
    fontSize: 16,
    color: '#B8D4D0',
    marginTop: 4,
  },
  qiblaHint: {
    fontSize: 15,
    color: '#B8D4D0',
    marginTop: spacing.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    lineHeight: 22,
  },
});