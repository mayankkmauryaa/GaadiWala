import React, { useState } from 'react';
import { User, VehicleCategory } from '../../types';
import ServiceSelector from './ServiceSelector';

interface RideRequestProps {
    user: User;
    onBook?: (details: any) => void;
}

const RideRequest: React.FC<RideRequestProps> = ({ user, onBook }) => {
    const [pickup, setPickup] = useState('');
    const [drop, setDrop] = useState('');
    const [step, setStep] = useState<'INPUT' | 'SELECT'>('INPUT');
    const [selectedCategory, setSelectedCategory] = useState<VehicleCategory | null>(null);

    const [distance] = useState(5.2);
    const [duration] = useState(15);

    const handleSearch = () => {
        if (!pickup || !drop) return;
        setStep('SELECT');
    };

    const handleBook = () => {
        if (!selectedCategory) return;
        if (onBook) {
            onBook({
                category: selectedCategory,
                pickup,
                drop,
                distance,
                duration
            });
        }
    };

    return (
        <div className="w-full bg-white rounded-[3rem] p-8 shadow-2xl border border-slate-100">
            {step === 'INPUT' && (
                <div className="space-y-6">
                    <div className="flex flex-col">
                        <p className="text-[#00D1FF] text-[10px] font-black uppercase tracking-[0.2em] mb-1 leading-none italic">Route Planner</p>
                        <h2 className="text-3xl font-black tracking-tighter italic uppercase mb-8">Set Your <span className="not-italic text-slate-400">Path</span></h2>
                    </div>

                    <div className="space-y-4">
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-teal-500">radio_button_checked</span>
                            <input
                                type="text"
                                placeholder="Pickup Location"
                                value={pickup}
                                onChange={e => setPickup(e.target.value)}
                                className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 text-sm font-bold focus:border-teal-500 focus:bg-white transition-all outline-none"
                            />
                        </div>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-orange-500">location_on</span>
                            <input
                                type="text"
                                placeholder="Where to?"
                                value={drop}
                                onChange={e => setDrop(e.target.value)}
                                className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 text-sm font-bold focus:border-orange-500 focus:bg-white transition-all outline-none"
                            />
                        </div>
                    </div>

                    <button
                        className="w-full h-16 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-4 group disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed italic"
                        disabled={!pickup || !drop}
                        onClick={handleSearch}
                    >
                        Scan Fleets
                        <span className="material-symbols-outlined group-hover:translate-x-2 transition-transform font-black">arrow_forward</span>
                    </button>
                    <p className="text-center text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-4 italic">Protocol: Secure Encryption Enabled</p>
                </div>
            )}

            {step === 'SELECT' && (
                <div className="animate-in slide-in-from-right duration-500">
                    <button
                        onClick={() => setStep('INPUT')}
                        className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 mb-8 transition-colors italic"
                    >
                        <span className="material-symbols-outlined text-sm">arrow_back</span> Back to Entry
                    </button>

                    <ServiceSelector
                        distanceKm={distance}
                        durationMins={duration}
                        user={user}
                        selectedCategory={selectedCategory}
                        onSelect={setSelectedCategory}
                    />

                    <div className="mt-10">
                        <button
                            className={`w-full h-16 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-4 italic ${selectedCategory === 'PINK' ? 'bg-pink-600 text-white' : 'bg-slate-900 text-white'} disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed`}
                            disabled={!selectedCategory}
                            onClick={handleBook}
                        >
                            {selectedCategory === 'PINK' ? 'COMMENCE PINK OPS' : 'INITIATE RIDE'}
                            <span className="material-symbols-outlined font-black">rocket_launch</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RideRequest;
