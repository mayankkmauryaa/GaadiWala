import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ConfirmationResult } from 'firebase/auth';

interface PhoneVerificationProps {
    phone: string;
    onVerified: () => void;
    onChangePhone?: (phone: string) => void;
}

const PhoneVerification: React.FC<PhoneVerificationProps> = ({ phone, onVerified, onChangePhone }) => {
    const { setupRecaptcha, requestOtp, verifyOtp } = useAuth();
    const [otp, setOtp] = useState('');
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState<'INPUT' | 'VERIFY'>('INPUT');

    useEffect(() => {
        // Initialize recaptcha when component mounts
        setupRecaptcha('recaptcha-container');
    }, [setupRecaptcha]);

    const handleSendOtp = async () => {
        setLoading(true);
        setError('');
        try {
            const result = await requestOtp(phone);
            setConfirmationResult(result);
            setStep('VERIFY');
        } catch (err: any) {
            setError(err.message || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!confirmationResult) return;
        setLoading(true);
        setError('');
        try {
            await verifyOtp(confirmationResult, otp);
            onVerified();
        } catch (err: any) {
            setError(err.message || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', maxWidth: '400px' }}>
            <h3>Phone Verification</h3>
            <div id="recaptcha-container"></div>

            {error && <p style={{ color: 'red' }}>{error}</p>}

            {step === 'INPUT' && (
                <div>
                    <div style={{ marginBottom: '10px' }}>
                        <label>Phone Number:</label>
                        <input
                            type="text"
                            value={phone}
                            onChange={(e) => onChangePhone && onChangePhone(e.target.value)}
                            placeholder="To change, edit inside parent form"
                            disabled={!onChangePhone}
                            style={{ marginLeft: '10px', padding: '5px' }}
                        />
                    </div>
                    <button onClick={handleSendOtp} disabled={loading || !phone} style={{ padding: '8px 16px', cursor: 'pointer' }}>
                        {loading ? 'Sending...' : 'Send OTP'}
                    </button>
                </div>
            )}

            {step === 'VERIFY' && (
                <div>
                    <div style={{ marginBottom: '10px' }}>
                        <label>Enter OTP:</label>
                        <input
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            placeholder="123456"
                            style={{ marginLeft: '10px', padding: '5px' }}
                        />
                    </div>
                    <button onClick={handleVerifyOtp} disabled={loading || !otp} style={{ padding: '8px 16px', cursor: 'pointer', marginRight: '10px' }}>
                        {loading ? 'Verifying...' : 'Verify OTP'}
                    </button>
                    <button onClick={() => setStep('INPUT')} disabled={loading} style={{ padding: '8px 16px', cursor: 'pointer' }}>
                        Change Number
                    </button>
                </div>
            )}
        </div>
    );
};

export default PhoneVerification;
