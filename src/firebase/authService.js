import {
    signInWithPopup,
    GoogleAuthProvider,
    sendSignInLinkToEmail,
    isSignInWithEmailLink,
    signInWithEmailLink,
    signOut as firebaseSignOut,
    RecaptchaVerifier,
    signInWithPhoneNumber,
    onIdTokenChanged
} from "firebase/auth";
import { auth } from "../firebase";

// --- Google Sign In ---
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const signInWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (error) {
        console.error("Google Sign In Error:", error.code, error.message);
        throw error;
    }
};

// --- Email Link (Passwordless) ---
export const sendAuthLink = async (email) => {
    const actionCodeSettings = {
        // URL you want to redirect back to. The domain (www.example.com) for this
        // URL must be in the authorized domains list in the Firebase Console.
        url: `${window.location.origin}/#/auth/complete`, // Using HashRouter pattern if applicable
        handleCodeInApp: true,
    };

    try {
        await sendSignInLinkToEmail(auth, email, actionCodeSettings);
        // Securely store email for completion flow
        window.localStorage.setItem('emailForSignIn', email);
        return true;
    } catch (error) {
        console.error("Email Link Error:", error.code, error.message);
        throw error;
    }
};

export const completeEmailAuth = async () => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
        let email = window.localStorage.getItem('emailForSignIn');
        if (!email) {
            // User opened link on different device. Ask for email.
            email = window.prompt("Please provide your email for confirmation");
        }
        try {
            const result = await signInWithEmailLink(auth, email, window.location.href);
            window.localStorage.removeItem('emailForSignIn');
            return result.user;
        } catch (error) {
            console.error("Complete Auth Error:", error.code, error.message);
            throw error;
        }
    }
    return null;
};

// --- Phone Auth ---
export const initRecaptcha = (containerId) => {
    if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
            'size': 'invisible', // or 'normal'
            'callback': (response) => {
                // reCAPTCHA solved, allow signInWithPhoneNumber.
            },
            'expired-callback': () => {
                // Response expired. Ask user to solve reCAPTCHA again.
            }
        });
    }
    return window.recaptchaVerifier;
};

export const sendPhoneOtp = async (phoneNumber, appVerifier) => {
    try {
        // phoneNumber must be E.164 format (e.g. +919999999999)
        const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
        return confirmationResult;
    } catch (error) {
        console.error("SMS Error:", error.code, error.message);
        // Common errors: auth/invalid-phone-number, auth/too-many-requests
        throw error;
    }
};

// --- General ---
export const logout = () => firebaseSignOut(auth);

// Force refresh ID token (useful after admin claim updates)
export const refreshUserClaims = async (user) => {
    return await user.getIdTokenResult(true);
};
