import { useState, useMemo, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
  BarChart3, TrendingUp, TrendingDown, Download, Calendar,
  PieChart as PieIcon, DollarSign, Users, FileSpreadsheet, FileText, Filter
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

  // Calculate Net Profit & Financials for filtered dataset
  const stats = useMemo(() => {
    const totalSales = filteredOrders.reduce((s, o) => s + (o.paidAmount || 0), 0);
    const totalBilled = filteredOrders.reduce((s, o) => s + (o.subtotal || 0), 0);
    const totalPending = filteredOrders.reduce((s, o) => s + (o.pendingAmount || 0), 0);
    const totalExp = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0);

    const netProfit = totalSales - totalExp;
    const marginPct = totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : 0;

    return {
      totalSales,
      totalBilled,
      totalPending,
      totalExp,
      netProfit,
      marginPct,
    };
  }, [filteredOrders, filteredExpenses]);

  // Expense breakdown chart data
  const expenseChartData = useMemo(() => {
    const map = {};
    filteredExpenses.forEach(e => {
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
    if (period === 'custom') return `${t('customDate', 'Custom')} (${dateRangeStr})`;
    return t('allTime', 'All Time');
  }, [period, dateRangeStr, t]);

  const prepareReportExportData = () => {
    return {
      title: language === 'hi' ? 'वित्तीय बिक्री व राजस्व रिपोर्ट' : 'Financial Sales & Revenue Report',
      language,
      shopInfo: {
        name: shopInfo.name || 'Darji',
        tagline: shopInfo.tagline || 'Stitched to Perfection',
        address: shopInfo.address || '80/LIG 1ST New Housing Board Colony, Shahdol (M.P.) 484001',
        phone: shopInfo.phone || '+91 7828962210',
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
        customerName: o.customerName,
        date: formatDateDMY(o.createdAt || o.orderDate),
        grandTotal: o.grandTotal || o.subtotal,
        paidAmount: o.paidAmount || 0,
        pendingAmount: o.pendingAmount || 0,
        status: o.status,
      })),
      expenses: filteredExpenses.map(e => ({
        date: formatDateDMY(e.date || e.createdAt),
        description: e.description,
        category: getCatLabel(e.category, language),
        paymentMode: e.paymentMode,
        amount: e.amount,
      })),
    };
  };

  const handleExportPDF = () => {
    const reportData = prepareReportExportData();
    printReportPDF(reportData);
  };

  const handleExportExcel = () => {
    const reportData = prepareReportExportData();
    exportReportExcel(reportData);
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
      <div className="reports__summary-grid">
        <div className="reports__card">
          <span className="reports__card-label">{t('totalRevenue', 'Total Revenue Collected')}</span>
          <p className="reports__card-val reports__card-val--success">{formatAmount(stats.totalSales)}</p>
          <span className="reports__card-sub">{language === 'hi' ? 'कुल बिलिंग:' : 'Total Billed:'} {formatAmount(stats.totalBilled)}</span>
        </div>

        <div className="reports__card">
          <span className="reports__card-label">{t('totalOperatingExpenses', 'Total Operating Expenses')}</span>
          <p className="reports__card-val reports__card-val--danger">{formatAmount(stats.totalExp)}</p>
          <span className="reports__card-sub">{filteredExpenses.length} {language === 'hi' ? 'खर्चे दर्ज' : 'expenses in period'}</span>
        </div>

        <div className="reports__card reports__card--profit">
          <span className="reports__card-label">{t('netProfit', 'Net Profit (Sales - Expenses)')}</span>
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
    </div>
  );
}
