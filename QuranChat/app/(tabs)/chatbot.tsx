import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
  Image,
  Modal,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, spacing, typography } from '../../theme';
import { supabase } from '../../services/supabase';

// -------------------------------------------------------------------
// Backend configuration
// -------------------------------------------------------------------
const BACKEND_BASE_URL = 'http://192.168.100.131:5001';
const API_URL = `${BACKEND_BASE_URL}/api/chat`;

async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

// -------------------------------------------------------------------
// Hardcoded fallback responses
// -------------------------------------------------------------------
const hardcodedResponses = [
  "That's a great question! The Qur'an teaches us that patience is a virtue. Reflect on Surah Al-Asr (103:1-3).",
  'Alhamdulillah, you asked about Tawheed. The oneness of Allah is the core of Islamic faith – see Surah Al-Ikhlas (112).',
  'Surah Al-Fatihah is the opening chapter; it is a prayer for guidance, mercy, and the straight path.',
  "The Qur'an emphasizes justice, mercy, and compassion. Read Surah Al-Ma'idah (5:8) for guidance on justice.",
  'Allah says in Surah Al-Baqarah (2:286): "Allah does not burden a soul beyond that it can bear."',
  'Patience (Sabr) is mentioned in many verses; Surah Al-Baqarah (2:153) reminds us to seek help through patience and prayer.',
  "The Qur'an is a book of guidance, healing, and mercy. Explore its verses to find peace and wisdom.",
  'Good question! Let me share a verse: Surah Al-Isra (17:81) says, "Truth has come, and falsehood has perished."',
];

const getHardcodedResponse = () => {
  const randomIndex = Math.floor(Math.random() * hardcodedResponses.length);
  return hardcodedResponses[randomIndex];
};

const suggestions = [
  'What is Tawheed?',
  'Explain Surah Al-Fatihah',
  "Qur'an on patience",
  'Virtues of Surah Al-Kahf',
];

// -------------------------------------------------------------------
// Parser
// -------------------------------------------------------------------
function parseAssistantResponse(text: string) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const verses: { arabic: string; translation: string; reference: string }[] = [];
  let explanation = '';

  let currentArabic = '';
  let currentTranslation = '';
  let currentReference = '';
  let currentSection: 'arabic' | 'translation' | 'explanation' | null = null;

  const labelRegex = /^(\d+\.\s*|[-–—]\s*)?(Arabic verse|English translation|Explanation):/i;

  for (const line of lines) {
    const match = line.match(labelRegex);
    if (match) {
      const label = match[2].toLowerCase();
      const content = line.replace(labelRegex, '').trim();

      if (label === 'arabic verse') {
        if (currentArabic) {
          verses.push({
            arabic: currentArabic,
            translation: currentTranslation,
            reference: currentReference,
          });
          currentArabic = '';
          currentTranslation = '';
          currentReference = '';
        }
        currentSection = 'arabic';
        const refMatch = content.match(/\(([^)]+)\)/);
        if (refMatch) {
          currentReference = refMatch[1];
          currentArabic = content.replace(/\([^)]+\)/, '').trim();
        } else {
          currentArabic = content;
        }
      } else if (label === 'english translation') {
        currentSection = 'translation';
        const refMatch = content.match(/\(([^)]+)\)/);
        if (refMatch && !currentReference) {
          currentReference = refMatch[1];
          currentTranslation = content.replace(/\([^)]+\)/, '').trim();
        } else {
          currentTranslation = content;
        }
      } else if (label === 'explanation') {
        currentSection = 'explanation';
        explanation = content;
      }
    } else {
      if (currentSection === 'arabic') {
        currentArabic += ' ' + line;
      } else if (currentSection === 'translation') {
        currentTranslation += ' ' + line;
      } else if (currentSection === 'explanation') {
        explanation += ' ' + line;
      }
    }
  }

  if (currentArabic) {
    verses.push({
      arabic: currentArabic,
      translation: currentTranslation,
      reference: currentReference,
    });
  }

  if (verses.length === 0 && text.trim().length > 0) {
    verses.push({ arabic: text, translation: '', reference: '' });
  }

  return { verses, explanation };
}

