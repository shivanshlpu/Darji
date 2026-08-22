import { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, ClipboardList, FileText, Wallet,
  BookOpen, BarChart3, MessageSquare, Settings, ChevronLeft,
  ChevronRight, Scissors, LogOut
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import useAppStore from '../../store/appStore';
import usePrivacyStore from '../../store/privacyStore';
import useLanguageStore from '../../store/languageStore';
import ProfileModal from '../ProfileModal';
import './Sidebar.css';

const navItems = [
  { path: '/', icon: LayoutDashboard, labelKey: 'dashboard', label: 'Dashboard' },
  { path: '/orders', icon: ClipboardList, labelKey: 'orders', label: 'Orders' },
  { path: '/billing', icon: FileText, labelKey: 'billing', label: 'Billing' },
  { path: '/expenses', icon: Wallet, labelKey: 'expenses', label: 'Expenses' },
  { path: '/reports', icon: BarChart3, labelKey: 'reports', label: 'Sales & Reports' },
  { path: '/query-ai', icon: MessageSquare, labelKey: 'queryAi', label: 'Query AI' },
  { path: '/settings', icon: Settings, labelKey: 'settings', label: 'Settings' },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar } = useAppStore();
  const { isAmountHidden } = usePrivacyStore();
  const { t } = useLanguageStore();
  const [showProfileModal, setShowProfileModal] = useState(false);

  const filteredNavItems = useMemo(() => {
    if (isAmountHidden) {
      return navItems.filter(item => item.path !== '/reports');
    }
    return navItems;
  }, [isAmountHidden]);

  return (
    <aside className={`sidebar ${sidebarCollapsed ? 'sidebar--collapsed' : ''}`}>
      {/* Brand */}
      <div className="sidebar__brand">
        <div className="sidebar__logo">
          <Scissors size={24} strokeWidth={2.5} />
        </div>
        {!sidebarCollapsed && (
          <div className="sidebar__brand-text">
            <h1 className="sidebar__title">DARJI</h1>
            <p className="sidebar__subtitle">Smart Tailor ERP</p>
          </div>
        )}
      </div>

      {/* Collapse Toggle */}
      <button className="sidebar__toggle" onClick={toggleSidebar} title={sidebarCollapsed ? 'Expand' : 'Collapse'}>
        {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Navigation */}
      <nav className="sidebar__nav">
        {filteredNavItems.map(item => {
          const Icon = item.icon;
          const displayLabel = t(item.labelKey) || item.label;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
              }
              end={item.path === '/'}
              title={sidebarCollapsed ? displayLabel : undefined}
            >
              <Icon size={20} />
              {!sidebarCollapsed && <span>{displayLabel}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User Card */}
      <div
        className="sidebar__user"
        onClick={() => setShowProfileModal(true)}
        style={{ cursor: 'pointer' }}
        title="Click to view & edit user profile"
      >
        <div className="sidebar__user-avatar">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name || 'User'} className="sidebar__user-avatar-img" />
          ) : (
            user?.name?.charAt(0) || 'A'
          )}
        </div>
        {!sidebarCollapsed && (
          <div className="sidebar__user-info">
            <p className="sidebar__user-name">{user?.name || 'Arunav Darji'}</p>
            <p className="sidebar__user-role">{user?.shopName || 'Darji Premium Tailors'}</p>
          </div>
        )}
        <button
          className="sidebar__logout"
          onClick={(e) => {
            e.stopPropagation();
            logout();
          }}
          title="Logout"
        >
          <LogOut size={18} />
        </button>
      </div>

      {/* Profile & Account Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </aside>
  );
}
