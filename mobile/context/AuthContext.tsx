import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    signInWithPhoneNumber,
    ConfirmationResult,
    User as FirebaseUser,
    signOut,
    GoogleAuthProvider,
    signInWithCredential,
    sendSignInLinkToEmail,
    isSignInWithEmailLink,
    signInWithEmailLink,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../firebase';
import { User, UserRole } from '../types';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    setupRecaptcha: (elementId: string) => void;
    requestOtp: (phone: string) => Promise<ConfirmationResult>;
    verifyOtp: (confirmationResult: ConfirmationResult, otp: string, additionalData?: Partial<User>) => Promise<void>;
    logout: () => Promise<void>;
    signInWithGoogle: (idToken: string, additionalData?: Partial<User>) => Promise<User | null>;
    sendAuthLink: (email: string) => Promise<void>;
    completeEmailAuth: (email: string, link: string) => Promise<User | undefined>;
    signup: (email: string, password: string, phone: string, name: string) => Promise<User>;
    login: (email: string, password: string) => Promise<User>;
    updateUserProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// Mock window for compatibility if needed (not really needed if we clean up)
// declare global { ... }

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubscribeUserDoc: (() => void) | undefined;

        const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
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
        console.log("Recaptcha setup skipped for mobile (handled via native flow or modal)");
        // Implementing Recaptcha in RN needs a different approach (WebView or Native SDK)
    };

    const signInWithGoogle = async (idToken: string, additionalData?: Partial<User>) => {
        // Expects ID Token from Google Sign-In (Expo Auth Session or Native)
        try {
            const credential = GoogleAuthProvider.credential(idToken);
            const result = await signInWithCredential(auth, credential);
            const firebaseUser = result.user;
            await handleUserOnAuth(firebaseUser, { role: UserRole.UNSET, ...additionalData });
            return user;
        } catch (error) {
            console.error("Google Sign In Error", error);
            throw error;
        }
    };

    const sendAuthLink = async (email: string) => {
        // Deep link handling needed here
        const actionCodeSettings = {
            url: `gaadiwala-mobile://auth/email-complete`, // Deep link scheme
            handleCodeInApp: true,
            iOS: {
                bundleId: 'com.gaadiwala.mobile'
            },
            android: {
                packageName: 'com.gaadiwala.mobile',
                installApp: true,
                minimumVersion: '12'
            },
        };
        await sendSignInLinkToEmail(auth, email, actionCodeSettings);
        await AsyncStorage.setItem('emailForSignIn', email);
    };

    const completeEmailAuth = async (email: string, link: string) => {
        if (isSignInWithEmailLink(auth, link)) {
            const result = await signInWithEmailLink(auth, email, link);
            await AsyncStorage.removeItem('emailForSignIn');
            await handleUserOnAuth(result.user, { role: UserRole.UNSET });
            return result.user as unknown as User;
        }
    };

    const signup = async (email: string, password: string, phone: string, name: string) => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const firebaseUser = userCredential.user;

            const newUser: Partial<User> = {
                id: firebaseUser.uid,
                email: email,
                phone: phone,
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
            // Fallback for offline or permission errors
            if (error.code === 'unavailable' || error.message?.includes('offline')) {
                const fallbackUser: Partial<User> = {
                    id: firebaseUser.uid,
                    email: firebaseUser.email || '',
                    phone: firebaseUser.phoneNumber || '',
                    role: UserRole.UNSET,
                    isApproved: false,
                    name: firebaseUser.displayName || 'Unknown',
                    isActive: true,
                    ...additionalData
                };
                setUser(fallbackUser as User);
            } else {
                throw error;
            }
        }
    };

    const requestOtp = async (phone: string) => {
        // TODO: Implement RN Phone Auth (Needs RecaptchaVerifier Modal or Native Module)
        console.warn("Phone auth not fully implemented in JS-only mode without Recaptcha Modal");
        throw new Error("Phone auth requires reCAPTCHA setup.");
        // const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
        // return await signInWithPhoneNumber(auth, formattedPhone, window.recaptchaVerifier); 
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
