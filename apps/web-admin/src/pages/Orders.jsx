import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Search, Filter, Plus, Eye, ClipboardList, Package, Clock,
  ChevronRight, ChevronDown, ChevronUp, SortAsc, SortDesc, X, CheckCircle, UserCheck, Printer, FileText, Share2, Tag, Edit, MessageCircle, Ruler, Sparkles, Calendar, Trash2, CreditCard
} from 'lucide-react';
import useAppStore from '../store/appStore';
import useCustomerStore from '../store/customerStore';
import useSettingsStore from '../store/settingsStore';
import useMeasurementStore from '../store/measurementStore';
import { ORDER_STATUSES, PAYMENT_STATUSES, PRIORITIES, MEASUREMENT_CATEGORIES, GARMENT_CATEGORIES, COUNTRY_PREFIXES, getCategoryConfig, getGarmentConfig, getGarmentDefaultPrice } from '../constants';
import { printInvoiceHTML } from '../../../../shared/utils/generateInvoice';
import { InvoiceTemplate } from '../../../../shared/components/InvoiceTemplate';
import CustomerEditModal from '../components/CustomerEditModal';
import PaymentHistoryModal from '../components/PaymentHistoryModal';
import useLanguageStore from '../store/languageStore';
import { apiClient } from '../services/apiClient';
import './Orders.css';

const formatINR = (a) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(a || 0);

const formatMobileNumber = (m) => {
  if (!m) return '';
  const clean = String(m).replace(/\D/g, '');
  if (clean.length === 10) return clean;
  if (clean.length === 12 && clean.startsWith('91')) return clean.slice(2);
  return clean;
};

const STREAMLINED_STEPS = ['pending', 'preparing', 'ready', 'completed'];

const matchesStatusGroup = (orderStatus, filter) => {
  if (filter === 'all') return true;
  if (filter === 'pendingPayment') return true;
  if (filter === 'pending') return orderStatus === 'pending';
  if (filter === 'preparing') return ['preparing', 'cutting', 'stitching', 'trial'].includes(orderStatus);
  if (filter === 'ready') return orderStatus === 'ready';
  if (filter === 'completed') return ['completed', 'delivered'].includes(orderStatus);
  return true;
};

