import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Test connection and seed data if missing
export const initFirebase = async () => {
  try {
    const docRef = doc(db, 'worldState', 'current');
    const snapshot = await getDoc(docRef);
    
    if (!snapshot.exists()) {
      console.log('Seeding initial world state...');
      await setDoc(docRef, {
        multiplier: 1,
        announcement: "",
        type: "none",
        active: false,
        endTime: 0
      });
    }
    console.log('Firebase connected and ready');
  } catch (error) {
    // If we hit a connectivity issue, we don't want to crash the whole app
    console.warn('Firebase silent warning (init):', error.message);
  }
};
