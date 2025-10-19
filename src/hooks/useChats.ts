import { Platform } from 'react-native';
import { isToday, isYesterday } from 'date-fns';
import { isMock } from '../lib/env';

export type Msg = { role: 'user' | 'assistant'; content: string; ts: number };
export type Chat = {
  id: string;
  title?: string;
  createdAt?: any;
  updatedAt?: any;
  messages?: Msg[]; // we store only the last 25 to keep costs tiny
};

const CAP = 25;

// Mock chat storage for testing
const mockChats: Record<string, Record<string, Chat>> = {};

// Helper to get Firestore reference (platform-specific)
async function getFirestore() {
  if (Platform.OS === 'web') {
    const { initializeFirebase } = await import('../lib/firebase-config');
    const { db } = await initializeFirebase();
    return db;
  } else {
    // Mobile: Use React Native Firebase
    const firestore = (await import('@react-native-firebase/firestore')).default;
    return firestore();
  }
}

export async function ensureChat(uid: string, chatId?: string): Promise<string> {
  console.log('ensureChat called, uid:', uid, 'chatId:', chatId);
  
  if (chatId) {
    console.log('ensureChat: Using existing chatId:', chatId);
    return chatId;
  }

  if (isMock()) {
    const id = `mock-chat-${Date.now()}`;
    console.log('ensureChat: Mock mode, creating chat:', id);
    if (!mockChats[uid]) mockChats[uid] = {};
    mockChats[uid][id] = {
      id,
      title: 'New Reading',
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: []
    };
    return id;
  }

  try {
    if (Platform.OS === 'web') {
      // Web: Use Firebase Web SDK
      console.log('ensureChat: Web platform, creating chat in Firestore');
      const { collection, doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const { initializeFirebase } = await import('../lib/firebase-config');
      const { db } = await initializeFirebase();

      if (!db) throw new Error('Firebase not available');

      const ref = doc(collection(db, 'users', uid, 'chats'));
      await setDoc(ref, { createdAt: serverTimestamp(), updatedAt: serverTimestamp(), title: 'New Reading', messages: [] }, { merge: true });
      console.log('ensureChat: Web chat created with ID:', ref.id);
      return ref.id;
    } else {
      // Mobile: Use React Native Firebase
      console.log('ensureChat: Mobile platform, creating chat in Firestore');
      const firestore = (await import('@react-native-firebase/firestore')).default;
      const ref = firestore().collection('users').doc(uid).collection('chats').doc();
      const chatId = ref.id; // Store ID before async operation
      
      const chatData = {
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
        title: 'New Reading',
        messages: []
      };
      
      console.log('ensureChat: Setting chat data for ID:', chatId);
      
      // Set with timeout to prevent hanging
      const setPromise = ref.set(chatData, { merge: true });
      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 3000));
      
      try {
        await Promise.race([setPromise, timeoutPromise]);
        console.log('ensureChat: Mobile chat created with ID:', chatId);
      } catch (error) {
        console.warn('ensureChat: Set operation failed or timed out, but returning ID anyway:', error);
      }
      
      // Return the ID regardless of whether set succeeded
      return chatId;
    }
  } catch (error) {
    console.error('ensureChat: Error creating chat:', error);
    throw error;
  }
}

export async function saveMessages(uid: string, chatId: string, messages: Msg[]) {
  const trimmed = messages.slice(-CAP);

  if (isMock()) {
    if (!mockChats[uid]) mockChats[uid] = {};
    if (!mockChats[uid][chatId]) {
      mockChats[uid][chatId] = { id: chatId, title: 'New Reading', createdAt: new Date(), updatedAt: new Date(), messages: [] };
    }
    mockChats[uid][chatId].messages = trimmed;
    mockChats[uid][chatId].updatedAt = new Date();
    return;
  }

  if (Platform.OS === 'web') {
    // Web: Firebase Web SDK
    const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
    const { initializeFirebase } = await import('../lib/firebase-config');
    const { db } = await initializeFirebase();

    if (!db) return;

    const ref = doc(db, 'users', uid, 'chats', chatId);
    await setDoc(ref, { messages: trimmed, updatedAt: serverTimestamp() }, { merge: true });
  } else {
    // Mobile: React Native Firebase
    const firestore = (await import('@react-native-firebase/firestore')).default;
    await firestore()
      .collection('users').doc(uid)
      .collection('chats').doc(chatId)
      .set({ messages: trimmed, updatedAt: firestore.FieldValue.serverTimestamp() }, { merge: true });
  }
}

