import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc, setDoc, deleteField } from 'firebase/firestore';
import { db } from '../firebase';
import { User, UserRole } from '../types';

export interface DriverFilter {
    status: 'ALL' | 'PENDING' | 'ACTIVE' | 'BLOCKED';
}

export interface DriverManagementHook {
    drivers: User[];
    loading: boolean;
    error: string | null;
    approveDriver: (driverId: string) => Promise<void>;
    rejectDriver: (driverId: string, reason: string) => Promise<void>;
    blockDriver: (driverId: string, reason: string) => Promise<void>;
    unblockDriver: (driverId: string) => Promise<void>;
}

/**
 * Custom hook for managing drivers in the admin panel
 * Handles fetching, approving, rejecting, and blocking drivers
 */
export const useDriverManagement = (filter: DriverFilter = { status: 'ALL' }): DriverManagementHook => {
    const [drivers, setDrivers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);

        try {
            const driversQuery = query(
                collection(db, 'users'),
                where('role', '==', UserRole.DRIVER)
            );

            const unsubscribe = onSnapshot(
                driversQuery,
                (snapshot) => {
                    const driversList = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    })) as User[];

                    // Apply filter
                    let filteredDrivers = driversList;
                    if (filter.status === 'PENDING') {
                        filteredDrivers = driversList.filter(d => d.isKycCompleted && !d.isApproved && !d.rejectionReason);
                    } else if (filter.status === 'ACTIVE') {
                        filteredDrivers = driversList.filter(d => d.isApproved && d.isActive !== false);
                    } else if (filter.status === 'BLOCKED') {
                        filteredDrivers = driversList.filter(d => d.rejectionReason || d.isActive === false);
                    }

                    setDrivers(filteredDrivers);
                    setLoading(false);
                },
                (err) => {
                    console.error('Error fetching drivers:', err);
                    setError(err.message);
                    setLoading(false);
                }
            );

            return () => unsubscribe();
        } catch (err: any) {
            console.error('Error setting up driver listener:', err);
            setError(err.message);
            setLoading(false);
        }
    }, [filter.status]);

    const approveDriver = async (driverId: string): Promise<void> => {
        try {
            const driverRef = doc(db, 'users', driverId);
            await updateDoc(driverRef, {
                isApproved: true,
                rejectionReason: deleteField(),
                isActive: true
            });
        } catch (err: any) {
            console.error('Error approving driver:', err);
            throw new Error(`Failed to approve driver: ${err.message}`);
        }
    };

    const rejectDriver = async (driverId: string, reason: string): Promise<void> => {
        try {
            const driverRef = doc(db, 'users', driverId);
            await updateDoc(driverRef, {
                isApproved: false,
                rejectionReason: reason,
                isActive: false
            });
        } catch (err: any) {
            console.error('Error rejecting driver:', err);
            throw new Error(`Failed to reject driver: ${err.message}`);
        }
    };

    const blockDriver = async (driverId: string, reason: string): Promise<void> => {
        try {
            const driverRef = doc(db, 'users', driverId);
            await updateDoc(driverRef, {
                isActive: false,
                rejectionReason: reason
            });
        } catch (err: any) {
            console.error('Error blocking driver:', err);
            throw new Error(`Failed to block driver: ${err.message}`);
        }
    };

    const unblockDriver = async (driverId: string): Promise<void> => {
        try {
            const driverRef = doc(db, 'users', driverId);
            await updateDoc(driverRef, {
                isActive: true,
                rejectionReason: deleteField()
            });
        } catch (err: any) {
            console.error('Error unblocking driver:', err);
            throw new Error(`Failed to unblock driver: ${err.message}`);
        }
    };

    return {
        drivers,
        loading,
        error,
        approveDriver,
        rejectDriver,
        blockDriver,
        unblockDriver
    };
};
