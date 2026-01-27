/**
 * Centralized Geolocation Helper
 * Provides consistent geolocation handling across the application
 */

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
 * Maps browser geolocation error codes to user-friendly messages
 */
const mapGeolocationError = (error: GeolocationPositionError): GeolocationError => {
    switch (error.code) {
        case error.PERMISSION_DENIED:
            return {
                type: GeolocationErrorType.PERMISSION_DENIED,
                message: 'User denied location permission',
                userMessage: 'Location access was denied. Please enable location permissions in your browser settings to use this feature, or enter your address manually.'
            };
        case error.POSITION_UNAVAILABLE:
            return {
                type: GeolocationErrorType.POSITION_UNAVAILABLE,
                message: 'Location information unavailable',
                userMessage: 'Unable to determine your location. Please check your device settings or enter your address manually.'
            };
        case error.TIMEOUT:
            return {
                type: GeolocationErrorType.TIMEOUT,
                message: 'Location request timed out',
                userMessage: 'Location request timed out. Please try again or enter your address manually.'
            };
        default:
            return {
                type: GeolocationErrorType.UNKNOWN,
                message: error.message || 'Unknown geolocation error',
                userMessage: 'Unable to get your location. Please enter your address manually.'
            };
    }
};

/**
 * Checks if geolocation is supported by the browser
 */
export const isGeolocationSupported = (): boolean => {
    return 'geolocation' in navigator;
};

/**
 * Requests current position with retry logic
 */
export const getCurrentPosition = async (
    options: GeolocationOptions = {}
): Promise<Coordinates> => {
    if (!isGeolocationSupported()) {
        throw {
            type: GeolocationErrorType.NOT_SUPPORTED,
            message: 'Geolocation not supported',
            userMessage: 'Your browser does not support location services. Please enter your address manually.'
        } as GeolocationError;
    }

    const opts = { ...DEFAULT_OPTIONS, ...options };
    let lastError: GeolocationError | null = null;

    for (let attempt = 0; attempt <= opts.retries; attempt++) {
        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                    resolve,
                    reject,
                    {
                        timeout: opts.timeout,
                        maximumAge: opts.maximumAge,
                        enableHighAccuracy: opts.enableHighAccuracy
                    }
                );
            });

            return {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
        } catch (error) {
            lastError = mapGeolocationError(error as GeolocationPositionError);

            // Don't retry on permission denied
            if (lastError.type === GeolocationErrorType.PERMISSION_DENIED) {
                break;
            }

            // Wait before retry (exponential backoff)
            if (attempt < opts.retries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            }
        }
    }

    throw lastError;
};

/**
 * Watches position changes with error handling
 */
export const watchPosition = (
    onSuccess: (coords: Coordinates) => void,
    onError: (error: GeolocationError) => void,
    options: GeolocationOptions = {}
): number | null => {
    if (!isGeolocationSupported()) {
        onError({
            type: GeolocationErrorType.NOT_SUPPORTED,
            message: 'Geolocation not supported',
            userMessage: 'Your browser does not support location services.'
        });
        return null;
    }

    const opts = { ...DEFAULT_OPTIONS, ...options };

    const watchId = navigator.geolocation.watchPosition(
        (position) => {
            onSuccess({
                lat: position.coords.latitude,
                lng: position.coords.longitude
            });
        },
        (error) => {
            onError(mapGeolocationError(error));
        },
        {
            timeout: opts.timeout,
            maximumAge: opts.maximumAge,
            enableHighAccuracy: opts.enableHighAccuracy
        }
    );

    return watchId;
};

/**
 * Clears position watch
 */
export const clearWatch = (watchId: number): void => {
    if (isGeolocationSupported()) {
        navigator.geolocation.clearWatch(watchId);
    }
};

/**
 * Requests permission for geolocation (best effort)
 * Note: There's no standard API to request permission without getting position
 */
export const requestPermission = async (): Promise<PermissionState | 'unsupported'> => {
    try {
        if ('permissions' in navigator) {
            const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
            return result.state;
        }
        return 'unsupported';
    } catch {
        return 'unsupported';
    }
};
