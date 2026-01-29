import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip, CartesianGrid, YAxis } from 'recharts';
import DriverPricingSlider from '../../components/Driver/DriverPricingSlider';
import { Trip, User, Language, VehicleCategory } from '../../types';
import ScrollHint from '../../components/shared/ScrollHint';
import { ridesAPI } from '../../services/api/rides';

interface Props {
    user: User;
    lang: Language;
}

const CustomTooltip = ({ active, payload, accentColor }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#161B22] p-4 border border-white/10 shadow-2xl rounded-2xl backdrop-blur-md">
                <p className="text-[9px] font-black uppercase text-slate-500 mb-1 tracking-widest">{payload[0].payload.date}</p>
                <p className="text-xl font-black text-white">₹{payload[0].value.toLocaleString()}</p>
                <div className="flex items-center gap-1.5 mt-1">
                    <span className="size-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    <p className="text-[9px] text-green-500 font-bold uppercase tracking-tighter">Daily Peak</p>
                </div>
            </div>
        );
    }
    return null;
};

const Earnings: React.FC<Props> = ({ user, lang }) => {
    const navigate = useNavigate();
    const mainScrollRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState<'earnings' | 'history'>('earnings');
    const [realTimeEarnings, setRealTimeEarnings] = useState(0);
    const [payoutMethod, setPayoutMethod] = useState<'bank' | 'paypal' | 'deposit'>('bank');
    const [trips, setTrips] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const isPink = user.vehicleType === VehicleCategory.PINK;
    const accentBg = isPink ? 'bg-pink-500' : 'bg-[#00D1FF]';
    const accentText = isPink ? 'text-pink-400' : 'text-[#00D1FF]';
    const accentBorder = isPink ? 'border-pink-500/30' : 'border-[#00D1FF]/30';
    const accentShadow = isPink ? 'shadow-[0_0_20px_rgba(244,114,182,0.3)]' : 'shadow-[0_0_20px_rgba(0,209,255,0.3)]';

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const history = await ridesAPI.getDriverRideHistory(user.id);
                setTrips(history);
                const total = history.reduce((sum, ride) => sum + (ride.estimatedFare || 0), 0);
                setRealTimeEarnings(total);
            } catch (error) {
                console.error("Failed to fetch earnings history:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [user.id]);

    // Derived chart data from last 7 days of completed trips
    const getChartData = () => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const chartDataMap = new Map();

        // Initialize last 7 days
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dayName = days[date.getDay()];
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            chartDataMap.set(dateStr, { day: dayName, val: 0, date: dateStr });
        }

        trips.forEach(trip => {
            const date = trip.createdAt instanceof Date ? trip.createdAt : new Date(trip.createdAt);
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (chartDataMap.has(dateStr)) {
                const existing = chartDataMap.get(dateStr);
                chartDataMap.set(dateStr, { ...existing, val: existing.val + (trip.estimatedFare || 0) });
            }
        });

        return Array.from(chartDataMap.values());
    };

    const chartData = getChartData();

    const milestones = [
        { label: 'Weekly Goal', current: realTimeEarnings, target: Math.max(15000, realTimeEarnings + 5000), icon: 'military_tech' },
        { label: 'Trip Target', current: trips.length, target: Math.max(150, trips.length + 20), icon: 'local_taxi' },
    ];

    // Mock settlements - as these would come from a different collection/logic
    const withdrawalHistory = [
        { id: 'WD-PREV', date: 'Last Month', amount: 0, method: 'Automatic', status: 'Completed' },
    ];

    return (
        <div className="h-dvh bg-[#0A0E12] text-white font-sans flex flex-col lg:flex-row overflow-hidden pb-safe">
            {/* Nav Rail / Sidebar */}
            <aside className="w-full lg:w-[320px] bg-[#0A0E12] border-r border-white/10 flex flex-col h-[40dvh] lg:h-full shrink-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
                <div className="flex items-center gap-3 mb-10">
                    <button onClick={() => navigate(-1)} className="material-symbols-outlined text-slate-400 hover:text-white transition-colors">arrow_back</button>
                    <div>
                        <h1 className="text-xl font-black italic tracking-tighter uppercase leading-none">Gaadiwala <span className={accentText}>Bank</span></h1>
                        <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] mt-0.5">Financial HQ</p>
                    </div>
                </div>

                <nav className="space-y-2 mb-10">
                    <button
                        onClick={() => setActiveTab('earnings')}
                        className={`w-full flex items-center justify-between px-6 py-4 rounded-[1.5rem] transition-all group ${activeTab === 'earnings' ? `${accentBg} text-black font-black shadow-xl` : 'text-slate-400 hover:bg-white/5'}`}
                    >
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
                            <span className="text-xs font-black uppercase tracking-widest leading-none">Wallet</span>
                        </div>
                        {activeTab === 'earnings' && <span className="material-symbols-outlined text-sm">check_circle</span>}
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`w-full flex items-center justify-between px-6 py-4 rounded-[1.5rem] transition-all group ${activeTab === 'history' ? `${accentBg} text-black font-black shadow-xl` : 'text-slate-400 hover:bg-white/5'}`}
                    >
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-[20px]">history</span>
                            <span className="text-xs font-black uppercase tracking-widest leading-none">History</span>
                        </div>
                    </button>
                </nav>

                <div className="space-y-6">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] px-2 mb-4">Live Milestones</h3>
                    {milestones.map((m, i) => (
                        <div key={i} className="bg-white/5 border border-white/5 p-5 rounded-[2rem] space-y-3 group hover:border-white/10 transition-all">
                            <div className="flex justify-between items-start">
                                <div className={`size-8 rounded-xl ${accentBg}/10 flex items-center justify-center ${accentText}`}>
                                    <span className="material-symbols-outlined text-sm">{m.icon}</span>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black">₹{m.current.toLocaleString()}</p>
                                    <p className="text-[8px] font-bold text-slate-500 uppercase">Target: {m.target.toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">{m.label}</p>
                                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className={`${accentBg} h-full rounded-full transition-all duration-1000`}
                                        style={{ width: `${Math.min(100, (m.current / m.target) * 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-auto pt-10">
                    <div className="p-6 bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/20 rounded-[2.5rem] relative overflow-hidden">
                        <span className="material-symbols-outlined absolute -bottom-4 -right-4 text-7xl opacity-5">celebration</span>
                        <h4 className="text-xs font-black text-orange-500 uppercase tracking-widest mb-1">Weekly Bonus</h4>
                        <p className="text-lg font-black text-white italic">₹2,500 Extra</p>
                        <p className="text-[9px] text-slate-400 mt-2 font-medium">Earn more reaching targets consistently.</p>
                    </div>
                </div>
            </aside>

            {/* Main Area */}
            <main
                ref={mainScrollRef}
                className="flex-1 p-4 sm:p-6 lg:p-12 h-[60dvh] lg:h-full overflow-y-auto relative"
            >
                <ScrollHint containerRef={mainScrollRef} />
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`material-symbols-outlined ${accentText} text-sm`}>verified</span>
                            <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">{isPink ? 'Pink Partner' : 'Certified Partner'} Account</span>
                        </div>
                        <h2 className="text-5xl font-black tracking-tight leading-none italic uppercase">
                            {activeTab === 'earnings' ? 'Earnings' : 'Trip History'}
                        </h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:border-white/20 transition-all active:scale-95">
                            <span className="material-symbols-outlined text-[18px]">file_download</span>
                            Download Report
                        </button>
                    </div>
                </header>

                {!loading && activeTab === 'earnings' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
                        <div className="bg-[#161B22] p-6 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
                            <div className={`absolute top-0 right-0 p-4 ${accentText} opacity-10 group-hover:opacity-20 transition-opacity`}>
                                <span className="material-symbols-outlined text-4xl">payments</span>
                            </div>
                            <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Today's Earnings</p>
                            <h3 className="text-3xl font-black text-white">₹{
                                trips.filter(t => {
                                    const date = t.createdAt instanceof Date ? t.createdAt : new Date(t.createdAt);
                                    return date.toDateString() === new Date().toDateString();
                                }).reduce((acc, curr) => acc + (curr.estimatedFare || 0), 0)
                            }</h3>
                        </div>
                        <div className="bg-[#161B22] p-6 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
                            <div className={`absolute top-0 right-0 p-4 ${accentText} opacity-10 group-hover:opacity-20 transition-opacity`}>
                                <span className="material-symbols-outlined text-4xl">local_taxi</span>
                            </div>
                            <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Total Trips</p>
                            <h3 className="text-3xl font-black text-white">{
                                trips.filter(t => {
                                    const date = t.createdAt instanceof Date ? t.createdAt : new Date(t.createdAt);
                                    return date.toDateString() === new Date().toDateString();
                                }).length
                            } Rides</h3>
                        </div>
                        <div className="bg-[#161B22] p-6 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
                            <div className={`absolute top-0 right-0 p-4 ${accentText} opacity-10 group-hover:opacity-20 transition-opacity`}>
                                <span className="material-symbols-outlined text-4xl">trending_up</span>
                            </div>
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Forecast (4h)</p>
                                <span className={`${accentText} text-[9px] font-black uppercase`}>Live</span>
                            </div>
                            <h3 className="text-3xl font-black text-white">~₹200</h3>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className={`size-12 border-4 ${accentBorder} border-t-transparent rounded-full animate-spin`}></div>
                    </div>
                ) : activeTab === 'earnings' ? (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Wallet Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            <div className="lg:col-span-7 bg-[#161B22] p-8 md:p-12 rounded-[3.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                                <div className={`absolute top-0 right-0 p-8 ${accentText} opacity-10 group-hover:opacity-20 transition-opacity`}>
                                    <span className="material-symbols-outlined text-[100px]">account_balance_wallet</span>
                                </div>
                                <div className="relative z-10">
                                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 mb-4">Total Balance</p>
                                    <div className="flex items-baseline gap-2">
                                        <h3 className="text-6xl md:text-7xl font-black italic tracking-tighter">₹{realTimeEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                                    </div>

                                    <div className="mt-12 space-y-6">
                                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Select Payout Channel</p>
                                        <div className="grid grid-cols-3 gap-4">
                                            {(['bank', 'paypal', 'deposit'] as const).map(method => (
                                                <button
                                                    key={method}
                                                    onClick={() => setPayoutMethod(method)}
                                                    className={`flex flex-col items-center gap-2 p-5 rounded-[1.5rem] border transition-all ${payoutMethod === method ? `${accentBorder} bg-white/5 text-white ${accentShadow}` : 'border-white/5 text-slate-600 hover:text-slate-400 hover:bg-white/5'}`}
                                                >
                                                    <span className="material-symbols-outlined text-2xl">{method === 'bank' ? 'account_balance' : method === 'paypal' ? 'payments' : 'smartphone'}</span>
                                                    <span className="text-[9px] font-black uppercase tracking-widest">{method}</span>
                                                </button>
                                            ))}
                                        </div>
                                        <button className={`w-full ${accentBg} text-black py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98] mt-4 flex items-center justify-center gap-3`}>
                                            Request Withdrawal <span className="material-symbols-outlined text-sm font-black">arrow_outward</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-5 flex flex-col gap-6">
                                <DriverPricingSlider cityBase={40} currentBase={44} onUpdate={(val) => console.log('Update', val)} />
                                <div className="bg-[#161B22] p-8 rounded-[3rem] border border-white/5 flex flex-col justify-between group flex-1">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-4">Loyalty Tier</h4>
                                            <div className="flex items-center gap-3">
                                                <div className="size-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-amber-500">
                                                    <span className="material-symbols-outlined text-3xl">workspace_premium</span>
                                                </div>
                                                <div>
                                                    <p className="text-xl font-black text-white italic">GOLD PARTNER</p>
                                                    <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Top 2% Globally</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-8 space-y-2">
                                        <div className="flex justify-between text-[10px] font-black uppercase"><span className="text-slate-500">Tier Progress</span><span className="text-amber-500">88%</span></div>
                                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden p-0.5">
                                            <div className="h-full bg-amber-500 rounded-full" style={{ width: '88%' }}></div>
                                        </div>
                                        <p className="text-[9px] text-slate-500 font-bold italic mt-2">Maintain 4.8+ rating to stay in Gold tier next month.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Chart Area */}
                        <div className="bg-[#161B22] p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[3.5rem] border border-white/5 overflow-hidden">
                            <div className="flex items-center justify-between mb-12">
                                <div>
                                    <h3 className="text-xl font-black tracking-tight text-white mb-1 uppercase italic">Weekly Forensics</h3>
                                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Performance Insights</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2"><div className={`size-2 rounded-full ${accentBg}`}></div><span className="text-[10px] font-black uppercase text-slate-300">Net Revenue</span></div>
                                </div>
                            </div>
                            <div className="h-80 w-full pr-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={isPink ? '#F472B6' : '#00D1FF'} stopOpacity={0.3} />
                                                <stop offset="95%" stopColor={isPink ? '#F472B6' : '#00D1FF'} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="rgba(255,255,255,0.03)" />
                                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#475569' }} dy={15} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#475569' }} />
                                        <Tooltip content={<CustomTooltip accentColor={accentBg} />} cursor={{ stroke: isPink ? '#F472B6' : '#00D1FF', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                        <Area
                                            type="monotone"
                                            dataKey="val"
                                            stroke={isPink ? '#F472B6' : '#00D1FF'}
                                            strokeWidth={4}
                                            fillOpacity={1}
                                            fill="url(#colorVal)"
                                            animationDuration={2000}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Withdrawals History Simple */}
                        <div className="bg-[#161B22] rounded-[3.5rem] border border-white/5 overflow-hidden">
                            <div className="px-10 py-8 border-b border-white/5 bg-white/2 overflow-hidden flex justify-between items-center">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em]">Recent Settlements</h3>
                                <span className="text-[10px] font-black text-slate-500 uppercase italic">Last 4 weeks</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-white/5">
                                            <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-500 tracking-widest">Reference</th>
                                            <th className="px-6 py-6 text-[10px] font-black uppercase text-slate-500 tracking-widest">Timestamp</th>
                                            <th className="px-6 py-6 text-[10px] font-black uppercase text-slate-500 tracking-widest">Quantum</th>
                                            <th className="px-6 py-6 text-[10px] font-black uppercase text-slate-500 tracking-widest">Gateway</th>
                                            <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">State</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/2">
                                        {withdrawalHistory.map((item) => (
                                            <tr key={item.id} className="hover:bg-white/5 transition-all">
                                                <td className="px-10 py-6 text-xs font-black text-slate-400">{item.id}</td>
                                                <td className="px-6 py-6 text-xs font-bold text-white">{item.date}</td>
                                                <td className="px-6 py-6 text-sm font-black text-white italic">₹{item.amount.toLocaleString()}</td>
                                                <td className="px-6 py-6 text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest transition-colors cursor-pointer">{item.method}</td>
                                                <td className="px-10 py-6 text-right">
                                                    <span className={`px-3 py-1 ${item.amount > 0 ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-white/5 text-slate-500 border-white/10'} font-black rounded-lg text-[10px] uppercase border`}>
                                                        {item.amount > 0 ? 'Success' : 'NA'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-[#161B22] rounded-[3.5rem] border border-white/5 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="px-10 py-8 border-b border-white/5 flex justify-between items-center">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em]">Partner Log</h3>
                            <div className="flex gap-2">
                                <div className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-black uppercase text-slate-400 border border-white/10">All Trips ({trips.length})</div>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-500 tracking-wider">Ride Identity</th>
                                        <th className="px-6 py-6 text-[10px] font-black uppercase text-slate-500 tracking-wider">Execution Date</th>
                                        <th className="px-6 py-6 text-[10px] font-black uppercase text-slate-500 tracking-wider">Waypoints</th>
                                        <th className="px-6 py-6 text-[10px] font-black uppercase text-slate-500 tracking-wider text-center">Efficiency</th>
                                        <th className="px-6 py-6 text-[10px] font-black uppercase text-slate-500 tracking-wider text-right">Yield</th>
                                        <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-500 tracking-wider text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/2">
                                    {trips.map(trip => (
                                        <tr key={trip.id} className="hover:bg-white/5 transition-all group">
                                            <td className="px-10 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className={`size-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-500 group-hover:${accentText} transition-colors`}>
                                                        <span className="material-symbols-outlined text-[18px]">
                                                            {trip.vehicleType === VehicleCategory.BIKE ? 'motorcycle' :
                                                                trip.vehicleType === VehicleCategory.AUTO ? 'rickshaw' : 'directions_car'}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs font-black text-white">{trip.id.substring(0, 8).toUpperCase()}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6 text-xs font-bold text-slate-400">
                                                {trip.createdAt instanceof Date ? trip.createdAt.toLocaleDateString() : '---'}
                                            </td>
                                            <td className="px-6 py-6">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <div className="size-1.5 rounded-full bg-green-500"></div>
                                                        <span className="text-[10px] font-black text-white uppercase tracking-tighter truncate max-w-[150px]">{trip.pickupAddress}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="size-1.5 rounded-full bg-orange-500 animate-pulse"></div>
                                                        <span className="text-[10px] font-black text-white uppercase tracking-tighter truncate max-w-[150px]">{trip.dropAddress}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6 text-center">
                                                <div className="flex justify-center gap-0.5">
                                                    {[...Array(5)].map((_, i) => (
                                                        <span key={i} className={`material-symbols-outlined text-[10px] ${(trip.rating || 5) > i ? 'text-amber-400' : 'text-slate-800'}`}>star</span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-6 text-right text-sm font-black text-white italic">₹{trip.estimatedFare}</td>
                                            <td className="px-10 py-6 text-right">
                                                <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase border ${trip.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                                    {trip.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {trips.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-10 py-12 text-center text-slate-500 font-bold uppercase tracking-widest">No trip history found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Earnings;
