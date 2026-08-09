import Expense from '../models/Expense.js';

export const getExpenses = async (req, res) => {
  try {
    const { category, date } = req.query;
    const query = { shopId: req.shopId, isDeleted: false };

    if (category && category !== 'all') query.category = category;
    if (date) query.date = date;

    const expenses = await Expense.find(query).sort({ date: -1 });
    res.json({ success: true, count: expenses.length, data: expenses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createExpense = async (req, res) => {
  try {
    const expense = await Expense.create({
      ...req.body,
      shopId: req.shopId,
    });
    res.status(201).json({ success: true, data: expense });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const deleteExpense = async (req, res) => {
  try {
    await Expense.findOneAndUpdate(
      { _id: req.params.id, shopId: req.shopId },
      { isDeleted: true }
    );
    res.json({ success: true, message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
