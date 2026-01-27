import React from 'react';
import { User } from '../../../types';
import { deleteField } from 'firebase/firestore';

interface FleetTabProps {
    drivers: User[];
    driverFilter: 'ALL' | 'PENDING' | 'ACTIVE' | 'BLOCKED';
    setDriverFilter: (f: any) => void;
    setInspectingDriver: (d: User) => void;
    setActioningUser: (data: any) => void;
    handleResetDriver: (user: User) => void;
    handleUserAction: (id: string, updates: any) => void;
}

const FleetTab: React.FC<FleetTabProps> = ({
    drivers,
    driverFilter,
    setDriverFilter,
    setInspectingDriver,
    setActioningUser,
    handleResetDriver,
    handleUserAction
}) => {
    const filteredDrivers = drivers.filter(d => {
        if (driverFilter === 'PENDING') return d.isKycCompleted && !d.isApproved && !d.rejectionReason;
        if (driverFilter === 'ACTIVE') return d.isApproved && d.isActive !== false;
        if (driverFilter === 'BLOCKED') return d.rejectionReason || d.isActive === false;
        return true;
    });

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex gap-2 p-1.5 bg-white/5 border border-white/5 rounded-2xl w-fit backdrop-blur-md">
                    {(['ALL', 'PENDING', 'ACTIVE', 'BLOCKED'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setDriverFilter(f)}
                            className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${driverFilter === f ? 'bg-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.3)]' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-[#161B22] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl relative">
                <div className="p-8 border-b border-white/5 bg-slate-900/50 flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Partner Node Manifest</h3>
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">{filteredDrivers.length} Partners Found</span>
                    </div>
                </div>

                <div className="overflow-x-auto scrollbar-hide hidden lg:block">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5 text-[10px] font-black uppercase text-slate-600 tracking-widest italic">
                                <th className="px-8 py-6">Partner Entity</th>
                                <th className="px-8 py-6">Fleet Class</th>
                                <th className="px-8 py-6">Operational Status</th>
                                <th className="px-8 py-6">Yield Grade</th>
                                <th className="px-8 py-6 text-right">Protocol Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {filteredDrivers.map(driver => (
                                <tr key={driver.id} className="group hover:bg-white/[0.01] transition-all duration-300">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-5">
                                            <div className="size-14 rounded-2xl bg-slate-800 p-0.5 border border-white/10 relative transition-transform group-hover:scale-110">
                                                <img src={driver.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${driver.id}`} className="w-full h-full rounded-[0.9rem] object-cover" alt="avatar" />
                                                {driver.isApproved && (
                                                    <span className="absolute -bottom-1.5 -right-1.5 size-6 bg-[#00D1FF] rounded-lg border-4 border-[#161B22] flex items-center justify-center shadow-lg shadow-[#00D1FF]/20">
                                                        <span className="material-symbols-outlined text-[10px] font-black text-black">check</span>
                                                    </span>
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-black text-base text-white tracking-tight italic uppercase leading-none mb-1.5">{driver.name}</p>
                                                <p className="text-[9px] text-[#00D1FF] font-black uppercase tracking-[0.2em] italic opacity-60 leading-none">{driver.phone || 'GHOST_ID'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="bg-white/5 border border-white/5 p-3 rounded-2xl w-fit group-hover:bg-white/10 transition-colors">
                                            <p className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em] mb-1 leading-none italic">{driver.vehicleType}</p>
                                            <p className="text-[8px] text-slate-500 font-bold tracking-widest leading-none">{driver.vehicleNumber}</p>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        {driver.isApproved ? (
                                            <div className="flex items-center gap-2 text-emerald-500 group-hover:scale-105 transition-transform origin-left">
                                                <span className="size-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]"></span>
                                                <span className="text-[9px] font-black uppercase tracking-widest">Active Ops</span>
                                            </div>
                                        ) : driver.rejectionReason ? (
                                            <div className="flex flex-col gap-1.5">
                                                <span className="px-3 py-1 bg-red-500/10 text-red-500 text-[8px] font-black uppercase rounded-lg border border-red-500/20 w-fit">Flagged / Restricted</span>
                                                <p className="text-[7px] text-slate-600 max-w-[120px] font-bold uppercase tracking-tighter truncate italic">{driver.rejectionReason}</p>
                                            </div>
                                        ) : driver.isKycCompleted ? (
                                            <div className="flex items-center gap-2 text-[#00D1FF] animate-pulse">
                                                <span className="material-symbols-outlined text-[14px]">fact_check</span>
                                                <span className="text-[9px] font-black uppercase tracking-widest text-[#00D1FF]">KYC Pending</span>
                                            </div>
                                        ) : (
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 italic">Pre-Operational</span>
                                        )}
                                    </td>
                                    <td className="px-8 py-6 text-amber-500 font-black italic">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-sm tracking-tighter">{driver.rating || 'N/A'}</span>
                                            <span className="material-symbols-outlined text-sm filled">star</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                            {!driver.isApproved && driver.isKycCompleted && !driver.rejectionReason && (
                                                <button
                                                    onClick={() => setInspectingDriver(driver)}
                                                    className="px-5 py-2.5 bg-[#00D1FF] text-black text-[9px] font-black uppercase rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#00D1FF]/20 italic"
                                                >
                                                    Audit Core
                                                </button>
                                            )}
                                            {driver.rejectionReason || driver.isActive === false ? (
                                                <button
                                                    onClick={() => handleUserAction(driver.id, { isApproved: true, rejectionReason: deleteField() as any, isActive: true })}
                                                    className="px-5 py-2.5 bg-emerald-500 text-black text-[9px] font-black uppercase rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all italic"
                                                >
                                                    Revoke Block
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => setActioningUser({ id: driver.id, type: 'BLOCK' })}
                                                    className="px-5 py-2.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 text-[9px] font-black uppercase rounded-xl border border-red-500/20 transition-all"
                                                >
                                                    Suspend
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleResetDriver(driver)}
                                                className="size-10 flex items-center justify-center bg-slate-800 text-slate-500 hover:text-white hover:bg-red-600 rounded-xl transition-all"
                                                title="Full Purge"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card List */}
                <div className="lg:hidden divide-y divide-white/[0.03]">
                    {filteredDrivers.map(driver => (
                        <div key={driver.id} className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="size-12 rounded-xl bg-slate-800 p-0.5 border border-white/10 relative">
                                        <img src={driver.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${driver.id}`} className="size-full rounded-lg object-cover" alt="avatar" />
                                        {driver.isApproved && (
                                            <span className="absolute -bottom-1 -right-1 size-4 bg-[#00D1FF] rounded-md border-2 border-[#161B22] flex items-center justify-center">
                                                <span className="material-symbols-outlined text-[8px] font-black text-black">check</span>
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-black text-sm text-white uppercase italic">{driver.name}</p>
                                        <p className="text-[8px] text-[#00D1FF] font-black uppercase tracking-widest">{driver.phone || 'GHOST_ID'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-amber-500">{driver.rating || 'N/A'} ★</p>
                                    <p className="text-[8px] text-slate-500 font-bold uppercase uppercase">{driver.totalRides || 0} Trips</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between bg-white/[0.02] p-3 rounded-xl border border-white/5">
                                <div>
                                    <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest">{driver.vehicleType}</p>
                                    <p className="text-[7px] text-slate-500 font-bold tracking-widest">{driver.vehicleNumber}</p>
                                </div>
                                <div>
                                    {driver.isApproved ? (
                                        <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Active Ops</span>
                                    ) : driver.rejectionReason ? (
                                        <span className="text-[8px] font-black text-red-500 uppercase tracking-widest">Flagged</span>
                                    ) : driver.isKycCompleted ? (
                                        <span className="text-[8px] font-black text-[#00D1FF] uppercase tracking-widest">KYC Pending</span>
                                    ) : (
                                        <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Initial</span>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-2">
                                {!driver.isApproved && driver.isKycCompleted && !driver.rejectionReason && (
                                    <button
                                        onClick={() => setInspectingDriver(driver)}
                                        className="flex-1 py-3 bg-[#00D1FF] text-black text-[9px] font-black uppercase rounded-lg shadow-lg shadow-[#00D1FF]/20 italic"
                                    >
                                        Audit Core
                                    </button>
                                )}
                                {driver.rejectionReason || driver.isActive === false ? (
                                    <button
                                        onClick={() => handleUserAction(driver.id, { isApproved: true, rejectionReason: deleteField() as any, isActive: true })}
                                        className="flex-1 py-3 bg-emerald-500 text-black text-[9px] font-black uppercase rounded-lg italic"
                                    >
                                        Revoke Block
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setActioningUser({ id: driver.id, type: 'BLOCK' })}
                                        className="flex-1 py-3 bg-red-500/10 text-red-500 text-[9px] font-black uppercase rounded-lg border border-red-500/20"
                                    >
                                        Suspend
                                    </button>
                                )}
                                <button
                                    onClick={() => handleResetDriver(driver)}
                                    className="size-10 flex items-center justify-center bg-slate-800 text-slate-500 rounded-lg hover:bg-red-600 hover:text-white transition-all"
                                >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredDrivers.length === 0 && (
                    <div className="py-24 text-center">
                        <span className="material-symbols-outlined text-5xl text-slate-700 mb-4 animate-pulse">radar</span>
                        <p className="text-[10px] font-black uppercase text-slate-600 tracking-[0.3em] leading-none">No Partner Signals Detected in Filter Range</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FleetTab;
