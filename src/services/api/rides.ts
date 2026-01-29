/**
 * Centralized API service layer for rides
 * Abstracts Firebase operations for better testability and maintainability
 */

import { collection, addDoc, updateDoc, doc, query, where, getDocs, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { RideRequest, RideStatus, Coordinates, VehicleCategory } from '../../types';

export interface CreateRideDTO {
    riderId: string;
    riderName: string;
    riderRating: number;
    pickupLocation: Coordinates;
    dropLocation: Coordinates;
    pickupAddress: string;
    dropAddress: string;
    vehicleType: VehicleCategory;
    estimatedFare: number;
    paymentMethod: string;
    preferences?: {
        silent: boolean;
        ac: boolean;
        music: boolean;
    };
}

export interface UpdateRideDTO {
    status?: RideStatus;
    driverId?: string | null;
    driverName?: string;
    driverPhone?: string;
    driverAvatar?: string;
    driverRating?: number;
    acceptedAt?: any;
}

export const ridesAPI = {
    /**
     * Create a new ride request
     */
    create: async (data: CreateRideDTO): Promise<string> => {
        try {
            const rideData: Partial<RideRequest> = {
                ...data,
                status: RideStatus.SEARCHING,
                createdAt: serverTimestamp(),
                otp: Math.floor(1000 + Math.random() * 9000).toString(),
            };

            const docRef = await addDoc(collection(db, 'rideRequests'), rideData);
            return docRef.id;
        } catch (error: any) {
            console.error('Error creating ride:', error);
            throw new Error(`Failed to create ride: ${error.message}`);
        }
    },

    /**
     * Update an existing ride
     */
    update: async (rideId: string, updates: UpdateRideDTO): Promise<void> => {
        try {
            const rideRef = doc(db, 'rideRequests', rideId);
            await updateDoc(rideRef, updates as any);
        } catch (error: any) {
            console.error('Error updating ride:', error);
            throw new Error(`Failed to update ride: ${error.message}`);
        }
    },

    /**
     * Cancel a ride
     */
    cancel: async (rideId: string, reason?: string): Promise<void> => {
        try {
            const rideRef = doc(db, 'rideRequests', rideId);
            await updateDoc(rideRef, {
                status: RideStatus.CANCELLED,
                cancellationReason: reason || 'User cancelled',
            });
        } catch (error: any) {
            console.error('Error cancelling ride:', error);
            throw new Error(`Failed to cancel ride: ${error.message}`);
        }
    },

    /**
     * Get active ride for a user
     */
    getActiveRide: async (userId: string, role: 'rider' | 'driver'): Promise<RideRequest | null> => {
        try {
            const field = role === 'rider' ? 'riderId' : 'driverId';
            const ridesQuery = query(
                collection(db, 'rideRequests'),
                where(field, '==', userId),
                where('status', 'in', [RideStatus.SEARCHING, RideStatus.ACCEPTED, RideStatus.ARRIVED, RideStatus.STARTED])
            );

            const snapshot = await getDocs(ridesQuery);
            if (snapshot.empty) return null;

            const rideDoc = snapshot.docs[0];
            return { id: rideDoc.id, ...rideDoc.data() } as RideRequest;
        } catch (error: any) {
            console.error('Error fetching active ride:', error);
            throw new Error(`Failed to fetch active ride: ${error.message}`);
        }
    },

    /**
     * Subscribe to ride updates
     */
    subscribeToRide: (rideId: string, callback: (ride: RideRequest | null) => void): (() => void) => {
        const rideRef = doc(db, 'rideRequests', rideId);

        return onSnapshot(
            rideRef,
            (snapshot) => {
                if (snapshot.exists()) {
                    callback({ id: snapshot.id, ...snapshot.data() } as RideRequest);
                } else {
                    callback(null);
                }
            },
            (error) => {
                console.error('Error in ride subscription:', error);
                callback(null);
            }
        );
    },

    /**
     * Get available rides for drivers
     */
    getAvailableRides: async (vehicleType?: VehicleCategory): Promise<RideRequest[]> => {
        try {
            let ridesQuery = query(
                collection(db, 'rideRequests'),
                where('status', '==', RideStatus.SEARCHING)
            );

            if (vehicleType) {
                ridesQuery = query(ridesQuery, where('vehicleType', '==', vehicleType));
            }

            const snapshot = await getDocs(ridesQuery);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as RideRequest[];
        } catch (error: any) {
            console.error('Error fetching available rides:', error);
            throw new Error(`Failed to fetch available rides: ${error.message}`);
        }
    },

    /**
     * Get completed rides for a driver
     */
    getDriverRideHistory: async (driverId: string): Promise<any[]> => {
        try {
            const historyQuery = query(
                collection(db, 'rideRequests'),
                where('driverId', '==', driverId),
                where('status', '==', RideStatus.COMPLETED)
            );
            const snapshot = await getDocs(historyQuery);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date()
            }));
        } catch (error: any) {
            console.error('Error fetching driver ride history:', error);
            throw new Error(`Failed to fetch ride history: ${error.message}`);
        }
    },
};
