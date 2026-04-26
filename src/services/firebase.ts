import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

export interface UserProfile {
  uid: string;
  name: string;
  preferences: {
    roastLevel: 'low' | 'medium' | 'high';
    favoriteTopics: string[];
  };
  createdAt?: any;
  updatedAt?: any;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const docRef = doc(db, "userProfiles", uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as UserProfile;
  }
  return null;
}

export async function createUserProfile(user: User, name: string): Promise<UserProfile> {
  const profile: UserProfile = {
    uid: user.uid,
    name: name,
    preferences: {
      roastLevel: 'high',
      favoriteTopics: []
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  await setDoc(doc(db, "userProfiles", user.uid), profile);
  return profile;
}

export async function updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
  const docRef = doc(db, "userProfiles", uid);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
}

export async function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}
