
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserRole } from '../types';
// import { CONFIG } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { ConfirmationResult } from 'firebase/auth';
import ScrollHint from '../components/shared/ScrollHint';

const Welcome: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const navigateState = location.state as { forceRoleSelection?: boolean, targetRole?: UserRole } | null;
    const {
        requestOtp,
        verifyOtp,
        user,
        setupRecaptcha,
        loading,
        signInWithGoogle,
        signup,
        login,
        updateUserProfile,
        logout
    } = useAuth();

    const containerRef = useRef<HTMLDivElement>(null);
    const authInputRef = useRef<HTMLInputElement>(null);

    // --- Auth State ---
    const [activeTab, setActiveTab] = useState<'RIDE' | 'DRIVE'>('RIDE');
    const [authMethod, setAuthMethod] = useState<'PHONE' | 'EMAIL'>('PHONE');
    const [authStep, setAuthStep] = useState<'DETAILS' | 'OTP' | 'EMAIL_SENT'>('DETAILS');
    const [error, setError] = useState('');
    const [confirmObj, setConfirmObj] = useState<ConfirmationResult | null>(null);

    // Form Data
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | ''>('');
    const [password, setPassword] = useState('');
    const [isSignup, setIsSignup] = useState(false);
    const [isBusy, setIsBusy] = useState(false);

    // --- Modal States ---
    const [showAboutModal, setShowAboutModal] = useState(false);
    const [infoModal, setInfoModal] = useState<{ title: string; content: React.ReactNode } | null>(null);

    useEffect(() => {
        // Init ReCaptcha
        setupRecaptcha('recaptcha-container');
    }, [setupRecaptcha]);

    // Redirect if already logged in (Double check, though App.tsx usually handles this)
    useEffect(() => {
        // Only auto-redirect if NOT in force selection mode
        if (user && !loading && user.role !== UserRole.UNSET && !navigateState?.forceRoleSelection) {
            if (user.role === UserRole.DRIVER) navigate('/driver/dashboard');
            else if (user.role === UserRole.ADMIN) navigate('/admin/dashboard');
            else navigate('/user/home');
        }
    }, [user, loading, navigate, navigateState]);

    // --- Helpers ---
    const scrollToAuth = () => {
        containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => authInputRef.current?.focus(), 800);
    };

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // --- Magnetic Effect Logic ---
    const [magneticPos, setMagneticPos] = useState({ x: 0, y: 0 });
    const handleMagneticMove = (e: React.MouseEvent<HTMLButtonElement>) => {
        const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - (left + width / 2)) * 0.35;
        const y = (e.clientY - (top + height / 2)) * 0.35;
        setMagneticPos({ x, y });
    };
    const resetMagnetic = () => setMagneticPos({ x: 0, y: 0 });

    // --- Handlers ---

    const handleDetailsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (phone.length < 10) {
            setError("Please enter a valid 10-digit mobile number.");
            return;
        }

        if (!gender) {
            setError("Please select your gender.");
            return;
        }

        setIsBusy(true);
        try {
            const fullPhone = `+91${phone}`;
            const result = await requestOtp(fullPhone);
            setConfirmObj(result);
            setAuthStep('OTP');
            setTimeout(() => document.getElementById('otp-0')?.focus(), 100);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to send OTP. Try again.");
        } finally {
            setIsBusy(false);
        }
    };

    const handleOtpChange = (index: number, value: string) => {
        if (value.length > 1) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        setError(''); // Clear error on typing
        if (value && index < 5) document.getElementById(`otp-${index + 1}`)?.focus();
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            document.getElementById(`otp-${index - 1}`)?.focus();
        }
    };

    const handleVerifyAndLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!confirmObj) {
            setError("Session expired. Please request OTP again.");
            return;
        }

        const enteredOtp = otp.join('');
        if (enteredOtp.length !== 6) {
            setError("Please enter the 6-digit OTP.");
            return;
        }

        setIsBusy(true);
        try {
            // Pass additional details to create profile if new
            await verifyOtp(confirmObj, enteredOtp, {
                name,
                email,
                gender: gender as any,
                role: activeTab === 'RIDE' ? UserRole.RIDER : UserRole.DRIVER
            });
            // AuthContext handles state update. 
            // useEffect above handles redirection.
        } catch (err: any) {
            console.error(err);
            setError("Invalid OTP. Please try again.");
            setIsBusy(false);
        }
    };

    const handleUpgrade = async () => {
        if (!user) return;
        setIsBusy(true);
        try {
            const targetRole = navigateState?.targetRole || (activeTab === 'RIDE' ? UserRole.RIDER : UserRole.DRIVER);

            // Update both active role and permission roles array
            const currentRoles = user.roles || [user.role];
            const newRoles = currentRoles.includes(targetRole) ? currentRoles : [...currentRoles, targetRole];

            await updateUserProfile({
                role: targetRole,
                roles: newRoles
            });

            // Redirect based on new role
            if (targetRole === UserRole.DRIVER) navigate('/driver/dashboard');
            else navigate('/user/home');
        } catch (err: any) {
            setError(err.message || "Failed to upgrade profile.");
        } finally {
            setIsBusy(false);
        }
    };

    const handleGoogleLogin = async () => {
        setIsBusy(true);
        try {
            await signInWithGoogle({
                role: activeTab === 'RIDE' ? UserRole.RIDER : UserRole.DRIVER
            });
        } catch (err: any) {
            console.error(err);
            setError("Google Sign In Failed.");
            setIsBusy(false);
        }
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsBusy(true);

        try {
            if (isSignup) {
                if (password.length < 6) throw new Error("Password must be at least 6 characters.");
                if (!name) throw new Error("Full name is required for registration.");

                await signup(email, password, phone || '', name);
                // Optionally update profile with gender if signup doesn't handle it
                if (gender) {
                    await updateUserProfile({ gender });
                }
            } else {
                await login(email, password);
            }
        } catch (err: any) {
            setError(err.message || "Authentication failed.");
        } finally {
            setIsBusy(false);
        }
    };

    return (
        <div
            ref={containerRef}
            className="h-dvh w-full bg-white font-sans text-slate-900 overflow-y-auto overflow-x-hidden scroll-smooth pb-safe relative"
        >
            <ScrollHint containerRef={containerRef} color="text-orange-500" />
            <div id="recaptcha-container"></div> {/* Invisible ReCaptcha */}

            {/* Navbar */}
            <nav className="fixed top-0 inset-x-0 w-full z-50 bg-black/80 backdrop-blur-xl border-b border-white/5 text-white transition-all">
                <div className="absolute inset-x-0 -bottom-px h-[2px] bg-gradient-to-r from-orange-500/0 via-orange-500/50 to-orange-500/0 opacity-50"></div>
                <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between py-4">
                    <div className="flex items-center gap-12">
                        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}>
                            <div className="size-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-white font-black">directions_car</span>
                            </div>
                            <h1 className="text-2xl font-black tracking-tighter">GAADIWALA</h1>
                        </div>
                        <div className="hidden lg:flex gap-8 text-xs font-black uppercase tracking-[0.2em] text-white/60">
                            <button onClick={() => scrollToSection('services')} className="hover:text-orange-500 transition-colors">Services</button>
                            <button onClick={() => scrollToSection('stats')} className="hover:text-orange-500 transition-colors">Impact</button>
                            <button onClick={() => scrollToSection('trust')} className="hover:text-orange-500 transition-colors">Safety</button>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-6">
                        <button className="hidden sm:block text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-orange-500 transition-colors" onClick={() => alert("Support: +91 1800-Gaadiwala-HELPLINE")}>Help</button>
                        <button onClick={scrollToAuth} className="px-6 py-3 bg-white text-black rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:bg-orange-500 hover:text-white transition-all shadow-xl hover:shadow-orange-500/40 active:scale-95">
                            Join Now
                        </button>
                    </div>
                </div>
            </nav>

            <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1] opacity-40">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/20 rounded-full blur-[120px] animate-float-orb"></div>
                <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-teal-500/10 rounded-full blur-[100px] animate-float-orb" style={{ animationDelay: '-5s' }}></div>
                <div className="absolute top-[40%] right-[10%] w-[25%] h-[25%] bg-pink-500/10 rounded-full blur-[80px] animate-float-orb" style={{ animationDelay: '-10s' }}></div>
            </div>

            {/* Hero Section */}
            <div className="relative pt-24 pb-12 lg:min-h-[90vh] flex items-center bg-[#0A0E12] overflow-hidden">
                {/* Background Image */}
                <div className="absolute inset-0 z-0 scale-105 animate-slow-zoom">
                    <img
                        src="file:///C:/Users/mayan/.gemini/antigravity/brain/cefabb7c-dd88-4d60-83e9-e4f79a826f9f/hero_luxury_cars_city_1769271860373.png"
                        className="w-full h-full object-cover"
                        alt="City Drive"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A0E12] via-[#0A0E12]/40 to-transparent"></div>
                    <div className="absolute inset-0 bg-black/20"></div>
                </div>

                <div className="max-w-7xl mx-auto px-6 w-full z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center py-10 lg:py-0">

                    {/* Mobile Headline Only - Top on mobile, hidden on desktop */}
                    <div className="lg:hidden text-center mb-8 px-4 order-1 animate-in fade-in slide-in-from-top duration-700">
                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight tracking-tighter drop-shadow-2xl text-white">
                            MOVING PEOPLE,<br /><span className="text-orange-500">SAVING PLANET.</span>
                        </h1>
                    </div>

                    {/* Column: Auth Widget - Middle on mobile, Left on desktop */}
                    <div className="order-2 lg:order-1 bg-white/95 backdrop-blur-xl rounded-[2.5rem] lg:rounded-[3rem] shadow-2xl overflow-hidden max-w-[480px] w-full mx-auto lg:ml-0 animate-in slide-in-from-bottom lg:slide-in-from-left duration-700 relative border border-white/20">
                        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-orange-500 via-pink-500 to-teal-500"></div>

                        {/* Tabs */}
                        <div className="flex p-2 bg-slate-100/50 m-6 rounded-2xl border border-slate-200/50">
                            <button
                                type="button"
                                onClick={() => { setActiveTab('RIDE'); setAuthStep('DETAILS'); setError(''); }}
                                className={`flex-1 py-3 px-2 sm:px-4 rounded-xl text-center font-black uppercase tracking-widest text-[9px] sm:text-[10px] transition-all flex items-center justify-center gap-1 sm:gap-2 ${activeTab === 'RIDE' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <span className={`material-symbols-outlined text-base sm:text-lg ${activeTab === 'RIDE' ? 'filled' : ''}`}>directions_car</span>
                                RIDE
                            </button>
                            <button
                                type="button"
                                onClick={() => { setActiveTab('DRIVE'); setAuthStep('DETAILS'); setError(''); }}
                                className={`flex-1 py-3 px-2 sm:px-4 rounded-xl text-center font-black uppercase tracking-widest text-[9px] sm:text-[10px] transition-all flex items-center justify-center gap-1 sm:gap-2 ${activeTab === 'DRIVE' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <span className={`material-symbols-outlined text-base sm:text-lg ${activeTab === 'DRIVE' ? 'filled' : ''}`}>sports_motorsports</span>
                                DRIVE
                            </button>
                        </div>

                        {/* Widget Content */}
                        <div className="px-8 pb-8 pt-2">
                            {user && navigateState?.forceRoleSelection ? (
                                <div className="py-10 text-center animate-in zoom-in-95 duration-500">
                                    <div className="size-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <span className="material-symbols-outlined text-4xl text-slate-400">add_moderator</span>
                                    </div>
                                    <h2 className="text-3xl font-black tracking-tighter mb-4 text-slate-900 leading-tight">
                                        Ready to join the <span className="text-orange-600">Partner Fleet</span>?
                                    </h2>
                                    <p className="text-slate-500 text-sm font-medium mb-10 leading-relaxed">
                                        Hey {user.name}, you're already a Rider. Upgrade your profile to start earning as a Partner.
                                    </p>

                                    {error && <p className="text-xs text-red-600 font-bold bg-red-50 p-3 rounded-xl mb-6">{error}</p>}

                                    <div className="space-y-4">
                                        <button
                                            onClick={handleUpgrade}
                                            disabled={isBusy}
                                            className="w-full h-16 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-xl active:scale-[0.98]"
                                        >
                                            {isBusy ? 'Processing...' : 'Confirm Upgrade'}
                                            <span className="material-symbols-outlined text-sm">rocket_launch</span>
                                        </button>
                                        <button
                                            onClick={() => navigate(-1)}
                                            className="w-full text-xs font-black uppercase text-slate-400 tracking-widest hover:text-black transition-colors"
                                        >
                                            Cancel & Go Back
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <h2 className="text-3xl sm:text-4xl font-black tracking-tighter mb-2 text-slate-900 leading-tight sm:leading-none">
                                        {activeTab === 'RIDE' ? 'Book your next adventure' : 'Join the fleet, start earning'}
                                    </h2>
                                    <p className="text-slate-500 text-xs sm:text-sm font-medium mb-6 sm:mb-8 leading-relaxed">
                                        {authStep === 'DETAILS' ? 'Experience the future of mobility in Mathura.' : 'Verify your identity to proceed.'}
                                    </p>

                                    {authStep === 'EMAIL_SENT' && (
                                        <div className="text-center py-8">
                                            <span className="material-symbols-outlined text-4xl text-green-500 mb-4">mark_email_read</span>
                                            <h3 className="text-xl font-bold mb-2">Check your inbox</h3>
                                            <p className="text-slate-500 text-sm mb-6">We sent a login link to <strong>{email}</strong></p>
                                            <button onClick={() => setAuthStep('DETAILS')} className="text-blue-600 underline text-sm">Try another email</button>
                                        </div>
                                    )}

                                    {authStep === 'DETAILS' && (
                                        <div className="space-y-4">
                                            {/* Method Toggle */}
                                            <div className="flex gap-4 border-b border-slate-100 pb-2 mb-4">
                                                <button onClick={() => { setAuthMethod('PHONE'); setError(''); }} className={`text-xs font-black uppercase tracking-widest pb-1 ${authMethod === 'PHONE' ? 'border-b-2 border-black' : 'text-slate-400'}`}>Phone</button>
                                                <button onClick={() => { setAuthMethod('EMAIL'); setError(''); }} className={`text-xs font-black uppercase tracking-widest pb-1 ${authMethod === 'EMAIL' ? 'border-b-2 border-black' : 'text-slate-400'}`}>Email</button>
                                            </div>

                                            {authMethod === 'PHONE' ? (
                                                <form onSubmit={handleDetailsSubmit} className="space-y-4">
                                                    <div className="grid grid-cols-1 gap-4">
                                                        <div className="bg-slate-50 rounded-xl px-4 h-14 border border-slate-200 flex items-center focus-within:border-black focus-within:bg-white transition-all">
                                                            <input
                                                                ref={authInputRef}
                                                                required
                                                                className="w-full bg-transparent border-none focus:ring-0 font-bold text-sm p-0 text-slate-900 placeholder-slate-400"
                                                                placeholder="Full Legal Name"
                                                                value={name}
                                                                onChange={e => setName(e.target.value)}
                                                            />
                                                            <span className="material-symbols-outlined text-slate-400">person</span>
                                                        </div>
                                                        <div className="bg-slate-50 rounded-xl px-4 h-14 border border-slate-200 flex items-center focus-within:border-black focus-within:bg-white transition-all">
                                                            <input
                                                                type="email"
                                                                className="w-full bg-transparent border-none focus:ring-0 font-bold text-sm p-0 text-slate-900 placeholder-slate-400"
                                                                placeholder="Email Address (Optional)"
                                                                value={email}
                                                                onChange={e => setEmail(e.target.value)}
                                                            />
                                                            <span className="material-symbols-outlined text-slate-400">mail</span>
                                                        </div>
                                                        <div className="bg-slate-50 rounded-xl px-4 h-14 border border-slate-200 flex items-center focus-within:border-black focus-within:bg-white transition-all">
                                                            <span className="font-bold text-slate-500 mr-2">+91</span>
                                                            <input
                                                                required
                                                                type="tel"
                                                                className="w-full bg-transparent border-none focus:ring-0 font-bold text-lg p-0 text-slate-900 placeholder-slate-300"
                                                                placeholder="Mobile Number"
                                                                maxLength={10}
                                                                value={phone}
                                                                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                                            />
                                                        </div>

                                                        <div className="flex gap-4 mb-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => setGender('MALE')}
                                                                className={`flex-1 h-14 rounded-xl border-2 flex items-center justify-center gap-2 font-bold transition-all ${gender === 'MALE' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-100 bg-slate-50 text-slate-400'}`}
                                                            >
                                                                <span className="material-symbols-outlined">male</span> Male
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setGender('FEMALE')}
                                                                className={`flex-1 h-14 rounded-xl border-2 flex items-center justify-center gap-2 font-bold transition-all ${gender === 'FEMALE' ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-slate-100 bg-slate-50 text-slate-400'}`}
                                                            >
                                                                <span className="material-symbols-outlined">female</span> Female
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {error && <p className="text-xs text-red-600 font-bold bg-red-50 p-2 rounded-lg">{error}</p>}

                                                    <button
                                                        type="submit"
                                                        onMouseMove={handleMagneticMove}
                                                        onMouseLeave={resetMagnetic}
                                                        style={{ transform: `translate(${magneticPos.x}px, ${magneticPos.y}px)` }}
                                                        className="w-full h-14 bg-black text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all duration-300 flex items-center justify-center gap-2 mt-4 shadow-xl active:scale-95"
                                                    >
                                                        {isBusy ? (
                                                            <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                                        ) : (
                                                            <>
                                                                Get OTP
                                                                <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </form>
                                            ) : (
                                                <form onSubmit={handleEmailAuth} className="space-y-4">
                                                    {isSignup && (
                                                        <div className="bg-slate-50 rounded-xl px-4 h-14 border border-slate-200 flex items-center focus-within:border-black focus-within:bg-white transition-all animate-in slide-in-from-top-2">
                                                            <input
                                                                required
                                                                className="w-full bg-transparent border-none focus:ring-0 font-bold text-sm p-0 placeholder-slate-400"
                                                                placeholder="Full Legal Name"
                                                                value={name}
                                                                onChange={e => setName(e.target.value)}
                                                            />
                                                            <span className="material-symbols-outlined text-slate-400">person</span>
                                                        </div>
                                                    )}
                                                    <div className="bg-slate-50 rounded-xl px-4 h-14 border border-slate-200 flex items-center focus-within:border-black focus-within:bg-white transition-all">
                                                        <input
                                                            required
                                                            type="email"
                                                            className="w-full bg-transparent border-none focus:ring-0 font-bold text-sm p-0 text-slate-900 placeholder-slate-400"
                                                            placeholder="Enter your email"
                                                            value={email}
                                                            onChange={e => setEmail(e.target.value)}
                                                        />
                                                        <span className="material-symbols-outlined text-slate-400">mail</span>
                                                    </div>
                                                    <div className="bg-slate-50 rounded-xl px-4 h-14 border border-slate-200 flex items-center focus-within:border-black focus-within:bg-white transition-all">
                                                        <input
                                                            required
                                                            type="password"
                                                            className="w-full bg-transparent border-none focus:ring-0 font-bold text-sm p-0 text-slate-900 placeholder-slate-400"
                                                            placeholder="Secret Password"
                                                            value={password}
                                                            onChange={e => setPassword(e.target.value)}
                                                        />
                                                        <span className="material-symbols-outlined text-slate-400">lock</span>
                                                    </div>

                                                    {isSignup && (
                                                        <div className="flex gap-4 animate-in slide-in-from-top-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => setGender('MALE')}
                                                                className={`flex-1 h-12 rounded-xl border-2 flex items-center justify-center gap-2 font-bold text-xs transition-all ${gender === 'MALE' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-100 bg-slate-50 text-slate-400'}`}
                                                            >
                                                                <span className="material-symbols-outlined text-sm">male</span> Male
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setGender('FEMALE')}
                                                                className={`flex-1 h-12 rounded-xl border-2 flex items-center justify-center gap-2 font-bold text-xs transition-all ${gender === 'FEMALE' ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-slate-100 bg-slate-50 text-slate-400'}`}
                                                            >
                                                                <span className="material-symbols-outlined text-sm">female</span> Female
                                                            </button>
                                                        </div>
                                                    )}

                                                    {error && <p className="text-xs text-red-600 font-bold bg-red-50 p-2 rounded-lg">{error}</p>}

                                                    <button type="submit" className="w-full h-14 bg-black text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2 mt-4 shadow-xl">
                                                        {isBusy ? 'Authenticating...' : isSignup ? 'Create Account' : 'Sign In'}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => { setIsSignup(!isSignup); setError(''); }}
                                                        className="w-full text-center text-xs font-bold text-slate-400 hover:text-black transition-colors"
                                                    >
                                                        {isSignup ? 'Already have an account? Sign In' : 'New here? Create an Account'}
                                                    </button>
                                                </form>
                                            )}

                                            <div className="relative py-4">
                                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                                                <div className="relative flex justify-center text-xs"><span className="px-2 bg-white text-slate-400 font-black tracking-widest">OR</span></div>
                                            </div>

                                            <button type="button" onClick={handleGoogleLogin} className="w-full h-12 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm">
                                                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" className="w-5 h-5" />
                                                Continue with Google
                                            </button>

                                            <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-6">
                                                Trusted by 10M+ users across India
                                            </p>
                                        </div>
                                    )}

                                    {authStep === 'OTP' && (
                                        <form onSubmit={handleVerifyAndLogin} className="space-y-6">
                                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center mb-6">
                                                <p className="text-xs text-slate-500 mb-1">Code sent to <span className="font-black text-slate-900">+91 {phone}</span></p>
                                            </div>

                                            <div className="flex gap-3 justify-between">
                                                {otp.map((digit, i) => (
                                                    <input
                                                        key={i}
                                                        id={`otp-${i}`}
                                                        className="w-14 h-16 bg-white border-2 border-slate-200 rounded-xl text-center text-2xl font-black focus:border-black focus:ring-0 transition-all focus:scale-110 text-slate-900"
                                                        maxLength={1}
                                                        value={digit}
                                                        onChange={e => handleOtpChange(i, e.target.value)}
                                                        onKeyDown={e => handleKeyDown(i, e)}
                                                        placeholder="•"
                                                    />
                                                ))}
                                            </div>

                                            {error && <div className="text-center bg-red-50 p-2 rounded-lg border border-red-100"><p className="text-xs text-red-600 font-bold">{error}</p></div>}

                                            <button type="submit" className="w-full h-14 bg-black text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-xl hover:scale-[1.02] active:scale-[0.98]">
                                                {isBusy ? 'Verifying...' : 'Verify & Proceed'}
                                            </button>

                                            <div className="flex justify-between items-center">
                                                <button type="button" onClick={() => { setAuthStep('DETAILS'); setError(''); }} className="text-xs font-bold text-slate-400 hover:text-black">
                                                    Edit Details
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Promo Strip */}
                        <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 text-center border-t border-orange-100 animate-in fade-in duration-1000">
                            <p className="text-[10px] font-bold text-orange-800 uppercase tracking-widest flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-sm">local_offer</span>
                                {activeTab === 'RIDE' ? 'Sign up today for 50% off your first 3 rides!' : 'Join now and earn ₹5000 joining bonus!'}
                            </p>
                        </div>
                    </div>

                    {/* Column: How It Works & Hero Text - Bottom on mobile, Right on desktop */}
                    <div className="text-white space-y-6 lg:space-y-12 animate-in lg:slide-in-from-right duration-700 order-3 lg:order-2 text-center lg:text-left">


                        {/* Tablet/Desktop Hero Text - Hidden on Mobile to focus on Auth */}
                        <div className="hidden lg:block relative">
                            <div className="absolute -left-12 top-0 w-1 h-32 bg-gradient-to-b from-orange-500 to-transparent"></div>

                            {/* Live Rides Badge */}
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-full mb-6 backdrop-blur-md">
                                <span className="size-2 bg-orange-500 rounded-full animate-pulse"></span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-orange-500">Live: 1,200+ rides happening now</span>
                            </div>

                            <h1 className="text-6xl lg:text-8xl font-black leading-[0.9] tracking-tighter drop-shadow-2xl mb-8">
                                MOVING PEOPLE,<br /><span className="text-orange-500 underline decoration-white/20 underline-offset-8">THE WORLD.</span>
                            </h1>
                            <p className="text-2xl font-medium text-white/80 max-w-lg leading-tight drop-shadow-md mb-12">
                                India's first unified mobility ecosystem. From electric autos to premium sedans, all in one app.
                            </p>
                        </div>
                        <div className="flex justify-center lg:justify-start gap-4 pt-4">
                            <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20">
                                <p className="text-3xl font-black">4.8</p>
                                <p className="text-[10px] uppercase tracking-widest opacity-80">App Rating</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20">
                                <p className="text-3xl font-black">24/7</p>
                                <p className="text-[10px] uppercase tracking-widest opacity-80">Support</p>
                            </div>
                        </div>

                        {/* How It Works - Beside Login Form */}
                        {/* How It Works - No outer container, animated flow */}
                        <div className="grid grid-cols-3 gap-2 lg:gap-12 relative z-10 max-w-lg mx-auto md:max-w-none">
                            {/* Step 1 */}
                            <motion.div
                                initial={{ opacity: 0, y: 50 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-100px" }}
                                transition={{ type: "spring", bounce: 0.5, duration: 0.8 }}
                                onClick={scrollToAuth}
                                className="text-center group cursor-pointer p-6 rounded-[2.5rem] transition-all active:scale-95 relative"
                            >
                                <motion.div
                                    animate={{ y: [0, -10, 0] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                    className="size-16 rounded-3xl bg-orange-500 text-white flex items-center justify-center mx-auto mb-4 shadow-xl shadow-orange-500/20 group-hover:scale-110 group-hover:rotate-3 transition-transform"
                                >
                                    <span className="material-symbols-outlined text-2xl">location_on</span>
                                </motion.div>
                                <h4 className="font-black uppercase text-[10px] md:text-sm tracking-wider mb-1 md:mb-2 text-white">1. Book</h4>
                                <p className="text-[9px] md:text-xs text-white/60 font-medium leading-tight hidden md:block">Choose your pickup &<br />drop location</p>
                                <p className="text-[8px] md:hidden text-white/50 leading-tight">Pick Location</p>

                                {/* Connector - Visible on all screens now, horizontal */}
                                <div className="absolute top-8 md:top-14 left-[60%] w-[80%] h-[2px] z-[-1]">
                                    <svg width="100%" height="20" className="overflow-visible">
                                        <motion.path
                                            d="M 0 10 Q 50 0, 100 10"
                                            fill="transparent"
                                            stroke="rgba(255,255,255,0.1)"
                                            strokeWidth="2"
                                            strokeDasharray="4 4"
                                            initial={{ pathLength: 0 }}
                                            whileInView={{ pathLength: 1 }}
                                            transition={{ duration: 1, delay: 0.5 }}
                                        />
                                    </svg>
                                </div>
                            </motion.div>

                            {/* Step 2 */}
                            <motion.div
                                initial={{ opacity: 0, y: 50 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-100px" }}
                                transition={{ type: "spring", bounce: 0.5, duration: 0.8, delay: 0.2 }}
                                onClick={scrollToAuth}
                                className="text-center group cursor-pointer p-6 rounded-[2.5rem] transition-all active:scale-95 relative"
                            >
                                <motion.div
                                    animate={{ y: [0, -10, 0] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                                    className="size-16 rounded-3xl bg-teal-500 text-white flex items-center justify-center mx-auto mb-4 shadow-xl shadow-teal-500/20 group-hover:scale-110 group-hover:-rotate-3 transition-transform"
                                >
                                    <span className="material-symbols-outlined text-2xl">directions_car</span>
                                </motion.div>
                                <h4 className="font-black uppercase text-[10px] md:text-sm tracking-wider mb-1 md:mb-2 text-white">2. Match</h4>
                                <p className="text-[9px] md:text-xs text-white/60 font-medium leading-tight hidden md:block">Get matched with a<br />nearby driver</p>
                                <p className="text-[8px] md:hidden text-white/50 leading-tight">Find Driver</p>

                                {/* Connector */}
                                <div className="absolute top-8 md:top-14 left-[60%] w-[80%] h-[2px] z-[-1]">
                                    <svg width="100%" height="20" className="overflow-visible">
                                        <motion.path
                                            d="M 0 10 Q 50 20, 100 10"
                                            fill="transparent"
                                            stroke="rgba(255,255,255,0.1)"
                                            strokeWidth="2"
                                            strokeDasharray="4 4"
                                            initial={{ pathLength: 0 }}
                                            whileInView={{ pathLength: 1 }}
                                            transition={{ duration: 1, delay: 1 }}
                                        />
                                    </svg>
                                </div>
                            </motion.div>

                            {/* Step 3 */}
                            <motion.div
                                initial={{ opacity: 0, y: 50 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-100px" }}
                                transition={{ type: "spring", bounce: 0.5, duration: 0.8, delay: 0.4 }}
                                onClick={scrollToAuth}
                                className="text-center group cursor-pointer p-6 rounded-[2.5rem] transition-all active:scale-95 relative"
                            >
                                <motion.div
                                    animate={{ y: [0, -10, 0] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                                    className="size-16 rounded-3xl bg-blue-500 text-white flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-500/20 group-hover:scale-110 group-hover:rotate-3 transition-transform"
                                >
                                    <span className="material-symbols-outlined text-2xl">security</span>
                                </motion.div>
                                <h4 className="font-black uppercase text-[10px] md:text-sm tracking-wider mb-1 md:mb-2 text-white">3. Ride</h4>
                                <p className="text-[9px] md:text-xs text-white/60 font-medium leading-tight hidden md:block">Enjoy a safe &<br />comfortable journey</p>
                                <p className="text-[8px] md:hidden text-white/50 leading-tight">Safe Journey</p>
                            </motion.div>
                        </div>

                        {/* Animated Background Flow Line (Subtle) */}
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                            <motion.div
                                animate={{
                                    x: ['-100%', '100%'],
                                    opacity: [0, 0.5, 0]
                                }}
                                transition={{
                                    duration: 3,
                                    repeat: Infinity,
                                    ease: "linear"
                                }}
                                className="absolute top-14 left-0 w-32 h-[1px] bg-gradient-to-r from-transparent via-orange-500 to-transparent blur-sm"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Partners Section */}
            <section className="py-24 bg-[#0A0E12] border-y border-white/5 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-48 h-full bg-gradient-to-r from-[#0A0E12] to-transparent z-10"></div>
                <div className="absolute top-0 right-0 w-48 h-full bg-gradient-to-l from-[#0A0E12] to-transparent z-10"></div>
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <p className="text-[10px] font-black uppercase text-white/40 tracking-[0.4em] mb-12">Empowering 100+ Strategic Partners</p>
                    <div className="overflow-hidden relative group">
                        <div className="animate-marquee-reverse hover:pause flex items-center gap-24 py-4 w-max">
                            {[
                                { name: "UBER", icon: "local_taxi", color: "group-hover:text-orange-500" },
                                { name: "OLA", icon: "directions_car", color: "group-hover:text-teal-500" },
                                { name: "MMT", icon: "flight", color: "group-hover:text-blue-500" },
                                { name: "IRCTC", icon: "train", color: "group-hover:text-red-500" },
                                { name: "PAYTM", icon: "payments", color: "group-hover:text-blue-600" },
                                { name: "UBER", icon: "local_taxi", color: "group-hover:text-orange-500" },
                                { name: "OLA", icon: "directions_car", color: "group-hover:text-teal-500" },
                                { name: "MMT", icon: "flight", color: "group-hover:text-blue-500" },
                                { name: "IRCTC", icon: "train", color: "group-hover:text-red-500" },
                                { name: "PAYTM", icon: "payments", color: "group-hover:text-blue-600" },
                                { name: "UBER", icon: "local_taxi", color: "group-hover:text-orange-500" },
                                { name: "OLA", icon: "directions_car", color: "group-hover:text-teal-500" },
                                { name: "MMT", icon: "flight", color: "group-hover:text-blue-500" },
                                { name: "IRCTC", icon: "train", color: "group-hover:text-red-500" },
                                { name: "PAYTM", icon: "payments", color: "group-hover:text-blue-600" }
                            ].map((partner, i) => (
                                <div key={i} className="flex items-center gap-3 text-2xl font-black text-white group cursor-default opacity-40 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500 shrink-0">
                                    <span className={`material-symbols-outlined text-4xl ${partner.color} transition-colors`}>{partner.icon}</span>
                                    <span>{partner.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonials Scrolling Section */}
            <section className="py-32 bg-[#0C1218] overflow-hidden border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 mb-12">
                    <span className="text-orange-500 font-black uppercase tracking-widest text-xs mb-2 block">Community Love</span>
                    <h2 className="text-4xl font-black tracking-tighter text-white">What our riders say</h2>
                </div>

                {/* Scrolling Container */}
                <div className="relative group">
                    <div className="animate-marquee flex items-stretch gap-8 whitespace-nowrap px-6" style={{ animationDuration: '40s', width: 'max-content' }}>
                        {[
                            {
                                name: "Priya Sharma",
                                role: "Daily Commuter",
                                text: "Gaadiwala has completely changed my daily travel. The 'Pink Cab' feature makes me feel so safe returning home late from work.",
                                rating: 5,
                                img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya"
                            },
                            {
                                name: "Rahul Verma",
                                role: "Student",
                                text: "Shared rides save me so much money! Plus I've met some cool people. Best app for students in Mathura.",
                                rating: 5,
                                img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul"
                            },
                            {
                                name: "Amit Patel",
                                role: "Business Traveler",
                                text: "The 'Prime' cars are always clean and the drivers are professional. Great for my client meetings.",
                                rating: 5,
                                img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Amit"
                            },
                            // Set 2
                            {
                                name: "Priya Sharma",
                                role: "Daily Commuter",
                                text: "Gaadiwala has completely changed my daily travel. The 'Pink Cab' feature makes me feel so safe returning home late from work.",
                                rating: 5,
                                img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya"
                            },
                            {
                                name: "Rahul Verma",
                                role: "Student",
                                text: "Shared rides save me so much money! Plus I've met some cool people. Best app for students in Mathura.",
                                rating: 5,
                                img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul"
                            },
                            {
                                name: "Amit Patel",
                                role: "Business Traveler",
                                text: "The 'Prime' cars are always clean and the drivers are professional. Great for my client meetings.",
                                rating: 5,
                                img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Amit"
                            },
                            // Set 3
                            {
                                name: "Priya Sharma",
                                role: "Daily Commuter",
                                text: "Gaadiwala has completely changed my daily travel. The 'Pink Cab' feature makes me feel so safe returning home late from work.",
                                rating: 5,
                                img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya"
                            },
                            {
                                name: "Rahul Verma",
                                role: "Student",
                                text: "Shared rides save me so much money! Plus I've met some cool people. Best app for students in Mathura.",
                                rating: 5,
                                img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul"
                            },
                            {
                                name: "Amit Patel",
                                role: "Business Traveler",
                                text: "The 'Prime' cars are always clean and the drivers are professional. Great for my client meetings.",
                                rating: 5,
                                img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Amit"
                            },
                            // Set 4
                            {
                                name: "Priya Sharma",
                                role: "Daily Commuter",
                                text: "Gaadiwala has completely changed my daily travel. The 'Pink Cab' feature makes me feel so safe returning home late from work.",
                                rating: 5,
                                img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya"
                            },
                            {
                                name: "Rahul Verma",
                                role: "Student",
                                text: "Shared rides save me so much money! Plus I've met some cool people. Best app for students in Mathura.",
                                rating: 5,
                                img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul"
                            },
                            {
                                name: "Amit Patel",
                                role: "Business Traveler",
                                text: "The 'Prime' cars are always clean and the drivers are professional. Great for my client meetings.",
                                rating: 5,
                                img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Amit"
                            },
                        ].map((review, i) => (
                            <div key={i} className="w-[350px] md:w-[450px] bg-white p-10 rounded-[3rem] shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-orange-500/10 transition-all border border-slate-100 group/card inline-block whitespace-normal mr-8">
                                <div className="flex gap-1 text-orange-400 mb-8 group-hover/card:scale-105 transition-transform origin-left">
                                    {[...Array(5)].map((_, j) => (
                                        <span key={j} className={`material-symbols-outlined text-sm ${j < review.rating ? 'filled' : ''}`}>star</span>
                                    ))}
                                </div>
                                <p className="text-slate-600 font-medium leading-[1.8] italic mb-10 h-24 text-lg">"{review.text}"</p>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <img src={review.img} className="size-14 rounded-full bg-slate-100 border-2 border-white shadow-md" alt={review.name} />
                                            <div className="absolute -bottom-1 -right-1 size-6 bg-green-500 rounded-full border-4 border-white flex items-center justify-center">
                                                <span className="material-symbols-outlined text-[10px] text-white font-black">verified</span>
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="font-black text-slate-900 text-lg">{review.name}</h4>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{review.role}</p>
                                        </div>
                                    </div>
                                    <span className="material-symbols-outlined text-slate-100 text-6xl font-thin -mr-4 select-none group-hover/card:text-orange-100 transition-colors">format_quote</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Trust Section - Stats Cards */}
            <section id="stats" className="py-32 bg-[#0A0E12] relative overflow-hidden border-y border-white/5">
                <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 via-transparent to-teal-500/5 pointer-events-none"></div>
                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { label: "Cities Covered", value: "250+", sub: "India, UAE, UK & Australia", color: "from-orange-500 to-red-500" },
                            { label: "Yearly Rides", value: "55 Cr+", sub: "Total community trips", color: "from-blue-500 to-indigo-500" },
                            { label: "Green Kms", value: "12 Cr+", sub: "Electric distance this year", color: "from-teal-500 to-emerald-500" }
                        ].map((stat, i) => (
                            <div key={i} className="group relative p-10 rounded-[3rem] bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-500 hover:-translate-y-2 overflow-hidden backdrop-blur-3xl shadow-2xl">
                                <div className={`absolute -top-10 -right-10 size-40 bg-gradient-to-br ${stat.color} opacity-10 blur-[60px] group-hover:opacity-30 transition-opacity`}></div>

                                <span className={`text-6xl font-black bg-gradient-to-br ${stat.color} bg-clip-text text-transparent mb-4 block group-hover:scale-110 transition-transform origin-left duration-700`}>
                                    {stat.value}
                                </span>
                                <h4 className="text-white text-sm font-black uppercase tracking-[0.2em] mb-2">{stat.label}</h4>
                                <p className="text-slate-500 text-xs font-medium">{stat.sub}</p>

                                <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent w-full scale-x-0 group-hover:scale-x-100 transition-transform duration-700"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Services Section */}
            <section id="services" className="py-32 bg-[#0C1218] relative overflow-hidden border-b border-white/5">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[120px] -mr-48 -mt-48"></div>
                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="mb-16">
                        <span className="text-orange-500 font-black uppercase tracking-[0.3em] text-[10px] mb-2 block">Our Services</span>
                        <h2 className="text-5xl font-black tracking-tighter text-white">There's a Gaadiwala for everyone</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {/* Card 1 */}
                        <div className="bg-white/5 rounded-[3.5rem] p-9 shadow-2xl backdrop-blur-3xl hover:bg-white/10 hover:-translate-y-4 transition-all duration-500 cursor-pointer group border border-white/10 relative overflow-hidden shimmer-effect animate-in slide-in-from-bottom duration-700">
                            <div className="absolute top-0 right-0 p-5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                                <div className="size-12 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-orange-500/20">
                                    <span className="material-symbols-outlined text-sm">arrow_outward</span>
                                </div>
                            </div>
                            <div className="h-56 mb-10 bg-white/5 rounded-[2.5rem] overflow-hidden relative">
                                <img src="https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=500&q=80" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1500ms]" alt="Daily Rides" />
                            </div>
                            <h3 className="text-2xl font-black mb-3 flex items-center gap-3 text-white">Daily Rides <span className="px-2 py-0.5 bg-orange-500 text-white text-[8px] font-black uppercase rounded-full">Popular</span></h3>
                            <p className="text-slate-400 text-sm leading-relaxed mb-10">From Bikes and Autos to Prime Sedans, find a ride in your budget at your convenience.</p>
                            <button onClick={scrollToAuth} className="w-full py-5 rounded-2xl bg-white/5 text-white text-[10px] font-black uppercase tracking-widest group-hover:bg-orange-500 transition-all duration-300 border border-white/10">Book Now</button>
                        </div>
                        {/* Card 2 */}
                        <div className="bg-white/5 rounded-[3.5rem] p-9 shadow-2xl backdrop-blur-3xl hover:bg-white/10 hover:-translate-y-4 transition-all duration-500 cursor-pointer group border border-white/10 relative overflow-hidden shimmer-effect animate-in slide-in-from-bottom duration-700 delay-100">
                            <div className="absolute top-0 right-0 p-5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                                <div className="size-12 bg-teal-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-teal-500/20">
                                    <span className="material-symbols-outlined text-sm">arrow_outward</span>
                                </div>
                            </div>
                            <div className="h-56 mb-10 bg-white/5 rounded-[2.5rem] overflow-hidden relative">
                                <img src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=500&q=80" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1500ms]"
                                    alt="Outstation" />
                            </div>
                            <h3 className="text-2xl font-black mb-3 text-white">Outstation</h3>
                            <p className="text-slate-400 text-sm leading-relaxed mb-10">Ride out of town at affordable one-way and round-trip fares with intercity travel.</p>
                            <button onClick={scrollToAuth} className="w-full py-5 rounded-2xl bg-white/5 text-white text-[10px] font-black uppercase tracking-widest group-hover:bg-teal-500 transition-all duration-300 border border-white/10">Plan Trip</button>
                        </div>
                        {/* Card 3 */}
                        <div className="bg-white/5 rounded-[3.5rem] p-9 shadow-2xl backdrop-blur-3xl hover:bg-white/10 hover:-translate-y-4 transition-all duration-500 cursor-pointer group border border-white/10 relative overflow-hidden shimmer-effect animate-in slide-in-from-bottom duration-700 delay-200">
                            <div className="absolute top-0 right-0 p-5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                                <div className="size-12 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
                                    <span className="material-symbols-outlined text-sm">arrow_outward</span>
                                </div>
                            </div>
                            <div className="h-56 mb-10 bg-white/5 rounded-[2.5rem] overflow-hidden relative">
                                <img src="https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=500&q=80" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1500ms]"
                                    alt="Rentals" />
                            </div>
                            <h3 className="text-2xl font-black mb-3 text-white">Rentals</h3>
                            <p className="text-slate-400 text-sm leading-relaxed mb-10">Book a car for up to 12 hours. Perfect for business meetings or a day out shopping.</p>
                            <button onClick={scrollToAuth} className="w-full py-5 rounded-2xl bg-white/5 text-white text-[10px] font-black uppercase tracking-widest group-hover:bg-blue-500 transition-all duration-300 border border-white/10">Rent Car</button>
                        </div>
                        {/* Card 4 - Pink Cab */}
                        <div className="bg-white/5 rounded-[3.5rem] p-9 shadow-2xl backdrop-blur-3xl hover:bg-white/10 hover:-translate-y-4 transition-all duration-500 cursor-pointer group border border-pink-500/20 relative overflow-hidden shimmer-effect animate-in slide-in-from-bottom duration-700 delay-300">
                            <div className="absolute top-0 right-0 p-5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                                <div className="size-12 bg-pink-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-pink-500/20">
                                    <span className="material-symbols-outlined text-sm">arrow_outward</span>
                                </div>
                            </div>
                            <div className="h-56 mb-10 bg-pink-500/5 rounded-[2.5rem] overflow-hidden relative">
                                <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500&q=80" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1500ms]"
                                    alt="Pink Cab" />
                                <div className="absolute top-4 left-4 bg-pink-500/90 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest text-white shadow-sm border border-white/10">Female Only</div>
                            </div>
                            <h3 className="text-2xl font-black mb-3 text-pink-500">Pink Cab</h3>
                            <p className="text-slate-400 text-sm leading-relaxed mb-10">Exclusive safety feature with verified women drivers for our women riders.</p>
                            <button onClick={scrollToAuth} className="w-full py-5 rounded-2xl bg-pink-500/10 text-pink-500 text-[10px] font-black uppercase tracking-widest group-hover:bg-pink-500 group-hover:text-white transition-all duration-300 border border-pink-500/20">Join Securely</button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Trust Section */}
            <section id="trust" className="py-32 bg-[#0A0E12] relative overflow-hidden">
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] -ml-48 -mb-48"></div>
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-24 items-center relative z-10">
                    <div>
                        <span className="text-orange-500 font-black uppercase tracking-[0.3em] text-[10px] mb-2 block">Safety First</span>
                        <h2 className="text-6xl font-black tracking-tighter mb-12 text-white">Ride with complete confidence</h2>
                        <div className="space-y-12">
                            <div className="flex gap-8 group">
                                <div className="size-20 rounded-[2.5rem] bg-white/5 border border-white/10 flex items-center justify-center text-blue-400 shrink-0 shadow-2xl group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-4xl">verified_user</span>
                                </div>
                                <div>
                                    <h4 className="text-2xl font-black mb-2 text-white">Verified Community</h4>
                                    <p className="text-slate-400 leading-relaxed text-lg">We verify government IDs of every driver and rider. Background checks are mandatory, no exceptions.</p>
                                </div>
                            </div>
                            <div className="flex gap-8 group">
                                <div className="size-20 rounded-[2rem] bg-teal-50 flex items-center justify-center text-teal-600 shrink-0 shadow-lg shadow-teal-500/5 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-4xl">share_location</span>
                                </div>
                                <div>
                                    <h4 className="text-2xl font-black mb-2 text-white">Real-time Guardian</h4>
                                    <p className="text-slate-500 leading-relaxed text-lg">Share your journey live with trusted contacts. Our AI monitors for unusual stops and route deviations.</p>
                                </div>
                            </div>
                            <div className="flex gap-8 group">
                                <div className="size-20 rounded-[2rem] bg-red-50 flex items-center justify-center text-red-600 shrink-0 shadow-lg shadow-red-500/5 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-4xl">sos</span>
                                </div>
                                <div>
                                    <h4 className="text-2xl font-black mb-2 text-white">Panic Response 24/7</h4>
                                    <p className="text-slate-500 leading-relaxed text-lg">Instant access to our dedicated emergency response team. Help is always just a heartbeat away.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="relative h-[700px] bg-slate-900 rounded-[4rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] group">
                        <img src="https://images.unsplash.com/photo-1524592714635-d77511a4834d?w=800&q=80" className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-[2000ms]" alt="demo bg" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                        <div className="absolute bottom-8 left-8 right-8 bg-white/10 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/20 shadow-2xl">
                            <div className="flex items-start gap-6">
                                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sneha" className="size-20 rounded-full bg-slate-100 border-4 border-white/10 shadow-xl" alt="avatar" />
                                <div className="flex-1">
                                    <div className="flex text-orange-400 mb-2">
                                        {[...Array(5)].map((_, i) => <span key={i} className="material-symbols-outlined text-lg filled">star</span>)}
                                    </div>
                                    <p className="font-medium text-lg text-white italic mb-4">"The 24/7 support really works. I once left my phone in a cab and got it back within 30 minutes. Unbelievable efficiency!"</p>
                                    <div className="flex justify-between items-center">
                                        <p className="text-xs text-white/60 font-black uppercase tracking-[0.2em]">Sneha • Prime Member</p>
                                        <span className="px-3 py-1 bg-green-500 text-white text-[8px] font-black uppercase rounded-full">Verified Rider</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-[#05070A] text-white pt-32 pb-12 border-t border-white/5">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-16 mb-32">
                        <div className="col-span-2 lg:col-span-2 pr-12">
                            <div className="flex items-center gap-2 mb-8">
                                <div className="size-12 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                                    <span className="material-symbols-outlined text-white font-black">directions_car</span>
                                </div>
                                <h2 className="text-4xl font-black tracking-tighter uppercase">GAADIWALA</h2>
                            </div>
                            <p className="text-slate-400 text-lg max-w-sm mb-10 leading-relaxed">
                                Intelligence in Motion. Building the future of shared mobility for a billion people with AI-driven safety and sustainable electric fleets.
                            </p>
                            <div className="flex gap-4">
                                {[
                                    { id: 'IG', url: 'https://img.freepik.com/free-vector/instagram-icon_1057-2227.jpg?semt=ais_hybrid&w=740&q=80' },
                                    { id: 'X', url: 'https://img.freepik.com/free-vector/twitter-new-2023-x-logo-white-background-vector_1017-45422.jpg?t=st=1769274341~exp=1769277941~hmac=5ee4cd821a7102b89139d1141d031c10968d4d0843a7d3e2579f48d0a2915e0f&w=740' },
                                    { id: 'LN', url: 'https://img.freepik.com/premium-vector/linkedin-icon_488108-5.jpg?ga=GA1.1.1195747974.1769274289&semt=ais_hybrid&w=740&q=80' },
                                    { id: 'FB', url: 'https://img.freepik.com/premium-vector/art-illustration_929495-41.jpg?ga=GA1.1.1195747974.1769274289&semt=ais_hybrid&w=740&q=80' }
                                ].map(social => (
                                    <span key={social.id} className="size-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white hover:border-white transition-all cursor-pointer group overflow-hidden">
                                        <img src={social.url} alt={social.id} className="size-full object-cover group-hover:scale-110 transition-transform opacity-70 group-hover:opacity-100" />
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4 className="font-bold mb-8 text-lg">Company</h4>
                            <ul className="space-y-4 text-sm text-slate-400 font-medium">
                                <li className="hover:text-white cursor-pointer transition-colors" onClick={() => setShowAboutModal(true)}>About Us</li>
                                <li className="hover:text-white cursor-pointer transition-colors" onClick={() => setInfoModal({
                                    title: "Careers",
                                    content: (
                                        <div className="space-y-4">
                                            <p>Join the movement! We're looking for visionaries in engineering, design, and operations.</p>
                                            <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 italic text-[10px] font-bold text-orange-600">
                                                Active Openings: Frontend Engineer (React), Ops Manager (Mathura), Data Scientist.
                                            </div>
                                            <button className="w-full py-3 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest mt-2">View Openings</button>
                                        </div>
                                    )
                                })}>Careers</li>
                                <li className="hover:text-white cursor-pointer transition-colors" onClick={() => setInfoModal({
                                    title: "Newsroom",
                                    content: <p>Stay updated with our latest launches, partnerships, and tech breakthroughs in the mobility space.</p>
                                })}>Newsroom</li>
                                <li className="hover:text-white cursor-pointer transition-colors" onClick={() => setInfoModal({
                                    title: "Investors",
                                    content: <p>Fueling the future of urban mobility. Access our financial reports, governance documents, and investor presentations.</p>
                                })}>Investors</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold mb-8 text-lg">Products</h4>
                            <ul className="space-y-4 text-sm text-slate-400 font-medium">
                                <li className="hover:text-white cursor-pointer transition-colors" onClick={() => setInfoModal({
                                    title: "Ride",
                                    content: <p>From daily commutes to luxury travel, our ride-hailing app connects you with a billion possibilities.</p>
                                })}>Ride</li>
                                <li className="hover:text-white cursor-pointer transition-colors" onClick={() => setInfoModal({
                                    title: "Drive",
                                    content: <p>Be your own boss. Access flexible earnings, full insurance coverage, and 24/7 support as a driver partner.</p>
                                })}>Drive</li>
                                <li className="hover:text-white cursor-pointer transition-colors" onClick={() => setInfoModal({
                                    title: "Gaadiwala Electric",
                                    content: (
                                        <div className="space-y-4 text-teal-700">
                                            <p className="font-medium">Decarbonizing the world, one ride at a time.</p>
                                            <p>Our fleet consists of high-efficiency EVs designed for rugged Indian terrains.</p>
                                            <div className="size-24 bg-teal-50 rounded-full flex items-center justify-center mx-auto border-2 border-teal-100">
                                                <span className="material-symbols-outlined text-4xl">ev_station</span>
                                            </div>
                                        </div>
                                    )
                                })}>Gaadiwala Electric</li>
                                <li className="hover:text-white cursor-pointer transition-colors" onClick={() => setInfoModal({
                                    title: "Gaadiwala Money",
                                    content: <p>A seamless digital wallet for your travel and daily needs. Earn cashback on every transaction within our ecosystem.</p>
                                })}>Gaadiwala Money</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold mb-8 text-lg">Citizenship</h4>
                            <ul className="space-y-4 text-sm text-slate-400 font-medium">
                                <li className="hover:text-white cursor-pointer transition-colors" onClick={() => setInfoModal({
                                    title: "Safety",
                                    content: <p>Our #1 priority. From background checks to 24/7 SOS monitoring, we're building the world's safest mobility platform.</p>
                                })}>Safety</li>
                                <li className="hover:text-white cursor-pointer transition-colors" onClick={() => setInfoModal({
                                    title: "Diversity",
                                    content: <p>Equality in every ride. We're committed to building an inclusive community for riders and drivers of all backgrounds.</p>
                                })}>Diversity</li>
                                <li className="hover:text-white cursor-pointer transition-colors" onClick={() => setInfoModal({
                                    title: "Transparency",
                                    content: <p>Honest pricing, clear communication, and ethical operations. No hidden surges, no surprises.</p>
                                })}>Transparency</li>
                                <li className="hover:text-white cursor-pointer transition-colors" onClick={() => setInfoModal({
                                    title: "Sustainability",
                                    content: <p>Our roadmap to zero. We're transitioning our entire fleet to electric by 2030 to protect our planet.</p>
                                })}>Sustainability</li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-white/10 pt-10 flex flex-col md:flex-row justify-between items-center gap-6">
                        <p className="text-xs text-slate-500 font-medium">© 2026 Gaadiwala Technologies Inc. All rights reserved.</p>
                        <div className="flex gap-8 text-xs text-slate-500 font-bold uppercase tracking-widest">
                            <span className="hover:text-white cursor-pointer transition-colors" onClick={() => setInfoModal({
                                title: "Privacy Policy",
                                content: <p>Your data is yours. We use bank-grade encryption to protect your personal information and trip history.</p>
                            })}>Privacy</span>
                            <span className="hover:text-white cursor-pointer transition-colors" onClick={() => setInfoModal({
                                title: "Accessibility",
                                content: <p>Mobility for everyone. Our app is designed to be accessible to users with diverse needs and abilities.</p>
                            })}>Accessibility</span>
                            <span className="hover:text-white cursor-pointer transition-colors" onClick={() => setInfoModal({
                                title: "Terms of Service",
                                content: <p>Fair and clear. Our terms of service ensure a respectful and safe environment for all community members.</p>
                            })}>Terms</span>
                        </div>
                    </div>
                </div>
            </footer>

            {
                user && !loading && (user.role === UserRole.UNSET || !user.gender) && (
                    <ProfileCompletionOverlay user={user} updateUserProfile={updateUserProfile} logout={logout} />
                )
            }

            {/* About Us Team Modal */}
            {
                showAboutModal && (
                    <div
                        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-500"
                        onClick={(e) => e.target === e.currentTarget && setShowAboutModal(false)}
                    >
                        <div className="bg-white rounded-[3rem] p-10 max-w-2xl w-full shadow-2xl relative overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
                            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-orange-500 via-pink-500 to-teal-500"></div>
                            <button
                                onClick={() => setShowAboutModal(false)}
                                className="absolute top-6 right-6 size-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-orange-500 hover:text-white transition-all group"
                            >
                                <span className="material-symbols-outlined text-xl group-hover:rotate-90 transition-transform">close</span>
                            </button>

                            <div className="text-center mb-12">
                                <span className="text-orange-500 font-black uppercase tracking-[0.3em] text-[10px] mb-2 block">Our Visionaries</span>
                                <h2 className="text-4xl font-black tracking-tighter">Meet the Team</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {[
                                    { name: "Mayank Maurya", role: "Founder & Lead Architect", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mayank", bio: "Full-stack visionary driving mobility innovation.", email: "hpmayankmaurya@gmail.com" },
                                    { name: "Nishant Chaudhary", role: "Co-Founder & CTO", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Nishant", bio: "Optimizing ground operations and safety protocols.", email: "nishant7668245845@gmail com" },
                                    { name: "Waleed ul Haque", role: "Lead Developer", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Waleed", bio: "Architecting scalable systems for next-gen transport.", email: "waleedulhaque3@gmail.com" },
                                    // { name: "", role: "", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Vikram_1", bio: "", email: "" }
                                ].map((member, i) => (
                                    <div key={i} className="flex items-center gap-4 p-4 rounded-3xl bg-slate-50 border border-slate-100 group hover:border-orange-200 transition-all">
                                        <img src={member.img} className="size-16 rounded-2xl bg-white shadow-md group-hover:scale-110 transition-transform" alt={member.name} />
                                        <div>
                                            <h4 className="font-black text-slate-900 leading-none mb-1">{member.name}</h4>
                                            <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-1">{member.role}</p>
                                            <p className="text-[10px] text-slate-400 font-medium leading-tight mb-2">{member.bio}</p>
                                            <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full w-fit group-hover:bg-orange-50 transition-colors">
                                                <span className="material-symbols-outlined text-[10px]">mail</span>
                                                {member.email}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-12 text-center">
                                <p className="text-slate-500 text-xs font-medium">Building the future of mobility, together.</p>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Info Modal System */}
            {
                infoModal && (
                    <div
                        className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-300"
                        onClick={(e) => e.target === e.currentTarget && setInfoModal(null)}
                    >
                        <div className="bg-white rounded-[3rem] p-10 max-w-lg w-full shadow-2xl relative overflow-hidden border border-white/20 animate-in slide-in-from-bottom-12 duration-500">
                            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-orange-500 to-orange-600"></div>
                            <button
                                onClick={() => setInfoModal(null)}
                                className="absolute top-6 right-6 size-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-orange-500 hover:text-white transition-all"
                            >
                                <span className="material-symbols-outlined text-xl">close</span>
                            </button>

                            <div className="mb-8">
                                <span className="text-orange-500 font-black uppercase tracking-[0.3em] text-[10px] mb-2 block">Information</span>
                                <h2 className="text-3xl font-black tracking-tighter">{infoModal.title}</h2>
                            </div>

                            <div className="text-slate-600 font-medium leading-relaxed text-lg">
                                {infoModal.content}
                            </div>

                            <div className="mt-12 pt-6 border-t border-slate-100 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                <span>Gaadiwala Ecosystem</span>
                                <span>© 2026</span>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

// --- Profile Completion Overlay ---
const ProfileCompletionOverlay: React.FC<{
    user: any;
    updateUserProfile: (data: any) => Promise<void>;
    logout: () => Promise<void>;
}> = ({ user, updateUserProfile, logout }) => {
    const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | ''>(user.gender || '');
    const [role, setRole] = useState(user.role === 'UNSET' ? 'RIDER' : user.role); // Default to Rider if unset
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!gender) return alert("Please select gender");
        setIsSaving(true);
        try {
            await updateUserProfile({ gender, role });
        } catch (e) {
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-[3rem] p-10 max-w-md w-full shadow-2xl space-y-8 relative overflow-hidden border border-white/20">
                <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-orange-500 to-pink-500"></div>

                <div className="text-center">
                    <div className="size-20 bg-slate-100 rounded-3xl mx-auto mb-6 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
                        {user.avatar ? (
                            <img src={user.avatar} className="size-full object-cover" alt="Profile" />
                        ) : (
                            <span className="material-symbols-outlined text-4xl text-slate-400">person</span>
                        )}
                    </div>
                    <h2 className="text-3xl font-black tracking-tight mb-2">Almost there!</h2>
                    <p className="text-slate-500 font-medium">Please provide missing details to continue.</p>
                </div>

                <div className="space-y-6">
                    {user.role === 'UNSET' && (
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">I want to...</p>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setRole('RIDER')}
                                    className={`h-14 rounded-2xl border-2 font-bold flex items-center justify-center gap-2 transition-all ${role === 'RIDER' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-50 text-slate-400'}`}
                                >
                                    <span className="material-symbols-outlined">directions_car</span> Rider
                                </button>
                                <button
                                    onClick={() => setRole('DRIVER')}
                                    className={`h-14 rounded-2xl border-2 font-bold flex items-center justify-center gap-2 transition-all ${role === 'DRIVER' ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-50 text-slate-400'}`}
                                >
                                    <span className="material-symbols-outlined">sports_motorsports</span> Driver
                                </button>
                            </div>
                        </div>
                    )}

                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Gender</p>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setGender('MALE')}
                                className={`h-14 rounded-2xl border-2 font-bold flex items-center justify-center gap-2 transition-all ${gender === 'MALE' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-50 text-slate-400'}`}
                            >
                                <span className="material-symbols-outlined">male</span> Male
                            </button>
                            <button
                                onClick={() => setGender('FEMALE')}
                                className={`h-14 rounded-2xl border-2 font-bold flex items-center justify-center gap-2 transition-all ${gender === 'FEMALE' ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-slate-50 text-slate-400'}`}
                            >
                                <span className="material-symbols-outlined">female</span> Female
                            </button>
                        </div>
                    </div>
                </div>

                <div className="pt-4 space-y-3">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full h-16 bg-black text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 disabled:bg-slate-300"
                    >
                        {isSaving ? 'Saving...' : 'Complete Profile'}
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                    </button>
                    <button onClick={() => logout()} className="w-full text-center text-xs font-bold text-slate-400 hover:text-red-500 uppercase tracking-widest">Sign Out</button>
                </div>
            </div>
        </div>
    );
};

export default Welcome;
