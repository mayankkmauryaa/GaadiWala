import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { RideType, VehicleCategory, ScheduledRide, PaymentMethod, RideStatus, RidePreferences, PromoCode, PreferredRoute } from '../../types';
import { useRide } from '../../hooks/useRide';
import { useAuth } from '../../context/AuthContext';
import { CONFIG, db } from '../../firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import MapContainer from '../../components/MapContainer';
import { Coordinates } from '../../types';
import ScrollHint from '../../components/shared/ScrollHint';
import { useRef } from 'react';

interface Driver {
    id: string;
    name: string;
    avatar: string;
    carModel: string;
    carNumber: string;
    rating: number;
    price: number;
    eta: string;
    conditions: string[];
    currentLocation?: Coordinates;
    preferredRoutes?: PreferredRoute[];
    bio?: string;
    languages?: string[];
}

interface Props {
    onSchedule: (ride: ScheduledRide) => void;
}

interface ForensicsData {
    distance: string;
    time: string;
    summary: string;
    sources: any[];
}

const FlexFare: React.FC<Props> = ({ onSchedule }) => {
    const { state } = useLocation();
    const navigate = useNavigate();
    const { getAvailableDrivers, getFareEstimate, requestRide, activeRide, scheduleRide, cancelRide } = useRide();
    const { user } = useAuth();

    const rideType: RideType = state?.rideType || 'RESERVED';
    const category: VehicleCategory = state?.category || 'MINI';
    const pickup = state?.pickup || 'Current Location';
    const destination = state?.destination || 'Destination';
    const pickupCoords = state?.pickupCoords;
    const dropCoords = state?.dropCoords;
    const scheduledTimestamp = state?.scheduledTimestamp;
    const preferences: RidePreferences = state?.preferences || { silent: false, ac: false, music: false };

    // AI & Flow Control State
    const [forensics, setForensics] = useState<ForensicsData | null>(state?.forensics || null);
    const [isFetchingForensics, setIsFetchingForensics] = useState(!state?.forensics);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<'BIDDING' | 'DRIVERS' | 'PAYMENT' | 'WAITING'>('BIDDING');
    const [isLoading, setIsLoading] = useState(false);
    const [showBreakdown, setShowBreakdown] = useState(false);
    const [passengerCount, setPassengerCount] = useState(state?.passengerCount || 1);

    // Selections
    const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
    const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
    const [viewingProfile, setViewingProfile] = useState<Driver | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');

    const [bid, setBid] = useState(state?.initialFare || 250);
    const [initialFare, setInitialFare] = useState(state?.initialFare || 250);

    // Promo & Wallet
    const [promoCode, setPromoCode] = useState('');
    const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
    const [promoError, setPromoError] = useState('');
    const [discountAmount, setDiscountAmount] = useState(0);
    const asideScrollRef = useRef<HTMLElement>(null);

    const checkPromo = async () => {
        if (!promoCode) return;
        setPromoError('');
        try {
            const q = query(
                collection(db, 'promoCodes'),
                where('code', '==', promoCode.toUpperCase()),
                where('isActive', '==', true),
                limit(1)
            );
            const snapshot = await getDocs(q);
            if (snapshot.empty) {
                setPromoError('Invalid promo code');
                setAppliedPromo(null);
                setDiscountAmount(0);
                return;
            }
            const promo = snapshot.docs[0].data() as PromoCode;
            if (promo.expiry < Date.now()) {
                setPromoError('Promo code expired');
                return;
            }
            // Calculate Discount
            let discount = 0;
            const baseFare = selectedDriver?.price || bid;
            if (promo.discountType === 'PERCENTAGE') {
                discount = (baseFare * promo.value) / 100;
                if (promo.maxDiscount) discount = Math.min(discount, promo.maxDiscount);
            } else {
                discount = promo.value;
            }
            setAppliedPromo(promo);
            setDiscountAmount(Math.round(discount));
        } catch (err) {
            console.error(err);
            setPromoError('Failed to apply promo');
        }
    };

    useEffect(() => {
        // Only auto-redirect if we are not in the initial bidding/payment setup
        // or if the ride is already beyond searching.
        if (activeRide) {
            if (activeRide.status === RideStatus.SEARCHING && step !== 'BIDDING' && step !== 'PAYMENT') {
                setStep('WAITING');
            } else if ([RideStatus.ACCEPTED, RideStatus.ARRIVED, RideStatus.STARTED].includes(activeRide.status)) {
                navigate('/user/live-tracking');
            }
        }
    }, [activeRide, navigate, step]);

    useEffect(() => {
        // If we already have data from previous screen, sync it
        if (state?.initialFare) {
            setInitialFare(state.initialFare);
            setBid(state.initialFare);
            if (state.forensics) setForensics(state.forensics);
            setIsFetchingForensics(false);
            return;
        }

        const fetchRouteData = async () => {
            // ... existing fetch logic ...
            setIsFetchingForensics(true);
            setError(null);

            try {
                if (pickupCoords && dropCoords) {
                    const estimates = await getFareEstimate(pickupCoords, dropCoords);
                    const specific = estimates.find(e => e.category === category);

                    if (specific) {
                        const calculated = Math.round(rideType === 'SHARED' ? specific.amount * 0.7 : specific.amount);
                        setInitialFare(calculated);
                        setBid(calculated);
                        setForensics({
                            distance: 'Calculated',
                            time: `${specific.eta} mins`,
                            summary: 'Optimized route based on live traffic.',
                            sources: []
                        });
                    } else {
                        // Fallback if specific category not found in estimates
                        const fallbackFare = 250;
                        setInitialFare(fallbackFare);
                        setBid(fallbackFare);
                    }
                } else {
                    const fallbackFare = 250;
                    setInitialFare(fallbackFare);
                    setBid(fallbackFare);
                    setForensics({
                        distance: '---',
                        time: '---',
                        summary: 'Coordinates missing for precise forensics.',
                        sources: []
                    });
                }
            } catch (err) {
                console.error("Route Error:", err);
                // Fallback on error
                const fallbackFare = 250;
                setInitialFare(fallbackFare);
                setBid(fallbackFare);
                setError("Could not calculate exact fare. Using standard rates.");
            } finally {
                setIsFetchingForensics(false);
            }
        };
        fetchRouteData();
    }, [pickupCoords, dropCoords, category, rideType, getFareEstimate, state]);

    const mapSrc = `https://maps.google.com/maps?width=100%25&height=600&hl=en&saddr=${encodeURIComponent(pickup)}&daddr=${encodeURIComponent(destination)}&t=k&z=15&ie=UTF8&iwloc=B&output=embed`;

    const findDrivers = async () => {
        setIsLoading(true);
        try {
            const drivers = await getAvailableDrivers(category, user?.gender);
            // Enrich with Mock Coordinates if real ones missing (for Demo visualization)
            const driversWithPrice = drivers.map((d: any, i) => {
                // Generate a random position near pickup
                const offsetLat = (Math.random() - 0.5) * 0.01;
                const offsetLng = (Math.random() - 0.5) * 0.01;

                // Calculate mock ETA based on distance (approx 3 min per 0.01 degree ~ 1km)
                const distEstimate = Math.sqrt(offsetLat * offsetLat + offsetLng * offsetLng) * 111; // Approx km
                const etaMinutes = Math.max(2, Math.round(distEstimate * 3));

                // Route-based pricing logic
                const matchingRoute = (d.preferredRoutes || []).find((r: any) =>
                    destination.toLowerCase().includes(r.destination.toLowerCase())
                );

                return {
                    ...d,
                    price: matchingRoute ? matchingRoute.price : bid,
                    eta: `${etaMinutes} mins`,
                    currentLocation: d.currentLocation || (pickupCoords ? {
                        lat: pickupCoords.lat + offsetLat,
                        lng: pickupCoords.lng + offsetLng
                    } : undefined)
                };
            });
            setAvailableDrivers(driversWithPrice);
            setStep('DRIVERS');
        } catch (err) {
            setError("Error finding nearby drivers.");
        } finally {
            setIsLoading(false);
        }
    };

    const handlePayment = async () => {
        return new Promise((resolve, reject) => {
            if (!(window as any).Razorpay) {
                reject(new Error("Razorpay SDK not loaded"));
                return;
            }
            const options = {
                key: CONFIG.RAZORPAY_KEY_ID,
                amount: (selectedDriver?.price || bid) * 100,
                currency: "INR",
                name: "Gaadiwala",
                description: `Ride to ${destination}`,
                handler: (response: any) => resolve(response),
                modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
                prefill: {
                    name: user?.name,
                    email: user?.email,
                    contact: user?.phone
                },
                theme: { color: "#0F172A" }
            };
            const rzp = new (window as any).Razorpay(options);
            rzp.open();
        });
    };

    const handleBook = async () => {
        const finalFare = (selectedDriver?.price || bid) - discountAmount;

        // Wallet Balance Check
        if (paymentMethod === 'WALLET') {
            if ((user?.walletBalance || 0) < finalFare) {
                alert(`Insufficient Wallet Balance (₹${user?.walletBalance}). Please Top-up.`);
                navigate('/user/wallet');
                return;
            }
        }

        if (scheduledTimestamp) {
            scheduleRide({
                id: Math.random().toString(36).substr(2, 9),
                pickup, destination, timestamp: scheduledTimestamp, rideType, category,
                fare: finalFare, driverId: selectedDriver?.id, paymentMethod
            });
            alert(`Ride Scheduled for ${new Date(scheduledTimestamp).toLocaleString()}!`);
            navigate('/user/home');
        } else {
            if (!pickupCoords || !dropCoords) {
                setError("Pickup or destination location not selected properly. Please go back and select locations from the search suggestions.");
                return;
            }

            setIsLoading(true);
            try {
                // Only process payment for non-cash methods
                if (paymentMethod === 'UPI' || paymentMethod === 'CARD') {
                    await handlePayment();
                }

                await requestRide(
                    pickupCoords,
                    dropCoords,
                    pickup,
                    destination,
                    category,
                    finalFare,
                    selectedDriver?.id,
                    paymentMethod,
                    preferences
                );
                setStep('WAITING');
            } catch (err) {
                console.error('Booking error:', err);
                setError("Failed to request ride. Please try again.");
            } finally {
                setIsLoading(false);
            }
        }
    };

    return (
        <div className="bg-[#f4f7f9] text-slate-900 font-sans min-h-dvh h-dvh flex flex-col overflow-hidden relative pb-safe">
            <header className="h-14 lg:h-20 bg-[#1e293b] border-b border-white/5 px-4 lg:px-8 flex items-center justify-between z-50 shadow-md shrink-0">
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
                <div className="flex items-center gap-2 lg:gap-4">
                    <button onClick={() => navigate(-1)} className="size-8 lg:size-10 bg-white/5 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-all mr-1 lg:mr-2">
                        <span className="material-symbols-outlined text-sm lg:text-base">arrow_back</span>
                    </button>
                    <div className="size-8 lg:size-10 bg-[#22c55e] rounded-lg lg:rounded-xl flex items-center justify-center text-black shadow-sm">
                        <span className="material-symbols-outlined font-bold text-xs lg:text-base">rocket_launch</span>
                    </div>
                    <div>
                        <h2 className="text-sm lg:text-xl font-black tracking-tight uppercase text-white leading-none">Gaadiwala</h2>
                        <p className="text-[6px] lg:text-[8px] font-bold uppercase tracking-widest text-[#22c55e] mt-0.5">Live Booking</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 pr-20">
                    <button onClick={() => navigate(-1)} className="text-[10px] lg:text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-all">Cancel</button>
                    <div className="w-16 lg:w-20"></div> {/* Spacer for global menu pill */}
                </div>
            </header>

            <main className="flex flex-1 flex-col lg:flex-row overflow-hidden relative h-full">
                {/* 40% Map on Mobile */}
                <div className="h-[35dvh] lg:h-full lg:flex-1 relative overflow-hidden order-1 lg:order-2 border-b lg:border-none border-white/10">
                    <MapContainer
                        pickup={pickupCoords}
                        drop={dropCoords}
                        drivers={availableDrivers.map(d => d.currentLocation).filter((l): l is Coordinates => !!l)}
                    />

                    {/* Desktop Trip Details Overlay */}
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: 0.5, type: "spring", stiffness: 100 }}
                        className="absolute bottom-10 left-10 p-6 rounded-3xl bg-white shadow-xl border border-slate-100 w-80 hidden lg:block z-50"
                    >
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-4">Trip Summary</h4>
                        {isFetchingForensics ? (
                            <div className="text-center space-y-2 py-6">
                                <div className="size-6 border-2 border-slate-200 border-t-orange-500 rounded-full animate-spin mx-auto"></div>
                                <p className="text-xs font-medium text-slate-500">Loading details...</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex gap-4"><span className="material-symbols-outlined text-[#22c55e] text-sm">radio_button_checked</span><p className="text-xs font-medium truncate">{pickup}</p></div>
                                <div className="flex gap-4"><span className="material-symbols-outlined text-orange-500 text-sm">location_on</span><p className="text-xs font-medium truncate">{destination}</p></div>
                                <div className="pt-4 border-t flex justify-between">
                                    <div><p className="text-[9px] font-bold uppercase text-slate-400">Distance</p><p className="text-sm font-bold">{forensics?.distance || '...'}</p></div>
                                    <div><p className="text-[9px] font-bold uppercase text-slate-400">Time</p><p className="text-sm font-bold text-slate-700">{forensics?.time || '...'}</p></div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>

                <aside
                    ref={asideScrollRef}
                    className="w-full lg:w-[480px] bg-[#1e293b] h-[65dvh] lg:h-full flex flex-col p-4 sm:p-6 lg:p-8 overflow-y-auto relative scrollbar-hide order-2 lg:order-1 shadow-2xl border-r border-white/5 pb-safe"
                >
                    <ScrollHint containerRef={asideScrollRef as any} />
                    {/* Mobile Trip Details - persistent and compact */}
                    {!isFetchingForensics && forensics && (
                        <div className="lg:hidden mb-4 p-3 bg-white/5 rounded-xl border border-white/10 shadow-sm relative overflow-hidden shrink-0">
                            <div className="relative flex justify-between items-center px-1">
                                <div>
                                    <p className="text-slate-400 text-[9px] font-bold uppercase tracking-wide mb-0.5">Distance</p>
                                    <p className="text-white text-xs font-bold">{forensics.distance}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-slate-400 text-[9px] font-bold uppercase tracking-wide mb-0.5">Est. Time</p>
                                    <p className="text-[#22c55e] text-xs font-bold">{forensics.time}</p>
                                </div>
                            </div>
                        </div>
                    )}
                    <AnimatePresence mode="wait">
                        {step === 'BIDDING' && (
                            <motion.div
                                key="bidding"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                className="flex flex-col h-full"
                            >
                                <div className="bg-white/5 p-4 rounded-2xl mb-4 border border-white/5">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-slate-400">group</span>
                                            <span className="text-[10px] font-bold uppercase text-slate-400">Passengers</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => {
                                                    if (passengerCount > 1) {
                                                        const perPerson = initialFare / passengerCount;
                                                        setInitialFare(perPerson * (passengerCount - 1));
                                                        setBid((prev: number) => Math.round((prev / passengerCount) * (passengerCount - 1)));
                                                        setPassengerCount((prev: number) => prev - 1);
                                                    }
                                                }}
                                                disabled={passengerCount <= 1}
                                                className={`size-8 rounded-full flex items-center justify-center border transition-all ${passengerCount <= 1 ? 'border-white/5 text-slate-600' : 'border-white/20 text-white hover:bg-white/10'}`}
                                            >
                                                <span className="material-symbols-outlined text-sm">remove</span>
                                            </button>
                                            <span className="text-white font-bold">{passengerCount}</span>
                                            <button
                                                onClick={() => {
                                                    const limits: Record<string, number> = {
                                                        [VehicleCategory.BIKE]: 1,
                                                        [VehicleCategory.AUTO]: 3,
                                                        [VehicleCategory.MINI]: 4,
                                                        [VehicleCategory.PRIME]: 4,
                                                        [VehicleCategory.PINK]: 4
                                                    };
                                                    const max = limits[category] || 4;
                                                    if (passengerCount < max) {
                                                        const perPerson = initialFare / passengerCount;
                                                        setInitialFare(perPerson * (passengerCount + 1));
                                                        setBid((prev: number) => Math.round((prev / passengerCount) * (passengerCount + 1)));
                                                        setPassengerCount((prev: number) => prev + 1);
                                                    }
                                                }}
                                                disabled={(() => {
                                                    const limits: Record<string, number> = {
                                                        [VehicleCategory.BIKE]: 1,
                                                        [VehicleCategory.AUTO]: 3,
                                                        [VehicleCategory.MINI]: 4,
                                                        [VehicleCategory.PRIME]: 4,
                                                        [VehicleCategory.PINK]: 4
                                                    };
                                                    return passengerCount >= (limits[category] || 4);
                                                })()}
                                                className="size-8 rounded-full flex items-center justify-center border border-white/20 text-white hover:bg-white/10 transition-all disabled:opacity-50"
                                            >
                                                <span className="material-symbols-outlined text-sm">add</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <h3 className="text-sm lg:text-xl font-black tracking-tight mb-4 lg:mb-8 shrink-0 text-white uppercase italic">Offer Your Fare</h3>

                                <div className="bg-white/5 p-4 lg:p-8 rounded-2xl lg:rounded-[2rem] border border-white/5 relative shadow-sm mb-4 lg:mb-8 shrink-0 overflow-hidden">
                                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#22c55e]/30 to-transparent"></div>

                                    <div className="flex flex-col items-center mb-6 lg:mb-8">
                                        <div className="flex items-center gap-2 mb-2">
                                            <p className="text-[10px] lg:text-[12px] font-black uppercase text-slate-500 tracking-widest italic">Your Offer</p>
                                            <button onClick={() => setShowBreakdown(true)} className="size-4 lg:size-5 rounded-full border border-white/20 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/40 transition-all">
                                                <span className="material-symbols-outlined text-[10px] lg:text-[12px]">info</span>
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-1 scale-110 lg:scale-125">
                                            <span className="text-xl lg:text-4xl font-black text-[#22c55e]">₹</span>
                                            <motion.input
                                                whileFocus={{ scale: 1.1 }}
                                                type="number"
                                                value={bid}
                                                onChange={(e) => setBid(Number(e.target.value))}
                                                className="bg-transparent text-2xl lg:text-5xl font-black text-white w-32 lg:w-48 focus:outline-none text-center tabular-nums"
                                            />
                                        </div>
                                    </div>

                                    {/* Premium Scrollable Fare Selection */}
                                    <div className="relative mb-6">
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-4 text-center">Slide to adjust bid</p>
                                        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide snap-x px-4">
                                            {(() => {
                                                const steps = [];
                                                const base = initialFare || 250;
                                                // Generate values from -40% to +40% in 5% increments
                                                for (let i = -8; i <= 8; i++) {
                                                    steps.push(Math.round(base * (1 + (i * 0.05))));
                                                }
                                                return steps.map((val) => (
                                                    <motion.button
                                                        key={val}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => setBid(val)}
                                                        className={`snap-center shrink-0 min-w-[80px] py-4 rounded-xl border transition-all flex flex-col items-center gap-1 ${bid === val
                                                            ? 'bg-[#22c55e] border-[#22c55e] text-black shadow-lg shadow-[#22c55e]/20 scale-110'
                                                            : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                                                            }`}
                                                    >
                                                        <span className="text-[12px] font-black">₹{val}</span>
                                                        <span className="text-[8px] font-bold opacity-50 uppercase">
                                                            {val === base ? 'STD' : val > base ? `+${Math.round((val / base - 1) * 100)}%` : `-${Math.round((1 - val / base) * 100)}%`}
                                                        </span>
                                                    </motion.button>
                                                ));
                                            })()}
                                        </div>
                                    </div>

                                    <div className="flex justify-center gap-6 text-[9px] font-black uppercase tracking-widest mt-2 border-t border-white/5 pt-6">
                                        <button onClick={() => setBid(Math.round(initialFare * 0.85))} className="text-slate-500 hover:text-white transition-colors">Min</button>
                                        <button onClick={() => setBid(initialFare)} className="text-[#22c55e] px-6 py-1.5 bg-[#22c55e]/10 rounded-full border border-[#22c55e]/30 hover:bg-[#22c55e]/20 transition-all">Standard</button>
                                        <button onClick={() => setBid(Math.round(initialFare * 1.3))} className="text-slate-500 hover:text-white transition-colors">Max</button>
                                    </div>
                                </div>

                                {/* Preferences - More compact for mobile */}
                                <div className="bg-white/5 p-4 lg:p-6 rounded-2xl lg:rounded-3xl border border-white/5 mb-6 lg:mb-8 shrink-0 backdrop-blur-sm">
                                    <p className="text-[7px] lg:text-[10px] font-black uppercase text-slate-500 mb-3 lg:mb-4 tracking-widest">Active Preferences</p>
                                    <div className="flex gap-4">
                                        <div className={`flex items-center gap-2 text-[10px] lg:text-xs font-bold ${preferences.silent ? 'text-[#22c55e]' : 'text-slate-500'}`}>
                                            <span className="material-symbols-outlined text-xs lg:text-sm">volume_off</span> Silent
                                        </div>
                                        <div className={`flex items-center gap-2 text-[10px] lg:text-xs font-bold ${preferences.ac ? 'text-[#22c55e]' : 'text-slate-500'}`}>
                                            <span className="material-symbols-outlined text-xs lg:text-sm">ac_unit</span> AC
                                        </div>
                                        <div className={`flex items-center gap-2 text-[10px] lg:text-xs font-bold ${preferences.music ? 'text-[#22c55e]' : 'text-slate-500'}`}>
                                            <span className="material-symbols-outlined text-xs lg:text-sm">music_note</span> Music
                                        </div>
                                    </div>
                                </div>

                                <motion.button
                                    onClick={() => setStep('PAYMENT')}
                                    disabled={isLoading || isFetchingForensics}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    animate={{
                                        boxShadow: ["0px 0px 0px rgba(34,197,94,0)", "0px 0px 20px rgba(34,197,94,0.3)", "0px 0px 0px rgba(34,197,94,0)"]
                                    }}
                                    transition={{
                                        boxShadow: { duration: 2, repeat: Infinity }
                                    }}
                                    className="w-full h-14 sm:h-16 bg-[#22c55e] text-black rounded-xl lg:rounded-[2rem] font-black text-[10px] sm:text-xs lg:text-xs uppercase tracking-widest shadow-2xl flex items-center justify-center gap-3 lg:gap-4 mt-auto shrink-0"
                                >
                                    Proceed to Payment <span className="material-symbols-outlined text-sm sm:text-base">payments</span>
                                </motion.button>
                                <button
                                    onClick={findDrivers}
                                    className="w-full mt-4 text-[9px] font-black uppercase text-slate-500 hover:text-white transition-colors tracking-widest"
                                >
                                    Or View Available Partners
                                </button>
                            </motion.div>
                        )}

                        {step === 'DRIVERS' && (
                            <motion.div
                                key="drivers"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                className="flex flex-col h-full"
                            >
                                <div className="flex items-center justify-between mb-4 lg:mb-8 shrink-0">
                                    <button onClick={() => { setStep('BIDDING'); setError(null); }} className="size-8 lg:size-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 text-white border border-white/5">
                                        <span className="material-symbols-outlined text-xs lg:text-sm">arrow_back</span>
                                    </button>
                                    <h3 className="text-xl lg:text-2xl font-black tracking-tight text-white">Available Drivers</h3>
                                </div>
                                <div className="flex-1 space-y-3 lg:space-y-4 overflow-y-auto pr-2 scrollbar-hide">
                                    {availableDrivers.length > 0 ? availableDrivers.map((driver, index) => (
                                        <motion.div
                                            key={driver.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="bg-white/5 border border-white/10 rounded-2xl lg:rounded-3xl p-3 lg:p-5 shadow-sm hover:shadow-[0_0_20px_rgba(34,197,94,0.1)] hover:border-[#22c55e]/30 transition-all relative group backdrop-blur-md"
                                        >
                                            <div className="flex gap-3 lg:gap-4">
                                                <img src={driver.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${driver.id}`} className="size-12 lg:size-16 rounded-xl lg:rounded-2xl object-cover bg-slate-800 border border-white/10" alt="avatar" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start">
                                                        <div className="min-w-0">
                                                            <h4 className="font-black text-xs lg:text-lg truncate tracking-tight uppercase italic text-white">{driver.name}</h4>
                                                            <div className="flex items-center gap-1 text-[8px] lg:text-[10px] text-slate-400 font-bold uppercase truncate">
                                                                <span>{driver.carModel}</span> • <span className="text-[#22c55e]">{driver.rating} ★</span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm lg:text-xl font-black text-white italic leading-none">₹{driver.price}</p>
                                                            <p className="text-[7px] lg:text-[9px] text-slate-500 font-black uppercase tracking-tighter mt-1 italic">{driver.eta}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-3 flex gap-2">
                                                <button onClick={() => setViewingProfile(driver)} className="flex-1 py-2 rounded-lg bg-white/5 text-slate-400 text-[8px] lg:text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all border border-white/5">Profile</button>
                                                <button onClick={() => { setSelectedDriver(driver); setStep('PAYMENT'); }} className="flex-2 py-2 rounded-lg bg-[#22c55e] text-black text-[8px] lg:text-[10px] font-black uppercase tracking-widest hover:shadow-[0_0_15px_rgba(34,197,94,0.4)] transition-all italic px-4 shadow-[0_0_10px_rgba(34,197,94,0.2)]">Select Partner</button>
                                            </div>
                                        </motion.div>
                                    )) : (
                                        <div className="text-center py-10 lg:py-20 bg-white/5 rounded-2xl lg:rounded-3xl border border-dashed border-white/10">
                                            <span className="material-symbols-outlined text-3xl lg:text-4xl text-slate-600 mb-2">person_off</span>
                                            <p className="text-[10px] lg:text-xs text-slate-500 font-bold uppercase tracking-widest">No partners online</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                        {step === 'PAYMENT' && (
                            <motion.div
                                key="payment"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                className="flex flex-col h-full"
                            >
                                <div className="flex items-center gap-2 mb-6">
                                    <button onClick={() => { setStep(selectedDriver ? 'DRIVERS' : 'BIDDING'); setError(null); }} className="size-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 text-white">
                                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                                    </button>
                                    <h3 className="text-xl font-black tracking-tight text-white">Confirm & Pay</h3>
                                </div>
                                <div className="bg-[#0A0E12] text-white p-4 lg:p-8 rounded-2xl lg:rounded-[3.5rem] mb-4 lg:mb-8 relative overflow-hidden group shadow-xl border border-white/5 shrink-0">
                                    <div className="absolute inset-0 bg-gradient-to-br from-[#22c55e]/10 to-transparent"></div>
                                    <div className="relative flex items-center gap-4 lg:gap-6">
                                        <div className="relative">
                                            <div className="size-12 lg:size-20 rounded-xl lg:rounded-[1.5rem] bg-white/10 flex items-center justify-center border-2 border-white/10">
                                                {selectedDriver ? (
                                                    <img src={selectedDriver.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedDriver.id}`} className="size-full object-cover rounded-xl lg:rounded-[1.5rem]" alt="avatar" />
                                                ) : (
                                                    <span className="material-symbols-outlined text-3xl text-slate-400">person_search</span>
                                                )}
                                            </div>
                                            {selectedDriver && (
                                                <div className="absolute -bottom-1 -right-1 bg-[#22c55e] text-black size-4 lg:size-6 rounded flex items-center justify-center border-2 border-[#0A0E12]">
                                                    <span className="material-symbols-outlined text-[8px] lg:text-[12px] font-black">verified</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[6px] lg:text-[10px] font-black uppercase text-[#22c55e] tracking-[0.2em] mb-0.5 italic">
                                                {selectedDriver ? 'Partner Selected' : 'Generic Offering'}
                                            </p>
                                            <p className="font-black text-xs lg:text-2xl truncate uppercase italic leading-tight">
                                                {selectedDriver ? selectedDriver.name : `${category} Services`}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[6px] lg:text-[10px] font-black uppercase text-white/40 mb-0.5">Estimated Fare</p>
                                            <p className="font-black text-base lg:text-4xl text-[#22c55e] italic leading-none">₹{selectedDriver?.price || bid}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 lg:space-y-4 flex-1">
                                    {/* Payment Selector */}
                                    <div className="flex gap-2 bg-white/5 p-1 rounded-xl shrink-0">
                                        {(['UPI', 'CASH', 'WALLET'] as PaymentMethod[]).map(method => (
                                            <button
                                                key={method}
                                                onClick={() => setPaymentMethod(method)}
                                                className={`flex-1 py-2 lg:py-3 rounded-lg text-[9px] lg:text-xs font-black transition-all uppercase ${paymentMethod === method
                                                    ? 'bg-[#22c55e] text-black shadow-lg shadow-[#22c55e]/20'
                                                    : 'text-slate-400 hover:text-white'
                                                    }`}
                                            >
                                                {method}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Promo Input */}
                                    <div className="flex gap-2 shrink-0">
                                        <input
                                            type="text"
                                            value={promoCode}
                                            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                                            placeholder="PROMO CODE"
                                            className="flex-1 bg-white/5 border border-white/10 focus:border-[#22c55e] rounded-xl px-4 py-2 text-[10px] font-black outline-none transition-all uppercase text-white placeholder:text-slate-600"
                                        />
                                        <button
                                            onClick={checkPromo}
                                            disabled={!promoCode || !!appliedPromo}
                                            className="bg-[#22c55e] text-black px-4 rounded-xl font-black text-[9px] disabled:opacity-30 uppercase italic"
                                        >
                                            Apply
                                        </button>
                                    </div>

                                    {/* Fare Summary */}
                                    <div className="bg-white/5 p-3 lg:p-4 rounded-xl space-y-1 lg:space-y-2 shrink-0">
                                        <div className="flex justify-between text-slate-400 text-[9px] lg:text-xs font-bold uppercase tracking-tighter">
                                            <span>Base Fare</span>
                                            <span>₹{selectedDriver?.price || bid}</span>
                                        </div>
                                        {discountAmount > 0 && (
                                            <div className="flex justify-between text-[#22c55e] font-black text-[9px] lg:text-xs uppercase">
                                                <span>Promo Discount</span>
                                                <span>-₹{discountAmount}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between font-black text-sm lg:text-lg border-t border-white/10 pt-2 lg:mt-2 italic text-white">
                                            <span>Total Payable</span>
                                            <span>₹{(selectedDriver?.price || bid) - discountAmount}</span>
                                        </div>
                                    </div>

                                    <button onClick={handleBook} className="w-full h-12 lg:h-16 bg-[#22c55e] text-black rounded-xl lg:rounded-[2rem] font-black text-[10px] lg:text-xs uppercase tracking-widest shadow-[0_0_30px_rgba(34,197,94,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 lg:gap-4 mt-auto">
                                        {isLoading ? (
                                            <>Authorising... <span className="material-symbols-outlined animate-spin text-sm">sync</span></>
                                        ) : (
                                            <>Pay ₹{(selectedDriver?.price || bid) - discountAmount} <span className="material-symbols-outlined text-sm">arrow_forward</span></>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                        {step === 'WAITING' && (
                            <motion.div
                                key="waiting"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.1 }}
                                transition={{ duration: 0.5 }}
                                className="flex flex-col items-center justify-center h-full text-center space-y-8"
                            >
                                <div className="relative">
                                    <div className="size-32 bg-orange-500/10 rounded-full animate-ping absolute inset-0"></div>
                                    <div className="size-32 bg-orange-500 rounded-full flex items-center justify-center text-white relative shadow-2xl">
                                        <span className="material-symbols-outlined text-5xl animate-spin">sync</span>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black tracking-tight">Searching for Partner</h3>
                                    <p className="text-slate-400 text-sm font-medium mt-2">Pinging nearby {category} partners with your bid of ₹{selectedDriver?.price || bid}</p>
                                </div>
                                <div className="w-full bg-slate-50 p-6 rounded-3xl space-y-3">
                                    <div className="flex justify-between text-xs"><span className="text-slate-500 font-bold uppercase">Pickup</span><span className="font-black truncate w-40 text-right">{pickup}</span></div>
                                    <div className="flex justify-between text-xs"><span className="text-slate-500 font-bold uppercase">Destination</span><span className="font-black truncate w-40 text-right">{destination}</span></div>
                                </div>
                                <button onClick={() => { if (activeRide) cancelRide(activeRide.id, 'Changed mind'); setStep('BIDDING'); }} className="text-red-500 font-black text-xs uppercase tracking-widest hover:bg-red-50 px-6 py-3 rounded-xl transition-all">Cancel Request</button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </aside >
            </main >

            {
                viewingProfile && (
                    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setViewingProfile(null)}>
                        <div className="bg-white w-full max-w-sm rounded-[3rem] overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                            <div className={`h-32 ${category === VehicleCategory.PINK ? 'bg-pink-600' : 'bg-slate-900'} relative`}>
                                <button onClick={() => setViewingProfile(null)} className="absolute top-4 right-4 size-8 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20">
                                    <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                                {category === VehicleCategory.PINK && (
                                    <div className="absolute top-4 left-6 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/30">
                                        <span className="text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-1">✨ Pink Cab Service</span>
                                    </div>
                                )}
                            </div>
                            <div className="px-8 pb-8 -mt-12 max-h-[70vh] overflow-y-auto">
                                <div className="relative inline-block">
                                    <img src={viewingProfile.avatar} className="size-24 rounded-3xl border-4 border-white shadow-xl bg-slate-100 object-cover mb-4" alt="avatar" />
                                    {category === VehicleCategory.PINK && (
                                        <div className="absolute -bottom-1 -right-1 bg-pink-500 text-white size-6 rounded-lg flex items-center justify-center border-2 border-white shadow-lg">
                                            <span className="material-symbols-outlined text-[10px] font-black">favorite</span>
                                        </div>
                                    )}
                                </div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic mb-1">{viewingProfile.name}</h2>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8">{viewingProfile.carModel} • <span className="text-slate-900">{viewingProfile.carNumber}</span></p>

                                <div className="grid grid-cols-3 gap-4 mb-8">
                                    <div className={`text-center p-4 ${category === VehicleCategory.PINK ? 'bg-pink-50 text-pink-600 border border-pink-100' : 'bg-slate-50 text-slate-800 border border-slate-100'} rounded-[1.5rem]`}><p className="text-xl font-black">{viewingProfile.rating}</p><p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Rating</p></div>
                                    <div className={`text-center p-4 ${category === VehicleCategory.PINK ? 'bg-pink-50 text-pink-600 border border-pink-100' : 'bg-slate-50 text-slate-800 border border-slate-100'} rounded-[1.5rem]`}><p className="text-xl font-black">1.2k</p><p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Trips</p></div>
                                    <div className={`text-center p-4 ${category === VehicleCategory.PINK ? 'bg-pink-50 text-pink-600 border border-pink-100' : 'bg-slate-50 text-slate-800 border border-slate-100'} rounded-[1.5rem]`}><p className="text-xl font-black">3yr</p><p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Exp</p></div>
                                </div>

                                {viewingProfile.bio && (
                                    <div className="mb-6">
                                        <p className="text-[10px] font-black uppercase text-slate-400 mb-2">About Partner</p>
                                        <p className="text-[11px] font-medium text-slate-600 leading-relaxed italic border-l-2 border-slate-100 pl-4">{viewingProfile.bio}</p>
                                    </div>
                                )}

                                {viewingProfile.languages && viewingProfile.languages.length > 0 && (
                                    <div className="mb-6">
                                        <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Languages</p>
                                        <div className="flex flex-wrap gap-1">
                                            {viewingProfile.languages.map(l => (
                                                <span key={l} className="text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-lg border border-slate-200">{l}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="mb-6">
                                    <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Driver Conditions</p>
                                    <div className="flex flex-wrap gap-2">{viewingProfile.conditions.map((c, i) => (<span key={i} className="text-[10px] bg-orange-50 text-orange-700 px-3 py-1.5 rounded-lg font-bold border border-orange-100">{c}</span>))}</div>
                                </div>

                                <button onClick={() => { setSelectedDriver(viewingProfile); setViewingProfile(null); setStep('PAYMENT'); }} className={`w-full h-14 ${category === VehicleCategory.PINK ? 'bg-pink-600 shadow-[0_10px_30px_rgba(219,39,119,0.3)]' : 'bg-slate-900 shadow-xl'} text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] transition-transform active:scale-95`}>Select Partner</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                showBreakdown && (
                    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setShowBreakdown(false)}>
                        <div className="bg-[#1e293b] w-full max-w-sm rounded-[2rem] p-6 lg:p-8 animate-in zoom-in-95 border border-white/10 shadow-2xl" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg lg:text-xl font-black text-white">Fare Details</h3>
                                <button onClick={() => setShowBreakdown(false)} className="text-slate-400 hover:text-white"><span className="material-symbols-outlined">close</span></button>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between text-xs font-bold text-slate-400">
                                    <span>Base Rate</span>
                                    <span className="text-white">₹{Math.round(initialFare * 0.4)}</span>
                                </div>
                                <div className="flex justify-between text-xs font-bold text-slate-400">
                                    <span>Distance & Time</span>
                                    <span className="text-white">₹{Math.round(initialFare * 0.6)}</span>
                                </div>
                                <div className="flex justify-between text-xs font-bold text-slate-400">
                                    <span>Demand Surge</span>
                                    <span className="text-[#22c55e]">1.0x</span>
                                </div>
                                {rideType === 'SHARED' && (
                                    <div className="flex justify-between text-xs font-bold text-[#22c55e]">
                                        <span>Shared Saver</span>
                                        <span>-30%</span>
                                    </div>
                                )}
                                <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                                    <span className="text-sm font-black uppercase tracking-widest text-slate-300">Total Est.</span>
                                    <span className="text-2xl font-black text-white">₹{bid}</span>
                                </div>
                            </div>
                            <p className="mt-8 text-[10px] text-slate-500 font-medium text-center">Includes taxes and standard platform fees.</p>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default FlexFare;
