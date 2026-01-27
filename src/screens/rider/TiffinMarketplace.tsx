import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { TiffinVendor, User } from '../../types';

interface Props {
    user: User;
}

const MOCK_VENDORS: TiffinVendor[] = [
    {
        id: 'v1',
        name: 'Gopal Tiffins',
        description: 'Traditional home-cooked Maharaja thalis with fresh parathas.',
        rating: 4.8,
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
        location: { lat: 27.4924, lng: 77.6737 },
        pureVeg: true,
        basePrice: 120,
        menus: [

            { id: 'm1', day: 'Monday', items: ['Dal Makhani', 'Paneer Butter Masala', '4 Paratha', 'Rice'] },
            { id: 'm2', day: 'Tuesday', items: ['Mix Veg', 'Rajma', '4 Roti', 'Rice'] }
        ],
        plans: [
            { id: 'p1', name: 'Daily', duration: 'DAILY', price: 120 },
            { id: 'p2', name: 'Weekly Pass', duration: 'WEEKLY', price: 750 },
            { id: 'p3', name: 'Monthly Sub', duration: 'MONTHLY', price: 2800 }
        ]
    },
    {
        id: 'v2',
        name: 'Maa ki Rasoi',
        description: 'Healthy and simple meals just like home. Low oil and spices.',
        rating: 4.9,
        image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0',
        location: { lat: 27.4950, lng: 77.6750 },
        pureVeg: true,
        basePrice: 80,
        menus: [
            { id: 'm3', day: 'Monday', items: ['Yellow Dal', 'Aloo Gobi', '4 Roti', 'Salad'] }
        ],
        plans: [
            { id: 'p4', name: 'Standard', duration: 'DAILY', price: 80 },
            { id: 'p5', name: 'Student Plan', duration: 'WEEKLY', price: 500 }
        ]
    }
];

