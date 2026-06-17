// What this file does: updated AuthContext — after login/signup navigate to '/' not '/browse'
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

// Provides auth state (user, token, login, logout) to the entire component tree
export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on first render
  useEffect(() => {
    const savedToken = localStorage.getItem('atlas_token');
    const savedUser  = localStorage.getItem('atlas_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      try { setUser(JSON.parse(savedUser)); } catch { /* ignore corrupt data */ }
    }
    setLoading(false);
  }, []);

  // Persists token and user to localStorage, then updates state
  function login(newToken, newUser) {
    localStorage.setItem('atlas_token', newToken);
    localStorage.setItem('atlas_user',  JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    // Navigation is handled by the calling page component (navigate('/'))
  }

  // Clears all auth state
  function logout() {
    localStorage.removeItem('atlas_token');
    localStorage.removeItem('atlas_user');
    setToken(null);
    setUser(null);
  }

  // Admin token is stored separately — never mixed with user JWT
  function adminLogin(adminToken) {
    localStorage.setItem('atlas_admin_token', adminToken);
  }

  function adminLogout() {
    localStorage.removeItem('atlas_admin_token');
  }

  const isAuthenticated = !!token;
  const isAdmin         = !!localStorage.getItem('atlas_admin_token');

  return (
    <AuthContext.Provider value={{ user, token, login, logout, adminLogin, adminLogout, isAuthenticated, isAdmin, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to access auth state from any component
export function useAuth() {
  return useContext(AuthContext);
}
