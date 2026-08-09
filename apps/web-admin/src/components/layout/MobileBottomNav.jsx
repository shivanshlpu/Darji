import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Scissors, FileText, Receipt, BarChart3, Settings
} from 'lucide-react';
import useLanguageStore from '../../store/languageStore';
import './MobileBottomNav.css';

export default function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguageStore();

  const navItems = [
    { path: '/', label: t('dashboard', 'Dashboard'), icon: LayoutDashboard },
    { path: '/orders', label: t('orders', 'Orders'), icon: Scissors },
    { path: '/billing', label: t('billing', 'Billing'), icon: FileText },
    { path: '/expenses', label: t('expenses', 'Expenses'), icon: Receipt },
    { path: '/reports', label: t('reports', 'Reports'), icon: BarChart3 },
    { path: '/settings', label: t('settings', 'Settings'), icon: Settings },
  ];

  return (
    <nav className="mobile-bottom-nav">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        return (
          <button
            key={item.path}
            type="button"
            className={`mobile-bottom-nav__item ${isActive ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <Icon size={20} className="mobile-bottom-nav__icon" />
            <span className="mobile-bottom-nav__label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
