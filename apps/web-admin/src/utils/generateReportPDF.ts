export interface ReportPDFData {
  title: string;
  language: 'en' | 'hi';
  shopInfo: {
    name?: string;
    tagline?: string;
    address?: string;
    phone?: string;
    email?: string;
    logoUrl?: string | null;
    signatureUrl?: string | null;
  };
  dateRangeStr: string; // e.g., "01-08-2026 to 06-08-2026"
  periodLabel: string;
  stats: {
    totalSales: number;
    totalBilled: number;
    totalDiscounts?: number;
    discountCount?: number;
    totalPending: number;
    totalExtraIncome?: number;
    totalExp: number;
    totalGrossRevenue?: number;
    netProfit: number;
    marginPct: string | number;
  };
  discountsLedger?: Array<{
    orderNumber: string;
    tokenNumber?: string;
    customerName: string;
    customerMobile?: string;
    date: string;
    subtotal: number;
    discount: number;
    discountType?: string;
    discountValue?: number;
    grandTotal: number;
  }>;
  paymentsLedger?: Array<{
    orderNumber: string;
    tokenNumber?: string;
    customerName: string;
    customerMobile?: string;
    date: string;
    amount: number;
    mode: string;
    type: string;
    notes?: string;
  }>;
  orders: Array<{
    orderNumber: string;
    tokenNumber?: string;
    customerName: string;
    date: string;
    subtotal?: number;
    discount?: number;
    grandTotal: number;
    paidAmount: number;
    pendingAmount: number;
    status: string;
  }>;
  expenses: Array<{
    date: string;
    type?: string;
    description: string;
    category: string;
    paymentMode: string;
    amount: number;
  }>;
}

