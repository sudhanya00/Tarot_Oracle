import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { isMock } from '../lib/env';

// Only import Firebase types, not functions, to avoid initialization errors
type User = {
  uid: string;
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
} | null;

type Ctx = {
  user: User;
  loading: boolean;
  signOutAsync: () => Promise<void>;
};

const AuthCtx = createContext<Ctx>({ user: null, loading: true, signOutAsync: async () => {} });
export const useAuth = () => useContext(AuthCtx);

// Mock user for mobile testing
const mockUser: User = {
  uid: 'mock-user-id',
  email: 'mock@test.com',
  displayName: 'Mock User',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Use mock authentication only if MODE=mock
    if (isMock()) {
      console.log('Using mock authentication');
      setUser(mockUser);
      setLoading(false);
      return;
    }

    // Use real Firebase authentication
    let unsub: (() => void) | undefined;
    
    const initAuth = async () => {
      try {
        const { initializeFirebase } = await import('../lib/firebase-config');
        
        console.log('Initializing Firebase authentication...');
        const { auth, db } = await initializeFirebase();
        
        if (!auth || !db) {
          throw new Error('Firebase not initialized');
        }
        
        if (Platform.OS === 'web') {
          // Web: Use Firebase Web SDK
          const { onAuthStateChanged } = await import('firebase/auth');
          const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
          
          unsub = onAuthStateChanged(auth, async (u) => {
            try {
              console.log('Auth state changed:', u ? 'User logged in' : 'No user');
              setUser(u);
              setLoading(false);
              
              if (u && db) {
                await setDoc(
                  doc(db, 'users', u.uid),
                  {
                    uid: u.uid,
                    email: u.email || '',
                    updatedAt: serverTimestamp(),
                  },
                  { merge: true }
                );
              }
            } catch (e) {
              console.error('Error in auth state change handler:', e);
              setLoading(false);
            }
          });
        } else {
          // Mobile: Use React Native Firebase
          const rnfFirestore = await import('@react-native-firebase/firestore');
          
          unsub = auth.onAuthStateChanged(async (u: any) => {
            try {
              console.log('Auth state changed (RN):', u ? 'User logged in' : 'No user');
              setUser(u ? {
                uid: u.uid,
                email: u.email,
                displayName: u.displayName,
                photoURL: u.photoURL
              } : null);
              setLoading(false);
              
              if (u && db) {
                await db.collection('users').doc(u.uid).set({
                  uid: u.uid,
                  email: u.email || '',
                  updatedAt: rnfFirestore.default.FieldValue.serverTimestamp(),
                }, { merge: true });
              }
            } catch (e) {
              console.error('Error in auth state change handler:', e);
              setLoading(false);
            }
          });
        }
      } catch (e) {
        console.error('Error setting up auth listener:', e);
        setLoading(false);
      }
    };

    initAuth();
    
    return () => {
      if (unsub) unsub();
    };
  }, []);

  const signOutAsync = async () => {
    if (isMock()) {
      setUser(null);
      return;
    }
    
    const { initializeFirebase } = await import('../lib/firebase-config');
    const { auth } = await initializeFirebase();
    
    if (Platform.OS === 'web') {
      const { signOut } = await import('firebase/auth');
      if (auth) {
        await signOut(auth);
      }
    } else {
      // React Native Firebase
      if (auth) {
        await auth().signOut();
      }
    }
  };

  return (
    <AuthCtx.Provider value={{ user, loading, signOutAsync }}>
      {children}
    </AuthCtx.Provider>
  );
}