// helper to append a message without extra reads (you should pass current local messages)
export async function appendMessage(uid: string, chatId: string, current: Msg[], next: Msg) {
  console.log('appendMessage: START - role:', next.role, 'chatId:', chatId);
  const updated = [...current, next].slice(-CAP);

  if (isMock()) {
    console.log('appendMessage: Mock mode');
    if (!mockChats[uid]) mockChats[uid] = {};
    if (!mockChats[uid][chatId]) {
      mockChats[uid][chatId] = { id: chatId, title: 'New Reading', createdAt: new Date(), updatedAt: new Date(), messages: [] };
    }
    mockChats[uid][chatId].messages = updated;
    mockChats[uid][chatId].updatedAt = new Date();
    console.log('appendMessage: Mock complete');
    return;
  }

  try {
    if (Platform.OS === 'web') {
      console.log('appendMessage: Web platform');
      // Web: Firebase Web SDK
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const { initializeFirebase } = await import('../lib/firebase-config');
      const { db } = await initializeFirebase();
      if (!db) {
        console.warn('appendMessage: No DB available');
        return;
      }
      const ref = doc(db, 'users', uid, 'chats', chatId);
      await setDoc(ref, { messages: updated, updatedAt: serverTimestamp() }, { merge: true });
      console.log('appendMessage: Web complete');
    } else {
      console.log('appendMessage: Mobile platform - attempting Firestore write');
      // Mobile: React Native Firebase with timeout
      const firestore = (await import('@react-native-firebase/firestore')).default;
      
      const setPromise = firestore()
        .collection('users').doc(uid)
        .collection('chats').doc(chatId)
        .set({ messages: updated, updatedAt: firestore.FieldValue.serverTimestamp() }, { merge: true });
      
      const timeoutPromise = new Promise((resolve) => setTimeout(() => {
        console.warn('appendMessage: Firestore write timeout after 3 seconds');
        resolve(null);
      }, 3000));
      
      await Promise.race([setPromise, timeoutPromise]);
      console.log('appendMessage: Mobile complete (or timed out)');
    }
  } catch (error) {
    console.error('appendMessage: Error:', error);
    // Don't throw - allow app to continue
  }
}

export async function setTitleFromAssistant(uid: string, chatId: string, assistantText: string) {
  console.log('setTitleFromAssistant: START - chatId:', chatId);
  const words = assistantText.split(/\s+/).slice(0, 4);
  const title = words.join(' ') + (words.length < 4 ? '' : '…');
  console.log('setTitleFromAssistant: Title:', title);

  if (isMock()) {
    console.log('setTitleFromAssistant: Mock mode');
    if (mockChats[uid]?.[chatId]) {
      mockChats[uid][chatId].title = title;
    }
    console.log('setTitleFromAssistant: Mock complete');
    return;
  }

  try {
    if (Platform.OS === 'web') {
      console.log('setTitleFromAssistant: Web platform');
      // Web: Firebase Web SDK
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const { initializeFirebase } = await import('../lib/firebase-config');
      const { db } = await initializeFirebase();
      if (!db) {
        console.warn('setTitleFromAssistant: No DB available');
        return;
      }
      const ref = doc(db, 'users', uid, 'chats', chatId);
      await setDoc(ref, { title, updatedAt: serverTimestamp() }, { merge: true });
      console.log('setTitleFromAssistant: Web complete');
    } else {
      console.log('setTitleFromAssistant: Mobile platform');
      // Mobile: React Native Firebase with timeout
      const firestore = (await import('@react-native-firebase/firestore')).default;
      
      const setPromise = firestore()
        .collection('users').doc(uid)
        .collection('chats').doc(chatId)
        .set({ title, updatedAt: firestore.FieldValue.serverTimestamp() }, { merge: true });
      
      const timeoutPromise = new Promise((resolve) => setTimeout(() => {
        console.warn('setTitleFromAssistant: Firestore write timeout after 3 seconds');
        resolve(null);
      }, 3000));
      
      await Promise.race([setPromise, timeoutPromise]);
      console.log('setTitleFromAssistant: Mobile complete (or timed out)');
    }
  } catch (error) {
    console.error('setTitleFromAssistant: Error:', error);
    // Don't throw - allow app to continue
  }
}

