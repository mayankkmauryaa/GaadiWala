import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot, updateDoc, doc, serverTimestamp, runTransaction, increment } from 'firebase/firestore';
import { Language, User, RideRequest, RideStatus, TiffinOrder, VehicleCategory } from '../../types';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import Chat from '../../components/shared/Chat';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useRef } from 'react';
import GlobalBanner from '../../components/GlobalBanner';
import MapContainer from '../../components/MapContainer';
import { watchPosition, clearWatch, GeolocationError, GeolocationErrorType } from '../../utils/GeolocationHelper';
import { optimizeTiffinBatch, OptimizationResult, OptimizedStop } from '../../services/RouteOptimizationService';
import { getNearestRoad } from '../../services/RoadsService';
import { CONFIG } from '../../firebase';
import ScrollHint from '../../components/shared/ScrollHint';

interface Props {
    user: User;
    lang: Language;
    setLang: (l: Language) => void;
}

const DriverDashboard: React.FC<Props> = ({ user, lang, setLang }) => {
    const navigate = useNavigate();
    const [incomingRide, setIncomingRide] = useState<RideRequest | null>(null);
    const [activeTrip, setActiveTrip] = useState<RideRequest | null>(null);

    // Tiffin State
    const [mode, setMode] = useState<'RIDE' | 'TIFFIN'>('RIDE');
    const [tiffinOrders, setTiffinOrders] = useState<TiffinOrder[]>([]);
    const [activeTiffin, setActiveTiffin] = useState<TiffinOrder | null>(null);

    // Earnings & Gamification
    const [dailyEarnings, setDailyEarnings] = useState(0);
    const [completedRidesToday, setCompletedRidesToday] = useState(0);
    const [tier, setTier] = useState<'Bronze' | 'Silver' | 'Gold'>('Bronze');

    // Optimization & Visuals
    const [activeBatch, setActiveBatch] = useState<TiffinOrder[]>([]);
    const [batchRoute, setBatchRoute] = useState<OptimizationResult | null>(null);
    const [showTraffic, setShowTraffic] = useState(false);
    const [isOptimizing, setIsOptimizing] = useState(false);

    const [forecast, setForecast] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');

    const [isAccepting, setIsAccepting] = useState<boolean | 'SUCCESS'>(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [chatOpen, setChatOpen] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const [incomingDistance, setIncomingDistance] = useState<number | null>(null);
    const [allPendingRequests, setAllPendingRequests] = useState<RideRequest[]>([]);
    const [finishedRide, setFinishedRide] = useState<RideRequest | null>(null);
    const [newRouteDest, setNewRouteDest] = useState('');
    const [newRoutePrice, setNewRoutePrice] = useState('');
    const [locationError, setLocationError] = useState<string | null>(null);
    const statsRef = useRef<HTMLElement>(null);

    useClickOutside(statsRef, () => setShowStats(false));

    // Proximity Helper (Haversine Formula)
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // Radius of the earth in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in km
    };

    // 1. Stable listener for Pending Requests (Open Market)
    useEffect(() => {
        if (!user.id || !user.vehicleType || !user.isApproved) return;

        const q = query(
            collection(db, 'rides'),
            where('status', '==', RideStatus.SEARCHING),
            where('vehicleType', '==', user.vehicleType)
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const requests = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as RideRequest));
            setAllPendingRequests(requests);

            // Calculate Dynamic Forecast based on total demand
            const demandFactor = requests.length * 50;
            setForecast(Math.max(150, demandFactor + 200));
        }, (err) => {
            console.error("Pending Rides Listener Error:", err);
        });

        return () => unsub();
    }, [user.id, user.vehicleType, user.isApproved]);

    // 2. Stable listener for Active Trip & Earnings
    useEffect(() => {
        if (!user.id || !user.isApproved) return;

        // Active Trip
        const qActive = query(
            collection(db, 'rides'),
            where('driverId', '==', user.id),
            where('status', 'in', [RideStatus.ACCEPTED, RideStatus.ARRIVED, RideStatus.STARTED])
        );

        const unsubActive = onSnapshot(qActive, (snapshot) => {
            if (!snapshot.empty) {
                const trip = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as RideRequest;
                setActiveTrip(trip);
            } else {
                setActiveTrip(null);
            }
        });

        // Daily Earnings
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const qEarnings = query(
            collection(db, 'rides'),
            where('driverId', '==', user.id),
            where('status', '==', RideStatus.COMPLETED),
            where('createdAt', '>=', startOfDay)
        );

        const unsubEarnings = onSnapshot(qEarnings, (snapshot) => {
            const rides = snapshot.docs.map(d => d.data() as RideRequest);
            const total = rides.reduce((acc, curr) => acc + (curr.estimatedFare || 0), 0);
            setDailyEarnings(total);
            setCompletedRidesToday(rides.length);
        });

        return () => {
            unsubActive();
            unsubEarnings();
        };
    }, [user.id, user.isApproved]);

    // 3. Proximity & Online Filtering (Client-side, High frequency ok)
    useEffect(() => {
        if (!user.isOnline || !user.isApproved) {
            setIncomingRide(null);
            setIncomingDistance(null);
            return;
        }

        // Find relevant request (targeted or within 5km)
        const relevant = allPendingRequests.find(r => {
            const isTargeted = r.driverId === user.id;
            const isOpenMarket = !r.driverId;

            let isNearby = true;
            let dist = 0;
            if (isOpenMarket && user.currentLocation) {
                dist = calculateDistance(
                    user.currentLocation.lat,
                    user.currentLocation.lng,
                    r.pickupLocation.lat,
                    r.pickupLocation.lng
                );
                isNearby = dist <= 5; // 5km radius
            }

            if (isTargeted || (isOpenMarket && isNearby)) {
                // If targeted, we don't strictly need distance for eligibility, but for display:
                if (isTargeted && user.currentLocation) {
                    dist = calculateDistance(
                        user.currentLocation.lat,
                        user.currentLocation.lng,
                        r.pickupLocation.lat,
                        r.pickupLocation.lng
                    );
                }
                setIncomingDistance(dist);
                return true;
            }
            return false;
        });

        if (relevant) {
            setIncomingRide(relevant);
        } else {
            setIncomingRide(null);
            setIncomingDistance(null);
        }
    }, [allPendingRequests, user.isOnline, user.currentLocation, user.id, user.isApproved]);


    // 4. Background Location Tracking for Online Drivers
    useEffect(() => {
        if (!user.id || !user.isOnline || !user.isApproved) {
            setLocationError(null);
            return;
        }

        let watchId: number | null = null;

        watchId = watchPosition(
            async (coords) => {
                try {
                    // Phase 2: Snap to Road for smooth visualization
                    const snapped = await getNearestRoad(coords, CONFIG.MAPS_API_KEY);
                    const userDocRef = doc(db, 'users', user.id);
                    await updateDoc(userDocRef, {
                        currentLocation: snapped,
                        lastOnline: Date.now()
                    });
                    setLocationError(null);
                } catch (err) {
                    console.error("Critical: Location Sync Failure", err);
                }
            },
            (error: GeolocationError) => {
                console.error("Geolocation Error:", error);
                setLocationError(error.userMessage);

                // If permission denied, turn driver offline
                if (error.type === GeolocationErrorType.PERMISSION_DENIED) {
                    updateDoc(doc(db, 'users', user.id), {
                        isOnline: false
                    }).catch(err => console.error("Failed to update online status", err));
                }
            },
            {
                enableHighAccuracy: true,
                maximumAge: 5000,
                timeout: 10000
            }
        );

        return () => {
            if (watchId !== null) clearWatch(watchId);
        };
    }, [user.id, user.isOnline, user.isApproved]);


    // Tiffin Logistics Listener
    useEffect(() => {
        if (mode !== 'TIFFIN') return;

        // Pending Tiffin Orders (Marketplace)
        const qTiffinPending = query(
            collection(db, 'tiffinOrders'),
            where('status', '==', 'PENDING')
        );

        // Active Tiffin Delivery
        const qTiffinActive = query(
            collection(db, 'tiffinOrders'),
            where('driverId', '==', user.id),
            where('status', '==', 'PICKED')
        );

        const unsubTiffinPending = onSnapshot(qTiffinPending, (snapshot) => {
            const orders = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TiffinOrder));
            setTiffinOrders(orders);
        });

        const unsubTiffinActive = onSnapshot(qTiffinActive, (snapshot) => {
            const orders = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TiffinOrder));
            setActiveBatch(orders);
        });

        return () => {
            unsubTiffinPending();
            unsubTiffinActive();
        };
    }, [mode, user.id]);

    // Auto-Optimize Tiffin Batch
    useEffect(() => {
        if (mode === 'TIFFIN' && activeBatch.length > 1 && user.currentLocation) {
            const runOptimization = async () => {
                setIsOptimizing(true);
                try {
                    const stops: OptimizedStop[] = activeBatch.map(order => ({
                        orderId: order.id,
                        type: 'DELIVERY',
                        location: order.deliveryLocation || user.currentLocation!, // Fallback to current
                        address: order.deliveryAddress
                    }));
                    const result = await optimizeTiffinBatch(user.currentLocation!, stops, CONFIG.MAPS_API_KEY);
                    setBatchRoute(result);
                } catch (err) {
                    console.error("Batch optimization failed", err);
                } finally {
                    setIsOptimizing(false);
                }
            };
            runOptimization();
        } else if (activeBatch.length <= 1) {
            setBatchRoute(null);
        }
    }, [activeBatch.length, mode, user.currentLocation]);

    // Determine Tier
    useEffect(() => {
        const total = (user.totalRides || 0) + completedRidesToday;
        if (total > 50) setTier('Gold');
        else if (total > 20) setTier('Silver');
        else setTier('Bronze');
    }, [user.totalRides, completedRidesToday]);

    const handleNavigate = (destination: string) => {
        if (!destination) return;
        // Open Google Maps Navigation
        const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
        window.open(url, '_blank');
    };

    const handleUpdateStatus = async (newStatus: RideStatus) => {
        if (!activeTrip) return;
        try {
            if (newStatus === RideStatus.COMPLETED) {
                const rideRef = doc(db, 'rides', activeTrip.id);
                const userRef = doc(db, 'users', user.id);

                await runTransaction(db, async (transaction) => {
                    const rideDoc = await transaction.get(rideRef);
                    if (!rideDoc.exists()) throw new Error("Ride not found");

                    const amount = rideDoc.data().estimatedFare || 0;

                    transaction.update(rideRef, {
                        status: RideStatus.COMPLETED,
                        completedAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    });

                    transaction.update(userRef, {
                        walletBalance: increment(amount),
                        totalRides: increment(1)
                    });
                });

                setFinishedRide({ ...activeTrip, status: RideStatus.COMPLETED });
            } else {
                await updateDoc(doc(db, 'rides', activeTrip.id), {
                    status: newStatus,
                    updatedAt: serverTimestamp(),
                    ...(newStatus === RideStatus.STARTED ? { startedAt: serverTimestamp() } : {}),
                    ...(newStatus === RideStatus.ARRIVED ? { arrivedAt: serverTimestamp() } : {}),
                });
            }
        } catch (err) {
            console.error("Status update error:", err);
            alert("Status update failed. Please check your connection.");
        }
    };

    const handleTiffinAction = async (orderId: string, action: 'ACCEPT' | 'DELIVER') => {
        try {
            if (action === 'ACCEPT') {
                await updateDoc(doc(db, 'tiffinOrders', orderId), {
                    status: 'PICKED',
                    driverId: user.id,
                    driverName: user.name,
                    pickedAt: serverTimestamp()
                });
            } else {
                await updateDoc(doc(db, 'tiffinOrders', orderId), {
                    status: 'DELIVERED',
                    deliveredAt: serverTimestamp()
                });
            }
        } catch (err) {
            console.error("Tiffin action failed", err);
        }
    };

    const handleAddPreference = async () => {
        if (!newRouteDest || !newRoutePrice) return;
        const current = user.preferredRoutes || [];
        if (current.some(r => r.destination === newRouteDest)) return;

        try {
            await updateDoc(doc(db, 'users', user.id), {
                preferredRoutes: [...current, { destination: newRouteDest, price: Number(newRoutePrice) }]
            });
            setNewRouteDest('');
            setNewRoutePrice('');
        } catch (err) {
            console.error("Error adding preference:", err);
        }
    };

    const handleRemovePreference = async (destination: string) => {
        const current = user.preferredRoutes || [];
        try {
            await updateDoc(doc(db, 'users', user.id), {
                preferredRoutes: current.filter(d => d.destination !== destination)
            });
        } catch (err) {
            console.error("Error removing preference:", err);
        }
    };

    const handleAccept = async () => {
        if (!incomingRide) return;
        setIsAccepting(true);
        console.log("Atomic Accept attempt:", incomingRide.id, "for driver:", user.id);

        try {
            const rideRef = doc(db, 'rides', incomingRide.id);

            await runTransaction(db, async (transaction) => {
                const rideDoc = await transaction.get(rideRef);
                if (!rideDoc.exists()) {
                    throw new Error("Ride not found");
                }

                const data = rideDoc.data();
                if (data.status !== RideStatus.SEARCHING || (data.driverId && data.driverId !== user.id)) {
                    throw new Error("ALREADY_TAKEN");
                }

                const updateData: any = {
                    status: RideStatus.ACCEPTED,
                    driverId: user.id || null,
                    driverName: user.name || 'Partner',
                    driverPhone: user.phone || '',
                    driverAvatar: user.avatar || null,
                    driverRating: user.rating || 4.9,
                    driverDetails: {
                        name: user.name || 'Partner',
                        avatar: user.avatar || null,
                        vehicleModel: user.vehicleModel || 'Gaadiwala Partner',
                        vehicleNumber: user.vehicleNumber || 'XX 00 XX 0000',
                        rating: user.rating || 4.9
                    },
                    acceptedAt: serverTimestamp()
                };

                transaction.update(rideRef, updateData);
            });

            console.log("Atomic Accept Success:", incomingRide.id);
            setIsAccepting('SUCCESS');

            // Short delay to allow listener to pick up activeTrip before closing modal
            setTimeout(() => {
                setIncomingRide(null);
                setIsAccepting(false);
            }, 1000);

        } catch (err: any) {
            console.error("Accept error (Atomic Details):", err);
            setIsAccepting(false);
            if (err.message === 'ALREADY_TAKEN' || err.code === 'permission-denied') {
                alert("This ride has already been accepted by another partner.");
            } else {
                alert("Failed to accept ride. Please check your internet connection and try again.");
            }
        }
    };

    const t = {
        en: {
            center: 'Command Center',
            online: 'Online',
            goal: 'Daily Earnings Goal',
            acceptance: 'Acceptance',
            rating: 'Rating',
            hotspots: 'Demand Hotspots',
            find: 'Find high demand zones...',
            surge: 'Peak Surge Alert',
            indiranagar: 'Sadar Bazar: 2.5x multiplier active',
            search: 'Live',
            pending: 'Approval Pending',
            pendingMsg: 'Your account is under review by the Gaadiwala administration. This usually takes 24-48 hours.',
        },
        hi: {
            center: 'कमांड सेंटर',
            online: 'ऑनलाइन',
            goal: 'दैनिक कमाई का लक्ष्य',
            acceptance: 'स्वीकृति दर',
            rating: 'रेटिंग',
            hotspots: 'डिमांड हॉटस्पॉट',
            find: 'अधिक डिमांड वाले क्षेत्र खोजें...',
            surge: 'पीक सर्ज अलर्ट',
            indiranagar: 'सदर बाजार: 2.5 गुना गुणांक सक्रिय',
            search: 'लाइव',
            pending: 'अनुमोदन लंबित',
            pendingMsg: 'आपका खाता Gaadiwala प्रशासन द्वारा समीक्षाधीन है। इसमें आमतौर पर 24-48 घंटे लगते हैं।',
        }
    };

    const text = t[lang];
    const isActuallyApproved = user.isApproved;
    const isPink = user.vehicleType === VehicleCategory.PINK;
    const accentBg = isPink ? 'bg-pink-500' : 'bg-[#00D1FF]';
    const accentText = isPink ? 'text-pink-400' : 'text-[#00D1FF]';
    const accentBorder = isPink ? 'border-pink-500/30' : 'border-[#00D1FF]/30';

    if (!isActuallyApproved) {
        return (
            <div className="h-screen w-full bg-[#0A0E12] flex items-center justify-center p-6 text-center">
                <div className="max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className={`size-24 rounded-full ${isPink ? 'bg-pink-500/10' : 'bg-amber-500/10'} flex items-center justify-center mx-auto ring-8 ${isPink ? 'ring-pink-500/5' : 'ring-amber-500/5'}`}>
                        <span className={`material-symbols-outlined text-5xl ${isPink ? 'text-pink-500' : 'text-amber-500'}`}>hourglass_empty</span>
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white mb-2 tracking-tight">{isPink ? 'Pink Cab Verification' : text.pending}</h1>
                        <p className="text-slate-400 leading-relaxed text-sm">{user.rejectionReason || text.pendingMsg}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-left">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black uppercase text-slate-500">Status Check</span>
                            <span className={`size-2 rounded-full ${isPink ? 'bg-pink-500' : 'bg-amber-500'} animate-pulse`}></span>
                        </div>
                        <div className="flex gap-4">
                            <div className={`w-1 h-12 ${isPink ? 'bg-pink-500' : 'bg-amber-500'} rounded-full`}></div>
                            <div>
                                <p className="text-xs font-bold text-white">
                                    {user.rejectionReason ? 'Re-verification Needed' : (isPink ? 'Female Safety Check' : 'Identity Verified')}
                                </p>
                                <p className="text-[10px] text-slate-500 italic">
                                    {user.rejectionReason || (isPink ? 'Confirming female partner status...' : 'Waiting for vehicle check...')}
                                </p>
                            </div>
                        </div>
                    </div>
                    <button onClick={() => window.location.reload()} className="text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-white">Check Again</button>
                </div>
            </div>
        );
    }

    return (
        <div className="dark bg-[#0A0E12] text-slate-100 font-display min-h-dvh h-dvh overflow-hidden flex flex-col pb-safe">
            <GlobalBanner />
            <header className="h-16 border-b border-white/10 bg-[#161B22] px-4 md:px-6 flex items-center justify-between z-50">
                <div className="flex items-center gap-4 md:gap-10">
                    <div className="flex items-center gap-2 md:gap-3">
                        <div className={`w-8 h-8 md:w-9 md:h-9 ${accentBg} rounded flex items-center justify-center shadow-[0_0_15px_rgba(0,209,255,0.4)] shrink-0`}>
                            <span className="material-symbols-outlined text-black font-bold text-sm md:text-base">directions_car</span>
                        </div>
                        <div className="min-w-0 flex flex-col">
                            <span className="text-lg md:text-xl font-extrabold tracking-tighter text-white truncate italic leading-none">Gaadiwala</span>
                            <span className={`text-[9px] font-black uppercase tracking-widest ${accentText} leading-none mt-1`}>
                                {isPink ? '✨ Pink Partner' : 'Partner Central'}
                            </span>
                        </div>
                    </div>
                    <div className="hidden lg:flex items-center gap-2 bg-white/5 p-1 rounded border border-white/10">
                        <button
                            onClick={() => setLang('en')}
                            className={`px-3 py-1 text-xs font-bold rounded transition-all ${lang === 'en' ? `${accentBg} text-black` : 'text-slate-400'}`}
                        >
                            English
                        </button>
                        <button
                            onClick={() => setLang('hi')}
                            className={`px-3 py-1 text-xs font-bold rounded transition-all ${lang === 'hi' ? `${accentBg} text-black` : 'text-slate-400'}`}
                        >
                            हिन्दी
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3 md:gap-6">
                    <button
                        onClick={() => setShowStats(!showStats)}
                        className="lg:hidden size-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#00D1FF]"
                    >
                        <span className="material-symbols-outlined">{showStats ? 'close' : 'bar_chart'}</span>
                    </button>
                    <button
                        onClick={async () => {
                            try {
                                const newStatus = !user.isOnline;
                                await updateDoc(doc(db, 'users', user.id), {
                                    isOnline: newStatus,
                                    lastOnline: Date.now()
                                });
                            } catch (err) {
                                console.error("Failed to update status", err);
                                alert("Failed to update status");
                            }
                        }}
                        className={`flex items-center gap-2 border px-3 md:px-4 py-1.5 rounded-full shrink-0 transition-all ${user.isOnline ? 'bg-black/40 border-white/10' : 'bg-red-500/10 border-red-500/20'}`}
                    >
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2 md:h-3 md:w-3">
                                {user.isOnline && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${accentBg} opacity-75`}></span>}
                                <span className={`relative inline-flex rounded-full h-2 w-2 md:h-3 md:w-3 ${user.isOnline ? accentBg : 'bg-red-500'}`}></span>
                            </span>
                            <span className={`text-[10px] font-bold tracking-widest uppercase ${user.isOnline ? accentText : 'text-red-500'}`}>
                                {user.isOnline ? text.online : 'OFFLINE'}
                            </span>
                        </div>
                    </button>
                    <div
                        onClick={() => navigate('/driver/profile')}
                        className="flex items-center gap-2 md:gap-3 cursor-pointer group"
                    >
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold text-white flex items-center gap-1 group-hover:text-[#00D1FF] transition-colors">
                                {user.name}
                                {user.isKycCompleted && <span className="material-symbols-outlined text-[#00D1FF] text-[14px] filled">verified</span>}
                            </p>
                            <p className={`text-[9px] font-bold uppercase tracking-wider truncate ${tier === 'Gold' ? 'text-amber-400' : tier === 'Silver' ? 'text-slate-300' : 'text-orange-700'}`}>
                                {tier} Partner
                            </p>
                        </div>
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-800 border-2 border-[#00D1FF] flex items-center justify-center shrink-0 overflow-hidden group-hover:scale-110 transition-transform">
                            <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} className="w-full h-full object-cover" alt="avatar" />
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden relative">
                <aside
                    ref={statsRef}
                    className={`
                    absolute inset-y-0 left-0 w-80 max-w-[85vw] bg-[#0A0E12] border-r border-white/10 z-40 transform transition-transform duration-300
                    ${showStats ? 'translate-x-0' : '-translate-x-full'}
                    lg:relative lg:translate-x-0
                    flex flex-col p-4 sm:p-5 gap-4 sm:gap-5 overflow-y-auto pt-safe relative
                `}>
                    <ScrollHint containerRef={statsRef as any} />
                    {/* Earnings Widget */}
                    <div
                        onClick={() => navigate('/driver/earnings')}
                        className="p-5 rounded-xl border border-white/10 bg-[#161B22]/80 backdrop-blur-md cursor-pointer hover:border-[#00D1FF]/50 transition-colors group"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 group-hover:text-white transition-colors">Today's Earnings</p>
                                <h2 className="text-3xl font-black text-white">₹{dailyEarnings}</h2>
                            </div>
                            <div className="bg-[#00D1FF]/10 text-[#00D1FF] px-2 py-1 rounded text-[10px] font-bold border border-[#00D1FF]/20">
                                {completedRidesToday} Rides
                            </div>
                        </div>
                        <div className="relative pt-1">
                            <div className="flex items-center justify-between text-[9px] font-bold uppercase text-slate-500 mb-1">
                                <span>Forecast (4h)</span>
                                <span className={accentText}>~₹{forecast}</span>
                            </div>
                            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                                <div className={`${accentBg} h-full rounded-full animate-pulse`} style={{ width: '100%' }}></div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 rounded-xl border border-white/10 bg-[#161B22]/80 text-center">
                            <div className="text-2xl font-bold text-green-500">96%</div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">{text.acceptance}</p>
                        </div>
                        <div className="p-4 rounded-xl border border-white/10 bg-[#161B22]/80 text-center">
                            <div className="flex items-center justify-center gap-1">
                                <span className="text-2xl font-bold text-white">4.9</span>
                                <span className="material-symbols-outlined text-amber-400 text-sm">star</span>
                            </div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">{text.rating}</p>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-3 px-1">
                            <h3 className="text-xs font-bold text-white uppercase tracking-wider">{text.hotspots}</h3>
                            <span className={`text-[10px] font-bold ${accentText} uppercase`}>{text.search}</span>
                        </div>
                        <div className="space-y-2">
                            <div className="p-3 bg-white/5 border border-white/5 rounded-lg flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-white">Krishna Janmasthan</p>
                                    <p className="text-[10px] text-slate-500 uppercase">2.1x Surge • High Demand</p>
                                </div>
                                <span className="material-symbols-outlined text-red-500">local_fire_department</span>
                            </div>
                            <div className="p-3 bg-white/5 border border-white/5 rounded-lg flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-white">Mathura Junction</p>
                                    <p className="text-[10px] text-slate-500 uppercase">1.8x Surge • 3 min wait</p>
                                </div>
                                <span className="material-symbols-outlined text-amber-400">trending_up</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/10">
                        <div className="flex items-center gap-2 mb-3 px-1">
                            <span className={`material-symbols-outlined ${accentText} text-sm`}>route</span>
                            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Heading To</h3>
                        </div>

                        <div className="space-y-3">
                            {/* Tags Container */}
                            <div className="flex flex-wrap gap-2 px-1">
                                {(user.preferredRoutes || []).map((route, i) => (
                                    <div key={i} className={`flex flex-col gap-1 ${isPink ? 'bg-pink-500/10 border-pink-500/30' : 'bg-[#00D1FF]/10 border-[#00D1FF]/30'} border rounded-xl p-3 relative group/tag`}>
                                        <div className="flex justify-between items-start gap-4">
                                            <span className={`text-[10px] font-black ${accentText} uppercase truncate leading-none`}>{route.destination}</span>
                                            <button
                                                onClick={() => handleRemovePreference(route.destination)}
                                                className="material-symbols-outlined text-[12px] text-slate-500 hover:text-red-500 transition-colors"
                                            >
                                                close
                                            </button>
                                        </div>
                                        <div className={`flex items-center gap-1.5 pt-1 border-t ${accentBorder}`}>
                                            <span className="text-[9px] font-black text-white">₹{route.price}</span>
                                            <span className="text-[7px] font-bold text-slate-500 uppercase tracking-tighter">Fixed Fare</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-2">
                                <div className="relative group">
                                    <input
                                        type="text"
                                        placeholder="Destination..."
                                        value={newRouteDest}
                                        onChange={(e) => setNewRouteDest(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-[#00D1FF]/50 transition-all placeholder:text-slate-600"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:opacity-100 transition-opacity pointer-events-none">
                                        <span className="material-symbols-outlined text-sm text-slate-500">location_on</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            type="number"
                                            placeholder="Price (₹)"
                                            value={newRoutePrice}
                                            onChange={(e) => setNewRoutePrice(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-[#00D1FF]/50 transition-all placeholder:text-slate-600"
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-30 pointer-events-none">
                                            <span className="text-[10px] font-black text-slate-500">INR</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleAddPreference}
                                        disabled={!newRouteDest || !newRoutePrice}
                                        className={`${accentBg} text-black px-4 rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-20 disabled:scale-100`}
                                    >
                                        <span className="material-symbols-outlined text-base font-black">add</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Safety Council Widget */}
                        <div className="mt-6 pt-6 border-t border-white/10">
                            <div className="bg-[#161B22] border border-white/10 rounded-2xl p-5 relative overflow-hidden group">
                                <div className={`absolute top-0 right-0 p-4 ${accentText} opacity-10 group-hover:opacity-20 transition-opacity`}>
                                    <span className="material-symbols-outlined text-5xl">verified_user</span>
                                </div>
                                <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-2">Safety Council</h4>
                                <p className="text-[10px] text-slate-500 font-bold mb-4 italic leading-relaxed">
                                    {isPink ? 'You are part of our priority female safety network.' : 'Help us maintain 100% safety standards across all routes.'}
                                </p>
                                <button className={`w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest ${accentText} hover:bg-white/10 transition-all`}>
                                    View Protocol
                                </button>
                            </div>
                        </div>

                        {/* Quick Navigation Addition */}
                        <div className="mt-4 space-y-2">
                            <button
                                onClick={() => navigate('/driver/profile')}
                                className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl group hover:border-white/20 transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`size-8 rounded-xl ${accentBg}/10 flex items-center justify-center`}>
                                        <span className={`material-symbols-outlined text-base ${accentText}`}>person</span>
                                    </div>
                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Manage Profile</span>
                                </div>
                                <span className="material-symbols-outlined text-sm text-slate-600 transition-transform group-hover:translate-x-1">arrow_forward</span>
                            </button>
                        </div>

                        <p className="text-[8px] font-black uppercase text-slate-500 mt-4 px-1 tracking-widest leading-relaxed">Setting fixed pricing for routes makes you 2x more likely to get picked by riders.</p>
                    </div>
                </aside>

                <section className="flex-1 relative bg-[#0f141a] overflow-hidden">
                    {/* Replace iframe with MapContainer */}
                    <div className="absolute inset-0 w-full h-full">
                        <MapContainer
                            center={user.currentLocation}
                            pickup={user.currentLocation}
                            drop={activeTrip ? (
                                activeTrip.status === RideStatus.STARTED ? activeTrip.dropLocation : activeTrip.pickupLocation
                            ) : incomingRide?.pickupLocation}
                            drivers={allPendingRequests
                                .filter(r => r.pickupLocation)
                                .map(r => r.pickupLocation)
                            }
                            showTraffic={showTraffic}
                            polyline={batchRoute?.polyline}
                            className="grayscale brightness-[0.4] contrast-150"
                        />
                    </div>
                    <div className="absolute inset-0 bg-blue-900/10 pointer-events-none"></div>

                    {/* Location Error Banner */}
                    {locationError && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500/90 backdrop-blur-md text-white px-4 py-2 rounded-lg shadow-lg z-50 max-w-md text-center">
                            <p className="text-xs font-bold">{locationError}</p>
                        </div>
                    )}

                    <div className="absolute top-4 md:top-6 left-4 md:left-6 right-4 md:right-auto md:w-96 flex flex-col gap-4">
                        {/* Search Bar */}
                        <div className="bg-[#161B22]/90 backdrop-blur-md p-1.5 rounded-2xl flex items-center gap-2 border border-white/20 shadow-2xl">
                            <div className="flex-1 flex items-center gap-3 px-3">
                                <span className={`material-symbols-outlined ${accentText} text-xl`}>location_on</span>
                                <input
                                    className="w-full border-none focus:ring-0 bg-transparent text-sm font-bold text-white placeholder-slate-500"
                                    placeholder={text.find}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleNavigate(searchQuery)}
                                />
                            </div>
                            <button
                                onClick={() => setShowTraffic(!showTraffic)}
                                className={`p-2 rounded transition-all ${showTraffic ? 'text-[#00D1FF]' : 'text-slate-500'}`}
                                title="Toggle Traffic"
                            >
                                <span className="material-symbols-outlined font-bold">traffic</span>
                            </button>
                            <button
                                onClick={() => handleNavigate(searchQuery)}
                                className={`${accentBg} text-black p-2 rounded transition-transform active:scale-95 shadow-lg`}
                            >
                                <span className="material-symbols-outlined font-bold">navigation</span>
                            </button>
                        </div>

                        <div className="bg-[#161B22]/90 backdrop-blur-md p-1.5 rounded-2xl flex items-center border border-white/20 shadow-2xl">
                            <button
                                onClick={() => setMode('RIDE')}
                                className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${mode === 'RIDE' ? `${accentBg} text-black shadow-lg` : 'text-slate-400 hover:text-white'}`}
                            >
                                <span className="material-symbols-outlined text-sm font-bold">directions_car</span>
                                <span className="text-[10px] font-black uppercase tracking-widest">Rides</span>
                            </button>
                            <button
                                onClick={() => setMode('TIFFIN')}
                                className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${mode === 'TIFFIN' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                            >
                                <span className="material-symbols-outlined text-sm font-bold">lunch_dining</span>
                                <span className="text-[10px] font-black uppercase tracking-widest">Tiffin</span>
                            </button>
                        </div>

                        {/* Tiffin Feed */}
                        {mode === 'TIFFIN' && !activeTiffin && (
                            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                                {tiffinOrders.length > 0 ? tiffinOrders.map(order => (
                                    <div key={order.id} className="bg-[#161B22]/95 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-xl animate-in fade-in slide-in-from-bottom-4">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h4 className="font-bold text-white text-sm">{order.vendorName}</h4>
                                                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Tiffin Delivery</p>
                                            </div>
                                            <span className="text-lg font-black text-green-400">₹{order.price}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mb-4">
                                            <span className="material-symbols-outlined text-orange-500 text-sm">location_on</span>
                                            <p className="text-xs text-slate-300 truncate">{order.deliveryAddress}</p>
                                        </div>
                                        <button
                                            onClick={() => handleTiffinAction(order.id, 'ACCEPT')}
                                            className="w-full py-3 bg-orange-500 hover:bg-orange-600 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-colors"
                                        >
                                            Accept Delivery
                                        </button>
                                    </div>
                                )) : (
                                    <div className="bg-[#161B22]/95 backdrop-blur-md p-8 rounded-2xl border border-white/10 text-center">
                                        <span className="material-symbols-outlined text-slate-600 text-4xl mb-2">soup_kitchen</span>
                                        <p className="text-xs font-bold text-slate-500">No active tiffin orders nearby.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Active Tiffin Delivery */}
                        {activeTiffin && (
                            <div className="bg-[#161B22]/95 backdrop-blur-xl p-6 rounded-[2rem] border border-orange-500/30 shadow-[0_0_50px_rgba(249,115,22,0.1)] animate-in slide-in-from-left duration-500">
                                <div className="flex justify-between items-center mb-6">
                                    <div className="flex items-center gap-2">
                                        <div className="size-2 rounded-full bg-orange-500 animate-ping"></div>
                                        <span className="text-[10px] font-black uppercase text-orange-500 tracking-[0.2em]">Tiffin Active</span>
                                    </div>
                                </div>
                                <div className="space-y-4 mb-6">
                                    <div className="flex gap-3">
                                        <span className="material-symbols-outlined text-orange-500 text-sm">restaurant</span>
                                        <div>
                                            <p className="text-[9px] font-black uppercase text-slate-500 mb-0.5">Pickup From</p>
                                            <p className="text-xs font-bold text-white">{activeTiffin.vendorName}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <span className="material-symbols-outlined text-green-500 text-sm">location_on</span>
                                        <div>
                                            <p className="text-[9px] font-black uppercase text-slate-500 mb-0.5">Deliver To</p>
                                            <p className="text-xs font-bold text-white line-clamp-2">{activeTiffin.deliveryAddress}</p>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleTiffinAction(activeTiffin.id, 'DELIVER')}
                                    className="w-full h-14 rounded-xl bg-orange-500 text-white font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-transform"
                                >
                                    Confirm Delivery
                                </button>
                            </div>
                        )}

                        {/* Active Trip Widget */}
                        {activeTrip && (
                            <div className="bg-[#161B22]/95 backdrop-blur-xl p-6 rounded-[2rem] border border-[#00D1FF]/30 shadow-[0_0_50px_rgba(0,209,255,0.1)] animate-in slide-in-from-left duration-500">
                                <div className="flex justify-between items-center mb-6">
                                    <div className="flex items-center gap-2">
                                        <div className="size-2 rounded-full bg-[#00D1FF] animate-ping"></div>
                                        <span className="text-[10px] font-black uppercase text-[#00D1FF] tracking-[0.2em] drop-shadow-[0_0_5px_rgba(0,209,255,1)]">Protocol Active</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Entry OTP</span>
                                        <span className="text-xl font-black text-[#00D1FF] tracking-[0.4em]">{activeTrip.otp}</span>
                                    </div>
                                </div>

                                <div className="space-y-4 mb-8">
                                    <div className="flex gap-3 items-center justify-between">
                                        <div className="flex gap-3 overflow-hidden">
                                            <span className="material-symbols-outlined text-green-500 text-sm shrink-0">radio_button_checked</span>
                                            <p className="text-xs font-bold text-white truncate">{activeTrip.pickupAddress}</p>
                                        </div>
                                        <button onClick={() => handleNavigate(activeTrip.pickupAddress)} className="size-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#00D1FF] hover:text-black transition-colors shrink-0">
                                            <span className="material-symbols-outlined text-sm">navigation</span>
                                        </button>
                                    </div>
                                    <div className="flex gap-3 items-center justify-between">
                                        <div className="flex gap-3 overflow-hidden">
                                            <span className="material-symbols-outlined text-orange-500 text-sm shrink-0">location_on</span>
                                            <p className="text-xs font-bold text-white truncate">{activeTrip.dropAddress}</p>
                                        </div>
                                        <button onClick={() => handleNavigate(activeTrip.dropAddress)} className="size-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#00D1FF] hover:text-black transition-colors shrink-0">
                                            <span className="material-symbols-outlined text-sm">navigation</span>
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => setChatOpen(true)}
                                        className="w-full flex items-center justify-center gap-3 p-4 bg-[#00D1FF]/5 border border-[#00D1FF]/20 rounded-2xl hover:bg-[#00D1FF]/10 transition-all duration-300 group"
                                    >
                                        <span className="material-symbols-outlined text-[#00D1FF] group-hover:scale-110 transition-transform">forum</span>
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Encrypted Chat</span>
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {activeTrip.status === RideStatus.ACCEPTED && (
                                        <button onClick={() => handleUpdateStatus(RideStatus.ARRIVED)} className="col-span-2 h-14 rounded-xl bg-[#00D1FF] text-black font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-transform">I Have Arrived</button>
                                    )}
                                    {activeTrip.status === RideStatus.ARRIVED && (
                                        <button onClick={() => handleUpdateStatus(RideStatus.STARTED)} className="col-span-2 h-14 rounded-xl bg-green-500 text-white font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-transform">Start Ride</button>
                                    )}
                                    {activeTrip.status === RideStatus.STARTED && (
                                        <button onClick={() => handleUpdateStatus(RideStatus.COMPLETED)} className="col-span-2 h-14 rounded-xl bg-white text-black font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-transform">Complete Trip</button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </main>

            {/* Incoming Ride Modal */}
            {incomingRide && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
                    <div className="w-full max-w-lg bg-[#161B22] border border-white/10 rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-10 duration-500 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                        <div className="h-2 bg-[#00D1FF] animate-pulse"></div>
                        <div className="p-8">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="size-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-4xl text-[#00D1FF]">person</span>
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-white">{incomingRide.riderName}</h3>
                                        <div className="flex items-center gap-1 text-amber-400 font-bold text-sm">
                                            {incomingRide.riderRating} ★ <span className="text-slate-500 text-xs font-medium uppercase tracking-widest ml-1">Verified Rider</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-[#00D1FF] uppercase tracking-widest mb-1">Proposed Fare</p>
                                    <p className="text-4xl font-black text-white">₹{incomingRide.estimatedFare}</p>
                                </div>
                            </div>

                            {/* Distance & Info Bar */}
                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                    <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1">Distance to Pickup</p>
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[#00D1FF] text-sm">distance</span>
                                        <p className="text-lg font-black text-white">{incomingDistance !== null ? `${incomingDistance.toFixed(1)} km` : '---'}</p>
                                    </div>
                                </div>
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                    <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1">Est. Time</p>
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-green-400 text-sm">schedule</span>
                                        <p className="text-lg font-black text-white">{incomingDistance !== null ? `${Math.round(incomingDistance * 3)} mins` : '---'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="h-40 rounded-3xl overflow-hidden mb-8 border border-white/10 relative">
                                <div className="absolute inset-0 bg-slate-900 flex items-center justify-center text-[10px] font-black uppercase text-slate-600 tracking-widest">
                                    {/* Using a placeholder if MapContainer is too heavy for small modal, but let's try real map */}
                                    <MapContainer
                                        center={incomingRide.pickupLocation}
                                        pickup={incomingRide.pickupLocation}
                                        showTraffic={showTraffic}
                                        className="grayscale opacity-50"
                                    />
                                </div>
                                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#161B22] to-transparent pointer-events-none"></div>
                                <div className="absolute bottom-4 left-4 bg-[#161B22]/80 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10">
                                    <span className="text-[9px] font-black uppercase text-white tracking-widest">Pickup Location</span>
                                </div>
                            </div>

                            <div className="space-y-6 mb-10 relative">
                                <div className="absolute left-2.5 top-6 bottom-6 w-0.5 bg-white/5 border-l border-dashed border-white/20"></div>
                                <div className="flex gap-4">
                                    <div className="size-5 rounded-full bg-green-500 ring-4 ring-green-500/20 z-10"></div>
                                    <div className="flex-1">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Pickup</p>
                                        <p className="text-sm font-bold text-white line-clamp-1">{incomingRide.pickupAddress}</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="size-5 rounded-full bg-orange-500 ring-4 ring-orange-500/20 z-10"></div>
                                    <div className="flex-1">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Destination</p>
                                        <p className="text-sm font-bold text-white line-clamp-1">{incomingRide.dropAddress}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setIncomingRide(null)}
                                    className="flex-1 h-16 rounded-2xl bg-white/5 text-slate-400 font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
                                >
                                    Decline
                                </button>
                                <button
                                    onClick={handleAccept}
                                    disabled={!!isAccepting}
                                    className={`flex-[2] h-16 rounded-2xl ${isAccepting === 'SUCCESS' ? 'bg-green-500' : 'bg-[#00D1FF]'} text-black font-black text-xs uppercase tracking-widest shadow-[0_0_30px_rgba(0,209,255,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50`}
                                >
                                    {isAccepting === 'SUCCESS' ? (
                                        <>Accepted! <span className="material-symbols-outlined font-bold">check_circle</span></>
                                    ) : isAccepting === true ? (
                                        <>Accepting... <span className="animate-spin material-symbols-outlined text-sm">sync</span></>
                                    ) : (
                                        <>Accept Request <span className="material-symbols-outlined font-bold">check_circle</span></>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Mission Summary / Ride Completed Modal */}
            {finishedRide && (
                <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-[#161B22] border border-white/10 rounded-[3rem] overflow-hidden animate-in zoom-in-95 duration-500 shadow-[0_0_100px_rgba(34,197,94,0.2)]">
                        <div className="h-2 bg-green-500"></div>
                        <div className="p-10 text-center">
                            <div className="size-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/20">
                                <span className="material-symbols-outlined text-white text-4xl">check_circle</span>
                            </div>
                            <h3 className="text-3xl font-black text-white mb-2">Mission Accomplished!</h3>
                            <p className="text-slate-400 text-sm font-medium mb-8">Ride completed successfully. Earnings have been credited to your wallet.</p>

                            <div className="grid grid-cols-2 gap-4 mb-10">
                                <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                                    <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Earnings</p>
                                    <p className="text-2xl font-black text-white">₹{finishedRide.estimatedFare}</p>
                                </div>
                                <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                                    <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Status</p>
                                    <p className="text-2xl font-black text-green-400">Paid</p>
                                </div>
                            </div>

                            <button
                                onClick={() => setFinishedRide(null)}
                                className="w-full h-16 rounded-2xl bg-white text-black font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95 shadow-xl"
                            >
                                Back to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DriverDashboard;
