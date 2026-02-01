// Dispatch Service - Handles ride request dispatch with idempotency and atomic operations
import { db } from '../../firebase';
import { doc, updateDoc, arrayUnion, runTransaction, serverTimestamp, collection, addDoc, getDoc } from 'firebase/firestore';
import { RideRequest, RideStatus } from '../../types';

interface DispatchResult {
    success: boolean;
    alreadyProcessed?: boolean;
    error?: string;
}

/**
 * Atomically decline a ride request and prevent further dispatches
 */
export const declineRideRequest = async (
    requestId: string,
    driverId: string,
    reason: string
): Promise<DispatchResult> => {
    try {
        const result = await runTransaction(db, async (transaction) => {
            const requestRef = doc(db, 'rides', requestId);
            const requestDoc = await transaction.get(requestRef);

            if (!requestDoc.exists()) {
                throw new Error('Ride request not found');
            }

            const request = requestDoc.data() as RideRequest;

            // Check if already declined by this driver (idempotent)
            if (request.declinedDrivers?.includes(driverId)) {
                return { success: true, alreadyProcessed: true };
            }

            // Only allow decline if ride is still searching
            if (request.status !== RideStatus.SEARCHING) {
                return { success: false, error: `Cannot decline ride in status: ${request.status}` };
            }

            // Update request: add driver to declined list, increment version
            transaction.update(requestRef, {
                declinedDrivers: arrayUnion(driverId),
                version: (request.version || 0) + 1,
                updatedAt: serverTimestamp()
            });

            // Log the decline event
            const declineLogRef = doc(collection(db, 'declineLog'));
            transaction.set(declineLogRef, {
                requestId,
                driverId,
                reason,
                timestamp: serverTimestamp(),
                requestVersion: (request.version || 0) + 1
            });

            return { success: true };
        });

        return result;
    } catch (error) {
        console.error('Decline request failed:', error);
        return { success: false, error: (error as Error).message };
    }
};

/**
 * Check if a driver has already been dispatched for this request (idempotency check)
 */
export const hasBeenDispatched = async (
    requestId: string,
    driverId: string
): Promise<boolean> => {
    try {
        const requestRef = doc(db, 'rides', requestId);
        const requestDoc = await getDoc(requestRef);

        if (!requestDoc.exists()) {
            return false;
        }

        const request = requestDoc.data() as RideRequest;
        return request.dispatchedDrivers?.includes(driverId) || false;
    } catch (error) {
        console.error('Error checking dispatch status:', error);
        return false;
    }
};

/**
 * Atomically dispatch ride to driver with idempotency
 */
export const dispatchRideToDriver = async (
    requestId: string,
    driverId: string
): Promise<DispatchResult> => {
    try {
        const result = await runTransaction(db, async (transaction) => {
            const requestRef = doc(db, 'rides', requestId);
            const requestDoc = await transaction.get(requestRef);

            if (!requestDoc.exists()) {
                throw new Error('Ride request not found');
            }

            const request = requestDoc.data() as RideRequest;

            // Idempotency check: already dispatched to this driver
            if (request.dispatchedDrivers?.includes(driverId)) {
                return { success: true, alreadyProcessed: true };
            }

            // Check if driver already declined
            if (request.declinedDrivers?.includes(driverId)) {
                return { success: false, error: 'Driver already declined this request' };
            }

            // Only dispatch if ride is still searching
            if (request.status !== RideStatus.SEARCHING) {
                return { success: false, error: `Cannot dispatch ride in status: ${request.status}` };
            }

            // Update request: add driver to dispatched list, increment version
            transaction.update(requestRef, {
                dispatchedDrivers: arrayUnion(driverId),
                version: (request.version || 0) + 1,
                updatedAt: serverTimestamp()
            });

            // Log the dispatch
            const dispatchLogRef = doc(collection(db, 'dispatchLog'));
            transaction.set(dispatchLogRef, {
                requestId,
                driverId,
                timestamp: serverTimestamp(),
                requestVersion: (request.version || 0) + 1,
                idempotencyKey: `${requestId}:${driverId}:${request.version || 0}`
            });

            return { success: true };
        });

        return result;
    } catch (error) {
        console.error('Dispatch failed:', error);
        return { success: false, error: (error as Error).message };
    }
};

/**
 * Update pickup location with sequence ordering to prevent stale updates
 */
export const updatePickupLocation = async (
    requestId: string,
    lat: number,
    lng: number,
    address: string,
    sequenceNumber: number
): Promise<DispatchResult> => {
    try {
        const result = await runTransaction(db, async (transaction) => {
            const requestRef = doc(db, 'rides', requestId);
            const requestDoc = await transaction.get(requestRef);

            if (!requestDoc.exists()) {
                throw new Error('Ride request not found');
            }

            const request = requestDoc.data() as RideRequest;

            // Ignore stale updates (lower sequence number)
            if (sequenceNumber <= (request.locationSequence || 0)) {
                return { success: true, alreadyProcessed: true };
            }

            // Normalize coordinates (6 decimal places = ~0.11m precision)
            const latNormalized = Math.round(lat * 1000000) / 1000000;
            const lngNormalized = Math.round(lng * 1000000) / 1000000;

            // Update location with new sequence
            transaction.update(requestRef, {
                pickupLocation: {
                    lat: latNormalized,
                    lng: lngNormalized
                },
                pickupAddress: address,
                locationSequence: sequenceNumber,
                locationUpdatedAt: serverTimestamp(),
                version: (request.version || 0) + 1
            });

            // Log location change for audit
            const locationLogRef = doc(collection(db, 'locationLog'));
            transaction.set(locationLogRef, {
                requestId,
                lat: latNormalized,
                lng: lngNormalized,
                address,
                sequence: sequenceNumber,
                timestamp: serverTimestamp()
            });

            return { success: true };
        });

        return result;
    } catch (error) {
        console.error('Location update failed:', error);
        return { success: false, error: (error as Error).message };
    }
};
