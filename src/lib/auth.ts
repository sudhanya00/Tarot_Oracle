import { Platform } from 'react-native';
import { isMock } from './env';

// Updated auth with proper error handling for React Native Firebase
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

// Mock user store for persistent mock auth
const mockUsers: Record<string, AuthUser> = {};

export async function emailSignIn(email: string, password: string): Promise<{ user: AuthUser }> {
  if (isMock()) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const user = mockUsers[email];
    if (!user) {
      throw new Error('Auth: User not found');
    }
    return { user };
  }

  try {
    const { initializeFirebase } = await import('./firebase-config');
    const { auth } = await initializeFirebase();

    if (Platform.OS === 'web') {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const userCredential = await signInWithEmailAndPassword(auth!, email, password);
      return { user: userCredential.user };
    } else {
      // React Native Firebase
      const result = await auth.signInWithEmailAndPassword(email, password);
      return { user: result.user };
    }
  } catch (error: any) {
    // Handle Firebase error codes
    const errorMessage = (error && (error.message || String(error))) || String(error);
    if (error?.code === 'auth/user-not-found' || errorMessage.includes('user-not-found')) {
      throw new Error('No account found with this email.');
    } else if (error.code === 'auth/wrong-password' || errorMessage.includes('wrong-password')) {
      throw new Error('Incorrect password.');
    } else if (error.code === 'auth/invalid-email' || errorMessage.includes('invalid-email')) {
      throw new Error('Invalid email address.');
    } else if (error.code === 'auth/user-disabled' || errorMessage.includes('user-disabled')) {
      throw new Error('This account has been disabled.');
    }
    throw new Error(errorMessage);
  }
}

export async function emailSignUp(email: string, password: string): Promise<{ user: AuthUser }> {
  if (isMock()) {
    await new Promise(resolve => setTimeout(resolve, 500));
    if (mockUsers[email]) {
      throw new Error('Auth: Email already in use');
    }
    const user: AuthUser = {
      uid: `mock-${Date.now()}`,
      email,
      displayName: email.split('@')[0],
      photoURL: null
    };
    mockUsers[email] = user;
    return { user };
  }

  try {
    const { initializeFirebase } = await import('./firebase-config');
    const { auth } = await initializeFirebase();

    if (Platform.OS === 'web') {
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      const userCredential = await createUserWithEmailAndPassword(auth!, email, password);
      return { user: userCredential.user };
    } else {
      // React Native Firebase
      const result = await auth.createUserWithEmailAndPassword(email, password);
      return { user: result.user };
    }
  } catch (error: any) {
    // Handle Firebase error codes
    console.log('emailSignUp error:', error);
    console.log('Error code:', error?.code);
    console.log('Error message:', error?.message || String(error));
    const errorMessage = (error && (error.message || String(error))) || String(error);
    if (error?.code === 'auth/email-already-in-use' || errorMessage.includes('email-already-in-use')) {
      throw new Error('This email is already registered. Please log in.');
    } else if (error.code === 'auth/weak-password' || errorMessage.includes('weak-password')) {
      throw new Error('Password should be at least 6 characters.');
    } else if (error.code === 'auth/invalid-email' || errorMessage.includes('invalid-email')) {
      throw new Error('Invalid email address.');
    }
    throw new Error(errorMessage);
  }
}

export async function forgotPassword(email: string): Promise<void> {
  if (isMock()) {
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('Mock: Password reset email sent to', email);
    return;
  }

  const { initializeFirebase } = await import('./firebase-config');
  const { auth } = await initializeFirebase();
  
  if (Platform.OS === 'web') {
    const { sendPasswordResetEmail } = await import('firebase/auth');
    if (auth) {
      await sendPasswordResetEmail(auth, email);
    }
  } else {
    // React Native Firebase
    if (auth) {
      await auth.sendPasswordResetEmail(email);
    }
  }
}

