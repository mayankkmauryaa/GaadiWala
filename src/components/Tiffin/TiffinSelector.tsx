import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const VENDORS = [
    {
        id: 'v1',
        name: 'Gopal Tiffins',
        plate: 'Maharaja Thali',
        price: 120,
        rating: 4.8,
        image: '/assets/tiffins/maharaja_thali.png'
    },
    {
        id: 'v2',
        name: 'Maa ki Rasoi',
        plate: 'Simple Dal-Roti',
        price: 80,
        rating: 4.9,
        image: '/assets/tiffins/dal_roti.png'
    },
    {
        id: 'v3',
        name: 'Shyam Bhojnalay',
        plate: 'Special Thali',
        price: 150,
        rating: 4.7,
        image: '/assets/tiffins/special_thali.png'
    },
];

const TiffinSelector: React.FC = () => {
    const navigate = useNavigate();
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div className="mt-4 mb-8">
            <div className="flex justify-between items-center mb-3 px-1">
                <div className="flex items-center gap-2">
                    <h3 className="text-[8px] font-black uppercase text-slate-500 tracking-[0.2em] italic leading-none pl-1">Fresh Tiffins</h3>
                    <button
                        onClick={() => setIsVisible(!isVisible)}
                        className={`size-5 rounded flex items-center justify-center transition-all ${isVisible ? 'bg-[#22c55e] text-black shadow-lg shadow-[#22c55e]/20' : 'bg-white/10 text-slate-500'}`}
                    >
                        <span className="material-symbols-outlined text-xs font-black">{isVisible ? 'remove' : 'add'}</span>
                    </button>
                </div>
                {isVisible && (
                    <span
                        onClick={() => navigate('/user/tiffin')}
                        className="text-[7px] font-black text-[#22c55e] uppercase tracking-widest cursor-pointer hover:underline italic"
                    >
                        View All
                    </span>
                )}
            </div>

            {isVisible && (
                <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide px-1 snap-x animate-in fade-in slide-in-from-top-1 duration-300">
                    {VENDORS.map(v => (
                        <div
                            key={v.id}
                            onClick={() => navigate('/user/tiffin')}
                            className="min-w-[200px] bg-white/5 rounded-2xl border border-white/5 shadow-sm hover:shadow-xl hover:shadow-[#22c55e]/10 hover:border-[#22c55e]/30 active:scale-[0.98] transition-all group relative overflow-hidden cursor-pointer snap-start backdrop-blur-md"
                        >
                            <div className="h-24 relative overflow-hidden">
                                <img
                                    src={v.image}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale-[0.5] group-hover:grayscale-0 opacity-80 group-hover:opacity-100"
                                    alt={v.name}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0E12] via-transparent to-transparent"></div>
                                <div className="absolute bottom-2 left-3 right-3">
                                    <h4 className="text-xs font-black text-white italic tracking-tight leading-none mb-0.5 truncate">{v.name}</h4>
                                    <p className="text-[6px] text-white/60 font-bold uppercase tracking-widest leading-none truncate">{v.plate}</p>
                                </div>
                            </div>

                            <div className="p-3">
                                <div className="flex justify-between items-end">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic leading-none mb-0.5">Per Meal</span>
                                        <span className="text-base font-black text-white italic tracking-tighter leading-none">₹{v.price}</span>
                                    </div>
                                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-white/5 rounded border border-white/10">
                                        <span className="material-symbols-outlined text-[9px] filled text-orange-400">star</span>
                                        <span className="text-[8px] font-black text-slate-400">{v.rating}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TiffinSelector;
