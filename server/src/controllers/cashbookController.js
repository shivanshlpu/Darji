import Cashbook from '../models/Cashbook.js';
import Order from '../models/Order.js';
import Expense from '../models/Expense.js';

function getSalesForDate(orders, dateStr) {
  let cash = 0;
  let online = 0;

  for (const o of orders) {
    if (Array.isArray(o.payments) && o.payments.length > 0) {
      for (const p of o.payments) {
        const pDateStr = p.date ? new Date(p.date).toISOString().slice(0, 10) : '';
        if (pDateStr === dateStr) {
          const amt = Number(p.amount) || 0;
          if (p.mode === 'cash') {
            cash += amt;
          } else {
            online += amt;
          }
        }
      }
    } else {
      // Legacy order fallback
      const legacyDate = o.orderDate ? new Date(o.orderDate) : (o.createdAt ? new Date(o.createdAt) : null);
      if (legacyDate && legacyDate.toISOString().slice(0, 10) === dateStr) {
        const amt = Number(o.paidAmount) || Number(o.advancePaid) || 0;
        cash += amt;
      }
    }
  }

  return { cashSales: cash, onlineSales: online };
}

export const getCashbookByDate = async (req, res) => {
  try {
    const date = req.params.date || new Date().toISOString().slice(0, 10);

    const existing = await Cashbook.findOne({ shopId: req.shopId, date, isDeleted: false });

    // Compute live formula (Section 7.5) from actual payments received on this date
    const allOrders = await Order.find({ shopId: req.shopId, isDeleted: false });
    const { cashSales, onlineSales } = getSalesForDate(allOrders, date);

    const todayExpenses = await Expense.find({ shopId: req.shopId, date, paymentMode: 'cash', isDeleted: false });
    const totalExpenses = todayExpenses.filter(e => e.type !== 'income').reduce((s, e) => s + e.amount, 0);
    const totalExtraCashIncome = todayExpenses.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);

    const openingCash = existing ? existing.openingCash : 12500;
    const closingCashExpected = openingCash + cashSales + totalExtraCashIncome - totalExpenses;

    res.json({
      success: true,
      data: {
        date,
        openingCash,
        cashSales,
        onlineSales,
        totalExtraCashIncome,
        totalExpenses,
        closingCashExpected,
        closingCashActual: existing ? existing.closingCashActual : closingCashExpected,
        mismatch: existing ? existing.mismatch : 0,
        mismatchReason: existing ? existing.mismatchReason : '',
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const closeCashbook = async (req, res) => {
  try {
    const { date, openingCash, closingCashActual, mismatchReason } = req.body;

    const allOrders = await Order.find({ shopId: req.shopId, isDeleted: false });
    const { cashSales } = getSalesForDate(allOrders, date);

    const todayExpenses = await Expense.find({ shopId: req.shopId, date, paymentMode: 'cash', isDeleted: false });
    const totalExpenses = todayExpenses.filter(e => e.type !== 'income').reduce((s, e) => s + e.amount, 0);
    const totalExtraCashIncome = todayExpenses.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);

    const closingCashExpected = openingCash + cashSales + totalExtraCashIncome - totalExpenses;
    const mismatch = closingCashActual - closingCashExpected;

    if (mismatch !== 0 && !mismatchReason?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Section 7.5 Rule: Cash mismatch reason is mandatory when mismatch != 0.',
      });
    }

    const cashbook = await Cashbook.findOneAndUpdate(
      { shopId: req.shopId, date },
      {
        shopId: req.shopId,
        date,
        openingCash,
        cashSales,
        totalExpenses,
        closingCashExpected,
        closingCashActual,
        mismatch,
        mismatchReason: mismatchReason || '',
      },
      { new: true, upsert: true }
    );

    res.json({ success: true, data: cashbook });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
