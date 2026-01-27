import React from 'react';
import { motion } from 'framer-motion';

const PremiumLoader: React.FC = () => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[9999] bg-[#0A0F1D] flex flex-col items-center justify-center overflow-hidden"
        >
            {/* Dynamic Background Gradients */}
            <div className="absolute inset-0 z-0">
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.1, 0.2, 0.1]
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#22c55e] rounded-full blur-[120px]"
                />
                <motion.div
                    animate={{
                        scale: [1.2, 1, 1.2],
                        opacity: [0.05, 0.15, 0.05]
                    }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-500 rounded-full blur-[150px]"
                />
            </div>

            {/* Central Visuals */}
            <div className="relative flex items-center justify-center">
                {/* Advanced Orbiting Rings */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute w-32 h-32 border-[3px] border-[#22c55e]/5 border-t-[#22c55e] border-r-[#22c55e]/40 rounded-full shadow-[0_0_20px_rgba(34,197,94,0.2)]"
                />
                <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="absolute w-44 h-44 border-[2px] border-orange-500/5 border-b-orange-500 border-l-orange-500/30 rounded-full opacity-60"
                />
                <motion.div
                    animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.3, 0.6, 0.3]
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute w-56 h-56 border-t border-white/5 rounded-full"
                />

                {/* Core Icon Container */}
                <motion.div
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", damping: 15, stiffness: 100 }}
                    className="relative z-10"
                >
                    <motion.div
                        animate={{
                            y: [0, -10, 0],
                            boxShadow: [
                                "0 20px 40px rgba(0,0,0,0.4), 0 0 20px rgba(34,197,94,0)",
                                "0 30px 60px rgba(0,0,0,0.6), 0 0 40px rgba(34,197,94,0.3)",
                                "0 20px 40px rgba(0,0,0,0.4), 0 0 20px rgba(34,197,94,0)"
                            ]
                        }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                        className="bg-[#161B22] p-6 rounded-[2rem] border border-white/10 flex items-center justify-center"
                    >
                        <motion.span
                            animate={{ opacity: [1, 0.7, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="material-symbols-outlined text-5xl text-[#22c55e] filled"
                        >
                            directions_car
                        </motion.span>
                    </motion.div>
                </motion.div>
            </div>

            {/* Branding & Status */}
            <div className="mt-20 text-center relative z-10">
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    <h2 className="text-4xl font-black italic tracking-tighter text-white uppercase drop-shadow-2xl">
                        Gaadi<span className="text-[#22c55e]">wala</span>
                    </h2>

                    <div className="flex items-center gap-1.5 justify-center mt-3 mb-6">
                        {[0, 1, 2].map((i) => (
                            <motion.span
                                key={i}
                                animate={{
                                    scale: [1, 1.5, 1],
                                    backgroundColor: ["#22c55e33", "#22c55eff", "#22c55e33"]
                                }}
                                transition={{
                                    duration: 1,
                                    repeat: Infinity,
                                    delay: i * 0.2
                                }}
                                className="h-1.5 w-1.5 rounded-full"
                            />
                        ))}
                    </div>

                    <motion.div
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="px-6 py-2 bg-white/5 rounded-full border border-white/5 backdrop-blur-sm shadow-xl"
                    >
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] leading-none">
                            Initializing Systems
                        </p>
                    </motion.div>
                </motion.div>
            </div>

            {/* Bottom Progress Bar */}
            <div className="absolute bottom-12 w-48 h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="h-full bg-gradient-to-r from-[#22c55e] to-orange-500"
                />
            </div>
        </motion.div>
    );
};

export default PremiumLoader;
