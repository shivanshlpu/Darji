import Order from '../models/Order.js';
import Expense from '../models/Expense.js';

function calculateDaySales(orders, dateStr) {
  let total = 0;
  for (const o of orders) {
    if (Array.isArray(o.payments) && o.payments.length > 0) {
      for (const p of o.payments) {
        const pDate = p.date ? new Date(p.date).toISOString().slice(0, 10) : '';
        if (pDate === dateStr) {
          total += Number(p.amount) || 0;
        }
      }
    } else {
      const legacyDate = o.orderDate ? new Date(o.orderDate) : (o.createdAt ? new Date(o.createdAt) : null);
      if (legacyDate && legacyDate.toISOString().slice(0, 10) === dateStr) {
        total += Number(o.paidAmount) || Number(o.advancePaid) || 0;
      }
    }
  }
  return total;
}

export const getDashboardSummary = async (req, res) => {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);

    const orders = await Order.find({ shopId: req.shopId, isDeleted: false }).sort({ createdAt: -1 });
    const expenses = await Expense.find({ shopId: req.shopId, isDeleted: false });

    const todaySales = calculateDaySales(orders, todayStr);
    const totalPending = orders.reduce((s, o) => s + (Number(o.pendingAmount) || Number(o.balanceDue) || 0), 0);
    const dueToday = orders.filter(o => o.deliveryDate && o.deliveryDate.toISOString().slice(0, 10) === todayStr && o.status !== 'delivered' && o.status !== 'completed' && o.status !== 'cancelled').length;
    const todayExpenses = expenses.filter(e => e.date === todayStr).reduce((s, e) => s + e.amount, 0);

    // Weekly sales trend (last 7 days by payment received date)
    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' });

      const daySales = calculateDaySales(orders, dateStr);
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
