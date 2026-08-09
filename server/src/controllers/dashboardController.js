import Order from '../models/Order.js';
import Expense from '../models/Expense.js';

export const getDashboardSummary = async (req, res) => {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);

    const orders = await Order.find({ shopId: req.shopId, isDeleted: false }).sort({ createdAt: -1 });
    const expenses = await Expense.find({ shopId: req.shopId, isDeleted: false });

    const todayOrders = orders.filter(o => o.createdAt && o.createdAt.toISOString().slice(0, 10) === todayStr);
    const todaySales = todayOrders.reduce((s, o) => s + (o.paidAmount || 0), 0);
    const totalPending = orders.reduce((s, o) => s + (o.pendingAmount || 0), 0);
    const dueToday = orders.filter(o => o.deliveryDate && o.deliveryDate.toISOString().slice(0, 10) === todayStr && o.status !== 'delivered' && o.status !== 'completed' && o.status !== 'cancelled').length;
    const todayExpenses = expenses.filter(e => e.date === todayStr).reduce((s, e) => s + e.amount, 0);

    // Weekly sales trend (last 7 days)
    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' });

      const daySales = orders.filter(o => o.createdAt && o.createdAt.toISOString().slice(0, 10) === dateStr).reduce((s, o) => s + (o.paidAmount || 0), 0);
      const dayExp = expenses.filter(e => e.date === dateStr).reduce((s, e) => s + e.amount, 0);

      weeklyData.push({ day: dayName, date: dateStr, sales: daySales, expenses: dayExp });
    }

    // Status distribution
    const statusCounts = {};
    orders.forEach(o => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });
    const statusDistribution = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

    res.json({
      success: true,
      data: {
        todaySales,
        totalPending,
        ordersDueToday: dueToday,
        todayExpenses,
        totalOrders: orders.length,
        weeklyData,
        statusDistribution,
        recentOrders: orders.slice(0, 8),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
