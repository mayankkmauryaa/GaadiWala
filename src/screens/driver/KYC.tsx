
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { VehicleCategory } from '../../types';
import { useRef } from 'react';
import ScrollHint from '../../components/shared/ScrollHint';

interface Props {
    onComplete: (details: { vehicleImage: string; vehicleNumber: string; vehicleType: VehicleCategory; gender: 'MALE' | 'FEMALE' }) => Promise<void>;
}

const KYC: React.FC<Props> = ({ onComplete }) => {
    const [step, setStep] = useState<'vehicle' | 'verify'>('vehicle');
    const [vehicleType, setVehicleType] = useState<VehicleCategory>(VehicleCategory.MINI);
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [vehicleImage, setVehicleImage] = useState<string | null>(null);
    const [gender, setGender] = useState<'MALE' | 'FEMALE' | ''>('');
    const [isVerifying, setIsVerifying] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
                    const maxDim = 800; // Better quality than profile pic but still efficient

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

                    // Compress to JPEG 0.5 to ensure it stays well under 1MB even with other data
                    const compressed = canvas.toDataURL('image/jpeg', 0.5);
                    setVehicleImage(compressed);
                };
                img.src = reader.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    const handleNext = () => {
        if (!gender) {
            alert("Please select your gender.");
            return;
        }
        if (vehicleNumber && vehicleImage) {
            setStep('verify');
            // In a real app, this would route to /driver/digilocker
        } else {
            alert("Please upload vehicle image and enter number plate.");
        }
    };

    const handleSimulateDigiLocker = async () => {
        setIsVerifying(true);
        // Simulate DigiLocker processing time
        await new Promise(resolve => setTimeout(resolve, 2500));

        try {
            await onComplete({
                vehicleImage: vehicleImage || '',
                vehicleNumber: vehicleNumber || 'UP 85 XX 0000',
                vehicleType,
                gender: gender as 'MALE' | 'FEMALE'
            });
            // Redirect to dashboard after successful profile update
            navigate('/driver/dashboard');
        } catch (error) {
            console.error("KYC verification failed", error);
            setIsVerifying(false);
        }
    };

    return (
        <div className="bg-[#f6f7f8] h-dvh flex flex-col font-sans pb-safe">
            <header className="bg-white border-b border-slate-200 px-6 py-4">
                <div className="max-w-4xl mx-auto flex items-center justify-between pr-20">
                    <div className="flex items-center gap-3">
                        <div className="size-10 bg-[#134a58] text-white flex items-center justify-center rounded-lg shadow-lg">
                            <span className="material-symbols-outlined">verified</span>
                        </div>
                        <h2 className="text-xl font-black tracking-tight text-[#134a58]">Gaadiwala <span className="font-light italic opacity-70">Onboarding</span></h2>
                    </div>
                    {step === 'verify' && <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Step 2 of 2</div>}
                </div>
            </header>

            <main className="flex-1 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                <div
                    ref={modalRef}
                    className="max-w-xl w-full bg-white rounded-[2.5rem] sm:rounded-[3rem] border border-slate-200 p-6 sm:p-10 shadow-2xl animate-in zoom-in-95 duration-500 overflow-y-auto max-h-[85dvh] relative"
                >
                    <ScrollHint containerRef={modalRef} color="text-slate-400" />
                    {step === 'vehicle' ? (
                        <div className="space-y-6">
                            <div className="text-center">
                                <h1 className="text-3xl font-black text-[#134a58] mb-2">Vehicle Details</h1>
                                <p className="text-slate-500 text-sm">Upload photos and info of your vehicle.</p>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    {([VehicleCategory.BIKE, VehicleCategory.AUTO, VehicleCategory.MINI, VehicleCategory.PRIME] as VehicleCategory[]).map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setVehicleType(cat)}
                                            className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${vehicleType === cat ? 'border-[#134a58] bg-slate-50 text-[#134a58]' : 'border-slate-100 text-slate-400'
                                                }`}
                                        >
                                            <span className="material-symbols-outlined text-3xl">
                                                {cat === VehicleCategory.BIKE ? 'motorcycle' : cat === VehicleCategory.AUTO ? 'electric_rickshaw' : 'directions_car'}
                                            </span>
                                            <span className="text-[10px] font-black uppercase tracking-widest">{cat}</span>
                                        </button>
                                    ))}
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Gender</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setGender('MALE')}
                                            className={`h-14 rounded-2xl border-2 font-bold flex items-center justify-center gap-2 transition-all ${gender === 'MALE' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}
                                        >
                                            <span className="material-symbols-outlined">male</span> Male
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setGender('FEMALE')}
                                            className={`h-14 rounded-2xl border-2 font-bold flex items-center justify-center gap-2 transition-all ${gender === 'FEMALE' ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}
                                        >
                                            <span className="material-symbols-outlined">female</span> Female
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Vehicle Plate Number</label>
                                    <input
                                        type="text"
                                        value={vehicleNumber}
                                        onChange={e => setVehicleNumber(e.target.value.toUpperCase())}
                                        placeholder="e.g. UP 85 AQ 1234"
                                        className="text-black w-full h-14 px-4 rounded-2xl bg-slate-50 border-slate-200 focus:ring-4 focus:ring-[#134a58]/10 focus:border-[#134a58] font-bold"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Vehicle Photo</label>
                                    <div className="relative group h-40 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center bg-slate-50 overflow-hidden">
                                        {vehicleImage ? (
                                            <img src={vehicleImage} className="w-full h-full object-cover pointer-events-none" alt="vehicle preview" />
                                        ) : (
                                            <div className="flex flex-col items-center gap-2 pointer-events-none">
                                                <span className="material-symbols-outlined text-4xl text-slate-300">add_a_photo</span>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Add Photo</span>
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={handleNext}
                                    className="w-full h-16 bg-[#134a58] text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                                >
                                    Continue to Verification
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="text-center mb-10">
                                <div className="size-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-6 text-blue-600">
                                    <span className={`material-symbols-outlined text-5xl ${isVerifying ? 'animate-spin' : ''}`}>
                                        {isVerifying ? 'sync' : 'fingerprint'}
                                    </span>
                                </div>
                                <h1 className="text-4xl font-black text-[#134a58] mb-3 tracking-tighter">Identity Check</h1>
                                <p className="text-[#667e85] text-sm leading-relaxed font-medium">Verify your profile with <span className="font-bold text-blue-600">DigiLocker</span>.</p>
                            </div>

                            <div className="bg-blue-50/50 border border-blue-100 rounded-3xl p-8 flex flex-col items-center gap-6 group hover:bg-blue-50 transition-colors">
                                <button
                                    disabled={isVerifying}
                                    onClick={handleSimulateDigiLocker}
                                    className="w-full h-16 bg-[#134a58] text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                >
                                    {isVerifying ? 'Connecting DigiLocker...' : 'Verify Identity'}
                                </button>
                            </div>

                            <button onClick={() => setStep('vehicle')} className="w-full text-center text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-800 transition-colors">
                                Back to Vehicle Details
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default KYC;
