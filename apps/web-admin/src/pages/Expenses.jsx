import { useState, useMemo, useEffect } from 'react';
import {
  Wallet, Plus, Search, Filter, TrendingDown, TrendingUp, Calendar,
  Tag, Image, Repeat, Trash2, Edit, CheckCircle, X, Download, ArrowDownRight, ArrowUpRight, DollarSign
} from 'lucide-react';
import useAppStore from '../store/appStore';
import useLanguageStore from '../store/languageStore';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_MODES } from '../constants';
import { exportExpensesExcel } from '../utils/generateReportExcel';
import './Expenses.css';

const formatINR = (a) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(a || 0);

const getCatLabel = (catVal, isIncome, language) => {
  if (language !== 'hi') {
    if (isIncome) {
      return INCOME_CATEGORIES.find(c => c.value === catVal)?.label || catVal;
    }
    return EXPENSE_CATEGORIES.find(c => c.value === catVal)?.label || catVal;
  }
  const expMap = {
    shop: 'दुकान / किराया',
    employee: 'कर्मचारी / वेतन',
    material: 'कपड़ा / सामग्री',
    marketing: 'प्रचार व विज्ञापन',
    misc: 'अन्य खर्चे',
  };
  const incMap = {
    small_tasks: 'छोटे काम / मरम्मत',
    youtube: 'यूट्यूब / ऑनलाइन आय',
    scrap: 'कतरन / रद्दी बिक्री',
    commission: 'कमीशन / रेफरल',
    other_income: 'अन्य अतिरिक्त आय',
  };
  return (isIncome ? incMap[catVal] : expMap[catVal]) || catVal;
};

