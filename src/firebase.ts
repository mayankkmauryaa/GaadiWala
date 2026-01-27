import { initializeApp, getApps, getApp } from 'firebase/app';
// import { getAnalytics } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

import { getEnvConfig } from './config/validateEnv';

const env = getEnvConfig();

const firebaseConfig = {
    apiKey: env.FIREBASE_API_KEY,
    authDomain: env.FIREBASE_AUTH_DOMAIN,
    databaseURL: env.FIREBASE_DATABASE_URL,
    projectId: env.FIREBASE_PROJECT_ID,
    storageBucket: env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID,
    appId: env.FIREBASE_APP_ID,
    measurementId: env.FIREBASE_MEASUREMENT_ID
};

// Robust initialization for Hot Reload environments
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
// const analytics = getAnalytics(app);

export const auth = getAuth(app);
auth.useDeviceLanguage();

// Initialize Firestore with robust multi-tab persistence support
// This helps prevent "Unexpected state (ID: ca9)" assertion errors during reloads
export const db = getFirestore(app);
// Optional: If the error persists, consider initializeFirestore with localCache settings
// But standard getFirestore(app) should work once duplicate App init is fixed.
export const storage = getStorage(app);
export const functions = getFunctions(app);

export const CONFIG = {
    MAPS_API_KEY: env.GOOGLE_MAPS_API_KEY || '',
    RAZORPAY_KEY_ID: env.RAZORPAY_KEY_ID || ''
};
