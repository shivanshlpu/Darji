import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import useThemeStore from './store/themeStore';
import useSettingsStore from './store/settingsStore';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerProfile from './pages/CustomerProfile';
import Orders from './pages/Orders';
import Billing from './pages/Billing';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import QueryAI from './pages/QueryAI';
import SettingsPage from './pages/Settings';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { restoreSession } = useAuthStore();
  const { initTheme } = useThemeStore();
  const { fetchSettingsFromDB } = useSettingsStore();

  useEffect(() => {
    restoreSession();
    initTheme();
    fetchSettingsFromDB();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={
          <PublicRoute><Login /></PublicRoute>
        } />

        {/* Unified Protected App Layout */}
        <Route element={
          <ProtectedRoute><AppLayout /></ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="customers" element={<Navigate to="/orders" replace />} />
          <Route path="customers/:id" element={<Navigate to="/orders" replace />} />
          <Route path="orders" element={<Orders />} />
          <Route path="billing" element={<Billing />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="reports" element={<Reports />} />
          <Route path="query-ai" element={<QueryAI />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
