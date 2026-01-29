import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
// @ts-ignore: getReactNativePersistence is not correctly typed in all versions
import { initializeAuth, getReactNativePersistence, getAuth, Auth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Robust initialization
let app: FirebaseApp;
let auth: Auth;

try {
    if (!getApps().length) {
        app = initializeApp(firebaseConfig);
        // Initialize Auth with persistence
        // @ts-ignore: getReactNativePersistence is compatible
        auth = initializeAuth(app, {
            persistence: getReactNativePersistence(AsyncStorage)
        });
    } else {
        app = getApp();
        auth = getAuth(app);
    }
} catch (error) {
    console.error("Firebase initialization error:", error);
    // Fallback to avoid crash, though app might not work
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
}

export { app, auth };
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export const CONFIG = {
    MAPS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    RAZORPAY_KEY_ID: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || ''
};
