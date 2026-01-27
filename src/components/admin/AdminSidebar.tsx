import ScrollHint from '../shared/ScrollHint';

interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: any) => void;
    pendingDriversCount: number;
    currentTime: Date;
    handleLogout: () => void;
    showSidebar: boolean;
    sidebarRef: React.RefObject<HTMLDivElement | null>;
}

const AdminSidebar: React.FC<SidebarProps> = ({
    activeTab,
    setActiveTab,
    pendingDriversCount,
    currentTime,
    handleLogout,
    showSidebar,
    sidebarRef
}) => {
    const menuItems = [
        { id: 'overview', icon: 'dashboard', label: 'Overview' },
        { id: 'live', icon: 'sensors', label: 'Live Ops', badge: true },
        { id: 'drivers', icon: 'local_taxi', label: 'Fleet', count: pendingDriversCount },
        { id: 'tiffin', icon: 'restaurant', label: 'Food Ops' },
        { id: 'users', icon: 'group', label: 'Riders' },
        { id: 'reports', icon: 'bug_report', label: 'Reports' },
        { id: 'promotions', icon: 'sell', label: 'Promotions' },
        { id: 'broadcasts', icon: 'campaign', label: 'Broadcasts' },
        { id: 'settings', icon: 'settings', label: 'Settings' },
    ];

    return (
        <aside
            ref={sidebarRef}
            className={`fixed lg:relative z-50 w-72 lg:w-80 bg-[#0A0E12] border-r border-white/5 flex flex-col h-dvh lg:h-full transition-transform duration-500 overflow-y-auto scrollbar-hide pb-safe ${showSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                }`}
        >
            <ScrollHint containerRef={sidebarRef as any} />
            <div className="p-8 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="size-8 bg-orange-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.4)]">
                        <span className="material-symbols-outlined text-white font-black">security</span>
                    </div>
                    <div>
                        <h1 className="text-xl font-black italic tracking-tighter text-white">Gaadiwala <span className="text-orange-500 not-italic">HQ</span></h1>
                        <p className="text-[8px] font-black uppercase text-slate-500 tracking-[0.2em] leading-none mt-1">Command & Control</p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-1">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all group ${activeTab === item.id
                            ? 'bg-white/10 text-white font-bold shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]'
                            : 'text-slate-500 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <span className="material-symbols-outlined text-[22px] group-hover:scale-110 transition-transform">
                                    {item.icon}
                                </span>
                                {item.badge && (
                                    <span className="absolute -top-1 -right-1 size-2 bg-[#00D1FF] rounded-full animate-ping"></span>
                                )}
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-widest">{item.label}</span>
                        </div>
                        {item.count !== undefined && item.count > 0 && (
                            <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md animate-pulse">
                                {item.count}
                            </span>
                        )}
                    </button>
                ))}

                <div className="pt-6 mt-6 border-t border-white/5">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-red-500/60 hover:text-red-500 hover:bg-red-500/10 transition-all font-black uppercase tracking-widest text-[11px]"
                    >
                        <span className="material-symbols-outlined">logout</span>
                        <span>Exit HQ</span>
                    </button>
                </div>
            </nav>

            <div className="p-8 border-t border-white/5 bg-[#070b0e]">
                <div className="text-[9px] font-black uppercase text-slate-600 tracking-widest mb-1.5 italic">Real-Time Core</div>
                <div className="text-2xl font-black text-white italic tracking-tighter tabular-nums">
                    {currentTime.toLocaleTimeString([], { hour12: false })}
                </div>
                <div className="text-[9px] text-[#00D1FF] font-black uppercase tracking-widest mt-1 opacity-70">
                    {currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
            </div>
        </aside>
    );
};

export default AdminSidebar;
