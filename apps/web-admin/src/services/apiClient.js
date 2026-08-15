const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://darji.onrender.com/api/v1';

async function request(endpoint, options = {}) {
  const userStr = localStorage.getItem('darji_user');
  const token = localStorage.getItem('darji_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message || 'API request failed');
    return data;
  } catch (err) {
    console.warn(`[API Client Fallback] ${endpoint}:`, err.message);
    throw err;
  }
}

export const api = {
  // Auth
  login: (phone, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ phone, password }) }),
  updatePassword: (currentPassword, newPassword) => request('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),

  // Dashboard
  getDashboard: () => request('/dashboard/summary'),

  // Customers
  getCustomers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/customers${query ? `?${query}` : ''}`);
  },
  createCustomer: (data) => request('/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id, data) => request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCustomer: (id) => request(`/customers/${id}`, { method: 'DELETE' }),

  // Measurements
  getMeasurements: (customerId) => request(`/customers/${customerId}/measurements`),
  createMeasurement: (data) => request('/measurements', { method: 'POST', body: JSON.stringify(data) }),

  // Orders
  getOrders: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/orders${query ? `?${query}` : ''}`);
  },
  createOrder: (data) => request('/orders', { method: 'POST', body: JSON.stringify(data) }),
  updateOrder: (id, data) => request(`/orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteOrder: (id) => request(`/orders/${id}`, { method: 'DELETE' }),
  markOrderAsPaid: (id) => request(`/orders/${id}/mark-paid`, { method: 'POST' }),
  updateOrderStatus: (id, newStatus) => request(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ newStatus }) }),

  // Payments
  addPayment: (orderId, data) => request(`/orders/${orderId}/payments`, { method: 'POST', body: JSON.stringify(data) }),

  // Invoices
  createInvoice: (orderId, data) => request(`/orders/${orderId}/invoice`, { method: 'POST', body: JSON.stringify(data) }),

  // Expenses
  getExpenses: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/expenses${query ? `?${query}` : ''}`);
  },
  createExpense: (data) => request('/expenses', { method: 'POST', body: JSON.stringify(data) }),
  deleteExpense: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),

  // Cashbook
  getCashbook: (date) => request(`/cashbook/${date}`),
  closeCashbook: (date, data) => request(`/cashbook/${date}/close`, { method: 'POST', body: JSON.stringify(data) }),

  // Query AI
  askQueryAI: (text) => request('/query-ai/ask', { method: 'POST', body: JSON.stringify({ text }) }),

  // Settings & System
  getShopSettings: () => request('/settings/shop'),
  updateShopSettings: (data) => request('/settings/shop', { method: 'PUT', body: JSON.stringify(data) }),
  clearEntryData: () => request('/system/clear-entry-data', { method: 'POST' }),
  triggerCloudBackup: () => request('/system/backup', { method: 'POST' }),

  // WhatsApp Backend Integration
  getWhatsAppStatus: () => request('/whatsapp/status'),
  disconnectWhatsApp: () => request('/whatsapp/disconnect', { method: 'POST' }),
  reconnectWhatsApp: () => request('/whatsapp/reconnect', { method: 'POST' }),
  sendWhatsAppTest: (data) => request('/whatsapp/test', { method: 'POST', body: JSON.stringify(data) }),
  sendWhatsAppInvoicePDF: (data) => request('/whatsapp/send-invoice-pdf', { method: 'POST', body: JSON.stringify(data) }),
  sendPaymentReminderWhatsApp: (data) => request('/whatsapp/send-payment-reminder', { method: 'POST', body: JSON.stringify(data) }),
};

export const apiClient = api;
export default api;