// -------------------------------------------------------------------
// parseReference
// -------------------------------------------------------------------
function parseReference(ref: string): { surah_number: number; verse_number: number } | null {
  if (!ref) return null;
  const patterns = [
    /(?:Surah\s+)?([A-Za-zÀ-ÿ\s]+?)\s*(\d+):(\d+)/,
    /(\d+):(\d+)/,
    /verse\s*(\d+):(\d+)/i,
    /\(([^)]+)\)\s*(\d+):(\d+)/,
  ];
  for (const pattern of patterns) {
    const match = ref.match(pattern);
    if (match) {
      const numbers = match.filter((_, i) => i >= match.length - 2);
      if (numbers.length === 2) {
        return {
          surah_number: parseInt(numbers[0], 10),
          verse_number: parseInt(numbers[1], 10),
        };
      }
    }
  }
  return null;
}

// -------------------------------------------------------------------
// VerseCard
// -------------------------------------------------------------------
interface VerseCardProps {
  verse: { arabic: string; translation: string; reference: string };
  surahNumber?: number;
  verseNumber?: number;
  isSaved: boolean;
  isSaving: boolean;
  onBookmark: (verse: any, surahNumber: number, verseNumber: number) => void;
}

function VerseCard({
  verse,
  surahNumber,
  verseNumber,
  isSaved,
  isSaving,
  onBookmark,
}: VerseCardProps) {
  const [showTranslation, setShowTranslation] = useState(false);

  const handlePress = () => {
    if (surahNumber !== undefined && verseNumber !== undefined) {
      onBookmark(verse, surahNumber, verseNumber);
    } else {
      Alert.alert('Error', 'Verse numbers missing.');
    }
  };

  return (
    <View style={styles.verseCard}>
      <TouchableOpacity
        style={styles.bookmarkButton}
        onPress={handlePress}
        activeOpacity={0.7}
        hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator size="small" color="#D4AF37" />
        ) : (
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color="#D4AF37"
          />
        )}
      </TouchableOpacity>

      <Text style={styles.arabicText}>{verse.arabic}</Text>

      {verse.reference ? (
        <Text style={styles.referenceText}>{verse.reference}</Text>
      ) : null}

      {verse.translation ? (
        <>
          <TouchableOpacity
            style={styles.translationToggle}
            onPress={() => setShowTranslation(!showTranslation)}
            activeOpacity={0.7}
          >
            <Text style={styles.translationToggleText}>
              {showTranslation ? 'Hide Translation' : 'Show Translation'}
            </Text>
            <Ionicons
              name={showTranslation ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#D4AF37"
            />
          </TouchableOpacity>

          {showTranslation && (
            <View style={styles.translationContainer}>
              <Text style={styles.translationText}>{verse.translation}</Text>
            </View>
          )}
        </>
      ) : null}
    </View>
  );
}

