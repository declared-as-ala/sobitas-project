import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { fitnessApi } from '../services/api';
import { theme } from '../constants/theme';
import { useAuthStore } from '../store/auth';
import { router } from 'expo-router';
import { Send, User, MessageSquare, AlertCircle } from 'lucide-react-native';
import Button from '../components/Button';

interface Message {
  id: string;
  sender: 'user' | 'coach';
  text: string;
  createdAt: number;
}

const TypingDot = ({ delay }: { delay: number }) => {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-4, { duration: 300 }),
          withTiming(0, { duration: 300 }),
        ),
        -1,
      ),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[styles.typingDot, animatedStyle]} />;
};

const TypingIndicator = () => (
  <View style={styles.typingBubble}>
    <TypingDot delay={0} />
    <TypingDot delay={120} />
    <TypingDot delay={240} />
  </View>
);

export default function AiCoachScreen() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  // 1. Fetch chat history from NestJS
  const { data: dbHistory, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['chat-history'],
    queryFn: async () => {
      const res = await fitnessApi.get('/ai-coach/history');
      return res.data;
    },
    enabled: isAuthenticated,
  });

  // Populate state with DB history on load
  useEffect(() => {
    if (dbHistory) {
      const formatted: Message[] = dbHistory.flatMap((h: any) => [
        { id: `${h.id}-user`, sender: 'user', text: h.message, createdAt: new Date(h.createdAt).getTime() },
        { id: `${h.id}-coach`, sender: 'coach', text: h.response, createdAt: new Date(h.createdAt).getTime() }
      ]);
      // Sort chronologically
      formatted.sort((a, b) => a.createdAt - b.createdAt);
      setMessages(formatted);
    }
  }, [dbHistory]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  // 2. Chat sending mutation
  const sendMutation = useMutation({
    mutationFn: async (msg: string) => {
      const res = await fitnessApi.post('/ai-coach', { message: msg });
      return res.data;
    },
    onSuccess: (data) => {
      // Append AI coach response
      const coachMsg: Message = {
        id: `coach-${Date.now()}`,
        sender: 'coach',
        text: data.response,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, coachMsg]);
      queryClient.invalidateQueries({ queryKey: ['chat-history'] });
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.message || 'Échec de connexion avec le coach AI. Veuillez réessayer.';
      const systemError: Message = {
        id: `err-${Date.now()}`,
        sender: 'coach',
        text: `⚠️ Erreur : ${errMsg}`,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, systemError]);
    },
  });

  const handleSendMessage = () => {
    if (!inputText.trim() || sendMutation.isPending) return;

    const userText = inputText.trim();
    setInputText('');

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userText,
      createdAt: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    sendMutation.mutate(userText);
  };

  const renderMessageItem = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowCoach]}>
        {!isUser && (
          <LinearGradient colors={theme.gradients.dark} style={styles.coachAvatar}>
            <MessageSquare size={16} color={theme.colors.primary} />
          </LinearGradient>
        )}
        {isUser ? (
          <LinearGradient
            colors={theme.gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.bubble, styles.bubbleUser]}>
            <Text style={[styles.messageText, styles.messageTextUser]}>{item.text}</Text>
          </LinearGradient>
        ) : (
          <View style={[styles.bubble, styles.bubbleCoach]}>
            <Text style={[styles.messageText, styles.messageTextCoach]}>{item.text}</Text>
          </View>
        )}
        {isUser && (
          <LinearGradient colors={theme.gradients.primary} style={styles.userAvatar}>
            <User size={16} color={theme.colors.white} />
          </LinearGradient>
        )}
      </View>
    );
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.centerContainer}>
        <AlertCircle size={40} color={theme.colors.textMuted} />
        <Text style={styles.promoText}>Connectez-vous pour parler à votre AI Coach personnel.</Text>
        <Button title="Se connecter" style={{ width: '80%' }} onPress={() => router.push('/login')} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      
      {/* Disclaimer Banner */}
      <View style={styles.disclaimerBanner}>
        <AlertCircle size={14} color="#D97706" style={{ marginRight: 6 }} />
        <Text style={styles.disclaimerText}>Conseils généraux de fitness. Non médical.</Text>
      </View>

      {isHistoryLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessageItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listPadding}
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <LinearGradient colors={theme.gradients.primary} style={styles.coachAvatarLarge}>
                <MessageSquare size={32} color={theme.colors.white} />
              </LinearGradient>
              <Text style={styles.emptyTitle}>Posez vos questions au Coach !</Text>
              <Text style={styles.emptySubtitle}>
                Vous pouvez lui parler en Français, Anglais ou Darija Tunisienne. Ex: "شنوة نجم ناخذ بعد التمرين؟"
              </Text>
            </View>
          }
        />
      )}

      {/* Typing indicator for AI reply */}
      {sendMutation.isPending && (
        <View style={styles.loadingReplyWrapper}>
          <TypingIndicator />
          <Text style={styles.loadingReplyText}>Le coach réfléchit...</Text>
        </View>
      )}

      {/* Footer Text Input Box */}
      <View style={styles.footerInputRow}>
        <TextInput
          placeholder="Posez votre question..."
          placeholderTextColor={theme.colors.textMuted}
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!inputText.trim() || sendMutation.isPending) && styles.sendBtnDisabled]}
          disabled={!inputText.trim() || sendMutation.isPending}
          onPress={handleSendMessage}>
          <Send size={18} color={theme.colors.white} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  promoText: {
    fontSize: theme.typography.sizes.sm + 1,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },
  disclaimerBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    paddingVertical: 8,
    paddingHorizontal: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#F59E0B',
  },
  disclaimerText: {
    color: '#B45309',
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
  },
  listPadding: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  emptyList: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: theme.spacing.xl,
  },
  coachAvatarLarge: {
    width: 64,
    height: 64,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  emptyTitle: {
    fontSize: theme.typography.sizes.md + 1,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  emptySubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    lineHeight: 20,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
    maxWidth: '85%',
  },
  messageRowCoach: {
    alignSelf: 'flex-start',
  },
  messageRowUser: {
    alignSelf: 'flex-end',
  },
  coachAvatar: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
    alignSelf: 'flex-end',
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: theme.spacing.sm,
    alignSelf: 'flex-end',
  },
  bubble: {
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
  },
  bubbleCoach: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderBottomLeftRadius: 2,
  },
  bubbleUser: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    borderBottomRightRadius: 2,
  },
  messageText: {
    fontSize: theme.typography.sizes.sm,
    lineHeight: 20,
  },
  messageTextCoach: {
    color: theme.colors.text,
  },
  messageTextUser: {
    color: theme.colors.white,
  },
  loadingReplyWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.round,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
    marginRight: theme.spacing.sm,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.primary,
    marginHorizontal: 2,
  },
  loadingReplyText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginLeft: 6,
  },
  footerInputRow: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F1F3F5',
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: theme.typography.sizes.sm + 1,
    color: theme.colors.text,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: theme.spacing.sm,
  },
  sendBtnDisabled: {
    backgroundColor: theme.colors.border,
  },
});

// End of file
