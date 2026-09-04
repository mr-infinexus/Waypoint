import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import { api } from '@/services/api';

export type Role = 'traveler' | 'operator' | 'admin';

interface AuthContextType {
  role: Role | null;
  setToken: (token: string | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role | null>(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode<{ role: Role }>(token);
        return decoded.role;
      } catch {
        return null;
      }
    }
    return null;
  });

  const setToken = (token: string | null) => {
    if (token) {
      localStorage.setItem('token', token);
      try {
        const decoded = jwtDecode<{ role: Role }>(token);
        setRole(decoded.role);
      } catch {
        setRole(null);
      }
    } else {
      localStorage.removeItem('token');
      setRole(null);
    }
  };

  const logout = async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore
    }
    setToken(null);
  };

  useEffect(() => {
    const handleUnauthorized = () => setToken(null);
    window.addEventListener('unauthorized', handleUnauthorized);
    return () => window.removeEventListener('unauthorized', handleUnauthorized);
  }, []);

  return (
    <AuthContext.Provider value={{ role, setToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
