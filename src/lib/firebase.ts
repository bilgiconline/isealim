import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firestore with settings
const db = getFirestore(app);

// Initialize other services
const storage = getStorage(app);
const auth = getAuth(app);

// Storage için yardımcı fonksiyonlar
export const getStorageDownloadURL = async (path: string) => {
  const { ref, getDownloadURL } = await import('firebase/storage');
  return getDownloadURL(ref(storage, path));
};

export const uploadFileToStorage = async (file: File, path: string) => {
  const { ref, uploadBytes } = await import('firebase/storage');
  const storageRef = ref(storage, path);
  return uploadBytes(storageRef, file);
};

export { app, db, storage, auth }; 