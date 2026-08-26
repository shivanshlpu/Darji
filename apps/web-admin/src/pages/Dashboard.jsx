import { useState, useMemo, useEffect } from 'react';
import {
  IndianRupee, Package, Users, Scissors, ArrowUpRight,
  BarChart3, AlertCircle, Eye, EyeOff, Layers, ExternalLink
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import useAppStore from '../store/appStore';
import useCustomerStore from '../store/customerStore';
import usePrivacyStore from '../store/privacyStore';
import useLanguageStore from '../store/languageStore';
import PendingPaymentsModal from '../components/PendingPaymentsModal';
import { ORDER_STATUSES, PAYMENT_STATUSES } from '../constants';
import './Dashboard.css';

const STATUS_COLORS = {
  pending: '#C77700',
  cutting: '#1565C0',
  stitching: '#5C6BC0',
  trial: '#EF6C00',
  ready: '#2E7D32',
  delivered: '#1B5E20',
  cancelled: '#C62828',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { dashboardData, orders, fetchOrdersFromDB, fetchExpensesFromDB } = useAppStore();
  const { customers, fetchCustomersFromDB } = useCustomerStore();
  const { isAmountHidden, toggleAmountHidden, formatAmount } = usePrivacyStore();
  const { t, language } = useLanguageStore();

  useEffect(() => {
    fetchOrdersFromDB();
    fetchExpensesFromDB();
    fetchCustomersFromDB();
  }, []);

  const [showPendingModal, setShowPendingModal] = useState(false);

  const {
    totalPending = 0, ordersDueToday = 0, statusDistribution = {}, recentOrders = []
  } = dashboardData || {};

  // Active orders due today or overdue
  const ordersDueTodayCount = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return (orders || []).filter(o => {
      if (!o || ['completed', 'delivered', 'cancelled'].includes(o.status)) return false;
      if (!o.deliveryDate) return false;
      try {
        const d = new Date(o.deliveryDate);
        if (isNaN(d.getTime())) return false;
        return d.toISOString().slice(0, 10) <= todayStr;
      } catch (e) {
        return false;
      }
    }).length;
  }, [orders]);

  // Active orders in production queue
  const activeOrdersCount = useMemo(() => {
    return (orders || []).filter(o => o && !['completed', 'delivered', 'cancelled'].includes(o.status)).length;
  }, [orders]);
  // Live total pending payments calculated strictly from active orders
  const liveTotalPending = useMemo(() => {
    return (orders || []).reduce((sum, o) => {
      if (['completed', 'delivered', 'cancelled'].includes(o.status)) return sum;
      return sum + (o.pendingAmount || 0);
    }, 0);
  }, [orders]);

  // Unique pending customers count calculated strictly from active orders
  const pendingCustomersCount = useMemo(() => {
    const custKeys = new Set();
    (orders || []).forEach(o => {
      if (!['completed', 'delivered', 'cancelled'].includes(o.status) && (o.pendingAmount || 0) > 0) {
        const cId = typeof o.customerId === 'object' && o.customerId !== null
          ? String(o.customerId._id || o.customerId.id || o.customerId.name || '')
          : String(o.customerId || o.customerMobile || o.customerName || o._id);
        if (cId) custKeys.add(cId);
      }
    });
    return custKeys.size;
  }, [orders]);

  // Clean, non-duplicate status breakdown for pie chart
  const pieChartData = useMemo(() => {
    const counts = {
      pending: 0,
      preparing: 0,
      ready: 0,
      completed: 0,
      cancelled: 0,
    };

    (orders || []).forEach(o => {
      if (!o) return;
      if (o.status === 'pending') counts.pending++;
      else if (['cutting', 'stitching', 'trial', 'preparing'].includes(o.status)) counts.preparing++;
      else if (o.status === 'ready') counts.ready++;
      else if (['completed', 'delivered'].includes(o.status)) counts.completed++;
      else if (o.status === 'cancelled') counts.cancelled++;
    });

    const labels = {
      pending: t('newOrdersChip', 'New Order'),
      preparing: t('preparingChip', 'Preparing'),
      ready: t('readyChip', 'Ready (Pickup)'),
      completed: t('completedChip', 'Completed'),
      cancelled: language === 'hi' ? 'रद्द ऑर्डर्स' : 'Cancelled',
    };

    const colors = {
      pending: '#C77700',
      preparing: '#1565C0',
      ready: '#2E7D32',
      completed: '#1B5E20',
      cancelled: '#C62828',
    };

    return Object.entries(counts)
      .filter(([_, val]) => val > 0)
      .map(([key, val]) => ({
        name: labels[key],
        value: val,
        color: colors[key],
      }));
  }, [orders, language, t]);

  // Weekly order volume trend (strictly derived from live orders data)
  const weeklyOrderVolumeData = useMemo(() => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();

    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayLabel = dayNames[d.getDay()];
      last7Days.push({ dateStr, dayLabel, count: 0 });
    }

    (orders || []).forEach(o => {
      if (!o) return;
      const orderDateStr = (o.createdAt || o.orderDate || '').slice(0, 10);
      const match = last7Days.find(item => item.dateStr === orderDateStr);
      if (match) {
        match.count++;
      }
    });

    return last7Days.map(item => ({
      day: item.dayLabel,
      orders: item.count,
    }));
  }, [orders]);

  return (
    <div className="dashboard">
      {/* Sales Navigation Banner (Hidden in Privacy / Eye-Off Mode) */}
      {!isAmountHidden && (
        <div className="dashboard__sales-banner animate-fade-in">
          <div className="dashboard__sales-banner-text">
            <BarChart3 size={20} className="dashboard__sales-banner-icon" />
            <div>
              <h4>{t('salesBannerTitle', 'Sales & Financial Reports')}</h4>
              <p>{t('salesBannerText', 'Sales, total revenue, and operating ledgers have been organized on the dedicated Sales & Reports page.')}</p>
            </div>
          </div>
          <button className="dashboard__sales-banner-btn" onClick={() => navigate('/reports')}>
            {t('viewSalesRevenue', 'View Sales & Revenue')} <ArrowUpRight size={15} />
          </button>
        </div>
      )}

      {/* Operational Summary Cards (No Sales) */}
      <div className="dashboard__cards stagger-children">
        {/* 1. Pending Payments Card (CLICKABLE to open Pending People list) */}
        <div
          className="dashboard__card dashboard__card--pending dashboard__card--clickable"
          onClick={() => setShowPendingModal(true)}
          title="Click to view list of all pending customers & orders"
        >
          <div className="dashboard__card-header">
            <span className="dashboard__card-label">{t('totalPendingTitle', 'Total Pending Payments')}</span>
            <div className="dashboard__card-icon dashboard__card-icon--warning">
              <IndianRupee size={18} />
            </div>
          </div>
          <p className="dashboard__card-value">{formatAmount(liveTotalPending)}</p>
          <div className="dashboard__card-footer">
            <span className="dashboard__card-badge dashboard__card-badge--warning">
              <AlertCircle size={13} /> {pendingCustomersCount} {t('customersPendingBadge', 'Customers Pending')}
            </span>
            <span className="dashboard__card-click-hint">{t('clickToView', 'Click to view')} <ArrowUpRight size={13} /></span>
          </div>
        </div>

        {/* 2. Orders Due Today */}
        <div className="dashboard__card dashboard__card--due" onClick={() => navigate('/orders')}>
          <div className="dashboard__card-header">
            <span className="dashboard__card-label">{t('ordersDueTodayTitle', 'Orders Due Today')}</span>
            <div className="dashboard__card-icon dashboard__card-icon--info">
              <Package size={18} />
            </div>
          </div>
          <p className="dashboard__card-value">{ordersDueTodayCount}</p>
          <div className="dashboard__card-footer">
            <span className="dashboard__card-link">
              {t('viewDueOrders', 'View due orders')} <ArrowUpRight size={13} />
            </span>
          </div>
        </div>

        {/* 3. Active Production Queue */}
        <div className="dashboard__card dashboard__card--active" onClick={() => navigate('/orders')}>
          <div className="dashboard__card-header">
            <span className="dashboard__card-label">{t('activeOrdersTitle', 'Active Orders in Shop')}</span>
            <div className="dashboard__card-icon dashboard__card-icon--navy">
              <Scissors size={18} />
            </div>
          </div>
          <p className="dashboard__card-value">{activeOrdersCount}</p>
          <div className="dashboard__card-footer">
            <span className="dashboard__card-compare">{t('activeSubtext', 'Preparing & Ready')}</span>
          </div>
        </div>

        {/* 4. Total Customers */}
        <div className="dashboard__card dashboard__card--customers" onClick={() => navigate('/orders')}>
          <div className="dashboard__card-header">
            <span className="dashboard__card-label">{t('totalCustomersTitle', 'Total Customers')}</span>
            <div className="dashboard__card-icon dashboard__card-icon--gold">
              <Users size={18} />
            </div>
          </div>
          <p className="dashboard__card-value">{customers.length}</p>
          <div className="dashboard__card-footer">
            <span className="dashboard__card-link">
              {t('manageCustomers', 'Manage customers')} <ArrowUpRight size={13} />
            </span>
          </div>
        </div>
      </div>

      {/* Operational Charts Row */}
      <div className="dashboard__charts">
        {/* Weekly Order Intake */}
        <div className="dashboard__chart-card animate-fade-in-up">
          <div className="dashboard__chart-header">
            <h3>{t('weeklyOrderIntake', 'Weekly Order Intake')}</h3>
            <span className="dashboard__chart-period">Last 7 days</span>
          </div>
          <div className="dashboard__chart-body">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={weeklyOrderVolumeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="orderGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1565C0" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#1565C0" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    borderRadius: '8px',
                    boxShadow: 'var(--shadow-lg)',
                    fontSize: '13px',
                  }}
                  formatter={(value) => [`${value} Orders`, 'Intake']}
                />
                <Area type="monotone" dataKey="orders" stroke="#1565C0" strokeWidth={2.5} fill="url(#orderGradient)" name="Orders Intake" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Status Distribution */}
        <div className="dashboard__chart-card animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="dashboard__chart-header">
            <h3>{t('orderStatusBreakdown', 'Order Status Breakdown')}</h3>
            <span className="dashboard__chart-badge">{orders.length} total</span>
          </div>
          <div className="dashboard__chart-body">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  dataKey="value"
                  stroke="none"
                  paddingAngle={3}
                >
                  {pieChartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    borderRadius: '8px',
                    boxShadow: 'var(--shadow-lg)',
                    fontSize: '13px',
                  }}
                  formatter={(value, name) => [`${value} Orders`, name]}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="dashboard__recent animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        <div className="dashboard__recent-header">
          <h3>{t('recentOrders', 'Recent Active Orders')}</h3>
          <button className="dashboard__view-all" onClick={() => navigate('/orders')}>
            {t('viewAll', 'View All')} <ArrowUpRight size={14} />
          </button>
        </div>
        <div className="dashboard__table-wrapper">
          <table className="dashboard__table">
            <thead>
              <tr>
                <th>{t('tokenHeader', 'TOKEN / ORDER')}</th>
                <th>{t('customerHeader', 'CUSTOMER')}</th>
                <th>{t('itemsHeader', 'ITEMS & DRESS')}</th>
                <th>{t('balanceHeader', 'BALANCE DUE')}</th>
                <th>{t('statusHeader', 'STATUS')}</th>
                <th>{t('targetDateHeader', 'TARGET DATE')}</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order._id} className="dashboard__table-row" onClick={() => navigate('/orders')}>
                  <td className="dashboard__order-num">{order.orderNumber}</td>
                  <td className="dashboard__customer-name">{order.customerName}</td>
                  <td>
                    <span className="dashboard__items-count">{order.items.length} items</span>
                  </td>
                  <td className="dashboard__amount">{formatAmount(order.subtotal)}</td>
                  <td>
                    <span className={`dashboard__status dashboard__status--${ORDER_STATUSES[order.status]?.color}`}>
                      {ORDER_STATUSES[order.status]?.label}
                    </span>
                  </td>
                  <td>
                    <span className={`dashboard__payment dashboard__payment--${PAYMENT_STATUSES[order.paymentStatus]?.color}`}>
                      {PAYMENT_STATUSES[order.paymentStatus]?.label}
                    </span>
                  </td>
                  <td className="dashboard__date">
                    {new Date(order.deliveryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal to view all pending people & order details */}
      <PendingPaymentsModal
        isOpen={showPendingModal}
        onClose={() => setShowPendingModal(false)}
      />
    </div>
  );
}
