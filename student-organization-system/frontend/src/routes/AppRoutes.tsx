import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Login } from '../pages/auth/Login';
import { Register } from '../pages/auth/Register';
import { MemberDashboard } from '../pages/dashboard/MemberDashboard';
import { MemberVerification } from '../pages/members/MemberVerification';

export const AppRoutes: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', color: '#ffffff' }}>
        <h3>Loading Association Portal...</h3>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={isAuthenticated ? <MemberDashboard /> : <Navigate to="/login" replace />} />
      <Route path="/verify" element={<MemberVerification />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
