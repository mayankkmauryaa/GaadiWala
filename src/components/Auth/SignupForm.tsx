import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import PhoneVerification from './PhoneVerification';
import { useNavigate } from 'react-router-dom';

const SignupForm: React.FC = () => {
    const { signup } = useAuth();
    const navigate = useNavigate();

    // Form State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');

    // Flow State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState<'DETAILS' | 'PHONE_VERIFY'>('DETAILS');

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // 1. Create User (Authentication + Firestore Doc)
            await signup(email, password, phone, name);
            // 2. Move to Phone Verification
            setStep('PHONE_VERIFY');
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') {
                setError('Email is already registered.');
            } else if (err.code === 'auth/weak-password') {
                setError('Password should be at least 6 characters.');
            } else {
                setError(err.message || 'Failed to create account.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handlePhoneVerified = () => {
        // Phone verification successful
        // You can update user profile here if needed (e.g. set isApproved=true or verify phone flag)
        navigate('/dashboard'); // or wherever you want to redirect
    };

    return (
        <div style={{ maxWidth: '400px', margin: '20px auto', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
            <h2>Sign Up</h2>
            {error && <div style={{ background: '#ffdddd', color: 'red', padding: '10px', marginBottom: '10px' }}>{error}</div>}

            {step === 'DETAILS' && (
                <form onSubmit={handleSignup}>
                    <div style={{ marginBottom: '15px' }}>
                        <label>Full Name</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                        />
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                        <label>Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                        />
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                        <label>Password</label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                        />
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                        <label>Phone Number</label>
                        <input
                            type="tel"
                            required
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="9876543210"
                            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                        />
                    </div>
                    <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        {loading ? 'Creating Account...' : 'Continue'}
                    </button>
                    <p style={{ marginTop: '10px', textAlign: 'center' }}>
                        Already have an account? <a href="/login">Log In</a>
                    </p>
                </form>
            )}

            {step === 'PHONE_VERIFY' && (
                <div>
                    <p>Account created! Please verify your phone number.</p>
                    <PhoneVerification
                        phone={phone}
                        onVerified={handlePhoneVerified}
                        // Optionally allow changing phone if they made a typo
                        onChangePhone={setPhone}
                    />
                    <button onClick={() => navigate('/dashboard')} style={{ marginTop: '20px', background: 'none', border: 'none', color: '#666', textDecoration: 'underline', cursor: 'pointer' }}>
                        Skip for now
                    </button>
                </div>
            )}
        </div>
    );
};

export default SignupForm;
