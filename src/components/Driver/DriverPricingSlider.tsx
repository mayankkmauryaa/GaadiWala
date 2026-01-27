import React, { useState } from 'react';

interface Props {
    cityBase: number;
    currentBase: number;
    onUpdate: (val: number) => void;
}

const DriverPricingSlider: React.FC<Props> = ({ cityBase, currentBase, onUpdate }) => {
    const min = cityBase * 0.8;
    const max = cityBase * 1.2;
    const [val, setVal] = useState(currentBase);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = parseFloat(e.target.value);
        setVal(newValue);
        onUpdate(newValue);
    };

    return (
        <div className="bg-[#161B22] p-8 rounded-[3rem] border border-white/5 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-1">Base Fare Choice</h4>
                    <p className="text-[9px] text-slate-400 font-medium italic">Adjust within ±20%</p>
                </div>
                <div className="bg-orange-500 text-white px-4 py-2 rounded-2xl font-black italic shadow-lg shadow-orange-500/20">
                    ₹{val.toFixed(0)}
                </div>
            </div>

            <div className="space-y-3">
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={1}
                    value={val}
                    onChange={handleChange}
                    className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-orange-500 hover:accent-orange-400 transition-all"
                />
                <div className="flex justify-between text-[10px] font-black text-slate-600 uppercase tracking-tighter px-1">
                    <span>Min: ₹{min.toFixed(0)}</span>
                    <span>Max: ₹{max.toFixed(0)}</span>
                </div>
            </div>

            <div className="bg-white/2 p-4 rounded-2xl border border-white/5">
                <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                    Market standard is <span className="text-white">₹{cityBase}</span>. Higher base fares might reduce ride requests during low demand.
                </p>
            </div>
        </div>
    );
};

export default DriverPricingSlider;
