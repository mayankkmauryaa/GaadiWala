
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';
import { User, RideType, VehicleCategory, SavedLocation, ScheduledRide, Coordinates, RidePreferences } from '../../types';
import MapContainer from '../../components/MapContainer';
import DistrictPicker from '../../components/Discovery/DistrictPicker';
import TiffinSelector from '../../components/Tiffin/TiffinSelector';
import SOSButton from '../../components/Safety/SOSButton'; // New
import SavedPlaces from '../../components/Discovery/SavedPlaces'; // New
import { calculateFare } from '../../services/pricing'; // New
import { db, CONFIG } from '../../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import GlobalBanner from '../../components/GlobalBanner';
import ScrollHint from '../../components/shared/ScrollHint';
import { getCurrentPosition, GeolocationError, GeolocationErrorType } from '../../utils/GeolocationHelper';
import { calculateRoutes, RouteOption } from '../../services/RoutesService';

interface Props {
    user: User;
    onSaveLocation: (loc: SavedLocation) => void;
    onSchedule: (ride: ScheduledRide) => void;
}

const libraries: ("places" | "geometry" | "drawing" | "visualization")[] = ["places", "geometry"];

const RiderHome: React.FC<Props> = ({ user, onSaveLocation, onSchedule }) => {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: CONFIG.MAPS_API_KEY,
        libraries,
    });

    const [pickup, setPickup] = useState('');
    const [destination, setDestination] = useState('');
    const [pickupCoords, setPickupCoords] = useState<Coordinates | undefined>(undefined);
    const [dropCoords, setDropCoords] = useState<Coordinates | undefined>(undefined);

    const [rideType, setRideType] = useState<RideType>('RESERVED');
    const [category, setCategory] = useState<VehicleCategory>(VehicleCategory.MINI);
    const [isLocating, setIsLocating] = useState(false);
    const [isScheduling, setIsScheduling] = useState(false);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [isCalculatingForensics, setIsCalculatingForensics] = useState(false);
    const [scheduleDate, setScheduleDate] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [showSidebar, setShowSidebar] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [preferences, setPreferences] = useState<RidePreferences>({
        silent: false,
        ac: false,
        music: false
    });
    const [passengerCount, setPassengerCount] = useState<number>(1);

    const [routeForensics, setRouteForensics] = useState<{ distance: string, duration: string } | null>(null);

    // Routes API state
    const [routeOptions, setRouteOptions] = useState<RouteOption[]>([]);
    const [selectedRoute, setSelectedRoute] = useState<number>(0);
    const [isCalculatingRoutes, setIsCalculatingRoutes] = useState(false);
    const [showRouteOptions, setShowRouteOptions] = useState(false);

    // Recommendations state
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [isLoadingRecs, setIsLoadingRecs] = useState(false);

    // Fetch suggestions if we have pickup coords but no suggestions yet
    useEffect(() => {
        if (pickupCoords && window.google) {
            import('../../services/PlacesService').then(({ getNearbyPlaces }) => {
                getNearbyPlaces(pickupCoords, 5000, 'tourist_attraction|train_station|shopping_mall', CONFIG.MAPS_API_KEY)
                    .then(places => {
                        const formatted = places.map(p => ({
                            icon: p.types.includes('train_station') ? 'train' :
                                p.types.includes('shopping_mall') ? 'shopping_bag' : 'place',
                            label: p.name,
                            desc: p.vicinity || p.types[0]?.replace('_', ' '),
                            address: p.name,
                            lat: p.location?.lat,
                            lng: p.location?.lng
                        })).slice(0, 4);
                        setSuggestions(formatted);
                    });
            });
        }
    }, [pickupCoords]);

    const [currentTime, setCurrentTime] = useState(new Date());
    const [nearbyDrivers, setNearbyDrivers] = useState<{ id: string, [key: string]: any }[]>([]);

    // System Config for Pricing
    const [sysConfig] = useState({
        baseFares: { BIKE: 6, AUTO: 10, MINI: 20, PINK: 25, PRIME: 40 } as Record<VehicleCategory, number>,
        surgeMultiplier: 1.0
    });

    const pickupRef = useRef<google.maps.places.Autocomplete | null>(null);
    const dropRef = useRef<google.maps.places.Autocomplete | null>(null);
    const panelScrollRef = useRef<HTMLElement>(null);

    const navigate = useNavigate();

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        // Auto-locate on mount
        handleGetLocation();
        return () => clearInterval(timer);
    }, []);

    // Discovery: Listen to all drivers
    useEffect(() => {
        console.log('Starting driver discovery...');

        const q = query(
            collection(db, 'users'),
            where('role', '==', 'DRIVER')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            try {
                if (snapshot.metadata.fromCache && snapshot.empty) return;
                console.log('Firestore snapshot received, docs:', snapshot.docs.length);

                const drivers = snapshot.docs
                    .map(doc => {
                        const data = doc.data();
                        console.log('Driver doc:', doc.id, data);
                        return { id: doc.id, ...data };
                    })
                    .filter((d: any) =>
                        d &&
                        d.isActive !== false &&
                        d.currentLocation &&
                        typeof d.currentLocation.lat === 'number' &&
                        typeof d.currentLocation.lng === 'number'
                    );

                console.log('Valid drivers found:', drivers.length);
                console.log('Online drivers:', drivers.filter((d: any) => d.isOnline).length);

                setNearbyDrivers(drivers as any);
            } catch (err) {
                console.error("Firestore Listener Error (Homepage):", err);
            }
        }, (error) => {
            console.error("Firestore onSnapshot error:", error);
            setError("Connectivity issue. Reconnecting...");
            setNearbyDrivers([]);
        });

        return () => unsubscribe();
    }, []);

    // Get current location on mount or request
    const handleGetLocation = async () => {
        setIsLocating(true);
        setError(null);

        try {
            const coords = await getCurrentPosition({
                timeout: 10000,
                enableHighAccuracy: true,
                retries: 2
            });

            setPickupCoords(coords);
            setPickup("Current Location");
            setError(null);
        } catch (err) {
            const geoError = err as GeolocationError;
            console.error('Geolocation error:', geoError);
            setError(geoError.userMessage);

            // If permission denied, don't auto-retry
            if (geoError.type !== GeolocationErrorType.PERMISSION_DENIED) {
                // Clear pickup if it was set to "Current Location"
                if (pickup === "Current Location") {
                    setPickup('');
                    setPickupCoords(undefined);
                }
            }
        } finally {
            setIsLocating(false);
        }
    };

    const onPickupLoad = (autocomplete: google.maps.places.Autocomplete) => {
        pickupRef.current = autocomplete;
    };

    const onPickupPlaceChanged = () => {
        if (pickupRef.current) {
            const place = pickupRef.current.getPlace();
            if (place && place.geometry && place.geometry.location) {
                const lat = place.geometry.location.lat();
                const lng = place.geometry.location.lng();
                setPickupCoords({ lat, lng });
                setPickup(place.formatted_address || place.name || "");
            }
        }
    };

    const onDropLoad = (autocomplete: google.maps.places.Autocomplete) => {
        dropRef.current = autocomplete;
    };

    const onDropPlaceChanged = () => {
        if (dropRef.current) {
            const place = dropRef.current.getPlace();
            if (place && place.geometry && place.geometry.location) {
                const lat = place.geometry.location.lat();
                const lng = place.geometry.location.lng();
                setDropCoords({ lat, lng });
                setDestination(place.formatted_address || place.name || "");
                setError(null);
            }
        }
    };

    // Proactive Geocoding for manual entries
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (pickup && !pickupCoords && pickup !== "Current Location") {
                try {
                    const coords = await geocodeAddress(pickup);
                    setPickupCoords(coords);
                } catch (e) { }
            }
        }, 1500); // 1.5s debounce
        return () => clearTimeout(timer);
    }, [pickup, pickupCoords]);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (destination && !dropCoords) {
                try {
                    const coords = await geocodeAddress(destination);
                    setDropCoords(coords);
                } catch (e) { }
            }
        }, 1500); // 1.5s debounce
        return () => clearTimeout(timer);
    }, [destination, dropCoords]);

    // Calculate routes using Routes API when both coords are available
    useEffect(() => {
        if (pickupCoords && dropCoords) {
            setIsCalculatingRoutes(true);
            setIsCalculatingForensics(true);
            console.log('Calculating routes between:', pickupCoords, dropCoords);

            calculateRoutes(pickupCoords, dropCoords, CONFIG.MAPS_API_KEY)
                .then(routes => {
                    console.log('Routes API Response:', routes);
                    setRouteOptions(routes);
                    setSelectedRoute(0); // Default to first (fastest) route

                    if (routes.length > 0) {
                        const mainRoute = routes[0];
                        setRouteForensics({
                            distance: mainRoute.distance,
                            duration: mainRoute.durationInTraffic || mainRoute.duration
                        });
                        setShowRouteOptions(routes.length > 1); // Show options if multiple routes
                    }
                    setIsCalculatingRoutes(false);
                    setIsCalculatingForensics(false);
                })
                .catch(error => {
                    console.error('Routes API Error:', error);

                    // Fallback to Distance Matrix API if Routes API fails
                    if (window.google) {
                        console.log('Falling back to Distance Matrix API...');
                        const service = new window.google.maps.DistanceMatrixService();
                        service.getDistanceMatrix({
                            origins: [pickupCoords],
                            destinations: [dropCoords],
                            travelMode: google.maps.TravelMode.DRIVING,
                            unitSystem: google.maps.UnitSystem.METRIC,
                        }, (response, status) => {
                            if (status === 'OK' && response && response.rows[0]?.elements[0]?.status === 'OK') {
                                const result = response.rows[0].elements[0];
                                setRouteForensics({
                                    distance: result.distance.text,
                                    duration: result.duration.text
                                });
                            } else {
                                setError('Unable to calculate route. Please try again.');
                                setRouteForensics({
                                    distance: 'N/A',
                                    duration: 'N/A'
                                });
                            }
                            setIsCalculatingRoutes(false);
                            setIsCalculatingForensics(false);
                        });
                    } else {
                        setError('Maps not loaded. Please refresh the page.');
                        setIsCalculatingRoutes(false);
                        setIsCalculatingForensics(false);
                    }
                });
        } else {
            setRouteForensics(null);
            setRouteOptions([]);
            setShowRouteOptions(false);
            setIsCalculatingForensics(false);
            setIsCalculatingRoutes(false);
        }
    }, [pickupCoords, dropCoords]);



    const categories: { type: VehicleCategory; label: string; icon: string; base: number; isPink?: boolean }[] = [
        { type: VehicleCategory.BIKE, label: 'Bike', icon: 'motorcycle', base: 10 },
        { type: VehicleCategory.AUTO, label: 'Auto', icon: 'electric_rickshaw', base: 15 },
        { type: VehicleCategory.MINI, label: 'Gaadiwala Go', icon: 'directions_car', base: 25 },
        { type: VehicleCategory.PINK, label: 'Pink Cab', icon: 'female', base: 30, isPink: true },
        { type: VehicleCategory.PRIME, label: 'Luxury', icon: 'local_taxi', base: 50 },
    ];


    const geocodeAddress = (address: string): Promise<Coordinates> => {
        return new Promise((resolve, reject) => {
            if (!window.google) {
                reject(new Error("Maps API not loaded"));
                return;
            }
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ address }, (results, status) => {
                if (status === 'OK' && results && results[0].geometry.location) {
                    const loc = results[0].geometry.location;
                    resolve({ lat: loc.lat(), lng: loc.lng() });
                } else {
                    reject(new Error(`Geocode failed: ${status}`));
                }
            });
        });
    };

    const handleConfirm = async () => {
        if (!pickup || !destination) {
            setError("Please enter both pickup and destination.");
            return;
        }

        setError(null);
        setIsGeocoding(true);

        try {
            let pCoords = pickupCoords;
            let dCoords = dropCoords;

            // Geocode if missing
            if (!pCoords) {
                if (pickup === "Current Location") {
                    // Try to get actual GPS using our helper
                    try {
                        pCoords = await getCurrentPosition({
                            timeout: 8000,
                            enableHighAccuracy: true,
                            retries: 1
                        });
                        setPickupCoords(pCoords);
                    } catch (e) {
                        const geoError = e as GeolocationError;
                        throw new Error(geoError.userMessage || "Could not access your GPS location. Please type an address or select from suggestions.");
                    }
                } else {
                    try {
                        pCoords = await geocodeAddress(pickup);
                        setPickupCoords(pCoords);
                    } catch (e) {
                        throw new Error("Could not find pickup location on map. Please try a more specific address.");
                    }
                }
            }

            if (!dCoords) {
                try {
                    dCoords = await geocodeAddress(destination);
                    setDropCoords(dCoords);
                } catch (e) {
                    throw new Error("Could not find destination on map. Please try a more specific address.");
                }
            }

            // Calculate initial fare for the next screen
            let calculatedFare = 0;
            if (routeForensics) {
                const pricingSingle = calculateFare(10, 30, category, user, sysConfig, 1);
                const basePrice10km = rideType === 'SHARED' ? Math.round(pricingSingle.total * 0.7) : pricingSingle.total;
                const actualDist = parseFloat(routeForensics.distance.split(' ')[0]);
                calculatedFare = Math.round((basePrice10km / 10) * actualDist) * passengerCount;
            }

            navigate('/user/fare', {
                state: {
                    pickup,
                    destination,
                    pickupCoords: pCoords,
                    dropCoords: dCoords,
                    rideType,
                    category,
                    scheduledTimestamp: isScheduling ? new Date(scheduleDate).getTime() : undefined,
                    preferences,
                    initialFare: calculatedFare || 250, // Pass the calculated/offered price
                    forensics: routeForensics, // Pass distance/time data
                    passengerCount // Pass passenger count
                }
            });
        } catch (err: any) {
            setError(err.message || "Precision location error.");
        } finally {
            setIsGeocoding(false);
        }
    };

    const handleSaveCurrent = () => {
        if (!destination) return;
        const label = prompt("Enter a label for this location (e.g., Home, Office):");
        if (label) {
            onSaveLocation({
                id: Math.random().toString(36).substr(2, 9),
                label: label || 'Saved Place',
                address: destination,
                type: 'OTHER'
            });
        }
    };

    return (
        <div className="flex flex-col lg:flex-row min-h-dvh h-dvh w-full overflow-hidden bg-[#0F172A] text-slate-200 font-sans pb-safe">
            <GlobalBanner />
            {/* Mobile Nav Header */}
            <div className="lg:hidden h-16 bg-[#1e293b] border-b border-white/5 px-4 flex items-center justify-between z-[60] shadow-md">
                <div className="flex items-center gap-3">
                    <button onClick={() => setShowSidebar(!showSidebar)} className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-white border border-white/10 active:scale-95 transition-all">
                        <span className="material-symbols-outlined">{showSidebar ? 'close' : 'menu'}</span>
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="size-8 bg-[#22c55e] rounded-lg flex items-center justify-center text-black shadow-lg shadow-[#22c55e]/20">
                            <span className="material-symbols-outlined text-base font-black">rocket_launch</span>
                        </div>
                        <span className="text-lg font-black italic tracking-tighter uppercase text-white">Gaadiwala</span>
                    </div>
                </div>
                {/* Global Error Banner */}
                {error && (
                    <div className="absolute top-[100%] left-0 right-0 bg-red-500 text-white px-6 py-2 z-[100] flex justify-between items-center animate-in slide-in-from-top duration-300">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">error</span>
                            <p className="text-[10px] lg:text-xs font-bold uppercase tracking-widest">{error}</p>
                        </div>
                        <button onClick={() => setError(null)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                            <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Mobile Sidebar Overlay/Backdrop */}
            {showSidebar && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[65] lg:hidden transition-opacity duration-300"
                    onClick={() => setShowSidebar(false)}
                />
            )}

            <aside className={`
                fixed inset-y-0 left-0 bg-[#0F172A] border-r border-white/10 z-[70] transform transition-all duration-300 lg:relative lg:translate-x-0
                ${showSidebar ? 'translate-x-0' : '-translate-x-full'}
                ${isSidebarCollapsed ? 'lg:w-24' : 'lg:w-80'}
                flex flex-col justify-between py-10 shrink-0 shadow-[20px_0_50px_rgba(0,0,0,0.3)]
                animate-in slide-in-from-left duration-700
            `}>
                <button
                    onClick={() => setShowSidebar(false)}
                    className="lg:hidden absolute top-6 right-6 size-10 rounded-full bg-white/5 flex items-center justify-center text-white border border-white/10"
                >
                    <span className="material-symbols-outlined">close</span>
                </button>

                {/* Desktop Toggle Button - Top Right */}
                <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="hidden lg:flex absolute top-4 -right-3 size-6 rounded-full bg-[#1e293b] border border-white/20 items-center justify-center text-slate-400 hover:text-white hover:border-[#22c55e] transition-all z-50 shadow-lg"
                >
                    <span className="material-symbols-outlined text-xs">
                        {isSidebarCollapsed ? 'chevron_right' : 'chevron_left'}
                    </span>
                </button>

                <div className="px-8 space-y-10 flex flex-col items-center lg:items-stretch w-full">
                    {/* Brand Logo */}
                    <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center w-full' : 'gap-4'} mb-0`}>
                        <div className="size-10 lg:size-12 bg-[#0A0E12] border border-white/10 rounded-2xl flex items-center justify-center shadow-lg relative overflow-hidden group shrink-0">
                            <span className="material-symbols-outlined text-[#22c55e] text-xl lg:text-2xl font-black relative z-10">rocket_launch</span>
                        </div>
                        {!isSidebarCollapsed && (
                            <div className="animate-in fade-in duration-300">
                                <span className="hidden lg:block text-xl lg:text-2xl font-black tracking-tight uppercase text-slate-100 leading-none">Gaadiwala</span>
                                <p className="hidden lg:block text-[9px] lg:text-[11px] font-bold text-slate-400 uppercase tracking-wide leading-none mt-1">
                                    Your Daily Ride
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-3 lg:gap-4 px-4 lg:px-0 w-full">
                        {!isSidebarCollapsed && (
                            <p className="text-[10px] lg:text-[12px] font-bold uppercase text-slate-400 tracking-wider pl-2 animate-in fade-in">
                                Ride Type
                            </p>
                        )}
                        <div className={`flex ${isSidebarCollapsed ? 'flex-col gap-2 bg-transparent border-none p-0' : 'bg-[#1e293b] p-1.5 rounded-[1.2rem] border border-white/5'} relative shadow-sm transition-all`}>
                            <button
                                onClick={() => setRideType('RESERVED')}
                                className={`flex items-center justify-center py-2 lg:py-3 rounded-[0.9rem] font-bold uppercase tracking-wide transition-all ${rideType === 'RESERVED' ? 'bg-[#22c55e] text-black shadow-sm' : 'text-slate-400 hover:text-slate-200'} ${isSidebarCollapsed ? 'size-10 lg:size-12 rounded-2xl border border-white/10 !p-0 bg-[#1e293b]' : 'flex-1 text-[10px] lg:text-[11px]'}`}
                                title="Personal Ride"
                            >
                                {isSidebarCollapsed ? <span className="material-symbols-outlined text-lg">person</span> : 'Personal'}
                            </button>
                            <button
                                onClick={() => setRideType('SHARED')}
                                className={`flex items-center justify-center py-2 lg:py-3 rounded-[0.9rem] font-bold uppercase tracking-wide transition-all ${rideType === 'SHARED' ? 'bg-[#22c55e] text-black shadow-sm' : 'text-slate-400 hover:text-slate-200'} ${isSidebarCollapsed ? 'size-10 lg:size-12 rounded-2xl border border-white/10 !p-0 bg-[#1e293b]' : 'flex-1 text-[10px] lg:text-[11px]'}`}
                                title="Shared Ride"
                            >
                                {isSidebarCollapsed ? <span className="material-symbols-outlined text-lg">groups</span> : 'Shared'}
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 lg:gap-4 px-4 lg:px-0 w-full mt-4">
                        {!isSidebarCollapsed && (
                            <p className="text-[10px] lg:text-[12px] font-bold uppercase text-slate-400 tracking-wider pl-2 animate-in fade-in">
                                Passengers
                            </p>
                        )}
                        <div className={`flex items-center justify-between ${isSidebarCollapsed ? 'flex-col gap-2 bg-transparent' : 'bg-[#1e293b] p-2 rounded-[1.2rem] border border-white/5'} transition-all`}>
                            {!isSidebarCollapsed && (
                                <div className="flex items-center gap-3 pl-2">
                                    <span className="material-symbols-outlined text-slate-400">group</span>
                                    <span className="text-white font-bold">{passengerCount} Person{passengerCount > 1 ? 's' : ''}</span>
                                </div>
                            )}
                            <div className={`flex items-center gap-1 ${isSidebarCollapsed ? 'flex-col' : ''}`}>
                                <button
                                    onClick={() => setPassengerCount(Math.max(1, passengerCount - 1))}
                                    disabled={passengerCount <= 1}
                                    className={`size-8 rounded-full flex items-center justify-center border transition-all ${passengerCount <= 1 ? 'border-white/5 text-slate-600' : 'border-white/20 text-white hover:bg-white/10'}`}
                                >
                                    <span className="material-symbols-outlined text-sm">remove</span>
                                </button>
                                {isSidebarCollapsed && <span className="text-[10px] font-bold text-white my-1">{passengerCount}</span>}
                                <button
                                    onClick={() => setPassengerCount(Math.min(4, passengerCount + 1))}
                                    disabled={passengerCount >= 4}
                                    className={`size-8 rounded-full flex items-center justify-center border transition-all ${passengerCount >= 4 ? 'border-white/5 text-slate-600' : 'border-white/20 text-white hover:bg-white/10'}`}
                                >
                                    <span className="material-symbols-outlined text-sm">add</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 pt-2 lg:pt-4 px-4 lg:px-0 w-full">
                        {!isSidebarCollapsed && <p className="text-[10px] lg:text-[12px] font-bold uppercase text-slate-400 tracking-wider pl-2 animate-in fade-in">Select Vehicle</p>}
                        <div className="grid grid-cols-1 gap-3">
                            {
                                categories.map((item) => {
                                    // Capacity Check
                                    const capacityLimit = {
                                        [VehicleCategory.BIKE]: 1,
                                        [VehicleCategory.AUTO]: 3,
                                        [VehicleCategory.MINI]: 4,
                                        [VehicleCategory.PRIME]: 4,
                                        [VehicleCategory.PINK]: 4
                                    }[item.type] || 4;

                                    const isCapacityInvalid = passengerCount > capacityLimit;

                                    // Calculate based on 10km reference for comparison
                                    const pricingSingle = calculateFare(10, 30, item.type, user, sysConfig, 1);
                                    const basePrice10km = rideType === 'SHARED' ? Math.round(pricingSingle.total * 0.7) : pricingSingle.total;
                                    const totalDisplayPrice = basePrice10km * passengerCount;

                                    const discountLabel = pricingSingle.discounts.length > 0 ? pricingSingle.discounts[0].description : null;

                                    const isRestricted = (item.type === VehicleCategory.PINK && user.gender !== 'FEMALE' && user.role !== 'ADMIN') || isCapacityInvalid;
                                    const isActive = category === item.type;

                                    // If capacity invalid, don't show unless sidebar is collapsed (to maintain layout), or show disabled

                                    return (
                                        <button
                                            key={item.type}
                                            disabled={isRestricted}
                                            onClick={() => {
                                                if (item.type === VehicleCategory.PINK && user.gender !== 'FEMALE' && user.role !== 'ADMIN') {
                                                    setError("Pink Cab is reserved for Women riders only.");
                                                    return;
                                                }
                                                if (isCapacityInvalid) {
                                                    setError(`This vehicle supports max ${capacityLimit} passengers.`);
                                                    return;
                                                }
                                                setCategory(item.type);
                                            }}
                                            className={`flex items-center gap-3 lg:gap-4 p-2 rounded-[1.5rem] border transition-all duration-300 w-full ${isActive
                                                ? (item.isPink ? 'border-pink-500 bg-pink-500/10' : 'border-[#22c55e] bg-[#22c55e]/10')
                                                : 'border-transparent hover:bg-[#1e293b]'
                                                } ${isRestricted ? 'opacity-30 grayscale' : ''} ${isSidebarCollapsed ? 'justify-center !p-0 !bg-transparent !border-none' : 'p-3 lg:p-4'}`}
                                            title={`${item.label} - ₹${totalDisplayPrice}`}
                                        >
                                            {isActive && !isRestricted && !isSidebarCollapsed && (
                                                <div className={`absolute top-0 right-0 p-1.5 rounded-bl-2xl ${item.isPink ? 'bg-pink-500' : 'bg-[#22c55e]'}`}>
                                                    <span className="material-symbols-outlined text-[12px] text-black font-bold">check</span>
                                                </div>
                                            )}
                                            <div className={`size-10 lg:size-12 rounded-xl flex items-center justify-center transition-all duration-300 shrink-0 ${isActive && !isRestricted
                                                ? (item.isPink ? 'bg-pink-500 text-white' : 'bg-[#22c55e] text-black')
                                                : 'bg-[#1e293b] text-slate-400 group-hover:text-slate-200'
                                                }`}>
                                                <span className="material-symbols-outlined text-xl lg:text-2xl">{item.icon}</span>
                                            </div>

                                            {!isSidebarCollapsed && (
                                                <div className="flex-1 text-left min-w-0 animate-in fade-in slide-in-from-left-2">
                                                    <h4 className={`text-[12px] lg:text-[14px] font-bold tracking-wide uppercase mb-0.5 ${isActive ? 'text-white' : 'text-slate-300'}`}>{item.label}</h4>
                                                    <div className="flex flex-col">
                                                        <div className="flex items-baseline gap-1">
                                                            <p className={`text-lg lg:text-xl font-bold tracking-tight leading-none ${isActive ? (item.isPink ? 'text-pink-400' : 'text-[#22c55e]') : 'text-slate-500'}`}>
                                                                ₹{totalDisplayPrice}
                                                            </p>
                                                            {passengerCount > 1 && (
                                                                <p className="text-[9px] text-slate-500 font-bold">
                                                                    (₹{basePrice10km} × {passengerCount})
                                                                </p>
                                                            )}
                                                        </div>
                                                        {!routeForensics && <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-0.5">/ 10KM RATE</span>}
                                                    </div>
                                                    {discountLabel && <span className="text-[9px] bg-[#22c55e]/20 text-[#22c55e] px-2 py-0.5 rounded-md font-bold uppercase">Saved</span>}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })
                            }
                        </div>
                    </div>



                    {!isSidebarCollapsed && (
                        <div className="space-y-4 pt-2 lg:pt-4 px-4 lg:px-0 animate-in fade-in">
                            <p className="text-[10px] lg:text-[12px] font-bold uppercase text-slate-400 tracking-wider pl-2">Comfort Settings</p>
                            <div className="flex gap-2 lg:gap-3">
                                {[
                                    { id: 'silent', icon: 'volume_off', label: 'Silent' },
                                    { id: 'ac', icon: 'ac_unit', label: 'AC' },
                                    { id: 'music', icon: 'music_note', label: 'Music' }
                                ].map(pref => (
                                    <button
                                        key={pref.id}
                                        onClick={() => setPreferences({ ...preferences, [pref.id]: !preferences[pref.id as keyof RidePreferences] })}
                                        className={`flex-1 p-3 lg:p-4 rounded-[1.2rem] border transition-all flex flex-col items-center gap-1 lg:gap-2 ${preferences[pref.id as keyof RidePreferences] ? 'border-[#22c55e] bg-[#22c55e]/10 text-[#22c55e]' : 'border-white/5 bg-[#1e293b] text-slate-400 hover:text-slate-200 hover:bg-[#283548]'}`}
                                    >
                                        <span className="material-symbols-outlined text-base lg:text-lg">{pref.icon}</span>
                                        <span className="text-[9px] lg:text-[10px] font-bold uppercase tracking-wide">{pref.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-4 lg:px-8 mt-auto pt-4 lg:pt-10">
                    {/* Gold Member Section Removed */}
                </div>
            </aside>

            <main className="flex-1 flex flex-col lg:flex-row-reverse relative h-full overflow-hidden">
                {/* 40% Map on Mobile / Full on Desktop */}
                <div className="h-[40dvh] lg:h-full flex-1 relative overflow-hidden order-1 lg:order-2 border-b lg:border-none border-white/10">
                    <MapContainer
                        pickup={pickupCoords}
                        drop={dropCoords}
                        drivers={nearbyDrivers.map(d => d.currentLocation).filter((l): l is Coordinates => !!l)}
                    />
                </div>

                {/* 60% Panel on Mobile / Fixed with on Desktop */}
                <section
                    ref={panelScrollRef}
                    className="w-full lg:max-w-[420px] bg-[#0A0E12] h-[60dvh] lg:h-full shadow-[0_-20px_50px_rgba(0,0,0,0.5)] lg:shadow-2xl z-40 flex flex-col p-4 sm:p-6 lg:p-8 overflow-y-auto relative scrollbar-hide order-2 lg:order-1 border-r border-white/5 pb-safe animate-in slide-in-from-bottom duration-700"
                >
                    <ScrollHint containerRef={panelScrollRef as any} />
                    <header className="flex flex-col gap-3 mb-4 lg:mb-8 shrink-0">
                        <div className="flex items-center justify-between lg:items-start">
                            <div className='flex flex-col'>
                                <p className="text-[#22c55e] text-[9px] sm:text-[10px] lg:text-[11px] font-bold uppercase tracking-widest mb-1 lg:mb-1.5 leading-none">Your Journey</p>
                                <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight uppercase leading-none text-white">Plan <span className="text-[#22c55e]">Ride</span></h2>
                            </div>

                            <button
                                onClick={() => setIsScheduling(!isScheduling)}
                                className={`px-3 py-1.5 lg:px-6 lg:py-2.5 lg:mt-16 rounded-lg lg:rounded-xl text-[7px] lg:text-[9px] font-black uppercase tracking-widest transition-all magnetic-btn flex items-center justify-center ${isScheduling ? 'bg-orange-500 text-white shadow-lg' : 'bg-white/10 text-slate-400 hover:bg-white/20'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-xs mr-1 lg:mr-2">{isScheduling ? 'event_upcoming' : 'schedule'}</span>
                                <span className="hidden sm:inline">{isScheduling ? 'Schedule On' : 'Schedule For Later'}</span>
                            </button>
                        </div>

                        {isScheduling && (
                            <div className="animate-in slide-in-from-top-2 duration-300">
                                <label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] mb-2 block pl-1">Pick Date & Time</label>
                                <div className="bg-white/5 border border-white/10 rounded-xl p-2 flex items-center gap-2">
                                    <input
                                        type="datetime-local"
                                        value={scheduleDate}
                                        onChange={(e) => setScheduleDate(e.target.value)}
                                        className="bg-transparent border-none text-white text-xs font-bold w-full outline-none p-2 rounded-lg focus:ring-1 focus:ring-orange-500/50"
                                        min={new Date().toISOString().slice(0, 16)}
                                    />
                                </div>
                            </div>
                        )}
                    </header>

                    {/* Primary Features - Always visible on first sight */}
                    {/* Primary Features - Always visible on first sight */}
                    <div className="space-y-3 lg:space-y-5 shrink-0">
                        <div className="relative group">
                            <div className="flex items-center bg-white/5 rounded-xl lg:rounded-[1.5rem] border border-white/10 p-1 lg:p-1.5 focus-within:glow-green focus-within:border-[#22c55e]/50 transition-all relative overflow-hidden backdrop-blur-sm">
                                <div className="w-10 flex justify-center text-[#22c55e] shrink-0">
                                    <span className={`material-symbols-outlined text-base lg:text-lg ${isLocating ? 'animate-spin' : ''}`}>
                                        {isLocating ? 'sync' : 'radio_button_checked'}
                                    </span>
                                </div>
                                {isLoaded ? (
                                    <Autocomplete onLoad={onPickupLoad} onPlaceChanged={onPickupPlaceChanged} className="w-full">
                                        <input
                                            className="w-full h-10 sm:h-12 bg-transparent border-none focus:ring-0 text-xs sm:text-sm font-black text-white placeholder:text-slate-500"
                                            value={pickup}
                                            onChange={e => { setPickup(e.target.value); setPickupCoords(undefined); }}
                                            placeholder="PICKUP LOCATION"
                                        />
                                    </Autocomplete>
                                ) : (
                                    <input className="w-full h-8 lg:h-10 bg-transparent border-none px-4" placeholder="..." disabled />
                                )}
                                <button onClick={handleGetLocation} className="pr-2 lg:pr-3 text-slate-500 hover:text-[#22c55e] transition-colors magnetic-btn">
                                    <span className="material-symbols-outlined text-[14px] lg:text-[18px]">my_location</span>
                                </button>
                            </div>
                        </div>

                        <div className="relative group">
                            <div className="flex items-center bg-white/5 rounded-xl lg:rounded-[1.5rem] border border-white/10 p-1 lg:p-1.5 focus-within:glow-green focus-within:border-[#22c55e]/50 transition-all relative overflow-hidden backdrop-blur-sm">
                                <div className="w-8 lg:w-10 flex justify-center text-orange-500">
                                    <span className="material-symbols-outlined text-sm lg:text-lg">location_on</span>
                                </div>
                                {isLoaded ? (
                                    <Autocomplete onLoad={onDropLoad} onPlaceChanged={onDropPlaceChanged} className="w-full">
                                        <div className="relative w-full flex items-center">
                                            <input
                                                className="w-full h-8 lg:h-10 bg-transparent border-none focus:ring-0 text-xs lg:text-sm font-black text-white placeholder:text-slate-500 pr-6" // Added padding-right
                                                placeholder="DESTINATION"
                                                value={destination}
                                                onChange={e => { setDestination(e.target.value); setDropCoords(undefined); }}
                                            />
                                            {destination && (
                                                <button
                                                    onClick={() => {
                                                        setDestination('');
                                                        setDropCoords(undefined);
                                                        setRouteForensics(null);
                                                        setRouteOptions([]);
                                                    }}
                                                    className="absolute right-0 p-1 text-slate-500 hover:text-white transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-sm">close</span>
                                                </button>
                                            )}
                                        </div>
                                    </Autocomplete>
                                ) : (
                                    <input className="w-full h-8 lg:h-10 bg-transparent border-none px-4" placeholder="..." disabled />
                                )}
                                <button onClick={handleSaveCurrent} disabled={!destination} className="pl-2 pr-2 lg:pr-3 text-slate-500 hover:text-orange-500 transition-colors disabled:opacity-30 magnetic-btn border-l border-white/10 ml-2">
                                    <span className="material-symbols-outlined text-[14px] lg:text-[18px]">favorite</span>
                                </button>
                            </div>
                        </div>

                        {/* Saved Places Integration */}
                        <div className="px-1">
                            <SavedPlaces
                                user={user}
                                onSelect={(loc) => {
                                    setDestination(loc.address);
                                    if (loc.coords) setDropCoords(loc.coords);
                                    setError(null);
                                }}
                            />
                        </div>

                        {/* Contextual Recommendations - Removed as requested */}

                        {/* Smart Recommendations - Based on current location */}
                        {pickupCoords && !destination && (
                            <div className="space-y-2 animate-in slide-in-from-bottom-2 duration-300">
                                <div className="flex items-center gap-2 px-1">
                                    <span className="material-symbols-outlined text-[#22c55e] text-xs">explore</span>
                                    <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Where are you heading?</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {suggestions.length > 0 && suggestions.map((rec, i) => (
                                        <button
                                            key={i}
                                            onClick={() => {
                                                setDestination(rec.address);
                                                if (rec.lat && rec.lng) {
                                                    setDropCoords({ lat: rec.lat, lng: rec.lng });
                                                }
                                                setError(null);
                                            }}
                                            className="flex flex-col gap-2 p-3 bg-gradient-to-br from-[#22c55e]/10 to-transparent border border-[#22c55e]/20 rounded-xl hover:border-[#22c55e]/50 hover:bg-[#22c55e]/20 transition-all group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="size-8 rounded-full bg-[#22c55e]/20 flex items-center justify-center text-[#22c55e] group-hover:scale-110 transition-transform">
                                                    <span className="material-symbols-outlined text-sm">{rec.icon}</span>
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-[10px] font-bold text-white uppercase tracking-wide">{rec.label}</p>
                                                    <p className="text-[8px] text-slate-400 truncate max-w-[120px]">{rec.desc}</p>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Forensics - Compact on Mobile */}
                        {(pickup || destination) && (
                            <div className="animate-in slide-in-from-top-2 duration-500 p-3 lg:p-6 rounded-xl lg:rounded-[2rem] border border-white/10 shadow-xl bg-[#0F172A]/50 relative overflow-hidden group transition-all tracing-border">
                                <div className="relative flex justify-between items-center px-1">
                                    <div className="flex flex-col">
                                        <p className="text-[#22c55e] text-[6px] lg:text-[8px] font-black uppercase tracking-[0.2em] mb-0.5 italic">Distance</p>
                                        <p className="text-white text-xs lg:text-2xl font-black italic leading-none">{routeForensics?.distance || '---'}</p>
                                    </div>

                                    {/* Estimated Price Center Display */}
                                    {routeForensics && (
                                        <div className="flex flex-col items-center">
                                            <p className="text-white/40 text-[6px] lg:text-[8px] font-black uppercase tracking-[0.2em] mb-0.5">Price</p>
                                            <div className="flex flex-col items-center">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-[#22c55e] text-xs lg:text-2xl font-black italic leading-none">
                                                        ₹{(() => {
                                                            const pricingSingle = calculateFare(10, 30, category, user, sysConfig, 1);
                                                            const basePrice10km = rideType === 'SHARED' ? Math.round(pricingSingle.total * 0.7) : pricingSingle.total;
                                                            const actualDist = parseFloat(routeForensics.distance.split(' ')[0]);
                                                            const perPerson = Math.round((basePrice10km / 10) * actualDist);
                                                            return perPerson * passengerCount;
                                                        })()}
                                                    </p>
                                                </div>
                                                {passengerCount > 1 && (
                                                    <p className="text-[8px] lg:text-[10px] text-white/40 font-bold uppercase mt-1">
                                                        ₹{(() => {
                                                            const pricingSingle = calculateFare(10, 30, category, user, sysConfig, 1);
                                                            const basePrice10km = rideType === 'SHARED' ? Math.round(pricingSingle.total * 0.7) : pricingSingle.total;
                                                            const actualDist = parseFloat(routeForensics.distance.split(' ')[0]);
                                                            return Math.round((basePrice10km / 10) * actualDist);
                                                        })()} × {passengerCount}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-col items-end text-right">
                                        <p className="text-white/40 text-[6px] lg:text-[8px] font-black uppercase tracking-[0.2em] mb-0.5">Est. Time</p>
                                        <p className="text-[#22c55e] text-xs lg:text-2xl font-black italic leading-none">{routeForensics?.duration || '---'}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Route Options - Show multiple routes with traffic & tolls */}
                        {showRouteOptions && routeOptions.length > 1 && (
                            <div className="space-y-2 animate-in slide-in-from-bottom-2 duration-300">
                                <div className="flex items-center justify-between px-1">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[#22c55e] text-xs">route</span>
                                        <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Choose your route</p>
                                    </div>
                                    <button
                                        onClick={() => setShowRouteOptions(false)}
                                        className="text-[8px] text-slate-500 hover:text-white transition-colors"
                                    >
                                        Hide
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {routeOptions.map((route, index) => (
                                        <button
                                            key={index}
                                            onClick={() => {
                                                setSelectedRoute(index);
                                                setRouteForensics({
                                                    distance: route.distance,
                                                    duration: route.durationInTraffic || route.duration
                                                });
                                            }}
                                            className={`w-full p-3 rounded-xl border transition-all ${selectedRoute === index
                                                ? 'border-[#22c55e] bg-[#22c55e]/10'
                                                : 'border-white/10 bg-white/5 hover:border-[#22c55e]/50'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-white uppercase">{route.summary}</span>
                                                    {route.trafficInfo && route.trafficInfo.condition !== 'NORMAL' && (
                                                        <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${route.trafficInfo.condition === 'SEVERE' ? 'bg-red-500/20 text-red-400' :
                                                            route.trafficInfo.condition === 'HEAVY' ? 'bg-orange-500/20 text-orange-400' :
                                                                'bg-yellow-500/20 text-yellow-400'
                                                            }`}>
                                                            {route.trafficInfo.condition}
                                                        </span>
                                                    )}
                                                    {route.tollInfo?.hasTolls && (
                                                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold">
                                                            TOLL
                                                        </span>
                                                    )}
                                                </div>
                                                {selectedRoute === index && (
                                                    <span className="material-symbols-outlined text-[#22c55e] text-sm">check_circle</span>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between text-left">
                                                <div>
                                                    <p className="text-[8px] text-slate-500 uppercase">Distance</p>
                                                    <p className="text-[10px] font-bold text-white">{route.distance}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[8px] text-slate-500 uppercase">Time</p>
                                                    <p className="text-[10px] font-bold text-[#22c55e]">
                                                        {route.durationInTraffic || route.duration}
                                                        {route.trafficInfo && route.trafficInfo.delayMinutes > 0 && (
                                                            <span className="text-[8px] text-orange-400 ml-1">
                                                                +{route.trafficInfo.delayMinutes}m
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                                {route.tollInfo?.hasTolls && route.tollInfo.estimatedCost && route.tollInfo.estimatedCost > 0 && (
                                                    <div className="text-right">
                                                        <p className="text-[8px] text-slate-500 uppercase">Toll</p>
                                                        <p className="text-[10px] font-bold text-blue-400">₹{route.tollInfo.estimatedCost}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}



                        {/* Booking Button - POSITIONED FOR FIRST SIGHT */}
                        <div className="pt-2 lg:pt-4">
                            <button
                                onClick={handleConfirm}
                                disabled={isGeocoding}
                                className={`w-full h-12 lg:h-16 rounded-xl lg:rounded-[2rem] font-black text-[9px] lg:text-[11px] uppercase tracking-[0.2em] lg:tracking-[0.3em] transition-all flex items-center justify-center gap-3 lg:gap-4 shadow-xl active:scale-95 magnetic-btn relative overflow-hidden group ${isGeocoding ? 'bg-slate-800 text-slate-500' : 'bg-[#22c55e] text-black hover:scale-[1.03] shadow-[0_0_30px_rgba(34,197,94,0.2)]'}`}
                            >
                                <span className="relative z-10 italic">{isGeocoding ? 'Calculating Route...' : 'Book Instant Ride'}</span>
                                {!isGeocoding && <span className="material-symbols-outlined font-black text-base lg:text-xl relative z-10">bolt</span>}
                            </button>
                        </div>
                    </div>

                    {/* Secondary Content - Below Fold / Minimal */}
                    <div className="mt-8 space-y-8 lg:space-y-12 pb-8">
                        {/* Recent / Saved - Hidden or minimal on mobile */}
                        {user.savedLocations.length > 0 && (
                            <div className="hidden lg:block space-y-4">
                                <p className="text-[8px] lg:text-[10px] font-black uppercase text-slate-500 tracking-widest pl-2 italic">Saved Places</p>
                                <div className="grid grid-cols-1 gap-2">
                                    {user.savedLocations.map(loc => (
                                        <button key={loc.id} onClick={() => setDestination(loc.address)} className="flex items-center gap-4 p-4 rounded-[1.5rem] border border-white/5 hover:border-[#22c55e]/20 bg-white/5 shadow-sm transition-all group">
                                            <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-500 group-hover:text-[#22c55e]">
                                                <span className="material-symbols-outlined text-lg">favorite</span>
                                            </div>
                                            <span className="text-[9px] lg:text-[11px] font-black uppercase italic tracking-tighter text-slate-300">{loc.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Fleet Directory - Semi-collapsed on mobile */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <p className="text-[7px] lg:text-[9px] font-black uppercase text-slate-500 tracking-widest italic">Available Drivers</p>
                                <div className="flex items-center gap-1">
                                    <span className="size-1.5 bg-[#22c55e] rounded-full animate-pulse"></span>
                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{nearbyDrivers.filter((d: any) => d.isOnline).length} Online</span>
                                </div>
                            </div>

                            {nearbyDrivers.length > 0 ? (
                                <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-hide">
                                    {nearbyDrivers.map((driver: any) => {
                                        const vType = categories.find(c => c.type === driver.vehicleType) || categories[2];
                                        return (
                                            <div key={driver.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/5 shadow-sm transition-all">
                                                <div className="size-12 rounded-xl bg-slate-800 overflow-hidden border border-white/10">
                                                    <img src={driver.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${driver.id}`} alt={driver.name} className="size-full object-cover" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="text-[11px] font-black text-white truncate uppercase tracking-tight">{driver.name || 'Driver'}</h4>
                                                        {driver.isApproved && <span className="material-symbols-outlined text-[#22c55e] text-[12px] filled">verified</span>}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-50/10 rounded-lg border border-amber-500/20">
                                                            <span className="material-symbols-outlined text-amber-400 text-[10px] filled">star</span>
                                                            <span className="text-[9px] font-bold text-amber-400">{driver.rating || '4.9'}</span>
                                                        </div>
                                                        <span className="text-slate-500">•</span>
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase">{driver.vehicleNumber || 'Vehicle'}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`text-[8px] font-bold px-2 py-1 rounded-lg border uppercase ${driver.isOnline ? 'bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                                                        {driver.isOnline ? 'Online' : 'Offline'}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-8 px-6 bg-white/5 rounded-xl border border-white/10">
                                    <div className="size-12 rounded-full bg-slate-500/20 flex items-center justify-center mb-3">
                                        <span className="material-symbols-outlined text-2xl text-slate-500">person_off</span>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase text-center">No partners online</p>
                                    <p className="text-[8px] text-slate-500 text-center">Check console for debug info</p>
                                </div>
                            )}
                        </div>

                        {/* Moved District Picker & Tiffin Selector BELOW Fleet */}
                        <div className="opacity-90 hover:opacity-100 transition-opacity border-t border-white/5 pt-6">
                            <DistrictPicker />
                            <div className="mt-6"></div>
                            <TiffinSelector />
                        </div>
                    </div>
                </section>
            </main>
        </div >
    );
};

export default RiderHome;
