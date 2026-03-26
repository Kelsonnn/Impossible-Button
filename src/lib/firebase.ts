import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
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

export async function fetchSubmissions(password: string): Promise<Submission[]> {
  try {
    const response = await fetch('/api/admin/submissions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch submissions');
    }

    const data = await response.json();
    return data.map((sub: any) => ({
      ...sub,
      timestamp: sub.timestamp ? {
        toDate: () => new Date(sub.timestamp.seconds * 1000 + sub.timestamp.nanoseconds / 1000000)
      } : null
    }));
  } catch (error) {
    console.error('Error fetching submissions:', error);
    throw error;
  }
}

export { onAuthStateChanged, signInWithPopup };
export type { User };
