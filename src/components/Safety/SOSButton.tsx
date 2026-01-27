import React, { useState, useEffect } from 'react';

interface Props {
    onTrigger: () => void;
}

const SOSButton: React.FC<Props> = ({ onTrigger }) => {
    const [isPressed, setIsPressed] = useState(false);
    const [counter, setCounter] = useState(3);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isPressed && counter > 0) {
            timer = setInterval(() => setCounter(c => c - 1), 1000);
        } else if (isPressed && counter === 0) {
            onTrigger();
            setIsPressed(false);
            setCounter(3);
        }
        return () => clearInterval(timer);
    }, [isPressed, counter, onTrigger]);

    const handlePress = () => {
        setIsPressed(true);
    };

    const handleCancel = () => {
        setIsPressed(false);
        setCounter(3);
    };

    return (
        <div className="w-full">
            {!isPressed ? (
                <button
                    className="w-full h-12 bg-red-600/10 border border-red-600/20 rounded-2xl flex items-center justify-center gap-2 text-red-600 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-red-600 hover:text-white transition-all shadow-lg active:scale-95 italic"
                    onClick={handlePress}
                >
                    <span className="material-symbols-outlined text-sm font-black">report_gmailerrorred</span>
                    SOS Protocol
                </button>
            ) : (
                <div className="w-full h-12 bg-red-600 rounded-2xl flex items-center justify-between px-6 animate-pulse shadow-[0_0_30px_rgba(220,38,38,0.4)]">
                    <p className="text-[10px] font-black uppercase text-white tracking-widest italic">Triggering in {counter}s...</p>
                    <button
                        className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-lg text-[8px] font-black uppercase border border-white/20 transition-all"
                        onClick={handleCancel}
                    >
                        Abort
                    </button>
                </div>
            )}
        </div>
    );
};

export default SOSButton;
