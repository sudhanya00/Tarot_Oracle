// src/lib/profile.ts
// Per-user flags stored on users/{uid}: privacy policy consent and display name.
import { Platform } from 'react-native';
import { isMock } from './env';

export const PRIVACY_POLICY_URL = 'https://tarotoracleapp.com/privacy-policy/';

// Mock mode keeps profiles in memory so the consent flow can be exercised without Firebase.
const mockProfiles: Record<string, Record<string, any>> = {};

async function readProfile(uid: string): Promise<Record<string, any> | undefined> {
  if (isMock()) return mockProfiles[uid];

  if (Platform.OS === 'web') {
    const { doc, getDoc } = await import('firebase/firestore');
    const { initializeFirebase } = await import('./firebase-config');
    const { db } = await initializeFirebase();
    if (!db) return undefined;
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? snap.data() : undefined;
  }

  const firestore = (await import('@react-native-firebase/firestore')).default;
  const snap = await firestore().collection('users').doc(uid).get();
  return snap.exists ? snap.data() : undefined;
}

// Merges fields into users/{uid}, creating it if the auth listener hasn't yet.
async function writeProfile(uid: string, fields: Record<string, any>, stampField?: string): Promise<void> {
  if (isMock()) {
    mockProfiles[uid] = { ...mockProfiles[uid], ...fields, ...(stampField ? { [stampField]: Date.now() } : null) };
    return;
  }

  if (Platform.OS === 'web') {
    const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
    const { initializeFirebase } = await import('./firebase-config');
    const { db } = await initializeFirebase();
    if (!db) throw new Error('Firebase not available');
    await setDoc(
      doc(db, 'users', uid),
      { ...fields, ...(stampField ? { [stampField]: serverTimestamp() } : null) },
      { merge: true }
    );
    return;
  }

  const firestore = (await import('@react-native-firebase/firestore')).default;
  await firestore()
    .collection('users')
    .doc(uid)
    .set(
      { ...fields, ...(stampField ? { [stampField]: firestore.FieldValue.serverTimestamp() } : null) },
      { merge: true }
    );
}

export async function hasAcceptedPrivacyPolicy(uid: string): Promise<boolean> {
  try {
    return (await readProfile(uid))?.privacyPolicyAccepted === true;
  } catch (error) {
    console.error('hasAcceptedPrivacyPolicy: Error:', error);
    return false;
  }
}

export async function acceptPrivacyPolicy(uid: string): Promise<void> {
  await writeProfile(uid, { privacyPolicyAccepted: true }, 'privacyPolicyAcceptedAt');
}

export async function saveDisplayName(uid: string, name: string): Promise<void> {
  try {
    await writeProfile(uid, { name });
  } catch (error) {
    // The account exists either way; a missing name shouldn't block sign-up.
    console.error('saveDisplayName: Error:', error);
  }
}
