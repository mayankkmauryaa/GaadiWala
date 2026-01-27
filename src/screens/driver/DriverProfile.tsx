import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Language, VehicleCategory } from '../../types';
import ScrollHint from '../../components/shared/ScrollHint';

interface Props {
    user: User;
    lang: Language;
    updateUserProfile: (data: Partial<User>) => Promise<void>;
    logout: () => Promise<void>;
}

const DriverProfile: React.FC<Props> = ({ user, lang, updateUserProfile, logout }) => {
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const languagesList = ['English', 'Hindi', 'Punjabi', 'Bengali', 'Tamil', 'Telugu', 'Marathi'];

    const [formData, setFormData] = useState({
        name: user.name || '',
        avatar: user.avatar || '',
        phone: user.phone || '',
        vehicleModel: user.vehicleModel || '',
        vehicleNumber: user.vehicleNumber || '',
        vehicleType: user.vehicleType || VehicleCategory.MINI,
        vehicleImage: user.vehicleImage || '',
        bio: user.bio || '',
        languages: user.languages || [] as string[],
    });

    const stats = [
        { label: 'Rating', value: user.rating || '4.9', icon: 'star', color: 'text-amber-400' },
        { label: 'Trips', value: user.totalRides || '124', icon: 'local_taxi', color: 'text-blue-400' },
        { label: 'Level', value: 'Gold', icon: 'military_tech', color: 'text-amber-500' },
    ];

    const t = {
        en: {
            title: 'Partner Profile',
            vehicle: 'Vehicle Details',
            account: 'Account Information',
            logout: 'Sign Out',
            back: 'Back to Dashboard',
            verified: 'Verified Partner',
            edit: 'Edit Profile',
            save: 'Save Changes',
            cancel: 'Cancel',
            about: 'About Me',
            lang: 'Languages Spoken'
        },
        hi: {
            title: 'पार्टनर प्रोफाइल',
            vehicle: 'वाहन विवरण',
            account: 'खाता विवरण',
            logout: 'साइन आउट',
            back: 'डैशबोर्ड पर वापस',
            verified: 'सत्यापित पार्टनर',
            edit: 'प्रोफ़ाइल बदलें',
            save: 'बदलाव सहेजें',
            cancel: 'रद्द करें',
            about: 'मेरे बारे में',
            lang: 'बोली जाने वाली भाषाएं'
        }
    };

    const text = t[lang] || t.en;

    const handleVehicleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                alert("Image too large. Please select a file under 10MB.");
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const maxDim = 800;

                    if (width > height) {
                        if (width > maxDim) {
                            height *= maxDim / width;
                            width = maxDim;
                        }
                    } else {
                        if (height > maxDim) {
                            width *= maxDim / height;
                            height = maxDim;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    const compressed = canvas.toDataURL('image/jpeg', 0.6);
                    setFormData({ ...formData, vehicleImage: compressed });
                };
                img.src = reader.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    const toggleLanguage = (l: string) => {
        const cur = formData.languages;
        if (cur.includes(l)) {
            setFormData({ ...formData, languages: cur.filter(item => item !== l) });
        } else {
            setFormData({ ...formData, languages: [...cur, l] });
        }
    };

    const handleSave = async () => {
        setError(null);
        // Validation for Pink Cab
        if (formData.vehicleType === VehicleCategory.PINK && user.gender !== 'FEMALE') {
            setError("Pink Cab service is strictly available for female partners to ensure passenger safety.");
            return;
        }

        setIsSaving(true);
        try {
            const vehicleChanged =
                formData.vehicleModel !== (user.vehicleModel || '') ||
                formData.vehicleNumber !== (user.vehicleNumber || '') ||
                formData.vehicleType !== user.vehicleType ||
                formData.vehicleImage !== (user.vehicleImage || '');

            const updateData: Partial<User> = {
                ...formData,
                ...(vehicleChanged ? {
                    isApproved: false,
                    rejectionReason: "Critical vehicle details updated - Admin re-verification required."
                } : {})
            };

            await updateUserProfile(updateData);
            setIsEditing(false);

            if (vehicleChanged) {
                alert("Sensitive vehicle data has been updated. Your account has been set to 'Pending Approval' for security verification.");
                navigate('/driver/dashboard');
            }
        } catch (err) {
            console.error("Save Error:", err);
            setError("Failed to update profile. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const maxDim = 400; // Small but sharp for profile

                    if (width > height) {
                        if (width > maxDim) {
                            height *= maxDim / width;
                            width = maxDim;
                        }
                    } else {
                        if (height > maxDim) {
                            width *= maxDim / height;
                            height = maxDim;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    const compressed = canvas.toDataURL('image/jpeg', 0.7);
                    setFormData({ ...formData, avatar: compressed });
                };
                img.src = reader.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div
            ref={scrollRef}
            className="min-h-dvh bg-[#0A0E12] text-white font-sans p-4 sm:p-6 pb-20 overflow-y-auto relative scroll-smooth animate-in fade-in duration-700"
        >
            <ScrollHint containerRef={scrollRef} />
            <header className="max-w-2xl mx-auto flex items-center justify-between mb-8">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{text.back}</span>
                </button>
                <div className="flex gap-3">
                    {isEditing && (
                        <button
                            onClick={() => setIsEditing(false)}
                            className="px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest text-slate-500 hover:text-white"
                        >
                            {text.cancel}
                        </button>
                    )}
                    <button
                        onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                        disabled={isSaving}
                        className={`flex items-center gap-2 px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest transition-all ${isEditing ? 'bg-[#00D1FF] text-black shadow-[0_0_20px_rgba(0,209,255,0.3)]' : 'bg-white/5 border border-white/10 text-[#00D1FF] hover:bg-white/10'}`}
                    >
                        {isSaving ? 'Saving...' : (isEditing ? text.save : text.edit)}
                        {!isSaving && <span className="material-symbols-outlined text-sm">{isEditing ? 'check' : 'edit'}</span>}
                    </button>
                </div>
            </header>

            {!user.isApproved && (
                <div className="max-w-2xl mx-auto mb-8 animate-in slide-in-from-top duration-500">
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-6 flex items-center gap-4">
                        <div className="size-12 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-amber-500 animate-pulse">id_card</span>
                        </div>
                        <div>
                            <p className="text-sm font-black text-white uppercase tracking-wider">Approval Pending</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{user.rejectionReason || 'Your account details are being verified by our team.'}</p>
                        </div>
                    </div>
                </div>
            )}

            <main className="max-w-2xl mx-auto space-y-8">
                {/* Profile Header */}
                <div className="text-center space-y-4">
                    <div className="relative inline-block group">
                        <div className="size-32 rounded-[2.5rem] bg-slate-800 border-4 border-[#00D1FF] overflow-hidden shadow-[0_0_30px_rgba(0,209,255,0.2)]">
                            <img src={formData.avatar || user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} className="size-full object-cover" alt="avatar" />
                        </div>
                        {isEditing && (
                            <>
                                <div className="absolute inset-0 bg-black/60 rounded-[2.5rem] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    <span className="material-symbols-outlined text-white">photo_camera</span>
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarChange}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                            </>
                        )}
                        {user.isKycCompleted && !isEditing && (
                            <div className="absolute -bottom-2 -right-2 bg-[#00D1FF] text-black size-8 rounded-xl flex items-center justify-center border-4 border-[#0A0E12] shadow-lg">
                                <span className="material-symbols-outlined text-sm font-black">verified</span>
                            </div>
                        )}
                    </div>
                    <div>
                        {isEditing ? (
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="bg-white/5 border border-[#00D1FF]/30 rounded-xl px-4 py-2 text-center text-3xl font-black text-white focus:outline-none focus:border-[#00D1FF] w-full max-w-sm"
                                placeholder="Captain Name"
                            />
                        ) : (
                            <h1 className="text-3xl font-black tracking-tight">{user.name}</h1>
                        )}
                        <div className="flex items-center justify-center gap-2 mt-2">
                            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em]">{text.verified}</p>
                            {user.vehicleType === VehicleCategory.PINK && (
                                <span className="bg-pink-500/10 text-pink-500 text-[8px] font-black px-2 py-0.5 rounded-full border border-pink-500/20 uppercase">Pink Cab Partner</span>
                            )}
                        </div>
                        {isEditing && (
                            <div className="mt-4 px-6 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg animate-pulse">
                                <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest text-center">
                                    Updating vehicle details will trigger account re-verification
                                </p>
                            </div>
                        )}
                        {error && (
                            <div className="mt-4 px-6 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                                <p className="text-[10px] font-black text-red-500 uppercase tracking-widest text-center leading-relaxed">
                                    {error}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4">
                    {stats.map((stat, i) => (
                        <div key={i} className="bg-[#161B22] p-5 rounded-[2rem] border border-white/5 text-center space-y-1">
                            <span className={`material-symbols-outlined ${stat.color}`}>{stat.icon}</span>
                            <p className="text-xl font-black">{stat.value}</p>
                            <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* Bio & Bio */}
                <div className="bg-[#161B22] rounded-[2.5rem] border border-white/5 p-8">
                    <h3 className="text-[10px] font-black uppercase text-[#00D1FF] tracking-[0.2em] mb-4">{text.about}</h3>
                    {isEditing ? (
                        <textarea
                            value={formData.bio}
                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-medium text-slate-300 outline-none focus:border-[#00D1FF]/50 min-h-[100px] resize-none"
                            placeholder="Tell riders about yourself, your hobbies or your driving history..."
                        />
                    ) : (
                        <p className="text-xs font-medium text-slate-300 leading-relaxed italic">
                            {user.bio || "No bio added yet. Tell your riders a bit about yourself!"}
                        </p>
                    )}

                    <h3 className="text-[10px] font-black uppercase text-[#00D1FF] tracking-[0.2em] mb-4 mt-8">{text.lang}</h3>
                    <div className="flex flex-wrap gap-2">
                        {isEditing ? (
                            languagesList.map(l => (
                                <button
                                    key={l}
                                    onClick={() => toggleLanguage(l)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-bold transition-all ${formData.languages.includes(l) ? 'bg-[#00D1FF] text-black' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                                >
                                    {l}
                                </button>
                            ))
                        ) : (
                            (user.languages || []).length > 0 ? (user.languages || []).map(l => (
                                <span key={l} className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-[10px] font-bold text-slate-300">
                                    {l}
                                </span>
                            )) : <p className="text-[10px] text-slate-600 font-bold italic">No languages selected</p>
                        )}
                    </div>
                </div>

                {/* Info Sections */}
                <div className="space-y-4">
                    <div className="bg-[#161B22] rounded-[2.5rem] border border-white/5 p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <span className="material-symbols-outlined text-6xl">directions_car</span>
                        </div>
                        <h3 className="text-[10px] font-black uppercase text-[#00D1FF] tracking-[0.2em] mb-6">{text.vehicle}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 relative z-10">
                            <div>
                                <p className="text-[8px] font-black uppercase text-slate-500 mb-2">Vehicle Type</p>
                                {isEditing ? (
                                    <div className="relative">
                                        <select
                                            value={formData.vehicleType}
                                            onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value as VehicleCategory })}
                                            className={`bg-white/5 border ${formData.vehicleType === VehicleCategory.PINK ? 'border-pink-500/50 text-pink-400' : 'border-white/10 text-white'} rounded-lg px-2 py-1.5 w-full text-sm font-bold focus:outline-none focus:border-[#00D1FF]/50 appearance-none`}
                                        >
                                            {Object.values(VehicleCategory).map(cat => (
                                                <option key={cat} value={cat} className="bg-[#161B22] text-white">{cat === VehicleCategory.PINK ? '✨ PINK CAB' : cat}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                                            <span className="material-symbols-outlined text-sm">unfold_more</span>
                                        </div>
                                    </div>
                                ) : (
                                    <p className={`font-bold ${user.vehicleType === VehicleCategory.PINK ? 'text-pink-500' : ''}`}>{user.vehicleType || '---'}</p>
                                )}
                            </div>
                            <div>
                                <p className="text-[8px] font-black uppercase text-slate-500 mb-2">Model</p>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={formData.vehicleModel}
                                        onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
                                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 w-full text-sm font-bold focus:outline-none focus:border-[#00D1FF]/50"
                                    />
                                ) : (
                                    <p className="font-bold">{user.vehicleModel || '---'}</p>
                                )}
                            </div>
                            <div className="sm:col-span-2">
                                <p className="text-[8px] font-black uppercase text-slate-500 mb-2">License Plate</p>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={formData.vehicleNumber}
                                        onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 w-full text-lg sm:text-xl font-black tracking-widest text-[#00D1FF] uppercase focus:outline-none focus:border-[#00D1FF]/50"
                                        placeholder="UP 85 XX 0000"
                                    />
                                ) : (
                                    <p className="text-xl sm:text-2xl font-black tracking-widest text-[#00D1FF]">{user.vehicleNumber || '---'}</p>
                                )}
                            </div>
                            <div className="col-span-2 mt-4">
                                <p className="text-[8px] font-black uppercase text-slate-500 mb-2">Vehicle Photo</p>
                                {isEditing ? (
                                    <div className="space-y-4">
                                        <div className="relative group h-32 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center bg-white/5 overflow-hidden transition-all hover:border-[#00D1FF]/50">
                                            {formData.vehicleImage ? (
                                                <img src={formData.vehicleImage} className="w-full h-full object-cover pointer-events-none" alt="vehicle preview" />
                                            ) : (
                                                <div className="flex flex-col items-center gap-2 pointer-events-none">
                                                    <span className="material-symbols-outlined text-slate-500">add_a_photo</span>
                                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Select Photo</span>
                                                </div>
                                            )}

                                            {formData.vehicleImage && (
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                    <span className="text-[8px] font-black text-white uppercase tracking-widest bg-black/40 px-3 py-1.5 rounded-lg border border-white/10">Change Photo</span>
                                                </div>
                                            )}

                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleVehicleImageChange}
                                                className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                                            />
                                        </div>
                                        <p className="text-[9px] text-slate-600 font-bold italic px-2 leading-tight">Verification requires a high-resolution, clear photo of the side of your vehicle.</p>
                                    </div>
                                ) : (
                                    <div className="w-full h-32 bg-white/5 rounded-2xl border border-white/5 overflow-hidden flex items-center justify-center group overflow-hidden">
                                        {user.vehicleImage ? (
                                            <img src={user.vehicleImage} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="vehicle" />
                                        ) : (
                                            <span className="material-symbols-outlined text-slate-700 text-3xl">directions_car</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#161B22] rounded-[2.5rem] border border-white/5 p-8">
                        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-6">{text.account}</h3>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 shrink-0">
                                        <span className="material-symbols-outlined text-sm">call</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[8px] font-black uppercase text-slate-500 mb-1">Phone</p>
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                value={formData.phone}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 w-full text-sm font-bold focus:outline-none focus:border-[#00D1FF]/50"
                                            />
                                        ) : (
                                            <p className="text-sm font-bold">+91 {user.phone}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 shrink-0">
                                        <span className="material-symbols-outlined text-sm">mail</span>
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black uppercase text-slate-500">Email</p>
                                        <p className="text-sm font-bold text-slate-400">{user.email || 'Not provided'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {!isEditing && (
                    <button
                        onClick={() => logout()}
                        className="w-full h-16 bg-red-500/10 text-red-500 border border-red-500/20 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-xl active:scale-95"
                    >
                        {text.logout}
                    </button>
                )}
            </main>
        </div>
    );
};

export default DriverProfile;
