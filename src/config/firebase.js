import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

// Firebase configuration
// In production, these are loaded from environment variables (VITE_FIREBASE_*)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDTzoSwAKfZuacWsKxxAPFpUM1fzoi5cSw',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'chat-app-a1381.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'chat-app-a1381',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'chat-app-a1381.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '10935160905',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:10935160905:web:ad288d4dd5747cd9fa6f98',
};

// Initialize Firebase App safely (singleton pattern)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

/**
 * Trigger Firebase Google Sign-In with Popup
 * Returns user details and ID token
 */
export const signInWithGooglePopup = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const idToken = await user.getIdToken();

    return {
      success: true,
      user: {
        email: user.email,
        name: user.displayName || user.email.split('@')[0],
        avatar: user.photoURL || '',
        googleId: user.uid,
      },
      credential: idToken,
    };
  } catch (error) {
    console.warn('Firebase Google Auth Popup Warning/Error:', error.code, error.message);
    throw error;
  }
};

/**
 * Firebase Sign Out
 */
export const firebaseSignOut = async () => {
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('Firebase signOut error:', err);
  }
};

export default app;

