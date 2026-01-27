import { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { VehicleCategory } from '../types';

export interface SystemConfig {
    baseFares: Record<VehicleCategory, number>;
    surgeMultiplier: number;
}

export interface SystemConfigHook {
    config: SystemConfig | null;
    loading: boolean;
    error: string | null;
    updateBaseFare: (category: VehicleCategory, fare: number) => Promise<void>;
    updateSurgeMultiplier: (multiplier: number) => Promise<void>;
}

const DEFAULT_CONFIG: SystemConfig = {
    baseFares: {
        [VehicleCategory.BIKE]: 10,
        [VehicleCategory.AUTO]: 15,
        [VehicleCategory.MINI]: 25,
        [VehicleCategory.PINK]: 30,
        [VehicleCategory.PRIME]: 50
    },
    surgeMultiplier: 1.0
};

/**
 * Custom hook for managing system configuration
 * Handles pricing and surge multiplier settings
 */
export const useSystemConfig = (): SystemConfigHook => {
    const [config, setConfig] = useState<SystemConfig | null>(DEFAULT_CONFIG);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);

        try {
            const configRef = doc(db, 'systemConfig', 'pricing');

            const unsubscribe = onSnapshot(
                configRef,
                (snapshot) => {
                    if (snapshot.exists()) {
                        setConfig(snapshot.data() as SystemConfig);
                    } else {
                        setConfig(DEFAULT_CONFIG);
                    }
                    setLoading(false);
                },
                (err) => {
                    console.error('Error fetching system config:', err);
                    setError(err.message);
                    setConfig(DEFAULT_CONFIG); // Fallback to default
                    setLoading(false);
                }
            );

            return () => unsubscribe();
        } catch (err: any) {
            console.error('Error setting up system config listener:', err);
            setError(err.message);
            setConfig(DEFAULT_CONFIG);
            setLoading(false);
        }
    }, []);

    const updateBaseFare = async (category: VehicleCategory, fare: number): Promise<void> => {
        if (!config) throw new Error('Config not loaded');

        try {
            const configRef = doc(db, 'systemConfig', 'pricing');
            const updatedBaseFares = {
                ...config.baseFares,
                [category]: fare
            };

            await updateDoc(configRef, {
                baseFares: updatedBaseFares
            });
        } catch (err: any) {
            console.error('Error updating base fare:', err);
            throw new Error(`Failed to update base fare: ${err.message}`);
        }
    };

    const updateSurgeMultiplier = async (multiplier: number): Promise<void> => {
        try {
            const configRef = doc(db, 'systemConfig', 'pricing');
            await updateDoc(configRef, {
                surgeMultiplier: multiplier
            });
        } catch (err: any) {
            console.error('Error updating surge multiplier:', err);
            throw new Error(`Failed to update surge multiplier: ${err.message}`);
        }
    };

    return {
        config,
        loading,
        error,
        updateBaseFare,
        updateSurgeMultiplier
    };
};
