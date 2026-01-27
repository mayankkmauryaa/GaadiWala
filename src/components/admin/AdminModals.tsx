import React from 'react';
import { User } from '../../types';

interface ModalsProps {
    inspectingDriver: User | null;
    setInspectingDriver: (u: User | null) => void;
    actioningUser: { id: string, type: 'BLOCK' | 'REJECT' | 'DELETE' } | null;
    setActioningUser: (data: any) => void;
    reason: string;
    setReason: (r: string) => void;
    handleUserAction: (id: string, updates: any) => void;
    handleResetDriver: (user: User) => void;
    users: User[];
    drivers: User[];
}

const AdminModals: React.FC<ModalsProps> = ({
    inspectingDriver,
    setInspectingDriver,
    actioningUser,
    setActioningUser,
    reason,
    setReason,
    handleUserAction,
    handleResetDriver,
    users,
    drivers
}) => {
    return (
        <>
            {/* DRIVER INSPECTION MODAL */}
            {inspectingDriver && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-300">
                    <div className="bg-[#161B22] border border-white/10 rounded-[2rem] sm:rounded-[3rem] w-full max-w-2xl overflow-y-auto max-h-[90dvh] shadow-[0_0_100px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-400">
                        <div className="p-6 sm:p-10 flex flex-col md:flex-row gap-6 sm:gap-10">
                            {/* Left: Photos */}
                            <div className="flex-1 space-y-6">
                                <div className="aspect-video bg-black/40 rounded-[2rem] overflow-hidden border-2 border-white/5 relative group shadow-inner">
                                    {inspectingDriver.vehicleImage ? (
                                        <img src={inspectingDriver.vehicleImage} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" alt="Vehicle" />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-slate-700 flex-col gap-3">
                                            <span className="material-symbols-outlined text-5xl">no_photography</span>
                                            <span className="text-[10px] uppercase font-black tracking-widest italic">NO_IMAGE_LOGGED</span>
                                        </div>
                                    )}
                                    <div className="absolute top-4 left-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[8px] font-black text-white uppercase tracking-[0.2em] border border-white/10 italic">Vehicle Unit Artifact</div>
                                </div>
                                <div className="p-6 bg-white/[0.03] rounded-[2rem] border border-white/5 shadow-xl">
                                    <p className="text-[10px] font-black uppercase text-slate-500 mb-4 italic tracking-widest pl-2">Partner Signature</p>
                                    <div className="flex items-center gap-4">
                                        <div className="size-16 rounded-2xl overflow-hidden border-2 border-white/10 shadow-lg">
                                            <img src={inspectingDriver.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${inspectingDriver.id}`} className="size-full object-cover" alt="Avatar" />
                                        </div>
                                        <div>
                                            <p className="font-black text-white text-xl italic uppercase tracking-tighter leading-none mb-1.5">{inspectingDriver.name}</p>
                                            <p className="text-[9px] text-[#00D1FF] font-black uppercase tracking-widest italic leading-none">{inspectingDriver.phone}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Details & Actions */}
                            <div className="flex-1 flex flex-col justify-between">
                                <div className="space-y-8">
                                    <header>
                                        <h3 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none mb-2">Audit <span className="text-[#00D1FF] not-italic">Protocol</span></h3>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">Verifying Partner Integrity & Fleet Node Assets</p>
                                    </header>

                                    <div className="space-y-5">
                                        <div className="p-6 bg-slate-900/50 rounded-2xl border border-white/10 group hover:border-[#00D1FF]/30 transition-all">
                                            <p className="text-[10px] uppercase font-black text-slate-500 mb-2 italic tracking-widest">Fleet Designation</p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xl font-black text-white italic tracking-widest uppercase tabular-nums">{inspectingDriver.vehicleNumber}</span>
                                                <span className="px-3 py-1 bg-orange-500/10 text-orange-500 text-[10px] font-black uppercase rounded shadow-lg shadow-orange-500/5 italic">{inspectingDriver.vehicleType}</span>
                                            </div>
                                        </div>

                                        <div className="p-6 rounded-2xl border border-blue-500/20 bg-blue-500/5 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform text-blue-500"><span className="material-symbols-outlined text-4xl">verified_user</span></div>
                                            <div className="flex items-center gap-3 mb-3">
                                                <span className="material-symbols-outlined text-blue-400 text-xl font-black">fact_check</span>
                                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest italic">KYC_VERIFIED_PROTOCOL</span>
                                            </div>
                                            <p className="text-[11px] text-slate-400 font-medium leading-relaxed italic">
                                                External Node Verification: <strong className="text-white">ACTIVE_SUCCESS</strong>.
                                                Entity credentials match historical database logs.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-4 pt-10 border-t border-white/5">
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setInspectingDriver(null)}
                                            className="px-6 py-4 rounded-xl font-black text-slate-500 hover:text-white hover:bg-white/5 text-[10px] uppercase tracking-widest transition-all italic"
                                        >
                                            Abort
                                        </button>
                                        <button
                                            onClick={() => setActioningUser({ id: inspectingDriver.id, type: 'REJECT' })}
                                            className="flex-1 py-4 rounded-xl font-black bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white text-[10px] uppercase tracking-widest transition-all italic"
                                        >
                                            Reject Node
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => handleUserAction(inspectingDriver.id, { isApproved: true, rejectionReason: '', isActive: true })}
                                        className="w-full py-5 rounded-[1.5rem] font-black bg-[#00D1FF] text-black shadow-2xl shadow-[#00D1FF]/20 hover:scale-[1.02] active:scale-95 transition-all text-[11px] uppercase tracking-[0.3em] italic"
                                    >
                                        Authorize & Enact Protocol
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ADMINISTRATIVE ACTION MODAL (BLOCK/REJECT) */}
            {actioningUser && (
                <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
                    <div className="max-w-xl w-full bg-[#161B22] border border-white/10 p-6 sm:p-12 rounded-[2.5rem] sm:rounded-[3.5rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-400 text-center">
                        <div className="flex flex-col items-center gap-4 sm:gap-6 mb-8 sm:mb-10">
                            <div className={`size-16 sm:size-20 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center shadow-2xl ${actioningUser.type === 'DELETE' ? 'bg-red-500 shadow-red-500/20' : 'bg-orange-500 shadow-orange-500/20'}`}>
                                <span className="material-symbols-outlined text-white text-3xl sm:text-4xl font-black">{actioningUser.type === 'DELETE' ? 'delete_forever' : 'gavel'}</span>
                            </div>
                            <div>
                                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter text-white italic leading-none mb-2 sm:mb-3">Protocol Execution</h2>
                                <p className="text-[10px] sm:text-[11px] font-black uppercase text-slate-500 tracking-[0.3em] italic">{actioningUser.type}_ENTITY_ACCESS</p>
                            </div>
                        </div>

                        <p className="text-sm text-slate-500 mb-10 leading-relaxed max-w-sm mx-auto italic font-medium">Identify the administrative justification for this protocol enactment. This identifier will be logged in the entity's manifest.</p>

                        <textarea
                            className="w-full h-32 sm:h-40 bg-black/40 border border-white/10 rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-8 text-sm sm:text-base font-black italic focus:ring-4 focus:ring-orange-500/10 mb-8 sm:mb-10 text-white placeholder:text-white/5 outline-none tracking-tight resize-none scrollbar-hide"
                            placeholder="REASON_FOR_ADMIN_ACTION..."
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                        />

                        <div className="flex gap-6">
                            <button
                                onClick={() => {
                                    if (actioningUser.type === 'DELETE') {
                                        const target = users.find(u => u.id === actioningUser.id) || drivers.find(d => d.id === actioningUser.id);
                                        if (target) handleResetDriver(target);
                                    } else {
                                        handleUserAction(actioningUser.id, {
                                            isApproved: false,
                                            isActive: false,
                                            rejectionReason: reason || 'VIOLATION_OF_PLATFORM_PROTOCOL'
                                        });
                                    }
                                }}
                                className="flex-[2] h-18 bg-white text-black rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.3em] hover:bg-slate-100 transition-all shadow-2xl shadow-white/5 active:scale-[0.98] italic"
                            >
                                Execute Protocol
                            </button>
                            <button onClick={() => setActioningUser(null)} className="flex-1 h-18 bg-white/5 rounded-[1.5rem] text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-white/10 transition-all italic border border-white/5">Abort</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AdminModals;
