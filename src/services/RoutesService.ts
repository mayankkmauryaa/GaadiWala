/**
 * Routes API Service
 * Provides traffic-aware routing with multiple route options
 * Uses Google Routes API (newer, better than Directions API)
 */

import { Coordinates } from '../types';

export interface RouteOption {
    summary: string;
    distance: string;
    duration: string;
    durationInTraffic?: string;
    polyline: string;
    legs: RouteLeg[];
    trafficInfo?: {
        condition: 'NORMAL' | 'SLOW' | 'HEAVY' | 'SEVERE';
        delayMinutes: number;
    };
    tollInfo?: {
        hasTolls: boolean;
        estimatedCost?: number;
    };
    fuelConsumption?: {
        liters: number;
        cost: number;
    };
}

export interface RouteLeg {
    startAddress: string;
    endAddress: string;
    distance: string;
    duration: string;
    steps: RouteStep[];
}

export interface RouteStep {
    instruction: string;
    distance: string;
    duration: string;
}

/**
 * Calculate routes using Routes API
 * Returns multiple route options with traffic data
 */
export const calculateRoutes = async (
    origin: Coordinates,
    destination: Coordinates,
    apiKey: string
): Promise<RouteOption[]> => {
    try {
        const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';

        const requestBody = {
            origin: {
                location: {
                    latLng: {
                        latitude: origin.lat,
                        longitude: origin.lng
                    }
                }
            },
            destination: {
                location: {
                    latLng: {
                        latitude: destination.lat,
                        longitude: destination.lng
                    }
                }
            },
            travelMode: 'DRIVE',
            routingPreference: 'TRAFFIC_AWARE',
            computeAlternativeRoutes: true,
            routeModifiers: {
                avoidTolls: false,
                avoidHighways: false,
                avoidFerries: true
            },
            languageCode: 'en-US',
            units: 'METRIC'
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs,routes.travelAdvisory'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('Routes API Error:', error);
            throw new Error(`Routes API failed: ${response.status}`);
        }

        const data = await response.json();

        if (!data.routes || data.routes.length === 0) {
            throw new Error('No routes found');
        }

        // Transform Routes API response to our format
        return data.routes.map((route: any, index: number) => {
            const leg = route.legs[0];
            const distanceKm = (route.distanceMeters / 1000).toFixed(1);
            const durationMin = Math.round(parseInt(route.duration.replace('s', '')) / 60);

            // Analyze traffic
            let trafficInfo = undefined;
            if (route.travelAdvisory?.speedReadingIntervals) {
                const avgSpeed = route.travelAdvisory.speedReadingIntervals.reduce(
                    (acc: number, interval: any) => acc + (interval.speed || 0),
                    0
                ) / route.travelAdvisory.speedReadingIntervals.length;

                let condition: 'NORMAL' | 'SLOW' | 'HEAVY' | 'SEVERE' = 'NORMAL';
                if (avgSpeed < 20) condition = 'SEVERE';
                else if (avgSpeed < 30) condition = 'HEAVY';
                else if (avgSpeed < 40) condition = 'SLOW';

                trafficInfo = {
                    condition,
                    delayMinutes: Math.max(0, durationMin - Math.round(durationMin * 0.8))
                };
            }

            // Check for tolls
            const tollInfo = {
                hasTolls: route.travelAdvisory?.tollInfo?.estimatedPrice?.length > 0 || false,
                estimatedCost: route.travelAdvisory?.tollInfo?.estimatedPrice?.[0]?.units || 0
            };

            return {
                summary: index === 0 ? 'Fastest route' : `Alternative ${index}`,
                distance: `${distanceKm} km`,
                duration: `${durationMin} min`,
                durationInTraffic: trafficInfo ? `${durationMin + trafficInfo.delayMinutes} min` : undefined,
                polyline: route.polyline.encodedPolyline,
                legs: [{
                    startAddress: leg.startLocation?.address || 'Start',
                    endAddress: leg.endLocation?.address || 'Destination',
                    distance: `${distanceKm} km`,
                    duration: `${durationMin} min`,
                    steps: leg.steps?.map((step: any) => ({
                        instruction: step.navigationInstruction?.instructions || '',
                        distance: `${(step.distanceMeters / 1000).toFixed(1)} km`,
                        duration: `${Math.round(parseInt(step.duration.replace('s', '')) / 60)} min`
                    })) || []
                }],
                trafficInfo,
                tollInfo
            };
        });
    } catch (error) {
        console.error('Routes API calculation failed:', error);
        throw error;
    }
};

/**
 * Decode polyline for displaying on map
 */
export const decodePolyline = (encoded: string): Coordinates[] => {
    const poly: Coordinates[] = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
        let b;
        let shift = 0;
        let result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += dlat;

        shift = 0;
        result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += dlng;

        poly.push({
            lat: lat / 1e5,
            lng: lng / 1e5
        });
    }

    return poly;
};
