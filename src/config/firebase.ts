import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBNirZ0j_WkZbv-Lh2YAimspyek3_qsrOY",
  authDomain: "tubel-2922e.firebaseapp.com",
  projectId: "tubel-2922e",
  storageBucket: "tubel-2922e.firebasestorage.app",
  messagingSenderId: "372267443690",
  appId: "1:372267443690:web:8b0fe50f675873ba2bbe93",
  measurementId: "G-4TX956NJBJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
 