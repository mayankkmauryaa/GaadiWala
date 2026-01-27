import { Report } from '../../../types';
import ScrollHint from '../../shared/ScrollHint';
import { useRef } from 'react';

interface ReportsTabProps {
    reports: Report[];
    handleResolveReport: (id: string) => void;
}

const ReportsTab: React.FC<ReportsTabProps> = ({ reports, handleResolveReport }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    return (
        <div
            ref={scrollRef}
            className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 relative overflow-y-auto"
        >
            <ScrollHint containerRef={scrollRef} />
            <div className="absolute top-0 right-0 p-10 opacity-[0.03] scale-150 rotate-12 text-red-500 pointer-events-none"><span className="material-symbols-outlined text-9xl">bug_report</span></div>
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500 mb-10 flex items-center gap-3 italic">
                <span className="size-2 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.4)]"></span>
                System Anomaly Reports
            </h3>

            <div className="space-y-6 relative z-10">
                {reports.map(report => (
                    <div key={report.id} className="p-8 bg-white/[0.03] rounded-[2.5rem] border border-white/5 flex items-start justify-between group hover:bg-white/[0.05] transition-all duration-500">
                        <div className="flex-1 pr-10">
                            <div className="flex items-center gap-4 mb-3">
                                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase italic tracking-widest ${report.type === 'BUG' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'}`}>{report.type}</span>
                                <span className="text-[10px] text-slate-500 font-black italic uppercase tracking-widest">{new Date(report.timestamp).toLocaleString()}</span>
                            </div>
                            <p className="text-lg font-black text-white italic tracking-tight leading-relaxed mb-4">"{report.description}"</p>
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black uppercase text-slate-600 tracking-[0.2em] italic leading-none">Reporter Logic ID:</span>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic leading-none">{report.reporterId}</span>
                            </div>
                        </div>
                        <button
                            onClick={() => handleResolveReport(report.id)}
                            className="px-8 py-3 bg-white text-black text-[10px] font-black uppercase rounded-2xl hover:bg-slate-200 transition-all shadow-xl active:scale-95 italic"
                        >
                            Execute Resolve
                        </button>
                    </div>
                ))}
                {reports.length === 0 && (
                    <div className="py-24 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
                        <span className="material-symbols-outlined text-4xl text-slate-700 mb-6 font-black">verified</span>
                        <p className="text-[11px] font-black uppercase text-slate-600 tracking-[0.4em]">Zero Active Anomalies Detected in Stack</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReportsTab;
