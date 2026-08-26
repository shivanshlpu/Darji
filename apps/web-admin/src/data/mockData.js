// Clean Production Empty State Generator (No Mock/Seed Data)

export function generateCustomers() {
  return [];
}

export function generateMeasurements() {
  return [];
}

export function generateOrders() {
  return [];
}

export function generateExpenses() {
  return [];
}

export function generateDashboardData(orders = [], expenses = []) {
  const today = new Date().toISOString().slice(0, 10);

  let todaySales = 0;
  for (const o of orders) {
    if (Array.isArray(o.payments) && o.payments.length > 0) {
      for (const p of o.payments) {
        const pDate = p.date ? new Date(p.date).toISOString().slice(0, 10) : '';
        if (pDate === today) {
          todaySales += (Number(p.amount) || 0);
        }
      }
    } else {
      const legacyDate = o.orderDate ? (typeof o.orderDate === 'string' ? o.orderDate.slice(0, 10) : new Date(o.orderDate).toISOString().slice(0, 10)) : (o.createdAt ? (typeof o.createdAt === 'string' ? o.createdAt.slice(0, 10) : new Date(o.createdAt).toISOString().slice(0, 10)) : '');
      if (legacyDate === today) {
        todaySales += (Number(o.paidAmount) || Number(o.advancePaid) || 0);
      }
    }
  }

  const totalPending = orders
    .filter(o => !['completed', 'delivered', 'cancelled'].includes(o.status))
    .reduce((s, o) => s + (Number(o.pendingAmount) || Number(o.balanceDue) || 0), 0);

  const dueToday = orders.filter(o => {
    if (!o.deliveryDate || ['completed', 'delivered', 'cancelled'].includes(o.status)) return false;
    const delStr = typeof o.deliveryDate === 'string' ? o.deliveryDate.slice(0, 10) : new Date(o.deliveryDate).toISOString().slice(0, 10);
    return delStr <= today;
  });

  const todayExpenses = expenses
    .filter(e => e.date === today)
    .reduce((s, e) => s + (e.amount || 0), 0);

  return {
    todaySales,
    totalPending,
    ordersDueToday: dueToday.length,
    todayExpenses,
    totalOrders: orders.length,
    recentOrders: orders.slice(0, 8),
  };
}
