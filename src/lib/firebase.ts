import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// --- Types ---
export interface Submission {
  id?: string;
  userName: string;
  note?: string;
  preNote?: string;
  timestamp: Timestamp;
  isMessi?: boolean;
}

// --- Functions ---

export async function submitNote(userName: string, note: string, isMessi: boolean = false, preNote: string = '') {
  try {
    await addDoc(collection(db, 'submissions'), {
      userName,
      note,
      preNote,
      timestamp: serverTimestamp(),
      isMessi
    });
  } catch (error) {
    console.error('Error submitting note:', error);
    throw error;
  }
}

export async function adminLogin(password: string): Promise<void> {
  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unauthorized' }));
      throw new Error(errorData.error || 'Login failed');
    }

    const { token } = await response.json();
    await signInWithCustomToken(auth, token);
  } catch (error) {
    console.error('Admin login error:', error);
    throw error;
  }
}

export async function fetchSubmissionsClient(): Promise<Submission[]> {
  try {
    const q = query(collection(db, 'submissions'), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Submission));
  } catch (error) {
    console.error('Error fetching submissions client-side:', error);
    throw error;
  }
}

export { onAuthStateChanged, signInWithPopup };
export type { User };
