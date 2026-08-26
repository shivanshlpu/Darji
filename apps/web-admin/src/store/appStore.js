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

  updateOrderBill: async (orderId, { items, subtotal, paidAmount, discount, discountType, discountValue, extraCharges }) => {
    let payload = {};
    set((state) => {
      const updatedOrders = state.orders.map((o) => {
        if (o._id === orderId || o.orderNumber === orderId) {
          const newItems = items || o.items || [];
          const newSubtotal = Math.round(subtotal !== undefined ? subtotal : newItems.reduce((s, i) => s + ((i.qty || 1) * (Number(i.price) || 0)), 0));
          const newDiscountType = discountType || o.discountType || 'amount';
          const newDiscountValue = discountValue !== undefined ? Number(discountValue) : (o.discountValue || 0);
          let newDiscount = 0;
          if (newDiscountType === 'percent') {
            newDiscount = Math.round((newSubtotal * newDiscountValue) / 100);
          } else {
            newDiscount = discount !== undefined ? Math.round(Number(discount)) : Math.round(newDiscountValue || o.discount || 0);
          }
          const newExtraCharges = Math.round(extraCharges !== undefined ? extraCharges : (o.extraCharges || 0));
          const newGrandTotal = Math.max(0, Math.round(newSubtotal - newDiscount + newExtraCharges));
          const newPaid = Math.round(paidAmount !== undefined ? paidAmount : (o.paidAmount || o.advancePaid || 0));
          const newPending = Math.max(0, newGrandTotal - newPaid);
          const newPaymentStatus = newPending <= 0 ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';

          payload = {
            items: newItems,
            subtotal: newSubtotal,
            discount: newDiscount,
            discountType: newDiscountType,
            discountValue: newDiscountValue,
            extraCharges: newExtraCharges,
            grandTotal: newGrandTotal,
            totalAmount: newGrandTotal,
            paidAmount: newPaid,
            advancePaid: newPaid,
            pendingAmount: newPending,
            balanceDue: newPending,
            paymentStatus: newPaymentStatus,
          };

          return {
            ...o,
            ...payload,
          };
        }
        return o;
      });

      return {
        orders: updatedOrders,
        dashboardData: generateDashboardData(updatedOrders, state.expenses),
      };
    });

    try {
      const targetId = typeof orderId === 'object' ? orderId._id : orderId;
      const res = await api.updateOrder(targetId, payload);
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
      console.error('[updateOrderBill DB Sync Error]:', err.message);
    }
  },

  updateOrder: async (orderId, updatedFields) => {
    // 1. Optimistic update
    set((state) => {
      const updatedOrders = state.orders.map((o) => {
        if (o._id === orderId || o.orderNumber === orderId) {
          const items = updatedFields.items || o.items || [];
          const subtotal = Math.round(updatedFields.subtotal !== undefined ? Number(updatedFields.subtotal) : items.reduce((sum, item) => sum + (Number(item.qty || 1) * Number(item.price || 0)), 0));
          const discount = Math.round(updatedFields.discount !== undefined ? Number(updatedFields.discount) : (o.discount || 0));
          const extraCharges = Math.round(updatedFields.extraCharges !== undefined ? Number(updatedFields.extraCharges) : (o.extraCharges || 0));
          const grandTotal = updatedFields.grandTotal !== undefined ? Math.round(Number(updatedFields.grandTotal)) : (updatedFields.totalAmount !== undefined ? Math.round(Number(updatedFields.totalAmount)) : Math.max(0, Math.round(subtotal - discount + extraCharges)));
          const advancePaid = updatedFields.advancePaid !== undefined ? Math.round(Number(updatedFields.advancePaid)) : (updatedFields.paidAmount !== undefined ? Math.round(Number(updatedFields.paidAmount)) : (o.advancePaid || o.paidAmount || 0));
          const balanceDue = Math.max(0, grandTotal - advancePaid);
          const paymentStatus = balanceDue <= 0 ? 'paid' : advancePaid > 0 ? 'partial' : 'unpaid';

          return {
            ...o,
            ...updatedFields,
            items,
            subtotal,
            discount,
            extraCharges,
            grandTotal,
            totalAmount: grandTotal,
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

  markOrderPaid: async (orderId, paymentData = {}) => {
    const paymentDate = paymentData.paymentDate || new Date().toISOString();
    const paymentMode = paymentData.mode || paymentData.paymentMode || 'cash';
    const notes = paymentData.notes || 'Marked as paid in full';

    set((state) => {
      const updatedOrders = state.orders.map((o) => {
        if (o._id === orderId || o.orderNumber === orderId) {
          const grandTotal = o.grandTotal || o.totalAmount || o.subtotal || ((o.paidAmount || 0) + (o.pendingAmount || 0));
          const existingPayments = Array.isArray(o.payments) ? [...o.payments] : [];
          const totalPaidAlready = existingPayments.length > 0
            ? existingPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0)
            : (Number(o.paidAmount) || Number(o.advancePaid) || 0);

          if (existingPayments.length === 0 && totalPaidAlready > 0) {
            existingPayments.push({
              _id: 'pay_legacy_' + Math.random().toString(36).substr(2, 6),
              amount: totalPaidAlready,
              mode: 'cash',
              type: 'advance',
              date: o.orderDate || o.createdAt || paymentDate,
              notes: 'Initial recorded payment',
            });
          }

          const remainingToPay = Math.max(0, grandTotal - totalPaidAlready);
          if (remainingToPay > 0) {
            existingPayments.push({
              _id: 'pay_' + Math.random().toString(36).substr(2, 9),
              amount: remainingToPay,
              mode: paymentMode,
              type: 'final',
              date: paymentDate,
              notes,
            });
          }

          const newTotalPaid = existingPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);

          return {
            ...o,
            payments: existingPayments,
            advancePaid: existingPayments[0]?.amount || newTotalPaid,
            paidAmount: newTotalPaid,
            balanceDue: 0,
            pendingAmount: 0,
            paymentStatus: 'paid',
            lastPaymentDate: paymentDate,
          };
        }
        return o;
      });

      return {
        orders: updatedOrders,
        dashboardData: generateDashboardData(updatedOrders, state.expenses),
      };
    });

    try {
      const res = await api.markOrderAsPaid(orderId, { paymentDate, mode: paymentMode, notes });
      if (res && res.success && res.data) {
        set((state) => {
          const syncedOrders = state.orders.map(o => (o._id === res.data._id || o.orderNumber === res.data.orderNumber) ? res.data : o);
          return {
            orders: syncedOrders,
            dashboardData: generateDashboardData(syncedOrders, state.expenses),
          };
        });
      }
    } catch (err) {
      console.warn('[markOrderPaid DB Sync Warning]:', err.message);
    }
  },

  addOrderPayment: async (orderId, paymentData) => {
    try {
      const res = await api.addPayment(orderId, paymentData);
      if (res && res.success && res.data) {
        set((state) => {
          const updatedOrders = state.orders.map(o => (o._id === res.data._id || o.orderNumber === res.data.orderNumber) ? res.data : o);
          return {
            orders: updatedOrders,
            dashboardData: generateDashboardData(updatedOrders, state.expenses),
          };
        });
        return res.data;
      }
    } catch (err) {
      console.error('[addOrderPayment Error]:', err.message);
      throw err;
    }
  },

  updateOrderPayment: async (orderId, paymentId, paymentData) => {
    try {
      const res = await api.updatePayment(orderId, paymentId, paymentData);
      if (res && res.success && res.data) {
        set((state) => {
          const updatedOrders = state.orders.map(o => (o._id === res.data._id || o.orderNumber === res.data.orderNumber) ? res.data : o);
          return {
            orders: updatedOrders,
            dashboardData: generateDashboardData(updatedOrders, state.expenses),
          };
        });
        return res.data;
      }
    } catch (err) {
      console.error('[updateOrderPayment Error]:', err.message);
      throw err;
    }
  },

  deleteOrderPayment: async (orderId, paymentId) => {
    try {
      const res = await api.deletePayment(orderId, paymentId);
      if (res && res.success && res.data) {
        set((state) => {
          const updatedOrders = state.orders.map(o => (o._id === res.data._id || o.orderNumber === res.data.orderNumber) ? res.data : o);
          return {
            orders: updatedOrders,
            dashboardData: generateDashboardData(updatedOrders, state.expenses),
          };
        });
        return res.data;
      }
    } catch (err) {
      console.error('[deleteOrderPayment Error]:', err.message);
      throw err;
    }
  },

  deleteOrder: async (orderId) => {
    const targetId = typeof orderId === 'object' ? (orderId._id || orderId.orderNumber) : orderId;
    
    // Optimistic UI update
    set((state) => {
      const updatedOrders = state.orders.filter(
        (o) => o._id !== targetId && o.orderNumber !== targetId && o._id !== orderId
      );
      return {
        orders: updatedOrders,
        dashboardData: generateDashboardData(updatedOrders, state.expenses),
      };
    });

    try {
      await api.deleteOrder(targetId);
    } catch (err) {
      console.warn('[deleteOrder DB Warning]:', err.message);
    }
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
