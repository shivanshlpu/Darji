import { useState, useMemo, useEffect } from 'react';
import {
  FileText, Search, Printer, Share2, Plus, Download, IndianRupee,
  CheckCircle, Clock, AlertCircle, X, ShieldCheck, Tag, Sparkles
} from 'lucide-react';
import useAppStore from '../store/appStore';
import useCustomerStore from '../store/customerStore';
import useSettingsStore from '../store/settingsStore';
import useLanguageStore from '../store/languageStore';
import { PAYMENT_STATUSES } from '../constants';
import { printInvoiceHTML, generateInvoicePDFBlob } from '../../../../shared/utils/generateInvoice';
import { InvoiceTemplate } from '../../../../shared/components/InvoiceTemplate';
import { apiClient } from '../services/apiClient';
import './Billing.css';

const formatINR = (a) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(a || 0);

export default function Billing() {
  const { orders, markOrderPaid, fetchOrdersFromDB } = useAppStore();
  const { customers, fetchCustomersFromDB } = useCustomerStore();
  const { shopInfo } = useSettingsStore();
  const { t } = useLanguageStore();

  useEffect(() => {
    fetchOrdersFromDB();
    fetchCustomersFromDB();
  }, []);

  const [search, setSearch] = useState('');
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState(null);
  const [billItems, setBillItems] = useState([]);
  const [discountType, setDiscountType] = useState('amount'); // 'amount' (₹) | 'percent' (%)
  const [discountValue, setDiscountValue] = useState(0);
  const [extraCharges, setExtraCharges] = useState(0);
  const [showThankYouModal, setShowThankYouModal] = useState(false);
  const [isSendingPdf, setIsSendingPdf] = useState(false);
  const [pdfMsg, setPdfMsg] = useState(null);

  const handleSelectOrder = (order) => {
    setSelectedInvoiceOrder(order._id);
    setBillItems(JSON.parse(JSON.stringify(order.items || [])));
    setDiscountType('amount');
    setDiscountValue(order.discount || 0);
    setExtraCharges(order.extraCharges || 0);
  };

  const handleBillItemChange = (index, field, val) => {
    const updated = [...billItems];
    updated[index][field] = field === 'price' || field === 'qty' ? (parseFloat(val) || 0) : val;
    setBillItems(updated);
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(o =>
      (o.orderNumber && o.orderNumber.toLowerCase().includes(search.toLowerCase())) ||
      (o.tokenNumber && o.tokenNumber.toLowerCase().includes(search.toLowerCase())) ||
      (o.customerName && o.customerName.toLowerCase().includes(search.toLowerCase()))
    );
  }, [orders, search]);

  const activeInvoice = useMemo(() => {
    if (!selectedInvoiceOrder) return null;
    const order = orders.find(o => o._id === selectedInvoiceOrder);
    if (!order) return null;

    const cust = customers.find(c => c._id === order.customerId || c.name === order.customerName) || {
      name: order.customerName,
      mobile: order.customerMobile || order.customerPhone || '',
      address: order.customerAddress || order.customer?.address || '',
    };

    const custAddr = order.customerAddress || order.customer?.address || cust.address || cust.city || '';

    const items = billItems.length > 0 ? billItems : (order.items || []);
    const subtotal = items.reduce((sum, item) => sum + (item.qty * (parseFloat(item.price) || 0)), 0);

    let discAmount = 0;
    if (discountType === 'percent') {
      discAmount = (subtotal * (parseFloat(discountValue) || 0)) / 100;
    } else {
      discAmount = parseFloat(discountValue) || 0;
    }

    const totalAfterDisc = Math.max(0, subtotal - discAmount + (parseFloat(extraCharges) || 0));
    const grandTotal = Math.round(totalAfterDisc);

    return {
      invoiceNumber: `INV-2026-${order.orderNumber.split('-')[2] || '000001'}`,
      orderNumber: order.orderNumber,
      tokenNumber: order.tokenNumber || 'T-100',
      orderDate: order.orderDate || order.createdAt,
      customer: {
        ...cust,
        address: custAddr,
      },
      items,
      subtotal,
      discountType,
      discountValue,
      discount: discAmount,
      extraCharges: parseFloat(extraCharges) || 0,
      grandTotal,
      paid: order.paidAmount || 0,
      remaining: Math.max(0, grandTotal - (order.paidAmount || 0)),
      paymentStatus: order.paymentStatus || 'unpaid',
    };
  }, [selectedInvoiceOrder, orders, customers, billItems, discountType, discountValue, extraCharges]);

  const activeInvoiceData = useMemo(() => {
    if (!activeInvoice) return null;
    return {
      invoiceNumber: activeInvoice.invoiceNumber,
      tokenNumber: activeInvoice.tokenNumber,
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      customer: {
        name: activeInvoice.customer.name,
        phone: activeInvoice.customer.mobile || activeInvoice.customer.phone || '',
        address: activeInvoice.customer.address || '',
      },
      items: activeInvoice.items,
      subtotal: activeInvoice.subtotal,
      discount: activeInvoice.discount,
      discountPercent: activeInvoice.discountType === 'percent' ? activeInvoice.discountValue : 0,
      extraCharges: activeInvoice.extraCharges,
      grandTotal: activeInvoice.grandTotal,
      paidAmount: activeInvoice.paid,
      balanceDue: activeInvoice.remaining,
      paymentStatus: activeInvoice.paymentStatus.toUpperCase(),
      shopName: shopInfo.name || 'Darji',
      tagline: shopInfo.tagline || 'Stitched to Perfection',
      address: shopInfo.address || '80/LIG 1ST New Housing Board Colony, Shahdol (M.P.) 484001',
      phone: shopInfo.phone || '+91 7828962210, +91 7000621972',
      email: shopInfo.email || 'darji.tailoring@gmail.com',
      logoUrl: shopInfo.logoUrl,
      signatureUrl: shopInfo.signatureUrl,
      reviewLink: shopInfo.reviewLink || '',
      reviewQrUrl: shopInfo.reviewQrUrl || null,
      termsAndConditions: shopInfo.termsAndConditions,
    };
  }, [activeInvoice, shopInfo]);

  return (
    <div className="billing">
      <div className="billing__header">
        <div>
          <h2>{t('billingHeading', 'Billing')}</h2>
          <p className="billing__subheading-text">{t('billingSubheading', 'Digital invoices & WhatsApp sharing')}</p>
        </div>
      </div>

      <div className="billing__container">
        <div className={`billing__orders-panel ${selectedInvoiceOrder ? 'billing__orders-panel--hidden-mobile' : ''}`}>
          <div className="billing__search">
            <Search size={16} className="billing__search-icon" />
            <input
              type="text"
              placeholder={t('searchOrderPlaceholder', 'Search order #, Token # or customer...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="billing__search-input"
            />
          </div>

          <div className="billing__order-list">
            {filteredOrders.map(o => (
              <div
                key={o._id}
                className={`billing__order-item ${selectedInvoiceOrder === o._id ? 'billing__order-item--active' : ''}`}
                onClick={() => handleSelectOrder(o)}
              >
                <div className="billing__order-top">
                  <span className="billing__order-num">{o.orderNumber} ({o.tokenNumber || 'T-100'})</span>
                  <span className={`billing__payment-badge billing__payment-badge--${PAYMENT_STATUSES[o.paymentStatus]?.color}`}>
                    {PAYMENT_STATUSES[o.paymentStatus]?.label || o.paymentStatus}
                  </span>
                </div>
                <div className="billing__order-bottom">
                  <span className="billing__order-cust">{o.customerName}</span>
                  <span className="billing__order-amt">{formatINR(o.grandTotal || o.subtotal || (o.items ? o.items.reduce((s, i) => s + (i.qty * i.price), 0) : 0))}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="billing__preview-panel">
          {!activeInvoice ? (
            <div className="billing__empty-state">
              <FileText size={48} />
              <h3>{t('selectOrderTitle', 'Select an Order to Generate Invoice')}</h3>
              <p>{t('selectOrderSub', 'Choose an order from the list to calculate discounts, and print or share the invoice PDF.')}</p>
            </div>
          ) : (
            <div className="billing__invoice-card animate-fade-in">
              {/* Mobile Back Button */}
              <button
                type="button"
                className="billing__mobile-back-btn"
                onClick={() => setSelectedInvoiceOrder(null)}
              >
                ← {t('backToOrders', 'Select Different Order')}
              </button>

              <div className="billing__actions-bar">
                <div className="billing__actions-left">
                  <span className="billing__inv-num">{activeInvoice.invoiceNumber}</span>
                  <span className="billing__token-pill"><Tag size={12} /> Token #{activeInvoice.tokenNumber}</span>
                </div>
                <div className="billing__actions-right">
                  <button
                    type="button"
                    className="billing__action-btn"
                    onClick={() => {
                      if (activeInvoiceData) {
                        printInvoiceHTML(activeInvoiceData);
                      }
                    }}
                  >
                    <Printer size={13} /> {t('printPdfBtn', 'Print / Save PDF')}
                  </button>

                  <button
                    type="button"
                    className="billing__action-btn billing__action-btn--whatsapp"
                    disabled={isSendingPdf}
                    onClick={async () => {
                      if (!activeInvoice) return;
                      setIsSendingPdf(true);
                      setPdfMsg(null);
                      try {
                        const targetMobile = activeInvoice.customer.mobile || activeInvoice.customer.phone || '';
                        if (!targetMobile) {
                          setPdfMsg({ success: false, text: '❌ Customer mobile number is missing for this invoice!' });
                          setIsSendingPdf(false);
                          return;
                        }
                        const payloadData = activeInvoiceData || activeInvoice;

                        setPdfMsg({ success: true, text: `🚀 Sending PDF Invoice to +91 ${targetMobile}...` });
                        setShowThankYouModal(true);

                        apiClient.sendWhatsAppInvoicePDF({
                          order: payloadData,
                          mobile: targetMobile
                        }).then((res) => {
                          setPdfMsg({ success: true, text: res.message || `PDF Invoice sent to ${targetMobile}` });
                        }).catch((err) => {
                          setPdfMsg({ success: false, text: err.message || 'Failed to send PDF on WhatsApp' });
                        });
                      } catch (err) {
                        setPdfMsg({ success: false, text: err.message || 'Failed to send PDF on WhatsApp' });
                      } finally {
                        setIsSendingPdf(false);
                      }
                    }}
                  >
                    <Share2 size={13} /> {isSendingPdf ? 'Sending...' : 'Send WhatsApp PDF'}
                  </button>

                  {activeInvoice.remaining > 0 && (
                    <button
                      type="button"
                      className="billing__action-btn billing__action-btn--paid"
                      onClick={() => {
                        if (activeInvoice.orderId) {
                          markOrderPaid(activeInvoice.orderId);
                          apiClient.markOrderAsPaid(activeInvoice.orderId).catch(() => {});
                          setActiveInvoice(prev => prev ? ({ ...prev, paid: prev.grandTotal, remaining: 0, paymentStatus: 'paid' }) : null);
                        }
                      }}
                    >
                      <CheckCircle size={13} /> Mark Paid
                    </button>
                  )}

                  {activeInvoice.remaining > 0 && (
                    <button
                      type="button"
                      className="billing__action-btn billing__action-btn--reminder"
                      onClick={async () => {
                        const targetMobile = activeInvoice.customer.mobile || activeInvoice.customer.phone || '';
                        if (!targetMobile) {
                          setPdfMsg({ success: false, text: '❌ Customer mobile missing!' });
                          return;
                        }
                        try {
                          setPdfMsg({ success: true, text: `🔔 Sending payment reminder to ${targetMobile}...` });
                          const res = await apiClient.sendPaymentReminderWhatsApp({
                            order: activeInvoiceData || activeInvoice,
                            orderId: activeInvoice.orderNumber,
                            mobile: targetMobile
                          });
                          if (res.success) {
                            setPdfMsg({ success: true, text: res.message || `Payment reminder sent to ${targetMobile}!` });
                          } else {
                            setPdfMsg({ success: false, text: res.error || 'Failed to send payment reminder' });
                          }
                        } catch (e) {
                          setPdfMsg({ success: false, text: e.message || 'Failed to send payment reminder' });
                        }
                      }}
                    >
                      <Clock size={13} /> WA Reminder
                    </button>
                  )}
                </div>
              </div>

              {pdfMsg && (
                <div style={{ margin: '10px 0', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, background: pdfMsg.success ? '#dcfce7' : '#fee2e2', color: pdfMsg.success ? '#166534' : '#991b1b', border: `1px solid ${pdfMsg.success ? '#86efac' : '#fca5a5'}` }}>
                  {pdfMsg.success ? `✅ ${pdfMsg.text}` : `❌ ${pdfMsg.text}`}
                </div>
              )}

              {/* Per-Dress Rate & Quantity Editor */}
              <div className="orders__bill-items-editor" style={{ marginBottom: '12px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-navy-700)', marginBottom: '8px' }}>
                  ✏️ Edit Garment Prices / Rates for this Bill:
                </h4>
                {billItems.map((item, idx) => (
                  <div key={idx} className="orders__bill-item-row">
                    <span className="orders__bill-item-name">{item.name} ({item.category})</span>
                    <div className="orders__bill-item-inputs">
                      <label>Qty:</label>
                      <input
                        type="number"
                        min="1"
                        style={{ width: '60px' }}
                        value={item.qty}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handleBillItemChange(idx, 'qty', e.target.value)}
                      />
                      <label>Rate (₹):</label>
                      <input
                        type="number"
                        style={{ width: '100px' }}
                        value={item.price === 0 ? '' : item.price}
                        placeholder="0"
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handleBillItemChange(idx, 'price', e.target.value === '' ? 0 : e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Editable Modifiers */}
              <div className="billing__modifiers">
                <div className="billing__mod-field">
                  <label>Discount Mode</label>
                  <select value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
                    <option value="amount">Flat Amount (₹)</option>
                    <option value="percent">Percentage (%)</option>
                  </select>
                </div>
                <div className="billing__mod-field">
                  <label>Discount {discountType === 'percent' ? '(%)' : '(₹)'}</label>
                  <input
                    type="number"
                    value={discountValue === 0 ? '' : discountValue}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setDiscountValue(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                    min="0"
                  />
                </div>
                <div className="billing__mod-field">
                  <label>Extra Charges (₹)</label>
                  <input
                    type="number"
                    value={extraCharges === 0 ? '' : extraCharges}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setExtraCharges(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                    min="0"
                  />
                </div>
              </div>

              {/* Target Invoice Template Workspace Preview */}
              {activeInvoiceData && (
                <div style={{ marginTop: '16px' }}>
                  <InvoiceTemplate invoice={activeInvoiceData} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* WhatsApp Thank You Graphic & Receipt Modal */}
      {showThankYouModal && activeInvoice && (
        <div className="modal-overlay" onClick={() => setShowThankYouModal(false)}>
          <div className="modal animate-scale-in" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', textAlign: 'center' }}>
            <div className="modal__header" style={{ justifyContent: 'center' }}>
              <h2><Sparkles size={20} color="#D97706" /> Order Completed & WhatsApp Sent</h2>
              <button className="modal__close" onClick={() => setShowThankYouModal(false)}><X size={20} /></button>
            </div>

            <div className="modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
              <div className="billing__thankyou-card">
                <div className="billing__thankyou-badge">✨ THANK YOU FOR YOUR BUSINESS! ✨</div>
                <h3>{shopInfo.name}</h3>
                <p style={{ fontSize: '13px', color: '#64748B' }}>Order Token #{activeInvoice.tokenNumber}</p>
                <div style={{ margin: '16px 0', padding: '12px', background: '#F8FAFC', borderRadius: '8px', width: '100%' }}>
                  <p style={{ fontWeight: 700, fontSize: '16px', color: '#1E293B' }}>Total Paid: {formatINR(activeInvoice.grandTotal)}</p>
                  <p style={{ fontSize: '12px', color: '#166534', fontWeight: 600 }}>Status: Full Payment Received (Balance ₹0)</p>
                </div>
                <p style={{ fontSize: '12px', color: '#475569' }}>
                  📱 Text bill & PDF link have been automatically dispatched to <strong>{activeInvoice.customer.mobile}</strong>.
                </p>
              </div>

              <div className="modal__actions" style={{ width: '100%', justifyContent: 'center' }}>
                <button type="button" className="modal__btn modal__btn--primary" onClick={() => setShowThankYouModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
