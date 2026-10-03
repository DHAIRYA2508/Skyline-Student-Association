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
  const { me } = useApp();
  if (!me) return <Routes><Route path="/register" element={<Register />} /><Route path="*" element={<Login />} /></Routes>;
  const admin = me.role === 'admin';
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
        {admin && <Route path="/members" element={<Members />} />}
        {admin && <Route path="/checkin" element={<CheckIn />} />}
        {admin && <Route path="/finance" element={<Finance />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return <Provider><HashRouter><Routing /></HashRouter><Gateway /><Toast /></Provider>;
}
