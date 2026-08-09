import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import MobileBottomNav from './MobileBottomNav';
import PwaInstallPrompt from '../PwaInstallPrompt';
import useAppStore from '../../store/appStore';
import './AppLayout.css';

const pageTitles = {
  '/': 'Dashboard',
  '/customers': 'Customers',
  '/orders': 'Orders',
  '/billing': 'Billing & Invoices',
  '/expenses': 'Expenses',
  '/reports': 'Reports & Analytics',
  '/query-ai': 'Query AI',
  '/settings': 'Settings',
};

export default function AppLayout() {
  const location = useLocation();
  const { sidebarCollapsed } = useAppStore();

  // Match dynamic routes
  const path = location.pathname;
  let pageTitle = pageTitles[path];
  if (!pageTitle) {
    if (path.startsWith('/customers/')) pageTitle = 'Customer Profile';
    else pageTitle = 'DARJI';
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className={`app-layout__main ${sidebarCollapsed ? 'app-layout__main--collapsed' : ''}`}>
        <Topbar pageTitle={pageTitle} />
        <main className="app-layout__content">
          <Outlet />
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