export async function loadChat(uid: string, chatId: string): Promise<Chat | null> {
  if (isMock()) {
    return mockChats[uid]?.[chatId] ?? null;
  }

  if (Platform.OS === 'web') {
    // Web: Firebase Web SDK
    const { doc, getDoc } = await import('firebase/firestore');
    const { initializeFirebase } = await import('../lib/firebase-config');
    const { db } = await initializeFirebase();
    if (!db) return null;
    const ref = doc(db, 'users', uid, 'chats', chatId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as any) } as Chat;
  } else {
    // Mobile: React Native Firebase
    const firestore = (await import('@react-native-firebase/firestore')).default;
    const snap = await firestore()
      .collection('users').doc(uid)
      .collection('chats').doc(chatId)
      .get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() } as Chat;
  }
}

export async function listChats(uid: string): Promise<Chat[]> {
  if (isMock()) {
    const arr = Object.values(mockChats[uid] ?? {});
    return arr.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  if (Platform.OS === 'web') {
    // Web: Firebase Web SDK
    const { collection, query, orderBy, getDocs } = await import('firebase/firestore');
    const { initializeFirebase } = await import('../lib/firebase-config');
    const { db } = await initializeFirebase();
    if (!db) return [];
    const ref = collection(db, 'users', uid, 'chats');
    const q = query(ref, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Chat[];
  } else {
    // Mobile: React Native Firebase
    const firestore = (await import('@react-native-firebase/firestore')).default;
    const snap = await firestore()
      .collection('users').doc(uid)
      .collection('chats')
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Chat[];
  }
}

export async function deleteChat(uid: string, chatId: string): Promise<void> {
  console.log('deleteChat: START - chatId:', chatId);
  
  if (isMock()) {
    console.log('deleteChat: Mock mode');
    if (mockChats[uid]?.[chatId]) {
      delete mockChats[uid][chatId];
    }
    console.log('deleteChat: Mock complete');
    return;
  }

  try {
    if (Platform.OS === 'web') {
      console.log('deleteChat: Web platform');
      const { doc, deleteDoc } = await import('firebase/firestore');
      const { initializeFirebase } = await import('../lib/firebase-config');
      const { db } = await initializeFirebase();
      if (!db) {
        console.warn('deleteChat: No DB available');
        return;
      }
      const ref = doc(db, 'users', uid, 'chats', chatId);
      await deleteDoc(ref);
      console.log('deleteChat: Web complete');
    } else {
      console.log('deleteChat: Mobile platform');
      const firestore = (await import('@react-native-firebase/firestore')).default;
      
      const deletePromise = firestore()
        .collection('users').doc(uid)
        .collection('chats').doc(chatId)
        .delete();
      
      const timeoutPromise = new Promise((resolve) => setTimeout(() => {
        console.warn('deleteChat: Firestore delete timeout after 3 seconds');
        resolve(null);
      }, 3000));
      
      await Promise.race([deletePromise, timeoutPromise]);
      console.log('deleteChat: Mobile complete (or timed out)');
    }
  } catch (error) {
    console.error('deleteChat: Error:', error);
    throw error;
  }
}
