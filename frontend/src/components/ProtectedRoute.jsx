// What this file does: ProtectedRoute — redirects unauthenticated users to /login
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Wraps a page component and guards it behind authentication
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  // Wait for auth state to load from localStorage before redirecting
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-page)',
      }}>
        <div style={{
          width: '40px', height: '40px',
          border: '2px solid var(--border)',
          borderTop: '2px solid var(--accent)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
