import { useState, useMemo, useEffect } from 'react';
import {
  FileText, Search, Printer, Share2, Plus, Download, IndianRupee,
  CheckCircle, Clock, AlertCircle, X, ShieldCheck, Tag, Sparkles, Save, Trash2,
  User, Phone, MapPin, CreditCard, RotateCcw
} from 'lucide-react';
import useAppStore from '../store/appStore';
import useCustomerStore from '../store/customerStore';
import useSettingsStore from '../store/settingsStore';
import useLanguageStore from '../store/languageStore';
import { PAYMENT_STATUSES, PAYMENT_MODES, GARMENT_CATEGORIES, COUNTRY_PREFIXES } from '../constants';
import { printInvoiceHTML, generateInvoicePDFBlob } from '../../../../shared/utils/generateInvoice';
import { InvoiceTemplate } from '../../../../shared/components/InvoiceTemplate';
import { apiClient } from '../services/apiClient';
import './Billing.css';

const formatINR = (a) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(a || 0);

const DRAFT_STORAGE_KEY = 'darji_direct_bill_draft';

export default function Billing() {
  const { orders, addOrder, deleteOrder, markOrderPaid, updateOrderBill, fetchOrdersFromDB } = useAppStore();
  const { customers, addCustomer, fetchCustomersFromDB } = useCustomerStore();
  const { shopInfo } = useSettingsStore();
  const { t, language } = useLanguageStore();

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
  const [isSavingBill, setIsSavingBill] = useState(false);
  const [pdfMsg, setPdfMsg] = useState(null);

  // ── DIRECT BILLING STATE (CREATE BILL WITHOUT ORDER FIRST) ──
  const [showDirectBillModal, setShowDirectBillModal] = useState(false);
  const [directCustMode, setDirectCustMode] = useState('new'); // 'new' | 'existing'
  const [directSelectedCustId, setDirectSelectedCustId] = useState('');
  const [directCustSearch, setDirectCustSearch] = useState('');
  const [showDirectCustDropdown, setShowDirectCustDropdown] = useState(false);
  const [directCustName, setDirectCustName] = useState('');
  const [directCustCountryCode, setDirectCustCountryCode] = useState('+91');
  const [directCustPhone, setDirectCustPhone] = useState('');
  const [directCustAddress, setDirectCustAddress] = useState('');
  const [directBillItems, setDirectBillItems] = useState([
    { name: 'Top Wear', category: 'topWear', qty: 1, price: 1200 }
  ]);
  const [directDiscountType, setDirectDiscountType] = useState('amount'); // 'amount' | 'percent'
  const [directDiscountValue, setDirectDiscountValue] = useState(0);
  const [directExtraCharges, setDirectExtraCharges] = useState(0);
  const [directPaymentStatus, setDirectPaymentStatus] = useState('paid'); // 'paid' | 'unpaid' | 'partial'
  const [directPaymentMode, setDirectPaymentMode] = useState('cash');
  const [directPaidAmount, setDirectPaidAmount] = useState('');
  const [isSavingDirectBill, setIsSavingDirectBill] = useState(false);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);

  // Load saved draft on initial mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed && (parsed.directCustName || (parsed.directBillItems && parsed.directBillItems.length > 0))) {
          setDirectCustName(parsed.directCustName || '');
          setDirectCustCountryCode(parsed.directCustCountryCode || '+91');
          setDirectCustPhone(parsed.directCustPhone || '');
          setDirectCustAddress(parsed.directCustAddress || '');
          if (Array.isArray(parsed.directBillItems) && parsed.directBillItems.length > 0) {
            setDirectBillItems(parsed.directBillItems);
          }
          setDirectDiscountType(parsed.directDiscountType || 'amount');
          setDirectDiscountValue(parsed.directDiscountValue || 0);
          setDirectExtraCharges(parsed.directExtraCharges || 0);
          setDirectPaymentStatus(parsed.directPaymentStatus || 'paid');
          setDirectPaymentMode(parsed.directPaymentMode || 'cash');
          setDirectPaidAmount(parsed.directPaidAmount || '');
          setHasRestoredDraft(true);
        }
      }
    } catch (e) {
      console.warn('Draft load warning:', e.message);
    }
  }, []);

  // Auto-persist draft to localStorage on any direct bill form change
  useEffect(() => {
    if (!showDirectBillModal) return;
    try {
      const draftPayload = {
        directCustName,
        directCustCountryCode,
        directCustPhone,
        directCustAddress,
        directBillItems,
        directDiscountType,
        directDiscountValue,
        directExtraCharges,
        directPaymentStatus,
        directPaymentMode,
        directPaidAmount,
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftPayload));
    } catch (e) {
      // Ignore quota errors
    }
  }, [
    showDirectBillModal,
    directCustName,
    directCustCountryCode,
    directCustPhone,
    directCustAddress,
    directBillItems,
    directDiscountType,
    directDiscountValue,
    directExtraCharges,
    directPaymentStatus,
    directPaymentMode,
    directPaidAmount,
  ]);

  const clearDirectBillDraft = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (e) {}
    setDirectCustName('');
    setDirectCustCountryCode('+91');
    setDirectCustPhone('');
    setDirectCustAddress('');
    setDirectBillItems([{ name: 'Top Wear', category: 'topWear', qty: 1, price: 1200 }]);
    setDirectDiscountType('amount');
    setDirectDiscountValue(0);
    setDirectExtraCharges(0);
    setDirectPaymentStatus('paid');
    setDirectPaymentMode('cash');
    setDirectPaidAmount('');
    setHasRestoredDraft(false);
  };

  const handleSelectOrder = (order) => {
    setSelectedInvoiceOrder(order._id);
    setBillItems(JSON.parse(JSON.stringify(order.items || [])));
    setDiscountType(order.discountType || 'amount');
    setDiscountValue(order.discountValue !== undefined ? order.discountValue : (order.discount || 0));
    setExtraCharges(order.extraCharges || 0);
  };

  const handleBillItemChange = (index, field, val) => {
    const updated = [...billItems];
    updated[index][field] = field === 'price' || field === 'qty' ? (parseFloat(val) || 0) : val;
    setBillItems(updated);
  };

  const filteredOrders = useMemo(() => {
    const q = String(search || '').toLowerCase();
    return orders.filter(o =>
      (o.orderNumber && typeof o.orderNumber === 'string' && o.orderNumber.toLowerCase().includes(q)) ||
      (o.tokenNumber && typeof o.tokenNumber === 'string' && o.tokenNumber.toLowerCase().includes(q)) ||
      (o.customerName && typeof o.customerName === 'string' && o.customerName.toLowerCase().includes(q))
    );
  }, [orders, search]);

  const activeInvoice = useMemo(() => {
    if (!selectedInvoiceOrder) return null;
    const order = orders.find(o => o._id === selectedInvoiceOrder || o.orderNumber === selectedInvoiceOrder);
    if (!order) return null;

    const cust = customers.find(c => c._id === order.customerId || c.name === order.customerName) || {
      name: order.customerName,
      mobile: order.customerMobile || order.customerPhone || '',
      address: order.customerAddress || order.customer?.address || '',
    };

    const custAddr = order.customerAddress || order.customer?.address || cust.address || cust.city || '';

    const items = billItems.length > 0 ? billItems : (order.items || []);
    const subtotal = Math.round(items.reduce((sum, item) => sum + ((Number(item.qty) || 1) * (parseFloat(item.price) || 0)), 0));

    let discAmount = 0;
    if (discountType === 'percent') {
      discAmount = Math.round((subtotal * (parseFloat(discountValue) || 0)) / 100);
    } else {
      discAmount = Math.round(parseFloat(discountValue) || 0);
    }

    const totalAfterDisc = Math.max(0, subtotal - discAmount + (Math.round(parseFloat(extraCharges)) || 0));
    const grandTotal = Math.round(totalAfterDisc);

    return {
      orderId: order._id,
      invoiceNumber: `INV-2026-${(order.orderNumber || '').split('-')[2] || (order._id ? order._id.toString().slice(-6).toUpperCase() : '000001')}`,
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
      extraCharges: Math.round(parseFloat(extraCharges) || 0),
      grandTotal,
      paid: Math.round(order.paidAmount !== undefined ? order.paidAmount : (order.advancePaid || 0)),
      remaining: Math.max(0, grandTotal - (Math.round(order.paidAmount !== undefined ? order.paidAmount : (order.advancePaid || 0)))),
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
      phone: shopInfo.phone || '+919479487828, +917000621972',
      email: shopInfo.email || 'darji.tailoring@gmail.com',
      logoUrl: shopInfo.logoUrl,
      signatureUrl: shopInfo.signatureUrl,
      reviewLink: shopInfo.reviewLink || '',
      reviewQrUrl: shopInfo.reviewQrUrl || null,
      termsAndConditions: shopInfo.termsAndConditions,
    };
  }, [activeInvoice, shopInfo]);

  // ── DIRECT BILL COMPUTED TOTALS WITH WHOLE INTEGER ROUNDING ──
  const directSubtotal = useMemo(() => {
    return Math.round(directBillItems.reduce((sum, it) => sum + ((Number(it.qty) || 1) * (parseFloat(it.price) || 0)), 0));
  }, [directBillItems]);

  const directDiscountAmount = useMemo(() => {
    if (directDiscountType === 'percent') {
      return Math.round((directSubtotal * (parseFloat(directDiscountValue) || 0)) / 100);
    }
    return Math.round(parseFloat(directDiscountValue) || 0);
  }, [directSubtotal, directDiscountType, directDiscountValue]);

  const directGrandTotal = useMemo(() => {
    const extra = Math.round(parseFloat(directExtraCharges) || 0);
    return Math.max(0, Math.round(directSubtotal - directDiscountAmount + extra));
  }, [directSubtotal, directDiscountAmount, directExtraCharges]);

  const directEffectivePaid = useMemo(() => {
    if (directPaymentStatus === 'paid') return directGrandTotal;
    if (directPaymentStatus === 'unpaid') return 0;
    const manualVal = Math.round(parseFloat(directPaidAmount) || 0);
    return Math.min(directGrandTotal, Math.max(0, manualVal));
  }, [directPaymentStatus, directGrandTotal, directPaidAmount]);

  const directBalanceDue = useMemo(() => {
    return Math.max(0, directGrandTotal - directEffectivePaid);
  }, [directGrandTotal, directEffectivePaid]);

  const filteredDirectCustomers = useMemo(() => {
    if (!directCustSearch) return customers;
    const q = String(directCustSearch || '').toLowerCase();
    return (customers || []).filter(c =>
      (c.name && typeof c.name === 'string' && c.name.toLowerCase().includes(q)) ||
      (c.mobile && String(c.mobile).includes(q)) ||
      (c.address && typeof c.address === 'string' && c.address.toLowerCase().includes(q))
    );
  }, [customers, directCustSearch]);

  // ── SAVE DIRECT BILL TO MONGODB & SALES RECORDS ──
  const handleSaveDirectBill = async (e, sendWhatsApp = false) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!directCustName.trim()) {
      alert('Please enter customer name!');
      return;
    }

    if (!directCustPhone.trim()) {
      alert('Please enter customer phone number!');
      return;
    }

    if (directBillItems.length === 0 || directBillItems.every(i => !i.name.trim())) {
      alert('Please add at least one item to the bill!');
      return;
    }

    setIsSavingDirectBill(true);
    setPdfMsg(null);

    try {
      let custId = directSelectedCustId;
      const formattedPhone = directCustPhone.trim().startsWith('+')
        ? directCustPhone.trim()
        : `${directCustCountryCode} ${directCustPhone.trim()}`;

      if (directCustMode === 'existing' && directSelectedCustId) {
        const found = customers.find(c => c._id === directSelectedCustId);
        if (found) {
          custId = found._id;
          if (directCustAddress.trim() && found.address !== directCustAddress.trim()) {
            found.address = directCustAddress.trim();
          }
        }
      } else {
        // Create new Customer record
        const newCustObj = {
          _id: 'cust_' + Math.random().toString(36).substr(2, 9),
          name: directCustName.trim(),
          mobile: formattedPhone,
          address: directCustAddress.trim(),
          gender: 'male',
          tags: ['Direct-Billing'],
        };
        addCustomer(newCustObj);
        custId = newCustObj._id;
      }

      // Generate collision-free sequence numbers
      let maxTokenNum = 100;
      let maxOrderSeq = 0;

      (orders || []).forEach(o => {
        if (o.tokenNumber) {
          const match = o.tokenNumber.match(/\d+/);
          if (match) {
            const val = parseInt(match[0], 10);
            if (!isNaN(val) && val > maxTokenNum) maxTokenNum = val;
          }
        }
        if (o.orderNumber) {
          const match = o.orderNumber.match(/\d+/);
          if (match) {
            const val = parseInt(match[0], 10);
            if (!isNaN(val) && val > maxOrderSeq) maxOrderSeq = val;
          }
        }
      });

      const newOrderNumber = `ORD-2026-${String(maxOrderSeq + 1).padStart(6, '0')}`;
      const newTokenNumber = `T-${maxTokenNum + 1}`;

      const sanitizedItems = directBillItems.map(it => ({
        name: it.name.trim() || 'Custom Garment',
        category: it.category || 'topWear',
        qty: Number(it.qty) || 1,
        price: Number(it.price) || 0,
        notes: it.notes || '',
        measurements: {},
      }));

      const newDirectOrder = {
        orderNumber: newOrderNumber,
        tokenNumber: newTokenNumber,
        customerId: custId,
        customerName: directCustName.trim(),
        customerMobile: formattedPhone,
        customerAddress: directCustAddress.trim(),
        orderDate: new Date().toISOString(),
        deliveryDate: new Date().toISOString(),
        priority: 'normal',
        status: directBalanceDue <= 0 ? 'completed' : 'ready',
        items: sanitizedItems,
        subtotal: directSubtotal,
        discount: directDiscountAmount,
        discountType: directDiscountType,
        discountValue: Number(directDiscountValue) || 0,
        extraCharges: Math.round(parseFloat(directExtraCharges) || 0),
        grandTotal: directGrandTotal,
        totalAmount: directGrandTotal,
        paidAmount: directEffectivePaid,
        advancePaid: directEffectivePaid,
        pendingAmount: directBalanceDue,
        balanceDue: directBalanceDue,
        paymentStatus: directPaymentStatus,
        notes: `Direct Sale Invoice (${directPaymentMode.toUpperCase()})`,
        timeline: [{ status: directBalanceDue <= 0 ? 'completed' : 'ready', timestamp: new Date().toISOString(), updatedBy: 'Admin' }],
        createdAt: new Date().toISOString(),
      };

      const saved = await addOrder(newDirectOrder);
      const targetOrderObj = saved || newDirectOrder;

      // Select newly saved bill and sync modifier state immediately
      handleSelectOrder(targetOrderObj);

      await fetchOrdersFromDB();
      await fetchCustomersFromDB();

      // Clear draft
      clearDirectBillDraft();
      setShowDirectBillModal(false);

      if (sendWhatsApp) {
        setPdfMsg({ success: true, text: `🚀 Sending PDF Invoice to ${formattedPhone}...` });
        const payloadData = {
          invoiceNumber: `INV-2026-${(newOrderNumber || '').split('-')[2] || '000001'}`,
          tokenNumber: newTokenNumber,
          date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
          customer: {
            name: directCustName.trim(),
            phone: formattedPhone,
            address: directCustAddress.trim(),
          },
          items: sanitizedItems,
          subtotal: directSubtotal,
          discount: directDiscountAmount,
          discountPercent: directDiscountType === 'percent' ? directDiscountValue : 0,
          extraCharges: Math.round(parseFloat(directExtraCharges) || 0),
          grandTotal: directGrandTotal,
          paidAmount: directEffectivePaid,
          balanceDue: directBalanceDue,
          paymentStatus: directPaymentStatus.toUpperCase(),
          shopName: shopInfo.name || 'Darji',
          tagline: shopInfo.tagline || 'Stitched to Perfection',
          address: shopInfo.address || '80/LIG 1ST New Housing Board Colony, Shahdol (M.P.) 484001',
          phone: shopInfo.phone || '+919479487828, +917000621972',
          email: shopInfo.email || 'darjithetailoringshop@gmail.com',
          logoUrl: shopInfo.logoUrl,
          signatureUrl: shopInfo.signatureUrl,
          reviewLink: shopInfo.reviewLink || '',
          reviewQrUrl: shopInfo.reviewQrUrl || null,
          termsAndConditions: shopInfo.termsAndConditions,
        };

        try {
          const res = await apiClient.sendWhatsAppInvoicePDF({
            order: payloadData,
            mobile: formattedPhone
          });
          setPdfMsg({ success: true, text: res.message || `Direct Bill #${newOrderNumber} saved & WhatsApp sent to ${formattedPhone}!` });
        } catch (err) {
          setPdfMsg({ success: false, text: `Bill saved, but WhatsApp failed: ${err.message}` });
        }
      } else {
        setPdfMsg({
          success: true,
          text: `Direct Bill #${newOrderNumber} (${newTokenNumber}) saved to database and added to sales records! Status: ${directPaymentStatus.toUpperCase()}`
        });
      }
    } catch (err) {
      console.error('[Save Direct Bill Error]:', err);
      alert(`⚠️ Could not save bill: ${err.message || 'Server error'}`);
    } finally {
      setIsSavingDirectBill(false);
    }
  };

  return (
    <div className="billing">
      <div className="billing__header">
        <div>
          <h2>{t('billingHeading', 'Billing')}</h2>
          <p className="billing__subheading-text">{t('billingSubheading', 'Digital invoices, direct billing & WhatsApp sharing')}</p>
        </div>

        <button
          type="button"
          className="billing__direct-btn animate-scale-in"
          onClick={() => setShowDirectBillModal(true)}
        >
          <Plus size={16} /> + Create Direct Bill
        </button>
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
            {filteredOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94a3b8' }}>
                <p style={{ fontSize: '13px', marginBottom: '12px' }}>No bills found.</p>
                <button
                  type="button"
                  className="modal__btn modal__btn--primary"
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                  onClick={() => setShowDirectBillModal(true)}
                >
                  <Plus size={13} /> Create First Direct Bill
                </button>
              </div>
            ) : (
              filteredOrders.map(o => (
                <div
                  key={o._id || o.orderNumber}
                  className={`billing__order-item ${selectedInvoiceOrder === (o._id || o.orderNumber) ? 'billing__order-item--active' : ''}`}
                  onClick={() => handleSelectOrder(o)}
                >
                  <div className="billing__order-top">
                    <span className="billing__order-num">{o.orderNumber} ({o.tokenNumber || 'T-100'})</span>
                    <span className={`billing__payment-badge billing__payment-badge--${PAYMENT_STATUSES[o.paymentStatus]?.color || 'warning'}`}>
                      {PAYMENT_STATUSES[o.paymentStatus]?.label || (o.paymentStatus || 'unpaid').toUpperCase()}
                    </span>
                  </div>
                  <div className="billing__order-bottom">
                    <span className="billing__order-cust">{o.customerName}</span>
                    <span className="billing__order-amt">{formatINR(o.grandTotal || o.totalAmount || o.subtotal || 0)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="billing__preview-panel">
          {!activeInvoice ? (
            <div className="billing__empty-state">
              <FileText size={48} />
              <h3>{t('selectOrderTitle', 'Select an Invoice or Create a Direct Bill')}</h3>
              <p>{t('selectOrderSub', 'Choose an invoice from the left panel to calculate discounts, print, or click "+ Create Direct Bill" above to generate a bill directly without an order.')}</p>
              <button
                type="button"
                className="billing__direct-btn"
                style={{ marginTop: '16px' }}
                onClick={() => setShowDirectBillModal(true)}
              >
                <Plus size={16} /> + Create Direct Bill
              </button>
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
                    className="billing__action-btn billing__action-btn--save"
                    disabled={isSavingBill}
                    onClick={async () => {
                      if (!selectedInvoiceOrder || !activeInvoice) return;
                      setIsSavingBill(true);
                      setPdfMsg(null);
                      try {
                        await updateOrderBill(selectedInvoiceOrder, {
                          items: activeInvoice.items,
                          subtotal: activeInvoice.subtotal,
                          discount: activeInvoice.discount,
                          discountType: activeInvoice.discountType,
                          discountValue: activeInvoice.discountValue,
                          extraCharges: activeInvoice.extraCharges,
                          paidAmount: activeInvoice.paid,
                        });
                        setPdfMsg({ success: true, text: 'Bill changes & updated discount saved to database successfully!' });
                      } catch (err) {
                        setPdfMsg({ success: false, text: err.message || 'Failed to save bill changes' });
                      } finally {
                        setIsSavingBill(false);
                      }
                    }}
                  >
                    <Save size={13} /> {isSavingBill ? 'Saving...' : 'Save Bill'}
                  </button>

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
                          return;
                        }
                        const payloadData = activeInvoiceData || activeInvoice;

                        setPdfMsg({ success: true, text: `🚀 Sending PDF Invoice to ${targetMobile}...` });

                        const res = await apiClient.sendWhatsAppInvoicePDF({
                          order: payloadData,
                          mobile: targetMobile
                        });
                        setPdfMsg({ success: true, text: res.message || `PDF Invoice sent to ${targetMobile}` });
                        setShowThankYouModal(true);
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

                  <button
                    type="button"
                    className="billing__action-btn"
                    style={{ background: '#fee2e2', color: '#dc2626', borderColor: '#fca5a5' }}
                    onClick={async () => {
                      if (!selectedInvoiceOrder) return;
                      const order = orders.find(o => o._id === selectedInvoiceOrder || o.orderNumber === selectedInvoiceOrder);
                      if (!order) return;
                      const tokenOrNum = order.tokenNumber ? `Token #${order.tokenNumber}` : order.orderNumber;
                      if (window.confirm(`Are you sure you want to delete ${tokenOrNum} (${order.customerName}) from your database? Only this specific bill will be deleted.`)) {
                        await deleteOrder(order._id);
                        setSelectedInvoiceOrder(null);
                      }
                    }}
                    title="Delete this order from database"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
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

              {/* Editable Modifiers with clean whole-number rounding */}
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

      {/* ── DIRECT BILLING MODAL (GENERATE BILL DIRECTLY) ── */}
      {showDirectBillModal && (
        <div className="modal-overlay" onClick={() => setShowDirectBillModal(false)}>
          <div
            className="modal billing__direct-modal animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal__header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <FileText size={20} color="#D97706" style={{ minWidth: '20px' }} />
                <h2 style={{ margin: 0, fontSize: '17px', lineHeight: '1.3' }}>
                  {language === 'hi' ? 'सीधा बिल बनाएं' : 'Create Direct Bill'}
                </h2>
              </div>
              <button className="modal__close" onClick={() => setShowDirectBillModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveDirectBill} className="modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px' }}>
              {/* Customer Mode Tabs */}
              <div className="billing__direct-cust-tabs">
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className={`modal__btn ${directCustMode === 'new' ? 'modal__btn--primary' : 'modal__btn--secondary'}`}
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                    onClick={() => {
                      setDirectCustMode('new');
                      setDirectSelectedCustId('');
                      setDirectCustSearch('');
                    }}
                  >
                    <User size={13} /> {language === 'hi' ? 'नया ग्राहक (Walk-in)' : 'New Customer (Walk-in)'}
                  </button>
                  <button
                    type="button"
                    className={`modal__btn ${directCustMode === 'existing' ? 'modal__btn--primary' : 'modal__btn--secondary'}`}
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                    onClick={() => setDirectCustMode('existing')}
                  >
                    🔍 {language === 'hi' ? 'मौजूदा ग्राहक' : 'Select Customer'}
                  </button>
                </div>

                {hasRestoredDraft && (
                  <button
                    type="button"
                    onClick={clearDirectBillDraft}
                    style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <RotateCcw size={11} /> Clear Draft
                  </button>
                )}
              </div>

              {/* Customer Details Inputs */}
              {directCustMode === 'existing' ? (
                <div style={{ position: 'relative' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-navy-700)', display: 'block', marginBottom: '4px' }}>
                    Search & Select Existing Customer:
                  </label>
                  <input
                    type="text"
                    placeholder="Search by customer name or phone number..."
                    value={directCustSearch}
                    onChange={(e) => {
                      setDirectCustSearch(e.target.value);
                      setShowDirectCustDropdown(true);
                    }}
                    onFocus={() => setShowDirectCustDropdown(true)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />

                  {showDirectCustDropdown && (
                    <div className="billing__cust-dropdown animate-fade-in">
                      {filteredDirectCustomers.slice(0, 8).map(c => (
                        <div
                          key={c._id}
                          className="billing__cust-option"
                          onClick={() => {
                            setDirectSelectedCustId(c._id);
                            setDirectCustName(c.name);
                            setDirectCustPhone(c.mobile || c.whatsapp || c.phone || '');
                            setDirectCustAddress(c.address || '');
                            setDirectCustSearch(`${c.name} (${c.mobile || ''})`);
                            setShowDirectCustDropdown(false);
                          }}
                        >
                          <strong>{c.name}</strong> — {c.mobile || 'No Mobile'} {c.address ? `(${c.address})` : ''}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              <div className="modal__grid">
                <div className="modal__field">
                  <label>Customer Full Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Smt. Sunita Sharma"
                    value={directCustName}
                    onChange={(e) => setDirectCustName(e.target.value)}
                    required
                  />
                </div>

                <div className="modal__field">
                  <label>Mobile Number (Flexible Prefix) *</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <select
                      value={directCustCountryCode}
                      onChange={(e) => setDirectCustCountryCode(e.target.value)}
                      style={{ width: '90px', minWidth: '90px', padding: '6px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 600 }}
                    >
                      {COUNTRY_PREFIXES.map(p => (
                        <option key={p.code} value={p.code}>{p.code}</option>
                      ))}
                      <option value="custom">Other</option>
                    </select>
                    <input
                      type="text"
                      placeholder="e.g. 9876543210"
                      style={{ flex: 1, minWidth: 0 }}
                      value={directCustPhone}
                      onChange={(e) => setDirectCustPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="modal__field" style={{ gridColumn: '1 / -1' }}>
                  <label>Customer Address</label>
                  <input
                    type="text"
                    placeholder="e.g. 80/LIG New Housing Board, Shahdol"
                    value={directCustAddress}
                    onChange={(e) => setDirectCustAddress(e.target.value)}
                  />
                </div>
              </div>

              {/* Garment Items Builder */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
                  <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'var(--color-navy-700)' }}>
                    👗 Items & Prices for this Bill ({directBillItems.length}):
                  </h4>
                  <button
                    type="button"
                    style={{ background: 'var(--color-gold-500)', color: '#fff', border: 'none', borderRadius: '4px', padding: '5px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => {
                      setDirectBillItems([
                        ...directBillItems,
                        { name: 'Bottom Wear', category: 'bottomWear', qty: 1, price: 1000 }
                      ]);
                    }}
                  >
                    <Plus size={13} /> + Add Item Row
                  </button>
                </div>

                {directBillItems.map((item, idx) => (
                  <div key={idx} className="billing__direct-item-card">
                    <div className="billing__direct-item-top">
                      <select
                        value={item.category || 'topWear'}
                        className="billing__direct-item-select"
                        onChange={(e) => {
                          const updated = [...directBillItems];
                          updated[idx].category = e.target.value;
                          const match = GARMENT_CATEGORIES.find(g => g.value === e.target.value);
                          if (match) updated[idx].name = match.defaultName;
                          setDirectBillItems(updated);
                        }}
                      >
                        {GARMENT_CATEGORIES.map(g => (
                          <option key={g.value} value={g.value}>{g.label}</option>
                        ))}
                      </select>

                      <input
                        type="text"
                        placeholder="Item Description (e.g. Silk Kurti)"
                        value={item.name}
                        className="billing__direct-item-name"
                        onChange={(e) => {
                          const updated = [...directBillItems];
                          updated[idx].name = e.target.value;
                          setDirectBillItems(updated);
                        }}
                        required
                      />

                      {directBillItems.length > 1 && (
                        <button
                          type="button"
                          className="billing__direct-item-delete"
                          onClick={() => setDirectBillItems(directBillItems.filter((_, i) => i !== idx))}
                          title="Remove item"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div className="billing__direct-item-bottom">
                      <div className="billing__direct-item-field">
                        <label>Qty:</label>
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const updated = [...directBillItems];
                            updated[idx].qty = parseInt(e.target.value) || 1;
                            setDirectBillItems(updated);
                          }}
                        />
                      </div>

                      <div className="billing__direct-item-field">
                        <label>Rate (₹):</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={item.price === 0 ? '' : item.price}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const updated = [...directBillItems];
                            updated[idx].price = e.target.value === '' ? 0 : parseFloat(e.target.value);
                            setDirectBillItems(updated);
                          }}
                        />
                      </div>

                      <div className="billing__direct-item-total">
                        <label>Total:</label>
                        <span>
                          ₹{((Number(item.qty) || 1) * (Number(item.price) || 0)).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Modifiers: Discounts with Whole-Number Rounding & Extra Charges */}
              <div className="billing__modifiers">
                <div className="billing__mod-field">
                  <label>Discount Mode</label>
                  <select value={directDiscountType} onChange={(e) => setDirectDiscountType(e.target.value)}>
                    <option value="amount">Flat Amount (₹)</option>
                    <option value="percent">Percentage (%)</option>
                  </select>
                </div>
                <div className="billing__mod-field">
                  <label>Discount {directDiscountType === 'percent' ? '(%)' : '(₹)'}</label>
                  <input
                    type="number"
                    value={directDiscountValue === 0 ? '' : directDiscountValue}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setDirectDiscountValue(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                    min="0"
                  />
                  {directDiscountType === 'percent' && directDiscountValue > 0 && (
                    <span style={{ fontSize: '11px', color: '#166534', fontWeight: 600, marginTop: '2px' }}>
                      = ₹{directDiscountAmount} off (Rounded)
                    </span>
                  )}
                </div>
                <div className="billing__mod-field">
                  <label>Extra Charges (₹)</label>
                  <input
                    type="number"
                    value={directExtraCharges === 0 ? '' : directExtraCharges}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setDirectExtraCharges(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                    min="0"
                  />
                </div>
              </div>

              {/* Payment Status & Collection Settings */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-navy-700)', display: 'block', marginBottom: '8px' }}>
                  Payment Status for this Bill:
                </label>
                <div className="billing__direct-pay-grid">
                  <button
                    type="button"
                    className={`billing__pay-btn ${directPaymentStatus === 'paid' ? 'active-paid' : ''}`}
                    onClick={() => {
                      setDirectPaymentStatus('paid');
                      setDirectPaidAmount(String(directGrandTotal));
                    }}
                  >
                    ✓ Full Paid (₹{directGrandTotal})
                  </button>
                  <button
                    type="button"
                    className={`billing__pay-btn ${directPaymentStatus === 'unpaid' ? 'active-unpaid' : ''}`}
                    onClick={() => {
                      setDirectPaymentStatus('unpaid');
                      setDirectPaidAmount('0');
                    }}
                  >
                    ✕ Unpaid (₹0 received)
                  </button>
                  <button
                    type="button"
                    className={`billing__pay-btn ${directPaymentStatus === 'partial' ? 'active-partial' : ''}`}
                    onClick={() => {
                      setDirectPaymentStatus('partial');
                      if (!directPaidAmount || directPaidAmount === '0') {
                        setDirectPaidAmount(String(Math.round(directGrandTotal / 2)));
                      }
                    }}
                  >
                    ⏳ Partial / Advance
                  </button>
                </div>

                <div className="modal__grid">
                  <div className="modal__field">
                    <label>Payment Mode</label>
                    <select value={directPaymentMode} onChange={(e) => setDirectPaymentMode(e.target.value)}>
                      <option value="cash">Cash (नकद)</option>
                      <option value="upi">UPI / QR Code</option>
                      <option value="card">Debit / Credit Card</option>
                      <option value="bankTransfer">Bank Transfer</option>
                    </select>
                  </div>

                  {directPaymentStatus === 'partial' && (
                    <div className="modal__field">
                      <label>Amount Received (₹) *</label>
                      <input
                        type="number"
                        placeholder="e.g. 500"
                        value={directPaidAmount}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setDirectPaidAmount(e.target.value)}
                        required
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Bill Summary Strip */}
              <div className="billing__direct-summary-strip">
                <div>
                  <span className="summary-label">Subtotal:</span>
                  <span className="summary-val">₹{directSubtotal.toLocaleString('en-IN')}</span>
                </div>
                {directDiscountAmount > 0 && (
                  <div>
                    <span className="summary-label">Discount:</span>
                    <span className="summary-val" style={{ color: '#16a34a' }}>-₹{directDiscountAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div>
                  <span className="summary-label" style={{ fontWeight: 800 }}>GRAND TOTAL:</span>
                  <span className="summary-val" style={{ fontSize: '16px', fontWeight: 900, color: 'var(--color-navy-700)' }}>
                    ₹{directGrandTotal.toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="summary-label">Received:</span>
                  <span className="summary-val" style={{ color: '#16a34a', fontWeight: 700 }}>₹{directEffectivePaid.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="summary-label">Balance Due:</span>
                  <span className="summary-val" style={{ color: directBalanceDue > 0 ? '#dc2626' : '#166534', fontWeight: 700 }}>
                    ₹{directBalanceDue.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="billing__direct-modal-actions">
                <button
                  type="button"
                  className="modal__btn modal__btn--secondary"
                  onClick={() => setShowDirectBillModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="modal__btn modal__btn--primary"
                  disabled={isSavingDirectBill}
                >
                  <Save size={14} /> {isSavingDirectBill ? 'Saving Bill...' : 'Save & View Invoice'}
                </button>
                <button
                  type="button"
                  className="modal__btn"
                  style={{ background: '#16a34a', color: '#ffffff', borderColor: '#15803d', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                  disabled={isSavingDirectBill}
                  onClick={(e) => handleSaveDirectBill(e, true)}
                >
                  <Share2 size={14} /> {isSavingDirectBill ? 'Processing...' : '📱 Save & Send WhatsApp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
