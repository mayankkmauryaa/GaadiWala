import { PromoCode } from '../../../types';
import ScrollHint from '../../shared/ScrollHint';
import { useRef } from 'react';

interface PromotionTabProps {
    promoCodes: PromoCode[];
    handleCreatePromo: (e: React.FormEvent<HTMLFormElement>) => void;
    handleDeactivatePromo: (id: string) => void;
}

const PromotionsTab: React.FC<PromotionTabProps> = ({
    promoCodes,
    handleCreatePromo,
    handleDeactivatePromo
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    return (
        <div
            ref={scrollRef}
            className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 relative"
        >
            <ScrollHint containerRef={scrollRef} />
            <div className="bg-[#161B22] border border-white/5 rounded-[3.5rem] p-10 md:p-14 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-14 opacity-[0.03] scale-150 rotate-12 pointer-events-none text-orange-500"><span className="material-symbols-outlined text-9xl">sell</span></div>
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-orange-500 mb-10 flex items-center gap-3 italic">
                    <span className="size-2 bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.4)]"></span>
                    Campaign Forge
                </h3>

                <form onSubmit={handleCreatePromo} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end relative z-10">
                    <div className="md:col-span-5">
                        <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block italic tracking-widest pl-2">Protocol Identification (Code)</label>
                        <input
                            name="code"
                            type="text"
                            placeholder="OPERATIONS_50"
                            className="w-full bg-white/[0.03] border border-white/10 px-6 py-4 rounded-[1.5rem] text-white font-black italic tracking-tight outline-none focus:border-orange-500 focus:bg-white/[0.05] transition-all"
                            required
                        />
                    </div>
                    <div className="md:col-span-4">
                        <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block italic tracking-widest pl-2">Yield Reduction (%)</label>
                        <input
                            name="value"
                            type="number"
                            placeholder="50"
                            max="100"
                            className="w-full bg-white/[0.03] border border-white/10 px-6 py-4 rounded-[1.5rem] text-white font-black italic tracking-tight outline-none focus:border-orange-500 focus:bg-white/[0.05] transition-all"
                            required
                        />
                    </div>
                    <div className="md:col-span-3">
                        <button type="submit" className="w-full h-16 bg-white text-black font-black uppercase text-[10px] tracking-[0.3em] rounded-[1.5rem] hover:bg-slate-200 transition-all shadow-xl active:scale-95 italic">Generate Protocol</button>
                    </div>
                </form>
            </div>

            <div className="bg-[#161B22] border border-white/5 rounded-[3.5rem] p-10 md:p-14 shadow-2xl">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#00D1FF] mb-10 flex items-center gap-3 italic">
                    <span className="size-2 bg-[#00D1FF] rounded-full shadow-[0_0_10px_rgba(0,209,255,0.4)]"></span>
                    Active Campaigns
                </h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {promoCodes.map(promo => (
                        <div key={promo.id} className="group relative p-8 bg-gradient-to-br from-white/[0.04] to-transparent border border-white/5 rounded-[2.5rem] hover:border-[#00D1FF]/30 transition-all duration-500">
                            <div className="flex items-center justify-between mb-8">
                                <div className="space-y-1">
                                    <h4 className="text-2xl font-black text-white italic tracking-tighter uppercase leading-none">{promo.code}</h4>
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Campaign Vector Code</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-3xl font-black text-[#00D1FF] italic leading-none">{promo.discountType === 'PERCENTAGE' ? `${promo.value}%` : `₹${promo.value}`}</p>
                                    <p className="text-[9px] font-black text-[#00D1FF] uppercase tracking-widest mt-1 opacity-70">OFF</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-8 border-t border-white/[0.03]">
                                <div className="space-y-1.5 min-w-0">
                                    <p className="text-[10px] text-slate-400 font-bold tracking-tighter italic truncate">
                                        Exp: <span className="text-white">{new Date(promo.expiry).toLocaleDateString()}</span> • Used: <span className="text-white">{promo.usedCount}/{promo.usageLimit}</span>
                                    </p>
                                    <div className="h-1 w-32 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-orange-500" style={{ width: `${(promo.usedCount / promo.usageLimit) * 100}%` }}></div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDeactivatePromo(promo.id)}
                                    className="px-5 py-2 bg-red-500/10 text-red-500 text-[9px] font-black uppercase rounded-lg border border-red-500/20 hover:bg-red-500 hover:text-white transition-all italic"
                                >
                                    Terminate
                                </button>
                            </div>
                        </div>
                    ))}
                    {promoCodes.length === 0 && (
                        <div className="lg:col-span-2 py-24 text-center border-2 border-dashed border-white/5 rounded-[2.5rem]">
                            <span className="material-symbols-outlined text-4xl text-slate-700 mb-4">no_accounts</span>
                            <p className="text-[10px] font-black uppercase text-slate-600 tracking-[0.2em]">Zero Active Marketing Vectors Detected</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PromotionsTab;
