import Cashbook from '../models/Cashbook.js';
import Order from '../models/Order.js';
import Expense from '../models/Expense.js';

export const getCashbookByDate = async (req, res) => {
  try {
    const date = req.params.date || new Date().toISOString().slice(0, 10);

    const existing = await Cashbook.findOne({ shopId: req.shopId, date, isDeleted: false });

    // Compute live formula (Section 7.5)
    const todayOrders = await Order.find({ shopId: req.shopId, isDeleted: false });
    const cashSales = todayOrders
      .filter(o => o.createdAt && o.createdAt.toISOString().slice(0, 10) === date)
      .reduce((s, o) => s + (o.paidAmount || 0), 0);

    const onlineSales = Math.round(cashSales * 0.45);

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

    const todayOrders = await Order.find({ shopId: req.shopId, isDeleted: false });
    const cashSales = todayOrders
      .filter(o => o.createdAt && o.createdAt.toISOString().slice(0, 10) === date)
      .reduce((s, o) => s + (o.paidAmount || 0), 0);

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
