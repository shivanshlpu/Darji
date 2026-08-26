import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Phone, MessageCircle, MapPin, Calendar, IndianRupee,
  Edit, Ruler, ClipboardList, CreditCard, Clock, Plus, ChevronDown, ChevronUp, History, Camera
} from 'lucide-react';
import useCustomerStore from '../store/customerStore';
import useAppStore from '../store/appStore';
import useMeasurementStore from '../store/measurementStore';
import { compressImage } from '../utils/imageCompressor';
import { generateMeasurements } from '../data/mockData';
import { MEASUREMENT_CATEGORIES, ORDER_STATUSES, PAYMENT_STATUSES, getCategoryConfig } from '../constants';
import PaymentHistoryModal from '../components/PaymentHistoryModal';
import './CustomerProfile.css';

const formatINR = (a) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(a);

export default function CustomerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { customers, selectCustomer, selectedCustomer, updateCustomer, fetchCustomersFromDB } = useCustomerStore();
  const { getOrdersByCustomer, fetchOrdersFromDB, orders: allOrders } = useAppStore();
  const { measurements, addMeasurement, getLatestByCategory, getHistory, fetchMeasurementsFromDB } = useMeasurementStore();

  useEffect(() => {
    fetchCustomersFromDB();
    fetchOrdersFromDB();
    if (id) {
      fetchMeasurementsFromDB(id);
    }
  }, [id]);
  const [activeTab, setActiveTab] = useState('measurements');
  const [showMeasurementModal, setShowMeasurementModal] = useState(false);
  const [paymentHistoryOrder, setPaymentHistoryOrder] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('topWear');
  const [measurementFields, setMeasurementFields] = useState({});
  const [customKeyName, setCustomKeyName] = useState('');
  const [customKeyValue, setCustomKeyValue] = useState('');

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (file && customer) {
      try {
        const compressed = await compressImage(file, 400, 400, 0.85);
        await updateCustomer(customer._id, { photoUrl: compressed });
      } catch (err) {
        console.error('Failed to update customer photo:', err);
      }
    }
  };
  const [expandedHistory, setExpandedHistory] = useState(null);

  const customer = useMemo(() => customers.find(c => c._id === id), [id, customers]);
  const orders = useMemo(() => getOrdersByCustomer(id), [id]);

  useEffect(() => {
    if (id) {
      fetchMeasurementsFromDB(id);
    }
  }, [id, customer]);

  const latestMeasurements = useMemo(() => getLatestByCategory(id), [id, measurements]);

  if (!customer) {
    return (
      <div className="profile__not-found">
        <p>Customer not found</p>
        <button onClick={() => navigate('/customers')}>Back to Customers</button>
      </div>
    );
  }

  const handleSaveMeasurement = () => {
    addMeasurement(customer._id, customer.name, selectedCategory, measurementFields);
    setShowMeasurementModal(false);
    setMeasurementFields({});
  };

  const openMeasurementModal = (category = 'shirt') => {
    setSelectedCategory(category);
    // Pre-fill with latest values if exists
    const existing = measurements.filter(m => m.customerId === id && m.category === category)
      .sort((a, b) => b.version - a.version);
    if (existing.length > 0) {
      setMeasurementFields({ ...existing[0].fields });
    } else {
      setMeasurementFields({});
    }
    setShowMeasurementModal(true);
  };

  const categoryFields = MEASUREMENT_CATEGORIES[selectedCategory]?.fields || [];

  return (
    <div className="profile">
      {/* Header */}
      <button className="profile__back" onClick={() => navigate('/customers')}>
        <ArrowLeft size={18} /> Back to Customers
      </button>

      {/* Customer Info Card */}
      <div className="profile__hero">
        <div className="profile__hero-left">
          <div className="profile__avatar" data-gender={customer.gender} title="Click to upload customer photo">
            {customer.photoUrl ? (
              <img src={customer.photoUrl} alt={customer.name} />
            ) : (
              customer.name.charAt(0)
            )}
            <label className="profile__avatar-overlay">
              <Camera size={16} />
              <input type="file" accept="image/*" onChange={handlePhotoChange} hidden />
            </label>
          </div>
          <div className="profile__info">
            <h1 className="profile__name">{customer.name}</h1>
            <div className="profile__details">
              <span><Phone size={13} /> {customer.mobile}</span>
              {customer.whatsapp && <span><MessageCircle size={13} /> {customer.whatsapp}</span>}
              <span><MapPin size={13} /> {customer.address}</span>
            </div>
            {customer.tags.length > 0 && (
              <div className="profile__tags">
                {customer.tags.map(t => <span key={t} className="profile__tag">{t}</span>)}
              </div>
            )}
          </div>
        </div>
        <div className="profile__stats">
          <div className="profile__stat">
            <span className="profile__stat-label">Total Spent</span>
            <span className="profile__stat-value profile__stat-value--success">{formatINR(customer.totalSpending)}</span>
          </div>
          <div className="profile__stat">
            <span className="profile__stat-label">Pending</span>
            <span className={`profile__stat-value ${customer.pendingAmount > 0 ? 'profile__stat-value--danger' : ''}`}>
              {customer.pendingAmount > 0 ? formatINR(customer.pendingAmount) : '₹0'}
            </span>
          </div>
          <div className="profile__stat">
            <span className="profile__stat-label">Last Visit</span>
            <span className="profile__stat-value">
              {new Date(customer.lastVisit).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
          <div className="profile__stat">
            <span className="profile__stat-label">Total Orders</span>
            <span className="profile__stat-value">{orders.length}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="profile__tabs">
        {[
          { key: 'measurements', label: 'Measurements', icon: Ruler },
          { key: 'orders', label: 'Orders', icon: ClipboardList },
          { key: 'payments', label: 'Payments', icon: CreditCard },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              className={`profile__tab ${activeTab === tab.key ? 'profile__tab--active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="profile__content">
        {activeTab === 'measurements' && (
          <div className="profile__measurements animate-fade-in">
            <div className="profile__section-header">
              <h3>Measurements</h3>
              <button className="profile__add-btn" onClick={() => openMeasurementModal()}>
                <Plus size={16} /> New Measurement
              </button>
            </div>

            {latestMeasurements.length === 0 ? (
              <div className="profile__empty">
                <Ruler size={40} />
                <p>No measurements recorded yet</p>
                <button className="profile__add-btn" onClick={() => openMeasurementModal()}>
                  <Plus size={16} /> Add First Measurement
                </button>
              </div>
            ) : (
              <div className="profile__measurement-grid">
                {latestMeasurements.map(m => {
                  const cat = getCategoryConfig(m.category);
                  const history = getHistory(id, m.category);
                  const isExpanded = expandedHistory === m.category;

                  return (
                    <div key={m._id} className="profile__measurement-card">
                      <div className="profile__measurement-header">
                        <div className="profile__measurement-title">
                          <span className="profile__measurement-icon">{cat?.icon}</span>
                          <h4>{cat?.label || m.category}</h4>
                          <span className="profile__measurement-version">v{m.version}</span>
                        </div>
                        <div className="profile__measurement-actions">
                          <button
                            className="profile__measurement-edit"
                            onClick={() => openMeasurementModal(m.category)}
                            title="Update measurement"
                          >
                            <Edit size={14} />
                          </button>
                          {history.length > 1 && (
                            <button
                              className="profile__measurement-history-btn"
                              onClick={() => setExpandedHistory(isExpanded ? null : m.category)}
                              title="View history"
                            >
                              <History size={14} />
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="profile__measurement-fields">
                        {Object.entries(m.fields).map(([key, value]) => {
                          const fieldDef = cat?.fields.find(f => f.key === key);
                          return (
                            <div key={key} className="profile__measurement-field">
                              <span className="profile__measurement-field-label">
                                {fieldDef?.label || key}
                              </span>
                              <span className="profile__measurement-field-value">
                                {value} {fieldDef?.unit || ''}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="profile__measurement-meta">
                        <span><Calendar size={12} /> {new Date(m.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        <span>by {m.recordedBy}</span>
                      </div>

                      {/* Version History */}
                      {isExpanded && (
                        <div className="profile__measurement-history animate-fade-in">
                          <h5>Version History</h5>
                          {history.map((hm, idx) => (
                            <div key={hm._id} className={`profile__history-item ${idx === 0 ? 'profile__history-item--current' : ''}`}>
                              <span className="profile__history-version">v{hm.version}</span>
                              <span className="profile__history-date">
                                {new Date(hm.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                              <span className="profile__history-by">{hm.recordedBy}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="profile__orders animate-fade-in">
            <div className="profile__section-header">
              <h3>Orders ({orders.length})</h3>
            </div>
            {orders.length === 0 ? (
              <div className="profile__empty">
                <ClipboardList size={40} />
                <p>No orders yet</p>
              </div>
            ) : (
              <div className="profile__order-list">
                {orders.map(order => (
                  <div key={order._id} className="profile__order-card">
                    <div className="profile__order-top">
                      <span className="profile__order-number">{order.orderNumber}</span>
                      <span className={`profile__order-status profile__order-status--${ORDER_STATUSES[order.status]?.color}`}>
                        {ORDER_STATUSES[order.status]?.label}
                      </span>
                    </div>
                    <div className="profile__order-items">
                      {order.items.map((item, i) => (
                        <span key={i} className="profile__order-item">{item.qty}x {item.name}</span>
                      ))}
                    </div>
                    <div className="profile__order-bottom">
                      <span className="profile__order-amount">{formatINR(order.subtotal)}</span>
                      <span className={`profile__order-payment profile__order-payment--${PAYMENT_STATUSES[order.paymentStatus]?.color}`}>
                        {PAYMENT_STATUSES[order.paymentStatus]?.label}
                      </span>
                      <span className="profile__order-date">
                        Delivery: {new Date(order.deliveryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="profile__payments animate-fade-in">
            <div className="profile__section-header">
              <h3>Payment Summary</h3>
            </div>
            <div className="profile__payment-summary">
              <div className="profile__payment-card">
                <span className="profile__payment-label">Total Billed</span>
                <span className="profile__payment-value">{formatINR(orders.reduce((s, o) => s + (o.grandTotal || o.totalAmount || o.subtotal || 0), 0))}</span>
              </div>
              <div className="profile__payment-card">
                <span className="profile__payment-label">Total Collected</span>
                <span className="profile__payment-value profile__payment-value--success">{formatINR(orders.reduce((s, o) => s + (o.paidAmount || o.advancePaid || 0), 0))}</span>
              </div>
              <div className="profile__payment-card">
                <span className="profile__payment-label">Pending Balance</span>
                <span className="profile__payment-value profile__payment-value--danger">{formatINR(orders.reduce((s, o) => s + (Number(o.pendingAmount) || Number(o.balanceDue) || 0), 0))}</span>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                Order Payments & Adjust Dates
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {orders.map(order => (
                  <div key={order._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                          {order.tokenNumber ? `Token #${order.tokenNumber}` : order.orderNumber}
                        </span>
                        <span className={`profile__order-payment profile__order-payment--${PAYMENT_STATUSES[order.paymentStatus]?.color}`}>
                          {PAYMENT_STATUSES[order.paymentStatus]?.label}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        Total: {formatINR(order.grandTotal || order.totalAmount || order.subtotal)} &bull; Paid: {formatINR(order.paidAmount || order.advancePaid || 0)} &bull; Due: {formatINR(order.pendingAmount || order.balanceDue || 0)}
                      </div>
                    </div>

                    <button
                      type="button"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(217, 119, 6, 0.1)', color: '#d97706', border: '1px solid rgba(217, 119, 6, 0.3)', padding: '0.45rem 0.85rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => setPaymentHistoryOrder(order)}
                    >
                      <CreditCard size={14} /> Adjust Payment & Dates
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Measurement Modal */}
      {showMeasurementModal && (
        <div className="modal-overlay" onClick={() => setShowMeasurementModal(false)}>
          <div className="modal animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>
                {getCategoryConfig(selectedCategory)?.icon} {getCategoryConfig(selectedCategory)?.label} Measurements
              </h2>
              <button className="modal__close" onClick={() => setShowMeasurementModal(false)}>✕</button>
            </div>
            <div className="modal__body">
              {/* Category Selector */}
              <div className="profile__category-selector">
                {Object.entries(MEASUREMENT_CATEGORIES).map(([key, cat]) => (
                  <button
                    key={key}
                    className={`profile__category-btn ${selectedCategory === key ? 'profile__category-btn--active' : ''}`}
                    onClick={() => {
                      setSelectedCategory(key);
                      // Load existing fields
                      const existing = measurements.filter(m => m.customerId === id && m.category === key)
                        .sort((a, b) => b.version - a.version);
                      setMeasurementFields(existing.length > 0 ? { ...existing[0].fields } : {});
                    }}
                  >
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>

              {/* Fields */}
              <div className="profile__fields-grid">
                {categoryFields.map(field => (
                  <div key={field.key} className="modal__field">
                    <label>{field.label} ({field.unit})</label>
                    <input
                      type="number"
                      step="0.5"
                      value={measurementFields[field.key] || ''}
                      onChange={(e) => setMeasurementFields({
                        ...measurementFields,
                        [field.key]: parseFloat(e.target.value) || ''
                      })}
                      placeholder={`Enter ${String(field?.label || '').toLowerCase()}`}
                    />
                  </div>
                ))}

                {/* Render any Custom Key-Value Body Parts Added */}
                {Object.keys(measurementFields)
                  .filter(k => !categoryFields.some(f => f.key === k))
                  .map(customKey => (
                    <div key={customKey} className="modal__field" style={{ position: 'relative' }}>
                      <label style={{ textTransform: 'capitalize', color: 'var(--color-navy-700)', fontWeight: 700 }}>
                        ✨ {customKey} (Custom):
                      </label>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <input
                          type="text"
                          value={measurementFields[customKey] || ''}
                          onChange={(e) => setMeasurementFields({
                            ...measurementFields,
                            [customKey]: e.target.value
                          })}
                          placeholder="Value..."
                        />
                        <button
                          type="button"
                          style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', padding: '0 8px', cursor: 'pointer' }}
                          onClick={() => {
                            const copy = { ...measurementFields };
                            delete copy[customKey];
                            setMeasurementFields(copy);
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Inline Custom Body Part Adder */}
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px dashed #cbd5e1', marginTop: '12px', marginBottom: '12px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-navy-700)', marginBottom: '8px' }}>
                  + Add Custom Body Part / Special Measurement:
                </h4>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="e.g. Bicep, Thigh, Crotch, Ankle"
                    value={customKeyName}
                    onChange={(e) => setCustomKeyName(e.target.value)}
                    style={{ flex: 1, padding: '6px 10px', fontSize: '13px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                  <input
                    type="text"
                    placeholder="Value (e.g. 14.5)"
                    value={customKeyValue}
                    onChange={(e) => setCustomKeyValue(e.target.value)}
                    style={{ width: '110px', padding: '6px 10px', fontSize: '13px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                  <button
                    type="button"
                    style={{ background: 'var(--color-gold-500)', color: '#fff', border: 'none', borderRadius: '4px', padding: '7px 12px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                    onClick={() => {
                      if (customKeyName.trim()) {
                        setMeasurementFields(prev => ({
                          ...prev,
                          [customKeyName.trim()]: customKeyValue.trim() || ''
                        }));
                        setCustomKeyName('');
                        setCustomKeyValue('');
                      }
                    }}
                  >
                    + Add Body Part
                  </button>
                </div>
              </div>

              <p className="profile__version-note">
                💡 This will create a <strong>new version</strong> — previous measurements are preserved.
              </p>

              <div className="modal__actions">
                <button className="modal__btn modal__btn--secondary" onClick={() => setShowMeasurementModal(false)}>Cancel</button>
                <button className="modal__btn modal__btn--primary" onClick={handleSaveMeasurement}>
                  Save Measurement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment History & Date Adjustment Modal */}
      <PaymentHistoryModal
        isOpen={!!paymentHistoryOrder}
        onClose={() => setPaymentHistoryOrder(null)}
        order={paymentHistoryOrder ? (allOrders.find(o => o._id === paymentHistoryOrder._id || o.orderNumber === paymentHistoryOrder.orderNumber) || paymentHistoryOrder) : null}
      />
    </div>
  );
}
