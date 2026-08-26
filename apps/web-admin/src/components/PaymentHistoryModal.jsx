import { useState } from 'react';
import { X, Calendar, IndianRupee, CreditCard, Plus, Trash2, Edit2, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import useAppStore from '../store/appStore';
import useLanguageStore from '../store/languageStore';
import usePrivacyStore from '../store/privacyStore';
import './PaymentHistoryModal.css';

export default function PaymentHistoryModal({ isOpen, onClose, order }) {
  const { addOrderPayment, updateOrderPayment, deleteOrderPayment, markOrderPaid } = useAppStore();
  const { t, language } = useLanguageStore();
  const { formatAmount } = usePrivacyStore();

  const [isAdding, setIsAdding] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState(null);

  // Form state for adding/editing payment
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('cash');
  const [type, setType] = useState('partial');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!isOpen || !order) return null;

  const grandTotal = order.grandTotal || order.totalAmount || order.subtotal || 0;
  
  // Extract payments array or fallback for legacy
  let payments = Array.isArray(order.payments) && order.payments.length > 0 ? [...order.payments] : [];
  if (payments.length === 0 && (order.paidAmount > 0 || order.advancePaid > 0)) {
    const amt = Number(order.paidAmount) || Number(order.advancePaid) || 0;
    const initialDate = order.orderDate ? (typeof order.orderDate === 'string' ? order.orderDate.slice(0, 10) : new Date(order.orderDate).toISOString().slice(0, 10)) : (order.createdAt ? (typeof order.createdAt === 'string' ? order.createdAt.slice(0, 10) : new Date(order.createdAt).toISOString().slice(0, 10)) : new Date().toISOString().slice(0, 10));
    payments = [{
      _id: 'legacy_init',
      amount: amt,
      mode: 'cash',
      type: order.paymentStatus === 'paid' ? 'final' : 'advance',
      date: initialDate,
      notes: 'Initial recorded payment',
      isLegacy: true,
    }];
  }

  const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const balanceDue = Math.max(0, grandTotal - totalPaid);

  const startEdit = (p) => {
    setEditingPaymentId(p._id);
    setIsAdding(false);
    setAmount(p.amount || '');
    setMode(p.mode || 'cash');
    setType(p.type || 'partial');
    const pDateStr = p.date ? (typeof p.date === 'string' ? p.date.slice(0, 10) : new Date(p.date).toISOString().slice(0, 10)) : new Date().toISOString().slice(0, 10);
    setDate(pDateStr);
    setNotes(p.notes || '');
    setError(null);
  };

  const startAdd = () => {
    setIsAdding(true);
    setEditingPaymentId(null);
    setAmount(balanceDue > 0 ? balanceDue : '');
    setMode('cash');
    setType(balanceDue > 0 ? 'final' : 'partial');
    setDate(new Date().toISOString().slice(0, 10));
    setNotes('');
    setError(null);
  };

  const cancelForm = () => {
    setIsAdding(false);
    setEditingPaymentId(null);
    setError(null);
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    setError(null);
    const numAmt = Number(amount);
    if (!numAmt || numAmt <= 0) {
      setError(language === 'hi' ? 'कृपया सही राशि दर्ज करें' : 'Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        amount: numAmt,
        mode,
        type,
        date: new Date(date).toISOString(),
        notes: notes.trim(),
      };

      if (editingPaymentId && editingPaymentId !== 'legacy_init') {
        await updateOrderPayment(order._id, editingPaymentId, payload);
        setSuccessMsg(language === 'hi' ? 'भुगतान तारीख व विवरण अपडेट किया गया!' : 'Payment date & details updated successfully!');
      } else {
        await addOrderPayment(order._id, payload);
        setSuccessMsg(language === 'hi' ? 'नया भुगतान दर्ज किया गया!' : 'New payment recorded successfully!');
      }

      setIsAdding(false);
      setEditingPaymentId(null);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save payment');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (paymentId) => {
    if (!paymentId || paymentId === 'legacy_init') return;
    const confirmMsg = language === 'hi'
      ? 'क्या आप वाकई इस भुगतान एंट्री को हटाना चाहते हैं?'
      : 'Are you sure you want to delete this payment record?';
    if (window.confirm(confirmMsg)) {
      setLoading(true);
      try {
        await deleteOrderPayment(order._id, paymentId);
        setSuccessMsg(language === 'hi' ? 'भुगतान रिकॉर्ड हटा दिया गया' : 'Payment record removed');
        setTimeout(() => setSuccessMsg(null), 3000);
      } catch (err) {
        setError(err.message || 'Failed to delete payment');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleQuickMarkPaid = async () => {
    if (balanceDue <= 0) return;
    setLoading(true);
    try {
      await markOrderPaid(order._id, {
        paymentDate: new Date().toISOString(),
        mode: 'cash',
        notes: 'Full balance settled',
      });
      setSuccessMsg(language === 'hi' ? 'ऑर्डर आज की तारीख में Paid मार्क हो गया!' : 'Order marked as Paid with today\'s timestamp!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to mark as paid');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="payment-history-modal animate-scale-in" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="payment-history-modal__header">
          <div className="payment-history-modal__title-group">
            <div className="payment-history-modal__icon">
              <CreditCard size={22} />
            </div>
            <div>
              <h2>{language === 'hi' ? 'भुगतान लेजर व तारीख संपादन' : 'Payment History & Date Adjustment'}</h2>
              <p>
                {order.customerName} &bull; {order.tokenNumber ? `Token #${order.tokenNumber}` : order.orderNumber}
              </p>
            </div>
          </div>
          <button className="modal__close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Financial Overview Banner */}
        <div className="payment-history-modal__banner">
          <div className="payment-history-modal__stat">
            <span className="payment-history-modal__stat-label">{t('grandTotal', 'Grand Total')}</span>
            <span className="payment-history-modal__stat-val">{formatAmount(grandTotal)}</span>
          </div>
          <div className="payment-history-modal__stat payment-history-modal__stat--success">
            <span className="payment-history-modal__stat-label">{t('paidAmount', 'Total Collected')}</span>
            <span className="payment-history-modal__stat-val">{formatAmount(totalPaid)}</span>
          </div>
          <div className={`payment-history-modal__stat ${balanceDue > 0 ? 'payment-history-modal__stat--danger' : 'payment-history-modal__stat--zero'}`}>
            <span className="payment-history-modal__stat-label">{t('balanceDue', 'Balance Due')}</span>
            <span className="payment-history-modal__stat-val">{formatAmount(balanceDue)}</span>
          </div>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="payment-history-modal__alert payment-history-modal__alert--error animate-fade-in">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="payment-history-modal__alert payment-history-modal__alert--success animate-fade-in">
            <CheckCircle size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Actions Row */}
        <div className="payment-history-modal__actions-bar">
          <span className="payment-history-modal__section-title">
            {language === 'hi' ? 'दर्ज भुगतान लेनदेन' : 'Recorded Payment Transactions'} ({payments.length})
          </span>
          <div className="payment-history-modal__btn-group">
            {balanceDue > 0 && (
              <button
                type="button"
                className="payment-history-modal__btn payment-history-modal__btn--mark-paid"
                onClick={handleQuickMarkPaid}
                disabled={loading}
              >
                <CheckCircle size={15} />
                {language === 'hi' ? 'आज Paid मार्क करें' : 'Mark Paid Today'}
              </button>
            )}
            <button
              type="button"
              className="payment-history-modal__btn payment-history-modal__btn--add"
              onClick={startAdd}
              disabled={loading}
            >
              <Plus size={15} />
              {language === 'hi' ? 'भुगतान जोड़ें' : 'Add Payment'}
            </button>
          </div>
        </div>

        {/* Inline Add / Edit Form */}
        {(isAdding || editingPaymentId) && (
          <form className="payment-history-modal__form animate-fade-in" onSubmit={handleSavePayment}>
            <h4>
              {editingPaymentId
                ? (language === 'hi' ? 'भुगतान तारीख व विवरण बदलें' : 'Edit Payment Date & Details')
                : (language === 'hi' ? 'नया भुगतान दर्ज करें' : 'Record New Payment')}
            </h4>
            <div className="payment-history-modal__form-grid">
              <div className="payment-history-modal__field">
                <label>{language === 'hi' ? 'भुगतान की तारीख' : 'Payment Received Date'}</label>
                <div className="payment-history-modal__input-with-icon">
                  <Calendar size={16} />
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="payment-history-modal__field">
                <label>{language === 'hi' ? 'राशि (₹)' : 'Amount (₹)'}</label>
                <div className="payment-history-modal__input-with-icon">
                  <IndianRupee size={16} />
                  <input
                    type="number"
                    min="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 500"
                  />
                </div>
              </div>

              <div className="payment-history-modal__field">
                <label>{language === 'hi' ? 'भुगतान माध्यम' : 'Payment Mode'}</label>
                <select value={mode} onChange={(e) => setMode(e.target.value)}>
                  <option value="cash">💵 Cash (कैश)</option>
                  <option value="upi">📱 UPI / QR (PhonePe/GPay)</option>
                  <option value="card">💳 Card (कार्ड)</option>
                  <option value="bankTransfer">🏦 Bank Transfer</option>
                </select>
              </div>

              <div className="payment-history-modal__field">
                <label>{language === 'hi' ? 'प्रकार' : 'Payment Type'}</label>
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="advance">{language === 'hi' ? 'एडवांस (Advance)' : 'Advance'}</option>
                  <option value="partial">{language === 'hi' ? 'आंशिक (Partial)' : 'Partial'}</option>
                  <option value="final">{language === 'hi' ? 'अंतिम / पूरा (Final/Full)' : 'Final / Full'}</option>
                </select>
              </div>

              <div className="payment-history-modal__field payment-history-modal__field--full">
                <label>{language === 'hi' ? 'नोट / विवरण' : 'Notes / Reference'}</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={language === 'hi' ? 'जैसे: गूगल पे से मिला, या डिलीवरी पर लिया' : 'e.g. Received via GPay on delivery'}
                />
              </div>
            </div>

            <div className="payment-history-modal__form-actions">
              <button
                type="button"
                className="payment-history-modal__form-btn payment-history-modal__form-btn--cancel"
                onClick={cancelForm}
                disabled={loading}
              >
                {t('cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                className="payment-history-modal__form-btn payment-history-modal__form-btn--save"
                disabled={loading}
              >
                {loading ? 'Saving...' : (language === 'hi' ? 'सेव करें' : 'Save Changes')}
              </button>
            </div>
          </form>
        )}

        {/* Payments List */}
        <div className="payment-history-modal__list">
          {payments.length === 0 ? (
            <div className="payment-history-modal__empty">
              <Clock size={32} />
              <p>{language === 'hi' ? 'अभी तक कोई भुगतान दर्ज नहीं हुआ है।' : 'No payment records found for this order.'}</p>
            </div>
          ) : (
            payments.map((p, idx) => {
              const pDateObj = p.date ? new Date(p.date) : null;
              const formattedDate = pDateObj && !isNaN(pDateObj.getTime())
                ? pDateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                : 'Date not set';

              const modeLabels = {
                cash: '💵 Cash',
                upi: '📱 UPI',
                card: '💳 Card',
                bankTransfer: '🏦 Bank',
              };

              return (
                <div key={p._id || idx} className="payment-history-item animate-fade-in">
                  <div className="payment-history-item__left">
                    <div className={`payment-history-item__badge payment-history-item__badge--${p.mode || 'cash'}`}>
                      {modeLabels[p.mode] || p.mode || 'Cash'}
                    </div>
                    <div className="payment-history-item__details">
                      <div className="payment-history-item__main-row">
                        <span className="payment-history-item__amount">
                          {formatAmount(p.amount)}
                        </span>
                        <span className="payment-history-item__type">
                          ({p.type || 'payment'})
                        </span>
                      </div>
                      <div className="payment-history-item__meta">
                        <span className="payment-history-item__date">
                          <Calendar size={13} /> {formattedDate}
                        </span>
                        {p.notes && (
                          <span className="payment-history-item__notes">
                            &bull; {p.notes}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="payment-history-item__actions">
                    <button
                      type="button"
                      className="payment-history-item__action-btn payment-history-item__action-btn--edit"
                      onClick={() => startEdit(p)}
                      title={language === 'hi' ? 'तारीख या राशि बदलें' : 'Edit Date / Amount'}
                    >
                      <Edit2 size={15} />
                      <span>{language === 'hi' ? 'तारीख बदलें' : 'Edit Date'}</span>
                    </button>
                    {!p.isLegacy && payments.length > 1 && (
                      <button
                        type="button"
                        className="payment-history-item__action-btn payment-history-item__action-btn--delete"
                        onClick={() => handleDelete(p._id)}
                        title="Delete this payment"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="payment-history-modal__footer">
          <button type="button" className="payment-history-modal__close-btn" onClick={onClose}>
            {t('close', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
}
