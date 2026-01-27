import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const EmailComplete: React.FC = () => {
    const { completeEmailAuth } = useAuth();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'VERIFYING' | 'SUCCESS' | 'ERROR'>('VERIFYING');

    useEffect(() => {
        const verify = async () => {
            // Basic fallback if email is missing from local storage is handled inside completeEmailAuth (prompt)
            // But we can check for emailForSignIn here too if we want a custom UI for it.
            // For now, rely on AuthContext logic.
            try {
                const user = await completeEmailAuth(window.localStorage.getItem('emailForSignIn') || '');
                if (user) {
                    setStatus('SUCCESS');
                    setTimeout(() => navigate('/'), 2000);
                } else {
                    setStatus('ERROR');
                }
            } catch (e) {
                console.error(e);
                setStatus('ERROR');
            }
        };
        verify();
    }, [completeEmailAuth, navigate]);

    return (
        <div className="flex flex-col items-center justify-center min-h-dvh bg-[#0A0E12] p-6 font-sans relative overflow-hidden pb-safe">
            <div className="absolute inset-0 bg-gradient-to-br from-[#22c55e]/5 to-transparent pointer-events-none"></div>
            <div className="bg-[#161B22] p-10 rounded-[2.5rem] border border-white/5 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] max-w-sm w-full text-center relative z-10 animate-in zoom-in-95 duration-700">
                {status === 'VERIFYING' && (
                    <>
                        <div className="mx-auto size-16 border-[5px] border-white/5 border-t-[#22c55e] rounded-full animate-spin mb-8 shadow-2xl"></div>
                        <h2 className="text-2xl font-black mb-3 italic tracking-tighter uppercase text-white">Securing Link</h2>
                        <p className="text-slate-500 text-sm font-medium italic">Validating cryptographic credentials...</p>
                    </>
                )}
                {status === 'SUCCESS' && (
                    <>
                        <span className="material-symbols-outlined text-6xl text-[#22c55e] mb-6 font-black scale-110 drop-shadow-[0_0_15px_rgba(34,197,94,0.4)]">verified_user</span>
                        <h2 className="text-2xl font-black mb-3 italic tracking-tighter uppercase text-white">Authorized</h2>
                        <p className="text-slate-500 text-sm font-medium italic">Handshake successful. Initializing ecosystem access...</p>
                    </>
                )}
                {status === 'ERROR' && (
                    <>
                        <span className="material-symbols-outlined text-6xl text-red-500 mb-6 font-black scale-110 animate-pulse">error</span>
                        <h2 className="text-2xl font-black mb-3 italic tracking-tighter uppercase">Link Expired</h2>
                        <p className="text-slate-500 text-sm mb-10 font-medium italic">Security protocol: This sign-in link is no longer valid. Please request a new authentication vector.</p>
                        <button onClick={() => navigate('/')} className="w-full h-14 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-200 transition-all italic shadow-xl">Back to Base</button>
                    </>
                )}
            </div>
        </div>
    );
};

export default EmailComplete;
