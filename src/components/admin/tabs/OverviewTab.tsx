import React from 'react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import DashboardMetrics from '../DashboardMetrics';
import LiveHeatmap from '../LiveHeatmap';
import { User } from '../../../types';

interface OverviewTabProps {
    users: User[];
    drivers: User[];
    activeDriversCount: number;
    pendingDriversCount: number;
    tiffinOrders: any[];
    stats: { revenue: number, totalRides: number, tiffinRevenue: number };
    trafficData: any[];
    setActiveTab: (tab: any) => void;
}

const OverviewTab: React.FC<OverviewTabProps> = ({
    users,
    drivers,
    activeDriversCount,
    pendingDriversCount,
    tiffinOrders,
    stats,
    trafficData,
    setActiveTab
}) => {
    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* Metrics Dashboard */}
            <DashboardMetrics
                usersCount={users.length}
                activeDriversCount={activeDriversCount}
                pendingDriversCount={pendingDriversCount}
                tiffinOrdersCount={tiffinOrders.length}
                revenue={stats.revenue}
                tiffinRevenue={stats.tiffinRevenue || 0}
            />

            {/* Map & Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Live Node Heatmap */}
                <div className="lg:col-span-8">
                    <LiveHeatmap />
                </div>

                {/* Performance & Trends */}
                <div className="lg:col-span-4 space-y-10">
                    {/* Top Nodes */}
                    <div className="bg-[#161B22] border border-white/5 rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-10 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 sm:p-10 opacity-[0.03] scale-150 rotate-12 text-[#00D1FF] pointer-events-none"><span className="material-symbols-outlined text-9xl">workspace_premium</span></div>
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500 mb-6 sm:mb-10 italic flex items-center gap-3">
                            <span className="size-2 bg-[#00D1FF] rounded-full shadow-[0_0_10px_rgba(0,209,255,0.4)]"></span>
                            Top Tier Units
                        </h3>
                        <div className="space-y-8">
                            {drivers.filter(d => (d.rating || 0) >= 4.5).slice(0, 3).map((d, i) => (
                                <div key={d.id} className="flex items-center justify-between group/user">
                                    <div className="flex items-center gap-5">
                                        <div className="size-12 rounded-2xl bg-slate-800 p-0.5 border border-white/10 overflow-hidden relative group-hover/user:scale-110 transition-transform">
                                            <img src={d.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${d.id}`} className="size-full rounded-xl object-cover" alt="avatar" />
                                        </div>
                                        <div>
                                            <p className="text-base font-black text-white italic tracking-tighter uppercase leading-none mb-1.5">{d.name}</p>
                                            <p className="text-[9px] text-[#00D1FF] font-black uppercase tracking-[0.2em] italic opacity-60 leading-none">{d.vehicleType}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-base font-black text-white italic tabular-nums leading-none mb-1.5">{d.rating} ★</p>
                                        <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest leading-none">{d.totalRides || 0} Trips</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => setActiveTab('drivers')} className="w-full mt-12 py-4 bg-white/[0.03] rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:bg-white hover:text-black transition-all italic border border-white/5 shadow-xl">Complete Fleet Intel</button>
                    </div>

                    {/* Infrastructure Health Chart */}
                    <div className="bg-[#161B22] border border-white/5 rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-10 shadow-2xl overflow-hidden group">
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500 mb-6 sm:mb-10 italic flex items-center gap-3">
                            <span className="size-2 bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.4)]"></span>
                            Network Load Trends
                        </h3>
                        <div className="h-48 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trafficData}>
                                    <defs>
                                        <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0A0E12', borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
                                        itemStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', fontStyle: 'italic' }}
                                    />
                                    <Area type="monotone" dataKey="users" stroke="#f97316" strokeWidth={4} fillOpacity={1} fill="url(#colorUsers)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-10">
                            <div className="p-4 bg-white/[0.03] rounded-2xl border border-white/5 group-hover:bg-white/[0.05] transition-all"><p className="text-2xl font-black text-orange-500 italic tabular-nums">650</p><p className="text-[8px] font-black uppercase text-slate-600 tracking-widest mt-1">Peak Node Activity</p></div>
                            <div className="p-4 bg-white/[0.03] rounded-2xl border border-white/5 group-hover:bg-white/[0.05] transition-all"><p className="text-2xl font-black text-white italic tabular-nums">98%</p><p className="text-[8px] font-black uppercase text-slate-600 tracking-widest mt-1">Uptime Capacity</p></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OverviewTab;
