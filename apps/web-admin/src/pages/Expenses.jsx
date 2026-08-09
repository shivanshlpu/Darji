import { useState, useMemo, useEffect } from 'react';
import {
  Wallet, Plus, Search, Filter, TrendingDown, Calendar,
  Tag, Image, Repeat, Trash2, Edit, CheckCircle, X, Download
} from 'lucide-react';
import useAppStore from '../store/appStore';
import useLanguageStore from '../store/languageStore';
import { EXPENSE_CATEGORIES, PAYMENT_MODES } from '../constants';
import { exportExpensesExcel } from '../utils/generateReportExcel';
import './Expenses.css';

const formatINR = (a) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(a || 0);

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

export default function Expenses() {
  const { expenses, fetchExpensesFromDB, addExpense, deleteExpense } = useAppStore();
  const { t, language } = useLanguageStore();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchExpensesFromDB();
  }, []);

  const [newExpense, setNewExpense] = useState({
    description: '',
    category: 'shop',
    amount: '',
    paymentMode: 'cash',
    isRecurringMonthly: false,
    date: new Date().toISOString().slice(0, 10),
  });

  const filteredExpenses = useMemo(() => {
    return (expenses || []).filter(e => {
      const matchSearch = (e.description || '').toLowerCase().includes(search.toLowerCase());
      const matchCat = categoryFilter === 'all' || e.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [expenses, search, categoryFilter]);

  const categoryTotals = useMemo(() => {
    const totals = { total: 0 };
    EXPENSE_CATEGORIES.forEach(c => { totals[c.value] = 0; });
    (expenses || []).forEach(e => {
      const amt = Number(e.amount) || 0;
      totals.total += amt;
      if (totals[e.category] !== undefined) {
        totals[e.category] += amt;
      }
    });
    return totals;
  }, [expenses]);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!newExpense.description || !newExpense.amount) return;

    const payload = {
      ...newExpense,
      amount: parseFloat(newExpense.amount) || 0,
      createdAt: new Date().toISOString(),
    };

    await addExpense(payload);

    setShowAddModal(false);
    setNewExpense({
      description: '',
      category: 'shop',
      amount: '',
      paymentMode: 'cash',
      isRecurringMonthly: false,
      date: new Date().toISOString().slice(0, 10),
    });
  };

  const handleDeleteExpense = (id) => {
    if (window.confirm('Are you sure you want to delete this expense entry?')) {
      deleteExpense(id);
    }
  };

  return (
    <div className="expenses">
      {/* Summary Cards */}
      <div className="expenses__cards">
        <div className="expenses__card expenses__card--total">
          <span className="expenses__card-label">{t('totalExpensesCard', 'Total Expenses')}</span>
          <p className="expenses__card-val">{formatINR(categoryTotals.total)}</p>
        </div>
        {EXPENSE_CATEGORIES.map(cat => (
          <div key={cat.value} className="expenses__card">
            <span className="expenses__card-label">{getCatLabel(cat.value, language)}</span>
            <p className="expenses__card-val">{formatINR(categoryTotals[cat.value])}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="expenses__toolbar">
        <div className="expenses__search">
          <Search size={16} className="expenses__search-icon" />
          <input
            type="text"
            placeholder={language === 'hi' ? 'खर्च विवरण खोजें...' : 'Search description...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="expenses__search-input"
          />
        </div>

        <div className="expenses__filters">
          <button
            className={`expenses__cat-btn ${categoryFilter === 'all' ? 'expenses__cat-btn--active' : ''}`}
            onClick={() => setCategoryFilter('all')}
          >
            {t('allCategories', 'All Categories')}
          </button>
          {EXPENSE_CATEGORIES.map(cat => (
            <button
              key={cat.value}
              className={`expenses__cat-btn ${categoryFilter === cat.value ? 'expenses__cat-btn--active' : ''}`}
              onClick={() => setCategoryFilter(cat.value)}
            >
              {getCatLabel(cat.value, language)}
            </button>
          ))}
        </div>

        <button
          className="expenses__add-btn"
          style={{ background: '#16a34a', borderColor: '#16a34a', marginRight: '8px' }}
          onClick={() => exportExpensesExcel(filteredExpenses)}
        >
          <Download size={16} /> {language === 'hi' ? 'एक्सेल रिपोर्ट डाउनलोड' : 'Export Expenses Excel'}
        </button>
        <button className="expenses__add-btn" onClick={() => setShowAddModal(true)}>
          <Plus size={18} /> {t('recordExpenseBtn', '+ Record Expense')}
        </button>
      </div>

      {/* Table */}
      <div className="expenses__table-card">
        <table className="expenses__table">
          <thead>
            <tr>
              <th>{t('dateCol', 'DATE')}</th>
              <th>{t('descCol', 'DESCRIPTION')}</th>
              <th>{t('catCol', 'CATEGORY')}</th>
              <th>{t('modeCol', 'MODE')}</th>
              <th>{t('recurringCol', 'RECURRING')}</th>
              <th>{t('amountCol', 'AMOUNT')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={7} className="expenses__empty">
                  <Wallet size={36} />
                  <p>No expenses found</p>
                </td>
              </tr>
            ) : (
              filteredExpenses.map(item => (
                <tr key={item._id} className="expenses__row">
                  <td>{new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td className="expenses__desc">{item.description}</td>
                  <td>
                    <span className="expenses__cat-badge">{EXPENSE_CATEGORIES.find(c => c.value === item.category)?.label || item.category}</span>
                  </td>
                  <td><span className="expenses__mode">{item.paymentMode.toUpperCase()}</span></td>
                  <td>
                    {item.isRecurringMonthly ? (
                      <span className="expenses__recurring"><Repeat size={12} /> Monthly</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="expenses__amount">{formatINR(item.amount)}</td>
                  <td>
                    <button className="expenses__del-btn" onClick={() => handleDeleteExpense(item._id)} title="Delete entry">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>Record New Expense</h2>
              <button className="modal__close" onClick={() => setShowAddModal(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleAddExpense} className="modal__body">
              <div className="modal__field">
                <label>Description *</label>
                <input
                  type="text"
                  placeholder="e.g. Shop rent, Thread purchase, Electricity bill"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  required
                />
              </div>

              <div className="modal__grid">
                <div className="modal__field">
                  <label>Amount (₹) *</label>
                  <input
                    type="number"
                    placeholder="Enter amount"
                    value={newExpense.amount}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    required
                  />
                </div>

                <div className="modal__field">
                  <label>Category</label>
                  <select
                    value={newExpense.category}
                    onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                  >
                    {EXPENSE_CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div className="modal__field">
                  <label>Payment Mode</label>
                  <select
                    value={newExpense.paymentMode}
                    onChange={(e) => setNewExpense({ ...newExpense, paymentMode: e.target.value })}
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI / GPay</option>
                    <option value="bankTransfer">Bank Transfer</option>
                  </select>
                </div>

                <div className="modal__field">
                  <label>Date</label>
                  <input
                    type="date"
                    value={newExpense.date}
                    onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal__field">
                <label className="customers__toggle-label">
                  <input
                    type="checkbox"
                    checked={newExpense.isRecurringMonthly}
                    onChange={(e) => setNewExpense({ ...newExpense, isRecurringMonthly: e.target.checked })}
                  />
                  <span>Is this a recurring monthly expense? (e.g. Rent, Salary)</span>
                </label>
              </div>

              <div className="modal__actions">
                <button type="button" className="modal__btn modal__btn--secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="modal__btn modal__btn--primary">Save Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
