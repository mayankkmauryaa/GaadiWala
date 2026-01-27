import React, { useState } from 'react';

const DISTRICTS = [
    { id: 'd1', name: 'Krishna Nagar', icon: 'temple_hindu' },
    { id: 'd2', name: 'Tech Park', icon: 'business_center' },
    { id: 'd3', name: 'Railway Colony', icon: 'train' },
    { id: 'd4', name: 'Vrindavan Central', icon: 'park' },
    { id: 'd5', name: 'Highway Zone', icon: 'door_sliding' },
];

const DistrictPicker: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div className="mt-4 mb-4">
            <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-[8px] font-black uppercase text-slate-500 tracking-[0.2em] italic leading-none pl-1">Popular Districts</h3>
                <button
                    onClick={() => setIsVisible(!isVisible)}
                    className={`text-[8px] font-black uppercase tracking-widest transition-all ${isVisible ? 'text-[#22c55e]' : 'text-slate-600'}`}
                >
                    {isVisible ? 'Hide' : 'Show'}
                </button>
            </div>

            {isVisible && (
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-1 snap-x animate-in fade-in slide-in-from-top-1 duration-300">
                    {DISTRICTS.map(d => (
                        <div key={d.id} className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/5 rounded-xl min-w-max hover:border-[#22c55e]/30 hover:bg-[#22c55e]/10 active:scale-95 transition-all group cursor-pointer shadow-sm snap-center magnetic-btn backdrop-blur-md">
                            <span className="material-symbols-outlined text-xs text-slate-500 group-hover:text-[#22c55e] transition-colors">{d.icon}</span>
                            <span className="text-[8px] font-bold uppercase tracking-tight text-slate-400 italic group-hover:text-white">{d.name}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DistrictPicker;
