import { create } from 'zustand';
import { generateCustomers } from '../data/mockData';
import { api } from '../services/apiClient';

const initialCustomers = [];

const useCustomerStore = create((set, get) => ({
  customers: initialCustomers,
  selectedCustomer: null,
  searchQuery: '',
  activeFilters: { tags: [], pendingOnly: false },
  sortBy: 'name',
  sortOrder: 'asc',

  // Fetch live from MongoDB Atlas backend
  fetchCustomersFromDB: async () => {
    try {
      const res = await api.getCustomers();
      if (res.success) {
        set({ customers: res.data || [] });
      }
    } catch (err) {
      console.warn('Customer store fetch warning:', err.message);
    }
  },

  // Search & Filter
  setSearchQuery: (query) => set({ searchQuery: query }),

  setFilter: (key, value) => set(state => ({
    activeFilters: { ...state.activeFilters, [key]: value },
  })),

  clearFilters: () => set({ searchQuery: '', activeFilters: { tags: [], pendingOnly: false } }),

  setSort: (field) => set(state => ({
    sortBy: field,
    sortOrder: state.sortBy === field && state.sortOrder === 'asc' ? 'desc' : 'asc',
  })),

  getFilteredCustomers: () => {
    const { customers, searchQuery, activeFilters, sortBy, sortOrder } = get();
    let filtered = [...customers];

    if (searchQuery) {
      const q = String(searchQuery || '').toLowerCase();
      filtered = filtered.filter(c =>
        (c.name && typeof c.name === 'string' && c.name.toLowerCase().includes(q)) ||
        (c.mobile && String(c.mobile).includes(q)) ||
        (c.address && typeof c.address === 'string' && c.address.toLowerCase().includes(q))
      );
    }

    if (activeFilters.tags.length > 0) {
      filtered = filtered.filter(c =>
        activeFilters.tags.some(t => c.tags?.includes(t))
      );
    }

    if (activeFilters.pendingOnly) {
      filtered = filtered.filter(c => c.pendingAmount > 0);
    }

    filtered.sort((a, b) => {
      let valA = a[sortBy] !== undefined && a[sortBy] !== null ? a[sortBy] : '';
      let valB = b[sortBy] !== undefined && b[sortBy] !== null ? b[sortBy] : '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  },

  // CRUD
  selectCustomer: (id) => set(state => ({
    selectedCustomer: state.customers.find(c => c._id === id) || null,
  })),

  addCustomer: async (customer) => {
    try {
      const res = await api.createCustomer(customer);
      if (res.success) {
        set(state => ({ customers: [res.data, ...state.customers] }));
        return;
      }
    } catch (err) {
      console.warn('API addCustomer fallback:', err.message);
    }

    // Local fallback
    const newCust = {
      ...customer,
      _id: 'id_' + Math.random().toString(36).substr(2, 12),
      totalSpending: 0,
      pendingAmount: 0,
      lastVisit: new Date().toISOString(),
      tags: customer.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set(state => ({ customers: [newCust, ...state.customers] }));
  },

  updateCustomer: async (id, updates) => {
    try {
      await api.updateCustomer(id, updates);
    } catch (err) {
      console.warn('API updateCustomer fallback:', err.message);
    }
    set(state => ({
      customers: state.customers.map(c => c._id === id ? { ...c, ...updates } : c),
    }));
  },

  deleteCustomer: async (id) => {
    try {
      await api.deleteCustomer(id);
    } catch (err) {
      console.warn('API deleteCustomer fallback:', err.message);
    }
    set(state => ({
      customers: state.customers.filter(c => c._id !== id),
    }));
  },
}));

export default useCustomerStore;