// -------------------------------------------------------------------
// Main ChatBotScreen
// -------------------------------------------------------------------
export default function ChatBotScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ conversationId?: string }>();
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(
    params.conversationId || null
  );

  // Messages state
  const [messages, setMessages] = useState<
    { id: string; text: string; isUser: boolean }[]
  >([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Saved verses mapping
  const [savedVersesMap, setSavedVersesMap] = useState<Record<string, { id: string }>>({});
  const [savingMap, setSavingMap] = useState<Record<string, boolean>>({});

  // Sidebar / conversation list
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);

  // ---------- Fetch saved verses ----------
  useEffect(() => {
    fetchSavedVerses();
  }, []);

  async function fetchSavedVerses() {
    try {
      const token = await getAuthToken();
      if (!token) return;
      const response = await fetch(`${BACKEND_BASE_URL}/api/saved`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch saved verses');
      const result = await response.json();
      const map: Record<string, { id: string }> = {};
      (result.data || []).forEach((item: any) => {
        const key = `${item.surah_number}:${item.verse_number}`;
        map[key] = { id: item.id };
      });
      setSavedVersesMap(map);
    } catch (error) {
      console.error('Error fetching saved verses:', error);
    }
  }

  // ---------- Fetch conversations ----------
  const fetchConversations = useCallback(async () => {
    try {
      setLoadingConversations(true);
      const token = await getAuthToken();
      if (!token) return;
      const response = await fetch(`${BACKEND_BASE_URL}/api/conversations`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  // ---------- Load messages for a conversation (UPDATED) ----------
  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      setLoadingMessages(true);
      const token = await getAuthToken();
      if (!token) return;
      const response = await fetch(
        `${BACKEND_BASE_URL}/api/conversations/${conversationId}/messages`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );
      if (response.ok) {
        const data = await response.json();
        if (data.length === 0) {
          // No messages – show welcome
          setMessages([
            {
              id: 'welcome',
              text: "Assalamu Alaikum! I am your Qur'an assistant. Ask me anything about the Qur'an, and I'll provide insights from authentic sources.",
              isUser: false,
            },
          ]);
        } else {
          const msgs = data.map((m: any) => ({
            id: m.id,
            text: m.content,
            isUser: m.role === 'user',
          }));
          setMessages(msgs);
        }
      } else {
        // Failed to load – show welcome
        setMessages([
          {
            id: 'welcome',
            text: "Assalamu Alaikum! I am your Qur'an assistant. Ask me anything about the Qur'an, and I'll provide insights from authentic sources.",
            isUser: false,
          },
        ]);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
      // On error, also show welcome
      setMessages([
        {
          id: 'welcome',
          text: "Assalamu Alaikum! I am your Qur'an assistant. Ask me anything about the Qur'an, and I'll provide insights from authentic sources.",
          isUser: false,
        },
      ]);
      Alert.alert('Error', 'Could not load conversation.');
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // ---------- Load conversation list on mount ----------
  useEffect(() => {
    fetchConversations();
  }, []);

  // ---------- When conversationId changes, load its messages ----------
  useEffect(() => {
    if (currentConversationId) {
      loadMessages(currentConversationId);
    } else {
      // New chat: show welcome message
      setMessages([
        {
          id: 'welcome',
          text: "Assalamu Alaikum! I am your Qur'an assistant. Ask me anything about the Qur'an, and I'll provide insights from authentic sources.",
          isUser: false,
        },
      ]);
    }
  }, [currentConversationId, loadMessages]);

  // ---------- Delete conversation ----------
  const deleteConversation = async (id: string) => {
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getAuthToken();
              if (!token) {
                Alert.alert('Error', 'Please login first.');
                return;
              }
              const response = await fetch(`${BACKEND_BASE_URL}/api/conversations/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
              });
              if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to delete');
              }
              // If the currently open conversation was deleted, reset to new chat
              if (currentConversationId === id) {
                setCurrentConversationId(null);
                router.setParams({ conversationId: undefined });
                setMessages([
                  {
                    id: 'welcome',
                    text: "Assalamu Alaikum! I am your Qur'an assistant. Ask me anything about the Qur'an, and I'll provide insights from authentic sources.",
                    isUser: false,
                  },
                ]);
              }
              // Refresh conversation list
              fetchConversations();
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  // ---------- Send message (with title refresh) ----------
  const sendMessage = async (text?: string) => {
    const messageText = text || inputText;
    if (!messageText.trim()) return;

    const userMsg = {
      id: Date.now().toString(),
      text: messageText.trim(),
      isUser: true,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);
    Keyboard.dismiss();

    try {
      const token = await getAuthToken();
      if (!token) {
        Alert.alert('Error', 'Please login first.');
        setLoading(false);
        return;
      }

      const payload: any = { message: userMsg.text };
      if (currentConversationId) {
        payload.conversation_id = currentConversationId;
      }

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server responded with ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      // If new conversation was created, update the ID
      if (data.conversation_id && !currentConversationId) {
        setCurrentConversationId(data.conversation_id);
        router.setParams({ conversationId: data.conversation_id });
      }

      // Always refresh conversation list to update titles
      fetchConversations();

      const aiMsg = {
        id: (Date.now() + 1).toString(),
        text: data.reply || getHardcodedResponse(),
        isUser: false,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      console.error('❌ Chat error:', error);
      const fallback = {
        id: (Date.now() + 1).toString(),
        text: getHardcodedResponse(),
        isUser: false,
      };
      setMessages((prev) => [...prev, fallback]);
    } finally {
      setLoading(false);
    }
  };

  // ---------- Start new conversation ----------
  const startNewConversation = async () => {
    try {
      const token = await getAuthToken();
      if (!token) {
        Alert.alert('Error', 'Please login first.');
        return;
      }
      const response = await fetch(`${BACKEND_BASE_URL}/api/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ title: 'New Chat' }),
      });
      if (response.ok) {
        const newConv = await response.json();
        setCurrentConversationId(newConv.id);
        router.setParams({ conversationId: newConv.id });
        // Reset messages to welcome message
        setMessages([
          {
            id: 'welcome',
            text: "Assalamu Alaikum! I am your Qur'an assistant. Ask me anything about the Qur'an, and I'll provide insights from authentic sources.",
            isUser: false,
          },
        ]);
        setSidebarVisible(false);
        fetchConversations();
      } else {
        Alert.alert('Error', 'Could not create new conversation.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Network error.');
    }
  };

  // ---------- Switch conversation ----------
  const switchConversation = (id: string) => {
    setCurrentConversationId(id);
    router.setParams({ conversationId: id });
    setSidebarVisible(false);
  };

  // ---------- Bookmark toggle ----------
  const handleBookmark = async (
    verse: { arabic: string; translation: string; reference: string },
    surahNumber: number,
    verseNumber: number
  ) => {
    const key = `${surahNumber}:${verseNumber}`;
    const savedEntry = savedVersesMap[key];
    const isSaved = !!savedEntry;

    setSavingMap(prev => ({ ...prev, [key]: true }));

    try {
      const token = await getAuthToken();
      if (!token) {
        Alert.alert('Error', 'Please login first.');
        setSavingMap(prev => ({ ...prev, [key]: false }));
        return;
      }

      if (isSaved) {
        const response = await fetch(`${BACKEND_BASE_URL}/api/saved/${savedEntry.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Failed to delete');
        }
        setSavedVersesMap(prev => {
          const newMap = { ...prev };
          delete newMap[key];
          return newMap;
        });
        Alert.alert('Removed', 'Verse unsaved.');
      } else {
        const verse_text = verse.arabic || verse.translation || 'No text';
        const payload = { surah_number: surahNumber, verse_number: verseNumber, verse_text };
        const response = await fetch(`${BACKEND_BASE_URL}/api/saved`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (response.status === 409) {
          Alert.alert('Info', 'This verse is already saved.');
          setSavingMap(prev => ({ ...prev, [key]: false }));
          return;
        }

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Failed to save');
        }

        const data = await response.json();
        setSavedVersesMap(prev => ({
          ...prev,
          [key]: { id: data.id },
        }));
        Alert.alert('Success', 'Verse saved to your collection!');
      }
    } catch (error) {
      console.error('Bookmark error:', error);
      Alert.alert('Error', error.message || 'Could not complete action.');
    } finally {
      setSavingMap(prev => ({ ...prev, [key]: false }));
    }
  };

  // ---------- Render item ----------
  const renderItem = ({ item, index }: any) => {
    const isFirst = index === 0 && !item.isUser && !currentConversationId;

    if (item.isUser) {
      return (
        <Animated.View
          entering={FadeInUp.delay(index * 50).duration(400)}
          style={[styles.messageRow, styles.userRow]}
        >
          <View style={[styles.bubble, styles.userBubble]}>
            <Text style={[styles.messageText, styles.userText]}>
              {item.text}
            </Text>
          </View>
        </Animated.View>
      );
    }

    const parsed = parseAssistantResponse(item.text);
    const hasVerses = parsed.verses.length > 0 && parsed.verses[0].arabic !== item.text;

    const versesWithNumbers = parsed.verses.map(v => {
      const ref = parseReference(v.reference || '');
      return {
        ...v,
        surahNumber: ref?.surah_number,
        verseNumber: ref?.verse_number,
      };
    });

    return (
      <Animated.View
        entering={FadeInUp.delay(index * 50).duration(400)}
        style={[styles.messageRow, styles.assistantRow]}
      >
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>📖</Text>
        </View>
        <View style={[styles.bubble, styles.assistantBubble, isFirst && styles.welcomeBubble]}>
          {!hasVerses ? (
            <Text style={[styles.messageText, styles.assistantText]}>
              {item.text}
            </Text>
          ) : (
            <>
              {versesWithNumbers.map((verse, idx) => {
                const key = verse.surahNumber !== undefined && verse.verseNumber !== undefined
                  ? `${verse.surahNumber}:${verse.verseNumber}`
                  : null;
                const isSaved = key ? !!savedVersesMap[key] : false;
                const isSaving = key ? !!savingMap[key] : false;
                return (
                  <VerseCard
                    key={idx}
                    verse={verse}
                    surahNumber={verse.surahNumber}
                    verseNumber={verse.verseNumber}
                    isSaved={isSaved}
                    isSaving={isSaving}
                    onBookmark={handleBookmark}
                  />
                );
              })}
              {parsed.explanation ? (
                <View style={styles.explanationContainer}>
                  <Text style={styles.explanationTitle}>Explanation</Text>
                  <Text style={styles.explanationText}>{parsed.explanation}</Text>
                </View>
              ) : null}
            </>
          )}
        </View>
      </Animated.View>
    );
  };

  // ---------- Render sidebar modal ----------
  const renderSidebar = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={sidebarVisible}
      onRequestClose={() => setSidebarVisible(false)}
    >
      <SafeAreaView style={styles.sidebarOverlay}>
        <View style={styles.sidebarContainer}>
          <View style={styles.sidebarHeader}>
            <Text style={styles.sidebarTitle}>Conversations</Text>
            <TouchableOpacity onPress={() => setSidebarVisible(false)}>
              <Ionicons name="close" size={28} color="#D4AF37" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.newChatButton} onPress={startNewConversation}>
            <Ionicons name="add-circle" size={24} color="#D4AF37" />
            <Text style={styles.newChatText}>New Conversation</Text>
          </TouchableOpacity>

          {loadingConversations ? (
            <ActivityIndicator size="large" color="#D4AF37" style={{ marginTop: 20 }} />
          ) : conversations.length === 0 ? (
            <View style={styles.emptyConversations}>
              <Text style={styles.emptyText}>No conversations yet</Text>
            </View>
          ) : (
            <FlatList
              data={conversations}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.conversationItemWrapper}>
                  <TouchableOpacity
                    style={[
                      styles.conversationItem,
                      currentConversationId === item.id && styles.activeConversation,
                    ]}
                    onPress={() => switchConversation(item.id)}
                  >
                    <Text style={styles.conversationTitle} numberOfLines={1}>
                      {item.title || 'Untitled'}
                    </Text>
                    <Text style={styles.conversationDate}>
                      {new Date(item.updated_at).toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteConversationButton}
                    onPress={() => deleteConversation(item.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
              )}
              contentContainerStyle={styles.conversationList}
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );

  // ---------- Helper to dismiss keyboard ----------
  const dismissKeyboard = () => Keyboard.dismiss();

  // ---------- Main render ----------
  return (
    <>
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient
          colors={['#0a1a1a', '#0F2E2E', '#1a3a3a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.container}
        >
          <StatusBar barStyle="light-content" backgroundColor="#0a1a1a" />
          <KeyboardAvoidingView
            style={styles.keyboardView}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <View style={styles.headerLeft}>
                  {/* Hamburger menu */}
                  <TouchableOpacity
                    onPress={() => setSidebarVisible(true)}
                    style={styles.menuButton}
                  >
                    <Ionicons name="menu-outline" size={28} color="#D4AF37" />
                  </TouchableOpacity>

                  <View style={styles.headerLogoCircle}>
                    <Image
                      source={require('../../assets/images/logo.png')}
                      style={styles.headerLogoImage}
                      resizeMode="cover"
                    />
                  </View>
                  <Text style={styles.headerTitle}>Qur'an AI</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    // Clear conversation state and show welcome
                    setCurrentConversationId(null);
                    router.setParams({ conversationId: undefined });
                    setMessages([
                      {
                        id: 'welcome',
                        text: "Assalamu Alaikum! I am your Qur'an assistant. Ask me anything about the Qur'an, and I'll provide insights from authentic sources.",
                        isUser: false,
                      },
                    ]);
                  }}
                  style={styles.clearButton}
                >
                  <Ionicons name="trash-outline" size={22} color="#D4AF37" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.body}>
              {loadingMessages ? (
                <View style={styles.centerLoading}>
                  <ActivityIndicator size="large" color="#D4AF37" />
                  <Text style={styles.loadingText}>Loading conversation...</Text>
                </View>
              ) : (
                <>
                  {/* Show suggestions when only the welcome message exists */}
                  {messages.length <= 1 && (
                    <Animated.View entering={FadeIn.delay(300)} style={styles.suggestionsContainer}>
                      <Text style={styles.suggestionsTitle}>Quick Questions</Text>
                      <View style={styles.chipContainer}>
                        {suggestions.map((s, i) => (
                          <TouchableOpacity
                            key={i}
                            style={styles.chip}
                            onPress={() => {
                              sendMessage(s);
                              dismissKeyboard();
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.chipText}>{s}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </Animated.View>
                  )}

                  <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    style={styles.flatList}
                    contentContainerStyle={styles.chatContent}
                    showsVerticalScrollIndicator={true}
                    keyboardDismissMode="on-drag"
                    onScrollBeginDrag={dismissKeyboard}
                    ListFooterComponent={
                      loading ? (
                        <View style={styles.typingContainer}>
                          <ActivityIndicator size="small" color="#D4AF37" />
                          <Text style={styles.typingText}>Assistant is reflecting...</Text>
                        </View>
                      ) : null
                    }
                  />
                </>
              )}
            </View>

            <View style={styles.inputWrapper}>
              <View style={styles.inputContainer}>
                <TouchableOpacity onPress={dismissKeyboard} style={styles.closeButton}>
                  <Ionicons name="close-circle" size={28} color="#D4AF37" />
                </TouchableOpacity>

                <TextInput
                  style={styles.input}
                  placeholder="Ask a question..."
                  placeholderTextColor="#6B7280"
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                  maxHeight={100}
                  returnKeyType="send"
                  onSubmitEditing={() => {
                    if (inputText.trim()) sendMessage();
                  }}
                />

                <TouchableOpacity
                  style={styles.sendButton}
                  onPress={() => sendMessage()}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={['#D4AF37', '#F5D76E']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.sendGradient}
                  >
                    <Ionicons name="send" size={20} color="#0a1a1a" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </LinearGradient>
      </SafeAreaView>

      {renderSidebar()}
    </>
  );
}

// -------------------------------------------------------------------
// Styles
// -------------------------------------------------------------------
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0a1a1a',
  },
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 175, 55, 0.15)',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuButton: {
    padding: 4,
    marginRight: spacing.sm,
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
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  clearButton: {
    padding: spacing.xs,
  },
  body: {
    flex: 1,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#B8D4D0',
    marginTop: spacing.sm,
    fontSize: typography.fontSize.md,
  },
  suggestionsContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  suggestionsTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: '#D4AF37',
    marginBottom: spacing.sm,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  chipText: {
    fontSize: typography.fontSize.sm,
    color: '#E0E0E0',
    fontWeight: '500',
  },
  flatList: {
    flex: 1,
  },
  chatContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingBottom: spacing.xl,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: spacing.xs,
    maxWidth: '85%',
  },
  userRow: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  assistantRow: {
    alignSelf: 'flex-start',
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D4AF37',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    alignSelf: 'flex-end',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  avatarText: {
    fontSize: 16,
    color: '#0a1a1a',
    fontWeight: 'bold',
  },
  bubble: {
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  welcomeBubble: {
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  userBubble: {
    backgroundColor: '#0F766E',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: typography.fontSize.md,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFFFF',
  },
  assistantText: {
    color: '#E0E0E0',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  typingText: {
    marginLeft: spacing.sm,
    color: '#D4AF37',
    fontSize: typography.fontSize.sm,
    fontStyle: 'italic',
  },
  inputWrapper: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    paddingBottom: 90,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  closeButton: {
    paddingHorizontal: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    maxHeight: 100,
    fontSize: typography.fontSize.md,
    color: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
  },
  sendButton: {
    borderRadius: 30,
    overflow: 'hidden',
    marginLeft: spacing.xs,
  },
  sendGradient: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  verseCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    position: 'relative',
  },
  bookmarkButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    padding: 4,
    zIndex: 1,
  },
  arabicText: {
    fontSize: 22,
    color: '#FFFFFF',
    textAlign: 'right',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'serif',
    marginBottom: spacing.xs,
    lineHeight: 32,
    paddingRight: 40,
  },
  referenceText: {
    fontSize: typography.fontSize.sm,
    color: '#D4AF37',
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  translationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
  },
  translationToggleText: {
    fontSize: typography.fontSize.sm,
    color: '#D4AF37',
    marginRight: 4,
    fontWeight: '500',
  },
  translationContainer: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  translationText: {
    fontSize: typography.fontSize.md,
    color: '#E0E0E0',
    lineHeight: 24,
  },
  explanationContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  explanationTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: '#D4AF37',
    marginBottom: spacing.xs,
  },
  explanationText: {
    fontSize: typography.fontSize.md,
    color: '#E0E0E0',
    lineHeight: 24,
  },

  // Sidebar styles
  sidebarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-start',
  },
  sidebarContainer: {
    backgroundColor: '#1a2a2a',
    width: '85%',
    maxWidth: 320,
    height: '100%',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: spacing.md,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212,175,55,0.2)',
  },
  sidebarTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212,175,55,0.15)',
    padding: spacing.sm,
    borderRadius: 12,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
  },
  newChatText: {
    color: '#D4AF37',
    fontWeight: '600',
    fontSize: typography.fontSize.md,
    marginLeft: spacing.sm,
  },
  emptyConversations: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: typography.fontSize.md,
  },
  conversationList: {
    paddingBottom: spacing.xl,
  },
  conversationItemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationItem: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
  },
  activeConversation: {
    backgroundColor: 'rgba(212,175,55,0.15)',
    borderLeftWidth: 3,
    borderLeftColor: '#D4AF37',
  },
  conversationTitle: {
    color: '#FFFFFF',
    fontSize: typography.fontSize.md,
    fontWeight: '500',
  },
  conversationDate: {
    color: '#6B7280',
    fontSize: typography.fontSize.sm,
    marginTop: 2,
  },
  deleteConversationButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
});