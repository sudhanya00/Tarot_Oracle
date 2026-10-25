// Privacy policy consent, required before anyone reaches the dashboard,
// and the shared "where to go after sign-in" logic used by Login and Sign-up.
import React, { useCallback, useRef, useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, ExternalLink } from 'lucide-react-native';
import { useAuth } from '../context/AuthProvider';
import { useSub } from '../context/SubscriptionProvider';
import { acceptPrivacyPolicy, hasAcceptedPrivacyPolicy, PRIVACY_POLICY_URL } from '../lib/profile';
import { colors, fonts, type } from '../theme';
import CosmicBackground from './magic/CosmicBackground';
import GlowButton from './magic/GlowButton';
import { FloatingCard } from './magic/TarotCard';

type ModalProps = {
  visible: boolean;
  busy?: boolean;
  onAccept: () => void;
  onDecline: () => void;
};

export function PrivacyConsentModal({ visible, busy, onAccept, onDecline }: ModalProps) {
  const insets = useSafeAreaInsets();
  const [checked, setChecked] = useState(false);

  const openPolicy = () =>
    Linking.openURL(PRIVACY_POLICY_URL).catch((err) => console.error('Failed to open privacy policy URL:', err));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onDecline}>
      <CosmicBackground density="calm">
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 32, paddingBottom: 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <FloatingCard width={64} face="star" tilt={-4} amplitude={6} style={{ marginBottom: 6 }} />
          <Text style={type.title}>Privacy Policy</Text>
          <Text style={[type.body, styles.lead]}>
            Before you use Tarot Oracle, please read and accept our Privacy Policy.
          </Text>

          <Pressable onPress={openPolicy} accessibilityRole="link" style={styles.link}>
            <Text style={styles.linkText}>Read the full Privacy Policy</Text>
            <ExternalLink size={16} color={colors.moon} />
          </Pressable>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            onPress={() => setChecked((c) => !c)}
            style={styles.checkRow}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
          >
            <View style={[styles.box, checked && styles.boxOn]}>
              {checked && <Check size={15} color={colors.night} strokeWidth={3} />}
            </View>
            <Text style={[type.body, { flex: 1 }]}>I have read and accept the Privacy Policy</Text>
          </Pressable>
          <View style={styles.buttons}>
            <GlowButton label="Accept and continue" onPress={onAccept} disabled={!checked} loading={busy} />
            <GlowButton variant="glass" label="Decline" onPress={onDecline} disabled={busy} />
          </View>
        </View>
      </CosmicBackground>
    </Modal>
  );
}

// After any successful sign-in: go to the dashboard if the policy is accepted, otherwise
// ask for consent first. Declining signs the user back out.
export function useAuthRouting() {
  const navigation = useNavigation<any>();
  const { signOutAsync } = useAuth();
  const { refresh } = useSub();
  const [consentUid, setConsentUid] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const routing = useRef(false);

  const routeAfterAuth = useCallback(async (uid: string) => {
    if (routing.current) return;
    routing.current = true;
    try {
      if (await hasAcceptedPrivacyPolicy(uid)) {
        await refresh();
        navigation.replace('Dashboard');
      } else {
        setConsentUid(uid);
      }
    } finally {
      routing.current = false;
    }
  }, [navigation, refresh]);

  const accept = async () => {
    if (!consentUid) return;
    setSaving(true);
    try {
      await acceptPrivacyPolicy(consentUid);
      setConsentUid(null);
      await refresh();
      navigation.replace('Dashboard');
    } catch (error) {
      console.error('acceptPrivacyPolicy failed:', error);
      Alert.alert('Something went wrong', 'We could not save your choice. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const decline = async () => {
    setConsentUid(null);
    try {
      await signOutAsync();
    } catch (error) {
      console.error('signOut after decline failed:', error);
    }
    Alert.alert('Privacy Policy required', 'You need to accept the Privacy Policy to use Tarot Oracle.');
  };

  const consentModal = (
    <PrivacyConsentModal visible={!!consentUid} busy={saving} onAccept={accept} onDecline={decline} />
  );

  return { routeAfterAuth, consentModal };
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    gap: 16,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  lead: { color: colors.textMuted },
  link: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingVertical: 4 },
  linkText: { fontFamily: fonts.bodySemi, fontSize: 17, color: colors.moon, textDecorationLine: 'underline' },
  footer: {
    paddingHorizontal: 22,
    paddingTop: 14,
    gap: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
    backgroundColor: 'rgba(4, 5, 12, 0.7)',
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  box: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.hairlineGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  buttons: { gap: 10 },
});
