
import React, { useState, useEffect } from 'react';
import { User, SavedLocation } from '../../types';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, CONFIG } from '../../firebase';
import { validateAddress } from '../../services/LocationService';

interface Props {
    user: User;
    onSelect: (location: SavedLocation) => void;
    // New props for external control
    isAdding?: boolean;
    initialAddress?: string;
    onCancelAdd?: () => void;
    onSaveSuccess?: () => void;
}

const SavedPlaces: React.FC<Props> = ({
    user,
    onSelect,
    isAdding: externalIsAdding = false,
    initialAddress = '',
    onCancelAdd,
    onSaveSuccess
}) => {
    // We use internal state if external props aren't provided (backward compatibility)
    const [internalIsAdding, setInternalIsAdding] = useState(false);
    const isAdding = externalIsAdding || internalIsAdding;

    const [newLabel, setNewLabel] = useState('Home');
    const [newAddress, setNewAddress] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Sync input with initialAddress when isAdding becomes true
    useEffect(() => {
        if (isAdding && initialAddress) {
            setNewAddress(initialAddress);
        }
    }, [isAdding, initialAddress]);

    const handleSave = async () => {
        if (!newAddress) return;
        setIsValidating(true);
        setError(null);

        try {
            // 1. Validate Address using Google API
            const validation = await validateAddress(newAddress, CONFIG.MAPS_API_KEY);

            if (!validation.isValid) {
                setError("Could not verify this address. Please try again.");
                setIsValidating(false);
                return;
            }

            const locationToSave: SavedLocation = {
                id: Date.now().toString(),
                label: newLabel,
                address: validation.formattedAddress, // Use corrected address
                coords: validation.coordinates || { lat: 0, lng: 0 }, // Fallback
                type: newLabel === 'Home' ? 'HOME' : newLabel === 'Work' ? 'WORK' : 'OTHER'
            };

            // 2. Save to Firestore
            const userRef = doc(db, 'users', user.id);
            await updateDoc(userRef, {
                savedLocations: arrayUnion(locationToSave)
            });

            // Reset logic
            setInternalIsAdding(false);
            setNewAddress('');
            setNewLabel('Home');

            // Notify parent
            if (onSaveSuccess) onSaveSuccess();
            if (onCancelAdd) onCancelAdd();

        } catch (err) {
            console.error(err);
            setError("Failed to save location.");
        } finally {
            setIsValidating(false);
        }
    };

    const handleDelete = async (location: SavedLocation) => {
        try {
            const userRef = doc(db, 'users', user.id);
            await updateDoc(userRef, {
                savedLocations: arrayRemove(location)
            });
        } catch (err) {
            console.error("Failed to delete location", err);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
                <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Saved Places</p>

            </div>

            {/* List Saved Places */}
            <div className="grid grid-cols-2 gap-2">
                {user.savedLocations?.map((loc) => (
                    <div key={loc.id} className="relative group">
                        <button
                            onClick={() => onSelect(loc)}
                            className="w-full flex items-center gap-2 p-3 bg-white/5 border border-white/5 rounded-xl hover:border-white/20 hover:bg-white/10 transition-all"
                        >
                            <div className={`size-8 rounded-lg flex items-center justify-center ${loc.label === 'Home' ? 'bg-blue-500/20 text-blue-400' :
                                loc.label === 'Work' ? 'bg-orange-500/20 text-orange-400' :
                                    'bg-purple-500/20 text-purple-400'
                                }`}>
                                <span className="material-symbols-outlined text-sm">
                                    {loc.label === 'Home' ? 'home' : loc.label === 'Work' ? 'work' : 'star'}
                                </span>
                            </div>
                            <div className="flex-1 text-left overflow-hidden">
                                <p className="text-[10px] font-black text-white uppercase truncate">{loc.label}</p>
                                <p className="text-[8px] text-slate-400 truncate">{loc.address}</p>
                            </div>
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(loc); }}
                            className="absolute -top-1 -right-1 size-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        >
                            <span className="material-symbols-outlined text-[10px]">close</span>
                        </button>
                    </div>
                ))}
            </div>

            {/* Add New Form */}
            {isAdding && (
                <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-3 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center">
                        <p className="text-[10px] font-bold text-white">Save Current Location</p>
                        <button
                            onClick={onCancelAdd || (() => setInternalIsAdding(false))}
                            className="text-[9px] text-slate-500 hover:text-white"
                        >
                            Cancel
                        </button>
                    </div>

                    <div className="flex gap-2">
                        {['Home', 'Work', 'Other'].map(label => (
                            <button
                                key={label}
                                onClick={() => setNewLabel(label)}
                                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${newLabel === label
                                    ? 'bg-[#22c55e] text-black'
                                    : 'bg-black/20 text-slate-400 hover:text-white'
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <input
                        value={newAddress}
                        onChange={(e) => setNewAddress(e.target.value)}
                        placeholder="Enter address..."
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-[#22c55e]/50"
                    />
                    {error && <p className="text-[9px] text-red-500">{error}</p>}
                    <button
                        onClick={handleSave}
                        disabled={isValidating || !newAddress}
                        className="w-full py-2 bg-[#22c55e] text-black rounded-lg text-xs font-black hover:bg-[#22c55e]/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isValidating ? (
                            <>
                                <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                                Verifying Address...
                            </>
                        ) : (
                            'Save Location'
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

export default SavedPlaces;
