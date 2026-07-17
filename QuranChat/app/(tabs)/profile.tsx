import React, { useState, useEffect } from 'react';
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
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState('');

  useEffect(() => {
    fetchUserProfile();
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
    setModalTitle(title);
    setModalContent(content);
    setModalVisible(true);
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
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, styles.islamicCard]}>
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
  arabicHeader: {
    fontSize: 30,
    color: '#D4AF37',
    fontFamily: 'serif',
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
});