import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
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

export async function fetchSubmissions(): Promise<Submission[]> {
  try {
    const q = query(collection(db, 'submissions'), orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Submission));
  } catch (error) {
    console.error('Error fetching submissions:', error);
    throw error;
  }
}

export { onAuthStateChanged, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword };
export type { User };
