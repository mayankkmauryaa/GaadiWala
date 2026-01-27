import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    RecaptchaVerifier,
    signInWithPhoneNumber,
    ConfirmationResult,
    User as FirebaseUser,
    signOut,
    GoogleAuthProvider,
    signInWithPopup,
    sendSignInLinkToEmail,
    isSignInWithEmailLink,
    signInWithEmailLink,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
// import { updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { User, UserRole } from '../types';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    setupRecaptcha: (elementId: string) => void;
    requestOtp: (phone: string) => Promise<ConfirmationResult>;
    // verifyOtp: (confirmationResult: ConfirmationResult, otp: string) => Promise<void>;
    verifyOtp: (confirmationResult: ConfirmationResult, otp: string, additionalData?: Partial<User>) => Promise<void>;
    logout: () => Promise<void>;
    signInWithGoogle: (additionalData?: Partial<User>) => Promise<User | null>;
    sendAuthLink: (email: string) => Promise<void>;
    completeEmailAuth: (email: string) => Promise<User | undefined>;
    signup: (email: string, password: string, phone: string, name: string) => Promise<User>;
    login: (email: string, password: string) => Promise<User>;
    updateUserProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

declare global {
    interface Window {
        recaptchaVerifier: RecaptchaVerifier;
    }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubscribeUserDoc: (() => void) | undefined;

        const unsubscribeAuth = auth.onAuthStateChanged((firebaseUser) => {
            // Unsubscribe from previous listener if it exists to prevent leaks/conflicts
            if (unsubscribeUserDoc) {
                unsubscribeUserDoc();
                unsubscribeUserDoc = undefined;
            }

            if (firebaseUser) {
                const userDocRef = doc(db, 'users', firebaseUser.uid);
                unsubscribeUserDoc = onSnapshot(userDocRef, (snapshot) => {
                    if (snapshot.exists()) {
                        setUser({ id: firebaseUser.uid, ...snapshot.data() } as User);
                    } else {
                        // New user transient state
                        setUser({
                            id: firebaseUser.uid,
                            phone: firebaseUser.phoneNumber || '',
                            role: UserRole.UNSET,
                            roles: [UserRole.UNSET],
                            isApproved: false,
                            isKycCompleted: false,
                            name: '',
                            savedLocations: [],
                            scheduledRides: []
                        });
                    }
                    setLoading(false);
                }, (error) => {
                    console.error("Auth sync error:", error);
                    setLoading(false);
                });
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeUserDoc) unsubscribeUserDoc();
        };
    }, []);

    const setupRecaptcha = (elementId: string) => {
        if (window.recaptchaVerifier) {
            try {
                window.recaptchaVerifier.clear();
                window.recaptchaVerifier = undefined as any; // Force clear
            } catch (error) {
                console.warn("Failed to clear existing reCAPTCHA", error);
            }
        }

        // Ensure element exists before init
        const element = document.getElementById(elementId);
        if (!element) {
            console.warn(`Recaptcha element ${elementId} not found, retrying in 100ms...`);
            setTimeout(() => setupRecaptcha(elementId), 100);
            return;
        }

        window.recaptchaVerifier = new RecaptchaVerifier(auth, elementId, {
            'size': 'invisible',
            'callback': (response: any) => {
                console.log("Recaptcha verified");
            },
            'expired-callback': () => {
                console.warn("Recaptcha expired");
            }
        });
    };

    const signInWithGoogle = async (additionalData?: Partial<User>) => {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const firebaseUser = result.user;
            await handleUserOnAuth(firebaseUser, { role: UserRole.UNSET, ...additionalData }); // Default role or prompt
            return user;
        } catch (error) {
            console.error("Google Sign In Error", error);
            throw error;
        }
    };

    const sendAuthLink = async (email: string) => {
        const actionCodeSettings = {
            url: `${window.location.origin}/#/auth/email-complete`, // Ensure this route exists
            handleCodeInApp: true,
        };
        await sendSignInLinkToEmail(auth, email, actionCodeSettings);
        window.localStorage.setItem('emailForSignIn', email);
    };

    const completeEmailAuth = async (email: string) => {
        if (isSignInWithEmailLink(auth, window.location.href)) {
            const result = await signInWithEmailLink(auth, email, window.location.href);
            window.localStorage.removeItem('emailForSignIn');
            await handleUserOnAuth(result.user, { role: UserRole.UNSET });
            return result.user as unknown as User;
        }
    };

    const signup = async (email: string, password: string, phone: string, name: string) => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const firebaseUser = userCredential.user;

            // Create user profile immediately
            const newUser: Partial<User> = {
                id: firebaseUser.uid,
                email: email,
                phone: phone, // This phone might be unverified initially if not using phone auth flow yet
                name: name,
                role: UserRole.UNSET,
                isApproved: false,
                isKycCompleted: false,
                savedLocations: [],
                scheduledRides: [],
                isActive: true,
                createdAt: new Date().toISOString(),
                provider: 'password',
                emailVerified: firebaseUser.emailVerified
            };

            const userDocRef = doc(db, 'users', firebaseUser.uid);
            await setDoc(userDocRef, newUser);

            setUser(newUser as User);
            return newUser as User;
        } catch (error) {
            console.error("Signup Error", error);
            throw error;
        }
    };

    const login = async (email: string, password: string) => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            await handleUserOnAuth(userCredential.user, { lastLogin: new Date().toISOString() });
            // handleUserOnAuth will set the user state
            // We need to return the user, but since state update is async/batched, 
            // we can trust handleUserOnAuth to fetch/set it. 
            // To return immediately, we might need to fetch manually or wait for the effect.
            // For now, let's rely on the user object from the context state or re-fetch loosely if needed, 
            // but handleUserOnAuth does the heavy lifting.
            // Actually handleUserOnAuth returns void, let's make it return user or we just return what we have.

            // Quick fetch to return valid User object
            const userDocRef = doc(db, 'users', userCredential.user.uid);
            const userSnapshot = await getDoc(userDocRef);
            return { id: userCredential.user.uid, ...userSnapshot.data() } as User;
        } catch (error) {
            console.error("Login Error", error);
            throw error;
        }
    };

    const handleUserOnAuth = async (firebaseUser: FirebaseUser, additionalData?: Partial<User>) => {
        const userDocRef = doc(db, 'users', firebaseUser.uid);

        try {
            const userSnapshot = await getDoc(userDocRef);

            if (userSnapshot.exists()) {
                const existingData = userSnapshot.data() as User;
                const newRole = additionalData?.role || existingData.role;

                // Merge roles
                const currentRoles = existingData.roles || [existingData.role];
                if (additionalData?.role && !currentRoles.includes(additionalData.role)) {
                    currentRoles.push(additionalData.role);
                }

                const updatedUser: Partial<User> = {
                    ...additionalData,
                    role: newRole,
                    roles: currentRoles,
                    lastLogin: new Date().toISOString()
                };

                await setDoc(userDocRef, updatedUser, { merge: true });
                setUser({ ...existingData, ...updatedUser, id: firebaseUser.uid } as User);
            } else {
                const initialRole = additionalData?.role || UserRole.UNSET;
                const newUser: Partial<User> = {
                    id: firebaseUser.uid,
                    email: firebaseUser.email || '',
                    phone: firebaseUser.phoneNumber || '',
                    role: initialRole,
                    roles: [initialRole],
                    isApproved: false,
                    isKycCompleted: false,
                    name: firebaseUser.displayName || '',
                    avatar: firebaseUser.photoURL || undefined,
                    savedLocations: [],
                    scheduledRides: [],
                    isActive: true,
                    provider: firebaseUser.providerData[0]?.providerId === 'google.com' ? 'google' :
                        firebaseUser.phoneNumber ? 'phone' : 'password',
                    createdAt: new Date().toISOString(),
                    ...additionalData
                };
                await setDoc(userDocRef, newUser);
                setUser(newUser as User);
            }
        } catch (error: any) {
            console.error("Error fetching user profile:", error);
            // Fallback for offline or permission errors: Allow login with basic auth data
            if (error.code === 'unavailable' || error.message?.includes('offline')) {
                const fallbackUser: Partial<User> = {
                    id: firebaseUser.uid,
                    email: firebaseUser.email || '',
                    phone: firebaseUser.phoneNumber || '',
                    role: UserRole.UNSET, // Default role
                    isApproved: false,
                    name: firebaseUser.displayName || 'Unknown',
                    isActive: true,
                    ...additionalData
                };
                setUser(fallbackUser as User);
            } else {
                // Determine if we should block login or proceed
                // For now, rethrow to let UI handle "Login Failed" if it's critical
                throw error;
            }
        }
    };

    const requestOtp = async (phone: string) => {
        if (!window.recaptchaVerifier) throw new Error('Recaptcha not initialized');
        // Format phone number to E.164 if needed (assuming input is like 9876543210)
        const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
        return await signInWithPhoneNumber(auth, formattedPhone, window.recaptchaVerifier);
    };

    const verifyOtp = async (confirmationResult: ConfirmationResult, otp: string, additionalData?: Partial<User>) => {
        const result = await confirmationResult.confirm(otp);
        await handleUserOnAuth(result.user, additionalData);
    };

    const logout = async () => {
        await signOut(auth);
        setUser(null);
    };

    const updateUserProfile = async (data: Partial<User>) => {
        if (!user) return;
        try {
            const userDocRef = doc(db, 'users', user.id);

            // Firestore does not accept 'undefined' values. Clean the data.
            const cleanData = Object.entries(data).reduce((acc, [key, value]) => {
                if (value !== undefined) {
                    acc[key] = value;
                }
                return acc;
            }, {} as any);

            if (Object.keys(cleanData).length === 0) return;

            await setDoc(userDocRef, cleanData, { merge: true });
            setUser(prev => prev ? { ...prev, ...cleanData } : null);
        } catch (error) {
            console.error("Error updating profile:", error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, setupRecaptcha, requestOtp, verifyOtp, logout, signInWithGoogle, sendAuthLink, completeEmailAuth, signup, login, updateUserProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
