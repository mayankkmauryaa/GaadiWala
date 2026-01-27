import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import SOSButton from '../../components/Safety/SOSButton';
import { db } from '../../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useRide } from '../../hooks/useRide';
import { RideStatus, User, Coordinates } from '../../types';
import { useAuth } from '../../context/AuthContext';
import Chat from '../../components/shared/Chat';
import MapContainer from '../../components/MapContainer';

const LiveTracking: React.FC = () => {
    const { state } = useLocation();
    const navigate = useNavigate();
    const { activeRide, cancelRide } = useRide();

    const pickup = activeRide?.pickupAddress || state?.pickup || 'Mathura Junction';
    const destination = activeRide?.dropAddress || state?.destination || 'Vrindavan Gate';

    // Component State
    const [showDetails, setShowDetails] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    // const [progress, setProgress] = useState(0);
    const { user } = useAuth();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [safetyStatus] = useState<'SECURE' | 'DEVIATING' | 'STOPPED'>('SECURE');
    const [showShareToast, setShowShareToast] = useState(false);

    // Live Data State
    const [driverPosition, setDriverPosition] = useState<Coordinates>(
        activeRide?.pickupLocation || state?.pickupCoords || { lat: 27.4924, lng: 77.6737 }
    );
    const [eta, setEta] = useState(4);
    const [driverDetails, setDriverDetails] = useState<any>(state?.driver || null);

    const startPoint = activeRide?.pickupLocation || state?.pickupCoords || { lat: 27.4924, lng: 77.6737 };
    const endPoint = activeRide?.dropLocation || state?.dropCoords || { lat: 27.5024, lng: 77.6837 };

    useEffect(() => {
        const timeTimer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timeTimer);
    }, []);

    // Listen to Driver Location if active
    useEffect(() => {
        if (!activeRide?.driverId) return;

        const unsub = onSnapshot(doc(db, 'users', activeRide.driverId), (doc) => {
            if (doc.exists()) {
                const data = doc.data() as User;
                if (data.currentLocation) {
                    setDriverDetails((prev: any) => ({ ...prev, ...data }));
                    // If we have actual GPS from driver, snap marker to it
                    setDriverPosition(data.currentLocation);
                }
            }
        });

        return () => unsub();
    }, [activeRide?.driverId]);

    // Simple ETA & Progress Simulation (Synced with Ride status)
    useEffect(() => {
        if (!activeRide) return;

        if (activeRide.status === RideStatus.COMPLETED) {
            navigate('/user/trip-summary', { state: { ride: activeRide, driver: driverDetails || activeRide.driverDetails } });
        }

        if (activeRide.status === RideStatus.CANCELLED) {
            alert("This ride has been cancelled.");
            navigate('/user/home');
        }

        // Animated movement simulator if status is ACCEPTED or STARTED (fallback if live location lags)
        if (activeRide.status === RideStatus.ACCEPTED || activeRide.status === RideStatus.STARTED) {
            const timer = setInterval(() => {
                setDriverPosition((prev: Coordinates) => {
                    // Only simulate if within a reasonable distance or no fresh live data
                    const nextLat = prev.lat + (endPoint.lat - prev.lat) * 0.005;
                    const nextLng = prev.lng + (endPoint.lng - prev.lng) * 0.005;
                    return { lat: nextLat, lng: nextLng };
                });
                setEta((prev: number) => Math.max(1, prev - 0.1));

                // Update progress based on distance to endPoint
                // Update progress based on distance to endPoint
                setDriverPosition(current => {
                    // const totalDist = Math.sqrt(Math.pow(endPoint.lat - startPoint.lat, 2) + Math.pow(endPoint.lng - startPoint.lng, 2));
                    // const currentDist = Math.sqrt(Math.pow(current.lat - startPoint.lat, 2) + Math.pow(current.lng - startPoint.lng, 2));
                    // setProgress(currentDist / totalDist);
                    return current;
                });

            }, 5000);
            return () => clearInterval(timer);
        }
    }, [activeRide, navigate, endPoint.lat, endPoint.lng, startPoint.lat, startPoint.lng, driverDetails]);


    const handleShare = () => {
        const trackId = Math.random().toString(36).substr(2, 6);
        const trackingUrl = `https://Gaadiwala.app/track/${trackId}`;
        const text = `Track my ride with ${driver.name} (${driver.vehicleNumber}). ETA: ${eta} mins.`;

        if (navigator.share) {
            navigator.share({ title: 'My Gaadiwala Ride', text, url: trackingUrl }).catch(console.error);
        } else {
            window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + trackingUrl)}`, '_blank');
        }
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 3000);
    };

    const handleCancel = async () => {
        if (!cancelReason) return alert("Please select a reason");
        if (activeRide) {
            await cancelRide(activeRide.id, cancelReason);
        }
        navigate('/user/home');
    };

    const mapSrc = `https://maps.google.com/maps?width=100%25&height=600&hl=en&saddr=${encodeURIComponent(pickup)}&daddr=${encodeURIComponent(destination)}&t=m&z=13&ie=UTF8&iwloc=B&output=embed`;

    // Final driver object to use in UI
    const driver = driverDetails || activeRide?.driverDetails || state?.driver || {
        name: "Rajesh Kumar",
        avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop",
        rating: 4.9,
        vehicleNumber: "UP 85 AQ 1234",
        vehicleType: state?.category || "Sedan"
    };

    return (
        <>
            <div className="bg-[#16181d] text-white font-sans overflow-hidden min-h-dvh h-dvh w-full flex flex-col relative pb-safe">
                <header className="flex items-center justify-between border-b border-white/5 px-4 md:px-8 py-4 md:py-6 bg-black/60 backdrop-blur-3xl z-[60]">
                    <div className="flex items-center gap-3 md:gap-6">
                        <Link to="/" className="size-9 md:size-12 bg-slate-900 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-black/50 shrink-0 border border-white/5">
                            <span className="material-symbols-outlined font-black text-sm md:text-xl text-[#00D1FF]">rocket_launch</span>
                        </Link>
                        <div className="flex flex-col">
                            <h2 className="text-sm md:text-xl font-black tracking-tighter italic uppercase truncate max-w-[80px] md:max-w-none">Gaadiwala <span className="text-[#00D1FF] not-italic">Live</span></h2>
                            <div className="flex items-center gap-1.5 mt-1">
                                <span className="size-1 md:size-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                <p className="text-[7px] md:text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] truncate italic">
                                    {activeRide?.status === RideStatus.ACCEPTED ? `Arriving` :
                                        activeRide?.status === RideStatus.STARTED ? 'On Trip' :
                                            activeRide?.status === RideStatus.ARRIVED ? 'Arrived' : 'Active Ops'}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="hidden sm:flex flex-col items-end mr-2 md:mr-4">
                            <p className="text-[7px] md:text-[8px] font-black uppercase text-slate-500 tracking-widest">Safety</p>
                            <div className="flex items-center gap-1">
                                <span className={`size-1 md:size-1.5 rounded-full ${safetyStatus === 'SECURE' ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></span>
                                <span className={`text-[8px] md:text-[10px] font-black ${safetyStatus === 'SECURE' ? 'text-green-500' : 'text-red-500'}`}>{safetyStatus === 'SECURE' ? 'SECURE' : 'ALERT'}</span>
                            </div>
                        </div>
                        <button onClick={handleShare} className="size-10 md:size-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-green-500 hover:text-white transition-all group relative">
                            <span className="material-symbols-outlined text-green-400 text-sm md:text-base group-hover:text-white">share</span>
                            {showShareToast && (
                                <div className="absolute -bottom-10 right-0 bg-green-500 text-white text-[7px] md:text-[8px] font-black px-1.5 md:px-2 py-0.5 md:py-1 rounded-lg animate-in fade-in slide-in-from-top-1 whitespace-nowrap">COPIED</div>
                            )}
                        </button>
                        <button onClick={() => setChatOpen(true)} className="size-10 md:size-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all">
                            <span className="material-symbols-outlined text-teal-400 text-sm md:text-base">forum</span>
                        </button>
                        <SOSButton onTrigger={() => alert("EMERGENCY Protocol Active.")} />
                        <button onClick={() => setShowCancelModal(true)} className="bg-red-500/10 text-red-500 px-3 md:px-6 h-10 md:h-12 rounded-full font-black text-[8px] md:text-[10px] uppercase tracking-widest md:tracking-[0.2em] border border-red-500/20 hover:bg-red-500 hover:text-white transition-all duration-300">Abort</button>
                    </div>
                </header>

                <main className="relative flex-1 bg-slate-900">
                    <div className="absolute inset-0 opacity-70">
                        <MapContainer
                            pickup={driverPosition}
                            drop={activeRide?.status === RideStatus.STARTED ? activeRide.dropLocation : activeRide?.pickupLocation}
                            center={driverPosition}
                            drivers={[driverPosition]}
                        />
                    </div>

                    <div className="absolute inset-0 z-10 pointer-events-none">
                        {/* Status Label on top of map */}
                        <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
                            <span className="size-2 rounded-full bg-orange-500 animate-pulse"></span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-white">Live Tracking Active</span>
                        </div>
                    </div>

                    <div className="absolute bottom-4 sm:bottom-6 md:bottom-12 left-4 md:left-12 right-4 md:right-12 z-[70] flex justify-center animate-in slide-in-from-bottom-8 duration-700">
                        <div className="w-full max-w-5xl bg-[#0A0E12]/95 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] md:rounded-[4rem] p-6 sm:p-8 md:p-10 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.9)] relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-[#00D1FF]/5 to-transparent pointer-events-none"></div>
                            {driver.vehicleType === 'PINK' && (
                                <div className="absolute top-0 right-0 px-6 py-2 bg-pink-600 text-white rounded-bl-3xl text-[9px] font-black uppercase tracking-[0.2em] italic shadow-xl">
                                    ✨ Pink Cab Active
                                </div>
                            )}
                            <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 relative z-10">
                                <div className="flex items-center gap-6 cursor-pointer w-full md:w-auto" onClick={() => setShowDetails(!showDetails)}>
                                    <div className="relative">
                                        <img src={driver.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${driver.id}`} className={`size-16 md:size-24 rounded-[2rem] object-cover border-4 ${driver.vehicleType === 'PINK' ? 'border-pink-500 shadow-pink-500/20' : 'border-[#00D1FF] shadow-[#00D1FF]/20'} shadow-2xl`} alt="avatar" />
                                        <div className={`absolute -bottom-2 -right-2 ${driver.vehicleType === 'PINK' ? 'bg-pink-500' : 'bg-[#00D1FF]'} text-black text-[9px] md:text-[11px] font-black px-2 md:px-3 py-1 rounded-xl border-4 border-[#0A0E12]`}>{driver.rating} ★</div>
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-xl md:text-3xl font-black tracking-tight truncate uppercase italic">{driver.name}</h3>
                                        <p className="text-slate-500 text-[10px] md:text-sm font-black uppercase tracking-[0.2em] truncate">{driver.vehicleType} TIER • <span className="text-white italic">{driver.vehicleNumber}</span></p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className={`px-2 py-0.5 rounded-md text-[8px] md:text-[9px] font-black uppercase tracking-widest italic ${driver.vehicleType === 'PINK' ? 'bg-pink-500/20 text-pink-400 border border-pink-500/20' : 'bg-[#00D1FF]/20 text-[#00D1FF] border border-[#00D1FF]/20'}`}>Verified Partner</span>
                                        </div>
                                    </div>
                                    <span className="material-symbols-outlined ml-auto md:hidden text-slate-500">expand_less</span>
                                </div>

                                <div className="w-full md:flex-1 grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                                    <div className="bg-white/5 backdrop-blur-md p-5 rounded-3xl border border-white/5 shadow-2xl">
                                        <p className="text-[#00D1FF] text-[9px] font-black uppercase tracking-[0.2em] mb-2 leading-none italic">Mission Status</p>
                                        <div className="flex items-center gap-2">
                                            <span className="size-2 rounded-full bg-green-500 animate-pulse"></span>
                                            <p className="text-lg md:text-2xl font-black uppercase text-white truncate italic tracking-tighter">
                                                {activeRide?.status === RideStatus.ACCEPTED ? 'Arriving' :
                                                    activeRide?.status === RideStatus.ARRIVED ? 'Driver Here' :
                                                        activeRide?.status === RideStatus.STARTED ? 'En Route' :
                                                            activeRide?.status || 'Active'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-white/5 backdrop-blur-md p-5 rounded-3xl border border-white/5 shadow-2xl">
                                        <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] mb-2 leading-none italic">Board Code</p>
                                        <p className="text-xl md:text-3xl font-black tracking-[0.3em] text-white italic">{activeRide?.otp || '----'}</p>
                                    </div>
                                    <div className="bg-white/5 backdrop-blur-md p-5 rounded-3xl border border-white/5 shadow-2xl col-span-2 lg:col-span-1">
                                        <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] mb-2 leading-none italic">
                                            {activeRide?.status === RideStatus.STARTED ? 'Total Fare' : 'Arrival ETA'}
                                        </p>
                                        <p className="text-xl md:text-3xl font-black text-[#00D1FF] italic leading-none">
                                            {activeRide?.status === RideStatus.STARTED ? `₹${activeRide.estimatedFare || '---'}` : `${Math.round(eta)} Mins`}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Info Modal */}
                    {showDetails && (
                        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6" onClick={() => setShowDetails(false)}>
                            <div className="max-w-2xl w-full bg-slate-900 border border-white/10 rounded-[3.5rem] overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                                <div className="h-64 relative">
                                    <img src={driver.vehicleImage || "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2"} className="w-full h-full object-cover" alt="vehicle img" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                                    <button onClick={() => setShowDetails(false)} className="absolute top-6 right-6 size-12 rounded-full bg-black/40 flex items-center justify-center hover:bg-black/60 transition-all">
                                        <span className="material-symbols-outlined">close</span>
                                    </button>
                                </div>
                                <div className="p-10 space-y-8">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h2 className="text-3xl font-black tracking-tighter">{driver.name}</h2>
                                            <p className="text-orange-500 font-bold uppercase text-xs tracking-widest">{driver.vehicleType} • Elite Partner</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black uppercase text-slate-500">Registration</p>
                                            <p className="text-xl font-black">{driver.vehicleNumber}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-6">
                                        <div className="bg-white/5 p-6 rounded-3xl border border-white/5 text-center">
                                            <span className="material-symbols-outlined text-orange-500 mb-2">star</span>
                                            <p className="text-xl font-black">{driver.rating}</p>
                                            <p className="text-[9px] font-black uppercase text-slate-500">Avg Rating</p>
                                        </div>
                                        <div className="bg-white/5 p-6 rounded-3xl border border-white/5 text-center">
                                            <span className="material-symbols-outlined text-teal-400 mb-2">thumb_up</span>
                                            <p className="text-xl font-black">99%</p>
                                            <p className="text-[9px] font-black uppercase text-slate-500">Satisfaction</p>
                                        </div>
                                        <div className="bg-white/5 p-6 rounded-3xl border border-white/5 text-center">
                                            <span className="material-symbols-outlined text-blue-400 mb-2">history</span>
                                            <p className="text-xl font-black">6 Yrs</p>
                                            <p className="text-[9px] font-black uppercase text-slate-500">Partner Since</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Chat Drawer */}
                    {chatOpen && activeRide && (
                        <div className="fixed inset-0 z-[150] flex items-end justify-center md:items-center p-0 md:p-6 bg-black/40 backdrop-blur-sm" onClick={() => setChatOpen(false)}>
                            <div onClick={e => e.stopPropagation()} className="w-full md:w-auto">
                                <Chat
                                    rideId={activeRide.id}
                                    currentUserId={user?.id || ''}
                                    onClose={() => setChatOpen(false)}
                                    recipientName={driver.name}
                                />
                            </div>
                        </div>
                    )}

                    {/* Cancellation Modal */}
                    {showCancelModal && (
                        <div className="fixed inset-0 z-[160] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6">
                            <div className="bg-white text-slate-900 w-full max-w-md rounded-[2.5rem] p-8 animate-in zoom-in-95">
                                <h2 className="text-2xl font-black mb-2">Cancel Ride?</h2>
                                <p className="text-sm text-slate-500 mb-6">Cancellation fee may apply. Please tell us why.</p>

                                <div className="space-y-3 mb-8">
                                    {['Driver asked to cancel', 'Driver is too far away', 'Found another ride', 'Changed my plans', 'Waiting too long'].map(reason => (
                                        <button
                                            key={reason}
                                            onClick={() => setCancelReason(reason)}
                                            className={`w-full p-4 rounded-xl border-2 text-left font-bold text-sm transition-all ${cancelReason === reason ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-100 text-slate-600 hover:border-slate-300'
                                                }`}
                                        >
                                            {reason}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex gap-4">
                                    <button onClick={handleCancel} className="flex-1 h-14 bg-red-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-700">Confirm Cancel</button>
                                    <button onClick={() => setShowCancelModal(false)} className="flex-1 h-14 bg-slate-100 text-slate-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-200">Keep Ride</button>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </>
    );
};

export default LiveTracking;
