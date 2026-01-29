import { useState, useEffect, useCallback } from 'react';
import {
    collection,
    addDoc,
    updateDoc,
    doc,
    onSnapshot,
    serverTimestamp,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    runTransaction
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { RideRequest, RideStatus, VehicleCategory, Coordinates, Trip, UserRole, RidePreferences, ScheduledRide } from '../types';

export interface FareEstimate {
    category: VehicleCategory;
    amount: number;
    currency: string;
    eta: number; // minutes
}

export const useRide = () => {
    const { user } = useAuth();
    const [activeRide, setActiveRide] = useState<RideRequest | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fareEstimates, setFareEstimates] = useState<FareEstimate[]>([]);

    // Subscribe to active ride
    useEffect(() => {
        if (!user) return;

        // Query for any active ride where user is rider
        // Statuses that are considered 'active'
        const activeStatuses = [
            RideStatus.SEARCHING,
            RideStatus.ACCEPTED,
            RideStatus.ARRIVED,
            RideStatus.STARTED,
            RideStatus.PAYMENT_PENDING
        ];

        const q = query(
            collection(db, 'rides'),
            where('riderId', '==', user.id),
            where('status', 'in', activeStatuses),
            orderBy('createdAt', 'desc'),
            limit(1)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const docData = snapshot.docs[0].data();
                setActiveRide({ id: snapshot.docs[0].id, ...docData } as RideRequest);
            } else {
                setActiveRide(null);
            }
        }, (err) => {
            console.error("Ride listener error:", err);
            // Don't set global error here to avoid blocking UI, just log
        });

        return () => unsubscribe();
    }, [user]);

    const getFareEstimate = useCallback(async (pickup: Coordinates, drop: Coordinates) => {
        setLoading(true);
        setError(null);
        try {
            // Note: If functions are not deployed/reachable, this will fail.
            // Ensure Firebase Functions are properly configured in firebase.ts
            const calculateFare = httpsCallable(functions, 'calculateFareEstimate');
            const result = await calculateFare({ pickup, drop });
            const estimates = (result.data as any).estimates as FareEstimate[];
            setFareEstimates(estimates);
            return estimates;
        } catch (err: any) {
            console.error("Fare estimate error:", err);
            setError("Failed to get fare estimates.");
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const getTripHistory = useCallback(async (userId: string) => {
        setLoading(true);
        try {
            const q = query(
                collection(db, 'rides'),
                where('riderId', '==', userId),
                where('status', 'in', [RideStatus.COMPLETED, RideStatus.CANCELLED]),
                orderBy('createdAt', 'desc')
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                date: doc.data().createdAt?.toDate().toLocaleString() || 'N/A'
            })) as Trip[];
        } catch (err) {
            console.error("History fetch error:", err);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const getAvailableDrivers = useCallback(async (category: VehicleCategory, gender?: string) => {
        try {
            let q = query(
                collection(db, 'users'),
                where('role', '==', UserRole.DRIVER),
                where('isActive', '==', true),
                where('vehicleType', '==', category)
            );

            // Special logic for Pink Cab
            if (category === VehicleCategory.PINK) {
                q = query(q, where('gender', '==', 'FEMALE'));
            }

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    name: data.name,
                    avatar: data.avatar || 'https://via.placeholder.com/150',
                    carModel: data.vehicleModel || 'Gaadiwala Partner',
                    carNumber: data.vehicleNumber || 'XX 00 XX 0000',
                    rating: data.rating || 4.5,
                    conditions: data.conditions || ['AC Available', 'Professional'],
                    price: 0, // Calculated later in FlexFare
                    eta: '3-7 mins',
                    bio: data.bio,
                    languages: data.languages,
                    preferredRoutes: data.preferredRoutes
                };
            });
        } catch (err) {
            console.error("Driver fetch error:", err);
            return [];
        }
    }, []);

    const requestRide = useCallback(async (
        pickup: Coordinates,
        drop: Coordinates,
        pickupAddress: string,
        dropAddress: string,
        vehicleType: VehicleCategory,
        price: number,
        driverId?: string,
        paymentMethod: string = 'CASH',
        preferences?: RidePreferences
    ) => {
        if (!user) {
            setError("User not authenticated");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const rideData = {
                riderId: user.id,
                riderName: user.name,
                riderRating: user.rating || 5.0,
                pickupLocation: pickup,
                dropLocation: drop,
                pickupAddress,
                dropAddress,
                vehicleType,
                status: RideStatus.SEARCHING,
                createdAt: serverTimestamp(),
                estimatedFare: price,
                otp: Math.floor(100000 + Math.random() * 900000).toString(), // 6-digit OTP
                paymentMethod,
                driverId: driverId || null,
                isRideCheckEnabled: true,
                preferences: preferences || { silent: false, ac: false, music: false }
            };

            const docRef = await addDoc(collection(db, 'rides'), rideData);
            console.log("Ride requested with ID:", docRef.id);
        } catch (err: any) {
            console.error("Request ride error:", err);
            setError("Failed to request ride. Please try again.");
            throw err;
        } finally {
            setLoading(false);
        }
    }, [user]);

    const cancelRide = useCallback(async (rideId: string, reason: string = "User cancelled") => {
        setLoading(true);
        try {
            await updateDoc(doc(db, 'rides', rideId), {
                status: RideStatus.CANCELLED,
                cancellationReason: reason,
                cancelledBy: 'RIDER',
                updatedAt: serverTimestamp()
            });
        } catch (err: any) {
            console.error("Cancel ride error:", err);
            setError("Failed to cancel ride.");
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const scheduleRide = useCallback(async (rideData: ScheduledRide) => {
        if (!user) {
            setError("User not authenticated");
            return;
        }
        setLoading(true);
        try {
            await addDoc(collection(db, 'scheduledRides'), {
                ...rideData,
                riderId: user.id,
                riderName: user.name,
                createdAt: serverTimestamp(),
                status: 'SCHEDULED'
            });
        } catch (err: any) {
            console.error("Schedule ride error:", err);
            setError("Failed to schedule ride.");
            throw err;
        } finally {
            setLoading(false);
        }
    }, [user]);

    const submitRating = useCallback(async (rideId: string, driverId: string, rating: number, comment?: string) => {
        setLoading(true);
        try {
            const rideRef = doc(db, 'rides', rideId);
            const driverRef = doc(db, 'users', driverId);

            await runTransaction(db, async (transaction) => {
                const driverDoc = await transaction.get(driverRef);
                if (!driverDoc.exists()) throw new Error("Driver not found");

                const driverData = driverDoc.data();
                const currentRating = driverData.rating || 5.0;
                const totalRides = driverData.totalRides || 1; // Fallback to 1 if 0

                // Average calculation: (CurrentAvg * (N-1) + New) / N
                const newRating = ((currentRating * (totalRides - 1)) + rating) / totalRides;

                transaction.update(driverRef, {
                    rating: Number(newRating.toFixed(1))
                });

                transaction.update(rideRef, {
                    riderRating: rating,
                    riderComment: comment || '',
                    ratingSubmittedAt: serverTimestamp()
                });
            });
        } catch (err) {
            console.error("Rating submission error:", err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        activeRide,
        loading,
        error,
        fareEstimates,
        getFareEstimate,
        getTripHistory,
        getAvailableDrivers,
        requestRide,
        cancelRide,
        scheduleRide,
        submitRating
    };
};
