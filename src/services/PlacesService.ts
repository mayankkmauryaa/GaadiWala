/**
 * Places Service
 * Uses Google Places API (New) to fetch rich place details and recommendations
 */

import { Coordinates } from '../types';

export interface PlaceRecommendation {
    name: string;
    placeId: string;
    rating?: number;
    userRatingCount?: number;
    types: string[];
    priceLevel?: string;
    businessStatus?: string;
    openNow?: boolean;
    photoUrl?: string;
    vicinity?: string;
    location?: { lat: number, lng: number };
}

export const getNearbyPlaces = async (
    location: Coordinates,
    radius: number = 1000,
    type: string = 'restaurant|cafe|shopping_mall',
    apiKey: string
): Promise<PlaceRecommendation[]> => {
    try {
        const url = 'https://places.googleapis.com/v1/places:searchNearby';

        const requestBody = {
            includedTypes: type.split('|'),
            maxResultCount: 10,
            locationRestriction: {
                circle: {
                    center: {
                        latitude: location.lat,
                        longitude: location.lng
                    },
                    radius: radius
                }
            },
            languageCode: "en"
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'places.displayName,places.id,places.rating,places.userRatingCount,places.types,places.priceLevel,places.businessStatus,places.regularOpeningHours.openNow,places.photos,places.location'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            console.error('Places API Error:', response.status);
            throw new Error(`Places API failed: ${response.status}`);
        }

        const data = await response.json();

        if (!data.places) return [];

        return data.places.map((place: any) => ({
            name: place.displayName?.text || 'Unknown Place',
            placeId: place.id,
            rating: place.rating,
            userRatingCount: place.userRatingCount,
            types: place.types || [],
            priceLevel: place.priceLevel,
            businessStatus: place.businessStatus,
            openNow: place.regularOpeningHours?.openNow || false,
            photoUrl: place.photos && place.photos.length > 0
                ? `https://places.googleapis.com/v1/${place.photos[0].name}/media?maxHeightPx=400&maxWidthPx=400&key=${apiKey}`
                : undefined,
            vicinity: place.shortFormattedAddress,
            location: place.location ? { lat: place.location.latitude, lng: place.location.longitude } : undefined
        }));

    } catch (error) {
        console.error('Failed to get nearby places:', error);
        return [];
    }
};
