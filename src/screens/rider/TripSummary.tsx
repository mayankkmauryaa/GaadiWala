
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useRide } from '../../hooks/useRide';
import { useRef } from 'react';
import ScrollHint from '../../components/shared/ScrollHint';

const TripSummary: React.FC = () => {
    const { state } = useLocation();
    const navigate = useNavigate();
    const { activeRide } = useRide();
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const mainScrollRef = useRef<HTMLDivElement>(null);
    const { submitRating } = useRide();

    const ride = activeRide || state?.ride;
    const driver = ride?.driverDetails || state?.driver;

    if (!ride) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-50">
                <button onClick={() => navigate('/user/home')} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold">Go Home</button>
            </div>
        );
    }

    const handleSubmit = async () => {
        if (!ride || !ride.driverId) return;
        setSubmitting(true);
        try {
            await submitRating(ride.id, ride.driverId, rating, comment);
            setSubmitted(true);
            setTimeout(() => navigate('/user/home'), 2000);
        } catch (err) {
            console.error(err);
            alert("Failed to submit feedback. Returning home.");
            navigate('/user/home');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            ref={mainScrollRef}
            className="h-dvh bg-[#0F172A] text-slate-200 font-sans flex flex-col pb-safe overflow-y-auto relative"
        >
            <ScrollHint containerRef={mainScrollRef} />
            <header className="p-8 flex justify-between items-center bg-[#0A0E12] border-b border-white/5">
                <h2 className="text-2xl font-black italic text-white">Gaadiwala <span className="text-orange-500 not-italic">Summary</span></h2>
                <button onClick={() => navigate('/user/home')} className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white">Close</button>
            </header>

            <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
                <div className="w-full max-w-xl bg-[#1e293b] rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl border border-white/5 overflow-hidden animate-in zoom-in-95 duration-500">
                    <div className="bg-[#0A0E12] p-10 text-white text-center border-b border-white/5">
                        <div className="size-20 bg-[#22c55e] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#22c55e]/20">
                            <span className="material-symbols-outlined text-black text-4xl font-bold">check_circle</span>
                        </div>
                        <h3 className="text-3xl font-black tracking-tighter mb-2">Trip Completed</h3>
                        <p className="text-slate-400 text-sm font-medium">Hope you had a comfortable ride with {driver?.name}</p>
                    </div>

                    <div className="p-10 space-y-10">
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Total Fare Paid</p>
                                <p className="text-5xl font-black text-white">₹{ride.estimatedFare}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Payment Method</p>
                                <p className="text-sm font-black bg-white/5 px-4 py-2 rounded-xl border border-white/5 text-slate-300">{ride.paymentMethod || 'UPI'}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex gap-4 items-center">
                                <div className="size-2 rounded-full bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.5)]"></div>
                                <p className="text-xs font-bold text-slate-300 truncate">{ride.pickupAddress}</p>
                            </div>
                            <div className="flex gap-4 items-center">
                                <div className="size-2 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]"></div>
                                <p className="text-xs font-bold text-slate-300 truncate">{ride.dropAddress}</p>
                            </div>
                        </div>

                        {!submitted ? (
                            <div className="pt-10 border-t border-white/5 space-y-6">
                                <p className="text-center text-xs font-black uppercase tracking-widest text-slate-500">Rate your partner</p>
                                <div className="flex justify-center gap-4">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button key={star} onClick={() => setRating(star)} className={`size-12 rounded-2xl flex items-center justify-center transition-all ${rating >= star ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20' : 'bg-white/5 text-slate-600 hover:bg-white/10'}`}>
                                            <span className="material-symbols-outlined filled">star</span>
                                        </button>
                                    ))}
                                </div>
                                <textarea placeholder="Add a comment (optional)..." value={comment} onChange={e => setComment(e.target.value)} className="w-full p-6 bg-[#0A0E12] rounded-3xl border border-white/5 font-bold text-sm text-white focus:ring-2 focus:ring-orange-500/50 transition-all min-h-[100px] outline-none placeholder:text-slate-600" />
                                <button onClick={handleSubmit} disabled={rating === 0 || submitting} className="w-full h-16 bg-[#22c55e] text-black rounded-[2rem] font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:bg-white/10 disabled:text-slate-500 disabled:border disabled:border-white/5 shadow-lg shadow-[#22c55e]/20">
                                    {submitting ? 'Submitting...' : 'Submit Feedback'}
                                </button>
                            </div>
                        ) : (
                            <div className="pt-10 border-t border-white/5 text-center space-y-4 animate-in fade-in zoom-in">
                                <span className="material-symbols-outlined text-orange-500 text-5xl">volunteer_activism</span>
                                <p className="text-xl font-black text-white">Thank you for your feedback!</p>
                                <p className="text-slate-500 text-xs font-bold">Redirecting you to home...</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default TripSummary;
