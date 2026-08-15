import { useState, useMemo, useEffect } from 'react';
import {
  BookOpen, Calendar, IndianRupee, AlertTriangle, CheckCircle,
  TrendingUp, TrendingDown, Save, FileText
} from 'lucide-react';
import useAppStore from '../store/appStore';
import useLanguageStore from '../store/languageStore';
import { apiClient } from '../services/apiClient';
import './Cashbook.css';

const formatINR = (a) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(a || 0);

export default function Cashbook() {
  const { orders, expenses } = useAppStore();
  const { t, language } = useLanguageStore();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  // Carry forward opening cash
  const [openingCash, setOpeningCash] = useState(12500);
  const [closingCashActual, setClosingCashActual] = useState(18500);
  const [mismatchReason, setMismatchReason] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    async function loadCashbook() {
      try {
        const res = await apiClient.getCashbook(selectedDate);
        if (res.success && res.data) {
          if (res.data.openingCash !== undefined) setOpeningCash(res.data.openingCash);
          if (res.data.closingCashActual !== undefined) setClosingCashActual(res.data.closingCashActual);
          if (res.data.mismatchReason) setMismatchReason(res.data.mismatchReason);
        }
      } catch (err) {
        console.warn('Cashbook fetch error:', err.message);
      }
    }
    loadCashbook();
  }, [selectedDate]);

  // Auto-calculated values for selected date (Section 7.5 Formula)
  const cashSales = useMemo(() => {
    return (orders || [])
      .filter(o => o.createdAt && o.createdAt.slice(0, 10) === selectedDate)
      .reduce((s, o) => s + (o.paidAmount || 0), 0);
  }, [orders, selectedDate]);

  const onlineSales = useMemo(() => {
    return Math.round(cashSales * 0.45); // Simulated online portion
  }, [cashSales]);

  const totalExpensesCash = useMemo(() => {
    return (expenses || [])
      .filter(e => e.date === selectedDate && e.paymentMode === 'cash' && e.type !== 'income')
      .reduce((s, e) => s + e.amount, 0);
  }, [expenses, selectedDate]);

  const totalExtraIncomeCash = useMemo(() => {
    return (expenses || [])
      .filter(e => e.date === selectedDate && e.paymentMode === 'cash' && e.type === 'income')
      .reduce((s, e) => s + e.amount, 0);
  }, [expenses, selectedDate]);

  const closingCashExpected = useMemo(() => {
    return openingCash + cashSales + totalExtraIncomeCash - totalExpensesCash;
  }, [openingCash, cashSales, totalExtraIncomeCash, totalExpensesCash]);

  const mismatch = useMemo(() => {
    return closingCashActual - closingCashExpected;
  }, [closingCashActual, closingCashExpected]);

  const handleSaveClose = async (e) => {
    e.preventDefault();
    if (mismatch !== 0 && !mismatchReason.trim()) {
      alert(language === 'hi' ? 'कृपया कैश में अंतर का कारण दर्ज करें!' : 'Kripya Cash Mismatch ka reason zaroor darj karein!');
      return;
    }
    try {
      await apiClient.closeCashbook(selectedDate, {
        openingCash,
        closingCashActual,
        mismatchReason,
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      alert('Failed to save cashbook: ' + err.message);
    }
  };

  return (
    <div className="cashbook">
      {/* Header Bar */}
      <div className="cashbook__header">
        <div>
          <h2>{t('cashbookHeading', 'Daily Cash Book')}</h2>
          <p>{t('cashbookSubheading', 'Auto-calculated cash ledger, opening/closing balance & mismatch detection')}</p>
        </div>

        <div className="cashbook__date-picker">
          <Calendar size={18} />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      {/* Cash Mismatch Alert Banner */}
      {mismatch !== 0 && (
        <div className="cashbook__mismatch-alert animate-fade-in-down">
          <AlertTriangle size={24} className="cashbook__alert-icon" />
          <div className="cashbook__alert-text">
            <h4>{t('mismatchWarningTitle', 'Cash Mismatch Detected!')} ({formatINR(mismatch)})</h4>
            <p>
              {language === 'hi'
                ? `गल्ले का अनुमानित नकद ${formatINR(closingCashExpected)} है, लेकिन दर्ज नकद ${formatINR(closingCashActual)} है। नियम 7.5 के अनुसार विवरण दर्ज करना अनिवार्य है।`
                : `Expected cash in drawer is ${formatINR(closingCashExpected)}, but actual entered is ${formatINR(closingCashActual)}. Section 7.5 compliance requires recording a reason.`}
            </p>
          </div>
        </div>
      )}

      {/* Formula Breakdown Cards */}
      <div className="cashbook__cards">
        <div className="cashbook__card">
          <span className="cashbook__card-label">{t('openingCashCard', '1. Opening Cash (Carry Forward)')}</span>
          <div className="cashbook__card-input-row">
            <span className="cashbook__card-val">{formatINR(openingCash)}</span>
          </div>
        </div>

        <div className="cashbook__card cashbook__card--plus">
          <span className="cashbook__card-label">{t('cashSalesTodayCard', '2. Cash Sales Today')}</span>
          <span className="cashbook__card-val cashbook__card-val--success">+{formatINR(cashSales)}</span>
          <small className="cashbook__sub">{language === 'hi' ? 'ऑनलाइन बिक्री (UPI/कार्ड):' : 'Online Sales (UPI/Card):'} {formatINR(onlineSales)}</small>
        </div>

        {totalExtraIncomeCash > 0 && (
          <div className="cashbook__card cashbook__card--plus" style={{ borderLeftColor: '#16a34a' }}>
            <span className="cashbook__card-label">{language === 'hi' ? 'अतिरिक्त नकद आय' : 'Extra Cash Income'}</span>
            <span className="cashbook__card-val cashbook__card-val--success">+{formatINR(totalExtraIncomeCash)}</span>
          </div>
        )}

        <div className="cashbook__card cashbook__card--minus">
          <span className="cashbook__card-label">{t('cashExpensesTodayCard', '3. Cash Expenses Today')}</span>
          <span className="cashbook__card-val cashbook__card-val--danger">-{formatINR(totalExpensesCash)}</span>
        </div>

        <div className="cashbook__card cashbook__card--equals">
          <span className="cashbook__card-label">{t('expectedClosingCashCard', '4. Expected Closing Cash')}</span>
          <span className="cashbook__card-val cashbook__card-val--gold">{formatINR(closingCashExpected)}</span>
        </div>
      </div>

      {/* Reconciliation Entry Card */}
      <div className="cashbook__entry-card">
        <h3>{t('reconciliationHeading', 'Daily Cash Closure & Reconciliation')}</h3>
        <p className="cashbook__entry-sub">{t('reconciliationSub', 'Count the physical cash in shop drawer at closing time and enter below.')}</p>

        <form onSubmit={handleSaveClose} className="cashbook__form">
          <div className="cashbook__form-row">
            <div className="cashbook__field">
              <label>{t('actualCashLabel', 'Actual Physical Cash Count (₹) *')}</label>
              <input
                type="number"
                value={closingCashActual}
                onChange={(e) => setClosingCashActual(Number(e.target.value))}
                required
              />
            </div>

            <div className="cashbook__field">
              <label>{language === 'hi' ? 'अनुमानित अंतर (Mismatch)' : 'Calculated Mismatch'}</label>
              <input
                type="text"
                value={formatINR(mismatch)}
                disabled
                className={mismatch !== 0 ? 'cashbook__field--error' : 'cashbook__field--success'}
              />
            </div>
          </div>

          {mismatch !== 0 && (
            <div className="cashbook__field animate-fade-in">
              <label>Mismatch Reason / Explanation *</label>
              <textarea
                placeholder="e.g. ₹500 advance given for tea/snacks without voucher, or petty cash discrepancy..."
                value={mismatchReason}
                onChange={(e) => setMismatchReason(e.target.value)}
                rows={3}
                required
              />
            </div>
          )}

          <div className="cashbook__form-footer">
            {isSaved && (
              <span className="cashbook__saved-badge animate-fade-in">
                <CheckCircle size={16} /> Cash Book Closed & Saved Successfully!
              </span>
            )}
            <button type="submit" className="cashbook__save-btn">
              <Save size={18} /> Close & Save Cash Book
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
