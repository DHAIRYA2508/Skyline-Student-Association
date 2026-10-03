import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

export interface MembershipDetail {
  membership_id: string;
  plan_name: string;
  start_date: string;
  end_date: string;
  status: string;
  payment_status: string;
  dues_paid: boolean;
  event_discount_percentage: number;
  merchandise_discount_percentage: number;
  days_until_expiry: number;
  needs_renewal_reminder: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  student_id?: string;
  membership?: MembershipDetail;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (token) {
      api.get('/auth/me')
        .then((res) => {
          setUser(res.data);
        })
        .catch(() => {
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { access_token, user: profile } = res.data;
    localStorage.setItem('access_token', access_token);
    setToken(access_token);
    setUser(profile);
  };

  const register = async (data: any) => {
    const res = await api.post('/auth/register', data);
    const { access_token, user: profile } = res.data;
    localStorage.setItem('access_token', access_token);
    setToken(access_token);
    setUser(profile);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
