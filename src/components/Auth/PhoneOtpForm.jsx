import React, { useState, useEffect } from 'react';
import { initRecaptcha, sendPhoneOtp } from '../../firebase/authService';

export default function PhoneOtpForm() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('INPUT_PHONE'); // INPUT_PHONE | INPUT_OTP
  const [confirmResult, setConfirmResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Initialize invisible recaptcha on mount
    initRecaptcha('recaptcha-container');
  }, []);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Basic E.164 formatting
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`; 
    const appVerifier = window.recaptchaVerifier;

    try {
      const confirmation = await sendPhoneOtp(formattedPhone, appVerifier);
      setConfirmResult(confirmation);
      setStep('INPUT_OTP');
    } catch (err) {
      setError(err.message);
      if (window.recaptchaVerifier) {
          try {
            window.recaptchaVerifier.clear(); // Reset on error
          } catch(e) { /* ignore */ }
          initRecaptcha('recaptcha-container'); // Re-init
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await confirmResult.confirm(otp);
      // Success: AuthContext will pick up the user
    } catch (err) {
      setError("Invalid Code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div id="recaptcha-container"></div>
      
      {step === 'INPUT_PHONE' && (
        <form onSubmit={handleSendOtp} className="space-y-4">
           <div>
            <label className="block text-sm font-medium text-gray-700">Mobile Number</label>
            <div className="flex gap-2">
                <span className="flex items-center justify-center bg-gray-100 border border-gray-300 rounded-md px-3 font-bold text-gray-500">+91</span>
                <input 
                type="tel" 
                required 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm p-3 border"
                placeholder="98765 43210"
                />
            </div>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? 'Sending OTP...' : 'Get OTP'}
          </button>
        </form>
      )}

      {step === 'INPUT_OTP' && (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="text-center mb-4">
             <p className="text-sm text-gray-500">Code sent to +91{phone}</p>
             <button type="button" onClick={() => setStep('INPUT_PHONE')} className="text-xs text-blue-600">Change Number</button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Verification Code</label>
            <input 
              type="text" 
              required 
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-3 border text-center text-2xl tracking-widest"
              placeholder="123456"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </form>
      )}
    </div>
  );
}