const TiffinMarketplace: React.FC<Props> = ({ user }) => {
    const navigate = useNavigate();
    const [vendors] = useState<TiffinVendor[]>(MOCK_VENDORS);
    const [selectedVendor, setSelectedVendor] = useState<TiffinVendor | null>(null);
    const [activePlan, setActivePlan] = useState<string | null>(null);

    return (
        <div className="min-h-screen bg-[#0F172A] font-sans pb-20 text-slate-200">
            <header className="bg-[#0A0E12] border-b border-white/5 px-6 py-8 sticky top-0 z-40 shadow-xl">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button onClick={() => navigate(-1)} className="size-12 rounded-2xl bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-all border border-white/5">
                            <span className="material-symbols-outlined font-black">arrow_back</span>
                        </button>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-3">
                                <p className="text-orange-500 text-[10px] font-black uppercase tracking-[0.2em] leading-none italic">Culinary Network</p>
                                <span className="px-3 py-1 bg-[#22c55e]/10 text-[#22c55e] rounded-lg text-[8px] font-black uppercase border border-[#22c55e]/20 tracking-widest italic animate-pulse">Live</span>
                            </div>
                            <h1 className="text-3xl font-black tracking-tighter italic uppercase leading-none text-white mt-1">Tiffin <span className="not-italic text-slate-400">Hub</span></h1>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-12 space-y-12">
                {/* Search & Categories */}
                {/* Search & Categories */}
                <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide px-1">
                    {['All Canteens', 'Pure Veg', 'North Indian', 'Healthy', 'Budget'].map((cat, i) => (
                        <button key={cat} className={`px-6 py-3 rounded-2xl whitespace-nowrap text-[10px] font-black uppercase tracking-widest transition-all ${i === 0 ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20' : 'bg-white/5 text-slate-400 border border-white/5 hover:border-white/20 hover:text-white'}`}>
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Vendor Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {vendors.map(vendor => (
                        <div
                            key={vendor.id}
                            onClick={() => setSelectedVendor(vendor)}
                            className="bg-[#1e293b] rounded-[3rem] overflow-hidden border border-white/5 shadow-2xl group cursor-pointer hover:scale-[1.02] transition-all relative"
                        >
                            <div className="h-56 relative overflow-hidden">
                                <img src={vendor.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 opacity-80 group-hover:opacity-100" alt={vendor.name} />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/20 to-transparent"></div>
                                <div className="absolute top-6 left-6 px-4 py-1.5 bg-black/40 backdrop-blur-md rounded-full text-[9px] font-black text-white uppercase tracking-[0.2em] border border-white/10">
                                    {vendor.pureVeg ? 'Verified Pure Veg' : 'Multi-Kitchen'}
                                </div>
                                <div className="absolute bottom-6 left-8 right-8 flex items-end justify-between">
                                    <div>
                                        <h3 className="text-2xl font-black text-white tracking-tight uppercase italic leading-none mb-1">{vendor.name}</h3>
                                        <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest">Master Chef Rated</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-orange-500 px-3 py-1.5 rounded-xl text-black text-[11px] font-black shadow-lg shadow-orange-500/30">
                                        <span>{vendor.rating}</span>
                                        <span className="material-symbols-outlined text-[14px] filled">star</span>
                                    </div>
                                </div>
                            </div>
                            <div className="p-8">
                                <p className="text-sm text-slate-400 font-medium leading-relaxed mb-8 line-clamp-2 italic">"{vendor.description}"</p>
                                <div className="flex items-center justify-between pt-6 border-t border-white/5">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest leading-none mb-1">Entry Price</span>
                                        <span className="text-2xl font-black text-white italic leading-none">₹{vendor.basePrice}</span>
                                    </div>
                                    <button className="px-8 py-3 bg-white/10 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all shadow-lg italic border border-white/5">Explore Menu</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {/* Vendor Detail Modal */}
            {selectedVendor && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 md:p-6" onClick={() => setSelectedVendor(null)}>
                    <div className="max-w-2xl w-full bg-[#1e293b] rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-white/10" onClick={e => e.stopPropagation()}>
                        <div className="h-72 relative">
                            <img src={selectedVendor.image} className="w-full h-full object-cover" alt="vendor" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#1e293b] via-transparent to-transparent"></div>
                            <button onClick={() => setSelectedVendor(null)} className="absolute top-8 right-8 size-12 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 backdrop-blur-md transition-all border border-white/20 shadow-xl">
                                <span className="material-symbols-outlined font-black">close</span>
                            </button>
                            <div className="absolute bottom-6 left-10">
                                <span className="px-4 py-2 bg-orange-500 text-black rounded-xl text-[9px] font-black uppercase tracking-[0.2em] italic border border-orange-500/20 shadow-lg">Official Partner</span>
                            </div>
                        </div>
                        <div className="px-10 pb-12 pt-4 space-y-10 max-h-[60vh] overflow-y-auto scrollbar-hide">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-4xl font-black tracking-tighter uppercase italic text-white">{selectedVendor.name}</h2>
                                    <p className="text-slate-400 font-bold text-sm tracking-tight mt-1">{selectedVendor.description}</p>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center justify-end gap-2 text-orange-500 mb-1">
                                        <span className="text-2xl font-black italic">{selectedVendor.rating}</span>
                                        <span className="material-symbols-outlined filled text-xl">star</span>
                                    </div>
                                    <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Performance</p>
                                </div>
                            </div>

                            <div className="space-y-4 bg-[#0F172A] p-6 rounded-[2.5rem] border border-white/5">
                                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-4 pl-2">Signature Platter</h4>
                                <div className="flex flex-wrap gap-2">
                                    {selectedVendor.menus[0].items.map((item, i) => (
                                        <span key={i} className="px-5 py-2 bg-white/5 rounded-2xl text-[10px] font-black text-slate-300 border border-white/5 uppercase tracking-tighter shadow-sm">{item}</span>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] pl-2 italic">Select Subscription Tier</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {selectedVendor.plans.map(plan => (
                                        <button
                                            key={plan.id}
                                            onClick={() => setActivePlan(plan.id)}
                                            className={`p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-2 group ${activePlan === plan.id
                                                ? 'border-orange-500 bg-orange-500/10 shadow-xl shadow-orange-500/10 text-orange-500'
                                                : 'border-white/5 hover:border-white/10 bg-white/5 text-slate-400 hover:text-white'}`}
                                        >
                                            <span className="text-[9px] font-black uppercase text-inherit tracking-widest">{plan.name}</span>
                                            <span className="text-2xl font-black italic">₹{plan.price}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                disabled={!activePlan}
                                className="w-full h-18 bg-[#22c55e] text-black rounded-[2.5rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:bg-[#1e293b] disabled:text-slate-500 disabled:border disabled:border-white/5 mt-6 h-16 flex items-center justify-center gap-4 italic"
                            >
                                {activePlan ? (<>Confirm Subscription <span className="material-symbols-outlined font-black">arrow_forward</span></>) : 'Select A Plan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TiffinMarketplace;
