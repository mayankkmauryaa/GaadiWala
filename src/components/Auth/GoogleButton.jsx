import React from 'react';
import { signInWithGoogle } from '../../firebase/authService';

export default function GoogleButton() {
  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      // Error handled in service or globally
      console.error(error);
    }
  };

  return (
    <button 
      onClick={handleGoogleSignIn}
      className="w-full flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-300 py-3 rounded-lg font-bold hover:bg-gray-50 transition-colors"
    >
      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5"/>
      Sign in with Google
    </button>
  );
}
