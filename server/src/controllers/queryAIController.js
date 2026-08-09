import Order from '../models/Order.js';
import Expense from '../models/Expense.js';
import Customer from '../models/Customer.js';
import Shop from '../models/Shop.js';
import Measurement from '../models/Measurement.js';

function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export const processQueryAI = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.json({
        success: true,
        type: 'error',
        message: 'Kripya koi prashna ya query likhein.',
        suggestions: ['Aaj ka sales kitna hai?', 'Aaj ka net profit dikhao', 'Sales report PDF download', 'Pending payments dikhao'],
      });
    }

    const raw = text.toLowerCase().trim();
    const todayStr = new Date().toISOString().slice(0, 10);

    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);

    const queryFilter = req.shopId ? { shopId: req.shopId, isDeleted: { $ne: true } } : { isDeleted: { $ne: true } };

    const orders = await Order.find(queryFilter).lean();
    const expenses = await Expense.find(queryFilter).lean();
    const customers = await Customer.find(queryFilter).lean();
    const shopConfig = (req.shopId ? await Shop.findById(req.shopId) : await Shop.findOne()) || {};

    const shopInfo = {
      name: shopConfig.name || 'Darji',
      phone: shopConfig.phone || '',
      address: shopConfig.address || '',
      email: shopConfig.email || 'darji.tailoring@gmail.com',
    };

    // 1. TODAY'S NET PROFIT / FAAYDA
    if (raw.includes('aaj') && (raw.includes('profit') || raw.includes('faayda') || raw.includes('net profit') || raw.includes('bachat') || raw.includes('nafa'))) {
      const todayOrders = orders.filter(o => o.createdAt && o.createdAt.toISOString().slice(0, 10) === todayStr);
      const todaySales = todayOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
      
      const todayExpensesList = expenses.filter(e => e.date === todayStr);
      const todayExpensesTotal = todayExpensesList.reduce((sum, e) => sum + (e.amount || 0), 0);

      const todayNetProfit = todaySales - todayExpensesTotal;
      const marginPct = todaySales > 0 ? ((todayNetProfit / todaySales) * 100).toFixed(1) : 0;

      return res.json({
        success: true,
        type: 'today_profit',
        message: `Aaj ka Net Profit ${formatINR(todayNetProfit)} hai (Collection: ${formatINR(todaySales)}, Kharcha: ${formatINR(todayExpensesTotal)}).`,
        details: [
          { label: "Today's Collection", value: formatINR(todaySales) },
          { label: "Today's Total Expenses", value: formatINR(todayExpensesTotal) },
          { label: "Today's Net Profit", value: formatINR(todayNetProfit) },
          { label: "Net Margin", value: `${marginPct}%` },
        ],
        suggestions: ['Aaj ka total kharcha dekho', 'Is hafte ka profit', 'Sales report PDF download'],
      });
    }

    // 2. TODAY'S EXPENSES LIST
    if (raw.includes('aaj') && (raw.includes('kharcha') || raw.includes('expense'))) {
      const todayExpensesList = expenses.filter(e => e.date === todayStr);
      const todayExpensesTotal = todayExpensesList.reduce((sum, e) => sum + (e.amount || 0), 0);

      if (todayExpensesList.length === 0) {
        return res.json({
          success: true,
          type: 'today_expenses',
          message: 'Aaj abhi tak koi kharcha entry record nahi hui hai.',
          details: [
            { label: "Today's Expenses", value: '₹ 0' }
          ],
          suggestions: ['Aaj ka net profit', 'Aaj ka sales kitna hai?'],
        });
      }

      return res.json({
        success: true,
        type: 'today_expenses',
        message: `Aaj total ${formatINR(todayExpensesTotal)} kharcha hua hai (${todayExpensesList.length} entries):`,
        details: todayExpensesList.map(e => ({
          label: `${e.description} (${(e.category || '').toUpperCase()})`,
          value: formatINR(e.amount),
        })),
        suggestions: ['Aaj ka net profit dikhao', 'Sales report PDF download'],
      });
    }

    // 3. YESTERDAY'S PERFORMANCE (KAL KA SALES / PROFIT)
    if (raw.includes('kal') && (raw.includes('sale') || raw.includes('profit') || raw.includes('business') || raw.includes('kamai'))) {
      const yestOrders = orders.filter(o => o.createdAt && o.createdAt.toISOString().slice(0, 10) === yesterdayStr);
      const yestSales = yestOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
      
      const yestExpenses = expenses.filter(e => e.date === yesterdayStr).reduce((sum, e) => sum + (e.amount || 0), 0);
      const yestProfit = yestSales - yestExpenses;

      return res.json({
        success: true,
        type: 'yesterday_performance',
        message: `Kal (Yesterday) ka collection ${formatINR(yestSales)}, kharcha ${formatINR(yestExpenses)}, aur Net Profit ${formatINR(yestProfit)} tha.`,
        details: [
          { label: "Yesterday's Collection", value: formatINR(yestSales) },
          { label: "Yesterday's Expenses", value: formatINR(yestExpenses) },
          { label: "Yesterday's Net Profit", value: formatINR(yestProfit) },
        ],
        suggestions: ['Aaj ka sales kitna hai?', 'Aaj ka net profit dikhao'],
      });
    }

    // 4. THIS WEEK'S PROFIT & SALES
    if ((raw.includes('hafte') || raw.includes('week') || raw.includes('7 din')) && (raw.includes('profit') || raw.includes('sales') || raw.includes('kamai'))) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysStr = sevenDaysAgo.toISOString().slice(0, 10);

      const weekOrders = orders.filter(o => o.createdAt && o.createdAt.toISOString().slice(0, 10) >= sevenDaysStr);
      const weekSales = weekOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);

      const weekExpenses = expenses.filter(e => e.date && e.date >= sevenDaysStr).reduce((sum, e) => sum + (e.amount || 0), 0);
      const weekNetProfit = weekSales - weekExpenses;

      return res.json({
        success: true,
        type: 'weekly_profit',
        message: `Pichle 7 dino me Total Collection ${formatINR(weekSales)}, Expenses ${formatINR(weekExpenses)}, aur Net Profit ${formatINR(weekNetProfit)} hai.`,
        details: [
          { label: 'Weekly Revenue', value: formatINR(weekSales) },
          { label: 'Weekly Expenses', value: formatINR(weekExpenses) },
          { label: 'Weekly Net Profit', value: formatINR(weekNetProfit) },
          { label: 'Orders Handled', value: `${weekOrders.length} Orders` },
        ],
        suggestions: ['Sales report PDF download', 'Is mahine ka profit'],
      });
    }

    // 5. SALES REPORT PDF & DATE-RANGE QUERY
    if (raw.includes('report') || raw.includes('pdf') || raw.includes('print') || raw.includes('download')) {
      const dateMatches = raw.match(/\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})\b/g);

      let startDate = '';
      let endDate = '';

      if (dateMatches && dateMatches.length >= 2) {
        startDate = dateMatches[0];
        endDate = dateMatches[1];
      } else {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate = firstDay.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        endDate = now.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      }

      const totalSales = orders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
      const grandTotalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || o.grandTotal || o.subtotal || 0), 0);
      const totalOrders = orders.length;
      const paidAmount = totalSales;
      const pendingAmount = orders.reduce((sum, o) => sum + (o.pendingAmount || 0), 0);
      const totalExp = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const netProfit = totalSales - totalExp;

      const ordersList = orders.slice(0, 25).map(o => ({
        orderNumber: o.orderNumber || o.invoiceNo || 'ORD-001',
        tokenNumber: o.tokenNumber || '',
        customerName: o.customerName || 'Customer',
        date: o.orderDate ? new Date(o.orderDate).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'),
        grandTotal: o.totalAmount || o.grandTotal || o.subtotal || 0,
        paidAmount: o.paidAmount || o.advancePaid || 0,
        status: o.status || 'pending',
      }));

      return res.json({
        success: true,
        type: 'pdf_report',
        message: `Sales & Financial Report generated for period (${startDate} to ${endDate}). Zero backend load!`,
        details: [
          { label: 'Total Orders', value: `${totalOrders} Orders` },
          { label: 'Total Billed Revenue', value: formatINR(grandTotalRevenue) },
          { label: 'Paid Collection', value: formatINR(paidAmount) },
          { label: 'Pending Balance', value: formatINR(pendingAmount) },
          { label: 'Total Operating Expenses', value: formatINR(totalExp) },
          { label: 'Net Profit', value: formatINR(netProfit) },
        ],
        reportData: {
          startDate,
          endDate,
          totalSales,
          totalOrders,
          paidAmount,
          pendingAmount,
          totalExpenses: totalExp,
          netProfit,
          shopInfo,
          ordersList,
        },
        suggestions: ['Pending payments dikhao', 'Aaj delivery wale orders', 'Top spending customers'],
      });
    }

    // 6. CUSTOMER MEASUREMENT / NAAP QUERY
    if (raw.includes('naap') || raw.includes('measurement') || raw.includes('size') || raw.includes('sizes')) {
      const matchedCustomer = customers.find(c => c.name && raw.includes(c.name.toLowerCase().split(' ')[0]));

      if (matchedCustomer) {
        const dbMeasurements = await Measurement.find({ customerId: matchedCustomer._id.toString() }).sort({ version: -1 }).lean();
        let foundMeas = dbMeasurements.length > 0 ? dbMeasurements[0].fields : null;
        let garmentName = dbMeasurements.length > 0 ? dbMeasurements[0].category : 'Top Wear';

        if (!foundMeas) {
          const custOrders = orders.filter(o => o.customerId?.toString() === matchedCustomer._id.toString() || (o.customerName && o.customerName.toLowerCase() === matchedCustomer.name.toLowerCase()));
          for (const o of custOrders) {
            if (Array.isArray(o.items)) {
              for (const item of o.items) {
                if (item.measurements && Object.keys(item.measurements).length > 0) {
                  foundMeas = item.measurements;
                  garmentName = item.name || item.category || 'Top Wear';
                  break;
                }
              }
            }
            if (foundMeas) break;
          }
        }

        if (foundMeas) {
          return res.json({
            success: true,
            type: 'measurement',
            message: `${matchedCustomer.name} ji ke saved measurements (${garmentName}):`,
            details: Object.entries(foundMeas).map(([key, val]) => ({
              label: key.replace(/([A-Z])/g, ' $1').toUpperCase(),
              value: `${val} in`,
            })),
            suggestions: [`${matchedCustomer.name} ka pending payment`, 'Aaj ka sales'],
          });
        } else {
          return res.json({
            success: true,
            type: 'measurement',
            message: `${matchedCustomer.name} ji ke abhi tak koi measurements save nahi hue hain.`,
            suggestions: ['New Order register karo', 'Pending payments dikhao'],
          });
        }
      }
    }

    // 7. READY / UNCOLLECTED GARMENTS IN SHOP
    if (raw.includes('taiyaar') || raw.includes('tayar') || raw.includes('ready') || raw.includes('shop') || raw.includes('kapde')) {
      const readyOrders = orders.filter(o => o.status === 'ready');
      const totalReadyPending = readyOrders.reduce((s, o) => s + (o.pendingAmount || 0), 0);

      if (readyOrders.length === 0) {
        return res.json({
          success: true,
          type: 'ready_orders',
          message: 'Dukaan mein abhi koi uncollected ready garments nahi hain! Sabhi deliver ho chuke hain.',
          suggestions: ['Aaj ki delivery check karo', 'Pending payments'],
        });
      }

      return res.json({
        success: true,
        type: 'ready_orders',
        message: `Dukaan mein kul ${readyOrders.length} ready orders customer ke uthane ke liye tayar hain (Pending balance: ${formatINR(totalReadyPending)}):`,
        details: readyOrders.slice(0, 5).map(o => ({
          label: `${o.customerName} (${o.orderNumber || o.tokenNumber})`,
          value: `Pending: ${formatINR(o.pendingAmount)}`,
        })),
        suggestions: ['Pending payments check karo', 'Aaj delivery wale orders'],
      });
    }

    // 8. TODAY SALES
    if (raw.includes('aaj') && (raw.includes('sale') || raw.includes('business') || raw.includes('kamai') || raw.includes('total'))) {
      const todayOrders = orders.filter(o => o.createdAt && o.createdAt.toISOString().slice(0, 10) === todayStr);
      const totalSales = todayOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
      const orderCount = todayOrders.length;

      return res.json({
        success: true,
        type: 'sales',
        message: `Aaj ka total sales ${formatINR(totalSales)} hai (${orderCount} orders received).`,
        details: [
          { label: "Today's Collection", value: formatINR(totalSales) },
          { label: 'Orders Placed Today', value: orderCount },
        ],
        suggestions: ['Aaj ka net profit dikhao', 'Pending payments check karo', 'Is mahine ka profit'],
      });
    }

    // 9. PENDING PAYMENTS
    if (raw.includes('pending') || raw.includes('baaki') || raw.includes('udhaar') || raw.includes('baki')) {
      const matchedCustomer = customers.find(c => c.name && raw.includes(c.name.toLowerCase().split(' ')[0]));

      if (matchedCustomer) {
        const custOrders = orders.filter(o => (o.customerId?.toString() === matchedCustomer._id.toString() || (o.customerName && o.customerName.toLowerCase() === matchedCustomer.name.toLowerCase())) && o.pendingAmount > 0);
        const totalPending = custOrders.reduce((s, o) => s + o.pendingAmount, 0);

        return res.json({
          success: true,
          type: 'customer_pending',
          message: `${matchedCustomer.name} ka kul ${formatINR(totalPending)} pending hai.`,
          details: custOrders.map(o => ({
            label: `${o.orderNumber} (${o.status})`,
            value: formatINR(o.pendingAmount),
          })),
        });
      }

      const pendingOrders = orders.filter(o => o.pendingAmount > 0);
      const totalPending = pendingOrders.reduce((s, o) => s + o.pendingAmount, 0);

      return res.json({
        success: true,
        type: 'pending_payments',
        message: `Kul ${pendingOrders.length} orders ka ${formatINR(totalPending)} pending hai.`,
        details: pendingOrders.slice(0, 5).map(o => ({
          label: `${o.customerName} (${o.orderNumber})`,
          value: formatINR(o.pendingAmount),
        })),
        suggestions: ['Aaj ki delivery check karo', 'Top spending customers'],
      });
    }

    // 10. MONTHLY PROFIT
    if (raw.includes('profit') || raw.includes('faayda') || raw.includes('nafa') || raw.includes('margin') || raw.includes('mahine')) {
      const totalSales = orders.reduce((s, o) => s + (o.paidAmount || 0), 0);
      const totalExp = expenses.reduce((s, e) => s + (e.amount || 0), 0);
      const netProfit = totalSales - totalExp;
      const marginPct = totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : 0;

      return res.json({
        success: true,
        type: 'profit',
        message: `Is period me total sales ${formatINR(totalSales)}, expenses ${formatINR(totalExp)}, aur Net Profit ${formatINR(netProfit)} (${marginPct}% margin) hai.`,
        details: [
          { label: 'Total Revenue', value: formatINR(totalSales) },
          { label: 'Total Expenses', value: formatINR(totalExp) },
          { label: 'Net Profit', value: formatINR(netProfit) },
          { label: 'Profit Margin', value: `${marginPct}%` },
        ],
        suggestions: ['Sales report PDF download', 'Expense breakdown dekho'],
      });
    }

    // FALLBACK
    return res.json({
      success: true,
      type: 'fallback',
      message: 'Mujhe aapse query samajh aayi nahi. Aap niche diye quick buttons par click kar sakte hain.',
      suggestions: ['Aaj ka sales kitna hai?', 'Aaj ka net profit dikhao', 'Aaj ka total kharcha dekho', 'Kal ka sales aur profit', 'Is hafte ka profit'],
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
