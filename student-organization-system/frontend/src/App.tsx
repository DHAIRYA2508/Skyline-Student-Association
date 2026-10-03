import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useApp } from './store/store';
import { Layout, Gateway, Toast } from './store/ui';
import { Login, Register } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { Membership } from './pages/Membership';
import { Events } from './pages/Events';
import { Announcements, Shop, Fundraisers } from './pages/Community';
import { Expenses, Members, CheckIn, Finance } from './pages/Admin';

function Routing() {
  const { me, loading } = useApp();

  // Show nothing while restoring session from refresh token
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="mut sans" style={{ fontSize: 14 }}>Loading…</div>
      </div>
    );
  }

  if (!me) {
    return (
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  // Staff = anyone with a role beyond MEMBER / VOLUNTEER
  const isStaff = me.is_staff;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/events" element={<Events />} />
        <Route path="/announcements" element={<Announcements />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/fundraisers" element={<Fundraisers />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/membership" element={<Membership />} />
        {isStaff && <Route path="/members" element={<Members />} />}
        {isStaff && <Route path="/checkin" element={<CheckIn />} />}
        {(me.permissions.includes('finance.view')) && <Route path="/finance" element={<Finance />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <Provider>
      <HashRouter>
        <Routing />
      </HashRouter>
      <Gateway />
      <Toast />
    </Provider>
  );
}
