import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const GlobalBanner: React.FC = () => {
    const [broadcast, setBroadcast] = useState<{ message: string, active: boolean, id: string } | null>(null);
    const [dismissedId, setDismissedId] = useState<string | null>(null);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'system', 'broadcast'), (doc) => {
            if (doc.exists()) {
                setBroadcast(doc.data() as any);
            }
        });
        return () => unsub();
    }, []);

    if (!broadcast || !broadcast.active || broadcast.id === dismissedId) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-[100] animate-in slide-in-from-top duration-500">
            <div className="bg-orange-600 text-white px-6 py-4 flex items-center justify-between shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-transparent"></div>
                <div className="flex items-center gap-4 relative z-10">
                    <div className="size-8 bg-white/20 rounded-lg flex items-center justify-center animate-bounce">
                        <span className="material-symbols-outlined text-[20px]">campaign</span>
                    </div>
                    <p className="text-sm font-black uppercase tracking-widest">{broadcast.message}</p>
                </div>
                <button
                    onClick={() => setDismissedId(broadcast.id)}
                    className="size-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors relative z-10"
                >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
            </div>
        </div>
    );
};

export default GlobalBanner;