export async function signInWithGoogleAsync(): Promise<AuthUser> {
  if (isMock()) {
    await new Promise(resolve => setTimeout(resolve, 800));
    const mockEmail = 'mock@google.test';
    if (!mockUsers[mockEmail]) {
      mockUsers[mockEmail] = {
        uid: 'mock-google',
        email: mockEmail,
        displayName: 'Mock Google User',
        photoURL: 'https://lh3.googleusercontent.com/a/mock-photo'
      };
    }
    return mockUsers[mockEmail];
  }

  try {
    const { initializeFirebase } = await import('./firebase-config');
    const { auth } = await initializeFirebase();
    
    if (Platform.OS === 'web') {
      // Web: Use Firebase Web SDK popup
      const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
      
      if (!auth) {
        throw new Error('Firebase Auth is not initialized');
      }
      
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      return result.user;
    } else {
      // Mobile: Use React Native Firebase with Google Sign In
      const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
      const rnfAuth = await import('@react-native-firebase/auth');
      
      // Configure Google Sign In
      const Constants = await import('expo-constants');
      const webClientId = Constants.default.expoConfig?.extra?.GOOGLE_WEB_CLIENT_ID;
      
      if (!webClientId) {
        throw new Error('GOOGLE_WEB_CLIENT_ID not found in configuration');
      }
      
      GoogleSignin.configure({
        webClientId: webClientId,
        offlineAccess: true,
      });
      
      // Check Play Services
      try {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      } catch (error: any) {
        console.error('Play Services error:', error);
        throw new Error('Google Play Services not available or needs update');
      }
      
      // Get user info and ID token
      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult.data?.idToken;
      
      if (!idToken) {
        throw new Error('Failed to get ID token from Google Sign In');
      }
      
      // Create Firebase credential
      const googleCredential = rnfAuth.default.GoogleAuthProvider.credential(idToken);
      
      // Sign in to Firebase
      const userCredential = await auth.signInWithCredential(googleCredential);
      return userCredential.user;
    }
  } catch (error: any) {
    console.error('Error during Google sign in:', error);
    throw error;
  }
}

export async function signInWithAppleAsync(): Promise<AuthUser> {
  if (isMock()) {
    // Mock Apple sign-in for testing
    await new Promise(resolve => setTimeout(resolve, 800));

    const mockEmail = 'mock@apple.test';
    if (!mockUsers[mockEmail]) {
      mockUsers[mockEmail] = {
        uid: 'mock-apple',
        email: mockEmail,
        displayName: 'Mock Apple User',
        photoURL: null
      };
    }
    return mockUsers[mockEmail];
  }

  if (Platform.OS !== 'ios') {
    throw new Error('Apple Sign In is only available on iOS.');
  }

  // iOS: Sign in with Apple, then exchange Apple's identity token for a Firebase session.
  try {
    const AppleAuthentication = await import('expo-apple-authentication');
    const Crypto = await import('expo-crypto');
    const rnfAuth = await import('@react-native-firebase/auth');
    const { initializeFirebase } = await import('./firebase-config');
    const { auth } = await initializeFirebase();

    // Apple receives the hashed nonce; Firebase checks it against the raw one.
    const rawNonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    if (!credential.identityToken) {
      throw new Error('Apple Sign In did not return an identity token');
    }

    const appleCredential = rnfAuth.default.AppleAuthProvider.credential(credential.identityToken, rawNonce);
    const userCredential = await auth.signInWithCredential(appleCredential);

    // Apple only shares the name on the first sign-in, so keep it on the Firebase profile.
    const fullName = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(' ');
    if (fullName && !userCredential.user.displayName) {
      await userCredential.user.updateProfile({ displayName: fullName });
    }

    return userCredential.user;
  } catch (error: any) {
    if (error?.code === 'ERR_REQUEST_CANCELED' || error?.code === 'ERR_CANCELED') {
      throw new Error('Apple Sign In was cancelled');
    }
    console.error('Error during Apple sign in:', error);
    throw error;
  }
}

// Firebase ID token for the signed-in user, sent to Cloud Functions that check who's calling.
export async function getIdToken(): Promise<string | null> {
  if (isMock()) return null;
  const { initializeFirebase } = await import('./firebase-config');
  const { auth } = await initializeFirebase();
  const current = auth?.currentUser;
  return current ? current.getIdToken() : null;
}
