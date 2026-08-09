import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Search, Phone, MessageCircle, ArrowRight, IndianRupee, AlertCircle, ExternalLink, CheckCircle } from 'lucide-react';
import useCustomerStore from '../store/customerStore';
import useAppStore from '../store/appStore';
import usePrivacyStore from '../store/privacyStore';
import useLanguageStore from '../store/languageStore';
import useSettingsStore from '../store/settingsStore';
import { apiClient } from '../services/apiClient';
import './PendingPaymentsModal.css';

export default function PendingPaymentsModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { customers } = useCustomerStore();
  const { orders, markOrderPaid } = useAppStore();
  const { formatAmount } = usePrivacyStore();
  const { t } = useLanguageStore();
  const { shopInfo } = useSettingsStore();

  const [search, setSearch] = useState('');
  const [toastMsg, setToastMsg] = useState(null);

  // Get all customers with pending payments & their pending orders dynamically from live orders
  const pendingCustomers = useMemo(() => {
    const custMap = new Map();

    (orders || []).forEach(o => {
      if (['completed', 'delivered', 'cancelled'].includes(o.status)) return;
      const pAmt = o.pendingAmount || 0;
      if (pAmt <= 0) return;

      const custKey = o.customerId || o.customerName;
      if (!custKey) return;

      let existing = custMap.get(custKey);
      if (!existing) {
        const foundCust = customers.find(c => c._id === o.customerId || c.name?.toLowerCase() === o.customerName?.toLowerCase());
        existing = {
          _id: foundCust?._id || o.customerId || `cust_${Math.random().toString(36).substr(2, 6)}`,
          name: foundCust?.name || o.customerName || 'Customer',
          mobile: foundCust?.mobile || o.customerMobile || '+91 99999 99999',
          gender: foundCust?.gender || 'male',
          photoUrl: foundCust?.photoUrl || null,
          totalPending: 0,
          pendingOrders: [],
        };
        custMap.set(custKey, existing);
      }

      existing.totalPending += pAmt;
      existing.pendingOrders.push(o);
    });

    let list = Array.from(custMap.values());

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.mobile.includes(q));
    }

    return list.sort((a, b) => b.totalPending - a.totalPending);
  }, [customers, orders, search]);

  const grandTotalPending = useMemo(() => {
    return pendingCustomers.reduce((sum, c) => sum + c.totalPending, 0);
  }, [pendingCustomers]);

  if (!isOpen) return null;

  const handleWhatsAppReminder = async (cust, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const phone = cust.whatsapp || cust.mobile;
    const pAmt = cust.totalPending || 0;
    const sName = shopInfo?.name || 'DARJI';
    const sAddr = shopInfo?.address || '80/LIG 1ST New Housing Board Colony, Shahdol (M.P.)';
    const sPhone = shopInfo?.phone || '';

    let text = `🧾 *${sName.toUpperCase()} — PAYMENT REMINDER* 🧾\n\nNamaste *${cust.name} ji*! 🙏\nThis is a gentle reminder regarding your pending balance of *₹${pAmt.toLocaleString('en-IN')}* at *${sName}*.\n\nPlease clear the pending amount at your earliest convenience or upon pickup.\n\n📍 Address: ${sAddr}`;
    if (sPhone) {
      text += `\n📞 Contact: ${sPhone}`;
    }
    text += `\n\nThank you for your business!`;

    try {
      await apiClient.sendWhatsAppTest({ mobile: phone, text });
      setToastMsg(`📱 WhatsApp Payment Reminder sent to +91 ${phone}!`);
      setTimeout(() => setToastMsg(null), 3500);
    } catch (err) {
      console.error('Failed to send backend WhatsApp reminder:', err);
      setToastMsg(`❌ Failed to send WhatsApp reminder: ${err.message}`);
      setTimeout(() => setToastMsg(null), 3500);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="pending-modal animate-scale-in" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="pending-modal__header">
          <div className="pending-modal__title-group">
            <div className="pending-modal__icon">
              <AlertCircle size={22} />
            </div>
            <div>
              <h2>{t('pendingModalTitle', 'Pending Payments Overview')}</h2>
              <p>{pendingCustomers.length} {t('pendingModalSub', 'customer(s) with uncollected dues')}</p>
            </div>
          </div>
          <button className="modal__close" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Total Banner */}
        <div className="pending-modal__banner">
          <div>
            <span className="pending-modal__banner-label">{t('totalUncollected', 'TOTAL UNCOLLECTED DUES')}</span>
            <h3 className="pending-modal__banner-val">{formatAmount(grandTotalPending)}</h3>
          </div>
          <div className="pending-modal__search-box">
            <Search size={15} className="pending-modal__search-icon" />
            <input
              type="text"
              placeholder={t('searchPlaceholder', 'Search by customer name or phone...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pending-modal__search-input"
            />
            {search && <button onClick={() => setSearch('')} className="pending-modal__search-clear"><X size={12} /></button>}
          </div>
        </div>

        {/* Customer List Body */}
        <div className="pending-modal__body">
          {pendingCustomers.length === 0 ? (
            <div className="pending-modal__empty">
              <IndianRupee size={36} />
              <p>No pending payments found!</p>
              <span>{search ? 'Try adjusting your search query' : 'All customer accounts are fully paid up.'}</span>
            </div>
          ) : (
            <div className="pending-modal__list">
              {pendingCustomers.map((cust) => (
                <div key={cust._id} className="pending-card">
                  <div className="pending-card__main">
                    <div className="pending-card__user">
                      <div className="pending-card__avatar" data-gender={cust.gender}>
                        {cust.photoUrl ? (
                          <img src={cust.photoUrl} alt={cust.name} />
                        ) : (
                          cust.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <h4 className="pending-card__name">{cust.name}</h4>
                        <p className="pending-card__phone"><Phone size={11} /> {cust.mobile}</p>
                      </div>
                    </div>

                    <div className="pending-card__amount-group">
                      <span className="pending-card__amount-label">{t('pendingBalanceLabel', 'Pending Balance')}</span>
                      <span className="pending-card__amount">{formatAmount(cust.totalPending)}</span>
                    </div>

                    <div className="pending-card__actions">
                      <button
                        type="button"
                        className="pending-card__btn pending-card__btn--wa"
                        onClick={(e) => handleWhatsAppReminder(cust, e)}
                        title="Send WhatsApp Payment Reminder"
                      >
                        <MessageCircle size={14} /> {t('whatsappBtn', 'WhatsApp')}
                      </button>
                      <button
                        className="pending-card__btn pending-card__btn--profile"
                        onClick={() => {
                          onClose();
                          navigate(`/orders?search=${encodeURIComponent(cust.name)}`);
                        }}
                      >
                        {t('viewProfile', 'View Profile')} <ExternalLink size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Orders Breakdown */}
                  {cust.pendingOrders && cust.pendingOrders.length > 0 && (
                    <div className="pending-card__orders">
                      <span className="pending-card__orders-title">Pending Orders:</span>
                      <div className="pending-card__orders-grid">
                        {cust.pendingOrders.map((ord) => (
                          <div key={ord._id} className="pending-card__order-chip">
                            <span className="pending-card__order-num">Order #{ord.orderNumber}</span>
                            <span className="pending-card__order-items">
                              {ord.items?.map(i => i.name).join(', ') || 'Custom Garment'}
                            </span>
                            <span className="pending-card__order-bal">
                              Due: {formatAmount(ord.pendingAmount || (ord.subtotal - (ord.paidAmount || 0)))}
                            </span>
                            <button
                              type="button"
                              style={{ background: '#16a34a', color: '#fff', padding: '2px 8px', fontSize: '11px', borderRadius: '4px', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}
                              onClick={() => {
                                markOrderPaid(ord._id);
                                apiClient.markOrderAsPaid(ord._id).catch(() => {});
                              }}
                            >
                              <CheckCircle size={11} /> Mark Paid
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pending-modal__footer">
          <button type="button" className="modal__btn modal__btn--secondary" onClick={onClose}>Close</button>
        </div>
      </div>
      {toastMsg && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: '#16a34a',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          zIndex: 99999,
          fontSize: '14px',
          fontWeight: '600',
        }}>
          {toastMsg}
        </div>
      )}
    </div>
  );
}
