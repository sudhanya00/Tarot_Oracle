// src/lib/account.ts
import { Platform } from 'react-native';
import { isMock } from './env';

// Permanently deletes the signed-in account via the deleteAccount Cloud Function, which
// cancels any monthly plan and removes the user's readings, profile and login.
export async function deleteAccount(): Promise<void> {
  if (isMock()) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return;
  }

  if (Platform.OS === 'web') {
    const { getFunctions, httpsCallable } = await import('firebase/functions');
    const { initializeFirebase } = await import('./firebase-config');
    const { app } = await initializeFirebase();
    await httpsCallable(getFunctions(app), 'deleteAccount')({});
    return;
  }

  const functions = (await import('@react-native-firebase/functions')).default;
  await functions().httpsCallable('deleteAccount')({});
}
