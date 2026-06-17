// What this file does: React Router setup, wrapping application in AuthProvider
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Structured Pages
import LandingPage        from './pages/LandingPage';
import LoginPage          from './pages/LoginPage';
import SignupPage         from './pages/SignupPage';
import BrowsePage         from './pages/BrowsePage';
import PropertyDetailPage from './pages/PropertyDetailPage';
import ProfilePage        from './pages/ProfilePage';
import AdminLoginPage     from './pages/admin/AdminLoginPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';

// Handles page transitions inside router context
function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* ── Public ── */}
        <Route path="/"          element={<LandingPage />} />
        <Route path="/login"     element={<LoginPage />} />
        <Route path="/signup"    element={<SignupPage />} />
        <Route path="/browse"    element={<BrowsePage />} />
        <Route path="/property/:id" element={<PropertyDetailPage />} />

        {/* ── Protected user profile ── */}
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/saved"   element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

        {/* ── Admin Portal ── */}
        <Route path="/admin/login"       element={<AdminLoginPage />} />
        <Route path="/admin/dashboard/*" element={<AdminDashboardPage />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
