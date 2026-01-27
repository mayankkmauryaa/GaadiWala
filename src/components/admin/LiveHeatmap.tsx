import React from 'react';

const LiveHeatmap: React.FC = () => {
    return (
        <div className="bg-[#161B22] border border-white/5 rounded-[2.5rem] p-8 min-h-[500px] flex flex-col shadow-2xl relative overflow-hidden group">
            <div className="absolute top-8 right-10 flex items-center gap-2 z-20">
                <div className="size-2 rounded-full bg-red-500 animate-pulse"></div>
                <span className="text-[10px] font-black uppercase text-red-500 tracking-[0.2em] italic">Live Demand Feed</span>
            </div>

            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Ecosystem Heatmap</h3>
                    <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest italic">Mathura-Vrindavan Operational Corridor</p>
                </div>
            </div>

            <div className="flex-1 rounded-[2rem] overflow-hidden relative border border-white/5 shadow-inner">
                <div className="absolute inset-0 grayscale brightness-[0.4] contrast-150 saturate-[0.5]">
                    <iframe
                        width="100%"
                        title="map"
                        height="100%"
                        frameBorder="0"
                        scrolling="no"
                        src="https://maps.google.com/maps?hl=en&q=Mathura,India&t=k&z=13&ie=UTF8&iwloc=B&output=embed"
                    ></iframe>
                </div>
                <div className="absolute inset-0 bg-blue-900/10 pointer-events-none"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#161B22] via-transparent to-transparent opacity-60"></div>

                {/* Visual Overlays for "Ops" Feel */}
                <div className="absolute top-6 left-6 p-5 rounded-2xl bg-[#0A0E12]/90 backdrop-blur-xl border border-white/10 shadow-2xl">
                    <p className="text-[8px] font-black uppercase text-[#00D1FF] tracking-[0.3em] mb-2 leading-none">Operational Status</p>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-8">
                            <span className="text-[10px] font-black text-white/40 uppercase">Demand</span>
                            <span className="text-[10px] font-black text-emerald-400 uppercase">Extreme</span>
                        </div>
                        <div className="flex items-center justify-between gap-8">
                            <span className="text-[10px] font-black text-white/40 uppercase">Latency</span>
                            <span className="text-[10px] font-black text-white uppercase">14ms</span>
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-6 left-6 right-6 md:right-auto bg-[#161B22]/95 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <div className="flex items-center gap-4 mb-3">
                        <div className="size-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                            <span className="material-symbols-outlined text-orange-500 text-xl font-black">local_fire_department</span>
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase text-slate-500 leading-none mb-1">Critical Hotspot</p>
                            <p className="text-lg font-black text-white tracking-tight uppercase italic leading-none">Mathura Junction</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 pt-3 border-t border-white/5">
                        <span className="text-[10px] text-orange-500 font-black tracking-widest uppercase italic">2.4x Surge Multiplier Active</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LiveHeatmap;
