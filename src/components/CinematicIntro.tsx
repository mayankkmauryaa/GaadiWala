import React, { useState, useEffect } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

interface Props {
    onComplete: () => void;
}

const CinematicIntro: React.FC<Props> = ({ onComplete }) => {
    const count = useSpring(0, { duration: 3500, bounce: 0 }); // Slightly longer for car movement
    const rounded = useTransform(count, (latest) => Math.round(latest));
    const [displayCount, setDisplayCount] = useState(0);
    const [bootLogs, setBootLogs] = useState<string[]>([]);

    useEffect(() => {
        // Start the counter
        count.set(100);

        const unsubscribe = rounded.on("change", (v) => {
            setDisplayCount(v);
            if (v === 100) {
                setTimeout(onComplete, 1200); // Slightly more time to show 100% and car at end
            }
        });

        return () => unsubscribe();
    }, [count, rounded, onComplete]);

    // Hacker Boot Logs Effect (refined)
    useEffect(() => {
        const logs = [
            "Initializing Gaadiwala OS kernel...",
            "Loading geospatial data modules...",
            "Bypassing grid restrictions...",
            "Syncing satellite coordinates...",
            "Optimizing fleet algorithms...",
            "Secure channel: ESTABLISHED",
            "Environment check: CRITICAL",
            "System integrity: 100%",
        ];

        let delay = 0;
        logs.forEach((log) => {
            delay += Math.random() * 400 + 100;
            setTimeout(() => {
                setBootLogs(prev => [...prev.slice(-3), `> ${log}`]);
            }, delay);
        });
    }, []);

    // SVG Path for the car to follow
    const pathData = "M -50 400 Q 100 100 400 300 T 850 100 L 1200 400";
    // For mobile we might need a different path or just scale
    // But since it's cinematic, a fixed relative path is fine if responsive

    return (
        <div className="fixed inset-0 z-[99999] pointer-events-none font-mono overflow-hidden">
            <motion.div
                className="absolute inset-0 z-50 bg-[#050505] flex flex-col items-center justify-center text-white"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ y: "-100%", transition: { duration: 0.8, ease: [0.76, 0, 0.24, 1] } }}
            >
                {/* 1. Corner Metadata Decorations */}
                {/* Top Left */}
                <div className="absolute top-6 left-8 flex flex-col gap-1 border-l-2 border-[#22c55e] pl-4 opacity-40">
                    <p className="text-[10px] font-black tracking-widest uppercase">Gaadiwala <span className="text-[#22c55e]">OS_CORE</span></p>
                    <p className="text-[8px] text-slate-500 tracking-[0.3em]">LOC_CORE: 27.4924N 77.6737E</p>
                    <p className="text-[8px] text-slate-500 tracking-[0.3em]">SYS_VER: 4.2.0-STABLE</p>
                </div>

                {/* Top Right */}
                <div className="absolute top-6 right-8 text-right flex flex-col gap-1 border-r-2 border-[#22c55e] pr-4 opacity-40">
                    <p className="text-[10px] font-black tracking-widest uppercase text-[#22c55e]">SYNC_ACTIVE</p>
                    <p className="text-[8px] text-slate-500 tracking-[0.3em]">NET_SPEED: 450 MBPS</p>
                    <p className="text-[8px] text-slate-500 tracking-[0.3em]">SIG_STRENGTH: 98%</p>
                </div>

                {/* Bottom Left */}
                <div className="absolute bottom-10 left-8 flex flex-col gap-1 border-l-2 border-slate-700 pl-4 opacity-40">
                    <p className="text-[9px] font-bold text-slate-500 tracking-widest uppercase mb-1">Environmental Status</p>
                    <div className="flex items-center gap-2">
                        <span className="size-1 bg-[#22c55e] rounded-full animate-pulse"></span>
                        <p className="text-[8px] tracking-[0.2em] italic">GEOSPATIAL_GRID: OK</p>
                    </div>
                </div>

                {/* Bottom Right */}
                <div className="absolute bottom-10 right-8 text-right flex flex-col gap-1 border-r-2 border-slate-700 pr-4 opacity-40">
                    <p className="text-[9px] font-bold text-slate-500 tracking-widest uppercase">Memory Allocation</p>
                    <p className="text-[8px] tracking-[0.2em] italic text-[#22c55e]">MEM_RESERVE: [######----]</p>
                </div>

                {/* 2. Full-Screen Grid & Scanning Line */}
                <div className="absolute inset-0 opacity-[0.05]"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(34, 197, 94, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 197, 94, 0.15) 1px, transparent 1px)',
                        backgroundSize: '50px 50px'
                    }}>
                </div>
                <motion.div
                    className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#22c55e]/50 to-transparent z-10"
                    animate={{ top: ["0%", "100%", "0%"] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                />

                {/* 3. The Path and Moving Car */}
                <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none overflow-visible">
                    <svg width="100%" height="100%" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid meet" className="overflow-visible">
                        {/* Define the path car will follow */}
                        <path
                            id="loading-path"
                            d="M 50 400 Q 200 100 500 250 T 950 150"
                            fill="none"
                            stroke="#22c55e"
                            strokeWidth="1"
                            strokeDasharray="5,5"
                        />

                        {/* Car Icon following the path */}
                        <motion.g
                            initial={{ x: 50, y: 400, rotate: -60 }}
                            style={{
                                offsetPath: "path('M 50 400 Q 200 100 500 250 T 950 150')",
                                offsetDistance: useTransform(count, [0, 100], ["0%", "100%"]),
                                offsetRotate: "auto"
                            }}
                        >
                            <circle r="12" fill="#22c55e" className="animate-pulse" />
                            <text x="-8" y="6" fontSize="16" className="material-symbols-outlined text-black" style={{ fill: "black" }}>local_taxi</text>

                            {/* Glow behind car */}
                            <circle r="20" fill="#22c55e" fillOpacity="0.2" className="animate-ping" />
                        </motion.g>
                    </svg>
                </div>

                {/* 4. Central Content */}
                <div className="relative z-20 flex flex-col items-center">
                    {/* Retro Bracket Title */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mb-8 flex items-center gap-4 text-slate-500"
                    >
                        <span className="text-4xl font-light opacity-30">[</span>
                        <p className="text-xs font-black uppercase tracking-[1em] italic text-[#22c55e]">Initializing Core</p>
                        <span className="text-4xl font-light opacity-30">]</span>
                    </motion.div>

                    {/* Giant Number Counter */}
                    <div className="relative mb-12 transform scale-125 sm:scale-150">
                        <div className="flex items-baseline leading-none">
                            <motion.span
                                className="text-[6rem] sm:text-[10rem] font-black tracking-tighter mix-blend-overlay"
                                style={{
                                    backgroundImage: 'linear-gradient(to bottom, #ffffff, #22c55e)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                }}
                            >
                                {displayCount}
                            </motion.span>
                            <span className="text-2xl sm:text-4xl font-black text-[#22c55e] mb-4 sm:mb-8">%</span>
                        </div>
                    </div>

                    {/* Boot Log Terminal (more compact) */}
                    <div className="w-64 sm:w-80 bg-black/80 border border-white/10 rounded-xl p-6 font-mono text-[9px] shadow-2xl backdrop-blur-md relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-[#22c55e] opacity-30"></div>
                        <div className="space-y-1.5 min-h-[60px] flex flex-col justify-end">
                            {bootLogs.map((log, i) => (
                                <motion.p
                                    key={i}
                                    initial={{ opacity: 0, x: -5 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="text-[#22c55e]/90 tracking-wider flex items-center gap-2"
                                >
                                    <span className="size-1 bg-[#22c55e]/50 rounded-full"></span>
                                    {log}
                                </motion.p>
                            ))}
                            <motion.span
                                animate={{ opacity: [0, 1, 0] }}
                                transition={{ repeat: Infinity, duration: 0.8 }}
                                className="w-2 h-3 bg-[#22c55e] inline-block mt-1"
                            />
                        </div>
                    </div>
                </div>

                {/* Final System Tag */}
                <div className="absolute top-1/2 -translate-y-1/2 -left-12 rotate-90 hidden xl:block">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.5em] italic">AUTONOMOUS_FLEET_PROTOCOL_ACTIVE</p>
                </div>
                <div className="absolute top-1/2 -translate-y-1/2 -right-12 -rotate-90 hidden xl:block">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.5em] italic">QUANTUM_ROUTING_STABLE</p>
                </div>

            </motion.div>
        </div>
    );
};

export default CinematicIntro;
