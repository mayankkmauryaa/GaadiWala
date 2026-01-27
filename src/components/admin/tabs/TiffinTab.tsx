import React, { useRef } from 'react';
import { TiffinVendor, TiffinOrder } from '../../../types';
import ScrollHint from '../../shared/ScrollHint';

interface TiffinTabProps {
    tiffinVendors: TiffinVendor[];
    tiffinOrders: TiffinOrder[];
    handleTiffinVendorAction: (vendorId: string, updates: any) => void;
    handleTiffinOrderAction: (orderId: string, status: string) => void;
}

const TiffinTab: React.FC<TiffinTabProps> = ({
    tiffinVendors,
    tiffinOrders,
    handleTiffinVendorAction,
    handleTiffinOrderAction
}) => {
    const vendorsScrollRef = useRef<HTMLDivElement>(null);
    const ordersScrollRef = useRef<HTMLDivElement>(null);

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                {/* Partners List */}
                <div className="xl:col-span-5 bg-[#161B22] border border-white/5 rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-10 shadow-2xl relative overflow-hidden flex flex-col">
                    <div className="absolute top-0 right-0 p-10 opacity-[0.03] scale-150 rotate-12 pointer-events-none"><span className="material-symbols-outlined text-9xl">inventory_2</span></div>
                    <div className="flex items-center justify-between mb-10">
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-orange-500 flex items-center gap-3 italic">
                            <span className="size-2 bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.4)]"></span>
                            Production Partners
                        </h3>
                    </div>

                    <div
                        ref={vendorsScrollRef}
                        className="space-y-6 flex-1 max-h-[60dvh] xl:max-h-[700px] overflow-y-auto pr-4 relative"
                    >
                        <ScrollHint containerRef={vendorsScrollRef} />
                        {tiffinVendors.map(v => (
                            <div key={v.id} className="p-4 sm:p-6 bg-white/[0.03] rounded-[2rem] sm:rounded-[2.5rem] border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6 group hover:bg-white/[0.05] transition-all duration-500">
                                <div className="flex items-center gap-6">
                                    <div className="size-16 rounded-2xl overflow-hidden border-2 border-white/10 shadow-xl group-hover:scale-110 transition-transform">
                                        <img src={v.image} className="w-full h-full object-cover" alt="vendor" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-xl leading-none text-white mb-2 italic tracking-tighter uppercase">{v.name}</h4>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{v.pureVeg ? 'Verified Pure Veg' : 'Mixed Kitchen'}</span>
                                            <div className="size-1 rounded-full bg-slate-700"></div>
                                            <span className={`text-[10px] font-black uppercase italic ${v.isSuspended ? 'text-red-500' : 'text-orange-500'}`}>
                                                {v.isSuspended ? 'Suspended' : `₹${v.basePrice}/Entry`}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleTiffinVendorAction(v.id, { isSuspended: !v.isSuspended })}
                                    className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all italic ${v.isSuspended ? 'bg-orange-500 text-white shadow-lg' : 'bg-white/5 text-slate-400 hover:bg-white hover:text-black hover:shadow-xl'}`}
                                >
                                    {v.isSuspended ? 'Activate' : 'Suspend'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Logistics Feed */}
                <div className="xl:col-span-7 bg-[#161B22] border border-white/5 rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-10 shadow-2xl flex flex-col">
                    <div className="flex items-center justify-between mb-10">
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#00D1FF] flex items-center gap-3 italic">
                            <span className="size-2 bg-[#00D1FF] rounded-full shadow-[0_0_10px_rgba(0,209,255,0.4)]"></span>
                            Supply Chain Feed
                        </h3>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">{tiffinOrders.length} Logs Available</span>
                    </div>

                    <div
                        ref={ordersScrollRef}
                        className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 max-h-[700px] overflow-y-auto pr-4 relative"
                    >
                        <ScrollHint containerRef={ordersScrollRef} />
                        {tiffinOrders.length > 0 ? tiffinOrders.map(o => (
                            <div key={o.id} className="p-8 bg-gradient-to-br from-white/[0.04] to-transparent rounded-[2.5rem] border border-white/5 relative group hover:border-[#00D1FF]/30 transition-all duration-500">
                                <div className="flex justify-between items-start mb-8">
                                    <div className="flex-1 min-w-0 pr-4">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1 italic leading-none truncate">{o.vendorName}</p>
                                        <p className="text-lg font-black text-white italic tracking-tighter uppercase leading-tight">Master Subscription</p>
                                    </div>
                                    <select
                                        value={o.status}
                                        onChange={(e) => handleTiffinOrderAction(o.id, e.target.value)}
                                        className={`text-[9px] font-black uppercase px-5 py-2 rounded-xl border bg-transparent outline-none cursor-pointer transition-all ${o.status === 'PENDING' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.1)]' :
                                            o.status === 'PICKED' ? 'bg-[#00D1FF]/10 text-[#00D1FF] border-[#00D1FF]/20 shadow-[0_0_10px_rgba(0,209,255,0.1)]' :
                                                'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                            }`}
                                    >
                                        <option value="PENDING" className="bg-[#161B22] font-black">Hold: Pending</option>
                                        <option value="PICKED" className="bg-[#161B22] font-black">Live: Picked</option>
                                        <option value="DELIVERED" className="bg-[#161B22] font-black">Terminal: Delivered</option>
                                    </select>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 text-[10px] text-slate-300 font-bold italic">
                                        <span className="material-symbols-outlined text-[16px] text-[#00D1FF]">location_on</span>
                                        <p className="truncate">{o.deliveryAddress}</p>
                                    </div>
                                    <div className="flex items-center justify-between pt-6 border-t border-white/[0.03]">
                                        <span className="text-[8px] font-black uppercase text-slate-600 tracking-widest italic">Consignment Yield</span>
                                        <span className="text-xl font-black text-white italic">₹{o.price}</span>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="md:col-span-2 py-32 text-center bg-white/[0.01] rounded-[3rem] border-2 border-dashed border-white/5">
                                <span className="material-symbols-outlined text-4xl text-slate-700 mb-6 animate-pulse">fastfood</span>
                                <p className="text-[11px] font-black uppercase text-slate-600 tracking-[0.4em]">Inventory Level: Zero Active Logs</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TiffinTab;
