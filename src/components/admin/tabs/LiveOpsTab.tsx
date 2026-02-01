import React from 'react';
import { RideRequest } from '../../../types';

interface LiveOpsProps {
    activeRides: RideRequest[];
}

const LiveOpsTab: React.FC<LiveOpsProps> = ({ activeRides }) => {
    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto max-h-[calc(100vh-12rem)] pb-6">            <div className="bg-[#161B22] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl relative">
            <div className="p-8 border-b border-white/5 bg-slate-900/50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="size-3 bg-teal-500 rounded-full animate-ping"></div>
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Global Protocol Monitor</h3>
                </div>
                <span className="text-[10px] font-black text-teal-400 uppercase tracking-widest italic">{activeRides.length} Protocols Running</span>
            </div>

            <div className="overflow-x-auto hidden lg:block">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-white/5 text-[10px] font-black uppercase text-slate-600 tracking-widest italic bg-slate-900/40">
                            <th className="px-10 py-6">Fleet Tier</th>
                            <th className="px-10 py-6">Interaction Nodes</th>
                            <th className="px-10 py-6">Operational Corridor</th>
                            <th className="px-10 py-6">Phase Status</th>
                            <th className="px-10 py-6 text-right">Safety Intel</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                        {activeRides.length > 0 ? activeRides.map(ride => (
                            <tr key={ride.id} className="group hover:bg-white/[0.01] transition-all">
                                <td className="px-10 py-8">
                                    <div className="flex items-center gap-4">
                                        <div className={`size-12 rounded-2xl flex items-center justify-center border-2 transition-all group-hover:scale-110 ${ride.vehicleType === 'PINK' ? 'bg-pink-500/10 text-pink-500 border-pink-500/20' : 'bg-[#00D1FF]/5 text-[#00D1FF]/60 border-[#00D1FF]/20'}`}>
                                            <span className="material-symbols-outlined text-2xl font-black">{ride.vehicleType === 'PINK' ? 'female' : 'directions_car'}</span>
                                        </div>
                                        <span className={`text-[11px] font-black uppercase tracking-[0.2em] italic ${ride.vehicleType === 'PINK' ? 'text-pink-500' : 'text-slate-400'}`}>
                                            Tier_{ride.vehicleType}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-10 py-8">
                                    <p className="text-base font-black text-white italic leading-none mb-2 tracking-tight uppercase">{ride.riderName}</p>
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[12px] text-slate-600 font-black">electric_rickshaw</span>
                                        <p className="text-[9px] text-[#00D1FF] font-black uppercase tracking-widest opacity-60 leading-none">{ride.driverName || 'ACQUIRING_PARTNER...'}</p>
                                    </div>
                                </td>
                                <td className="px-10 py-8">
                                    <div className="flex flex-col gap-2 max-w-xs">
                                        <div className="flex items-center gap-3">
                                            <span className="size-1.5 rounded-full bg-emerald-500"></span>
                                            <span className="text-[10px] font-black text-white/50 uppercase tracking-tighter truncate">{ride.pickupAddress.split(',')[0]}</span>
                                        </div>
                                        <div className="ml-[3px] h-4 w-px border-l-2 border-dotted border-white/10"></div>
                                        <div className="flex items-center gap-3">
                                            <span className="size-1.5 rounded-full bg-orange-500"></span>
                                            <span className="text-[10px] font-black text-white/50 uppercase tracking-tighter truncate">{ride.dropAddress.split(',')[0]}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-10 py-8">
                                    <div className="relative inline-block group/btn">
                                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-5 py-2 rounded-xl border italic shadow-lg ${ride.status === 'STARTED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' :
                                            ride.status === 'ACCEPTED' ? 'bg-[#00D1FF]/10 text-[#00D1FF] border-[#00D1FF]/30' :
                                                'bg-white/5 text-slate-500 border-white/10'
                                            }`}>
                                            {ride.status}
                                        </span>
                                        {ride.status === 'STARTED' && (
                                            <div className="absolute -top-1 -right-1 size-3 bg-emerald-500 rounded-full animate-ping opacity-75"></div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-10 py-8 text-right">
                                    <div className="flex items-center justify-end gap-3 text-emerald-500/60 font-black italic group-hover:text-emerald-500 transition-colors">
                                        <div className="flex gap-1">
                                            {[1, 2, 3].map(i => <div key={i} className="size-1 rounded-full bg-emerald-500 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}></div>)}
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Live Tracking</span>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={5} className="py-32 text-center">
                                    <div className="flex flex-col items-center gap-6">
                                        <div className="size-20 bg-white/5 rounded-[2rem] flex items-center justify-center text-slate-700 animate-pulse">
                                            <span className="material-symbols-outlined text-5xl">radar</span>
                                        </div>
                                        <p className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-700">Awaiting Service Lifecycle Activity</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card List */}
            <div className="lg:hidden divide-y divide-white/[0.03]">
                {activeRides.length > 0 ? activeRides.map(ride => (
                    <div key={ride.id} className="p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`size-10 rounded-xl flex items-center justify-center border ${ride.vehicleType === 'PINK' ? 'bg-pink-500/10 text-pink-500 border-pink-500/20' : 'bg-[#00D1FF]/5 text-[#00D1FF] border-[#00D1FF]/20'}`}>
                                    <span className="material-symbols-outlined text-xl">{ride.vehicleType === 'PINK' ? 'female' : 'directions_car'}</span>
                                </div>
                                <div>
                                    <p className="text-sm font-black text-white italic">{ride.riderName}</p>
                                    <p className="text-[8px] text-[#00D1FF] font-black uppercase tracking-widest">{ride.driverName || 'ACQUIRING...'}</p>
                                </div>
                            </div>
                            <span className={`text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border ${ride.status === 'STARTED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'bg-[#00D1FF]/10 text-[#00D1FF] border-[#00D1FF]/30'}`}>
                                {ride.status}
                            </span>
                        </div>

                        <div className="space-y-3 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                            <div className="flex items-center gap-3">
                                <span className="size-1.5 rounded-full bg-emerald-500"></span>
                                <span className="text-[9px] font-black text-white/70 uppercase tracking-tighter truncate">{ride.pickupAddress.split(',')[0]}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="size-1.5 rounded-full bg-orange-500"></span>
                                <span className="text-[9px] font-black text-white/70 uppercase tracking-tighter truncate">{ride.dropAddress.split(',')[0]}</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 text-emerald-500/60">
                            <div className="flex gap-1">
                                {[1, 2, 3].map(i => <div key={i} className="size-1 rounded-full bg-emerald-500 animate-pulse"></div>)}
                            </div>
                            <span className="text-[8px] font-black uppercase">Live Tracking</span>
                        </div>
                    </div>
                )) : (
                    <div className="py-20 text-center">
                        <span className="material-symbols-outlined text-4xl text-slate-700 mb-4">radar</span>
                        <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest">No Active Protocols</p>
                    </div>
                )}
            </div>
        </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="p-8 bg-blue-500/5 border border-blue-500/10 rounded-[2.5rem] group relative overflow-hidden">
                    <span className="material-symbols-outlined absolute -bottom-4 -right-4 text-7xl opacity-5 group-hover:scale-125 transition-transform duration-700 text-blue-500">security</span>
                    <h4 className="text-[10px] font-black uppercase text-blue-400 tracking-[0.2em] mb-4 italic leading-none">Safety Council</h4>
                    <p className="text-xs font-bold text-slate-300 leading-relaxed italic mb-8">Zero critical flags detected in current active sessions. SOS protocols are standby.</p>
                    <button className="text-[9px] font-black uppercase text-blue-400 tracking-widest border-b border-blue-400/30 pb-1 hover:border-blue-400 transition-all">Audit Logs</button>
                </div>
            </div>
        </div>
    );
};

export default LiveOpsTab;
