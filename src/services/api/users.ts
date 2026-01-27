/**
 * Centralized API service layer for user operations
 */

import { doc, getDoc, updateDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { User, UserRole } from '../../types';

export const usersAPI = {
    /**
     * Get user by ID
     */
    getById: async (userId: string): Promise<User | null> => {
        try {
            const userRef = doc(db, 'users', userId);
            const snapshot = await getDoc(userRef);

            if (!snapshot.exists()) return null;

            return { id: snapshot.id, ...snapshot.data() } as User;
        } catch (error: any) {
            console.error('Error fetching user:', error);
            throw new Error(`Failed to fetch user: ${error.message}`);
        }
    },

    /**
     * Update user profile
     */
    update: async (userId: string, data: Partial<User>): Promise<void> => {
        try {
            const userRef = doc(db, 'users', userId);

            // Clean undefined values
            const cleanData = Object.entries(data).reduce((acc, [key, value]) => {
                if (value !== undefined) {
                    acc[key] = value;
                }
                return acc;
            }, {} as any);

            await updateDoc(userRef, cleanData);
        } catch (error: any) {
            console.error('Error updating user:', error);
            throw new Error(`Failed to update user: ${error.message}`);
        }
    },

    /**
     * Create new user
     */
    create: async (userId: string, data: Partial<User>): Promise<void> => {
        try {
            const userRef = doc(db, 'users', userId);
            await setDoc(userRef, data);
        } catch (error: any) {
            console.error('Error creating user:', error);
            throw new Error(`Failed to create user: ${error.message}`);
        }
    },

    /**
     * Get users by role
     */
    getByRole: async (role: UserRole): Promise<User[]> => {
        try {
            const usersQuery = query(
                collection(db, 'users'),
                where('role', '==', role)
            );

            const snapshot = await getDocs(usersQuery);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as User[];
        } catch (error: any) {
            console.error('Error fetching users by role:', error);
            throw new Error(`Failed to fetch users: ${error.message}`);
        }
    },

    /**
     * Get nearby drivers
     */
    getNearbyDrivers: async (location: { lat: number; lng: number }, radiusKm: number = 5): Promise<User[]> => {
        try {
            // Note: This is a simplified version. For production, use geohashing or Firebase GeoFire
            const driversQuery = query(
                collection(db, 'users'),
                where('role', '==', UserRole.DRIVER),
                where('isApproved', '==', true),
                where('isActive', '==', true)
            );

            const snapshot = await getDocs(driversQuery);
            const drivers = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as User[];

            // Filter by distance (simplified - in production use proper geospatial queries)
            return drivers.filter(driver => {
                if (!driver.currentLocation) return false;

                const distance = calculateDistance(
                    location.lat,
                    location.lng,
                    driver.currentLocation.lat,
                    driver.currentLocation.lng
                );

                return distance <= radiusKm;
            });
        } catch (error: any) {
            console.error('Error fetching nearby drivers:', error);
            throw new Error(`Failed to fetch nearby drivers: ${error.message}`);
        }
    },
};

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
}
