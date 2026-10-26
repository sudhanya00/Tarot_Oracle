// Account details, privacy policy, log out, and permanent account deletion.
import React, { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ExternalLink } from 'lucide-react-native';
import { useAuth } from '../context/AuthProvider';
import { useSub } from '../context/SubscriptionProvider';
import { deleteAccount } from '../lib/account';
import { formatTimeLeft } from '../lib/plans';
import { PRIVACY_POLICY_URL } from '../lib/profile';
import { colors, fonts, radii, type } from '../theme';
import BottomSheet from './magic/BottomSheet';
import GlowButton from './magic/GlowButton';
import PressableScale from './magic/PressableScale';

type Props = {
  visible: boolean;
  onClose: () => void;
  onLogout: () => void;
  // Called once the account is gone and the user is signed out.
  onDeleted: () => void;
};

export default function AccountSheet({ visible, onClose, onLogout, onDeleted }: Props) {
  const { user, signOutAsync } = useAuth();
  const { entitlement } = useSub();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setConfirming(false);
    setError(null);
  }, [visible]);

  let planLabel = 'Free';
  if (entitlement.active && entitlement.plan === 'month') planLabel = 'Monthly';
  else if (entitlement.active && entitlement.expiresAt) planLabel = `Day Pass, ${formatTimeLeft(entitlement.expiresAt)}`;
  else if (entitlement.active) planLabel = 'Unlimited';

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await deleteAccount();
      await signOutAsync().catch(() => undefined);
      onDeleted();
    } catch (err: any) {
      console.error('deleteAccount failed:', err);
      setError('We could not delete your account right now. Please try again in a moment.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={deleting ? () => undefined : onClose}>
      {confirming ? (
        <Animated.View entering={FadeIn.duration(250)} style={styles.section}>
          <Text style={[type.title, styles.title]}>Delete your account?</Text>
          <Text style={type.body}>
            This permanently deletes your account and all your readings. It can't be undone.
          </Text>
          {entitlement.active && entitlement.plan === 'month' && (
            <Text style={type.caption}>Your monthly plan will be cancelled and won't renew.</Text>
          )}
          {entitlement.active && entitlement.plan === 'day' && (
            <Text style={type.caption}>Time left on your Day Pass will be lost and isn't refunded.</Text>
          )}
          {error && <Text style={styles.error}>{error}</Text>}
          <PressableScale
            onPress={handleDelete}
            disabled={deleting}
            accessibilityRole="button"
            style={[styles.danger, deleting && { opacity: 0.6 }]}
          >
            <Text style={styles.dangerText}>{deleting ? 'Deleting…' : 'Delete permanently'}</Text>
          </PressableScale>
          <GlowButton variant="glass" label="Keep my account" onPress={() => setConfirming(false)} disabled={deleting} />
        </Animated.View>
      ) : (
        <View style={styles.section}>
          <Text style={[type.title, styles.title]}>Account</Text>

          <View style={styles.rows}>
            <View style={styles.row}>
              <Text style={type.caption}>Email</Text>
              <Text style={styles.value} numberOfLines={1}>
                {user?.email || 'Not available'}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={type.caption}>Plan</Text>
              <Text style={styles.value}>{planLabel}</Text>
            </View>
          </View>

          <Pressable
            onPress={() => Linking.openURL(PRIVACY_POLICY_URL).catch(() => undefined)}
            accessibilityRole="link"
            style={styles.link}
          >
            <Text style={styles.linkText}>Privacy Policy</Text>
            <ExternalLink size={15} color={colors.moon} />
          </Pressable>

          <GlowButton variant="glass" label="Log out" onPress={onLogout} />

          <Pressable onPress={() => setConfirming(true)} accessibilityRole="button" style={styles.deleteLink} hitSlop={8}>
            <Text style={styles.deleteLinkText}>Delete account</Text>
          </Pressable>
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  section: { gap: 14 },
  title: { marginTop: 4, paddingRight: 40 },
  rows: {
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    backgroundColor: colors.glass,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  value: { flexShrink: 1, fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.text },
  link: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingVertical: 2 },
  linkText: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.moon },
  deleteLink: { alignSelf: 'center', paddingVertical: 6 },
  deleteLinkText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.danger },
  danger: {
    minHeight: 54,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(240, 138, 138, 0.14)',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  dangerText: { fontFamily: fonts.bodySemi, fontSize: 18, color: colors.danger },
  error: { fontFamily: fonts.body, fontSize: 15, color: colors.danger },
});
