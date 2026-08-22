import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Bell, Sun, Moon, Menu, X, Eye, EyeOff, LogOut } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import useAppStore from '../../store/appStore';
import useAuthStore from '../../store/authStore';
import usePrivacyStore from '../../store/privacyStore';
import useLanguageStore from '../../store/languageStore';
import ProfileModal from '../ProfileModal';
import './Topbar.css';

export default function Topbar({ pageTitle }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useThemeStore();
  const { notifications, markNotificationRead, getUnreadCount, toggleSidebar } = useAppStore();
  const { user, logout } = useAuthStore();
  const { isAmountHidden, toggleAmountHidden } = usePrivacyStore();
  const { language, toggleLanguage } = useLanguageStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const notifRef = useRef(null);
  const unreadCount = getUnreadCount();

  const handleTogglePrivacy = () => {
    const nextHidden = !isAmountHidden;
    toggleAmountHidden();
    if (nextHidden && location.pathname === '/reports') {
      navigate('/', { replace: true });
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const notifIcons = {
    deliveryDue: '📦',
    paymentPending: '💰',
    orderReady: '✅',
    overdue: '⚠️',
    backupReminder: '💾',
  };

  return (
    <header className="topbar">
      <div className="topbar__left">
        <h2 className="topbar__title">{pageTitle}</h2>
      </div>

      <div className="topbar__right">
        {/* Global Search */}
        <div className="topbar__search">
          <Search size={16} className="topbar__search-icon" />
          <input
            type="text"
            placeholder="Search customers, orders..."
            className="topbar__search-input"
          />
          <kbd className="topbar__search-kbd">⌘K</kbd>
        </div>

        {/* Privacy Hide/Unhide Financials Toggle */}
        <button
          className={`topbar__icon-btn ${isAmountHidden ? 'topbar__icon-btn--active' : ''}`}
          onClick={handleTogglePrivacy}
          title={isAmountHidden ? 'Unhide Financial Amounts' : 'Hide Financial Amounts'}
        >
          {isAmountHidden ? <EyeOff size={19} /> : <Eye size={19} />}
        </button>

        {/* Theme Toggle */}
        <button className="topbar__icon-btn" onClick={toggleTheme} title={theme === 'light' ? 'Dark mode' : 'Light mode'}>
          {theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}
        </button>

        {/* Hindi / English Language Toggle */}
        <button
          className="topbar__icon-btn"
          onClick={toggleLanguage}
          title={language === 'en' ? 'Switch to Hindi (हिंदी में बदलें)' : 'Switch to English'}
          style={{
            fontWeight: '800',
            fontSize: '12px',
            minWidth: '42px',
            padding: '4px 6px',
            borderRadius: '6px',
            background: 'rgba(245, 158, 11, 0.15)',
            color: '#f59e0b',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          {language === 'en' ? 'EN | अ' : 'हिंदी | A'}
        </button>

        {/* Notifications */}
        <div className="topbar__notif-wrapper" ref={notifRef}>
          <button
            className="topbar__icon-btn"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell size={19} />
            {unreadCount > 0 && (
              <span className="topbar__notif-badge">{unreadCount}</span>
            )}
          </button>

          {showNotifications && (
            <div className="topbar__notif-dropdown animate-fade-in-down">
              <div className="topbar__notif-header">
                <h3>Notifications</h3>
                {unreadCount > 0 && <span className="topbar__notif-count">{unreadCount} new</span>}
              </div>
              <div className="topbar__notif-list">
                {notifications.length === 0 ? (
                  <p className="topbar__notif-empty">No notifications</p>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n._id}
                      className={`topbar__notif-item ${!n.isRead ? 'topbar__notif-item--unread' : ''}`}
                      onClick={() => markNotificationRead(n._id)}
                    >
                      <span className="topbar__notif-icon">{notifIcons[n.type] || '🔔'}</span>
                      <div className="topbar__notif-content">
                        <p>{n.payload.message}</p>
                        <small>{new Date(n.scheduledFor).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</small>
                      </div>
                      {!n.isRead && <span className="topbar__notif-dot" />}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User & Logout */}
        <div className="topbar__user" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="topbar__user-avatar-btn"
            onClick={() => setShowProfileModal(true)}
            title={`Logged in as ${user?.name || 'Arunav Darji'} (${user?.phone || '9479487828'}) - Click to view/edit profile`}
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name || 'User'} className="topbar__user-avatar-img" />
            ) : (
              <div className="topbar__user-avatar">
                {user?.name?.charAt(0) || 'A'}
              </div>
            )}
          </button>
          <button
            className="topbar__icon-btn"
            onClick={() => {
              if (window.confirm(language === 'hi' ? 'क्या आप निश्चित रूप से लॉगआउट करना चाहते हैं?' : 'Are you sure you want to log out?')) {
                logout();
              }
            }}
            title={language === 'hi' ? 'लॉगआउट करें' : 'Log Out'}
            style={{ color: '#ef4444' }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Profile & Account Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </header>
  );
}
