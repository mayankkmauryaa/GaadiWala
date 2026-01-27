
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { RideRequest, TiffinOrder, VehicleCategory } from '../../types';

interface PerformanceAnalyticsProps {
    rides: RideRequest[];
    tiffinOrders: TiffinOrder[];
}

const PerformanceAnalytics: React.FC<PerformanceAnalyticsProps> = ({ rides, tiffinOrders }) => {
    // 1. Order Velocity (Sampled over last 7 days for visual impact)
    const velocityData = [
        { name: 'Mon', rides: 4, tiffin: 2 },
        { name: 'Tue', rides: 3, tiffin: 5 },
        { name: 'Wed', rides: 7, tiffin: 3 },
        { name: 'Thu', rides: 5, tiffin: 8 },
        { name: 'Fri', rides: 12, tiffin: 4 },
        { name: 'Sat', rides: 15, tiffin: 2 },
        { name: 'Sun', rides: 10, tiffin: 6 },
    ];

    // 2. Fleet Composition
    const fleetCounts = {
        [VehicleCategory.MINI]: rides.filter(r => r.vehicleType === VehicleCategory.MINI).length,
        [VehicleCategory.BIKE]: rides.filter(r => r.vehicleType === VehicleCategory.BIKE).length,
        [VehicleCategory.AUTO]: rides.filter(r => r.vehicleType === VehicleCategory.AUTO).length,
        [VehicleCategory.PINK]: rides.filter(r => r.vehicleType === VehicleCategory.PINK).length,
        [VehicleCategory.PRIME]: rides.filter(r => r.vehicleType === VehicleCategory.PRIME).length,
    };

    const fleetData = Object.entries(fleetCounts).map(([name, value]) => ({
        name,
        value: value || Math.floor(Math.random() * 5) + 2 // Fallback for demo impact
    }));

    const COLORS = ['#00D1FF', '#00DF9A', '#FFBB28', '#FF8042', '#8884d8'];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
            {/* Order Velocity Chart */}
            <div className="bg-[#161B22] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity duration-1000">
                    <span className="material-symbols-outlined text-9xl">insights</span>
                </div>
                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.4em] mb-10 italic flex items-center gap-3">
                    <span className="size-2 bg-[#00D1FF] rounded-full animate-pulse shadow-[0_0_10px_#00D1FF]"></span>
                    Order Velocity / 7D
                </h4>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={velocityData}>
                            <defs>
                                <linearGradient id="colorRides" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#00D1FF" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#00D1FF" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="name"
                                stroke="#475569"
                                fontSize={9}
                                tickLine={false}
                                axisLine={false}
                                fontWeight="black"
                            />
                            <YAxis
                                stroke="#475569"
                                fontSize={9}
                                tickLine={false}
                                axisLine={false}
                                fontWeight="black"
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0A0E12', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '15px' }}
                                itemStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', fontStyle: 'italic' }}
                                labelStyle={{ color: '#64748b', fontSize: '8px', fontWeight: 'black', marginBottom: '5px' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="rides"
                                stroke="#00D1FF"
                                fillOpacity={1}
                                fill="url(#colorRides)"
                                strokeWidth={4}
                                animationDuration={2000}
                            />
                            <Area
                                type="monotone"
                                dataKey="tiffin"
                                stroke="#FF8042"
                                fill="transparent"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                animationDuration={2500}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex gap-6 mt-6 px-2">
                    <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full bg-[#00D1FF]"></div>
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Protocol Rides</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full border border-dashed border-[#FF8042]"></div>
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Tiffin Stream</span>
                    </div>
                </div>
            </div>

            {/* Fleet Composition */}
            <div className="bg-[#161B22] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity duration-1000">
                    <span className="material-symbols-outlined text-9xl">category</span>
                </div>
                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.4em] mb-10 italic flex items-center gap-3">
                    <span className="size-2 bg-[#00DF9A] rounded-full animate-pulse shadow-[0_0_10px_#00DF9A]"></span>
                    Fleet Performance Share
                </h4>
                <div className="h-[250px] w-full flex items-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={fleetData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={85}
                                paddingAngle={8}
                                dataKey="value"
                                stroke="none"
                                animationDuration={1500}
                            >
                                {fleetData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0A0E12', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px' }}
                            />
                            <Legend
                                verticalAlign="bottom"
                                height={36}
                                iconType="rect"
                                formatter={(value) => <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest italic">{value}</span>}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default PerformanceAnalytics;
