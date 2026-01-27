import { useState, useEffect, createContext, useContext } from "react";
import { onIdTokenChanged } from "firebase/auth";
import { auth } from "../firebase/init";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // onIdTokenChanged triggers on sign-in, sign-out, and token refresh
        const unsubscribe = onIdTokenChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                try {
                    // Check for custom claims
                    const tokenResult = await currentUser.getIdTokenResult();
                    setIsAdmin(!!tokenResult.claims.admin);
                } catch (e) {
                    console.error("Error fetching claims", e);
                    setIsAdmin(false);
                }
            } else {
                setUser(null);
                setIsAdmin(false);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, isAdmin, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