export default function Orders() {
  const location = useLocation();
  const { orders, addOrder, updateOrder, deleteOrder, markOrderPaid, updateOrderStatus, updateOrderBill, fetchOrdersFromDB } = useAppStore();
  const { customers, addCustomer, fetchCustomersFromDB } = useCustomerStore();
  const { shopInfo } = useSettingsStore();
  const { getLatestByCategory, addMeasurement, fetchMeasurementsFromDB, measurements } = useMeasurementStore();
  const { t, language } = useLanguageStore();

  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchOrdersFromDB();
    fetchCustomersFromDB();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('search');
    if (q) {
      setSearch(q);
    }
  }, [location.search]);

  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'deliveryDate'
  const [dismissDuplicateNotice, setDismissDuplicateNotice] = useState(false);
  const [editingCustomerData, setEditingCustomerData] = useState(null);
  const [paymentHistoryOrder, setPaymentHistoryOrder] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Interactive Generate Bill Modal State
  const [activeBillOrder, setActiveBillOrder] = useState(null);
  const [billItems, setBillItems] = useState([]);
  const [discountType, setDiscountType] = useState('amount'); // 'amount' (₹) | 'percent' (%)
  const [discountValue, setDiscountValue] = useState(0);
  const [billExtraCharges, setBillExtraCharges] = useState(0);
  const [additionalPayment, setAdditionalPayment] = useState(0);

  // Interactive Edit Order Modal State
  const [editingOrder, setEditingOrder] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editItems, setEditItems] = useState([]);
  const [editTotalAmount, setEditTotalAmount] = useState(0);
  const [editAdvancePaid, setEditAdvancePaid] = useState('0');
  const [editDeliveryDate, setEditDeliveryDate] = useState('');
  const [editStatus, setEditStatus] = useState('pending');
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);
  const [editMeasExpanded, setEditMeasExpanded] = useState(false);
  const [editActiveMeasIdx, setEditActiveMeasIdx] = useState(0);
  const [editShowAddNewSize, setEditShowAddNewSize] = useState(false);
  const [editNewSizeName, setEditNewSizeName] = useState('');
  const [editNewSizeVal, setEditNewSizeVal] = useState('');

  const openEditModal = async (order, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setEditingOrder(order);
    setEditMeasExpanded(false);
    setEditActiveMeasIdx(0);
    setEditShowAddNewSize(false);
    setEditNewSizeName('');
    setEditNewSizeVal('');

    if (order.customerId) {
      await fetchMeasurementsFromDB(order.customerId);
    }
    const populatedItems = (order.items || []).map(item => {
      const existingMeas = (item.measurements && Object.keys(item.measurements).length > 0)
        ? item.measurements
        : getCustomerMeasurementForCategory(order.customerId, item.category || item.name);
      return {
        ...item,
        measurements: existingMeas && Object.keys(existingMeas).length > 0 ? { ...existingMeas } : (item.measurements || {}),
      };
    });
    setEditItems(JSON.parse(JSON.stringify(populatedItems)));
    const tot = order.totalAmount || order.subtotal || 0;
    setEditTotalAmount(tot);
    setEditAdvancePaid(order.advancePaid !== undefined ? String(order.advancePaid) : (order.paidAmount !== undefined ? String(order.paidAmount) : '0'));
    setEditDeliveryDate(order.deliveryDate ? new Date(order.deliveryDate).toISOString().slice(0, 10) : '');
    setEditStatus(order.status || 'pending');
    setShowEditModal(true);
  };

  const handleAddEditItem = () => {
    const newCat = 'suit';
    const gConfig = getGarmentConfig(newCat);
    const defSub = gConfig.defaultSubtype || 'Salwar';
    const newItem = {
      name: `${gConfig.shortLabel || gConfig.defaultName} (${defSub})`,
      category: newCat,
      subtype: defSub,
      qty: 1,
      price: gConfig.defaultPrice, // Suit: 500
      notes: '',
      measurements: {}
    };
    const updated = [...editItems, newItem];
    setEditItems(updated);
    setEditActiveMeasIdx(updated.length - 1);
    const newSum = updated.reduce((s, i) => s + (Number(i.qty || 1) * Number(i.price || 0)), 0);
    setEditTotalAmount(newSum);
  };

  const handleRemoveEditItem = (idx) => {
    if (editItems.length <= 1) return;
    const updated = editItems.filter((_, i) => i !== idx);
    setEditItems(updated);
    if (editActiveMeasIdx >= updated.length) {
      setEditActiveMeasIdx(Math.max(0, updated.length - 1));
    }
    const newSum = updated.reduce((s, i) => s + (Number(i.qty || 1) * Number(i.price || 0)), 0);
    setEditTotalAmount(newSum);
  };

  const handleEditItemCategoryChange = (idx, newCategory) => {
    const updated = [...editItems];
    const gConfig = getGarmentConfig(newCategory);
    const defSub = gConfig.defaultSubtype || (gConfig.subtypes && gConfig.subtypes[0]) || '';
    const defPrice = gConfig.defaultPrice !== undefined ? gConfig.defaultPrice : 0;
    updated[idx].category = newCategory;
    updated[idx].subtype = defSub;
    updated[idx].name = `${gConfig.shortLabel || gConfig.defaultName}${defSub ? ` (${defSub})` : ''}`;
    updated[idx].price = defPrice;
    setEditItems(updated);
    const newSum = updated.reduce((s, i) => s + (Number(i.qty || 1) * Number(i.price || 0)), 0);
    setEditTotalAmount(newSum);
  };

  const handleEditItemSubtypeChange = (idx, newSubtype) => {
    const updated = [...editItems];
    const gConfig = getGarmentConfig(updated[idx].category);
    updated[idx].subtype = newSubtype;
    updated[idx].name = `${gConfig.shortLabel || gConfig.defaultName} (${newSubtype})`;
    setEditItems(updated);
  };

  const handleEditItemChange = (idx, field, value) => {
    const updated = [...editItems];
    updated[idx] = { ...updated[idx], [field]: value };
    setEditItems(updated);
    const newSum = updated.reduce((s, i) => s + (Number(i.qty || 1) * Number(i.price || 0)), 0);
    setEditTotalAmount(newSum);
  };

  const handleEditItemMeasurementChange = (idx, field, val) => {
    const updated = [...editItems];
    updated[idx].measurements = {
      ...(updated[idx].measurements || {}),
      [field]: val,
    };
    setEditItems(updated);
  };

  const handleSaveEditedOrder = () => {
    if (!editingOrder) return;

    // Auto-capture any unsubmitted custom measurements
    const finalEditItems = [...editItems];
    if (editNewSizeName.trim()) {
      const activeIdx = Math.min(editActiveMeasIdx, Math.max(0, finalEditItems.length - 1));
      if (finalEditItems[activeIdx]) {
        finalEditItems[activeIdx].measurements = {
          ...(finalEditItems[activeIdx].measurements || {}),
          [editNewSizeName.trim()]: editNewSizeVal.trim(),
        };
      }
    }

    finalEditItems.forEach((item, idx) => {
      const kEl = document.getElementById(`edit_custom_key_${idx}`);
      const vEl = document.getElementById(`edit_custom_val_${idx}`);
      if (kEl && kEl.value.trim()) {
        item.measurements = {
          ...(item.measurements || {}),
          [kEl.value.trim()]: vEl ? vEl.value.trim() : ''
        };
      }
    });

    const subtotal = finalEditItems.reduce((s, i) => s + (Number(i.qty || 1) * Number(i.price || 0)), 0);
    const totalAmount = Number(editTotalAmount) || subtotal;
    const advancePaid = editAdvancePaid === '' ? 0 : (parseFloat(editAdvancePaid) || 0);
    const balanceDue = Math.max(0, totalAmount - advancePaid);
    const paymentStatus = balanceDue <= 0 ? 'paid' : advancePaid > 0 ? 'partial' : 'unpaid';

    // 1. Save all edited measurements directly to customer profile & MongoDB Atlas
    finalEditItems.forEach(item => {
      if (item.measurements && Object.keys(item.measurements).length > 0) {
        const catKey = item.category || 'suit';
        addMeasurement(
          editingOrder.customerId,
          editingOrder.customerName,
          catKey,
          item.measurements
        );
      }
    });

    const payload = {
      items: finalEditItems,
      subtotal,
      discount: editingOrder.discount || 0,
      extraCharges: editingOrder.extraCharges || 0,
      grandTotal: totalAmount,
      totalAmount,
      advancePaid,
      paidAmount: advancePaid,
      balanceDue,
      pendingAmount: balanceDue,
      paymentStatus,
      deliveryDate: editDeliveryDate,
      status: editStatus,
    };

    updateOrder(editingOrder._id, payload);
    apiClient.updateOrder(editingOrder._id, payload)
      .then(() => fetchOrdersFromDB())
      .catch((err) => console.warn('[Update Order Warning]:', err.message));

    showToast(`✅ Order #${editingOrder.tokenNumber || editingOrder.orderNumber} & measurements updated!`);
    setShowEditModal(false);
    setEditingOrder(null);
  };

  const handleMarkOrderPaid = (order, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const tokenOrNum = order.tokenNumber ? `Token #${order.tokenNumber}` : order.orderNumber;
    const pendingAmt = order.balanceDue !== undefined ? order.balanceDue : order.pendingAmount;
    markOrderPaid(order._id, {
      paymentDate: new Date().toISOString(),
      mode: 'cash',
      notes: 'Marked paid from orders card',
    });
    showToast(language === 'hi' ? `✅ ${tokenOrNum} (₹${pendingAmt}) आज की तारीख में Paid दर्ज हो गया!` : `✅ ${tokenOrNum} (₹${pendingAmt}) marked as PAID with today's date!`);
  };

  // Quick Reschedule Expected Delivery Date directly from Order Card Front
  const [reschedulingOrderId, setReschedulingOrderId] = useState(null);

  const handleQuickRescheduleDate = async (targetOrderOrId, newDateStr) => {
    if (!newDateStr) return;
    const targetId = typeof targetOrderOrId === 'object' ? (targetOrderOrId._id || targetOrderOrId.orderNumber) : targetOrderOrId;
    const isoDateStr = new Date(newDateStr).toISOString();
    await updateOrder(targetId, { deliveryDate: isoDateStr });
    showToast(language === 'hi' ? `✅ डिलीवरी तारीख बदलकर ${newDateStr} कर दी गई!` : `✅ Expected Delivery Date rescheduled to ${newDateStr}`);
    setReschedulingOrderId(null);
  };

  const promptDeleteOrder = (order, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!order) return;
    setOrderToDelete(order);
  };

  const handleDeleteOrder = (order, e) => {
    promptDeleteOrder(order, e);
  };

  const handleConfirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    const tokenOrNum = orderToDelete.tokenNumber ? `Token #${orderToDelete.tokenNumber}` : orderToDelete.orderNumber;
    setIsDeletingOrder(true);
    try {
      await deleteOrder(orderToDelete._id || orderToDelete.orderNumber);
      showToast(language === 'hi' ? `🗑️ ${tokenOrNum} को डेटाबेस से डिलीट कर दिया गया!` : `🗑️ ${tokenOrNum} deleted from database!`);
      if (showEditModal && editingOrder && (editingOrder._id === orderToDelete._id || editingOrder.orderNumber === orderToDelete.orderNumber)) {
        setShowEditModal(false);
        setEditingOrder(null);
      }
      setOrderToDelete(null);
    } catch (err) {
      showToast(`❌ Failed to delete order: ${err.message}`);
    } finally {
      setIsDeletingOrder(false);
    }
  };

  // New Order Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [customerMode, setCustomerMode] = useState('existing'); // 'existing' | 'new'
  const [selectedCustId, setSelectedCustId] = useState('');
  const [custSearchQuery, setCustSearchQuery] = useState('');
  const [showCustDropdown, setShowCustDropdown] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustCountryCode, setNewCustCountryCode] = useState('+91');
  const [newCustMobile, setNewCustMobile] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [priority, setPriority] = useState('normal');
  const [isDeliveryFlexible, setIsDeliveryFlexible] = useState(true);
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [advancePaid, setAdvancePaid] = useState('');

  const filteredCustomersList = useMemo(() => {
    if (!custSearchQuery) return customers;
    const q = String(custSearchQuery || '').toLowerCase();
    return (customers || []).filter(c =>
      (c.name && typeof c.name === 'string' && c.name.toLowerCase().includes(q)) ||
      (c.mobile && String(c.mobile).includes(q))
    );
  }, [customers, custSearchQuery]);

  const matchedExistingCustomer = useMemo(() => {
    if (dismissDuplicateNotice) return null;
    const cleanMobile = String(newCustMobile || '').trim().replace(/\D/g, '');
    const cleanName = String(newCustName || '').trim().toLowerCase();

    if (!cleanMobile && !cleanName) return null;

    return (customers || []).find(c => {
      const cMobile = String(c.mobile || '').replace(/\D/g, '');
      const cName = String(c.name || '').trim().toLowerCase();

      if (cleanMobile && cleanMobile.length >= 10 && cMobile.includes(cleanMobile)) {
        return true;
      }
      if (cleanName && cleanName.length >= 3 && cName === cleanName) {
        return true;
      }
      return false;
    }) || null;
  }, [customers, newCustMobile, newCustName, dismissDuplicateNotice]);

  // Order Items & Measurement details
  const [measExpanded, setMeasExpanded] = useState(false);
  const [activeMeasItemIdx, setActiveMeasItemIdx] = useState(0);
  const [showAddNewSize, setShowAddNewSize] = useState(false);
  const [newSizeName, setNewSizeName] = useState('');
  const [newSizeVal, setNewSizeVal] = useState('');

  const createInitialOrderItem = (catKey = 'suit') => {
    const g = getGarmentConfig(catKey);
    const defSub = g.defaultSubtype || 'Salwar';
    return {
      name: `${g.shortLabel || g.defaultName} (${defSub})`,
      category: g.value,
      subtype: defSub,
      qty: 1,
      price: g.defaultPrice, // Suit: 500
      notes: '',
      measurements: {},
      isAutoFilled: false,
    };
  };

  const [orderItems, setOrderItems] = useState([createInitialOrderItem('suit')]);

  // Auto-fetch & auto-fill customer measurements whenever an existing customer is selected
  useEffect(() => {
    if (customerMode === 'existing' && selectedCustId && showAddModal) {
      fetchMeasurementsFromDB(selectedCustId);
      setOrderItems(prev => prev.map(item => {
        if (item.measurements && Object.keys(item.measurements).length > 0 && !item.isAutoFilled) {
          return item;
        }
        const savedMeas = getCustomerMeasurementForCategory(selectedCustId, item.category);
        if (savedMeas && Object.keys(savedMeas).length > 0) {
          return {
            ...item,
            measurements: { ...savedMeas },
            isAutoFilled: true,
          };
        }
        return item;
      }));
    }
  }, [selectedCustId, customerMode, showAddModal, measurements, orders]);

  const dueTodayCount = useMemo(() => {
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

  const filteredOrders = useMemo(() => {
    let result = [...orders];
    if (search) {
      const q = String(search || '').toLowerCase();
      result = result.filter(o =>
        (o.orderNumber && typeof o.orderNumber === 'string' && o.orderNumber.toLowerCase().includes(q)) ||
        (o.tokenNumber && typeof o.tokenNumber === 'string' && o.tokenNumber.toLowerCase().includes(q)) ||
        (o.customerName && typeof o.customerName === 'string' && o.customerName.toLowerCase().includes(q))
      );
    }
    if (statusFilter === 'pendingPayment') {
      result = result.filter(o => o && o.status !== 'cancelled' && (
        (Number(o.pendingAmount) || Number(o.balanceDue) || 0) > 0 ||
        o.paymentStatus === 'unpaid' ||
        o.paymentStatus === 'partial'
      ));
    } else if (statusFilter === 'all') {
      // By default, exclude completed/delivered orders from main view ONLY if not searching or filtering by payment
      if (!search && paymentFilter === 'all') {
        result = result.filter(o => o.status !== 'completed' && o.status !== 'delivered');
      }
    } else if (statusFilter === 'dueToday') {
      const todayStr = new Date().toISOString().slice(0, 10);
      result = result.filter(o => {
        if (!o || ['completed', 'delivered', 'cancelled'].includes(o.status)) return false;
        if (!o.deliveryDate) return false;
        try {
          const d = new Date(o.deliveryDate);
          if (isNaN(d.getTime())) return false;
          return d.toISOString().slice(0, 10) <= todayStr;
        } catch (e) {
          return false;
        }
      });
    } else {
      result = result.filter(o => matchesStatusGroup(o.status, statusFilter));
    }
    if (paymentFilter !== 'all') result = result.filter(o => o.paymentStatus === paymentFilter);

    // Customizable order sorting
    result.sort((a, b) => {
      if (sortBy === 'oldest') {
        const da = new Date(a.createdAt || a.orderDate || 0).getTime() || 0;
        const db = new Date(b.createdAt || b.orderDate || 0).getTime() || 0;
        return da - db;
      }
      if (sortBy === 'deliveryDate') {
        const da = new Date(a.deliveryDate || '2099-12-31').getTime() || 0;
        const db = new Date(b.deliveryDate || '2099-12-31').getTime() || 0;
        return da - db;
      }
      // Default: Newest created orders first at top
      const da = new Date(b.createdAt || b.orderDate || 0).getTime() || 0;
      const db = new Date(a.createdAt || a.orderDate || 0).getTime() || 0;
      return da - db;
    });

    return result;
  }, [orders, search, statusFilter, paymentFilter, sortBy]);

  const pendingPaymentOrdersCount = useMemo(() => {
    return (orders || []).filter(o => o && o.status !== 'cancelled' && (
      (Number(o.pendingAmount) || Number(o.balanceDue) || 0) > 0 ||
      o.paymentStatus === 'unpaid' ||
      o.paymentStatus === 'partial'
    )).length;
  }, [orders]);

  const statusCounts = useMemo(() => {
    let activeCount = 0;
    const counts = { all: 0 };
    orders.forEach(o => {
      counts[o.status] = (counts[o.status] || 0) + 1;
      if (o.status !== 'completed' && o.status !== 'delivered') {
        activeCount++;
      }
    });
    counts.all = activeCount;
    return counts;
  }, [orders]);

  // Auto-format Mobile Number preserving international prefix
  const formatMobileNumber = (input) => {
    if (!input) return '';
    let str = String(input).trim();
    if (str.startsWith('+')) return str;
    const clean = str.replace(/\D/g, '');
    if (clean.length === 10) return `${newCustCountryCode} ${clean}`;
    if (clean.length > 10) return `+${clean}`;
    return input;
  };

  const handleMobileBlur = () => {
    if (newCustMobile) {
      setNewCustMobile(formatMobileNumber(newCustMobile));
    }
  };

  const handleCustomerModeSwitch = (mode) => {
    setCustomerMode(mode);
    if (mode === 'new') {
      setSelectedCustId('');
      setCustSearchQuery('');
      // Completely wipe out measurements for new walk-in customer
      setOrderItems(prev => prev.map(it => ({ ...it, measurements: {}, isAutoFilled: false })));
    }
  };

  // Bulletproof helper to fetch saved measurements for a customer by category
  const getCustomerMeasurementForCategory = (custId, category) => {
    if (!custId || !category) return null;

    // 1. Check measurementStore first
    const fromStore = getLatestByCategory(custId, category);
    if (fromStore && fromStore.fields && Object.keys(fromStore.fields).length > 0) {
      return fromStore.fields;
    }

    // 2. Fallback: Search past orders of this customer for items in this category
    const targetCust = customers.find(c => c._id === custId);
    const custName = targetCust?.name || custId;
    const custOrders = (orders || []).filter(o => o.customerId === custId || (o.customerName && custName && typeof o.customerName === 'string' && typeof custName === 'string' && o.customerName.toLowerCase() === custName.toLowerCase()));

    for (const o of custOrders) {
      if (Array.isArray(o.items)) {
        for (const item of o.items) {
          const itemCat = item.category || 'topWear';
          if (
            (itemCat === category || getCategoryConfig(itemCat).label === getCategoryConfig(category).label) &&
            item.measurements &&
            Object.keys(item.measurements).length > 0
          ) {
            return item.measurements;
          }
        }
      }
    }

    return null;
  };

  const handleSelectCustomerForNewOrder = async (custId) => {
    setSelectedCustId(custId);
    if (!custId) {
      setOrderItems(prev => prev.map(it => ({ ...it, measurements: {}, isAutoFilled: false })));
      return;
    }

    await fetchMeasurementsFromDB(custId);

    setOrderItems(prev => prev.map(item => {
      const savedMeas = getCustomerMeasurementForCategory(custId, item.category);
      if (savedMeas && Object.keys(savedMeas).length > 0) {
        return {
          ...item,
          measurements: { ...savedMeas },
          isAutoFilled: true,
        };
      }
      return { ...item, measurements: {}, isAutoFilled: false };
    }));
  };

  const handleItemCategoryChange = (index, newCategory) => {
    const updated = [...orderItems];
    const gConfig = getGarmentConfig(newCategory);
    const defSub = gConfig.defaultSubtype || (gConfig.subtypes && gConfig.subtypes[0]) || '';
    const defPrice = gConfig.defaultPrice !== undefined ? gConfig.defaultPrice : 0;

    updated[index].category = newCategory;
    updated[index].subtype = defSub;
    updated[index].name = `${gConfig.shortLabel || gConfig.defaultName}${defSub ? ` (${defSub})` : ''}`;
    updated[index].price = defPrice;

    if (customerMode === 'existing' && selectedCustId) {
      const savedMeas = getCustomerMeasurementForCategory(selectedCustId, newCategory);
      if (savedMeas && Object.keys(savedMeas).length > 0) {
        updated[index].measurements = { ...savedMeas };
        updated[index].isAutoFilled = true;
      } else {
        updated[index].measurements = {};
        updated[index].isAutoFilled = false;
      }
    } else {
      updated[index].measurements = {};
      updated[index].isAutoFilled = false;
    }
    setOrderItems(updated);
  };

  const handleItemSubtypeChange = (index, newSubtype) => {
    const updated = [...orderItems];
    const gConfig = getGarmentConfig(updated[index].category);
    updated[index].subtype = newSubtype;
    updated[index].name = `${gConfig.shortLabel || gConfig.defaultName} (${newSubtype})`;
    setOrderItems(updated);
  };

  const handleAddItem = () => {
    const newCat = 'suit';
    const gConfig = getGarmentConfig(newCat);
    const defSub = gConfig.defaultSubtype || 'Salwar';
    let autoMeas = {};
    let isAutoFilled = false;

    if (customerMode === 'existing' && selectedCustId) {
      const savedMeas = getCustomerMeasurementForCategory(selectedCustId, newCat);
      if (savedMeas && Object.keys(savedMeas).length > 0) {
        autoMeas = { ...savedMeas };
        isAutoFilled = true;
      }
    }

    const newItem = {
      name: `${gConfig.shortLabel || gConfig.defaultName} (${defSub})`,
      category: newCat,
      subtype: defSub,
      qty: 1,
      price: gConfig.defaultPrice,
      notes: '',
      measurements: autoMeas,
      isAutoFilled,
    };
    const newIdx = orderItems.length;
    setOrderItems([...orderItems, newItem]);
    setActiveMeasItemIdx(newIdx);
  };

  const handleRemoveItem = (index) => {
    if (orderItems.length <= 1) return;
    const updated = orderItems.filter((_, i) => i !== index);
    setOrderItems(updated);
    if (activeMeasItemIdx >= updated.length) {
      setActiveMeasItemIdx(Math.max(0, updated.length - 1));
    }
  };

  const handleItemMeasurementChange = (itemIdx, field, val) => {
    const updated = [...orderItems];
    updated[itemIdx].measurements = {
      ...(updated[itemIdx].measurements || {}),
      [field]: val,
    };
    setOrderItems(updated);
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();

    // Auto-capture any unsubmitted custom measurements
    const finalOrderItems = [...orderItems];
    if (newSizeName.trim()) {
      const activeIdx = Math.min(activeMeasItemIdx, Math.max(0, finalOrderItems.length - 1));
      if (finalOrderItems[activeIdx]) {
        finalOrderItems[activeIdx].measurements = {
          ...(finalOrderItems[activeIdx].measurements || {}),
          [newSizeName.trim()]: newSizeVal.trim(),
        };
      }
    }
    finalOrderItems.forEach((item, idx) => {
      const kEl = document.getElementById(`new_custom_key_${idx}`);
      const vEl = document.getElementById(`new_custom_val_${idx}`);
      if (kEl && kEl.value.trim()) {
        item.measurements = {
          ...(item.measurements || {}),
          [kEl.value.trim()]: vEl ? vEl.value.trim() : ''
        };
      }
    });

    let custId = selectedCustId;
    let custName = '';
    let custMobile = '';

    if (customerMode === 'existing') {
      const cust = customers.find(c => c._id === selectedCustId || String(c._id) === String(selectedCustId));
      if (!cust) {
        alert('Please select a valid customer!');
        return;
      }
      custId = cust._id;
      custName = cust.name;
      custMobile = formatMobileNumber(cust.mobile || cust.whatsapp || cust.phone || cust.customerMobile || '');
    } else {
      if (!newCustName.trim() || !newCustMobile.trim()) {
        alert('Customer Name and Mobile number are required!');
        return;
      }
      const formattedMobile = formatMobileNumber(newCustMobile);
      const newCustObj = {
        _id: 'cust_' + Math.random().toString(36).substr(2, 9),
        name: newCustName.trim(),
        mobile: formattedMobile,
        address: newCustAddress.trim(),
        gender: 'male',
        tags: ['Walk-in'],
      };
      addCustomer(newCustObj);
      custId = newCustObj._id;
      custName = newCustObj.name;
      custMobile = newCustObj.mobile;
    }

    // Save measurements entered in this order to the customer's permanent profile
    finalOrderItems.forEach(item => {
      if (item.measurements && Object.keys(item.measurements).length > 0) {
        addMeasurement(custId, custName, item.category, item.measurements);
      }
    });

    const subtotal = finalOrderItems.reduce((s, it) => s + (it.qty * (parseFloat(it.price) || 0)), 0);
    const paid = parseFloat(advancePaid) || 0;
    const pending = Math.max(0, subtotal - paid);
    const paymentStatus = paid >= subtotal ? 'paid' : paid > 0 ? 'partial' : 'unpaid';

    // Generate unique, collision-free token & order sequence numbers
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

    const newOrder = {
      orderNumber: newOrderNumber,
      tokenNumber: newTokenNumber,
      customerId: custId,
      customerName: custName,
      customerMobile: custMobile,
      customerAddress: customerMode === 'existing' ? (customers.find(c => c._id === selectedCustId)?.address || '') : newCustAddress.trim(),
      orderDate: new Date().toISOString(),
      deliveryDate: deliveryDate ? new Date(deliveryDate).toISOString() : new Date().toISOString(),
      priority,
      status: 'pending',
      items: finalOrderItems,
      subtotal,
      paidAmount: paid,
      advancePaid: paid,
      pendingAmount: pending,
      balanceDue: pending,
      paymentStatus,
      timeline: [{ status: 'pending', timestamp: new Date().toISOString(), updatedBy: 'Admin' }],
      createdAt: new Date().toISOString(),
    };

    let savedOrder = null;
    try {
      savedOrder = await addOrder(newOrder);
      await fetchOrdersFromDB();
    } catch (err) {
      alert(`⚠️ Could not save order to Database: ${err.message || 'Server error'}`);
      return;
    }

    const createdOrderNumber = savedOrder?.orderNumber || newOrderNumber;
    const createdTokenNumber = savedOrder?.tokenNumber || newTokenNumber;

    // Reset filters & search so newly created order is immediately visible in view
    setSearch('');
    setStatusFilter('all');
    setPaymentFilter('all');

    // Calculate expected delivery days & date for order register
    const itemsSummaryList = finalOrderItems.map(it => `${it.qty}x ${it.name}`).join(', ');
    const deliveryDateObj = deliveryDate ? new Date(deliveryDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const expectedDays = Math.max(1, Math.ceil((deliveryDateObj - new Date()) / (1000 * 60 * 60 * 24)));
    const deliveryFormatted = deliveryDateObj.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const sName = shopInfo?.name || 'Darji';
    const sAddr = shopInfo?.address || '80/LIG 1ST New Housing Board Colony, Shahdol (M.P.) 484001';
    const sPhone = shopInfo?.phone || '+919479487828, +917000621972';

    let bookingText = `✨ *DARJI — NEW ORDER REGISTERED* ✨\n\nDear *${custName} ji*,\nYour order *${createdTokenNumber}* (${createdOrderNumber}) has been registered!\n\n📋 *Register Details*:\n• Items: ${itemsSummaryList}\n\n⏳ Expected Delivery: ${expectedDays} Days (${deliveryFormatted})\n\n📍 Address: ${sAddr}\n📞 Contact: ${sPhone}\n\nThank you for choosing *Darji*!`;

    // Dispatch WhatsApp registration notification directly to customer mobile number
    if (custMobile) {
      apiClient.sendWhatsAppTest({ mobile: custMobile, text: bookingText })
        .then(() => {
          showToast(`📱 Order ${createdTokenNumber} saved to DB & WhatsApp sent!`);
        })
        .catch((err) => {
          console.warn('[WhatsApp Booking Notification Warning]:', err.message);
          showToast(`✅ Order ${createdTokenNumber} saved to DB!`);
        });
    } else {
      showToast(`✅ Order ${createdTokenNumber} saved to DB!`);
    }

    // Reset Modal
    setShowAddModal(false);
    setSelectedCustId('');
    setCustSearchQuery('');
    setNewCustName('');
    setNewCustMobile('');
    setNewCustAddress('');
    setMeasExpanded(false);
    setActiveMeasItemIdx(0);
    setShowAddNewSize(false);
    setNewSizeName('');
    setNewSizeVal('');
    setOrderItems([createInitialOrderItem('suit')]);
    setAdvancePaid('');
  };

  const handleOpenAddModal = () => {
    setSelectedCustId('');
    setCustSearchQuery('');
    setShowCustDropdown(false);
    setNewCustName('');
    setNewCustMobile('');
    setNewCustAddress('');
    setMeasExpanded(false);
    setActiveMeasItemIdx(0);
    setShowAddNewSize(false);
    setNewSizeName('');
    setNewSizeVal('');
    setOrderItems([createInitialOrderItem('suit')]);
    setShowAddModal(true);
  };

  const triggerWhatsAppReadyMessage = async (order, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const custName = order.customerName || 'Customer';
    const tokenStr = order.tokenNumber || order.orderNumber || 'T-100';

    const sName = shopInfo?.name || 'Darji';
    const sAddr = shopInfo?.address || '80/LIG 1ST New Housing Board Colony, Shahdol (M.P.) 484001';
    const sPhone = shopInfo?.phone || '+919479487828, +917000621972';

    let text = `🧵 *DARJI — ORDER READY FOR PICKUP* 🧵\n\nDear *${custName} ji*,\nYour order *${tokenStr}* is completely ready! Please come to collect it at your earliest convenience.\n\n\n📍 Address: ${sAddr}\n🗺️ Location Map: https://maps.app.goo.gl/wGwLLTRwZU4JuF3AA\n📞 Contact: ${sPhone}\n\nThank you for choosing *Darji*!`;

    const matchedCust = (customers || []).find(c =>
      c._id === order.customerId ||
      (c.name && order.customerName && typeof c.name === 'string' && typeof order.customerName === 'string' && c.name.toLowerCase() === order.customerName.toLowerCase())
    );
    const phone = order.customerMobile || order.customerPhone || matchedCust?.mobile || matchedCust?.whatsapp || '';
    if (!phone) {
      showToast(`❌ Customer ${custName} does not have a mobile number saved!`);
      return;
    }
    try {
      await apiClient.sendWhatsAppTest({ mobile: phone, text });
      showToast(`📱 WhatsApp Ready Alert sent to +91 ${phone}!`);
    } catch (err) {
      console.error('Failed to send backend WhatsApp ready alert:', err);
      showToast(`❌ Failed to send WhatsApp alert: ${err.message}`);
    }
  };

  // Status transition with WhatsApp notification trigger
  const handleStatusAdvance = (orderId, newStatus, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const order = orders.find(o => o._id === orderId);
    updateOrderStatus(orderId, newStatus);
    apiClient.updateOrderStatus(orderId, newStatus)
      .then(() => fetchOrdersFromDB())
      .catch((err) => console.warn('[Status DB Update Warning]:', err.message));

    if (newStatus === 'ready' && order) {
      triggerWhatsAppReadyMessage(order);
    } else if (order) {
      showToast(`✅ Order Token #${order.tokenNumber || ''} status updated to ${newStatus.toUpperCase()}`);
    }
  };

  // Open Bill Generator Modal & populate editable billItems
  const openBillModal = (order, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setActiveBillOrder(order);
    setBillItems(JSON.parse(JSON.stringify(order.items || [])));
    setDiscountType('amount');
    setDiscountValue(order.discount || 0);
    setBillExtraCharges(order.extraCharges || 0);
    setAdditionalPayment(0);
  };

  const handleBillItemChange = (index, field, val) => {
    const updated = [...billItems];
    updated[index][field] = field === 'price' || field === 'qty' ? (parseFloat(val) || 0) : val;
    setBillItems(updated);
  };

  // Active Bill Calculations
  const activeBill = useMemo(() => {
    if (!activeBillOrder) return null;
    const itemsToUse = billItems.length > 0 ? billItems : activeBillOrder.items;
    const subtotal = itemsToUse.reduce((s, item) => s + (item.qty * (parseFloat(item.price) || 0)), 0);

    const numericVal = parseFloat(discountValue) || 0;
    const computedDiscount = discountType === 'percent'
      ? Math.round((subtotal * numericVal) / 100)
      : numericVal;

    const discountLabel = discountType === 'percent' && numericVal > 0
      ? `Discount (${numericVal}%):`
      : 'Discount:';

    const taxable = Math.max(0, subtotal - computedDiscount);
    const total = Math.round(taxable + billExtraCharges);
    const currentPaid = activeBillOrder.paidAmount + (parseFloat(additionalPayment) || 0);
    const balance = Math.max(0, total - currentPaid);

    return {
      items: itemsToUse,
      subtotal,
      discount: computedDiscount,
      discountValue: numericVal,
      discountType,
      discountLabel,
      taxable,
      extraCharges: billExtraCharges,
      grandTotal: total,
      paidAmount: currentPaid,
      balanceDue: balance,
      paymentStatus: balance <= 0 ? 'paid' : currentPaid > 0 ? 'partial' : 'unpaid',
    };
  }, [activeBillOrder, billItems, discountType, discountValue, billExtraCharges, additionalPayment]);

  const activeBillInvoiceData = useMemo(() => {
    if (!activeBillOrder || !activeBill) return null;
    const matchedCust = (customers || []).find(c =>
      c._id === activeBillOrder.customerId ||
      (c.name && activeBillOrder.customerName && typeof c.name === 'string' && typeof activeBillOrder.customerName === 'string' && c.name.toLowerCase() === activeBillOrder.customerName.toLowerCase())
    );
    const custAddress = activeBillOrder.customerAddress || activeBillOrder.customer?.address || matchedCust?.address || matchedCust?.city || '';

    return {
      invoiceNumber: activeBillOrder.orderNumber.replace('ORD-', 'INV-'),
      tokenNumber: activeBillOrder.tokenNumber || 'T-100',
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      customer: {
        name: activeBillOrder.customerName,
        phone: activeBillOrder.customerMobile || activeBillOrder.customerPhone || matchedCust?.mobile || matchedCust?.phone || '',
        address: custAddress,
      },
      items: activeBill.items,
      subtotal: activeBill.subtotal,
      discount: activeBill.discount,
      discountPercent: activeBill.discountType === 'percent' ? activeBill.discountValue : 0,
      extraCharges: activeBill.extraCharges,
      grandTotal: activeBill.grandTotal,
      paidAmount: activeBill.paidAmount,
      balanceDue: activeBill.balanceDue,
      paymentStatus: activeBill.paymentStatus.toUpperCase(),
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
  }, [activeBillOrder, activeBill, shopInfo, customers]);

  const handleApplyBillPayment = async () => {
    if (!activeBillOrder || !activeBill) return;

    try {
      await updateOrderBill(activeBillOrder._id, {
        items: activeBill.items,
        subtotal: activeBill.subtotal,
        paidAmount: activeBill.paidAmount,
        discount: activeBill.discount,
        discountType: activeBill.discountType,
        discountValue: activeBill.discountValue,
        extraCharges: activeBill.extraCharges,
      });

      setAdditionalPayment(0);
      setToastMsg('✅ Bill & Payment changes saved to database!');
      setTimeout(() => setToastMsg(''), 4000);
    } catch (err) {
      console.error('[Apply Bill Error]:', err);
    }
  };

  const termsList = useMemo(() => {
    if (!shopInfo.termsAndConditions) return [];
    return shopInfo.termsAndConditions.split('\n').filter(t => t.trim().length > 0);
  }, [shopInfo.termsAndConditions]);

  return (
    <div className="orders">
      {/* Status Filter Chips */}
      <div className="orders__status-bar">
        <button
          className={`orders__status-chip ${statusFilter === 'all' ? 'orders__status-chip--active' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          {t('allOrders', 'All Orders')} <span className="orders__chip-count">{statusCounts.all}</span>
        </button>
        <button
          className={`orders__status-chip orders__status-chip--warning ${statusFilter === 'dueToday' ? 'orders__status-chip--active' : ''}`}
          onClick={() => setStatusFilter('dueToday')}
        >
          {t('dueTodayChip', 'Due Today')} <span className="orders__chip-count">{dueTodayCount}</span>
        </button>
        <button
          className={`orders__status-chip orders__status-chip--warning ${statusFilter === 'pending' ? 'orders__status-chip--active' : ''}`}
          onClick={() => setStatusFilter('pending')}
        >
          {t('newOrdersChip', 'New Orders')} <span className="orders__chip-count">{statusCounts.pending || 0}</span>
        </button>
        <button
          className={`orders__status-chip orders__status-chip--info ${statusFilter === 'preparing' ? 'orders__status-chip--active' : ''}`}
          onClick={() => setStatusFilter('preparing')}
        >
          {t('preparingChip', 'Preparing')} <span className="orders__chip-count">{(statusCounts.preparing || 0) + (statusCounts.cutting || 0) + (statusCounts.stitching || 0) + (statusCounts.trial || 0)}</span>
        </button>
        <button
          className={`orders__status-chip orders__status-chip--warning ${statusFilter === 'ready' ? 'orders__status-chip--active' : ''}`}
          onClick={() => setStatusFilter('ready')}
        >
          {t('readyChip', 'Ready (Pickup)')} <span className="orders__chip-count">{statusCounts.ready || 0}</span>
        </button>
        <button
          className={`orders__status-chip orders__status-chip--success ${statusFilter === 'completed' ? 'orders__status-chip--active' : ''}`}
          onClick={() => setStatusFilter('completed')}
        >
          {t('completedChip', 'Completed')} <span className="orders__chip-count">{(statusCounts.completed || 0) + (statusCounts.delivered || 0)}</span>
        </button>
        <button
          className={`orders__status-chip orders__status-chip--warning ${statusFilter === 'pendingPayment' ? 'orders__status-chip--active' : ''}`}
          onClick={() => setStatusFilter('pendingPayment')}
        >
          {language === 'hi' ? 'बकाया भुगतान' : 'Pending Payment'} <span className="orders__chip-count">{pendingPaymentOrdersCount}</span>
        </button>
      </div>

      {/* Search & Toolbar */}
      <div className="orders__toolbar">
        <div className="orders__search">
          <Search size={16} className="orders__search-icon" />
          <input
            type="text"
            placeholder={t('searchPlaceholder', 'Search by order #, Token #, or customer name...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="orders__search-input"
          />
        </div>

        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="orders__select"
        >
          <option value="all">{language === 'hi' ? 'सभी भुगतान स्थितियां' : 'All Payment Statuses'}</option>
          <option value="paid">{language === 'hi' ? 'पूर्ण भुगतान' : 'Paid'}</option>
          <option value="partial">{language === 'hi' ? 'आंशिक भुगतान' : 'Partial'}</option>
          <option value="unpaid">{language === 'hi' ? 'अदत्त (बकाया)' : 'Unpaid'}</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="orders__select"
        >
          <option value="newest">{language === 'hi' ? 'क्रमबद्ध: नया सबसे ऊपर' : 'Sort: Newest First'}</option>
          <option value="oldest">{language === 'hi' ? 'क्रमबद्ध: पुराना सबसे ऊपर' : 'Sort: Oldest First'}</option>
          <option value="deliveryDate">{language === 'hi' ? 'क्रमबद्ध: डिलीवरी तारीख' : 'Sort: Delivery Date'}</option>
        </select>

        <button className="customers__add-btn" style={{ marginLeft: 'auto' }} onClick={handleOpenAddModal}>
          <Plus size={18} /> {t('newOrderBtn', '+ New Custom Order & Token')}
        </button>
      </div>

      {/* Orders Grid */}
      <div className="orders__grid">
        {filteredOrders.length === 0 ? (
          <div className="orders__empty">
            <ClipboardList size={48} />
            <p>No orders found</p>
            <span>Try adjusting your search or filters</span>
          </div>
        ) : (
          filteredOrders.map(order => {
            const isCompleted = order.status === 'completed' || order.status === 'delivered';
            const isReady = order.status === 'ready';
            const isPreparing = ['preparing', 'cutting', 'stitching', 'trial'].includes(order.status);
            const isNew = order.status === 'pending';

            return (
              <div key={order._id} className="orders__card">
                <div className="orders__card-top-bar">
                  <span className="orders__token-badge">
                    <Tag size={13} /> Token #{order.tokenNumber || 'T-100'}
                  </span>

                  {order.priority === 'urgent' && (
                    <div className="orders__priority orders__priority--urgent">
                      URGENT
                    </div>
                  )}

                  <button
                    type="button"
                    className="orders__card-del-btn"
                    onClick={(e) => handleDeleteOrder(order, e)}
                    title={language === 'hi' ? 'इस ऑर्डर को डेटाबेस से डिलीट करें' : 'Delete this order from database'}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="orders__card-header">
                  <span className="orders__card-number">{order.orderNumber}</span>
                  <span className={`orders__card-status orders__card-status--${ORDER_STATUSES[order.status]?.color || 'warning'}`}>
                    {ORDER_STATUSES[order.status]?.label || 'New Order'}
                  </span>
                </div>

                {/* Clickable Customer Info Box to View/Edit Details & Measurements */}
                <div
                  className="orders__card-customer-box"
                  onClick={() => setEditingCustomerData(order)}
                  title="Click to view & edit customer details or body measurements"
                >
                  <div className="orders__card-customer-avatar">
                    {order.customerName ? order.customerName.charAt(0) : 'C'}
                  </div>
                  <div>
                    <p className="orders__card-customer-name">
                      {order.customerName} <Edit size={12} className="orders__edit-icon" />
                    </p>
                    <span className="orders__card-customer-phone">
                      {(() => {
                        const matchedCust = (customers || []).find(c =>
                          c._id === order.customerId ||
                          (c.name && order.customerName && typeof c.name === 'string' && typeof order.customerName === 'string' && c.name.toLowerCase() === order.customerName.toLowerCase())
                        );
                        return order.customerMobile || order.customerPhone || matchedCust?.mobile || matchedCust?.phone || '';
                      })()}
                    </span>
                  </div>
                </div>

                <div className="orders__card-items">
                  {order.items.map((item, i) => {
                    const measData = (item.measurements && Object.keys(item.measurements).length > 0)
                      ? item.measurements
                      : getCustomerMeasurementForCategory(order.customerId, item.category || item.name);
                    const hasMeas = measData && Object.keys(measData).length > 0;

                    return (
                      <div key={i} className="orders__card-item-row">
                        <span className="orders__card-item">{item.qty}× {item.name}</span>
                        {hasMeas && (
                          <span className="orders__card-meas-pill">
                            {Object.entries(measData).map(([k, v]) => `${k}:${v}`).join(', ')}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Amount Paid vs Balance Due Breakdown */}
                <div className="orders__card-payment-breakdown">
                  <div className="orders__pay-row">
                    <span>{language === 'hi' ? 'कुल राशि:' : 'Total:'}</span> <strong>{formatINR(order.subtotal)}</strong>
                  </div>
                  <div className="orders__pay-row">
                    <span>{language === 'hi' ? 'अग्रिम (एडवांस):' : 'Paid (Advance):'}</span> <span className="text-success">{formatINR(order.paidAmount)}</span>
                  </div>
                  <div className="orders__pay-row">
                    <span>{language === 'hi' ? 'शेष बकाया:' : 'Balance Due:'}</span> <strong className="text-danger">{formatINR(order.pendingAmount)}</strong>
                  </div>
                </div>

                {/* Expected Delivery Date & Quick Reschedule Banner */}
                {order.status !== 'completed' && order.status !== 'delivered' && order.status !== 'cancelled' && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    margin: '10px 0',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: (function() {
                      if (!order.deliveryDate) return '#F8FAFC';
                      const todayStr = new Date().toISOString().slice(0, 10);
                      const delStr = new Date(order.deliveryDate).toISOString().slice(0, 10);
                      if (delStr < todayStr) return '#FEF2F2';
                      if (delStr === todayStr) return '#FFFBEB';
                      return '#F8FAFC';
                    })(),
                    border: (function() {
                      if (!order.deliveryDate) return '1px solid #E2E8F0';
                      const todayStr = new Date().toISOString().slice(0, 10);
                      const delStr = new Date(order.deliveryDate).toISOString().slice(0, 10);
                      if (delStr < todayStr) return '1px solid #FECACA';
                      if (delStr === todayStr) return '1px solid #FDE68A';
                      return '1px solid #E2E8F0';
                    })()
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 700 }}>
                      <Calendar size={14} style={{
                        color: (function() {
                          if (!order.deliveryDate) return '#64748B';
                          const todayStr = new Date().toISOString().slice(0, 10);
                          const delStr = new Date(order.deliveryDate).toISOString().slice(0, 10);
                          if (delStr < todayStr) return '#DC2626';
                          if (delStr === todayStr) return '#D97706';
                          return '#2563EB';
                        })()
                      }} />
                      <span>
                        {(() => {
                          if (!order.deliveryDate) return 'Expected Delivery: Not set';
                          const todayStr = new Date().toISOString().slice(0, 10);
                          const delStr = new Date(order.deliveryDate).toISOString().slice(0, 10);
                          const formattedDate = new Date(order.deliveryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                          
                          if (delStr < todayStr) {
                            const diffDays = Math.ceil((new Date(todayStr).getTime() - new Date(delStr).getTime()) / (1000 * 3600 * 24));
                            return <span style={{ color: '#DC2626', fontWeight: 800 }}>🚨 OVERDUE by {diffDays} {diffDays === 1 ? 'day' : 'days'} ({formattedDate})</span>;
                          }
                          if (delStr === todayStr) {
                            return <span style={{ color: '#D97706', fontWeight: 800 }}>🔔 DUE TODAY ({formattedDate})</span>;
                          }
                          return <span style={{ color: '#334155' }}>Expected Delivery: {formattedDate}</span>;
                        })()}
                      </span>
                    </div>

                    {reschedulingOrderId === order._id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input
                          type="date"
                          defaultValue={order.deliveryDate ? new Date(order.deliveryDate).toISOString().slice(0, 10) : ''}
                          onChange={(e) => handleQuickRescheduleDate(order._id, e.target.value)}
                          style={{
                            padding: '4px 6px',
                            fontSize: '11px',
                            border: '1px solid #CBD5E1',
                            borderRadius: '6px',
                            outline: 'none',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setReschedulingOrderId(null)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '2px' }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setReschedulingOrderId(order._id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#2563EB',
                          cursor: 'pointer',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        }}
                        title="Quick change delivery date right from card front"
                      >
                        <Calendar size={12} /> {language === 'hi' ? 'तारीख बदलें' : 'Change Date'}
                      </button>
                    )}
                  </div>
                )}

                {/* Streamlined Mini Timeline (4 Steps) */}
                {order.status !== 'cancelled' && (
                  <div className="orders__timeline-mini">
                    {STREAMLINED_STEPS.map((step, i) => {
                      const currentIdx = isNew ? 0 : isPreparing ? 1 : isReady ? 2 : 3;
                      return (
                        <div
                          key={step}
                          className={`orders__timeline-dot ${i <= currentIdx ? 'orders__timeline-dot--done' : ''} ${i === currentIdx ? 'orders__timeline-dot--current' : ''}`}
                          title={step.toUpperCase()}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Action Buttons: Generate Bill & Simplified Status Transitions */}
                <div className="orders__card-actions-wrapper">
                  <button
                    type="button"
                    className="orders__gen-bill-btn"
                    onClick={(e) => openBillModal(order, e)}
                  >
                    <FileText size={16} /> {t('generateBill', 'Generate & Issue Bill')}
                  </button>

                  <div className="orders__transition-actions">
                    {isNew && (
                      <>
                        <button
                          type="button"
                          className="orders__trans-btn advance"
                          onClick={(e) => handleStatusAdvance(order._id, 'preparing', e)}
                        >
                          {language === 'hi' ? 'सिलाई/कटाई चालू करें' : 'Mark Preparing'}
                        </button>
                        <button
                          type="button"
                          className="orders__trans-btn advance"
                          onClick={(e) => handleStatusAdvance(order._id, 'ready', e)}
                        >
                          {t('markReady', 'Mark Ready (WA)')}
                        </button>
                      </>
                    )}

                    {isPreparing && (
                      <button
                        type="button"
                        className="orders__trans-btn advance"
                        onClick={(e) => handleStatusAdvance(order._id, 'ready', e)}
                      >
                        {t('markReady', 'Mark Ready (Send WA)')}
                      </button>
                    )}

                    {isReady && (
                      <>
                        <button
                          type="button"
                          className="orders__trans-btn advance orders__trans-btn--wa"
                          onClick={(e) => triggerWhatsAppReadyMessage(order, e)}
                        >
                          <MessageCircle size={16} /> {t('sendWaAlert', 'Send WA Alert')}
                        </button>
                        <button
                          type="button"
                          className="orders__trans-btn advance"
                          onClick={(e) => handleStatusAdvance(order._id, 'completed', e)}
                        >
                          {t('markComplete', 'Mark Complete & Handover')}
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      className="orders__trans-btn orders__trans-btn--edit"
                      onClick={(e) => openEditModal(order, e)}
                    >
                      <Edit size={16} /> {language === 'hi' ? 'एडिट ऑर्डर' : 'Edit Order'}
                    </button>

                    <button
                      type="button"
                      className="orders__trans-btn orders__trans-btn--del"
                      onClick={(e) => handleDeleteOrder(order, e)}
                      title={language === 'hi' ? 'इस ऑर्डर को डिलीट करें' : 'Delete this order'}
                    >
                      <Trash2 size={15} /> {language === 'hi' ? 'डिलीट ऑर्डर' : 'Delete Order'}
                    </button>

                    <button
                      type="button"
                      className="orders__trans-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setPaymentHistoryOrder(order);
                      }}
                      title={language === 'hi' ? 'भुगतान लेजर व तारीख संपादन' : 'Payment History & Date Adjustment'}
                      style={{ background: 'rgba(217, 119, 6, 0.1)', color: '#d97706', borderColor: 'rgba(217, 119, 6, 0.3)' }}
                    >
                      <CreditCard size={15} /> {language === 'hi' ? 'भुगतान तारीख' : 'Payment & Dates'}
                    </button>

                    {(order.balanceDue !== undefined ? order.balanceDue : order.pendingAmount) > 0 && (
                      <button
                        type="button"
                        className="orders__trans-btn advance orders__trans-btn--paid"
                        onClick={(e) => handleMarkOrderPaid(order, e)}
                      >
                        <CheckCircle size={16} /> {language === 'hi' ? 'भुगतान दर्ज करें' : 'Mark Paid'}
                      </button>
                    )}

                    {isCompleted && (
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', paddingTop: '4px' }}>
                        <CheckCircle size={16} /> Order Completed & Closed
                      </span>
                    )}
                  </div>
                </div>

                <div className="orders__card-target-date">
                  <Clock size={12} />
                  <span>
                    Target Completion: {(() => {
                      if (!order) return 'N/A';
                      const targetDateVal = order.deliveryDate || order.createdAt || order.orderDate;
                      if (!targetDateVal) return 'N/A';
                      try {
                        const d = new Date(targetDateVal);
                        if (isNaN(d.getTime())) return 'N/A';
                        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                      } catch (e) {
                        return 'N/A';
                      }
                    })()}
                  </span>
                  {(() => {
                    if (!order || !order.deliveryDate || ['completed', 'delivered', 'cancelled'].includes(order.status)) return null;
                    try {
                      const d = new Date(order.deliveryDate);
                      if (isNaN(d.getTime())) return null;
                      const todayStr = new Date().toISOString().slice(0, 10);
                      const targetStr = d.toISOString().slice(0, 10);
                      if (targetStr === todayStr) return <span className="orders__due-badge orders__due-badge--today">Due Today</span>;
                      if (targetStr < todayStr) return <span className="orders__due-badge orders__due-badge--overdue">Overdue</span>;
                    } catch (e) {
                      return null;
                    }
                    return null;
                  })()}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Interactive Instant Bill Generator Modal */}
      {activeBillOrder && activeBill && (
        <div className="modal-overlay" onClick={() => setActiveBillOrder(null)}>
          <div className="modal animate-scale-in billing-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '780px' }}>
            <div className="modal__header">
              <div>
                <h2>Instant Bill — Token #{activeBillOrder.tokenNumber || 'T-100'}</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {activeBillOrder.customerName} ({activeBillOrder.orderNumber})
                </p>
              </div>
              <button className="modal__close" onClick={() => setActiveBillOrder(null)}><X size={20} /></button>
            </div>

            <div className="modal__body billing-modal__body">
              {/* Per-Dress Rate & Quantity Editor */}
              <div className="orders__bill-items-editor">
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
                        onChange={(e) => handleBillItemChange(idx, 'qty', e.target.value)}
                      />
                      <label>Rate (₹):</label>
                      <input
                        type="number"
                        style={{ width: '100px' }}
                        value={item.price}
                        onChange={(e) => handleBillItemChange(idx, 'price', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Dual Discount Mode (% vs ₹) & Extra Modifiers */}
              <div className="billing-modal__modifiers">
                <div className="modal__field">
                  <label>Discount Mode</label>
                  <select value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
                    <option value="amount">Flat Amount (₹)</option>
                    <option value="percent">Percentage (%)</option>
                  </select>
                </div>
                <div className="modal__field">
                  <label>Discount {discountType === 'percent' ? '(%)' : '(₹)'}</label>
                  <input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                    min="0"
                  />
                </div>
                <div className="modal__field">
                  <label>Extra Charges (₹)</label>
                  <input
                    type="number"
                    value={billExtraCharges}
                    onChange={(e) => setBillExtraCharges(parseFloat(e.target.value) || 0)}
                    min="0"
                  />
                </div>
                <div className="modal__field">
                  <label>Receive Payment Now (₹)</label>
                  <input
                    type="number"
                    placeholder="Enter payment..."
                    value={additionalPayment}
                    onChange={(e) => setAdditionalPayment(parseFloat(e.target.value) || 0)}
                    min="0"
                  />
                </div>
              </div>

              {/* Target Invoice Template Preview */}
              {activeBillInvoiceData && (
                <div style={{ marginTop: '16px' }}>
                  <InvoiceTemplate invoice={activeBillInvoiceData} />
                </div>
              )}

              <div className="modal__actions">
                <button type="button" className="modal__btn modal__btn--secondary" onClick={handleApplyBillPayment}>
                  Save Payment & Rates
                </button>
                <button
                  type="button"
                  className="modal__btn modal__btn--primary"
                  onClick={() => {
                    handleApplyBillPayment();
                    if (activeBillInvoiceData) {
                      printInvoiceHTML(activeBillInvoiceData);
                    }
                  }}
                >
                  <Printer size={16} /> Print Bill Immediately
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Order & Token Entry Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal animate-scale-in" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
            <div className="modal__header">
              <h2>New Custom Order & Token Generation</h2>
              <button className="modal__close" onClick={() => setShowAddModal(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateOrder} className="modal__body">
              {/* Customer Mode Selection */}
              <div className="orders__cust-mode-selector">
                <button
                  type="button"
                  className={`orders__mode-btn ${customerMode === 'existing' ? 'active' : ''}`}
                  onClick={() => handleCustomerModeSwitch('existing')}
                >
                  Select Existing Customer
                </button>
                <button
                  type="button"
                  className={`orders__mode-btn ${customerMode === 'new' ? 'active' : ''}`}
                  onClick={() => handleCustomerModeSwitch('new')}
                >
                  + Add New Customer Inline
                </button>
              </div>

              {customerMode === 'existing' ? (
                <div className="modal__field" style={{ position: 'relative' }}>
                  <label>Search & Select Customer *</label>
                  <div className="orders__cust-search-box">
                    <Search size={16} className="orders__cust-search-icon" />
                    <input
                      type="text"
                      placeholder="Type customer name or mobile number to search..."
                      value={custSearchQuery}
                      onChange={(e) => {
                        setCustSearchQuery(e.target.value);
                        setShowCustDropdown(true);
                      }}
                      onFocus={() => setShowCustDropdown(true)}
                      className="orders__cust-search-input"
                    />
                    {selectedCustId && (
                      <button
                        type="button"
                        className="orders__cust-clear-btn"
                        onClick={() => {
                          setSelectedCustId('');
                          setCustSearchQuery('');
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Customer Search Autocomplete Suggestions Dropdown */}
                  {showCustDropdown && (
                    <div className="orders__cust-dropdown">
                      {filteredCustomersList.length === 0 ? (
                        <div className="orders__cust-dropdown-item empty">
                          No customer found matching "{custSearchQuery}". Click "+ Add New Customer Inline" above to create one.
                        </div>
                      ) : (
                        filteredCustomersList.map(c => (
                          <div
                            key={c._id}
                            className={`orders__cust-dropdown-item ${selectedCustId === c._id ? 'selected' : ''}`}
                            onClick={() => {
                              handleSelectCustomerForNewOrder(c._id);
                              setCustSearchQuery(`${c.name} (${c.mobile})`);
                              setShowCustDropdown(false);
                            }}
                          >
                            <div className="orders__cust-avatar-sm">
                              {c.name ? c.name.charAt(0) : 'C'}
                            </div>
                            <div>
                              <div className="orders__cust-name-sm">{c.name}</div>
                              <div className="orders__cust-meta-sm">{c.mobile} • {c.address}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="modal__grid">
                    <div className="modal__field">
                      <label>Customer Full Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Rajesh Verma"
                        value={newCustName}
                        onChange={(e) => {
                          setNewCustName(e.target.value);
                          setDismissDuplicateNotice(false);
                        }}
                        required
                      />
                    </div>
                    <div className="modal__field">
                      <label>Mobile Number *</label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <select
                          value={newCustCountryCode}
                          onChange={(e) => setNewCustCountryCode(e.target.value)}
                          style={{ width: '95px', padding: '6px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 600 }}
                        >
                          {COUNTRY_PREFIXES.map(p => (
                            <option key={p.code} value={p.code}>{p.code}</option>
                          ))}
                          <option value="custom">Other</option>
                        </select>
                        <input
                          type="text"
                          placeholder="e.g. 9876543210"
                          style={{ flex: 1 }}
                          value={newCustMobile}
                          onChange={(e) => {
                            setNewCustMobile(e.target.value);
                            setDismissDuplicateNotice(false);
                          }}
                          onBlur={handleMobileBlur}
                          required
                        />
                      </div>
                    </div>
                    <div className="modal__field" style={{ gridColumn: '1 / -1' }}>
                      <label>Address</label>
                      <input
                        type="text"
                        placeholder="Address..."
                        value={newCustAddress}
                        onChange={(e) => setNewCustAddress(e.target.value)}
                      />
                    </div>
                  </div>

                  {matchedExistingCustomer && (
                    <div className="orders__duplicate-alert animate-fade-in">
                      <div className="orders__duplicate-icon">ℹ️</div>
                      <div className="orders__duplicate-text">
                        <h4>{language === 'hi' ? 'मौजूदा ग्राहक रिकॉर्ड मिला!' : 'Existing Customer Record Found!'}</h4>
                        <p>
                          "{matchedExistingCustomer.name}" ({matchedExistingCustomer.mobile}) {language === 'hi' ? 'डेटाबेस में पहले से मौजूद है।' : 'is already in your customer database.'}
                        </p>
                        <div className="orders__duplicate-btns">
                          <button
                            type="button"
                            className="modal__btn modal__btn--primary"
                            style={{ fontSize: '12px', padding: '6px 12px' }}
                            onClick={() => {
                              handleCustomerModeSwitch('existing');
                              handleSelectCustomerForNewOrder(matchedExistingCustomer._id);
                              setCustSearchQuery(`${matchedExistingCustomer.name} (${matchedExistingCustomer.mobile})`);
                            }}
                          >
                            ✓ {language === 'hi' ? `मौजूदा प्रोफाइल चुनें (${matchedExistingCustomer.name})` : `Use Existing Customer (${matchedExistingCustomer.name})`}
                          </button>
                          <span className="orders__duplicate-hint">
                            {language === 'hi' ? 'या परिवार के नए सदस्य का नया रिकॉर्ड बनाने के लिए फ़ॉर्म भरना जारी रखें।' : '(Or continue filling below to create new entry with same phone number)'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="modal__grid" style={{ marginBottom: '16px' }}>
                <div className="modal__field">
                  <label>Order Priority</label>
                  <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="modal__field">
                  <label>Target Completion Date * <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>(Internal Shop Target)</span></label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    required
                  />
                </div>

                <div className="modal__field" style={{ gridColumn: '1 / -1' }}>
                  <label>Token Money / Advance Paid (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={advancePaid}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setAdvancePaid(e.target.value)}
                  />
                </div>
              </div>

              {/* 1. Collapsible Measurements & Sizes Section at the very top */}
              {(() => {
                const safeActiveIdx = Math.min(activeMeasItemIdx, Math.max(0, orderItems.length - 1));
                const activeItem = orderItems[safeActiveIdx] || orderItems[0];
                const activeCategoryConfig = getCategoryConfig(activeItem?.category);
                const activeFields = activeCategoryConfig?.fields || [];
                const selectedCustObj = customers.find(c => c._id === selectedCustId);
                const isExistingSelected = customerMode === 'existing' && selectedCustObj;

                // Count total filled measurements across all items for header badge
                const totalFilledCount = orderItems.reduce((acc, it) => {
                  return acc + Object.keys(it.measurements || {}).filter(k => String(it.measurements[k] || '').trim().length > 0).length;
                }, 0);

                return (
                  <div className="orders__measurements-section">
                    <div
                      className="orders__measurements-header"
                      onClick={() => setMeasExpanded(!measExpanded)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="orders__meas-title-wrap">
                        <Ruler size={16} className="orders__meas-icon" />
                        <span>Measurements & Sizes</span>
                        <span className="orders__meas-meta-badge">
                          {totalFilledCount > 0
                            ? `${totalFilledCount} size${totalFilledCount > 1 ? 's' : ''} entered`
                            : (measExpanded ? 'Enter body sizes' : 'Tap to expand')}
                        </span>
                      </div>
                      <div className="orders__meas-header-right">
                        <span className="orders__meas-toggle-hint">
                          {measExpanded ? 'Collapse' : 'Expand'}
                        </span>
                        {measExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>

                    {measExpanded && (
                      <div className="orders__measurements-body animate-fade-in">
                        {/* Garment Tabs when multiple order items/fabrics exist */}
                        {orderItems.length > 1 && (
                          <div className="orders__meas-tabs-wrapper">
                            <span className="orders__meas-tabs-label">Select garment to edit sizes:</span>
                            <div className="orders__meas-garment-tabs">
                              {orderItems.map((it, idx) => {
                                const itCat = getGarmentConfig(it.category);
                                const itFilled = Object.keys(it.measurements || {}).filter(k => String(it.measurements[k] || '').trim().length > 0).length;
                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    className={`orders__meas-tab-btn ${safeActiveIdx === idx ? 'active' : ''}`}
                                    onClick={() => setActiveMeasItemIdx(idx)}
                                  >
                                    #{idx + 1} {itCat.shortLabel || it.name}
                                    {it.subtype ? ` (${it.subtype})` : ''}
                                    {itFilled > 0 && <span className="orders__tab-meas-pill">{itFilled}</span>}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Active Garment Context & Autofill Badge */}
                        <div className="orders__active-meas-info">
                          <span className="orders__active-meas-title">
                            {activeCategoryConfig?.label || activeItem.name} Sizes
                            {isExistingSelected ? ` • ${selectedCustObj.name}` : ''}
                          </span>
                          {activeItem.isAutoFilled && isExistingSelected ? (
                            <span className="orders__auto-fill-badge">
                              <Sparkles size={11} /> Auto-filled from customer profile
                            </span>
                          ) : (
                            <span className="orders__new-cust-meas-badge">
                              {isExistingSelected ? 'Saved with this order' : 'New Customer Sizes'}
                            </span>
                          )}
                        </div>

                        {/* Garment-Specific Measurement Inputs Grid */}
                        <div className="orders__item-meas-grid-labeled">
                          {activeFields.map(f => (
                            <div key={f.key} className="orders__item-meas-field-box">
                              <label>{f.label} {f.unit ? `(${f.unit})` : ''}</label>
                              <input
                                type="text"
                                placeholder={f.unit === 'text' ? 'Notes...' : 'e.g. 34'}
                                value={activeItem.measurements?.[f.key] || ''}
                                onChange={(e) => handleItemMeasurementChange(safeActiveIdx, f.key, e.target.value)}
                              />
                            </div>
                          ))}

                          {/* Custom Key-Value Body Parts Added to this Item */}
                          {Object.keys(activeItem.measurements || {})
                            .filter(k => !activeFields.some(f => f.key === k))
                            .map(customKey => (
                              <div key={customKey} className="orders__item-meas-field-box orders__custom-size-box">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <label style={{ color: '#b45309', fontWeight: 700 }}>✨ {customKey}:</label>
                                  <button
                                    type="button"
                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '11px', padding: 0 }}
                                    onClick={() => {
                                      const copyMeas = { ...(activeItem.measurements || {}) };
                                      delete copyMeas[customKey];
                                      const updated = [...orderItems];
                                      updated[safeActiveIdx].measurements = copyMeas;
                                      setOrderItems(updated);
                                    }}
                                    title="Delete custom size"
                                  >
                                    ✕
                                  </button>
                                </div>
                                <input
                                  type="text"
                                  placeholder="Size value..."
                                  value={activeItem.measurements?.[customKey] || ''}
                                  onChange={(e) => handleItemMeasurementChange(safeActiveIdx, customKey, e.target.value)}
                                />
                              </div>
                            ))}
                        </div>

                        {/* Working "+ Add New Size" Feature */}
                        <div className="orders__add-size-block">
                          {!showAddNewSize ? (
                            <button
                              type="button"
                              className="orders__add-new-size-btn"
                              onClick={() => setShowAddNewSize(true)}
                            >
                              <Plus size={14} /> + Add New Size
                            </button>
                          ) : (
                            <div className="orders__add-new-size-form animate-fade-in">
                              <div className="orders__add-size-inputs">
                                <input
                                  type="text"
                                  placeholder="Size Name (e.g. Wrist, Back Depth, Slit)..."
                                  value={newSizeName}
                                  onChange={(e) => setNewSizeName(e.target.value)}
                                  autoFocus
                                  className="orders__add-size-name-input"
                                />
                                <input
                                  type="text"
                                  placeholder="Value (e.g. 14 in)..."
                                  value={newSizeVal}
                                  onChange={(e) => setNewSizeVal(e.target.value)}
                                  className="orders__add-size-val-input"
                                />
                              </div>
                              <div className="orders__add-size-actions">
                                <button
                                  type="button"
                                  className="modal__btn modal__btn--primary"
                                  style={{ padding: '5px 14px', fontSize: '12px' }}
                                  onClick={() => {
                                    const cleanName = newSizeName.trim();
                                    if (!cleanName) {
                                      alert('Please enter a measurement name (e.g. Wrist, Slit)');
                                      return;
                                    }
                                    handleItemMeasurementChange(safeActiveIdx, cleanName, newSizeVal.trim());
                                    setNewSizeName('');
                                    setNewSizeVal('');
                                    setShowAddNewSize(false);
                                  }}
                                >
                                  ✓ Save Size
                                </button>
                                <button
                                  type="button"
                                  className="modal__btn modal__btn--secondary"
                                  style={{ padding: '5px 10px', fontSize: '12px' }}
                                  onClick={() => {
                                    setNewSizeName('');
                                    setNewSizeVal('');
                                    setShowAddNewSize(false);
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 2. Fabrics & Order Items Selection Area (Below Measurements & Sizes) */}
              <div className="orders__fabrics-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'var(--color-navy-700)' }}>
                    👗 Fabrics & Garments ({orderItems.length})
                  </h4>
                  <button type="button" className="orders__add-fabric-btn" onClick={handleAddItem}>
                    <Plus size={13} /> + Add Fabric
                  </button>
                </div>

                {orderItems.map((item, idx) => {
                  const gConfig = getGarmentConfig(item.category);
                  const availableSubtypes = gConfig.subtypes || [];
                  const filledCount = Object.keys(item.measurements || {}).filter(k => String(item.measurements[k] || '').trim().length > 0).length;

                  return (
                    <div key={idx} className="orders__fabric-card">
                      <div className="orders__fabric-row-top">
                        {/* Garment Category Dropdown */}
                        <select
                          className="orders__fabric-select-cat"
                          value={item.category}
                          onChange={(e) => handleItemCategoryChange(idx, e.target.value)}
                        >
                          {GARMENT_CATEGORIES.map((cat) => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                          ))}
                        </select>

                        {/* Garment Subtype Dropdown */}
                        {availableSubtypes.length > 0 && (
                          <select
                            className="orders__fabric-select-subtype"
                            value={item.subtype || availableSubtypes[0]}
                            onChange={(e) => handleItemSubtypeChange(idx, e.target.value)}
                          >
                            {availableSubtypes.map((sub) => (
                              <option key={sub} value={sub}>{sub}</option>
                            ))}
                          </select>
                        )}

                        {/* Item Name / Fabric Description Input */}
                        <input
                          type="text"
                          className="orders__fabric-desc-input"
                          placeholder="Fabric / Garment Name (e.g. Cotton Suit)..."
                          value={item.name}
                          onChange={(e) => {
                            const updated = [...orderItems];
                            updated[idx].name = e.target.value;
                            setOrderItems(updated);
                          }}
                          required
                        />
                      </div>

                      <div className="orders__fabric-row-bottom">
                        <div className="orders__fabric-num-field">
                          <label>Qty:</label>
                          <input
                            type="number"
                            min="1"
                            style={{ width: '55px' }}
                            value={item.qty}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const updated = [...orderItems];
                              updated[idx].qty = parseInt(e.target.value) || 1;
                              setOrderItems(updated);
                            }}
                          />
                        </div>

                        <div className="orders__fabric-num-field">
                          <label>Rate (₹):</label>
                          <input
                            type="number"
                            placeholder={item.category === 'other' ? 'Custom' : '0'}
                            style={{ width: '85px' }}
                            value={item.price === 0 ? '' : item.price}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const updated = [...orderItems];
                              updated[idx].price = e.target.value === '' ? 0 : parseFloat(e.target.value);
                              setOrderItems(updated);
                            }}
                          />
                        </div>

                        <div className="orders__fabric-item-total">
                          Total: <strong>₹{(item.qty * (item.price || 0)).toLocaleString('en-IN')}</strong>
                        </div>

                        <input
                          type="text"
                          className="orders__fabric-notes-input"
                          placeholder="Fabric / stitching notes..."
                          value={item.notes || ''}
                          onChange={(e) => {
                            const updated = [...orderItems];
                            updated[idx].notes = e.target.value;
                            setOrderItems(updated);
                          }}
                        />

                        {orderItems.length > 1 && (
                          <button
                            type="button"
                            className="orders__fabric-delete-btn"
                            onClick={() => handleRemoveItem(idx)}
                            title="Remove fabric"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* Quick Jump to Measurements for this Garment */}
                      <div className="orders__fabric-meas-summary">
                        <button
                          type="button"
                          className="orders__fabric-meas-link"
                          onClick={() => {
                            setActiveMeasItemIdx(idx);
                            setMeasExpanded(true);
                          }}
                        >
                          <Ruler size={11} />
                          {filledCount > 0 ? `${filledCount} sizes recorded` : 'No sizes entered yet'}
                          <span style={{ textDecoration: 'underline', marginLeft: '4px' }}>
                            (Tap to view/edit sizes)
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="modal__actions">
                <button type="button" className="modal__btn modal__btn--secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="modal__btn modal__btn--primary">Create Order & Issue Token</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Instant Edit Order Modal */}
      {showEditModal && editingOrder && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal animate-scale-in" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px' }}>
            <div className="modal__header">
              <div>
                <h2>✏️ Edit Order #{editingOrder.tokenNumber || editingOrder.orderNumber}</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Customer: <strong>{editingOrder.customerName}</strong> ({editingOrder.customerMobile})
                </p>
              </div>
              <button className="modal__close" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <div className="modal__body">
              <div className="modal__field" style={{ marginBottom: '12px' }}>
                <label>Order Status</label>
                <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                  <option value="pending">Pending</option>
                  <option value="preparing">Preparing</option>
                  <option value="ready">Ready for Pickup</option>
                  <option value="completed">Completed & Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* 1. Collapsible Measurements & Sizes Section at the very top of Edit Modal */}
              {(() => {
                const safeEditIdx = Math.min(editActiveMeasIdx, Math.max(0, editItems.length - 1));
                const activeEditItem = editItems[safeEditIdx] || editItems[0];
                const activeCategoryConfig = getCategoryConfig(activeEditItem?.category);
                const activeFields = activeCategoryConfig?.fields || [];

                const totalFilledCount = editItems.reduce((acc, it) => {
                  return acc + Object.keys(it.measurements || {}).filter(k => String(it.measurements[k] || '').trim().length > 0).length;
                }, 0);

                return (
                  <div className="orders__measurements-section" style={{ marginBottom: '14px' }}>
                    <div
                      className="orders__measurements-header"
                      onClick={() => setEditMeasExpanded(!editMeasExpanded)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="orders__meas-title-wrap">
                        <Ruler size={16} className="orders__meas-icon" />
                        <span>Measurements & Sizes</span>
                        <span className="orders__meas-meta-badge">
                          {totalFilledCount > 0
                            ? `${totalFilledCount} size${totalFilledCount > 1 ? 's' : ''} entered`
                            : (editMeasExpanded ? 'Enter body sizes' : 'Tap to expand')}
                        </span>
                      </div>
                      <div className="orders__meas-header-right">
                        <span className="orders__meas-toggle-hint">
                          {editMeasExpanded ? 'Collapse' : 'Expand'}
                        </span>
                        {editMeasExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>

                    {editMeasExpanded && (
                      <div className="orders__measurements-body animate-fade-in">
                        {/* Garment Tabs when multiple order items exist */}
                        {editItems.length > 1 && (
                          <div className="orders__meas-tabs-wrapper">
                            <span className="orders__meas-tabs-label">Select garment to edit sizes:</span>
                            <div className="orders__meas-garment-tabs">
                              {editItems.map((it, idx) => {
                                const itCat = getGarmentConfig(it.category);
                                const itFilled = Object.keys(it.measurements || {}).filter(k => String(it.measurements[k] || '').trim().length > 0).length;
                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    className={`orders__meas-tab-btn ${safeEditIdx === idx ? 'active' : ''}`}
                                    onClick={() => setEditActiveMeasIdx(idx)}
                                  >
                                    #{idx + 1} {itCat.shortLabel || it.name}
                                    {it.subtype ? ` (${it.subtype})` : ''}
                                    {itFilled > 0 && <span className="orders__tab-meas-pill">{itFilled}</span>}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="orders__active-meas-info">
                          <span className="orders__active-meas-title">
                            {activeCategoryConfig?.label || activeEditItem?.name} Sizes • {editingOrder.customerName}
                          </span>
                        </div>

                        {/* Garment-Specific Measurement Inputs Grid */}
                        <div className="orders__item-meas-grid-labeled">
                          {activeFields.map(f => (
                            <div key={f.key} className="orders__item-meas-field-box">
                              <label>{f.label} {f.unit ? `(${f.unit})` : ''}</label>
                              <input
                                type="text"
                                placeholder={f.unit === 'text' ? 'Notes...' : 'e.g. 34'}
                                value={activeEditItem?.measurements?.[f.key] || ''}
                                onChange={(e) => {
                                  const copyMeas = { ...(activeEditItem?.measurements || {}), [f.key]: e.target.value };
                                  handleEditItemChange(safeEditIdx, 'measurements', copyMeas);
                                }}
                              />
                            </div>
                          ))}

                          {/* Custom Key-Value Sizes Added to this Item */}
                          {Object.keys(activeEditItem?.measurements || {})
                            .filter(k => !activeFields.some(f => f.key === k))
                            .map(customKey => (
                              <div key={customKey} className="orders__item-meas-field-box orders__custom-size-box">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <label style={{ color: '#b45309', fontWeight: 700 }}>✨ {customKey}:</label>
                                  <button
                                    type="button"
                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '11px', padding: 0 }}
                                    onClick={() => {
                                      const copyMeas = { ...(activeEditItem?.measurements || {}) };
                                      delete copyMeas[customKey];
                                      handleEditItemChange(safeEditIdx, 'measurements', copyMeas);
                                    }}
                                    title="Delete custom size"
                                  >
                                    ✕
                                  </button>
                                </div>
                                <input
                                  type="text"
                                  placeholder="Size..."
                                  value={activeEditItem?.measurements?.[customKey] || ''}
                                  onChange={(e) => {
                                    const copyMeas = { ...(activeEditItem?.measurements || {}), [customKey]: e.target.value };
                                    handleEditItemChange(safeEditIdx, 'measurements', copyMeas);
                                  }}
                                />
                              </div>
                            ))}
                        </div>

                        {/* Working "+ Add New Size" Feature */}
                        <div className="orders__add-size-block">
                          {!editShowAddNewSize ? (
                            <button
                              type="button"
                              className="orders__add-new-size-btn"
                              onClick={() => setEditShowAddNewSize(true)}
                            >
                              <Plus size={14} /> + Add New Size
                            </button>
                          ) : (
                            <div className="orders__add-new-size-form animate-fade-in">
                              <div className="orders__add-size-inputs">
                                <input
                                  type="text"
                                  placeholder="Size Name (e.g. Wrist, Back Depth, Slit)..."
                                  value={editNewSizeName}
                                  onChange={(e) => setEditNewSizeName(e.target.value)}
                                  autoFocus
                                  className="orders__add-size-name-input"
                                />
                                <input
                                  type="text"
                                  placeholder="Value (e.g. 14 in)..."
                                  value={editNewSizeVal}
                                  onChange={(e) => setEditNewSizeVal(e.target.value)}
                                  className="orders__add-size-val-input"
                                />
                              </div>
                              <div className="orders__add-size-actions">
                                <button
                                  type="button"
                                  className="modal__btn modal__btn--primary"
                                  style={{ padding: '5px 14px', fontSize: '12px' }}
                                  onClick={() => {
                                    const cleanName = editNewSizeName.trim();
                                    if (!cleanName) {
                                      alert('Please enter a measurement name (e.g. Wrist, Slit)');
                                      return;
                                    }
                                    const copyMeas = { ...(activeEditItem?.measurements || {}), [cleanName]: editNewSizeVal.trim() };
                                    handleEditItemChange(safeEditIdx, 'measurements', copyMeas);
                                    setEditNewSizeName('');
                                    setEditNewSizeVal('');
                                    setEditShowAddNewSize(false);
                                  }}
                                >
                                  ✓ Save Size
                                </button>
                                <button
                                  type="button"
                                  className="modal__btn modal__btn--secondary"
                                  style={{ padding: '5px 10px', fontSize: '12px' }}
                                  onClick={() => {
                                    setEditNewSizeName('');
                                    setEditNewSizeVal('');
                                    setEditShowAddNewSize(false);
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 2. Fabrics & Garments Section (Below Measurements & Sizes) */}
              <div className="orders__fabrics-section" style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-navy-700)', margin: 0 }}>
                    👗 Garments & Fabrics ({editItems.length}):
                  </h4>
                  <button
                    type="button"
                    className="orders__add-fabric-btn"
                    onClick={handleAddEditItem}
                  >
                    <Plus size={13} /> {language === 'hi' ? '+ नया कपड़ा जोड़ें' : '+ Add Fabric'}
                  </button>
                </div>

                {editItems.map((item, idx) => {
                  const gConfig = getGarmentConfig(item.category);
                  const availableSubtypes = gConfig.subtypes || [];
                  const filledCount = Object.keys(item.measurements || {}).filter(k => String(item.measurements[k] || '').trim().length > 0).length;

                  return (
                    <div key={idx} className="orders__fabric-card">
                      <div className="orders__fabric-row-top">
                        <select
                          className="orders__fabric-select-cat"
                          value={item.category || 'suit'}
                          onChange={(e) => handleEditItemCategoryChange(idx, e.target.value)}
                        >
                          {GARMENT_CATEGORIES.map((cat) => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                          ))}
                        </select>

                        {availableSubtypes.length > 0 && (
                          <select
                            className="orders__fabric-select-subtype"
                            value={item.subtype || availableSubtypes[0]}
                            onChange={(e) => handleEditItemSubtypeChange(idx, e.target.value)}
                          >
                            {availableSubtypes.map((sub) => (
                              <option key={sub} value={sub}>{sub}</option>
                            ))}
                          </select>
                        )}

                        <input
                          type="text"
                          className="orders__fabric-desc-input"
                          value={item.name}
                          onChange={(e) => handleEditItemChange(idx, 'name', e.target.value)}
                          placeholder="Garment / Fabric Description..."
                          required
                        />
                      </div>

                      <div className="orders__fabric-row-bottom">
                        <div className="orders__fabric-num-field">
                          <label>Qty:</label>
                          <input
                            type="number"
                            min="1"
                            style={{ width: '55px' }}
                            value={item.qty}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => handleEditItemChange(idx, 'qty', Number(e.target.value) || 1)}
                          />
                        </div>

                        <div className="orders__fabric-num-field">
                          <label>Rate (₹):</label>
                          <input
                            type="number"
                            style={{ width: '85px' }}
                            value={item.price === 0 ? '' : item.price}
                            placeholder={item.category === 'other' ? 'Custom' : '0'}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => handleEditItemChange(idx, 'price', e.target.value === '' ? 0 : Number(e.target.value))}
                          />
                        </div>

                        <div className="orders__fabric-item-total">
                          Total: <strong>₹{((Number(item.qty) || 1) * (Number(item.price) || 0)).toLocaleString('en-IN')}</strong>
                        </div>

                        <input
                          type="text"
                          className="orders__fabric-notes-input"
                          placeholder="Stitching notes..."
                          value={item.notes || ''}
                          onChange={(e) => handleEditItemChange(idx, 'notes', e.target.value)}
                        />

                        {editItems.length > 1 && (
                          <button
                            type="button"
                            className="orders__fabric-delete-btn"
                            onClick={() => handleRemoveEditItem(idx)}
                            title="Remove item"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* Quick Jump to Measurements for this Garment */}
                      <div className="orders__fabric-meas-summary">
                        <button
                          type="button"
                          className="orders__fabric-meas-link"
                          onClick={() => {
                            setEditActiveMeasIdx(idx);
                            setEditMeasExpanded(true);
                          }}
                        >
                          <Ruler size={11} />
                          {filledCount > 0 ? `${filledCount} sizes recorded` : 'No sizes entered yet'}
                          <span style={{ textDecoration: 'underline', marginLeft: '4px' }}>
                            (Tap to view/edit sizes)
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="modal__grid" style={{ marginBottom: '12px' }}>
                <div className="modal__field">
                  <label>Total Amount (₹)</label>
                  <input
                    type="number"
                    value={editTotalAmount === 0 ? '' : editTotalAmount}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setEditTotalAmount(e.target.value === '' ? 0 : Number(e.target.value))}
                  />
                </div>
                <div className="modal__field">
                  <label>Advance Amount Paid (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={editAdvancePaid}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setEditAdvancePaid(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal__field" style={{ marginBottom: '12px' }}>
                <label>Target Delivery Date</label>
                <input
                  type="date"
                  value={editDeliveryDate}
                  onChange={(e) => setEditDeliveryDate(e.target.value)}
                />
              </div>

              <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span>Calculated Balance Due:</span>
                <strong style={{ color: Math.max(0, editTotalAmount - (parseFloat(editAdvancePaid) || 0)) > 0 ? '#dc2626' : '#16a34a' }}>
                  ₹ {Math.max(0, editTotalAmount - (parseFloat(editAdvancePaid) || 0)).toLocaleString('en-IN')}
                </strong>
              </div>

              <div className="modal__actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <button
                  type="button"
                  className="modal__btn"
                  style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={(e) => handleDeleteOrder(editingOrder, e)}
                >
                  <Trash2 size={15} /> {language === 'hi' ? 'ऑर्डर डिलीट करें' : 'Delete Order'}
                </button>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="modal__btn modal__btn--secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                  <button type="button" className="modal__btn modal__btn--primary" onClick={handleSaveEditedOrder}>Save Order Changes</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment History & Date Adjustment Modal */}
      <PaymentHistoryModal
        isOpen={!!paymentHistoryOrder}
        onClose={() => setPaymentHistoryOrder(null)}
        order={paymentHistoryOrder ? (orders.find(o => o._id === paymentHistoryOrder._id || o.orderNumber === paymentHistoryOrder.orderNumber) || paymentHistoryOrder) : null}
      />

      {/* Customer Edit Details & Measurements Modal */}
      <CustomerEditModal
        customerData={editingCustomerData}
        isOpen={!!editingCustomerData}
        onClose={() => setEditingCustomerData(null)}
        onStartNewOrder={(cust) => {
          setEditingCustomerData(null);
          handleSelectCustomerForNewOrder(cust._id);
          setShowAddModal(true);
        }}
      />
      {/* Centered App-Themed Order Delete Confirmation Modal */}
      {orderToDelete && (
        <div
          className="modal-overlay"
          onClick={() => !isDeletingOrder && setOrderToDelete(null)}
          style={{ zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div
            className="modal animate-scale-in"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '440px',
              width: '92%',
              padding: 0,
              overflow: 'hidden',
              borderRadius: '16px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div style={{ padding: '28px 24px 20px 24px', textAlign: 'center' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: '#fef2f2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                  border: '1px solid #fecaca',
                }}
              >
                <Trash2 size={26} />
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
                {language === 'hi' ? 'क्या आप यह ऑर्डर हटाना चाहते हैं?' : 'Delete This Order?'}
              </h3>

              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 16px 0' }}>
                {language === 'hi'
                  ? `क्या आप वाकई ${orderToDelete.tokenNumber ? `Token #${orderToDelete.tokenNumber}` : orderToDelete.orderNumber} (${orderToDelete.customerName}) को डेटाबेस से डिलीट करना चाहते हैं? केवल यही विशिष्ट ऑर्डर हटाया जाएगा।`
                  : `Are you sure you want to delete ${orderToDelete.tokenNumber ? `Token #${orderToDelete.tokenNumber}` : orderToDelete.orderNumber} (${orderToDelete.customerName}) from your database? Only this specific order will be deleted.`}
              </p>

              {/* Order Info Card Preview */}
              <div
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  textAlign: 'left',
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '2px 8px', borderRadius: '12px', fontSize: '11px' }}>
                    Token #{orderToDelete.tokenNumber || '—'}
                  </span>
                  <span style={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>
                    {orderToDelete.orderNumber}
                  </span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '3px' }}>
                  {orderToDelete.customerName}
                </div>
                {orderToDelete.customerMobile && (
                  <div style={{ color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    📞 {orderToDelete.customerMobile}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px dashed var(--border-default)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {orderToDelete.items?.length || 1} item{(orderToDelete.items?.length || 1) > 1 ? 's' : ''}
                  </span>
                  <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '13px' }}>
                    {formatINR(orderToDelete.grandTotal || orderToDelete.totalAmount || orderToDelete.subtotal || 0)}
                  </span>
                </div>
              </div>
            </div>

            <div
              style={{
                padding: '16px 24px',
                background: 'var(--bg-primary)',
                borderTop: '1px solid var(--border-default)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
              }}
            >
              <button
                type="button"
                className="modal__btn modal__btn--secondary"
                onClick={() => setOrderToDelete(null)}
                disabled={isDeletingOrder}
                style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 600 }}
              >
                {language === 'hi' ? 'रद्द करें' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteOrder}
                disabled={isDeletingOrder}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 20px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'white',
                  background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                  border: '1px solid #b91c1c',
                  borderRadius: 'var(--radius-md)',
                  cursor: isDeletingOrder ? 'not-allowed' : 'pointer',
                  opacity: isDeletingOrder ? 0.7 : 1,
                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
                }}
              >
                <Trash2 size={15} />
                <span>
                  {isDeletingOrder
                    ? (language === 'hi' ? 'डिलीट हो रहा है...' : 'Deleting...')
                    : (language === 'hi' ? 'हाँ, डिलीट करें' : 'Delete Order')}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification Banner */}
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
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