const formatINR = (num: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(num || 0);

export function generateReportPDFHTML(data: ReportPDFData): string {
  const isHi = data.language === 'hi';
  const shopName = data.shopInfo?.name || 'DARJI';
  const tagline = data.shopInfo?.tagline || 'Smart Tailor ERP';
  const address = data.shopInfo?.address || '80/LIG 1ST New Housing Board Colony, Shahdol (M.P.) 484001';
  const phone = data.shopInfo?.phone || '+91 78289 62210, 70006 21972';
  const logoUrl = data.shopInfo?.logoUrl;
  const signatureUrl = data.shopInfo?.signatureUrl;

  const orders = data.orders || [];
  const expenses = data.expenses || [];
  const discountsLedger = data.discountsLedger || [];
  const paymentsLedger = data.paymentsLedger || [];

  return `
<!DOCTYPE html>
<html lang="${data.language}">
<head>
  <meta charset="UTF-8">
  <title>${data.title} - ${data.dateRangeStr}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      color: #1e293b;
      background: #ffffff;
      padding: 30px;
      font-size: 13px;
      line-height: 1.5;
    }

    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 20px;
      border-bottom: 3px solid #0f172a;
      margin-bottom: 20px;
    }

    .brand-group {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .logo-img {
      width: 75px;
      height: 75px;
      object-fit: contain;
    }

    .brand-text h1 {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
    }

    .brand-text p {
      font-size: 12px;
      color: #64748b;
      font-weight: 500;
    }

    .meta-group {
      text-align: right;
    }

    .meta-badge {
      display: inline-block;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 6px 14px;
      border-radius: 6px;
      font-weight: 700;
      color: #0f172a;
      font-size: 13px;
      margin-bottom: 6px;
    }

    .meta-range {
      font-size: 12px;
      color: #b45309;
      font-weight: 600;
    }

    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 24px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-left: 4px solid #c9a24b;
      padding-left: 10px;
    }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 8px;
      margin-bottom: 24px;
    }

    .card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
    }

    .card-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      font-weight: 700;
    }

    .card-val {
      font-size: 16px;
      font-weight: 800;
      margin-top: 4px;
    }

    .val-sales { color: #166534; }
    .val-disc { color: #d97706; }
    .val-exp { color: #991b1b; }
    .val-profit { color: #b45309; }
    .val-pending { color: #c2410c; }
    .val-income { color: #15803d; }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }

    th {
      background: #0f172a;
      color: #ffffff;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 8px 10px;
      text-align: left;
    }

    td {
      padding: 8px 10px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 12px;
    }

    tr:nth-child(even) {
      background: #f8fafc;
    }

    .badge-status {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .status-completed { background: #dcfce7; color: #166534; }
    .status-pending { background: #fef3c7; color: #92400e; }
    .status-preparing { background: #dbeafe; color: #1e40af; }
    .status-ready { background: #dcfce7; color: #15803d; }

    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }

    .signature-box {
      text-align: right;
    }

    .signature-img {
      max-height: 45px;
      margin-bottom: 4px;
    }

    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    @media print {
      body { padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .no-print { display: none !important; }
    }
    .report-header, .cards-grid, .section-title, tr, .footer {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .section-title {
      page-break-after: avoid;
      break-after: avoid;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="report-header">
    <div class="brand-group">
      ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="logo-img" />` : ''}
      <div class="brand-text">
        <h1>${shopName}</h1>
        <p>${tagline}</p>
        <p style="margin-top: 2px;">${address}</p>
        <p>Ph: ${phone}</p>
      </div>
    </div>
    <div class="meta-group">
      <div class="meta-badge">${isHi ? 'वित्तीय बिक्री व राजस्व रिपोर्ट' : 'FINANCIAL SALES & REVENUE REPORT'}</div>
      <div class="meta-range">📅 ${isHi ? 'अवधि' : 'Period'}: ${data.dateRangeStr}</div>
      <p style="font-size: 11px; color: #64748b; margin-top: 4px;">${isHi ? 'फिल्टर' : 'Filter'}: ${data.periodLabel}</p>
    </div>
  </div>

  <!-- Summary Cards Grid -->
  <div class="cards-grid">
    <div class="card">
      <span class="card-label">${isHi ? 'कुल प्राप्त आय' : 'Total Revenue'}</span>
      <p class="card-val val-sales">${formatINR(data.stats.totalSales)}</p>
      <small style="color: #64748b;">${isHi ? 'कुल बिलिंग' : 'Total Billed'}: ${formatINR(data.stats.totalBilled)}</small>
    </div>

    <div class="card" style="background: #f0fdf4; border-color: #bbf7d0;">
      <span class="card-label">${isHi ? 'अतिरिक्त आय' : 'Extra Income'}</span>
      <p class="card-val val-income">+${formatINR(data.stats.totalExtraIncome || 0)}</p>
      <small style="color: #166534;">${isHi ? 'टास्क/यूट्यूब' : 'Tasks/Online'}</small>
    </div>

    <div class="card" style="background: #fffbeb; border-color: #fde68a;">
      <span class="card-label">${isHi ? 'कुल डिस्काउंट' : 'Discounts'}</span>
      <p class="card-val val-disc">${formatINR(data.stats.totalDiscounts || 0)}</p>
      <small style="color: #b45309;">${data.stats.discountCount || 0} ${isHi ? 'ऑर्डर्स' : 'orders'}</small>
    </div>

    <div class="card">
      <span class="card-label">${isHi ? 'कुल खर्चे' : 'Total Expenses'}</span>
      <p class="card-val val-exp">${formatINR(data.stats.totalExp)}</p>
      <small style="color: #64748b;">${expenses.filter(e => e.type !== 'income').length} ${isHi ? 'खर्चे' : 'expenses'}</small>
    </div>

    <div class="card" style="background: #fefce8; border-color: #fef08a;">
      <span class="card-label">${isHi ? 'शुद्ध लाभ' : 'Net Profit'}</span>
      <p class="card-val val-profit">${formatINR(data.stats.netProfit)}</p>
      <small style="color: #64748b;">${isHi ? 'मार्जिन' : 'Margin'}: ${data.stats.marginPct}%</small>
    </div>

    <div class="card">
      <span class="card-label">${isHi ? 'कुल बकाया' : 'Uncollected'}</span>
      <p class="card-val val-pending">${formatINR(data.stats.totalPending)}</p>
      <small style="color: #64748b;">${isHi ? 'सक्रिय ऑर्डर्स पर' : 'Active orders'}</small>
    </div>
  </div>

  <!-- Customer Discount Ledger -->
  ${discountsLedger.length > 0 ? `
  <div class="section-title">
    <span>🏷️ ${isHi ? 'ग्राहक डिस्काउंट लेजर विवरण' : 'Customer Discount Ledger'} (${discountsLedger.length})</span>
  </div>
  <table>
    <thead>
      <tr>
        <th>${isHi ? 'तारीख' : 'DATE'}</th>
        <th>${isHi ? 'ऑर्डर / टोकन #' : 'ORDER / TOKEN'}</th>
        <th>${isHi ? 'ग्राहक का नाम' : 'CUSTOMER'}</th>
        <th>${isHi ? 'मूल राशि (Subtotal)' : 'SUBTOTAL'}</th>
        <th>${isHi ? 'डिस्काउंट राशि' : 'DISCOUNT'}</th>
        <th>${isHi ? 'अंतिम कुल' : 'GRAND TOTAL'}</th>
      </tr>
    </thead>
    <tbody>
      ${discountsLedger.map(d => `
        <tr>
          <td>${d.date}</td>
          <td><strong>${d.orderNumber}</strong> (${d.tokenNumber || 'T-100'})</td>
          <td>${d.customerName} ${d.customerMobile ? `(${d.customerMobile})` : ''}</td>
          <td>${formatINR(d.subtotal)}</td>
          <td style="color: #d97706; font-weight: 700;">- ${formatINR(d.discount)} ${d.discountType === 'percent' ? `(${d.discountValue}%)` : ''}</td>
          <td style="color: #166534; font-weight: 700;">${formatINR(d.grandTotal)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  ` : ''}

  <!-- Payment Collections Table -->
  ${paymentsLedger.length > 0 ? `
  <div class="section-title">
    <span>💰 ${isHi ? 'ग्राहक भुगतान व संग्रह विवरण (Payment Collections Ledger)' : 'Customer Payment Collections Ledger'} (${paymentsLedger.length})</span>
  </div>
  <table>
    <thead>
      <tr>
        <th>${isHi ? 'तारीख व समय' : 'DATE & TIME'}</th>
        <th>${isHi ? 'ऑर्डर / टोकन #' : 'ORDER / TOKEN'}</th>
        <th>${isHi ? 'ग्राहक का नाम' : 'CUSTOMER'}</th>
        <th>${isHi ? 'माध्यम' : 'MODE'}</th>
        <th>${isHi ? 'प्रकार' : 'TYPE'}</th>
        <th>${isHi ? 'जमा राशि' : 'AMOUNT PAID'}</th>
      </tr>
    </thead>
    <tbody>
      ${paymentsLedger.map(p => `
        <tr>
          <td>${p.date}</td>
          <td><strong>${p.orderNumber}</strong> (${p.tokenNumber || 'T-100'})</td>
          <td>${p.customerName} ${p.customerMobile ? `(${p.customerMobile})` : ''}</td>
          <td><span style="font-weight: 700; text-transform: uppercase;">${p.mode}</span></td>
          <td style="text-transform: capitalize;">${p.type}</td>
          <td style="color: #166534; font-weight: 700;">+ ${formatINR(p.amount)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  ` : ''}

  <!-- Orders Table -->
  <div class="section-title">
    <span>📋 ${isHi ? 'ऑर्डर एवं बिक्री खाता विवरण' : 'Orders & Sales Ledger'} (${orders.length})</span>
  </div>
  <table>
    <thead>
      <tr>
        <th>${isHi ? 'तारीख' : 'DATE'}</th>
        <th>${isHi ? 'ऑर्डर / टोकन #' : 'ORDER / TOKEN'}</th>
        <th>${isHi ? 'ग्राहक का नाम' : 'CUSTOMER'}</th>
        <th>${isHi ? 'कुल राशि' : 'TOTAL'}</th>
        <th>${isHi ? 'प्राप्त (Advance)' : 'PAID'}</th>
        <th>${isHi ? 'बकाया' : 'BALANCE'}</th>
        <th>${isHi ? 'स्थिति' : 'STATUS'}</th>
      </tr>
    </thead>
    <tbody>
      ${orders.length === 0 ? `
        <tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 20px;">${isHi ? 'इस अवधि में कोई ऑर्डर नहीं मिला' : 'No orders found in this date range'}</td></tr>
      ` : orders.map(o => `
        <tr>
          <td>${o.date}</td>
          <td><strong>${o.orderNumber}</strong> (${o.tokenNumber || 'T-100'})</td>
          <td>${o.customerName}</td>
          <td>${formatINR(o.grandTotal)}</td>
          <td style="color: #166534; font-weight: 600;">${formatINR(o.paidAmount)}</td>
          <td style="color: #c2410c; font-weight: 600;">${formatINR(o.pendingAmount)}</td>
          <td><span class="badge-status status-${o.status}">${o.status.toUpperCase()}</span></td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- Expenses Table -->
  <div class="section-title">
    <span>💸 ${isHi ? 'दुकान के खर्चे का विवरण' : 'Expenses Breakdown Ledger'} (${expenses.length})</span>
  </div>
  <table>
    <thead>
      <tr>
        <th>${isHi ? 'तारीख' : 'DATE'}</th>
        <th>${isHi ? 'विवरण' : 'DESCRIPTION'}</th>
        <th>${isHi ? 'श्रेणी' : 'CATEGORY'}</th>
        <th>${isHi ? 'माध्यम' : 'MODE'}</th>
        <th>${isHi ? 'राशि' : 'AMOUNT'}</th>
      </tr>
    </thead>
    <tbody>
      ${expenses.length === 0 ? `
        <tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 20px;">${isHi ? 'इस अवधि में कोई खर्चा दर्ज नहीं है' : 'No expenses recorded in this date range'}</td></tr>
      ` : expenses.map(e => `
        <tr>
          <td>${e.date}</td>
          <td>${e.description}</td>
          <td>${e.category}</td>
          <td>${e.paymentMode.toUpperCase()}</td>
          <td style="color: #991b1b; font-weight: 700;">${formatINR(e.amount)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- Footer -->
  <div class="footer">
    <div>
      <p style="font-size: 11px; color: #64748b;">${isHi ? 'यह कंप्यूटर जनित रिपोर्ट है।' : 'This is a computer generated financial ledger report.'}</p>
      <p style="font-size: 11px; color: #94a3b8;">DARJI ERP • ${shopName}</p>
    </div>
    <div class="signature-box">
      ${signatureUrl ? `<img src="${signatureUrl}" alt="Signature" class="signature-img" />` : ''}
      <p style="font-size: 12px; font-weight: 700; color: #0f172a;">${isHi ? 'अधिकृत हस्ताक्षर' : 'Authorized Signature'}</p>
    </div>
  </div>
</body>
</html>
  `;
}

export function printReportPDF(data: ReportPDFData) {
  const html = generateReportPDFHTML(data);

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '0';
  iframe.style.width = '210mm';
  iframe.style.height = '297mm';
  iframe.style.border = 'none';
  iframe.style.visibility = 'visible';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  iframe.setAttribute('aria-hidden', 'true');

  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = win?.document;
  if (!doc || !win) return;

  doc.open();
  doc.write(html);
  doc.close();

  const triggerPrint = () => {
    try {
      win.focus();
      win.print();
    } catch (e) {
      console.warn('Print iframe error:', e);
      window.print();
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1500);
    }
  };

  const waitForAssetsAndPrint = () => {
    const images = Array.from(doc.images);
    const imgPromises = images.map(img => {
      if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
      return new Promise<void>(resolve => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    });

    const fontPromise = doc.fonts ? doc.fonts.ready.catch(() => {}) : Promise.resolve();

    Promise.all([...imgPromises, fontPromise]).then(() => {
      if (typeof win.requestAnimationFrame === 'function') {
        win.requestAnimationFrame(() => {
          setTimeout(triggerPrint, 150);
        });
      } else {
        setTimeout(triggerPrint, 200);
      }
    });
  };

  if (doc.readyState === 'complete') {
    waitForAssetsAndPrint();
  } else {
    iframe.onload = waitForAssetsAndPrint;
  }
}
