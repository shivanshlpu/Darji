import { useState, useMemo, useEffect, useRef, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, SortAsc, SortDesc, Phone, MessageCircle,
  MoreVertical, Trash2, Eye, X, User, MapPin,
  ChevronDown, ChevronUp, FileText, ClipboardList, ExternalLink, CheckSquare, Square
} from 'lucide-react';
import useCustomerStore from '../store/customerStore';
import useAppStore from '../store/appStore';
import useSettingsStore from '../store/settingsStore';
import { generateCustomerPDF } from '../utils/generateCustomerPDF';
import { compressImage } from '../utils/imageCompressor';
import './Customers.css';

const formatINR = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount || 0);

const formatDate = (dateVal) => {
  if (!dateVal) return '—';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return String(dateVal);
  }
};

export default function Customers() {
  const navigate = useNavigate();
  const {
    customers,
    searchQuery, setSearchQuery, activeFilters, setFilter, clearFilters,
    sortBy, sortOrder, setSort, getFilteredCustomers, addCustomer,
    deleteCustomer, deleteCustomers, fetchCustomersFromDB
  } = useCustomerStore();
  const { orders, fetchOrdersFromDB } = useAppStore();
  const { shopInfo } = useSettingsStore();

  useEffect(() => {
    fetchCustomersFromDB();
    fetchOrdersFromDB();
  }, []);

  const [showAddModal, setShowAddModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(null);
  const [expandedCustomerId, setExpandedCustomerId] = useState(null);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState([]);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    count: 0,
    customerName: '',
    ids: [],
  });
  const masterCheckboxRef = useRef(null);

  // Close 3-dot dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setMenuOpen(null);
    if (menuOpen) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [menuOpen]);

  // Date Filters State: 'all' | 'today' | 'week' | 'month' | 'custom'
  const [dateFilter, setDateFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [customEndDate, setCustomEndDate] = useState(() => {
    return new Date().toISOString().slice(0, 10);
  });

  const [newCustomer, setNewCustomer] = useState({
    name: '', mobile: '', whatsapp: '', address: '', gender: 'male', notes: '', photoUrl: ''
  });

  // Calculate Date Filter Range Boundaries
  const dateRangeBounds = useMemo(() => {
    const now = new Date();
    let start = null;
    let end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (dateFilter === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    } else if (dateFilter === 'week') {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
    } else if (dateFilter === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    } else if (dateFilter === 'custom') {
      start = customStartDate ? new Date(`${customStartDate}T00:00:00`) : null;
      end = customEndDate ? new Date(`${customEndDate}T23:59:59`) : end;
    }

    return { start, end };
  }, [dateFilter, customStartDate, customEndDate]);

  // Period label for PDF header and badges
  const filterPeriodLabel = useMemo(() => {
    if (dateFilter === 'today') {
      return `Today (${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })})`;
    }
    if (dateFilter === 'week') {
      return 'Last 7 Days (This Week)';
    }
    if (dateFilter === 'month') {
      return `This Month (${new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })})`;
    }
    if (dateFilter === 'custom') {
      return `Custom: ${formatDate(customStartDate)} to ${formatDate(customEndDate)}`;
    }
    return 'All Time';
  }, [dateFilter, customStartDate, customEndDate]);

  // Group orders by Customer ID and Customer Name
  const customerOrdersMap = useMemo(() => {
    const map = new Map();
    (orders || []).forEach(o => {
      if (!o || o.status === 'cancelled') return;
      const cIdStr = typeof o.customerId === 'object' && o.customerId !== null ? String(o.customerId._id || '') : String(o.customerId || '');
      const cName = o.customerName ? o.customerName.trim().toLowerCase() : '';

      const append = (key) => {
        if (!key) return;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(o);
      };

      if (cIdStr) append(cIdStr);
      if (cName) append(cName);
    });
    return map;
  }, [orders]);

  // Filter and Enrich Customers with Orders and Date Window
  const filteredCustomers = useMemo(() => {
    const rawList = getFilteredCustomers();
    const { start, end } = dateRangeBounds;

    const enriched = rawList.map(c => {
      const byId = customerOrdersMap.get(String(c._id)) || [];
      const byName = c.name ? (customerOrdersMap.get(c.name.trim().toLowerCase()) || []) : [];
      
      // De-duplicate orders
      const orderLookup = new Map();
      [...byId, ...byName].forEach(o => {
        const key = o._id || o.orderNumber;
        if (key && !orderLookup.has(key)) {
          orderLookup.set(key, o);
        }
      });
      const allCustOrders = Array.from(orderLookup.values());

      // Filter orders by date range if active
      const rangeOrders = allCustOrders.filter(o => {
        if (!start || !end) return true;
        const oDate = new Date(o.orderDate || o.createdAt || o.deliveryDate);
        return !isNaN(oDate.getTime()) && oDate >= start && oDate <= end;
      });

      const totalSpending = allCustOrders.reduce((s, o) => s + (Number(o.grandTotal || o.totalAmount || o.subtotal) || 0), 0);
      const pendingAmount = allCustOrders.reduce((s, o) => s + (Number(o.pendingAmount !== undefined ? o.pendingAmount : (o.balanceDue !== undefined ? o.balanceDue : 0)) || 0), 0);

      return {
        ...c,
        orders: rangeOrders.length > 0 || !start ? (rangeOrders.length > 0 ? rangeOrders : allCustOrders) : [],
        allOrdersCount: allCustOrders.length,
        totalOrders: allCustOrders.length,
        totalSpending,
        pendingAmount,
        hasOrdersInRange: rangeOrders.length > 0,
      };
    });

    let list = enriched;

    // Apply Date Range Filter: include customer if they have orders in range, or their creation/visit date is in range
    if (start && end) {
      list = list.filter(c => {
        if (c.hasOrdersInRange) return true;
        if (c.createdAt) {
          const cDate = new Date(c.createdAt);
          if (!isNaN(cDate.getTime()) && cDate >= start && cDate <= end) return true;
        }
        if (c.lastVisit) {
          const vDate = new Date(c.lastVisit);
          if (!isNaN(vDate.getTime()) && vDate >= start && vDate <= end) return true;
        }
        return false;
      });
    }

    if (activeFilters.pendingOnly) {
      list = list.filter(c => (c.pendingAmount || 0) > 0);
    }

    return list;
  }, [customers, getFilteredCustomers, customerOrdersMap, dateRangeBounds, activeFilters.pendingOnly]);

  // Master Checkbox State
  const isAllSelected = filteredCustomers.length > 0 && selectedCustomerIds.length === filteredCustomers.length;
  const isIndeterminate = selectedCustomerIds.length > 0 && selectedCustomerIds.length < filteredCustomers.length;

  useEffect(() => {
    if (masterCheckboxRef.current) {
      masterCheckboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedCustomerIds([]);
    } else {
      setSelectedCustomerIds(filteredCustomers.map(c => c._id));
    }
  };

  const toggleSelectCustomer = (id, e) => {
    if (e) e.stopPropagation();
    setSelectedCustomerIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const openDeleteModalForSelected = () => {
    if (selectedCustomerIds.length === 0) return;
    const count = selectedCustomerIds.length;
    const singleName = count === 1 ? (filteredCustomers.find(c => c._id === selectedCustomerIds[0])?.name || 'Customer') : '';
    setDeleteModal({
      isOpen: true,
      count,
      customerName: singleName,
      ids: [...selectedCustomerIds],
    });
  };

  const openDeleteModalForCustomer = (cust, e) => {
    if (e) e.stopPropagation();
    setMenuOpen(null);
    setDeleteModal({
      isOpen: true,
      count: 1,
      customerName: cust.name || 'Unnamed Customer',
      ids: [cust._id],
    });
  };

  const handleConfirmDelete = async () => {
    const { ids } = deleteModal;
    if (!ids || ids.length === 0) return;

    if (ids.length === 1) {
      await deleteCustomer(ids[0]);
    } else {
      await deleteCustomers(ids);
    }

    setSelectedCustomerIds(prev => prev.filter(x => !ids.includes(x)));
    if (expandedCustomerId && ids.includes(expandedCustomerId)) {
      setExpandedCustomerId(null);
    }
    setDeleteModal({ isOpen: false, count: 0, customerName: '', ids: [] });
  };

  const toggleExpandCustomer = (customerId) => {
    setExpandedCustomerId(prev => prev === customerId ? null : customerId);
  };

  const handleDownloadPDF = (mode) => {
    generateCustomerPDF(filteredCustomers, {
      mode,
      title: mode === 'detailsOnly' ? 'Customer Details Directory' : 'Customer & Orders Detailed Dossier',
      filterPeriodLabel,
      searchQuery,
      shopInfo,
    });
  };

  const handleDownloadSingleCustomerPDF = (cust, mode, e) => {
    if (e) e.stopPropagation();
    generateCustomerPDF([cust], {
      mode,
      title: mode === 'detailsOnly' ? `${cust.name} - Details` : `${cust.name} - Orders Statement`,
      filterPeriodLabel,
      shopInfo,
    });
  };

  const handleAddCustomer = (e) => {
    e.preventDefault();
    addCustomer(newCustomer);
    setNewCustomer({ name: '', mobile: '', whatsapp: '', address: '', gender: 'male', notes: '', photoUrl: '' });
    setShowAddModal(false);
  };

  return (
    <div className="customers">
      {/* Header */}
      <div className="customers__header">
        <div className="customers__header-left">
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
            👥 Customers
          </h2>
          <p className="customers__count" style={{ marginTop: '2px' }}>
            Showing <strong>{filteredCustomers.length}</strong> customers &bull; Period: <span style={{ color: 'var(--color-gold-500)', fontWeight: 700 }}>{filterPeriodLabel}</span>
          </p>
        </div>

        <div className="customers__header-right">
          {/* Search by Name or Mobile */}
          <div className="customers__search">
            <Search size={16} className="customers__search-icon" />
            <input
              type="text"
              placeholder="Search by Name or Mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="customers__search-input"
            />
            {searchQuery && (
              <button className="customers__search-clear" onClick={() => setSearchQuery('')}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* Dual PDF Download Buttons - Cohesive and Elegant */}
          <button
            type="button"
            className="customers__pdf-btn"
            onClick={() => handleDownloadPDF('detailsOnly')}
            title="Download Customer Details (Name, Mobile, Address) in a structured table"
          >
            <FileText size={16} className="customers__pdf-icon" />
            <span>Details (PDF)</span>
          </button>

          <button
            type="button"
            className="customers__pdf-btn"
            onClick={() => handleDownloadPDF('withOrders')}
            title="Download Full Customer Dossier with all Order details in tables"
          >
            <ClipboardList size={16} className="customers__pdf-icon" />
            <span>With Orders (PDF)</span>
          </button>

          {/* Add Customer Button */}
          <button className="customers__add-btn" onClick={() => setShowAddModal(true)}>
            <Plus size={18} />
            Add Customer
          </button>
        </div>
      </div>

      {/* Date Filter & Pending Toggle Bar */}
      <div className="customers__date-bar">
        <div className="customers__date-tabs">
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginRight: '4px' }}>
            📅 Filter Date:
          </span>
          <button
            type="button"
            className={`customers__date-tab ${dateFilter === 'all' ? 'customers__date-tab--active' : ''}`}
            onClick={() => setDateFilter('all')}
          >
            All Time
          </button>
          <button
            type="button"
            className={`customers__date-tab ${dateFilter === 'today' ? 'customers__date-tab--active' : ''}`}
            onClick={() => setDateFilter('today')}
          >
            Today (Day)
          </button>
          <button
            type="button"
            className={`customers__date-tab ${dateFilter === 'week' ? 'customers__date-tab--active' : ''}`}
            onClick={() => setDateFilter('week')}
          >
            This Week
          </button>
          <button
            type="button"
            className={`customers__date-tab ${dateFilter === 'month' ? 'customers__date-tab--active' : ''}`}
            onClick={() => setDateFilter('month')}
          >
            This Month
          </button>
          <button
            type="button"
            className={`customers__date-tab ${dateFilter === 'custom' ? 'customers__date-tab--active' : ''}`}
            onClick={() => setDateFilter('custom')}
          >
            Custom Range
          </button>
        </div>

        {/* Pending Due Only Filter Toggle */}
        <div className="customers__date-extra">
          <label className={`customers__pending-toggle ${activeFilters.pendingOnly ? 'customers__pending-toggle--active' : ''}`}>
            <input
              type="checkbox"
              checked={activeFilters.pendingOnly}
              onChange={(e) => setFilter('pendingOnly', e.target.checked)}
            />
            <span>Pending Due Only</span>
          </label>
        </div>

        {/* Custom Date Range Pickers */}
        {dateFilter === 'custom' && (
          <div className="customers__custom-dates animate-fade-in" style={{ width: '100%', marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed var(--border-default)' }}>
            <span>From:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="customers__custom-date-input"
            />
            <span>To:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="customers__custom-date-input"
            />
          </div>
        )}
      </div>

      {/* Floating Selection & Bulk Action Bar */}
      {selectedCustomerIds.length > 0 && (
        <div className="customers__selection-bar animate-fade-in">
          <div className="customers__selection-left">
            <span className="customers__selection-badge">
              ✓ <strong>{selectedCustomerIds.length}</strong> {selectedCustomerIds.length === 1 ? 'customer' : 'customers'} selected
            </span>
            <button
              type="button"
              className="customers__selection-clear-btn"
              onClick={() => setSelectedCustomerIds([])}
            >
              Deselect All
            </button>
          </div>
          <div className="customers__selection-right">
            <button
              type="button"
              className="customers__selection-delete-btn"
              onClick={openDeleteModalForSelected}
              title="Delete all selected customers"
            >
              <Trash2 size={15} />
              <span>Delete Selected ({selectedCustomerIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Customer Table */}
      <div className="customers__table-card">
        <div className="customers__table-wrapper">
          <table className="customers__table">
            <thead>
              <tr>
                <th style={{ width: '56px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <input
                      type="checkbox"
                      ref={masterCheckboxRef}
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      title="Select / Deselect All Customers"
                      style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--color-gold-500)' }}
                    />
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>#</span>
                  </div>
                </th>
                <th className="customers__th-sortable" onClick={() => setSort('name')}>
                  <div className="customers__th-inner">
                    <span>CUSTOMER NAME</span>
                    {sortBy === 'name' && (sortOrder === 'asc' ? <SortAsc size={13} /> : <SortDesc size={13} />)}
                  </div>
                </th>
                <th>
                  <div className="customers__th-inner">
                    <span>PHONE / MOBILE</span>
                  </div>
                </th>
                <th>
                  <div className="customers__th-inner">
                    <span>ADDRESS</span>
                  </div>
                </th>
                <th style={{ textAlign: 'center' }}>
                  <div className="customers__th-inner" style={{ justifyContent: 'center' }}>
                    <span>ORDERS</span>
                  </div>
                </th>
                <th className="customers__th-sortable" onClick={() => setSort('totalSpending')}>
                  <div className="customers__th-inner">
                    <span>TOTAL SPENT</span>
                    {sortBy === 'totalSpending' && (sortOrder === 'asc' ? <SortAsc size={13} /> : <SortDesc size={13} />)}
                  </div>
                </th>
                <th className="customers__th-sortable" onClick={() => setSort('pendingAmount')}>
                  <div className="customers__th-inner">
                    <span>PENDING DUE</span>
                    {sortBy === 'pendingAmount' && (sortOrder === 'asc' ? <SortAsc size={13} /> : <SortDesc size={13} />)}
                  </div>
                </th>
                <th style={{ textAlign: 'right', width: '90px' }}>
                  <div className="customers__th-inner" style={{ justifyContent: 'flex-end' }}>
                    <span>ACTIONS</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="customers__empty">
                    <User size={40} />
                    <p>No customers found</p>
                    <span>Try adjusting your search query or date range filters</span>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust, idx) => {
                  const isExpanded = expandedCustomerId === cust._id;
                  const isSelected = selectedCustomerIds.includes(cust._id);
                  const custOrders = cust.orders || [];

                  return (
                    <Fragment key={cust._id}>
                      <tr
                        className={`customers__row ${isExpanded ? 'customers__row--expanded' : ''} ${isSelected ? 'customers__row--selected' : ''}`}
                        onClick={() => toggleExpandCustomer(cust._id)}
                        title="Tap to view all orders for this customer"
                      >
                        <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => toggleSelectCustomer(cust._id, e)}
                              style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--color-gold-500)' }}
                            />
                            <span style={{ color: 'var(--text-tertiary)', fontWeight: 600, fontSize: '12px' }}>{idx + 1}</span>
                          </div>
                        </td>
                        <td>
                          <div className="customers__name-cell">
                            <div className="customers__avatar" data-gender={cust.gender}>
                              {cust.photoUrl ? (
                                <img src={cust.photoUrl} alt={cust.name} />
                              ) : (
                                cust.name ? cust.name.charAt(0).toUpperCase() : 'C'
                              )}
                            </div>
                            <div>
                              <p className="customers__name">{cust.name || 'Unnamed Customer'}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="customers__contact">
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <Phone size={12} style={{ color: 'var(--color-gold-500)' }} />
                              <strong>{cust.mobile || '—'}</strong>
                            </span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', color: 'var(--text-secondary)', fontSize: '12px', maxWidth: '280px' }}>
                            <MapPin size={13} style={{ color: '#0284c7', flexShrink: 0, marginTop: '2px' }} />
                            <span>{cust.address || '—'}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="customers__orders-badge">
                            {custOrders.length} {custOrders.length === 1 ? 'Order' : 'Orders'}
                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </span>
                        </td>
                        <td className="customers__amount">{formatINR(cust.totalSpending)}</td>
                        <td>
                          <span className={`customers__pending ${cust.pendingAmount > 0 ? 'customers__pending--has' : ''}`}>
                            {cust.pendingAmount > 0 ? formatINR(cust.pendingAmount) : '₹0'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="customers__actions" onClick={(e) => e.stopPropagation()}>
                            {/* 3-dot dropdown menu */}
                            <button
                              type="button"
                              className="customers__action-btn"
                              onClick={() => setMenuOpen(menuOpen === cust._id ? null : cust._id)}
                              title="More options"
                            >
                              <MoreVertical size={16} />
                            </button>

                            {menuOpen === cust._id && (
                              <div className="customers__menu animate-scale-in">
                                <button onClick={() => { navigate(`/customers/${cust._id}`); setMenuOpen(null); }}>
                                  <Eye size={14} /> Full Profile
                                </button>
                                <button onClick={(e) => { handleDownloadSingleCustomerPDF(cust, 'detailsOnly', e); setMenuOpen(null); }}>
                                  <FileText size={14} /> Download Details (PDF)
                                </button>
                                <button onClick={(e) => { handleDownloadSingleCustomerPDF(cust, 'withOrders', e); setMenuOpen(null); }}>
                                  <ClipboardList size={14} /> Download with Orders (PDF)
                                </button>
                                <button
                                  className="customers__menu-danger"
                                  onClick={(e) => openDeleteModalForCustomer(cust, e)}
                                >
                                  <Trash2 size={14} /> Delete Customer
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Orders Drawer / Sub-Table */}
                      {isExpanded && (
                        <tr className="customers__expanded-tr">
                          <td colSpan={8} style={{ padding: 0 }}>
                            <div className="customers__expanded-panel animate-fade-in">
                              <div className="customers__expanded-header">
                                <div className="customers__expanded-info">
                                  <h4>All Orders for {cust.name} ({custOrders.length})</h4>
                                  <p>
                                    📞 {cust.mobile || 'No mobile'} &bull; 📍 {cust.address || 'No address'} &bull; Total Billed: <strong>{formatINR(cust.totalSpending)}</strong> &bull; Due: <strong style={{ color: cust.pendingAmount > 0 ? '#dc2626' : '#16a34a' }}>{formatINR(cust.pendingAmount)}</strong>
                                  </p>
                                </div>

                                <div className="customers__expanded-actions">
                                  <button
                                    type="button"
                                    className="customers__single-action-btn"
                                    onClick={(e) => handleDownloadSingleCustomerPDF(cust, 'detailsOnly', e)}
                                    title="Download details only in PDF"
                                  >
                                    <FileText size={13} /> Details PDF
                                  </button>
                                  <button
                                    type="button"
                                    className="customers__single-action-btn customers__single-action-btn--primary"
                                    onClick={(e) => handleDownloadSingleCustomerPDF(cust, 'withOrders', e)}
                                    title="Download full statement with all orders in PDF"
                                  >
                                    <ClipboardList size={13} /> Full Orders PDF
                                  </button>
                                  {cust.mobile && (
                                    <a
                                      href={`https://api.whatsapp.com/send?phone=${cust.mobile.replace(/\D/g, '')}&text=${encodeURIComponent(`Dear ${cust.name || 'Customer'},\n\nThank you for choosing DARJI! We truly appreciate your visit and trust in our service. We look forward to welcoming you again.\n\nWarm regards,\nDARJI`)}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="customers__single-action-btn customers__single-action-btn--wa"
                                      style={{ textDecoration: 'none' }}
                                    >
                                      <MessageCircle size={13} /> WhatsApp
                                    </a>
                                  )}
                                  <button
                                    type="button"
                                    className="customers__single-action-btn"
                                    onClick={() => navigate(`/customers/${cust._id}`)}
                                  >
                                    <ExternalLink size={13} /> Profile Page
                                  </button>
                                </div>
                              </div>

                              {custOrders.length === 0 ? (
                                <div className="customers__subtable-card">
                                  <div className="customers__subtable-empty">
                                    No orders found for this customer in the selected date filter ({filterPeriodLabel}).
                                  </div>
                                </div>
                              ) : (
                                <div className="customers__subtable-card">
                                  <table className="customers__subtable">
                                    <thead>
                                      <tr>
                                        <th>Token / Order #</th>
                                        <th>Date</th>
                                        <th>Garment Items</th>
                                        <th style={{ textAlign: 'right' }}>Total</th>
                                        <th style={{ textAlign: 'right' }}>Paid / Advance</th>
                                        <th style={{ textAlign: 'right' }}>Balance Due</th>
                                        <th>Target Delivery</th>
                                        <th style={{ textAlign: 'center' }}>Status</th>
                                        <th style={{ textAlign: 'center' }}>Payment</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {custOrders.map((ord) => {
                                        const itemsSummary = Array.isArray(ord.items) && ord.items.length > 0
                                          ? ord.items.map(i => `${i.qty || 1}x ${i.name}`).join(', ')
                                          : 'Custom Suit / Garment';
                                        const oTotal = Number(ord.grandTotal || ord.totalAmount || ord.subtotal || 0);
                                        const oPaid = Number(ord.paidAmount !== undefined ? ord.paidAmount : (ord.advancePaid || 0));
                                        const oDue = Number(ord.pendingAmount !== undefined ? ord.pendingAmount : (ord.balanceDue !== undefined ? ord.balanceDue : Math.max(0, oTotal - oPaid)));
                                        const pStatus = (ord.paymentStatus || (oDue <= 0 ? 'paid' : oPaid > 0 ? 'partial' : 'unpaid')).toLowerCase();
                                        const oStatus = (ord.status || 'pending').toLowerCase();

                                        return (
                                          <tr key={ord._id || ord.orderNumber}>
                                            <td>
                                              <strong style={{ color: 'var(--text-primary)' }}>{ord.tokenNumber || '—'}</strong>
                                              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{ord.orderNumber}</div>
                                            </td>
                                            <td>{formatDate(ord.orderDate || ord.createdAt)}</td>
                                            <td>
                                              <strong style={{ color: 'var(--text-primary)' }}>{itemsSummary}</strong>
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatINR(oTotal)}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 600, color: '#059669' }}>{formatINR(oPaid)}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 700, color: oDue > 0 ? '#dc2626' : '#16a34a' }}>
                                              {formatINR(oDue)}
                                            </td>
                                            <td>{formatDate(ord.deliveryDate)}</td>
                                            <td style={{ textAlign: 'center' }}>
                                              <span className={`status-pill status-${oStatus}`}>{oStatus}</span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                              <span className={`pay-pill pay-${pStatus}`}>{pStatus}</span>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal (Cleaned up, no unwanted tags) */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>Add New Customer</h2>
              <button className="modal__close" onClick={() => setShowAddModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddCustomer} className="modal__body">
              <div className="modal__grid">
                <div className="modal__field">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    placeholder="Customer name"
                    required
                  />
                </div>
                <div className="modal__field">
                  <label>Gender</label>
                  <select
                    value={newCustomer.gender}
                    onChange={(e) => setNewCustomer({ ...newCustomer, gender: e.target.value })}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div className="modal__field">
                  <label>Mobile Number *</label>
                  <input
                    type="tel"
                    value={newCustomer.mobile}
                    onChange={(e) => setNewCustomer({ ...newCustomer, mobile: e.target.value })}
                    placeholder="+91 XXXXX XXXXX"
                    required
                  />
                </div>
                <div className="modal__field">
                  <label>WhatsApp Number</label>
                  <input
                    type="tel"
                    value={newCustomer.whatsapp}
                    onChange={(e) => setNewCustomer({ ...newCustomer, whatsapp: e.target.value })}
                    placeholder="Same as mobile if blank"
                  />
                </div>
              </div>
              <div className="modal__field">
                <label>Address</label>
                <input
                  type="text"
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  placeholder="Full address"
                />
              </div>
              <div className="modal__field">
                <label>Customer Photo (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                      try {
                        const compressed = await compressImage(file, 400, 400, 0.85);
                        setNewCustomer(prev => ({ ...prev, photoUrl: compressed }));
                      } catch (err) {
                        console.error('Customer photo compression error:', err);
                      }
                    }
                  }}
                />
              </div>
              <div className="modal__field">
                <label>Notes</label>
                <textarea
                  value={newCustomer.notes}
                  onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                  placeholder="Any special preferences or tailoring notes..."
                  rows={3}
                />
              </div>
              <div className="modal__actions">
                <button type="button" className="modal__btn modal__btn--secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="modal__btn modal__btn--primary">Add Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Centered App-Themed Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div
          className="modal-overlay"
          onClick={() => setDeleteModal({ isOpen: false, count: 0, customerName: '', ids: [] })}
          style={{ zIndex: 1100 }}
        >
          <div
            className="modal animate-scale-in"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px', padding: 0, overflow: 'hidden', borderRadius: '16px' }}
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
                {deleteModal.count === 1
                  ? `Delete Customer "${deleteModal.customerName || 'Customer'}"?`
                  : `Delete ${deleteModal.count} Selected Customers?`}
              </h3>

              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                Are you sure you want to delete {deleteModal.count === 1 ? <strong>{deleteModal.customerName}</strong> : `${deleteModal.count} customers`}? This will permanently remove them from your customer list and from new order suggestions.
              </p>
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
                onClick={() => setDeleteModal({ isOpen: false, count: 0, customerName: '', ids: [] })}
                style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
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
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
                }}
              >
                <Trash2 size={15} />
                <span>Delete Customer{deleteModal.count > 1 ? 's' : ''}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
