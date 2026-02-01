import React from 'react';
import { User } from '../../../types';
import { deleteField } from 'firebase/firestore';

interface RidersTabProps {
    users: User[];
    userFilter: 'ALL' | 'ACTIVE' | 'BLOCKED';
    setUserFilter: (f: any) => void;
    handleUserAction: (id: string, updates: any) => void;
    handleResetDriver: (user: User) => void;
}

const RidersTab: React.FC<RidersTabProps> = ({
    users,
    userFilter,
    setUserFilter,
    handleUserAction,
    handleResetDriver
}) => {
    const filteredRiders = users.filter(u => {
        if (userFilter === 'ACTIVE') return u.isActive !== false;
        if (userFilter === 'BLOCKED') return u.isActive === false;
        return true;
    });

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex gap-2 p-1.5 bg-white/5 border border-white/5 rounded-2xl w-fit backdrop-blur-md">
                {(['ALL', 'ACTIVE', 'BLOCKED'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setUserFilter(f)}
                        className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${userFilter === f ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            <div className="bg-[#161B22] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-white/5 bg-slate-900/50 flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Rider Population Registry</h3>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">{filteredRiders.length} Registered Nodes</span>
                </div>

                <div className="overflow-x-auto scrollbar-hide">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5 text-[10px] font-black uppercase text-slate-600 tracking-widest italic">
                                <th className="px-10 py-6">Rider Entity</th>
                                <th className="px-10 py-6">Intelligence & Loyalty</th>
                                <th className="px-10 py-6">Status Indicator</th>
                                <th className="px-10 py-6 text-right">Protocol Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {filteredRiders.map(rider => (
                                <tr key={rider.id} className="group hover:bg-white/[0.01] transition-all">
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="size-12 rounded-2xl bg-slate-800 p-0.5 border border-white/10 overflow-hidden group-hover:scale-110 transition-transform">
                                                <img src={rider.avatar || `https://api.dicebear.com/7.x/miniavs/svg?seed=${rider.id}`} className="size-full rounded-xl object-cover" alt="avatar" />
                                            </div>
                                            <div>
                                                <p className="font-black text-base text-white uppercase italic tracking-tighter leading-none mb-1.5">{rider.name?.replace(/^\[Inactive\]\s*/i, '') || 'ANON_USER'}</p>
                                                <p className="text-[9px] text-slate-500 font-bold tracking-widest lowercase leading-none">{rider.email || rider.phone || 'NO_CONTACT_LOCATED'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6">
                                        <div className="space-y-1">
                                            <p className="text-xs font-black text-white italic">{rider.totalRides || 0} Successful Journeys</p>
                                            <div className="flex items-center gap-2">
                                                <div className="h-1 w-20 bg-white/5 rounded-full overflow-hidden">
                                                    <div className="h-full bg-[#00D1FF]" style={{ width: `${Math.min(100, (rider.loyaltyPoints || 0) / 10)}%` }}></div>
                                                </div>
                                                <span className="text-[9px] font-black text-[#00D1FF] uppercase tracking-widest italic">{rider.loyaltyPoints || 0} Pts</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6">
                                        {rider.isActive !== false ? (
                                            <div className="flex items-center gap-2 text-emerald-500">
                                                <span className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                                                <span className="text-[9px] font-black uppercase tracking-widest">Authorized</span>
                                            </div>
                                        ) : (
                                            <span className="px-3 py-1 bg-red-500/10 text-red-500 text-[9px] font-black uppercase rounded-lg border border-red-500/20 italic tracking-tighter">Access Revoked</span>
                                        )}
                                    </td>
                                    <td className="px-10 py-6 text-right">
                                        <div className="flex justify-end gap-4 opacity-0 group-hover:opacity-100 transition-all">
                                            {rider.isActive !== false ? (
                                                <button
                                                    onClick={() => handleUserAction(rider.id, { isActive: false })}
                                                    className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500/60 hover:text-red-500 transition-colors"
                                                >
                                                    Freeze
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleUserAction(rider.id, { isActive: true, rejectionReason: deleteField() as any })}
                                                    className="px-4 py-2 bg-emerald-500 text-black text-[9px] font-black uppercase rounded-xl shadow-lg shadow-emerald-500/20 italic transition-transform active:scale-95"
                                                >
                                                    Restore
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleResetDriver(rider)}
                                                className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 hover:text-white transition-colors"
                                            >
                                                Purge
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default RidersTab;
