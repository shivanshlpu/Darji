import { create } from 'zustand';
import { generateOrders, generateExpenses, generateDashboardData } from '../data/mockData';
import useCustomerStore from './customerStore';
import { api } from '../services/apiClient';

const initialOrders = [];
const initialExpenses = [];

const useAppStore = create((set, get) => ({
  orders: initialOrders,
  expenses: initialExpenses,
  dashboardData: generateDashboardData([], []),
  notifications: [],
  sidebarCollapsed: false,

  // Live MongoDB Atlas Persistence
  fetchOrdersFromDB: async () => {
    try {
      const res = await api.getOrders();
      if (res.success && Array.isArray(res.data)) {
        set((state) => ({
          orders: res.data,
          dashboardData: generateDashboardData(res.data, state.expenses),
        }));
      }
    } catch (err) {
      console.warn('[Orders DB Fetch Warning]:', err.message);
    }
  },

  fetchExpensesFromDB: async () => {
    try {
      const res = await api.getExpenses();
      if (res.success && Array.isArray(res.data)) {
        set((state) => ({
          expenses: res.data,
          dashboardData: generateDashboardData(state.orders, res.data),
        }));
      }
    } catch (err) {
      console.warn('[Expenses DB Fetch Warning]:', err.message);
    }
  },

  // Sidebar
  toggleSidebar: () => set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  // Notifications
  markNotificationRead: (id) => set(state => ({
    notifications: state.notifications.map(n =>
      n._id === id ? { ...n, isRead: true } : n
    ),
  })),

  getUnreadCount: () => get().notifications.filter(n => !n.isRead).length,

  // Order helpers
  getOrdersByCustomer: (customerId) => {
    return get().orders.filter(o => o.customerId === customerId);
  },

  getOrdersByStatus: (status) => {
    return get().orders.filter(o => o.status === status);
  },

  getRecentOrders: (limit = 10) => {
    return get().orders.slice(0, limit);
  },

  // Order Management Actions
  addOrder: async (newOrder) => {
    try {
      const res = await api.createOrder(newOrder);
      if (res && res.success && res.data) {
        const savedOrder = res.data;
        set((state) => {
          // Remove any duplicate if temporary ID matched, and prepend newly saved MongoDB order
          const filtered = state.orders.filter(o => o._id !== savedOrder._id && o.orderNumber !== savedOrder.orderNumber);
          const updatedOrders = [savedOrder, ...filtered];
          return {
            orders: updatedOrders,
            dashboardData: generateDashboardData(updatedOrders, state.expenses),
          };
        });
        return savedOrder;
      }
      throw new Error(res?.message || 'Failed to save order to database');
    } catch (err) {
      console.error('[addOrder DB Persistence Error]:', err.message);
      throw err;
    }
  },

  updateOrderStatus: (orderId, newStatus) => {
    set((state) => {
      let waNotification = null;
      const updatedOrders = state.orders.map((o) => {
        if (o._id === orderId) {
          const newTimeline = [...(o.timeline || []), { status: newStatus, timestamp: new Date().toISOString(), updatedBy: 'Admin' }];
          const updatedOrder = { ...o, status: newStatus, timeline: newTimeline };

          // Trigger WhatsApp auto-messages per requirements
          if (newStatus === 'ready') {
            waNotification = {
              _id: 'wa_' + Math.random().toString(36).substr(2, 9),
              type: 'whatsappAutoReady',
              payload: {
                message: `📱 WhatsApp Sent to ${o.customerMobile || o.customerName}: "Order Token #${o.tokenNumber || o.orderNumber} is READY for pickup! Balance Due: ₹${o.pendingAmount}"`,
                orderNumber: o.orderNumber,
                tokenNumber: o.tokenNumber,
                customerName: o.customerName,
              },
              isRead: false,
              scheduledFor: new Date().toISOString(),
            };
          } else if ((newStatus === 'delivered' || newStatus === 'completed') && o.pendingAmount <= 0) {
            waNotification = {
              _id: 'wa_' + Math.random().toString(36).substr(2, 9),
              type: 'whatsappAutoDelivered',
              payload: {
                message: `📱 WhatsApp Delivered to ${o.customerMobile || o.customerName}: "Final Bill & Thank You graphic sent for Token #${o.tokenNumber || o.orderNumber}. PDF Download link active."`,
                orderNumber: o.orderNumber,
                tokenNumber: o.tokenNumber,
                customerName: o.customerName,
              },
              isRead: false,
              scheduledFor: new Date().toISOString(),
            };
          }

          return updatedOrder;
        }
        return o;
      });

      const newNotifications = waNotification ? [waNotification, ...state.notifications] : state.notifications;

      return {
        orders: updatedOrders,
        notifications: newNotifications,
        dashboardData: generateDashboardData(updatedOrders, state.expenses),
      };
    });
  },

  updateOrderBill: (orderId, { items, subtotal, paidAmount, discount, extraCharges }) => {
    set((state) => {
      const updatedOrders = state.orders.map((o) => {
        if (o._id === orderId) {
          const newSubtotal = subtotal !== undefined ? subtotal : o.subtotal;
          const newPaid = paidAmount !== undefined ? paidAmount : o.paidAmount;
          const newPending = Math.max(0, newSubtotal - newPaid);
          const newPaymentStatus = newPending <= 0 ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';

          return {
            ...o,
            ...(items ? { items } : {}),
            subtotal: newSubtotal,
            paidAmount: newPaid,
            pendingAmount: newPending,
            paymentStatus: newPaymentStatus,
            discount: discount || 0,
            extraCharges: extraCharges || 0,
          };
        }
        return o;
      });

      return {
        orders: updatedOrders,
        dashboardData: generateDashboardData(updatedOrders, state.expenses),
      };
    });
  },

  updateOrder: async (orderId, updatedFields) => {
    // 1. Optimistic update
    set((state) => {
      const updatedOrders = state.orders.map((o) => {
        if (o._id === orderId || o.orderNumber === orderId) {
          const items = updatedFields.items || o.items || [];
          const subtotal = items.reduce((sum, item) => sum + (Number(item.qty || 1) * Number(item.price || 0)), 0);
          const totalAmount = updatedFields.totalAmount !== undefined ? Number(updatedFields.totalAmount) : (o.totalAmount || subtotal);
          const advancePaid = updatedFields.advancePaid !== undefined ? Number(updatedFields.advancePaid) : (o.advancePaid || o.paidAmount || 0);
          const balanceDue = Math.max(0, totalAmount - advancePaid);
          const paymentStatus = balanceDue <= 0 ? 'paid' : advancePaid > 0 ? 'partial' : 'unpaid';

          return {
            ...o,
            ...updatedFields,
            items,
            subtotal,
            totalAmount,
            advancePaid,
            paidAmount: advancePaid,
            balanceDue,
            pendingAmount: balanceDue,
            paymentStatus,
          };
        }
        return o;
      });

      return {
        orders: updatedOrders,
        dashboardData: generateDashboardData(updatedOrders, state.expenses),
      };
    });

    // 2. MongoDB Atlas Sync
    try {
      const targetId = typeof orderId === 'object' ? orderId._id : orderId;
      const res = await api.updateOrder(targetId, updatedFields);
      if (res && res.success && res.data) {
        set((state) => {
          const updatedOrders = state.orders.map((o) =>
            (o._id === targetId || o.orderNumber === targetId || o._id === res.data._id) ? res.data : o
          );
          return {
            orders: updatedOrders,
            dashboardData: generateDashboardData(updatedOrders, state.expenses),
          };
        });
        return res.data;
      }
    } catch (err) {
      console.error('[updateOrder DB Sync Error]:', err.message);
    }
  },

  markOrderPaid: (orderId) => {
    set((state) => {
      const updatedOrders = state.orders.map((o) => {
        if (o._id === orderId) {
          const fullAmount = o.totalAmount || o.subtotal || (o.paidAmount || 0) + (o.pendingAmount || 0);
          return {
            ...o,
            advancePaid: fullAmount,
            paidAmount: fullAmount,
            balanceDue: 0,
            pendingAmount: 0,
            paymentStatus: 'paid',
          };
        }
        return o;
      });

      return {
        orders: updatedOrders,
        dashboardData: generateDashboardData(updatedOrders, state.expenses),
      };
    });
  },

  // Expense Management Actions
  addExpense: async (expenseData) => {
    try {
      const res = await api.createExpense(expenseData);
      if (res.success && res.data) {
        set((state) => {
          const updated = [res.data, ...state.expenses];
          return {
            expenses: updated,
            dashboardData: generateDashboardData(state.orders, updated),
          };
        });
        return res.data;
      }
    } catch (err) {
      console.warn('[addExpense DB Sync Warning]:', err.message);
    }

    // Local fallback
    const entry = {
      _id: 'exp_' + Math.random().toString(36).substr(2, 9),
      ...expenseData,
      createdAt: new Date().toISOString(),
    };
    set((state) => {
      const updated = [entry, ...state.expenses];
      return {
        expenses: updated,
        dashboardData: generateDashboardData(state.orders, updated),
      };
    });
    return entry;
  },

  deleteExpense: async (expenseId) => {
    try {
      await api.deleteExpense(expenseId);
    } catch (err) {
      console.warn('[deleteExpense DB Sync Warning]:', err.message);
    }

    set((state) => {
      const updated = state.expenses.filter(e => e._id !== expenseId);
      return {
        expenses: updated,
        dashboardData: generateDashboardData(state.orders, updated),
      };
    });
  },

  // Refresh dashboard data
  refreshDashboard: () => {
    const { orders, expenses } = get();
    set({ dashboardData: generateDashboardData(orders, expenses) });
  },
}));

export default useAppStore;
