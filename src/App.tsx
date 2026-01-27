import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { UserRole, Language } from './types';
// import { User, VehicleCategory, SavedLocation, ScheduledRide } from './types';
import RiderHome from './screens/rider/RiderHome';
import FlexFare from './screens/rider/FlexFare';
import TiffinMarketplace from './screens/rider/TiffinMarketplace';
import DriverDashboard from './screens/driver/DriverDashboard';
import AdminHQ from './screens/admin/AdminHQ';
import LiveTracking from './screens/rider/LiveTracking';
import Earnings from './screens/driver/Earnings';
import KYC from './screens/driver/KYC';
import DriverProfile from './screens/driver/DriverProfile';
import Welcome from './screens/Welcome';
import RiderProfile from './screens/rider/RiderProfile';
import Wallet from './screens/rider/Wallet';
import NavigationOverlay from './components/NavigationOverlay';
import ErrorBoundary from './components/ErrorBoundary';
import EmailComplete from './screens/EmailComplete';
import TripSummary from './screens/rider/TripSummary';
// import SelectRole from './screens/SelectRole';
import { AuthProvider, useAuth } from './context/AuthContext';
// import AuthTestScreen from './screens/AuthTestScreen';

import PremiumLoader from './components/PremiumLoader';
import { AnimatePresence } from 'framer-motion';
import CinematicIntro from './components/CinematicIntro';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: UserRole[] }) => {
  const location = useLocation();
  const { user, loading } = useAuth();

  if (loading) return <PremiumLoader />;

  if (!user) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  if (!allowedRoles.includes(user.role)) {
    // Redirect to correct dashboard based on actual role
    if (user.role === UserRole.RIDER) return <Navigate to="/user/home" replace />;
    if (user.role === UserRole.DRIVER) return <Navigate to="/driver/dashboard" replace />;
    if (user.role === UserRole.ADMIN) return <Navigate to="/admin/dashboard" replace />;
    // If Unset, let them stay logic or redirect to role selection (handled in Welcome usually but if logged in?)
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const { user, logout, updateUserProfile } = useAuth();
  const [lang, setLang] = useState<Language>('en');

  // handlers are now largely unnecessary for auth, but kept for placeholders or specific feature logic
  // if they don't involve auth state management directly.

  // Feature Handlers (Mock logic moved from old App.tsx, should be updated to use DB in future tasks)

  // Note: These handlers like saveLocation, scheduleRide only update local state in old app. 
  // In new app, these should rely on components calling Firestore directly or via hooks.
  // For now, we will pass empty functions or simple logs to screens until those screens are refactored to use hooks/context.

  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <div className="relative w-full min-h-dvh h-dvh font-sans selection:bg-[#22c55e] selection:text-black bg-[#0F172A] text-slate-200 overflow-hidden">
      {user && !isAdmin && (
        <NavigationOverlay
          user={user!}
          onLogout={logout}
          updateUserProfile={updateUserProfile}
        />
      )}

      <Routes>
        {/* --- Public / Auth Routes --- */}
        <Route path="/" element={
          (!user || user.role === UserRole.UNSET) ? <Welcome /> : <Navigate to={
            user.role === UserRole.RIDER ? "/user/home" :
              user.role === UserRole.DRIVER ? "/driver/dashboard" :
                user.role === UserRole.ADMIN ? "/admin/dashboard" : "/auth/select-role"
          } />
        } />

        <Route path="/auth/email-complete" element={<EmailComplete />} />
        {/* <Route path="/auth/select-role" element={<SelectRole />} /> */}

        <Route path="/auth/:role/:mode" element={
          !user ? <Welcome /> : <Navigate to="/" />
        } />

        {/* --- User (Rider) Routes --- */}
        <Route path="/user/home" element={
          <ProtectedRoute allowedRoles={[UserRole.RIDER]}>
            <RiderHome user={user!} onSaveLocation={() => { }} onSchedule={() => { }} />
          </ProtectedRoute>
        } />
        <Route path="/user/fare" element={
          <ProtectedRoute allowedRoles={[UserRole.RIDER]}>
            <FlexFare onSchedule={() => { }} />
          </ProtectedRoute>
        } />
        <Route path="/user/live-tracking" element={
          <ProtectedRoute allowedRoles={[UserRole.RIDER]}>
            <LiveTracking />
          </ProtectedRoute>
        } />
        <Route path="/user/trip-summary" element={
          <ProtectedRoute allowedRoles={[UserRole.RIDER]}>
            <TripSummary />
          </ProtectedRoute>
        } />
        <Route path="/user/profile" element={
          <ProtectedRoute allowedRoles={[UserRole.RIDER]}>
            <RiderProfile user={user!} onVerify={() => { }} updateUserProfile={updateUserProfile} />
          </ProtectedRoute>
        } />
        <Route path="/user/tiffin" element={
          <ProtectedRoute allowedRoles={[UserRole.RIDER]}>
            <TiffinMarketplace user={user!} />
          </ProtectedRoute>
        } />
        <Route path="/user/wallet" element={
          <ProtectedRoute allowedRoles={[UserRole.RIDER]}>
            <Wallet />
          </ProtectedRoute>
        } />


        {/* --- Driver Routes --- */}
        <Route path="/driver/dashboard" element={
          <ProtectedRoute allowedRoles={[UserRole.DRIVER]}>
            {!user?.isKycCompleted ? (
              <Navigate to="/driver/kyc" replace />
            ) : (
              <DriverDashboard user={user!} lang={lang} setLang={setLang} />
            )}
          </ProtectedRoute>
        } />

        <Route path="/driver/kyc" element={
          <ProtectedRoute allowedRoles={[UserRole.DRIVER]}>
            <KYC onComplete={async (details) => {
              try {
                await updateUserProfile({
                  ...details,
                  isKycCompleted: true
                });
              } catch (error: any) {
                console.error("KYC Save Error:", error);
                alert(`Failed to save verification status: ${error.message || 'Unknown error'}. Please ensure your internet connection is stable and try again.`);
              }
            }} />
          </ProtectedRoute>
        } />

        {/* Legacy route mappings */}
        <Route path="/driver/verify-vehicle" element={<Navigate to="/driver/kyc" />} />
        <Route path="/driver/digilocker" element={<Navigate to="/driver/kyc" />} />
        <Route path="/driver/partner-verification" element={<Navigate to="/driver/dashboard" />} />

        <Route path="/driver/earnings" element={
          <ProtectedRoute allowedRoles={[UserRole.DRIVER]}>
            <Earnings user={user!} lang={lang} />
          </ProtectedRoute>
        } />
        <Route path="/driver/profile" element={
          <ProtectedRoute allowedRoles={[UserRole.DRIVER]}>
            <DriverProfile user={user!} lang={lang} updateUserProfile={updateUserProfile} logout={logout} />
          </ProtectedRoute>
        } />

        {/* --- Admin Routes --- */}
        <Route path="/admin/dashboard" element={
          <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
            <AdminHQ onApprove={() => { }} />
          </ProtectedRoute>
        } />
        <Route path="/admin/approval" element={<Navigate to="/admin/dashboard" />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};


const App: React.FC = () => {
  const [showIntro, setShowIntro] = useState(true);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <AnimatePresence mode="wait">
            {showIntro && (
              <CinematicIntro onComplete={() => setShowIntro(false)} />
            )}
          </AnimatePresence>
          {/* Main App Content - loaded behind/after intro */}
          <AppContent />
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
