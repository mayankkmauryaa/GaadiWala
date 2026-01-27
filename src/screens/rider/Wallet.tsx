import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ScrollHint from '../../components/shared/ScrollHint';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { WalletTransaction } from '../../types';
import { initializePayment, topUpWallet } from '../../services/api/payment';

const Wallet: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
    const [showTopUp, setShowTopUp] = useState(false);
    const [amount, setAmount] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const mainScrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, 'transactions'),
            where('userId', '==', user.id),
            orderBy('timestamp', 'desc'),
            limit(20)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WalletTransaction)));
        });

        return () => unsubscribe();
    }, [user]);

    const handleTopUp = async () => {
        if (!user || !amount || isNaN(Number(amount)) || Number(amount) <= 0) return;
        setIsProcessing(true);

        try {
            const topUpAmount = Number(amount);

            // 1. Initialize Razorpay Payment
            const res: any = await initializePayment({
                amount: topUpAmount,
                userName: user.name,
                userEmail: user.email,
                userPhone: user.phone,
                description: `Wallet Top-up: ₹${topUpAmount}`
            });

            if (res.success) {
                // 2. Update Balance & Transactions through Service
                await topUpWallet(user.id, topUpAmount, res.paymentId);

                setShowTopUp(false);
                setAmount('');
            }
        } catch (error: any) {
            console.error("Top-up failed", error);
            alert(error.message || "Payment failed. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div
            ref={mainScrollRef}
            className="bg-[#0A0E12] h-dvh flex flex-col font-sans mb-20 md:mb-0 text-white pb-safe relative overflow-y-auto"
        >
            <ScrollHint containerRef={mainScrollRef} />
            {/* Header */}
            <header className="bg-[#161B22] border-b border-white/10 px-6 py-4 sticky top-0 z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                        <span className="material-symbols-outlined text-slate-400">arrow_back</span>
                    </button>
                    <h2 className="text-xl font-black italic tracking-tighter uppercase">Vault <span className="text-[#00D1FF] not-italic font-medium text-xs ml-2 tracking-widest uppercase opacity-50">v1.2</span></h2>
                </div>
            </header>

            <main className="flex-1 p-6 max-w-2xl mx-auto w-full space-y-8 animate-in fade-in duration-500">
                {/* Balance Card - Premium "Ops" Look */}
                <div className="bg-[#161B22] rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-10 border border-[#00D1FF]/20 relative overflow-hidden shadow-2xl shadow-[#00D1FF]/5 group">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#00D1FF]/5 to-transparent pointer-events-none"></div>
                    <div className="absolute -top-10 -right-10 p-12 opacity-[0.03] rotate-12 group-hover:rotate-45 transition-transform duration-1000">
                        <span className="material-symbols-outlined text-[12rem] text-[#00D1FF]">payments</span>
                    </div>

                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-4 flex items-center gap-2">
                            <span className="size-1.5 bg-[#00D1FF] rounded-full animate-pulse shadow-[0_0_8px_#00D1FF]"></span>
                            Available Reserve
                        </p>
                        <h1 className="text-6xl font-black mb-10 tracking-tighter italic">₹{user?.walletBalance || 0}</h1>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowTopUp(true)}
                                className="flex-1 bg-[#00D1FF] text-black py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-[#00D1FF]/20 flex items-center justify-center gap-3 italic"
                            >
                                <span className="material-symbols-outlined font-black">add</span>
                                Add Funds
                            </button>
                        </div>
                    </div>
                </div>

                {/* History */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-3">
                            <span className="material-symbols-outlined text-sm">history</span>
                            Protocol Logs
                        </h3>
                        <span className="text-[9px] font-black text-[#00D1FF] uppercase tracking-widest bg-[#00D1FF]/10 px-2 py-0.5 rounded italic">Realtime</span>
                    </div>

                    <div className="space-y-3">
                        {transactions.length === 0 ? (
                            <div className="text-center py-20 bg-[#161B22] rounded-[2.5rem] border border-white/5 border-dashed">
                                <span className="material-symbols-outlined text-5xl text-slate-800 mb-4 font-black">data_alert</span>
                                <p className="text-slate-600 font-black text-[10px] uppercase tracking-widest italic">Zero Log Entries Detected</p>
                            </div>
                        ) : (
                            transactions.map(tx => (
                                <div key={tx.id} className="bg-[#161B22] p-6 rounded-3xl border border-white/5 hover:border-[#00D1FF]/20 transition-all duration-300 flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className={`size-12 rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-12 ${tx.type === 'CREDIT' ? 'bg-green-500/10 text-green-500' : 'bg-[#00D1FF]/10 text-[#00D1FF]'}`}>
                                            <span className="material-symbols-outlined text-xl">{tx.type === 'CREDIT' ? 'north_east' : 'south_west'}</span>
                                        </div>
                                        <div>
                                            <p className="font-black text-xs text-white uppercase italic tracking-tight">{tx.description}</p>
                                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-0.5">{new Date(tx.timestamp).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-xl font-black italic ${tx.type === 'CREDIT' ? 'text-green-500' : 'text-white'}`}>
                                            {tx.type === 'CREDIT' ? '+' : '-'}₹{tx.amount}
                                        </p>
                                        {tx.metadata?.paymentId && (
                                            <p className="text-[7px] text-slate-700 font-black uppercase tracking-tighter mt-1">{tx.metadata.paymentId}</p>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main>

            {/* Top Up Modal - Premium Ops Style */}
            {showTopUp && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-[#161B22] w-full max-w-lg rounded-[3rem] p-10 border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-20 duration-500">
                        <div className="flex justify-between items-start mb-10">
                            <div>
                                <p className="text-[#00D1FF] text-[9px] font-black uppercase tracking-[0.4em] mb-1 italic">Protocol Alpha</p>
                                <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">Initiate <span className="text-[#00D1FF] not-italic">Fund</span> Transfer</h3>
                            </div>
                            <button onClick={() => setShowTopUp(false)} className="size-12 bg-white/5 rounded-2xl flex items-center justify-center hover:bg-white/10 transition-colors">
                                <span className="material-symbols-outlined text-white font-black">close</span>
                            </button>
                        </div>

                        <div className="space-y-8">
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 block italic">Nominal Value (INR)</label>
                                <div className="relative group">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl font-black text-[#00D1FF] group-focus-within:scale-125 transition-transform duration-500">₹</span>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 focus:border-[#00D1FF]/50 rounded-3xl py-8 pl-14 pr-8 text-5xl font-black outline-none transition-all placeholder:text-slate-800 italic"
                                        placeholder="0.00"
                                        autoFocus
                                    />
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-end">
                                        <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">Secured Node</span>
                                        <span className="text-[8px] font-black text-[#00D1FF] uppercase tracking-widest">Razorpay SDK v2</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 pb-2 overflow-x-auto no-scrollbar scroll-smooth">
                                {[100, 200, 500, 1000, 2000].map(val => (
                                    <button
                                        key={val}
                                        onClick={() => setAmount(val.toString())}
                                        className="px-6 py-3 rounded-2xl bg-white/5 border border-white/5 text-[10px] font-black text-white hover:bg-[#00D1FF]/10 hover:border-[#00D1FF]/30 hover:text-[#00D1FF] transition-all whitespace-nowrap italic tracking-widest"
                                    >
                                        + ₹{val}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={handleTopUp}
                                disabled={isProcessing || !amount}
                                className="w-full h-20 bg-[#00D1FF] text-black rounded-[1.5rem] font-black uppercase tracking-[0.3em] text-xs hover:scale-[1.01] hover:brightness-110 disabled:opacity-30 disabled:grayscale transition-all flex items-center justify-center gap-4 italic relative overflow-hidden group shadow-2xl shadow-[#00D1FF]/20"
                            >
                                <div className="absolute inset-x-0 bottom-0 h-1 bg-black/20 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-[2000ms]"></div>
                                {isProcessing ? (
                                    <>
                                        <span className="size-5 border-[3px] border-black/30 border-t-black rounded-full animate-spin"></span>
                                        Processing Protocol...
                                    </>
                                ) : (
                                    <>
                                        Authorize Transfer
                                        <span className="material-symbols-outlined font-black">verified_user</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Wallet;
