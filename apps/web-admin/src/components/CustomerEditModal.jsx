import { useState, useEffect, useMemo } from 'react';
import { X, User, Phone, MapPin, Camera, Save, CheckCircle, Ruler, Plus, ClipboardList } from 'lucide-react';
import useCustomerStore from '../store/customerStore';
import useMeasurementStore from '../store/measurementStore';
import useAppStore from '../store/appStore';
import { compressImage } from '../utils/imageCompressor';
import { MEASUREMENT_CATEGORIES, getCategoryConfig } from '../constants';
import './CustomerEditModal.css';

export default function CustomerEditModal({ customerData, customerId, isOpen, onClose, onStartNewOrder }) {
  const { customers, updateCustomer, addCustomer } = useCustomerStore();
  const { getLatestByCategory, addMeasurement } = useMeasurementStore();
  const { orders } = useAppStore();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'measurements' | 'actions'
  const [activeCategory, setActiveCategory] = useState('topWear');
  const [measurementFields, setMeasurementFields] = useState({});
  const [isSaved, setIsSaved] = useState(false);

  // Robust Customer Lookup with Fallback Guarantee
  const customer = useMemo(() => {
    if (!isOpen) return null;
    const targetId = customerId || (customerData && (customerData.customerId || customerData._id));
    const targetName = customerData ? (customerData.customerName || customerData.name || '') : '';

    let found = customers.find(c =>
      (targetId && String(c._id) === String(targetId)) ||
      (targetName && c.name.toLowerCase() === targetName.toLowerCase())
    );

    if (!found && (customerData || targetId)) {
      found = {
        _id: targetId || 'cust_' + Math.random().toString(36).substr(2, 9),
        name: targetName || 'Customer',
        mobile: (customerData && (customerData.customerMobile || customerData.mobile || customerData.customerPhone)) || '',
        whatsapp: (customerData && (customerData.whatsapp || customerData.customerMobile || customerData.mobile || customerData.customerPhone)) || '',
        address: (customerData && (customerData.customerAddress || customerData.address)) || '',
        gender: 'male',
        photoUrl: '',
      };
    }
    return found;
  }, [customerId, customerData, customers, isOpen]);

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    whatsapp: '',
    address: '',
    gender: 'male',
    photoUrl: '',
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        mobile: customer.mobile || '',
        whatsapp: customer.whatsapp || customer.mobile || '',
        address: customer.address || '',
        gender: customer.gender || 'male',
        photoUrl: customer.photoUrl || '',
      });
    }
  }, [customer]);

  useEffect(() => {
    if (customer && activeCategory) {
      const existing = getLatestByCategory(customer._id, activeCategory);
      setMeasurementFields(existing?.fields || {});
    }
  }, [customer, activeCategory, getLatestByCategory]);

  const customerOrders = useMemo(() => {
    if (!customer) return [];
    return orders.filter(o =>
      String(o.customerId) === String(customer._id) ||
      (o.customerName && o.customerName.toLowerCase() === customer.name.toLowerCase())
    );
  }, [customer, orders]);

  if (!isOpen || !customer) return null;

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 400, 400, 0.85);
        setFormData(prev => ({ ...prev, photoUrl: compressed }));
      } catch (err) {
        console.error('Photo compression error:', err);
      }
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    try {
      // 1. Ensure customer exists or update profile
      const existingInStore = customers.find(c => String(c._id) === String(customer._id));
      if (existingInStore) {
        await updateCustomer(customer._id, formData);
      } else {
        await addCustomer({ ...customer, ...formData });
      }

      // 2. Save measurement version if fields are entered
      if (Object.keys(measurementFields).length > 0) {
        await addMeasurement({
          customerId: customer._id,
          category: activeCategory,
          fields: measurementFields,
          recordedBy: 'Admin',
        });
      }

      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Error updating customer details:', err);
    }
  };

  const currentCategoryConfig = getCategoryConfig(activeCategory);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="customer-edit-modal animate-scale-in" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="customer-edit-modal__header">
          <div className="customer-edit-modal__title-group">
            <div className="customer-edit-modal__avatar" data-gender={formData.gender}>
              {formData.photoUrl ? (
                <img src={formData.photoUrl} alt={formData.name} />
              ) : (
                formData.name.charAt(0) || 'C'
              )}
              <label className="customer-edit-modal__photo-label" title="Change photo">
                <Camera size={13} />
                <input type="file" accept="image/*" onChange={handlePhotoUpload} hidden />
              </label>
            </div>
            <div>
              <h2>{formData.name}</h2>
              <p>{formData.mobile} • {formData.address}</p>
            </div>
          </div>
          <button className="modal__close" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Top Tab Bar */}
        <div className="customer-edit-modal__tabs-bar">
          <button
            type="button"
            className={`customer-edit-modal__tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={15} /> Edit Contact & Profile
          </button>
          <button
            type="button"
            className={`customer-edit-modal__tab-btn ${activeTab === 'measurements' ? 'active' : ''}`}
            onClick={() => setActiveTab('measurements')}
          >
            <Ruler size={15} /> Body Measurements
          </button>
          <button
            type="button"
            className={`customer-edit-modal__tab-btn ${activeTab === 'actions' ? 'active' : ''}`}
            onClick={() => setActiveTab('actions')}
          >
            <ClipboardList size={15} /> Orders & New Job
          </button>
        </div>

        {/* Tab 1: Profile & Contact Form */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSave} className="customer-edit-modal__form">
            <div className="customer-edit-modal__body-padding">
              <h3 className="customer-edit-modal__section-title"><User size={16} /> Edit Contact Details</h3>

              <div className="modal__field">
                <label>Customer Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="customer-edit-modal__grid-2">
                <div className="modal__field">
                  <label>Mobile Number *</label>
                  <input
                    type="tel"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    required
                  />
                </div>

                <div className="modal__field">
                  <label>WhatsApp Number</label>
                  <input
                    type="tel"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal__field">
                <label>Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Full customer address..."
                />
              </div>

              <div className="modal__field">
                <label>Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>

            <div className="customer-edit-modal__footer">
              {isSaved && (
                <span className="customer-edit-modal__saved-msg">
                  <CheckCircle size={15} /> Details Saved Successfully!
                </span>
              )}
              <button type="button" className="modal__btn modal__btn--secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="modal__btn modal__btn--primary">
                <Save size={15} /> Save Changes
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Body Measurements */}
        {activeTab === 'measurements' && (
          <form onSubmit={handleSave} className="customer-edit-modal__form">
            <div className="customer-edit-modal__body-padding">
              <h3 className="customer-edit-modal__section-title"><Ruler size={16} /> Body Measurements by Garment</h3>

              {/* Category Tabs */}
              <div className="customer-edit-modal__cat-tabs">
                {Object.entries(MEASUREMENT_CATEGORIES).map(([catKey, catVal]) => (
                  <button
                    type="button"
                    key={catKey}
                    className={`customer-edit-modal__cat-tab ${activeCategory === catKey ? 'active' : ''}`}
                    onClick={() => setActiveCategory(catKey)}
                  >
                    {catVal.label}
                  </button>
                ))}
              </div>

              {/* Measurement Fields */}
              {currentCategoryConfig && (
                <div className="customer-edit-modal__meas-grid">
                  {currentCategoryConfig.fields.map((field) => (
                    <div key={field.key} className="customer-edit-modal__meas-field">
                      <label>{field.label} ({field.unit})</label>
                      <input
                        type="text"
                        value={measurementFields[field.key] || ''}
                        onChange={(e) => setMeasurementFields({
                          ...measurementFields,
                          [field.key]: e.target.value,
                        })}
                        placeholder="e.g. 40"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="customer-edit-modal__footer">
              {isSaved && (
                <span className="customer-edit-modal__saved-msg">
                  <CheckCircle size={15} /> Measurements Saved!
                </span>
              )}
              <button type="button" className="modal__btn modal__btn--secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="modal__btn modal__btn--primary">
                <Save size={15} /> Save Measurements
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Customer Orders & Quick New Order */}
        {activeTab === 'actions' && (
          <div className="customer-edit-modal__form">
            <div className="customer-edit-modal__body-padding">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 className="customer-edit-modal__section-title" style={{ margin: 0, border: 'none' }}>
                  <ClipboardList size={16} /> Past Orders ({customerOrders.length})
                </h3>
                {onStartNewOrder && (
                  <button
                    type="button"
                    className="modal__btn modal__btn--primary"
                    style={{ fontSize: '13px', padding: '6px 14px' }}
                    onClick={() => onStartNewOrder(customer)}
                  >
                    <Plus size={15} /> + Create New Order for {formData.name}
                  </button>
                )}
              </div>

              {customerOrders.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '24px 0' }}>
                  No previous orders found for this customer. Click "+ Create New Order" above to take a job!
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {customerOrders.map(o => (
                    <div key={o._id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 14px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-default)'
                    }}>
                      <div>
                        <strong style={{ fontSize: '13px' }}>{o.orderNumber} (Token #{o.tokenNumber || '100'})</strong>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                          {o.items.map(it => `${it.qty}x ${it.name}`).join(', ')}
                        </div>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-gold-500)' }}>
                        ₹{(o.subtotal || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="customer-edit-modal__footer">
              <button type="button" className="modal__btn modal__btn--secondary" onClick={onClose}>Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
