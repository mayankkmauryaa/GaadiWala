/**
 * Centralized Geolocation Helper (Adapted for Expo)
 * Provides consistent geolocation handling across the application
 */

import * as Location from 'expo-location';
import { Coordinates } from '../types';

export enum GeolocationErrorType {
    PERMISSION_DENIED = 'PERMISSION_DENIED',
    POSITION_UNAVAILABLE = 'POSITION_UNAVAILABLE',
    TIMEOUT = 'TIMEOUT',
    NOT_SUPPORTED = 'NOT_SUPPORTED',
    UNKNOWN = 'UNKNOWN'
}

export interface GeolocationError {
    type: GeolocationErrorType;
    message: string;
    userMessage: string;
}

export interface GeolocationOptions {
    timeout?: number;
    maximumAge?: number;
    enableHighAccuracy?: boolean;
    retries?: number;
}

const DEFAULT_OPTIONS: Required<GeolocationOptions> = {
    timeout: 10000,
    maximumAge: 5000,
    enableHighAccuracy: true,
    retries: 2
};

/**
 * Requests current position with retry logic
 */
export const getCurrentPosition = async (
    options: GeolocationOptions = {}
): Promise<Coordinates> => {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
        throw {
            type: GeolocationErrorType.PERMISSION_DENIED,
            message: 'Permission to access location was denied',
            userMessage: 'Location access was denied. Please enable location permissions in your settings.'
        } as GeolocationError;
    }

    let lastError: GeolocationError | null = null;

    for (let attempt = 0; attempt <= opts.retries; attempt++) {
        try {
            const position = await Location.getCurrentPositionAsync({
                accuracy: opts.enableHighAccuracy ? Location.Accuracy.High : Location.Accuracy.Balanced,
            });

            return {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
        } catch (error: any) {
            console.error("Geolocation Error", error);
            lastError = {
                type: GeolocationErrorType.UNKNOWN,
                message: error.message || 'Unknown geolocation error',
                userMessage: 'Unable to get your location. Please check your GPS settings.'
            };

            // Wait before retry (exponential backoff)
            if (attempt < opts.retries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            }
        }
    }

    throw lastError || {
        type: GeolocationErrorType.UNKNOWN,
        message: 'Failed to get location after retries',
        userMessage: 'Unable to determine location.'
    };
};

/**
 * Watches position changes
 * Returns a subscription object (different from web ID)
 */
export const watchPosition = async (
    onSuccess: (coords: Coordinates) => void,
    onError: (error: GeolocationError) => void,
    options: GeolocationOptions = {}
): Promise<Location.LocationSubscription | null> => {

    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
        onError({
            type: GeolocationErrorType.PERMISSION_DENIED,
            message: 'Permission to access location was denied',
            userMessage: 'Location access was denied.'
        });
        return null;
    }

    try {
        return await Location.watchPositionAsync({
            accuracy: options.enableHighAccuracy ? Location.Accuracy.High : Location.Accuracy.Balanced,
            timeInterval: options.maximumAge,
            distanceInterval: 10 // Update every 10 meters
        }, (location) => {
            onSuccess({
                lat: location.coords.latitude,
                lng: location.coords.longitude
            });
        });
    } catch (error: any) {
        onError({
            type: GeolocationErrorType.UNKNOWN,
            message: error.message,
            userMessage: 'Error watching location.'
        });
        return null;
    }
};

/**
 * Clears position watch
 */
export const clearWatch = (subscription: Location.LocationSubscription | null): void => {
    if (subscription) {
        subscription.remove();
    }
};
