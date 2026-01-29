
import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useClickOutside } from '../hooks/useClickOutside';
// import { AnimatePresence, motion } from 'motion/react';
import { AnimatePresence, motion } from 'framer-motion';

import { UserRole, User } from '../types';

interface Props {
    user: User;
    onLogout: () => void;
    updateUserProfile: (data: Partial<User>) => Promise<void>;
}

const NavigationOverlay: React.FC<Props> = ({ user, onLogout, updateUserProfile }) => {
    const currentRole = user.role;
    const navigate = useNavigate();
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useClickOutside(menuRef, () => setIsOpen(false));

    const menuItems = {
        [UserRole.RIDER]: [
            { path: '/user/home', label: 'Home', icon: 'home' },
            { path: '/user/profile', label: 'My Profile', icon: 'person' },
        ],
        [UserRole.DRIVER]: [
            { path: '/driver/dashboard', label: 'Command Center', icon: 'dashboard' },
            { path: '/driver/profile', label: 'My Profile', icon: 'person' },
            { path: '/driver/earnings', label: 'Earnings & Wallet', icon: 'account_balance_wallet' },
        ],
        [UserRole.ADMIN]: [
            { path: '/admin/dashboard', label: 'Global Monitor', icon: 'monitoring' },
        ],
        [UserRole.UNSET]: []
    };

    const items = menuItems[currentRole] || [];

    return (
        <>
            {/* Top Right Menu Pill */}
            <div className="fixed top-3 right-6 z-[9999]" ref={menuRef}>
                <div className="relative">
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="flex items-center gap-3 bg-slate-900 text-white pl-5 pr-4 py-2.5 rounded-full shadow-2xl hover:bg-slate-800 transition-all active:scale-95 border border-slate-800"
                    >
                        <span className="text-[10px] font-black tracking-[0.2em] uppercase">Menu</span>
                        <span className="material-symbols-outlined text-[20px]">{isOpen ? 'close' : 'menu'}</span>
                    </button>

                    <AnimatePresence>
                        {isOpen && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -10, x: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10, x: 10 }}
                                className="absolute right-0 top-14 w-64 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden"
                            >
                                <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Gaadiwala Ecosystem</span>
                                    <button onClick={() => setIsOpen(false)} className="text-white hover:text-orange-500"><span className="material-symbols-outlined text-sm">close</span></button>
                                </div>

                                <div className="p-2 space-y-1">
                                    <div className="px-4 py-2">
                                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">Navigation</p>
                                    </div>
                                    {items.map((item) => (
                                        <button
                                            key={item.path}
                                            onClick={() => {
                                                navigate(item.path);
                                                setIsOpen(false);
                                            }}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${location.pathname === item.path
                                                ? 'bg-slate-100 text-slate-900 font-bold'
                                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                                }`}
                                        >
                                            <span className={`material-symbols-outlined text-[20px] ${location.pathname === item.path ? 'text-slate-900' : 'text-slate-400'}`}>{item.icon}</span>
                                            <span className="text-xs font-bold">{item.label}</span>
                                        </button>
                                    ))}

                                    <div className="my-2 border-t border-slate-100 mx-4"></div>

                                    {/* Role Switching */}
                                    <div className="space-y-1">
                                        {user.roles?.includes(UserRole.ADMIN) && currentRole !== UserRole.ADMIN && (
                                            <button
                                                onClick={async () => {
                                                    await updateUserProfile({ role: UserRole.ADMIN });
                                                    setIsOpen(false);
                                                    navigate('/admin/dashboard');
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-purple-600 hover:bg-purple-50 transition-all font-bold group"
                                            >
                                                <span className="material-symbols-outlined text-[20px] group-hover:rotate-12 transition-transform">security</span>
                                                <span className="text-xs uppercase tracking-widest">Switch to Admin HQ</span>
                                            </button>
                                        )}

                                        {user.roles?.includes(UserRole.DRIVER) && currentRole !== UserRole.DRIVER && (
                                            <button
                                                onClick={async () => {
                                                    await updateUserProfile({ role: UserRole.DRIVER });
                                                    setIsOpen(false);
                                                    navigate('/driver/dashboard');
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-teal-600 hover:bg-teal-50 transition-all font-bold group"
                                            >
                                                <span className="material-symbols-outlined text-[20px] group-hover:rotate-12 transition-transform">sports_motorsports</span>
                                                <span className="text-xs uppercase tracking-widest">Switch to Partner Mode</span>
                                            </button>
                                        )}

                                        {user.roles?.includes(UserRole.RIDER) && currentRole !== UserRole.RIDER && (
                                            <button
                                                onClick={async () => {
                                                    await updateUserProfile({ role: UserRole.RIDER });
                                                    setIsOpen(false);
                                                    navigate('/user/home');
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-orange-600 hover:bg-orange-50 transition-all font-bold group"
                                            >
                                                <span className="material-symbols-outlined text-[20px] group-hover:rotate-12 transition-transform">directions_car</span>
                                                <span className="text-xs uppercase tracking-widest">Switch to Rider Mode</span>
                                            </button>
                                        )}

                                        {currentRole === UserRole.RIDER && !user.roles?.includes(UserRole.DRIVER) && (
                                            <button
                                                onClick={() => {
                                                    setIsOpen(false);
                                                    navigate('/', { state: { forceRoleSelection: true, targetRole: UserRole.DRIVER } });
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-slate-400 hover:bg-slate-50 transition-all font-bold"
                                            >
                                                <span className="material-symbols-outlined text-[20px]">add_circle</span>
                                                <span className="text-xs uppercase tracking-widest">Become a Partner</span>
                                            </button>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => {
                                            onLogout();
                                            setIsOpen(false);
                                            navigate('/');
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-red-500 hover:bg-red-50 transition-all group"
                                    >
                                        <span className="material-symbols-outlined text-[20px] group-hover:rotate-90 transition-transform">logout</span>
                                        <span className="text-xs font-bold">Log Out</span>
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </>
    );
};

export default NavigationOverlay;
