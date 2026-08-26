import { useState, useMemo, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
  BarChart3, TrendingUp, TrendingDown, Download, Calendar,
  PieChart as PieIcon, DollarSign, Users, FileSpreadsheet, FileText, Filter,
  Tag, Percent, Eye, X, CreditCard, CheckCircle, IndianRupee, ArrowUpRight
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import useAppStore from '../store/appStore';
import useCustomerStore from '../store/customerStore';
import useSettingsStore from '../store/settingsStore';
import usePrivacyStore from '../store/privacyStore';
import useLanguageStore from '../store/languageStore';
import { printReportPDF } from '../utils/generateReportPDF';
import { exportReportExcel } from '../utils/generateReportExcel';
import { EXPENSE_CATEGORIES } from '../constants';
import PaymentHistoryModal from '../components/PaymentHistoryModal';
import './Reports.css';

const COLORS = ['#C9A24B', '#1565C0', '#2E7D32', '#C62828', '#8E24AA'];

const getCatLabel = (catVal, language) => {
  if (language !== 'hi') {
    return EXPENSE_CATEGORIES.find(c => c.value === catVal)?.label || catVal;
  }
  const map = {
    shop: 'दुकान / किराया',
    employee: 'कर्मचारी / वेतन',
    material: 'कपड़ा / सामग्री',
    marketing: 'प्रचार व विज्ञापन',
    misc: 'अन्य खर्चे',
  };
  return map[catVal] || catVal;
};

const formatDateDMY = (dateObj) => {
  if (!dateObj || isNaN(new Date(dateObj).getTime())) return '';
  const d = new Date(dateObj);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const formatDateTimeDMY = (dateObj) => {
  if (!dateObj || isNaN(new Date(dateObj).getTime())) return '';
  const d = new Date(dateObj);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const dateStr = `${day}-${month}-${year}`;
  const hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 || 12;
  const timeStr = `${formattedHours}:${minutes} ${ampm}`;
  return `${dateStr}, ${timeStr}`;
};

export default function Reports() {
  const navigate = useNavigate();
  const { orders, expenses } = useAppStore();
  const { customers } = useCustomerStore();
  const { shopInfo } = useSettingsStore();
  const { isAmountHidden, formatAmount } = usePrivacyStore();
  const { t, language } = useLanguageStore();

  const [period, setPeriod] = useState('month'); // today | week | month | year | custom | all
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedDiscountModalOrder, setSelectedDiscountModalOrder] = useState(null);
  const [selectedPaymentHistoryOrder, setSelectedPaymentHistoryOrder] = useState(null);

  useEffect(() => {
    if (isAmountHidden) {
      navigate('/', { replace: true });
    }
  }, [isAmountHidden, navigate]);

  if (isAmountHidden) {
    return <Navigate to="/" replace />;
  }

  // Filter orders and expenses strictly for selected period
  const { filteredOrders, filteredExpenses, effectiveDateRange } = useMemo(() => {
    const now = new Date();
    let from = new Date(2020, 0, 1);
    let to = new Date();

    if (period === 'today') {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (period === 'week') {
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
    } else if (period === 'month') {
      from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
    } else if (period === 'year') {
      from = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
    } else if (period === 'custom') {
      if (startDate) {
        from = new Date(startDate);
        from.setHours(0, 0, 0, 0);
      }
      if (endDate) {
        to = new Date(endDate);
        to.setHours(23, 59, 59, 999);
      }
    }

    const fOrders = (orders || []).filter(o => {
      const d = new Date(o.createdAt || o.orderDate);
      if (isNaN(d.getTime())) return false;
      return d >= from && d <= to;
    });

    const fExpenses = (expenses || []).filter(e => {
      const d = new Date(e.date || e.createdAt);
      if (isNaN(d.getTime())) return false;
      return d >= from && d <= to;
    });

    return {
      filteredOrders: fOrders,
      filteredExpenses: fExpenses,
      effectiveDateRange: { from, to },
    };
  }, [orders, expenses, period, startDate, endDate]);

  // Calculate Net Profit & Financials for filtered dataset (Collections based on payment dates)
  const stats = useMemo(() => {
    let totalSales = 0;
    let cashCollections = 0;
    let onlineCollections = 0;

    (orders || []).forEach(o => {
      if (Array.isArray(o.payments) && o.payments.length > 0) {
        o.payments.forEach(p => {
          const pDate = p.date ? new Date(p.date) : null;
          if (pDate && pDate >= effectiveDateRange.from && pDate <= effectiveDateRange.to) {
            const amt = Number(p.amount) || 0;
            totalSales += amt;
            if (p.mode === 'cash') {
              cashCollections += amt;
            } else {
              onlineCollections += amt;
            }
          }
        });
      } else {
        const d = new Date(o.orderDate || o.createdAt);
        if (!isNaN(d.getTime()) && d >= effectiveDateRange.from && d <= effectiveDateRange.to) {
          const amt = Number(o.paidAmount) || Number(o.advancePaid) || 0;
          totalSales += amt;
          cashCollections += amt;
        }
      }
    });

    const totalBilled = filteredOrders.reduce((s, o) => s + (o.subtotal || 0), 0);
    const totalDiscounts = filteredOrders.reduce((s, o) => s + (o.discount || 0), 0);
    const discountCount = filteredOrders.filter(o => (o.discount || 0) > 0).length;
    const totalPending = filteredOrders.reduce((s, o) => s + (Number(o.pendingAmount) || Number(o.balanceDue) || 0), 0);
    const totalExtraIncome = filteredExpenses.filter(e => e.type === 'income').reduce((s, e) => s + (e.amount || 0), 0);
    const totalExp = filteredExpenses.filter(e => e.type !== 'income').reduce((s, e) => s + (e.amount || 0), 0);

    const totalGrossRevenue = totalSales + totalExtraIncome;
    const netProfit = totalSales + totalExtraIncome - totalExp;
    const marginPct = totalGrossRevenue > 0 ? ((netProfit / totalGrossRevenue) * 100).toFixed(1) : 0;

    return {
      totalSales,
      cashCollections,
      onlineCollections,
      totalBilled,
      totalDiscounts,
      discountCount,
      totalPending,
      totalExtraIncome,
      totalExp,
      totalGrossRevenue,
      netProfit,
      marginPct,
    };
  }, [orders, filteredOrders, filteredExpenses, effectiveDateRange]);

  const discountOrders = useMemo(() => {
    return filteredOrders.filter(o => (o.discount || 0) > 0);
  }, [filteredOrders]);

  // Customer Payment Collections Ledger for the selected date range
  const periodPayments = useMemo(() => {
    const list = [];
    (orders || []).forEach(o => {
      if (Array.isArray(o.payments) && o.payments.length > 0) {
        o.payments.forEach(p => {
          const pDate = p.date ? new Date(p.date) : null;
          if (pDate && !isNaN(pDate.getTime()) && pDate >= effectiveDateRange.from && pDate <= effectiveDateRange.to) {
            list.push({
              _id: p._id || `${o._id}_${pDate.getTime()}`,
              orderId: o._id,
              orderNumber: o.orderNumber,
              tokenNumber: o.tokenNumber,
              customerName: o.customerName || (o.customer && o.customer.name) || 'Customer',
              customerMobile: o.customerMobile || o.customerPhone || (o.customer && o.customer.mobile) || '',
              paymentDate: pDate,
              amount: Number(p.amount) || 0,
              mode: p.mode || 'cash',
              type: p.type || 'payment',
              notes: p.notes || '',
              orderGrandTotal: o.grandTotal || o.totalAmount || o.subtotal || 0,
              orderBalanceDue: o.pendingAmount || o.balanceDue || 0,
              orderStatus: o.status,
              order: o,
            });
          }
        });
      } else {
        const d = new Date(o.orderDate || o.createdAt);
        if (!isNaN(d.getTime()) && d >= effectiveDateRange.from && d <= effectiveDateRange.to) {
          const amt = Number(o.paidAmount) || Number(o.advancePaid) || 0;
          if (amt > 0) {
            list.push({
              _id: `${o._id}_legacy`,
              orderId: o._id,
              orderNumber: o.orderNumber,
              tokenNumber: o.tokenNumber,
              customerName: o.customerName || (o.customer && o.customer.name) || 'Customer',
              customerMobile: o.customerMobile || o.customerPhone || (o.customer && o.customer.mobile) || '',
              paymentDate: d,
              amount: amt,
              mode: 'cash',
              type: o.paymentStatus === 'paid' ? 'final' : 'advance',
              notes: 'Initial recorded payment',
              orderGrandTotal: o.grandTotal || o.totalAmount || o.subtotal || 0,
              orderBalanceDue: o.pendingAmount || o.balanceDue || 0,
              orderStatus: o.status,
              order: o,
            });
          }
        }
      }
    });

    return list.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
  }, [orders, effectiveDateRange]);

  // Expense breakdown chart data
  const expenseChartData = useMemo(() => {
    const map = {};
    filteredExpenses.filter(e => e.type !== 'income').forEach(e => {
      const label = getCatLabel(e.category, language);
      map[label] = (map[label] || 0) + e.amount;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredExpenses, language]);

  // Top 5 High Value Customers
  const topCustomersData = useMemo(() => {
    const custMap = {};
    filteredOrders.forEach(o => {
      const cId = o.customerId || (o.customer && o.customer._id) || o.customerName || 'Unknown';
      const cName = (o.customer && o.customer.name) || o.customerName || 'Unknown';
      if (!custMap[cId]) {
        custMap[cId] = { name: cName.split(' ')[0], spending: 0 };
      }
      custMap[cId].spending += (o.subtotal || o.totalAmount || 0);
    });
    
    return Object.values(custMap)
      .filter(c => c.spending > 0)
      .sort((a, b) => b.spending - a.spending)
      .slice(0, 5);
  }, [filteredOrders]);

  const dateRangeStr = useMemo(() => {
    return `${formatDateDMY(effectiveDateRange.from)} to ${formatDateDMY(effectiveDateRange.to)}`;
  }, [effectiveDateRange]);

  const periodLabelStr = useMemo(() => {
    if (period === 'today') return t('today', 'Today');
    if (period === 'week') return t('thisWeek', 'This Week');
    if (period === 'month') return t('thisMonth', 'This Month');
    if (period === 'year') return t('thisYear', 'This Year');
    if (period === 'custom') return t('customDate', 'Custom Range');
    return t('allTime', 'All Time');
  }, [period, t]);

  const handleExportPDF = () => {
    printReportPDF({
      title: language === 'hi' ? 'वित्तीय बिक्री व राजस्व रिपोर्ट' : 'Financial Sales & Revenue Report',
      language,
      shopInfo: {
        name: shopInfo.name || 'Darji',
        tagline: shopInfo.tagline || 'Stitched to Perfection',
        address: shopInfo.address || '80/LIG 1ST New Housing Board Colony, Shahdol (M.P.) 484001',
        phone: shopInfo.phone || '+919479487828, +917000621972',
        email: shopInfo.email || 'darji.tailoring@gmail.com',
        logoUrl: shopInfo.logoUrl,
        signatureUrl: shopInfo.signatureUrl,
      },
      dateRangeStr,
      periodLabel: periodLabelStr,
      stats,
      orders: filteredOrders.map(o => ({
        orderNumber: o.orderNumber,
        tokenNumber: o.tokenNumber,
        customerName: o.customerName || (o.customer && o.customer.name) || 'Customer',
        date: formatDateDMY(o.createdAt || o.orderDate),
        subtotal: o.subtotal || 0,
        discount: o.discount || 0,
        grandTotal: o.grandTotal || o.totalAmount || 0,
        paidAmount: o.paidAmount || 0,
        pendingAmount: o.pendingAmount || 0,
        status: o.status || 'pending',
      })),
      discountsLedger: discountOrders.map(o => ({
        orderNumber: o.orderNumber,
        tokenNumber: o.tokenNumber,
        customerName: o.customerName || (o.customer && o.customer.name) || 'Customer',
        customerMobile: o.customerMobile || (o.customer && o.customer.mobile) || '',
        date: formatDateDMY(o.createdAt || o.orderDate),
        subtotal: o.subtotal || 0,
        discount: o.discount || 0,
        discountType: o.discountType || 'amount',
        discountValue: o.discountValue !== undefined ? o.discountValue : o.discount,
        grandTotal: o.grandTotal || o.totalAmount || 0,
      })),
      paymentsLedger: periodPayments.map(p => ({
        orderNumber: p.orderNumber,
        tokenNumber: p.tokenNumber,
        customerName: p.customerName,
        customerMobile: p.customerMobile,
        date: formatDateTimeDMY(p.paymentDate),
        amount: p.amount,
        mode: p.mode,
        type: p.type,
        notes: p.notes,
      })),
      expenses: filteredExpenses.map(e => ({
        date: formatDateDMY(e.date || e.createdAt),
        type: e.type || 'expense',
        description: e.description,
        category: getCatLabel(e.category, language),
        paymentMode: (e.paymentMode || 'cash').toUpperCase(),
        amount: e.amount,
      })),
    });
  };

  const handleExportExcel = () => {
    exportReportExcel({
      title: language === 'hi' ? 'वित्तीय बिक्री व राजस्व रिपोर्ट' : 'Financial Sales & Revenue Report',
      language,
      shopInfo: {
        name: shopInfo.name || 'Darji',
        tagline: shopInfo.tagline || 'Stitched to Perfection',
        address: shopInfo.address || '80/LIG 1ST New Housing Board Colony, Shahdol (M.P.) 484001',
        phone: shopInfo.phone || '+919479487828, +917000621972',
        email: shopInfo.email || 'darji.tailoring@gmail.com',
        logoUrl: shopInfo.logoUrl,
        signatureUrl: shopInfo.signatureUrl,
      },
      dateRangeStr,
      periodLabel: periodLabelStr,
      stats,
      orders: filteredOrders.map(o => ({
        orderNumber: o.orderNumber,
        tokenNumber: o.tokenNumber,
        customerName: o.customerName || (o.customer && o.customer.name) || 'Customer',
        date: formatDateDMY(o.createdAt || o.orderDate),
        subtotal: o.subtotal || 0,
        discount: o.discount || 0,
        grandTotal: o.grandTotal || o.totalAmount || 0,
        paidAmount: o.paidAmount || 0,
        pendingAmount: o.pendingAmount || 0,
        status: o.status || 'pending',
      })),
      discountsLedger: discountOrders.map(o => ({
        orderNumber: o.orderNumber,
        tokenNumber: o.tokenNumber,
        customerName: o.customerName || (o.customer && o.customer.name) || 'Customer',
        customerMobile: o.customerMobile || (o.customer && o.customer.mobile) || '',
        date: formatDateDMY(o.createdAt || o.orderDate),
        subtotal: o.subtotal || 0,
        discount: o.discount || 0,
        discountType: o.discountType || 'amount',
        discountValue: o.discountValue !== undefined ? o.discountValue : o.discount,
        grandTotal: o.grandTotal || o.totalAmount || 0,
      })),
      paymentsLedger: periodPayments.map(p => ({
        orderNumber: p.orderNumber,
        tokenNumber: p.tokenNumber,
        customerName: p.customerName,
        customerMobile: p.customerMobile,
        date: formatDateTimeDMY(p.paymentDate),
        amount: p.amount,
        mode: p.mode,
        type: p.type,
        notes: p.notes,
      })),
      expenses: filteredExpenses.map(e => ({
        date: formatDateDMY(e.date || e.createdAt),
        type: e.type || 'expense',
        description: e.description,
        category: getCatLabel(e.category, language),
        paymentMode: (e.paymentMode || 'cash').toUpperCase(),
        amount: e.amount,
      })),
    });
  };

  return (
    <div className="reports">
      {/* Header */}
      <div className="reports__header">
        <div>
          <h2>{t('reportsHeading', 'Financial Reports & Business Analytics')}</h2>
          <p>{t('reportsSubheading', 'Net profit calculations, margin analysis, expense distribution & exportable ledger summaries')}</p>
        </div>

        <div className="reports__actions">
          <button className="reports__export-btn" onClick={handleExportPDF}>
            <FileText size={16} /> {t('exportPdf', 'Export PDF')}
          </button>
          <button className="reports__export-btn reports__export-btn--excel" onClick={handleExportExcel}>
            <FileSpreadsheet size={16} /> {t('exportExcel', 'Export Excel')}
          </button>
        </div>
      </div>

      {/* Date Filter Toolbar */}
      <div className="reports__filter-bar">
        <div className="reports__period-selector">
          <button className={`reports__period-btn ${period === 'today' ? 'active' : ''}`} onClick={() => setPeriod('today')}>{t('today', 'Today')}</button>
          <button className={`reports__period-btn ${period === 'week' ? 'active' : ''}`} onClick={() => setPeriod('week')}>{t('thisWeek', 'This Week')}</button>
          <button className={`reports__period-btn ${period === 'month' ? 'active' : ''}`} onClick={() => setPeriod('month')}>{t('thisMonth', 'This Month')}</button>
          <button className={`reports__period-btn ${period === 'year' ? 'active' : ''}`} onClick={() => setPeriod('year')}>{t('thisYear', 'This Year')}</button>
          <button className={`reports__period-btn ${period === 'custom' ? 'active' : ''}`} onClick={() => setPeriod('custom')}>{t('customDate', 'Custom Range')}</button>
          <button className={`reports__period-btn ${period === 'all' ? 'active' : ''}`} onClick={() => setPeriod('all')}>{t('allTime', 'All Time')}</button>
        </div>

        {period === 'custom' && (
          <div className="reports__custom-inputs animate-fade-in">
            <div className="reports__date-field">
              <label>{t('startDateLabel', 'Start Date')}:</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="reports__date-field">
              <label>{t('endDateLabel', 'End Date')}:</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
        )}

        <div className="reports__active-range-badge">
          <Calendar size={14} /> <span>{dateRangeStr}</span>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="reports__summary-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="reports__card">
          <span className="reports__card-label">{t('totalRevenue', 'Total Revenue Collected')}</span>
          <p className="reports__card-val reports__card-val--success">{formatAmount(stats.totalSales)}</p>
          <span className="reports__card-sub">{language === 'hi' ? 'कुल बिलिंग:' : 'Total Billed:'} {formatAmount(stats.totalBilled)}</span>
        </div>

        <div className="reports__card reports__card--income" style={{ background: 'linear-gradient(180deg, rgba(34, 197, 94, 0.05) 0%, var(--bg-surface) 100%)', borderColor: 'rgba(34, 197, 94, 0.3)' }}>
          <span className="reports__card-label" style={{ color: '#15803d' }}>{language === 'hi' ? 'दुकान की अतिरिक्त आय' : 'Extra Shop Income'}</span>
          <p className="reports__card-val reports__card-val--success">+{formatAmount(stats.totalExtraIncome)}</p>
          <span className="reports__card-sub">{language === 'hi' ? 'टास्क, YouTube, कतरन आदि' : 'Tasks, YouTube, scrap, etc.'}</span>
        </div>

        <div className="reports__card reports__card--discount">
          <span className="reports__card-label">{language === 'hi' ? 'कुल डिस्काउंट दिया' : 'Total Discounts Given'}</span>
          <p className="reports__card-val reports__card-val--discount">{formatAmount(stats.totalDiscounts)}</p>
          <span className="reports__card-sub">{stats.discountCount} {language === 'hi' ? 'ऑर्डर्स पर छूट' : 'orders discounted'}</span>
        </div>

        <div className="reports__card">
          <span className="reports__card-label">{t('totalOperatingExpenses', 'Total Operating Expenses')}</span>
          <p className="reports__card-val reports__card-val--danger">{formatAmount(stats.totalExp)}</p>
          <span className="reports__card-sub">{filteredExpenses.filter(e => e.type !== 'income').length} {language === 'hi' ? 'खर्चे दर्ज' : 'expenses in period'}</span>
        </div>

        <div className="reports__card reports__card--profit">
          <span className="reports__card-label">{language === 'hi' ? 'शुद्ध लाभ (Net Profit)' : 'Net Profit (Sales + Income - Expenses)'}</span>
          <p className="reports__card-val reports__card-val--gold">{formatAmount(stats.netProfit)}</p>
          <span className="reports__card-sub">{language === 'hi' ? 'प्रॉफ़िट मार्जिन:' : 'Profit Margin:'} <strong>{stats.marginPct}%</strong></span>
        </div>

        <div className="reports__card">
          <span className="reports__card-label">{t('uncollectedPending', 'Uncollected Pending Payments')}</span>
          <p className="reports__card-val reports__card-val--warning">{formatAmount(stats.totalPending)}</p>
          <span className="reports__card-sub">{language === 'hi' ? 'सक्रिय ग्राहक ऑर्डर्स पर' : 'Across active customer orders'}</span>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="reports__charts-grid">
        {/* Expense Breakdown Pie */}
        <div className="reports__chart-card">
          <div className="reports__chart-title">
            <h3>{t('expenseCategoryBreakdown', 'Expense Category Breakdown')}</h3>
          </div>
          <div className="reports__chart-body">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={expenseChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {expenseChartData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [formatAmount(value)]} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Customers Bar Chart */}
        <div className="reports__chart-card">
          <div className="reports__chart-title">
            <h3>Top 5 High Value Customers</h3>
          </div>
          <div className="reports__chart-body">
            {topCustomersData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topCustomersData} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, angle: -45, textAnchor: 'end' }} interval={0} />
                  <YAxis 
                    tickFormatter={v => {
                      if (v >= 10000000) return `₹${(v/10000000).toFixed(1)}Cr`;
                      if (v >= 100000) return `₹${(v/100000).toFixed(1)}L`;
                      if (v >= 1000) return `₹${(v/1000).toFixed(1)}k`;
                      return `₹${v}`;
                    }} 
                    tick={{ fontSize: 12 }} 
                  />
                  <Tooltip formatter={(value) => [formatAmount(value), 'Total Spent']} />
                  <Bar dataKey="spending" fill="#C9A24B" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
                No customer data for selected period
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Customer Payment Collections Ledger Section */}
      <div className="reports__payment-tracker-section" style={{ marginTop: '12px' }}>
        <div className="reports__chart-card" style={{ borderTop: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '8px', borderRadius: '8px', display: 'flex', color: '#16a34a' }}>
                <CheckCircle size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  {language === 'hi' ? '💰 ग्राहक भुगतान व संग्रह विवरण (Payment Collections Ledger)' : '💰 Customer Payment Collections Ledger'}
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {language === 'hi' ? 'किस ग्राहक ने कब, कितना और किस माध्यम (Cash/UPI/Card) से भुगतान किया' : 'Real-time record of who paid, exact date & time, amount received, and payment mode'}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, background: '#dcfce7', color: '#15803d', padding: '4px 14px', borderRadius: '20px', border: '1px solid #86efac' }}>
                {periodPayments.length} {language === 'hi' ? 'भुगतान प्राप्त हुए' : 'payments'} • Total {formatAmount(periodPayments.reduce((s, p) => s + p.amount, 0))}
              </span>
            </div>
          </div>

          <div className="reports__payment-table-wrapper" style={{ overflowX: 'auto' }}>
            {periodPayments.length === 0 ? (
              <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <CreditCard size={40} color="#cbd5e1" style={{ marginBottom: '8px' }} />
                <p style={{ fontWeight: 600, fontSize: '14px', margin: 0 }}>
                  {language === 'hi' ? 'चुनी गई अवधि में कोई भुगतान दर्ज नहीं हुआ है।' : 'No payment collections recorded for the selected date period.'}
                </p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <th style={{ padding: '10px 14px' }}>{language === 'hi' ? 'ग्राहक का नाम' : 'Customer Name'}</th>
                    <th style={{ padding: '10px 14px' }}>{language === 'hi' ? 'ऑर्डर / टोकन #' : 'Order / Token'}</th>
                    <th style={{ padding: '10px 14px' }}>{language === 'hi' ? 'भुगतान तारीख व समय' : 'Payment Date & Time'}</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>{language === 'hi' ? 'जमा राशि' : 'Amount Paid'}</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>{language === 'hi' ? 'माध्यम (Mode)' : 'Mode'}</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>{language === 'hi' ? 'प्रकार (Type)' : 'Type'}</th>
                    <th style={{ padding: '10px 14px' }}>{language === 'hi' ? 'नोट्स / मेमो' : 'Notes'}</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>{language === 'hi' ? 'एक्शन' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody>
                  {periodPayments.map((p) => {
                    const modeBadges = {
                      cash: { label: 'Cash 💵', bg: '#dcfce7', color: '#15803d', border: '#86efac' },
                      upi: { label: 'UPI 📱', bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd' },
                      card: { label: 'Card 💳', bg: '#f3e8ff', color: '#7e22ce', border: '#d8b4fe' },
                      bankTransfer: { label: 'Bank 🏦', bg: '#fef3c7', color: '#b45309', border: '#fde68a' },
                    };
                    const badge = modeBadges[p.mode] || modeBadges.cash;

                    return (
                      <tr
                        key={p._id}
                        style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                        className="reports__payment-row"
                        onClick={() => setSelectedPaymentHistoryOrder(p.order)}
                      >
                        <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                          <div style={{ color: 'var(--text-primary)' }}>{p.customerName}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 400 }}>{p.customerMobile || ''}</div>
                        </td>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 600, color: '#2563eb' }}>
                          {p.orderNumber} ({p.tokenNumber || 'T-100'})
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                          {formatDateTimeDMY(p.paymentDate)}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#16a34a', fontSize: '14px' }}>
                          + {formatAmount(p.amount)}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, padding: '3px 9px', borderRadius: '12px', textTransform: 'capitalize' }}>
                            {badge.label}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '6px', textTransform: 'capitalize' }}>
                            {p.type}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontSize: '12px', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.notes || '-'}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <button
                            type="button"
                            style={{
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              color: '#1d4ed8',
                              borderRadius: '6px',
                              padding: '5px 12px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPaymentHistoryOrder(p.order);
                            }}
                          >
                            <CreditCard size={13} /> {language === 'hi' ? 'लेजर / तारीख' : 'Adjust / Ledger'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Customer Discount Tracker Section */}
      <div className="reports__discount-tracker-section" style={{ marginTop: '12px' }}>
        <div className="reports__chart-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '8px', borderRadius: '8px', display: 'flex' }}>
                <Tag color="#d97706" size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  {language === 'hi' ? '🏷️ ग्राहक डिस्काउंट ट्रैकिंग' : '🏷️ Customer Discount Tracker'}
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {language === 'hi' ? 'किस ग्राहक को कितना डिस्काउंट मिला उसका विवरण' : 'Track who received discounts and view detailed item breakdown'}
                </p>
              </div>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 600, background: '#fef3c7', color: '#92400e', padding: '4px 12px', borderRadius: '20px', border: '1px solid #fde68a' }}>
              {discountOrders.length} {language === 'hi' ? 'ग्राहकों को डिस्काउंट दिया गया' : 'discounted orders'}
            </span>
          </div>

          <div className="reports__discount-table-wrapper" style={{ overflowX: 'auto' }}>
            {discountOrders.length === 0 ? (
              <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Tag size={40} color="#cbd5e1" style={{ marginBottom: '8px' }} />
                <p style={{ fontWeight: 600, fontSize: '14px', margin: 0 }}>
                  {language === 'hi' ? 'चुनी गई अवधि में किसी ग्राहक को डिस्काउंट नहीं दिया गया।' : 'No customer discounts recorded for the selected date period.'}
                </p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <th style={{ padding: '10px 14px' }}>{language === 'hi' ? 'ग्राहक का नाम' : 'Customer Name'}</th>
                    <th style={{ padding: '10px 14px' }}>{language === 'hi' ? 'ऑर्डर / टोकन #' : 'Order / Token'}</th>
                    <th style={{ padding: '10px 14px' }}>{language === 'hi' ? 'तारीख' : 'Date'}</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>{language === 'hi' ? 'मूल राशि (Subtotal)' : 'Subtotal'}</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>{language === 'hi' ? 'डिस्काउंट राशि' : 'Discount Given'}</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>{language === 'hi' ? 'अंतिम राशि (Grand Total)' : 'Grand Total'}</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>{language === 'hi' ? 'विवरण' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody>
                  {discountOrders.map((o) => {
                    const sub = o.subtotal || 0;
                    const disc = o.discount || 0;
                    const discTypeStr = o.discountType === 'percent' ? `(${o.discountValue}%)` : '';
                    const finalTotal = o.grandTotal || Math.max(0, sub - disc);

                    return (
                      <tr
                        key={o._id}
                        style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                        className="reports__discount-row"
                        onClick={() => setSelectedDiscountModalOrder(o)}
                      >
                        <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                          <div style={{ color: 'var(--text-primary)' }}>{o.customerName}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 400 }}>{o.customerMobile || o.customerPhone || ''}</div>
                        </td>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 600, color: '#2563eb' }}>
                          {o.orderNumber} ({o.tokenNumber || 'T-100'})
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                          {formatDateDMY(o.createdAt || o.orderDate)}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                          {formatAmount(sub)}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#d97706' }}>
                          - {formatAmount(disc)} <span style={{ fontSize: '11px', color: '#b45309', fontWeight: 500 }}>{discTypeStr}</span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#166534' }}>
                          {formatAmount(finalTotal)}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <button
                            type="button"
                            style={{
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              color: '#1d4ed8',
                              borderRadius: '6px',
                              padding: '5px 12px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDiscountModalOrder(o);
                            }}
                          >
                            <Eye size={13} /> {language === 'hi' ? 'देखें' : 'View Details'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Customer Discount Details Modal */}
      {selectedDiscountModalOrder && (
        <div className="modal-overlay" onClick={() => setSelectedDiscountModalOrder(null)}>
          <div className="modal animate-scale-in" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="modal__header">
              <h2>🏷️ Discount Breakdown - {selectedDiscountModalOrder.customerName}</h2>
              <button className="modal__close" onClick={() => setSelectedDiscountModalOrder(null)}><X size={20} /></button>
            </div>
            <div className="modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', color: '#0f172a', fontWeight: 700 }}>{selectedDiscountModalOrder.customerName}</h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                    Order #{selectedDiscountModalOrder.orderNumber} • Token #{selectedDiscountModalOrder.tokenNumber || 'T-100'}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Order Date</span>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{formatDateDMY(selectedDiscountModalOrder.createdAt || selectedDiscountModalOrder.orderDate)}</p>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>Garment Items Included:</h4>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  {(selectedDiscountModalOrder.items || []).map((it, idx) => (
                    <div key={idx} style={{ padding: '10px 14px', borderBottom: idx < (selectedDiscountModalOrder.items || []).length - 1 ? '1px solid #f1f5f9' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                      <div>
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>{it.name}</span>
                        <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '6px' }}>({it.category || 'Garment'})</span>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Qty: {it.qty} × ₹{it.price}</div>
                      </div>
                      <strong style={{ color: '#0f172a' }}>{formatAmount((it.qty || 1) * (it.price || 0))}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569' }}>
                  <span>Subtotal Amount:</span>
                  <span>{formatAmount(selectedDiscountModalOrder.subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 700, color: '#b45309' }}>
                  <span>Discount Given {selectedDiscountModalOrder.discountType === 'percent' ? `(${selectedDiscountModalOrder.discountValue}%)` : ''}:</span>
                  <span>- {formatAmount(selectedDiscountModalOrder.discount)}</span>
                </div>
                {selectedDiscountModalOrder.extraCharges > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569' }}>
                    <span>Extra Charges:</span>
                    <span>+ {formatAmount(selectedDiscountModalOrder.extraCharges)}</span>
                  </div>
                )}
                <div style={{ borderTop: '1px dashed #fde68a', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 800, color: '#166534' }}>
                  <span>Final Grand Total:</span>
                  <span>{formatAmount(selectedDiscountModalOrder.grandTotal || Math.max(0, selectedDiscountModalOrder.subtotal - selectedDiscountModalOrder.discount))}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f1f5f9', padding: '10px 14px', borderRadius: '6px', fontSize: '13px' }}>
                <span>Paid So Far: <strong>{formatAmount(selectedDiscountModalOrder.paidAmount)}</strong></span>
                <span style={{ color: selectedDiscountModalOrder.pendingAmount > 0 ? '#dc2626' : '#166534', fontWeight: 700 }}>
                  Remaining Balance: {formatAmount(selectedDiscountModalOrder.pendingAmount)}
                </span>
              </div>

              <div className="modal__actions">
                <button type="button" className="modal__btn modal__btn--primary" onClick={() => setSelectedDiscountModalOrder(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Payment History & Date Adjustment Modal */}
      <PaymentHistoryModal
        isOpen={!!selectedPaymentHistoryOrder}
        onClose={() => setSelectedPaymentHistoryOrder(null)}
        order={selectedPaymentHistoryOrder ? (orders.find(o => o._id === selectedPaymentHistoryOrder._id || o.orderNumber === selectedPaymentHistoryOrder.orderNumber) || selectedPaymentHistoryOrder) : null}
      />
    </div>
  );
}
