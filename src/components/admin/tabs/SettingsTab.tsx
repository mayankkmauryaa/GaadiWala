import React, { useRef } from 'react';
import ScrollHint from '../../shared/ScrollHint';

interface SettingsTabProps {
    sysConfig: {
        baseFares: Record<string, number>;
        surgeMultiplier: number;
        tiffinCommission: number;
        pinkCabLockdown: boolean;
        liveSOSProtocol: boolean;
    };
    setSysConfig: (config: any) => void;
    handleSaveConfig: () => void;
    isConfigSaving: boolean;
}

const SettingsTab: React.FC<SettingsTabProps> = ({
    sysConfig,
    setSysConfig,
    handleSaveConfig,
    isConfigSaving
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    return (
        <div
            ref={scrollRef}
            className="max-w-5xl space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 relative"
        >
            <ScrollHint containerRef={scrollRef} />
            <div className="bg-[#161B22] border border-white/5 rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-10 md:p-14 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-14 opacity-[0.03] scale-[2.5] rotate-45 pointer-events-none"><span className="material-symbols-outlined text-9xl">settings</span></div>

                <header className="mb-10 sm:mb-14">
                    <h3 className="text-2xl sm:text-3xl font-black italic tracking-tighter text-white uppercase leading-none mb-3">Global Protocol <span className="text-orange-500 not-italic">Engine</span></h3>
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] italic">Ecosystem Parameter Management</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
                    <div className="space-y-10">
                        {/* Fare Configuration */}
                        <div className="p-8 bg-white/[0.02] rounded-[2.5rem] border border-white/5">
                            <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-8 italic flex items-center gap-3">
                                <span className="size-1.5 bg-orange-500 rounded-full"></span>
                                Yield Algorithms
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                {Object.entries(sysConfig.baseFares).map(([type, fare]) => (
                                    <div key={type} className="p-4 sm:p-5 bg-black/20 rounded-2xl border border-white/5 hover:border-orange-500/30 transition-all group">
                                        <p className="text-[9px] font-black uppercase text-slate-600 tracking-widest mb-1 sm:mb-2 group-hover:text-orange-500 transition-colors leading-none italic">{type} Base Unit</p>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-base font-black text-orange-500 italic">₹</span>
                                            <input
                                                type="number"
                                                value={fare}
                                                onChange={(e) => setSysConfig({ ...sysConfig, baseFares: { ...sysConfig.baseFares, [type]: Number(e.target.value) } })}
                                                className="w-full bg-transparent border-none p-0 text-lg font-black text-white focus:ring-0 italic tabular-nums"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-5 bg-black/20 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-[#00D1FF]/30 transition-all">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-[#00D1FF] transition-colors italic">Heat Multiplier (Surge)</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-black text-[#00D1FF] italic">x</span>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={sysConfig.surgeMultiplier}
                                        onChange={(e) => setSysConfig({ ...sysConfig, surgeMultiplier: Number(e.target.value) })}
                                        className="w-16 bg-transparent border-none p-0 text-right text-lg font-black text-white focus:ring-0 italic tabular-nums"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Safety Lockdowns */}
                        <div className="p-8 bg-white/[0.02] rounded-[2.5rem] border border-white/5">
                            <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-8 italic flex items-center gap-3">
                                <span className="size-1.5 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.4)]"></span>
                                Emergency Overrides
                            </h4>
                            <div className="space-y-4">
                                <div
                                    onClick={() => setSysConfig({ ...sysConfig, pinkCabLockdown: !sysConfig.pinkCabLockdown })}
                                    className={`flex items-center justify-between p-6 rounded-[1.5rem] border transition-all cursor-pointer group ${sysConfig.pinkCabLockdown ? 'bg-pink-500/10 border-pink-500/30' : 'bg-slate-900/50 border-white/5 hover:border-pink-500/20'}`}
                                >
                                    <div>
                                        <p className={`text-[11px] font-black uppercase tracking-widest italic leading-none mb-1 ${sysConfig.pinkCabLockdown ? 'text-pink-500' : 'text-white'}`}>Pink Cab Lockdown</p>
                                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Restriction of all gender-specific protocols</p>
                                    </div>
                                    <div className={`size-10 rounded-xl flex items-center justify-center transition-all ${sysConfig.pinkCabLockdown ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20' : 'bg-white/5 text-slate-500'}`}>
                                        <span className="material-symbols-outlined text-[20px] font-black">{sysConfig.pinkCabLockdown ? 'gpp_maybe' : 'gpp_good'}</span>
                                    </div>
                                </div>
                                <div
                                    onClick={() => setSysConfig({ ...sysConfig, liveSOSProtocol: !sysConfig.liveSOSProtocol })}
                                    className={`flex items-center justify-between p-6 rounded-[1.5rem] border transition-all cursor-pointer group ${sysConfig.liveSOSProtocol ? 'bg-teal-500/10 border-teal-500/30' : 'bg-slate-900/50 border-white/5 hover:border-teal-500/20'}`}
                                >
                                    <div>
                                        <p className={`text-[11px] font-black uppercase tracking-widest italic leading-none mb-1 ${sysConfig.liveSOSProtocol ? 'text-teal-500' : 'text-white'}`}>Active SOS Bridge</p>
                                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Real-time emergency dispatch response</p>
                                    </div>
                                    <div className={`size-10 rounded-xl flex items-center justify-center transition-all ${sysConfig.liveSOSProtocol ? 'bg-teal-500 text-black shadow-lg shadow-teal-500/20' : 'bg-white/5 text-slate-500'}`}>
                                        <span className="material-symbols-outlined text-[20px] font-black">{sysConfig.liveSOSProtocol ? 'shield_with_heart' : 'shield'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-10">
                        {/* Logistics Config */}
                        <div className="p-8 bg-white/[0.02] rounded-[2.5rem] border border-white/5">
                            <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-8 italic flex items-center gap-3">
                                <span className="size-1.5 bg-[#00D1FF] rounded-full"></span>
                                Logistics Intelligence
                            </h4>
                            <div className="space-y-4">
                                <div className="p-6 bg-black/20 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-[#00D1FF]/30 transition-all">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Network Tax (Commission)</span>
                                    <div className="flex items-center gap-1.5">
                                        <input
                                            type="number"
                                            value={sysConfig.tiffinCommission}
                                            onChange={(e) => setSysConfig({ ...sysConfig, tiffinCommission: Number(e.target.value) })}
                                            className="w-12 bg-transparent border-none p-0 text-right text-lg font-black text-white focus:ring-0 italic tabular-nums"
                                        />
                                        <span className="text-sm font-black text-[#00D1FF] italic">%</span>
                                    </div>
                                </div>
                                <div className="p-6 bg-black/20 rounded-2xl border border-white/5 flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Cron: Subs Generation</span>
                                    <span className="text-xs font-black text-white uppercase italic tracking-widest">10:00 AM IST</span>
                                </div>
                                <div className="p-6 bg-[#00D1FF]/5 rounded-2xl border border-[#00D1FF]/20 flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[#00D1FF] italic tracking-tight">Fleet Allocation Logic</span>
                                    <span className="text-[10px] font-black text-white uppercase italic tracking-widest">Balanced_Prio</span>
                                </div>
                            </div>
                        </div>

                        {/* Developer Bridge */}
                        <div className="p-10 bg-[#00D1FF]/5 rounded-[3rem] border border-[#00D1FF]/20 relative overflow-hidden group text-center">
                            <div className="absolute inset-0 bg-gradient-to-br from-[#00D1FF]/5 to-transparent pointer-events-none"></div>
                            <span className="material-symbols-outlined text-6xl opacity-10 mb-4 group-hover:scale-110 transition-transform duration-700 text-[#00D1FF]">terminal</span>
                            <p className="text-[10px] font-black uppercase text-[#00D1FF] tracking-[0.3em] mb-3 italic">Superuser Infrastructure</p>
                            <p className="text-xs text-slate-400 mb-8 font-medium leading-relaxed italic max-w-[240px] mx-auto">Access the high-level cloud console for deep-packet ecosystem adjustments.</p>
                            <button className="w-full py-4 bg-[#00D1FF] text-black rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-[#00D1FF]/20 hover:scale-[1.02] active:scale-95 transition-all italic">Launch Cloud HQ</button>
                        </div>
                    </div>
                </div>

                <div className="pt-14 mt-14 border-t border-white/5">
                    <button
                        onClick={handleSaveConfig}
                        disabled={isConfigSaving}
                        className="w-full h-20 bg-white text-black rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.4em] hover:bg-slate-100 transition-all shadow-2xl active:scale-[0.98] flex items-center justify-center gap-6 italic group disabled:opacity-50"
                    >
                        {isConfigSaving ? (
                            <span className="material-symbols-outlined animate-spin font-black">sync</span>
                        ) : (
                            <span className="material-symbols-outlined font-black group-hover:rotate-180 transition-transform duration-700">settings_backup_restore</span>
                        )}
                        <span>Commit Global Protocol Updates</span>
                    </button>
                    <p className="text-center text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-6">Protocol changes affect all live platform instances immediately</p>
                </div>
            </div>
        </div>
    );
};

export default SettingsTab;
