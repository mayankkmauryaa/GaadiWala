import React, { useState, useCallback, useEffect } from 'react';
// import { useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer, TrafficLayer, Polyline } from '@react-google-maps/api';
import { CONFIG } from '../firebase';
import { Coordinates } from '../types';

interface MapProps {
    pickup?: Coordinates;
    drop?: Coordinates;
    drivers?: Coordinates[];
    center?: Coordinates; // Allow manual center override
    className?: string;
    showTraffic?: boolean; // Added for Phase 3
    mapId?: string; // Added for 3D Buildings support (Phase 3)
    polyline?: string; // Added for custom route display (Phase 2 batching)
}

const defaultContainerStyle = {
    width: '100%',
    height: '100%',
    borderRadius: 'inherit'
};

const defaultCenter = {
    lat: 28.6139,
    lng: 77.2090 // New Delhi default
};

// Define libraries outside to avoid re-renders
const libraries: ("places" | "geometry" | "drawing" | "visualization")[] = ["places", "geometry"];

const MapContainer: React.FC<MapProps> = ({ pickup, drop, drivers, center, className, showTraffic, mapId, polyline }) => {
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: CONFIG.MAPS_API_KEY,
        libraries,
    });

    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [directionsResponse, setDirectionsResponse] = useState<google.maps.DirectionsResult | null>(null);

    const onLoad = useCallback((map: google.maps.Map) => {
        setMap(map);
    }, []);

    const onUnmount = useCallback(() => {
        setMap(null);
    }, []);

    // Decode Polyline helper (Internal)
    const decodePath = useCallback((encoded: string) => {
        if (!window.google || !encoded) return [];
        try {
            return window.google.maps.geometry.encoding.decodePath(encoded);
        } catch (e) {
            console.error("Polyline decoding failed", e);
            return [];
        }
    }, []);

    // Helper: Calculate route
    useEffect(() => {
        if (pickup && drop && isLoaded && window.google) {
            const directionsService = new window.google.maps.DirectionsService();
            directionsService.route({
                origin: pickup,
                destination: drop,
                travelMode: window.google.maps.TravelMode.DRIVING
            }, (result, status) => {
                if (status === window.google.maps.DirectionsStatus.OK && result) {
                    setDirectionsResponse(result);
                } else {
                    console.error(`Directions request failed: ${status}`);
                    setDirectionsResponse(null);
                }
            });
        } else {
            setDirectionsResponse(null);
        }
    }, [pickup, drop, isLoaded]);

    // Helper: Fit bounds
    const fitView = useCallback(() => {
        if (map && isLoaded && window.google) {
            const bounds = new window.google.maps.LatLngBounds();
            let pointsCount = 0;

            if (pickup) {
                bounds.extend(pickup);
                pointsCount++;
            }
            if (drop) {
                bounds.extend(drop);
                pointsCount++;
            }

            if (pointsCount > 0) {
                const isMobile = window.innerWidth < 1024; // lg breakpoint
                if (pointsCount === 1) {
                    const singlePointZoom = 16;
                    map.setCenter(pickup || center || defaultCenter);
                    map.setZoom(singlePointZoom);
                } else {
                    // Responsive padding
                    const desktopPadding = { top: 100, right: 100, bottom: 100, left: 100 };
                    const mobilePadding = { top: 80, right: 40, bottom: 250, left: 40 }; // More bottom padding for sheet

                    const padding = isMobile ? mobilePadding : desktopPadding;
                    map.fitBounds(bounds, padding);
                }
            }
        }
    }, [map, pickup, drop, center, isLoaded]);

    // Effect: Fit on data change
    useEffect(() => {
        fitView();
    }, [fitView]);

    // Effect: Handle Resize
    useEffect(() => {
        const handleResize = () => {
            // Debounce slightly or just call
            fitView();
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [fitView]);

    if (loadError) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center bg-red-50 text-red-600 p-6 rounded-[inherit]">
                <span className="material-symbols-outlined text-5xl mb-3 text-red-500">error</span>
                <p className="text-sm font-bold mb-2">Map Loading Failed</p>
                <p className="text-xs text-center text-red-500 mb-4 max-w-md">
                    {loadError.message || 'Unable to load Google Maps. Please check your internet connection and try again.'}
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!isLoaded) {
        return (
            <div className="h-full w-full bg-slate-900 animate-pulse rounded-[inherit] flex flex-col items-center justify-center text-slate-400 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900"></div>
                <div className="relative z-10 flex flex-col items-center">
                    <div className="size-16 border-4 border-slate-700 border-t-[#22c55e] rounded-full animate-spin mb-4"></div>
                    <p className="text-xs font-bold uppercase tracking-wider">Loading Map...</p>
                    <p className="text-[10px] text-slate-500 mt-1">Initializing Google Maps</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`w-full h-full relative ${className}`}>
            <GoogleMap
                mapContainerStyle={defaultContainerStyle}
                center={center || pickup || defaultCenter}
                zoom={14}
                onLoad={onLoad}
                onUnmount={onUnmount}
                options={{
                    disableDefaultUI: true,
                    zoomControl: false,
                    streetViewControl: false,
                    fullscreenControl: false,
                    mapId: mapId || '3f19f187063134e5', // Global Map ID for 3D Vector Maps
                    minZoom: 3, // Prevent zooming out to see "multiple earths"
                    maxZoom: 20, // Reasonable max zoom
                    restriction: {
                        latLngBounds: {
                            north: 85,
                            south: -85,
                            west: -180,
                            east: 180
                        },
                        strictBounds: true
                    },
                    styles: [
                        {
                            featureType: "poi",
                            elementType: "labels",
                            stylers: [{ visibility: "off" }]
                        }
                    ]
                }}
            >
                {showTraffic && <TrafficLayer />}
                {pickup && <Marker position={pickup} options={{ icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: "black", fillOpacity: 1, strokeColor: "white", strokeWeight: 2 } }} />}

                {drop && <Marker position={drop} label={{ text: "D", color: "white", fontWeight: "bold" }} />}

                {polyline && (
                    <Polyline
                        path={decodePath(polyline)}
                        options={{
                            strokeColor: "#F97316", // Optimized Route Color (Orange)
                            strokeOpacity: 0.8,
                            strokeWeight: 6,
                        }}
                    />
                )}

                {directionsResponse && !polyline && (
                    <DirectionsRenderer directions={directionsResponse} options={{
                        suppressMarkers: true,
                        polylineOptions: {
                            strokeColor: "#22c55e",
                            strokeWeight: 6,
                            strokeOpacity: 0.9
                        }
                    }} />
                )}

                {/* Driver Markers */}
                {drivers?.map((driver, idx) => (
                    <Marker
                        key={idx}
                        position={driver}
                        icon={{
                            path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                            scale: 4,
                            fillColor: "#F97316", // Orange-500
                            fillOpacity: 1,
                            strokeWeight: 1,
                            strokeColor: "white",
                            rotation: 0 // Ideally this needs heading
                        }}
                    />
                ))}
            </GoogleMap>
        </div>
    );
};

export default React.memo(MapContainer);
