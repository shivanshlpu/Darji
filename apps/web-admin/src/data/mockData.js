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

  const todaySales = orders
    .filter(o => o.createdAt && o.createdAt.slice(0, 10) === today)
    .reduce((s, o) => s + (o.paidAmount || o.advancePaid || 0), 0);

  const totalPending = orders
    .filter(o => !['completed', 'delivered', 'cancelled'].includes(o.status))
    .reduce((s, o) => s + (o.pendingAmount || o.balanceDue || 0), 0);

  const dueToday = orders.filter(o => {
    if (!o.deliveryDate || ['completed', 'delivered', 'cancelled'].includes(o.status)) return false;
    return o.deliveryDate.slice(0, 10) <= today;
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
