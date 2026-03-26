import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
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

export { onAuthStateChanged, signInWithPopup };
export type { User };
