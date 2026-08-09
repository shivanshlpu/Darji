import express from 'express';
import { protect } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';

import { login, getMe, updatePassword } from '../controllers/authController.js';
import { getCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer } from '../controllers/customerController.js';
import { getCustomerMeasurements, createMeasurementVersion } from '../controllers/measurementController.js';
import { getOrders, createOrder, updateOrder, markOrderAsPaid, updateOrderStatus } from '../controllers/orderController.js';
import { addPayment } from '../controllers/paymentController.js';
import { createInvoice } from '../controllers/invoiceController.js';
import { getExpenses, createExpense, deleteExpense } from '../controllers/expenseController.js';
import { getCashbookByDate, closeCashbook } from '../controllers/cashbookController.js';
import { getDashboardSummary } from '../controllers/dashboardController.js';
import { processQueryAI } from '../controllers/queryAIController.js';
import { getShopSettings, updateShopSettings } from '../controllers/settingsController.js';
import { handleClearEntryData } from '../controllers/systemController.js';

const router = express.Router();

// System Data Maintenance
router.post('/system/clear-entry-data', protect, auditLog('System', 'CLEAR_ENTRY_DATA'), handleClearEntryData);

// Public Auth
router.post('/auth/login', login);
router.get('/auth/me', protect, getMe);
router.post('/auth/change-password', protect, updatePassword);

// Customers
router.get('/customers', protect, getCustomers);
router.get('/customers/:id', protect, getCustomerById);
router.post('/customers', protect, auditLog('Customer', 'CREATE'), createCustomer);
router.put('/customers/:id', protect, auditLog('Customer', 'UPDATE'), updateCustomer);
router.delete('/customers/:id', protect, auditLog('Customer', 'DELETE'), deleteCustomer);

// Measurements
router.get('/customers/:customerId/measurements', protect, getCustomerMeasurements);
router.post('/measurements', protect, auditLog('Measurement', 'CREATE_VERSION'), createMeasurementVersion);

// Orders
router.get('/orders', protect, getOrders);
router.post('/orders', protect, auditLog('Order', 'CREATE'), createOrder);
router.put('/orders/:id', protect, auditLog('Order', 'UPDATE'), updateOrder);
router.post('/orders/:id/mark-paid', protect, auditLog('Order', 'MARK_PAID'), markOrderAsPaid);
router.patch('/orders/:id/status', protect, auditLog('Order', 'STATUS_TRANSITION'), updateOrderStatus);

// Payments
router.post('/orders/:id/payments', protect, auditLog('Payment', 'CREATE'), addPayment);

// Invoices
router.post('/orders/:id/invoice', protect, auditLog('Invoice', 'CREATE'), createInvoice);

// Expenses
router.get('/expenses', protect, getExpenses);
router.post('/expenses', protect, auditLog('Expense', 'CREATE'), createExpense);
router.delete('/expenses/:id', protect, auditLog('Expense', 'DELETE'), deleteExpense);

// Cashbook
router.get('/cashbook/:date', protect, getCashbookByDate);
router.post('/cashbook/:date/close', protect, auditLog('Cashbook', 'CLOSE'), closeCashbook);

// Dashboard & Analytics
router.get('/dashboard/summary', protect, getDashboardSummary);

// Query AI
router.post('/query-ai/ask', protect, processQueryAI);

// Settings
router.get('/settings/shop', protect, getShopSettings);
router.put('/settings/shop', protect, auditLog('Shop', 'UPDATE_SETTINGS'), updateShopSettings);

export default router;
