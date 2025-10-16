import Constants from "expo-constants";
import { Platform } from 'react-native';

// Platform-specific Firebase initialization
let app: any = null;
let auth: any = null;
let db: any = null;
let isInitialized = false;
let initPromise: Promise<any> | null = null;

const getFirebaseConfig = () => {
  const extra = Constants.expoConfig?.extra;
  if (!extra) {
    console.warn('Expo configuration is not available');
    return null;
  }

  return {
    apiKey: extra.FIREBASE_API_KEY,
    authDomain: extra.FIREBASE_AUTH_DOMAIN,
    projectId: extra.FIREBASE_PROJECT_ID,
    storageBucket: extra.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: extra.FIREBASE_MESSAGING_SENDER_ID,
    appId: Platform.select({
      ios: extra.FIREBASE_APP_ID_IOS,
      android: extra.FIREBASE_APP_ID_ANDROID,
      default: extra.FIREBASE_APP_ID_WEB,
    }),
    measurementId: extra.FIREBASE_MEASUREMENT_ID,
  };
};

export async function initializeFirebase() {
  // Return existing instance if already initialized
  if (isInitialized && app && auth && db) {
    // For web, always get fresh auth instance to ensure it's not stale
    if (Platform.OS === 'web') {
      const { getAuth } = await import('firebase/auth');
      const freshAuth = getAuth(app);
      return { app, auth: freshAuth, db };
    }
    
    return { app, auth, db };
  }

  // If initialization is in progress, wait for it
  if (initPromise) {
    return initPromise;
  }

  // Start new initialization
  initPromise = (async () => {
    try {
      if (Platform.OS === 'web') {
        // Web: Use Firebase Web SDK
        const config = getFirebaseConfig();
        if (!config) {
          throw new Error('Firebase configuration is not available');
        }

        const { initializeApp, getApps } = await import('firebase/app');
        const { initializeAuth, browserLocalPersistence } = await import('firebase/auth');
        const { getFirestore } = await import('firebase/firestore');

        // Initialize app if not already done
        const apps = getApps();
        if (apps.length === 0) {
          app = initializeApp(config);
        } else {
          app = apps[0];
        }

        // Initialize auth with browserLocalPersistence
        if (!auth) {
          try {
            auth = initializeAuth(app, {
              persistence: browserLocalPersistence,
            });
          } catch (error: any) {
            // If auth is already initialized, get the existing instance
            if (error.code === 'auth/already-initialized') {
              const { getAuth } = await import('firebase/auth');
              auth = getAuth(app);
            } else {
              throw error;
            }
          }
        } else {
          // Auth exists, make sure we have the right instance
          const { getAuth } = await import('firebase/auth');
          auth = getAuth(app);
        }
        
        if (!db) {
          db = getFirestore(app);
        }
      } else {
        // Mobile: Use React Native Firebase (native modules)
        const rnfAuth = await import('@react-native-firebase/auth');
        const rnfFirestore = await import('@react-native-firebase/firestore');

        // React Native Firebase auto-initializes from google-services.json
        auth = rnfAuth.default();
        db = rnfFirestore.default();
        app = { name: '[DEFAULT]' };
      }

      isInitialized = true;
      return { app, auth, db };
    } catch (error) {
      console.error("Error initializing Firebase:", error);
      initPromise = null; // Reset on error
      throw error;
    }
  })();

  return initPromise;
}
