/**
 * Roads API Service
 * Provides snap-to-road functionality for smooth tracking
 */

import { Coordinates } from '../types';

export const snapToRoads = async (
    path: Coordinates[],
    apiKey: string
): Promise<Coordinates[]> => {
    try {
        if (path.length === 0) return [];

        const pathStr = path.map(p => `${p.lat},${p.lng}`).join('|');
        const url = `https://roads.googleapis.com/v1/snapToRoads?path=${pathStr}&interpolate=true&key=${apiKey}`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Roads API failed: ${response.status}`);
        }

        const data = await response.json();

        if (!data.snappedPoints) return path;

        return data.snappedPoints.map((point: any) => ({
            lat: point.location.latitude,
            lng: point.location.longitude
        }));
    } catch (error) {
        console.error('Snap-to-roads failed:', error);
        return path; // Fallback to raw coords
    }
};

/**
 * Get nearest road for a single point
 */
export const getNearestRoad = async (
    location: Coordinates,
    apiKey: string
): Promise<Coordinates> => {
    try {
        const url = `https://roads.googleapis.com/v1/nearestRoads?points=${location.lat},${location.lng}&key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.snappedPoints && data.snappedPoints.length > 0) {
            return {
                lat: data.snappedPoints[0].location.latitude,
                lng: data.snappedPoints[0].location.longitude
            };
        }
        return location;
    } catch (error) {
        return location;
    }
};
