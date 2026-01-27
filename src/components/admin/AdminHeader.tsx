import React from 'react';

interface HeaderProps {
    activeTab: string;
    onNotificationClick: () => void;
    onGridViewClick: () => void;
    notificationCount: number;
}

const AdminHeader: React.FC<HeaderProps> = ({
    activeTab,
    onNotificationClick,
    onGridViewClick,
    notificationCount
}) => {
    return (
        <header className="h-20 lg:h-24 px-4 sm:px-10 border-b border-white/5 flex items-center justify-between bg-[#0f1c23]/80 backdrop-blur-xl sticky top-0 z-[40]">
            <div className="flex flex-col">
                <p className="text-[#00D1FF] text-[8px] sm:text-[9px] font-black uppercase tracking-[0.3em] mb-1 sm:mb-1.5 leading-none italic opacity-70">Infrastructure Center</p>
                <h2 className="text-xl sm:text-3xl font-black uppercase tracking-tighter text-white italic leading-none">{activeTab}</h2>
            </div>

            <div className="flex items-center gap-8">
                <div className="hidden xl:flex items-center gap-4 bg-white/5 px-5 py-2.5 rounded-2xl border border-white/5">
                    <div className="size-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">Node Status: Healthy</span>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={onNotificationClick}
                        className="size-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all group relative active:scale-95"
                    >
                        <span className="material-symbols-outlined text-slate-400 group-hover:text-white transition-colors">notifications</span>
                        {notificationCount > 0 && (
                            <span className="absolute -top-1 -right-1 size-5 bg-orange-500 rounded-lg border-2 border-[#0f1c23] flex items-center justify-center text-[9px] font-black text-white shadow-lg">
                                {notificationCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={onGridViewClick}
                        className="size-10 sm:size-12 bg-white/5 rounded-xl sm:rounded-2xl flex items-center justify-center border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all group active:scale-95"
                    >
                        <span className="material-symbols-outlined text-slate-400 group-hover:text-white transition-colors">grid_view</span>
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="size-10 sm:size-12 bg-white/5 rounded-xl sm:rounded-2xl flex items-center justify-center border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all group active:scale-95"
                        title="Sync Infrastructure"
                    >
                        <span className="material-symbols-outlined text-slate-400 group-hover:text-white transition-colors">sync</span>
                    </button>
                </div>

                <div className="flex items-center gap-4 pl-8 border-l border-white/10">
                    <div className="size-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 font-black shadow-xl">
                        <span className="material-symbols-outlined font-black">shield</span>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default AdminHeader;
