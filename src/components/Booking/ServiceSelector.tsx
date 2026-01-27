import React from 'react';
import { VehicleCategory, User } from '../../types';
import { calculateFare } from '../../services/pricing';

interface ServiceSelectorProps {
    distanceKm: number;
    durationMins: number;
    user: User;
    selectedCategory: VehicleCategory | null;
    onSelect: (category: VehicleCategory) => void;
}

const CATEGORIES = [
    { id: VehicleCategory.BIKE, label: 'Bike', icon: 'motorcycle' },
    { id: VehicleCategory.AUTO, label: 'Auto', icon: 'electric_rickshaw' },
    { id: VehicleCategory.MINI, label: 'Mini', icon: 'directions_car' },
    { id: VehicleCategory.PRIME, label: 'Prime', icon: 'local_taxi' },
    { id: VehicleCategory.PINK, label: 'Pink Cab', icon: 'female', description: 'Women drivers for safety' },
];

const ServiceSelector: React.FC<ServiceSelectorProps> = ({
    distanceKm,
    durationMins,
    user,
    selectedCategory,
    onSelect
}) => {

    const renderOption = (cat: typeof CATEGORIES[0]) => {
        if (cat.id === VehicleCategory.PINK && user.gender !== 'FEMALE' && user.role !== 'ADMIN') {
            return null;
        }

        const pricing = calculateFare(distanceKm, durationMins, cat.id, user);
        const isSelected = selectedCategory === cat.id;
        const isPink = cat.id === VehicleCategory.PINK;

        return (
            <button
                key={cat.id}
                className={`w-full flex items-center gap-4 p-4 rounded-[2rem] border-2 transition-all group relative overflow-hidden mb-3 ${isSelected
                    ? (isPink ? 'border-pink-500 bg-pink-50/50 shadow-lg shadow-pink-500/10' : 'border-[#00D1FF] bg-[#00D1FF]/5 shadow-lg shadow-[#00D1FF]/10')
                    : 'border-slate-50 bg-white hover:border-slate-200'}`}
                onClick={() => onSelect(cat.id)}
            >
                <div className={`size-12 rounded-2xl flex items-center justify-center transition-all duration-500 font-black ${isSelected
                    ? (isPink ? 'bg-pink-500 text-white rotate-6 scale-110' : 'bg-[#00D1FF] text-black -rotate-6 scale-110')
                    : 'bg-slate-100 text-slate-400'}`}>
                    <span className="material-symbols-outlined text-2xl font-black">{cat.icon}</span>
                </div>
                <div className="flex-1 text-left">
                    <div className="flex justify-between items-center mb-0.5">
                        <span className="text-sm font-black tracking-tight uppercase italic">{cat.label}</span>
                        <span className="text-base font-black italic">₹{Math.round(pricing.total)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`text-[9px] font-black uppercase tracking-widest ${isSelected ? (isPink ? 'text-pink-600' : 'text-[#00D1FF]') : 'text-slate-400'}`}>
                            {Math.round(durationMins)} mins ETA
                        </span>
                        {pricing.discounts.length > 0 && (
                            <span className="text-[7px] bg-green-500/10 text-green-600 px-1.5 py-0.5 rounded-md font-black italic">DISCOUNTED</span>
                        )}
                    </div>
                </div>
                {isSelected && (
                    <div className={`absolute top-0 right-0 p-1 px-3 rounded-bl-xl ${isPink ? 'bg-pink-500' : 'bg-[#00D1FF]'} text-black shadow-sm`}>
                        <span className="text-[7px] font-black uppercase tracking-widest">Selected</span>
                    </div>
                )}
            </button>
        );
    };

    return (
        <div className="mt-4">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-6 pl-2 italic">Select Fleet Protocol</h3>
            <div className="space-y-1">
                {CATEGORIES.map(renderOption)}
            </div>
        </div>
    );
};

export default ServiceSelector;
