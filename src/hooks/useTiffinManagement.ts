import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { TiffinOrder } from '../types';

export interface TiffinManagementHook {
    orders: TiffinOrder[];
    loading: boolean;
    error: string | null;
    assignDriver: (orderId: string, driverId: string, driverName: string) => Promise<void>;
    updateOrderStatus: (orderId: string, status: TiffinOrder['status']) => Promise<void>;
}

/**
 * Custom hook for managing tiffin orders in the admin panel
 * Handles fetching orders and assigning drivers
 */
export const useTiffinManagement = (): TiffinManagementHook => {
    const [orders, setOrders] = useState<TiffinOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);

        try {
            const ordersQuery = query(
                collection(db, 'tiffinOrders'),
                where('status', 'in', ['PENDING', 'PICKED'])
            );

            const unsubscribe = onSnapshot(
                ordersQuery,
                (snapshot) => {
                    const ordersList = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    })) as TiffinOrder[];

                    setOrders(ordersList);
                    setLoading(false);
                },
                (err) => {
                    console.error('Error fetching tiffin orders:', err);
                    setError(err.message);
                    setLoading(false);
                }
            );

            return () => unsubscribe();
        } catch (err: any) {
            console.error('Error setting up tiffin orders listener:', err);
            setError(err.message);
            setLoading(false);
        }
    }, []);

    const assignDriver = async (orderId: string, driverId: string, driverName: string): Promise<void> => {
        try {
            const orderRef = doc(db, 'tiffinOrders', orderId);
            await updateDoc(orderRef, {
                driverId,
                driverName,
                status: 'PICKED'
            });
        } catch (err: any) {
            console.error('Error assigning driver to tiffin order:', err);
            throw new Error(`Failed to assign driver: ${err.message}`);
        }
    };

    const updateOrderStatus = async (orderId: string, status: TiffinOrder['status']): Promise<void> => {
        try {
            const orderRef = doc(db, 'tiffinOrders', orderId);
            await updateDoc(orderRef, { status });
        } catch (err: any) {
            console.error('Error updating tiffin order status:', err);
            throw new Error(`Failed to update order status: ${err.message}`);
        }
    };

    return {
        orders,
        loading,
        error,
        assignDriver,
        updateOrderStatus
    };
};
