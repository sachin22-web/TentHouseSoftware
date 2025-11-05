import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getAuthToken, getAdminData, setAuthToken, setAdminData, removeAuthToken } from '@/lib/api';

interface Admin {
  id: string;
  name: string;
  phone: string;
  role: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  admin: Admin | null;
  login: (token: string, adminData: Admin) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const token = getAuthToken();
    const adminData = getAdminData();
    
    if (token && adminData) {
      setIsAuthenticated(true);
      setAdmin(adminData);
    }
    
    setLoading(false);
  }, []);

  const login = (token: string, adminData: Admin) => {
    setAuthToken(token);
    setAdminData(adminData);
    setIsAuthenticated(true);
    setAdmin(adminData);
  };

  const logout = () => {
    removeAuthToken();
    setIsAuthenticated(false);
    setAdmin(null);
  };

  const value = {
    isAuthenticated,
    admin,
    login,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
