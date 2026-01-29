/**
 * Route Optimization API Service
 * Used for multi-stop batching (e.g. Tiffin delivery)
 * Calculates the most efficient sequence for a set of stops
 */

import { Coordinates } from '../types';

export interface OptimizedStop {
    orderId: string;
    type: 'PICKUP' | 'DELIVERY';
    location: Coordinates;
    address: string;
    arrivalTime?: string;
}

export interface OptimizationResult {
    optimizedStops: OptimizedStop[];
    totalDistance: string;
    totalDuration: string;
    polyline: string;
}

/**
 * Optimize a tour with multiple stops
 * Currently implements a simpler version using Routes API sequence optimization
 * (Real Route Optimization API requires more complex model, using waypoint optimization here)
 */
export const optimizeTiffinBatch = async (
    currentLocation: Coordinates,
    stops: OptimizedStop[],
    apiKey: string
): Promise<OptimizationResult> => {
    try {
        if (stops.length === 0) throw new Error("No stops to optimize");

        const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';

        // Convert stops to waypoints
        const intermediates = stops.map(stop => ({
            location: {
                latLng: {
                    latitude: stop.location.lat,
                    longitude: stop.location.lng
                }
            }
        }));

        const requestBody = {
            origin: {
                location: {
                    latLng: {
                        latitude: currentLocation.lat,
                        longitude: currentLocation.lng
                    }
                }
            },
            destination: intermediates[intermediates.length - 1], // Last stop as destination
            intermediates: intermediates.slice(0, -1), // Everything else as intermediates
            travelMode: 'DRIVE',
            routingPreference: 'TRAFFIC_AWARE',
            optimizeWaypointOrder: true, // This is the key for optimization
            languageCode: 'en-US',
            units: 'METRIC'
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.optimizedWaypointOrder'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`Route Optimization failed: ${response.status}`);
        }

        const data = await response.json();
        const route = data.routes[0];

        // Map optimized order back to stops
        // optimizedWaypointOrder returns indices of intermediates
        const optimizedOrderIndices = data.routes[0].optimizedWaypointOrder || [];
        const optimizedStops: OptimizedStop[] = [];

        // Add intermediates in optimized order
        optimizedOrderIndices.forEach((idx: number) => {
            optimizedStops.push(stops[idx]);
        });

        // Add the destination stop (which was not an intermediate)
        optimizedStops.push(stops[stops.length - 1]);

        return {
            optimizedStops,
            totalDistance: `${(route.distanceMeters / 1000).toFixed(1)} km`,
            totalDuration: `${Math.round(parseInt(route.duration.replace('s', '')) / 60)} min`,
            polyline: route.polyline.encodedPolyline
        };
    } catch (error) {
        console.error('Tiffin batch optimization failed:', error);
        throw error;
    }
};
