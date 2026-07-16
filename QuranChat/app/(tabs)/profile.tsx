import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Text, Card, List, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import { colors, spacing } from '../../theme';
import { UserAvatar } from '../../components';
import { supabase } from '../../services/supabase';

const { width } = Dimensions.get('window');

const BACKEND_BASE_URL = 'tadabbur-backend-9mi4w9n10-rumesa-iqbals-projects.vercel.app';

async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

const FIXED_VERSE = "وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا ﴿٢﴾ وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ";
const FIXED_QUOTE = "And whoever fears Allah – He will make for him a way out";

export default function ProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('User');
  const [userEmail, setUserEmail] = useState('user@example.com');

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'text' | 'qibla'>('text');
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState('');

  const [qiblaHeading, setQiblaHeading] = useState<number | null>(null);
  const [qiblaBearing, setQiblaBearing] = useState<number | null>(null);
  const [qiblaLocationError, setQiblaLocationError] = useState<string | null>(null);
  const headingSubscription = useRef<any>(null);

  useEffect(() => {
    fetchUserProfile();
    return () => {
      if (headingSubscription.current) {
        headingSubscription.current.remove();
      }
    };
  }, []);

  async function fetchUserProfile() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (user) {
        const displayName =
          user.user_metadata?.display_name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split('@')[0] ||
          'User';
        setUserName(displayName);
        setUserEmail(user.email || 'No email');
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.auth.signOut();
              if (error) {
                Alert.alert('Error', error.message);
              } else {
                router.replace('/login');
              }
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const showTextModal = (title: string, content: string) => {
    setModalType('text');
    setModalTitle(title);
    setModalContent(content);
    setModalVisible(true);
  };

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
    setModalType('qibla');
    setModalVisible(true);
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
    setModalVisible(false);
    setQiblaHeading(null);
    setQiblaBearing(null);
  }

  const getNeedleAngle = (): number => {
    if (qiblaHeading === null || qiblaBearing === null) return 0;
    let angle = qiblaBearing - qiblaHeading;
    angle = (angle + 360) % 360;
    return angle;
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#D4AF37" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0a1a1a', '#0F2E2E', '#1a3a3a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradientBackground}
      />

      <View style={styles.headerContainer}>
        <LinearGradient
          colors={['rgba(212,175,55,0.2)', 'rgba(212,175,55,0.02)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGlow}
        />
        <View style={styles.header}>
          {/* ✅ Proper Arabic with diacritics */}
          <Text style={styles.arabicHeader}>بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</Text>
          <UserAvatar size={90} name={userName} />
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userEmail}>{userEmail}</Text>
          <View style={styles.memberSince}>
            <Ionicons name="calendar-outline" size={14} color="#B8D4D0" />
            <Text style={styles.memberSinceText}>Member since 2026</Text>
          </View>
          <View style={styles.goldDivider} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Card style={[styles.card, styles.islamicCard]}>
          <List.Section>
            <List.Subheader style={[styles.subheader, styles.centeredSubheader]}>
              ⚙️ Settings
            </List.Subheader>
            <List.Item
              title="About"
              description="Learn about this app"
              descriptionStyle={styles.listDescription}
              titleStyle={styles.listTitle}
              left={() => <List.Icon icon="information-outline" color="#D4AF37" />}
              right={() => <List.Icon icon="chevron-right" color="#6B7280" />}
              onPress={() =>
                showTextModal(
                  "About Qur'an Chat",
                  "Qur'an Chat is an AI-powered assistant designed to help you explore, understand, and connect with the Qur'an. Ask any question about verses, themes, or context, and receive thoughtful answers rooted in Islamic scholarship. This app is a companion for your spiritual journey."
                )
              }
            />
            <Divider style={styles.dividerGold} />
            <List.Item
              title="Qibla Direction"
              description="Find direction to Kaaba"
              descriptionStyle={styles.listDescription}
              titleStyle={styles.listTitle}
              left={() => <List.Icon icon="compass-outline" color="#D4AF37" />}
              right={() => <List.Icon icon="chevron-right" color="#6B7280" />}
              onPress={openQiblaModal}
            />
            <Divider style={styles.dividerGold} />
            <List.Item
              title="Privacy Policy"
              description="How we handle your data"
              descriptionStyle={styles.listDescription}
              titleStyle={styles.listTitle}
              left={() => <List.Icon icon="shield-outline" color="#D4AF37" />}
              right={() => <List.Icon icon="chevron-right" color="#6B7280" />}
              onPress={() =>
                showTextModal(
                  'Privacy Policy',
                  'Your privacy matters to us. We collect only your email and display name to provide a personalized experience. No sensitive data is shared with third parties. You can request data deletion at any time by contacting our support.'
                )
              }
            />
            <Divider style={styles.dividerGold} />
            <List.Item
              title="Help & Support"
              description="FAQs and contact"
              descriptionStyle={styles.listDescription}
              titleStyle={styles.listTitle}
              left={() => <List.Icon icon="help-circle-outline" color="#D4AF37" />}
              right={() => <List.Icon icon="chevron-right" color="#6B7280" />}
              onPress={() =>
                showTextModal(
                  'Help & Support',
                  "If you have any questions or issues, please reach out to our support team at support@quranchat.com. We're here to help!"
                )
              }
            />
            <Divider style={styles.dividerGold} />
            <List.Item
              title="Logout"
              left={() => <List.Icon icon="logout" color="#EF4444" />}
              titleStyle={{ color: '#EF4444', fontWeight: '700' }}
              onPress={handleLogout}
            />
          </List.Section>
        </Card>

        <View style={styles.verseCardContainer}>
          <LinearGradient
            colors={['rgba(212,175,55,0.1)', 'rgba(212,175,55,0.02)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.verseCardGradient}
          >
            <View style={styles.verseCardContent}>
              <Text style={styles.verseArabic}>{FIXED_VERSE}</Text>
              <View style={styles.verseDivider} />
              <Text style={styles.verseQuote}>{FIXED_QUOTE}</Text>
            </View>
          </LinearGradient>
        </View>

        <Text style={styles.version}>App Version 1.0.0</Text>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          if (modalType === 'qibla') {
            closeQiblaModal();
          } else {
            setModalVisible(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, styles.islamicCard]}>
            {modalType === 'text' ? (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{modalTitle}</Text>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={28} color="#D4AF37" />
                  </TouchableOpacity>
                </View>
                <Divider style={styles.modalDivider} />
                <Text style={styles.modalContent}>{modalContent}</Text>
              </>
            ) : (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Qibla Direction</Text>
                  <TouchableOpacity onPress={closeQiblaModal} style={styles.closeButton}>
                    <Ionicons name="close" size={28} color="#D4AF37" />
                  </TouchableOpacity>
                </View>
                <Divider style={styles.modalDivider} />
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
                    <ActivityIndicator size="large" color="#D4AF37" />
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
                        Rotate your phone until the <Text style={{ fontWeight: 'bold', color: '#D4AF37' }}>gold arrow</Text> points to the <Text style={{ color: '#EF4444' }}>red ▲</Text> at the top.
                      </Text>
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
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
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a1a1a',
  },
  headerContainer: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 175, 55, 0.2)',
    position: 'relative',
  },
  headerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  // ✅ Bismillah with proper diacritics and calligraphic style
  arabicHeader: {
    fontSize: 30,
    color: '#D4AF37',
    fontFamily: 'serif',  // good for Arabic with diacritics
    fontWeight: '700',
    marginBottom: spacing.md,
    letterSpacing: 2,
    textShadowColor: 'rgba(212, 175, 55, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: spacing.sm,
    letterSpacing: 0.5,
  },
  userEmail: {
    fontSize: 16,
    color: '#B8D4D0',
    fontWeight: '400',
    marginBottom: spacing.xs,
    marginTop: 2,
  },
  memberSince: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  memberSinceText: {
    fontSize: 13,
    color: '#D4E8E5',
    marginLeft: 6,
    fontWeight: '500',
  },
  goldDivider: {
    width: 60,
    height: 2,
    backgroundColor: '#D4AF37',
    marginTop: spacing.md,
    borderRadius: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.md,
  },
  card: {
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  islamicCard: {
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  subheader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#D4AF37',
    paddingLeft: spacing.md,
  },
  centeredSubheader: {
    textAlign: 'center',
    paddingLeft: 0,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  listDescription: {
    fontSize: 14,
    color: '#B8D4D0',
    fontWeight: '400',
  },
  dividerGold: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
  },
  verseCardContainer: {
    marginVertical: spacing.md,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  verseCardGradient: {
    padding: spacing.md,
  },
  verseCardContent: {
    alignItems: 'center',
  },
  verseArabic: {
    fontSize: 20,
    color: '#D4AF37',
    textAlign: 'center',
    fontFamily: 'serif',
    lineHeight: 32,
    marginBottom: spacing.sm,
  },
  verseDivider: {
    width: '30%',
    height: 1,
    backgroundColor: 'rgba(212, 175, 55, 0.3)',
    marginVertical: spacing.xs,
  },
  verseQuote: {
    fontSize: 14,
    color: '#B8D4D0',
    textAlign: 'center',
    fontStyle: 'italic',
    fontWeight: '400',
  },
  version: {
    textAlign: 'center',
    color: '#4A5568',
    fontSize: 15,
    fontWeight: '500',
    marginTop: spacing.md,
  },
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
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#D4AF37',
    flex: 1,
  },
  closeButton: {
    padding: spacing.xs,
  },
  modalDivider: {
    marginVertical: spacing.md,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
  },
  modalContent: {
    fontSize: 17,
    color: '#E0E0E0',
    lineHeight: 26,
    paddingBottom: spacing.sm,
    fontWeight: '400',
  },
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