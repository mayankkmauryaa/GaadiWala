import React, { useState } from 'react';
import SignupForm from '../components/Auth/SignupForm';
import LoginForm from '../components/Auth/LoginForm';

const AuthTestScreen: React.FC = () => {
    const [view, setView] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');

    return (
        <div style={{ padding: '20px' }}>
            <h1>Auth Implementation Test</h1>
            <div style={{ marginBottom: '20px' }}>
                <button onClick={() => setView('LOGIN')} style={{ marginRight: '10px', fontWeight: view === 'LOGIN' ? 'bold' : 'normal' }}>Login View</button>
                <button onClick={() => setView('SIGNUP')} style={{ fontWeight: view === 'SIGNUP' ? 'bold' : 'normal' }}>Signup View</button>
            </div>

            {view === 'LOGIN' ? <LoginForm /> : <SignupForm />}
        </div>
    );
};

export default AuthTestScreen;
