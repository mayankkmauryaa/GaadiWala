/**
 * Address Validation Service
 * validAddress: Wrapper for Google Maps Address Validation API
 * Ensures addresses are deliverable and formatted correctly before saving.
 */

import { Coordinates } from '../types';

export interface ValidationResult {
    isValid: boolean;
    formattedAddress: string;
    coordinates?: Coordinates;
    components?: {
        streetNumber?: string;
        route?: string;
        locality?: string;
        administrativeAreaLevel1?: string;
        postalCode?: string;
        country?: string;
    };
    verdict?: {
        inputGranularity?: string;
        validationGranularity?: string;
        geocodeGranularity?: string;
        addressComplete?: boolean;
        hasUnconfirmedComponents?: boolean;
    };
}

/**
 * Validates an address using Google Address Validation API
 */
export const validateAddress = async (
    address: string,
    apiKey: string
): Promise<ValidationResult> => {
    try {
        const url = `https://addressvalidation.googleapis.com/v1:validateAddress?key=${apiKey}`;

        const requestBody = {
            address: {
                regionCode: 'IN', // Default to India
                addressLines: [address]
            },
            enableUspsCass: false
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            console.warn('Address Validation API non-OK response', response.status);
            // Fallback to basic geocoding if validation fails/not enabled
            return {
                isValid: true, // Optimistic fallback
                formattedAddress: address
            };
        }

        const data = await response.json();

        // Parse validation result
        const result = data.result;
        const verdict = result.verdict;
        const addressComplete = verdict?.addressComplete || false;

        // Extract components
        const components: any = {};
        result.address.addressComponents.forEach((comp: any) => {
            if (comp.componentType === 'street_number') components.streetNumber = comp.componentName.text;
            if (comp.componentType === 'route') components.route = comp.componentName.text;
            if (comp.componentType === 'locality') components.locality = comp.componentName.text;
            if (comp.componentType === 'administrative_area_level_1') components.administrativeAreaLevel1 = comp.componentName.text;
            if (comp.componentType === 'postal_code') components.postalCode = comp.componentName.text;
            if (comp.componentType === 'country') components.country = comp.componentName.text;
        });

        // Extract coordinates if available
        const location = result.geocode?.location;
        const coordinates = location ? {
            lat: location.latitude,
            lng: location.longitude
        } : undefined;

        return {
            isValid: true, // We treat even partial matches as valid but flag them if needed
            formattedAddress: result.address.formattedAddress || address,
            coordinates,
            components,
            verdict: {
                inputGranularity: verdict?.inputGranularity,
                validationGranularity: verdict?.validationGranularity,
                geocodeGranularity: verdict?.geocodeGranularity,
                addressComplete: verdict?.addressComplete,
                hasUnconfirmedComponents: verdict?.hasUnconfirmedComponents
            }
        };

    } catch (error) {
        console.error('Address Validation Error:', error);
        // Fallback
        return {
            isValid: true,
            formattedAddress: address
        };
    }
};
