import React from 'react';

interface MetricsProps {
    usersCount: number;
    activeDriversCount: number;
    pendingDriversCount: number;
    tiffinOrdersCount: number;
    revenue: number;
    tiffinRevenue: number;
}

const DashboardMetrics: React.FC<MetricsProps> = ({
    usersCount,
    activeDriversCount,
    pendingDriversCount,
    tiffinOrdersCount,
    revenue,
    tiffinRevenue
}) => {
    const cards = [
        {
            label: 'Network Nodes',
            sub: 'Active Riders',
            value: usersCount,
            trend: '+12.5%',
            icon: 'person',
            color: 'text-blue-400',
            bg: 'bg-blue-400/10'
        },
        {
            label: 'Mobile Fleet',
            sub: `${pendingDriversCount} PENDING APPROVAL`,
            value: activeDriversCount,
            trend: 'Live',
            icon: 'directions_car',
            color: 'text-[#00D1FF]',
            bg: 'bg-[#00D1FF]/10'
        },
        {
            label: 'Supply Chain',
            sub: 'Food Deliveries',
            value: tiffinOrdersCount,
            trend: `₹${tiffinRevenue} Rev`,
            icon: 'restaurant',
            color: 'text-orange-500',
            bg: 'bg-orange-500/10'
        },
        {
            label: 'Gross Volume',
            sub: 'Revenue Matrix',
            value: `₹${revenue + tiffinRevenue}`,
            trend: 'Safe',
            icon: 'payments',
            color: 'text-emerald-400',
            bg: 'bg-emerald-400/10'
        }
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {cards.map((card, i) => (
                <div key={i} className="bg-[#161B22] border border-white/5 p-6 sm:p-8 rounded-[2.5rem] relative overflow-hidden group shadow-xl">
                    <div className={`absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-all duration-700 ${card.color}`}>
                        <span className="material-symbols-outlined text-7xl">{card.icon}</span>
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-1 italic">{card.label}</p>
                        <h3 className="text-4xl font-black text-white italic tracking-tighter mb-4">{card.value}</h3>
                        <div className="flex items-center justify-between mt-auto">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{card.sub}</span>
                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${card.trend === 'Live' ? 'bg-[#00D1FF]/10 text-[#00D1FF]' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                {card.trend}
                            </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default DashboardMetrics;