export default function Expenses() {
  const { expenses, fetchExpensesFromDB, addExpense, deleteExpense } = useAppStore();
  const { t, language } = useLanguageStore();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'expense' | 'income'
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // Modal State
  const [entryType, setEntryType] = useState('expense'); // 'expense' | 'income'
  const [newEntry, setNewEntry] = useState({
    description: '',
    category: 'shop',
    amount: '',
    paymentMode: 'cash',
    isRecurringMonthly: false,
    date: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    fetchExpensesFromDB();
  }, []);

  const filteredExpenses = useMemo(() => {
    return (expenses || []).filter(e => {
      const isIncome = e.type === 'income';
      const itemType = isIncome ? 'income' : 'expense';
      
      const matchType = typeFilter === 'all' || itemType === typeFilter;
      const matchSearch = String(e.description || '').toLowerCase().includes(String(search || '').toLowerCase());
      const matchCat = categoryFilter === 'all' || e.category === categoryFilter;
      return matchType && matchSearch && matchCat;
    });
  }, [expenses, search, typeFilter, categoryFilter]);

  const financialTotals = useMemo(() => {
    let totalExpenses = 0;
    let totalExtraIncome = 0;

    (expenses || []).forEach(e => {
      const amt = Number(e.amount) || 0;
      if (e.type === 'income') {
        totalExtraIncome += amt;
      } else {
        totalExpenses += amt;
      }
    });

    const netBalance = totalExtraIncome - totalExpenses;
    return { totalExpenses, totalExtraIncome, netBalance };
  }, [expenses]);

  const openAddModal = (type = 'expense') => {
    setEntryType(type);
    setNewEntry({
      description: '',
      category: type === 'income' ? 'small_tasks' : 'shop',
      amount: '',
      paymentMode: 'cash',
      isRecurringMonthly: false,
      date: new Date().toISOString().slice(0, 10),
    });
    setShowAddModal(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!newEntry.description || !newEntry.amount) return;

    const payload = {
      ...newEntry,
      type: entryType,
      amount: parseFloat(newEntry.amount) || 0,
      createdAt: new Date().toISOString(),
    };

    await addExpense(payload);
    setShowAddModal(false);
  };

  const handleDeleteEntry = (id) => {
    if (window.confirm(language === 'hi' ? 'क्या आप इस एंट्री को हटाना चाहते हैं?' : 'Are you sure you want to delete this transaction entry?')) {
      deleteExpense(id);
    }
  };

  const activeCategories = entryType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div className="expenses">
      {/* Summary Cards */}
      <div className="expenses__cards">
        <div className="expenses__card expenses__card--expense">
          <div className="expenses__card-header-row">
            <span className="expenses__card-label">{t('totalExpensesCard', 'Total Expenses')}</span>
            <span className="expenses__card-badge expenses__card-badge--expense"><ArrowDownRight size={14} /> Outflow</span>
          </div>
          <p className="expenses__card-val expenses__card-val--danger">{formatINR(financialTotals.totalExpenses)}</p>
        </div>

        <div className="expenses__card expenses__card--income">
          <div className="expenses__card-header-row">
            <span className="expenses__card-label">{t('extraIncomeCard', 'Extra Income')}</span>
            <span className="expenses__card-badge expenses__card-badge--income"><ArrowUpRight size={14} /> Inflow</span>
          </div>
          <p className="expenses__card-val expenses__card-val--success">+{formatINR(financialTotals.totalExtraIncome)}</p>
        </div>

        <div className="expenses__card expenses__card--net">
          <div className="expenses__card-header-row">
            <span className="expenses__card-label">{t('netExpenseBalanceCard', 'Net Balance (Income - Expense)')}</span>
            <span className="expenses__card-badge expenses__card-badge--gold"><DollarSign size={14} /> Net</span>
          </div>
          <p className={`expenses__card-val ${financialTotals.netBalance >= 0 ? 'expenses__card-val--success' : 'expenses__card-val--danger'}`}>
            {financialTotals.netBalance >= 0 ? '+' : ''}{formatINR(financialTotals.netBalance)}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="expenses__toolbar">
        <div className="expenses__search">
          <Search size={16} className="expenses__search-icon" />
          <input
            type="text"
            placeholder={language === 'hi' ? 'विवरण या टास्क खोजें...' : 'Search description or tasks...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="expenses__search-input"
          />
        </div>

        {/* Type Switcher */}
        <div className="expenses__type-tabs">
          <button
            className={`expenses__type-tab ${typeFilter === 'all' ? 'active' : ''}`}
            onClick={() => { setTypeFilter('all'); setCategoryFilter('all'); }}
          >
            {t('allTypes', 'All Transactions')}
          </button>
          <button
            className={`expenses__type-tab expenses__type-tab--expense ${typeFilter === 'expense' ? 'active' : ''}`}
            onClick={() => { setTypeFilter('expense'); setCategoryFilter('all'); }}
          >
            💸 {t('expensesOnly', 'Expenses Only (खर्चे)')}
          </button>
          <button
            className={`expenses__type-tab expenses__type-tab--income ${typeFilter === 'income' ? 'active' : ''}`}
            onClick={() => { setTypeFilter('income'); setCategoryFilter('all'); }}
          >
            💰 {t('incomeOnly', 'Extra Income Only (अतिरिक्त आय)')}
          </button>
        </div>

        <div className="expenses__action-group">
          <button
            className="expenses__excel-btn"
            onClick={() => exportExpensesExcel(filteredExpenses)}
          >
            <Download size={15} /> {language === 'hi' ? 'एक्सेल रिपोर्ट' : 'Export Excel'}
          </button>
          <button
            className="expenses__add-income-btn"
            onClick={() => openAddModal('income')}
          >
            <Plus size={16} /> {t('recordIncomeBtn', '+ Add Extra Income')}
          </button>
          <button
            className="expenses__add-expense-btn"
            onClick={() => openAddModal('expense')}
          >
            <Plus size={16} /> {t('recordExpenseBtn', '+ Record Expense')}
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="expenses__filters">
        <button
          className={`expenses__cat-btn ${categoryFilter === 'all' ? 'expenses__cat-btn--active' : ''}`}
          onClick={() => setCategoryFilter('all')}
        >
          {t('allCategories', 'All Categories')}
        </button>

        {typeFilter !== 'income' && EXPENSE_CATEGORIES.map(cat => (
          <button
            key={'exp_' + cat.value}
            className={`expenses__cat-btn ${categoryFilter === cat.value ? 'expenses__cat-btn--active' : ''}`}
            onClick={() => setCategoryFilter(cat.value)}
          >
            {getCatLabel(cat.value, false, language)}
          </button>
        ))}

        {typeFilter !== 'expense' && INCOME_CATEGORIES.map(cat => (
          <button
            key={'inc_' + cat.value}
            className={`expenses__cat-btn expenses__cat-btn--inc ${categoryFilter === cat.value ? 'expenses__cat-btn--active-inc' : ''}`}
            onClick={() => setCategoryFilter(cat.value)}
          >
            ✨ {getCatLabel(cat.value, true, language)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="expenses__table-card">
        <table className="expenses__table">
          <thead>
            <tr>
              <th>{t('dateCol', 'DATE')}</th>
              <th>{t('typeCol', 'TYPE')}</th>
              <th>{t('descCol', 'DESCRIPTION')}</th>
              <th>{t('catCol', 'CATEGORY')}</th>
              <th>{t('modeCol', 'MODE')}</th>
              <th>{t('recurringCol', 'RECURRING')}</th>
              <th style={{ textAlign: 'right' }}>{t('amountCol', 'AMOUNT')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={8} className="expenses__empty">
                  <Wallet size={36} />
                  <p>{language === 'hi' ? 'कोई रिकॉर्ड नहीं मिला' : 'No expenses or income entries found'}</p>
                </td>
              </tr>
            ) : (
              filteredExpenses.map(item => {
                const isIncome = item.type === 'income';
                return (
                  <tr key={item._id} className={`expenses__row ${isIncome ? 'expenses__row--income' : ''}`}>
                    <td>{new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td>
                      <span className={`expenses__type-badge ${isIncome ? 'expenses__type-badge--income' : 'expenses__type-badge--expense'}`}>
                        {isIncome ? 'INCOME' : 'EXPENSE'}
                      </span>
                    </td>
                    <td className="expenses__desc">
                      <strong>{item.description}</strong>
                    </td>
                    <td>
                      <span className={`expenses__cat-badge ${isIncome ? 'expenses__cat-badge--income' : ''}`}>
                        {getCatLabel(item.category, isIncome, language)}
                      </span>
                    </td>
                    <td><span className="expenses__mode">{item.paymentMode.toUpperCase()}</span></td>
                    <td>
                      {item.isRecurringMonthly ? (
                        <span className="expenses__recurring"><Repeat size={12} /> Monthly</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className={`expenses__amount ${isIncome ? 'expenses__amount--income' : 'expenses__amount--expense'}`} style={{ textAlign: 'right' }}>
                      {isIncome ? '+' : '-'}{formatINR(item.amount)}
                    </td>
                    <td>
                      <button className="expenses__del-btn" onClick={() => handleDeleteEntry(item._id)} title="Delete entry">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Entry Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>{entryType === 'income' ? (language === 'hi' ? '💰 अतिरिक्त आय जोड़ें' : '💰 Add Extra Shop Income') : (language === 'hi' ? '💸 नया खर्चा दर्ज करें' : '💸 Record Shop Expense')}</h2>
              <button className="modal__close" onClick={() => setShowAddModal(false)}><X size={20} /></button>
            </div>

            {/* Type Selector Switch inside Modal */}
            <div className="expenses__modal-type-switch">
              <button
                type="button"
                className={`expenses__modal-type-btn ${entryType === 'expense' ? 'active-expense' : ''}`}
                onClick={() => {
                  setEntryType('expense');
                  setNewEntry(prev => ({ ...prev, category: 'shop' }));
                }}
              >
                💸 {language === 'hi' ? 'दुकान का खर्च (Expense)' : 'Shop Expense'}
              </button>
              <button
                type="button"
                className={`expenses__modal-type-btn ${entryType === 'income' ? 'active-income' : ''}`}
                onClick={() => {
                  setEntryType('income');
                  setNewEntry(prev => ({ ...prev, category: 'small_tasks' }));
                }}
              >
                💰 {language === 'hi' ? 'अतिरिक्त आय (Extra Income)' : 'Extra Income'}
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="modal__body">
              <div className="modal__field">
                <label>{entryType === 'income' ? (language === 'hi' ? 'आय का विवरण (Description) *' : 'Income Description / Source *') : (language === 'hi' ? 'खर्च का विवरण (Description) *' : 'Expense Description *')}</label>
                <input
                  type="text"
                  placeholder={entryType === 'income' ? 'e.g. Small alteration, YouTube revenue, Fabric scrap sale, Commission' : 'e.g. Shop rent, Thread & buttons purchase, Electricity bill'}
                  value={newEntry.description}
                  onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                  required
                />
              </div>

              <div className="modal__grid">
                <div className="modal__field">
                  <label>{language === 'hi' ? 'राशि (₹) *' : 'Amount (₹) *'}</label>
                  <input
                    type="number"
                    placeholder="Enter amount"
                    value={newEntry.amount}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setNewEntry({ ...newEntry, amount: e.target.value })}
                    required
                    min="1"
                  />
                </div>

                <div className="modal__field">
                  <label>{language === 'hi' ? 'श्रेणी (Category)' : 'Category'}</label>
                  <select
                    value={newEntry.category}
                    onChange={(e) => setNewEntry({ ...newEntry, category: e.target.value })}
                  >
                    {activeCategories.map(c => (
                      <option key={c.value} value={c.value}>{getCatLabel(c.value, entryType === 'income', language)}</option>
                    ))}
                  </select>
                </div>

                <div className="modal__field">
                  <label>{language === 'hi' ? 'भुगतान माध्यम (Mode)' : 'Payment Mode'}</label>
                  <select
                    value={newEntry.paymentMode}
                    onChange={(e) => setNewEntry({ ...newEntry, paymentMode: e.target.value })}
                  >
                    <option value="cash">Cash (नकद)</option>
                    <option value="upi">UPI / GPay / PhonePe</option>
                    <option value="bankTransfer">Bank Transfer</option>
                  </select>
                </div>

                <div className="modal__field">
                  <label>{language === 'hi' ? 'तारीख (Date)' : 'Date'}</label>
                  <input
                    type="date"
                    value={newEntry.date}
                    onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal__field">
                <label className="customers__toggle-label">
                  <input
                    type="checkbox"
                    checked={newEntry.isRecurringMonthly}
                    onChange={(e) => setNewEntry({ ...newEntry, isRecurringMonthly: e.target.checked })}
                  />
                  <span>{entryType === 'income' ? (language === 'hi' ? 'क्या यह मासिक आवर्ती आय है? (जैसे YouTube, अनुबंध आदि)' : 'Is this a monthly recurring income? (e.g. YouTube, recurring client)') : (language === 'hi' ? 'क्या यह मासिक आवर्ती खर्च है? (जैसे किराया, वेतन)' : 'Is this a recurring monthly expense? (e.g. Rent, Salary)')}</span>
                </label>
              </div>

              <div className="modal__actions">
                <button type="button" className="modal__btn modal__btn--secondary" onClick={() => setShowAddModal(false)}>
                  {language === 'hi' ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="modal__btn"
                  style={{
                    background: entryType === 'income' ? '#16a34a' : 'var(--color-navy-700)',
                    color: 'white',
                    fontWeight: 700,
                  }}
                >
                  {entryType === 'income' ? (language === 'hi' ? 'आय सुरक्षित करें' : 'Save Income Entry') : (language === 'hi' ? 'खर्च सुरक्षित करें' : 'Save Expense Entry')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
