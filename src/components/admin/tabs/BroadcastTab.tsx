import React, { useRef } from 'react';
import ScrollHint from '../../shared/ScrollHint';

interface BroadcastTabProps {
    broadcastMsg: string;
    setBroadcastMsg: (msg: string) => void;
    isBroadcasting: boolean;
    handleSendBroadcast: () => void;
}

const BroadcastTab: React.FC<BroadcastTabProps> = ({
    broadcastMsg,
    setBroadcastMsg,
    isBroadcasting,
    handleSendBroadcast
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    return (
        <div
            ref={scrollRef}
            className="max-w-4xl space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 relative"
        >
            <ScrollHint containerRef={scrollRef} />
            <div className="bg-[#161B22] border border-white/5 rounded-[3.5rem] p-12 md:p-16 shadow-2xl relative overflow-hidden text-center">
                <div className="absolute top-0 right-0 p-16 opacity-[0.03] scale-[2.5] rotate-12 pointer-events-none"><span className="material-symbols-outlined text-9xl text-orange-500">campaign</span></div>

                <header className="mb-12">
                    <p className="text-[11px] font-black uppercase tracking-[0.4em] text-orange-500 mb-4 italic">Platform-Wide Dispatch</p>
                    <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">Global <span className="text-orange-500 not-italic">Broadcast</span></h2>
                </header>

                <p className="text-slate-500 text-sm mb-12 max-w-lg mx-auto leading-relaxed italic font-medium">Transmit high-priority technical or administrative updates directly to every active rider and driver in the ecosystem.</p>

                <div className="relative mb-12 group">
                    <textarea
                        className="w-full h-56 bg-black/40 border border-white/10 rounded-[2.5rem] p-10 text-xl font-black italic focus:ring-4 focus:ring-orange-500/10 transition-all text-white placeholder:text-white/5 outline-none tracking-tight leading-relaxed scrollbar-hide"
                        placeholder="IDENTIFY_ANNOUNCEMENT_PROTOCOL..."
                        value={broadcastMsg}
                        onChange={(e) => setBroadcastMsg(e.target.value)}
                    />
                    <div className="absolute bottom-6 right-10 text-[10px] font-black text-slate-600 uppercase tracking-widest tabular-nums">
                        {broadcastMsg.length} / 280
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-14 text-left">
                    <div className="p-8 bg-white/[0.02] rounded-[2rem] border border-white/5 hover:border-[#00D1FF]/20 transition-all group">
                        <div className="flex items-center gap-5">
                            <div className="size-14 rounded-2xl bg-[#00D1FF]/10 text-[#00D1FF] flex items-center justify-center group-hover:scale-110 transition-transform"><span className="material-symbols-outlined text-[28px] font-black">devices</span></div>
                            <div>
                                <p className="text-[11px] font-black text-white uppercase tracking-widest mb-1 italic">Push Protocol</p>
                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">System-wide mobile notification</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-8 bg-white/[0.02] rounded-[2rem] border border-white/5 hover:border-orange-500/20 transition-all group">
                        <div className="flex items-center gap-5">
                            <div className="size-14 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform"><span className="material-symbols-outlined text-[28px] font-black">visibility</span></div>
                            <div>
                                <p className="text-[11px] font-black text-white uppercase tracking-widest mb-1 italic">UX Banner</p>
                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Persistent dashboard visibility</p>
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleSendBroadcast}
                    disabled={!broadcastMsg || isBroadcasting}
                    className="w-full h-20 bg-orange-500 text-white rounded-[2.5rem] font-black text-xs uppercase tracking-[0.3em] hover:bg-orange-400 transition-all shadow-2xl shadow-orange-500/20 active:scale-[0.98] disabled:opacity-20 flex items-center justify-center gap-4 py-6 italic"
                >
                    {isBroadcasting ? (
                        <span className="material-symbols-outlined animate-spin font-black">sync</span>
                    ) : (
                        <span className="material-symbols-outlined text-[22px] font-black">send_and_archive</span>
                    )}
                    <span>Dispatch Global Protocol</span>
                </button>
            </div>

            <div className="p-10 bg-[#161B22] border border-white/5 rounded-[3rem] shadow-xl">
                <h4 className="text-[10px] font-black uppercase text-slate-600 tracking-[0.2em] mb-6 italic">Transmission History</h4>
                <div className="space-y-4 opacity-30">
                    <p className="text-xs font-bold text-slate-500 italic">No previous broadcasts matching current session logs.</p>
                </div>
            </div>
        </div>
    );
};

export default BroadcastTab;
