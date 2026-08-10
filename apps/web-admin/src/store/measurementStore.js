import { create } from 'zustand';
import { MEASUREMENT_CATEGORIES } from '../constants';
import { apiClient } from '../services/apiClient';

const useMeasurementStore = create((set, get) => ({
  measurements: [],
  isLoaded: false,

  fetchMeasurementsFromDB: async (customerId) => {
    try {
      if (!customerId) return;
      const res = await apiClient.getMeasurements(customerId);
      if (res.success && Array.isArray(res.data)) {
        set(state => {
          const existingIds = new Set(state.measurements.map(m => m._id));
          const newItems = res.data.filter(m => !existingIds.has(m._id));
          return { measurements: [...newItems, ...state.measurements], isLoaded: true };
        });
      }
    } catch (err) {
      console.warn('[MeasurementStore] Fetch fallback:', err.message);
    }
  },

  // Load measurements (called when customer is selected)
  loadMeasurements: (allMeasurements, customerId) => {
    const filtered = allMeasurements.filter(m => m.customerId === customerId);
    set({ measurements: filtered, isLoaded: true });
  },

  // Get latest version per category for a customer (or single category if specified)
  getLatestByCategory: (customerId, category) => {
    const { measurements } = get();
    if (!customerId) return category ? null : [];

    const customerMeasurements = measurements.filter(m =>
      m.customerId === customerId || String(m.customerId) === String(customerId)
    );
    
    if (category) {
      const catLower = category.toLowerCase();
      const isTopGroup = ['topwear', 'shirt', 'kurta', 'sherwani', 'blazer', 'suit', 'top'].includes(catLower);
      const isBottomGroup = ['bottomwear', 'pant', 'trouser', 'salwar', 'pyjama', 'jeans', 'bottom'].includes(catLower);

      const matches = customerMeasurements
        .filter(m => {
          if (m.category === category) return true;
          const mCat = (m.category || '').toLowerCase();
          if (isTopGroup && ['topwear', 'shirt', 'kurta', 'sherwani', 'blazer', 'suit', 'top'].includes(mCat)) return true;
          if (isBottomGroup && ['bottomwear', 'pant', 'trouser', 'salwar', 'pyjama', 'jeans', 'bottom'].includes(mCat)) return true;
          return false;
        })
        .sort((a, b) => (b.version || 0) - (a.version || 0));

      return matches[0] || null;
    }

    const latest = {};
    customerMeasurements.forEach(m => {
      if (!latest[m.category] || (m.version || 0) > (latest[m.category].version || 0)) {
        latest[m.category] = m;
      }
    });
    return Object.values(latest);
  },

  // Get version history for a specific category + customer
  getHistory: (customerId, category) => {
    const { measurements } = get();
    return measurements
      .filter(m =>
        (m.customerId === customerId || String(m.customerId) === String(customerId)) &&
        (m.category === category || (m.category || '').toLowerCase() === (category || '').toLowerCase())
      )
      .sort((a, b) => (b.version || 0) - (a.version || 0));
  },

  // Add new measurement (creates new version, per spec Section 6.4)
  addMeasurement: (customerId, customerName, category, fields) => {
    if (!customerId || !category || !fields || Object.keys(fields).length === 0) return null;
    const { measurements } = get();
    const existing = measurements
      .filter(m =>
        (m.customerId === customerId || String(m.customerId) === String(customerId)) &&
        (m.category === category || (m.category || '').toLowerCase() === (category || '').toLowerCase())
      )
      .sort((a, b) => (b.version || 0) - (a.version || 0));

    const latestVersion = existing.length > 0 ? (existing[0].version || 0) : 0;
    const previousVersionId = existing.length > 0 ? existing[0]._id : null;

    const newMeasurement = {
      _id: 'id_' + Math.random().toString(36).substr(2, 12),
      customerId,
      customerName: customerName || 'Customer',
      category,
      fields,
      version: latestVersion + 1,
      previousVersionId,
      recordedBy: 'owner',
      createdAt: new Date().toISOString(),
    };

    set(state => ({
      measurements: [newMeasurement, ...state.measurements],
    }));

    // Async sync to MongoDB backend
    apiClient.createMeasurement({
      customerId,
      customerName: customerName || 'Customer',
      category,
      fields,
    }).catch(err => console.warn('[MeasurementStore] Sync error:', err.message));

    return newMeasurement;
  },

  // Get category fields
  getCategoryFields: (category) => {
    return MEASUREMENT_CATEGORIES[category]?.fields || [];
  },
}));

export default useMeasurementStore;
