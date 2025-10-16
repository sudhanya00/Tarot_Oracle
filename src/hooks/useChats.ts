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

// Mock chat storage for mobile testing
const mockChats: Record<string, Record<string, Chat>> = {};

export async function ensureChat(uid: string, chatId?: string): Promise<string> {
  if (chatId) return chatId;

  if (isMock() || Platform.OS !== 'web') {
    // Mock mode: create a simple in-memory chat
    const id = `mock-chat-${Date.now()}`;
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

  // Web only - dynamic import Firebase
  const { collection, doc, setDoc, serverTimestamp } = await import('firebase/firestore');
  const { initializeFirebase } = await import('../lib/firebase-config');
  const { db } = await initializeFirebase();

  if (!db) throw new Error('Firebase not available');

  // Create a new chat doc with empty messages
  const ref = doc(collection(db, 'users', uid, 'chats'));
  await setDoc(ref, { createdAt: serverTimestamp(), updatedAt: serverTimestamp(), title: 'New Reading', messages: [] }, { merge: true });
  return ref.id;
}

export async function saveMessages(uid: string, chatId: string, messages: Msg[]) {
  const trimmed = messages.slice(-CAP);

  if (isMock() || Platform.OS !== 'web') {
    if (!mockChats[uid]) mockChats[uid] = {};
    if (!mockChats[uid][chatId]) {
      mockChats[uid][chatId] = { id: chatId, title: 'New Reading', createdAt: new Date(), updatedAt: new Date(), messages: [] };
    }
    mockChats[uid][chatId].messages = trimmed;
    mockChats[uid][chatId].updatedAt = new Date();
    return;
  }

  // Web only - dynamic import Firebase
  const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
  const { initializeFirebase } = await import('../lib/firebase-config');
  const { db } = await initializeFirebase();

  if (!db) return;

  const ref = doc(db, 'users', uid, 'chats', chatId);
  await setDoc(ref, { messages: trimmed, updatedAt: serverTimestamp() }, { merge: true });
}

// helper to append a message without extra reads (you should pass current local messages)
export async function appendMessage(uid: string, chatId: string, current: Msg[], next: Msg) {
  const msgs = [...current, next].slice(-CAP);

  if (isMock() || Platform.OS !== 'web') {
    if (!mockChats[uid]) mockChats[uid] = {};
    if (!mockChats[uid][chatId]) {
      mockChats[uid][chatId] = { id: chatId, title: 'New Reading', createdAt: new Date(), updatedAt: new Date(), messages: [] };
    }
    mockChats[uid][chatId].messages = msgs;
    mockChats[uid][chatId].updatedAt = new Date();
    return msgs;
  }

  // Web only - dynamic import Firebase
  const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
  const { initializeFirebase } = await import('../lib/firebase-config');
  const { db } = await initializeFirebase();

  if (!db) return msgs;

  await setDoc(doc(db, 'users', uid, 'chats', chatId), { messages: msgs, updatedAt: serverTimestamp() }, { merge: true });
  return msgs;
}

export async function setTitleFromAssistant(uid: string, chatId: string, assistantText: string) {
  const title = (assistantText.split('\n')[0] || 'Tarot Reading').slice(0, 40);

  if (isMock() || Platform.OS !== 'web') {
    if (mockChats[uid]?.[chatId]) {
      mockChats[uid][chatId].title = title;
    }
    return;
  }

  // Web only - dynamic import Firebase
  const { doc, setDoc } = await import('firebase/firestore');
  const { initializeFirebase } = await import('../lib/firebase-config');
  const { db } = await initializeFirebase();

  if (!db) return;

  const ref = doc(db, 'users', uid, 'chats', chatId);
  await setDoc(ref, { title }, { merge: true });
}

export async function loadChat(uid: string, chatId: string): Promise<Chat | null> {
  if (isMock() || Platform.OS !== 'web') {
    return mockChats[uid]?.[chatId] || null;
  }

  // Web only - dynamic import Firebase
  const { doc, getDoc } = await import('firebase/firestore');
  const { initializeFirebase } = await import('../lib/firebase-config');
  const { db } = await initializeFirebase();

  if (!db) return null;

  const snap = await getDoc(doc(db, 'users', uid, 'chats', chatId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) } as Chat;
}

export async function listChats(uid: string): Promise<Chat[]> {
  if (isMock() || Platform.OS !== 'web') {
    const userChats = mockChats[uid] || {};
    return Object.values(userChats).sort((a, b) => {
      const aTime = a.createdAt?.getTime?.() || 0;
      const bTime = b.createdAt?.getTime?.() || 0;
      return bTime - aTime;
    });
  }

  // Web only - dynamic import Firebase
  const { collection, query, orderBy, getDocs } = await import('firebase/firestore');
  const { initializeFirebase } = await import('../lib/firebase-config');
  const { db } = await initializeFirebase();

  if (!db) return [];

  const qs = query(collection(db, 'users', uid, 'chats'), orderBy('createdAt', 'desc'));
  const res = await getDocs(qs);
  return res.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Chat[];
}
