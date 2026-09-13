/**
 * Structured Customer PDF Generation Utility for DARJI Smart Tailor ERP
 * Supports:
 * Mode 1: Customer Details Only (Name, Phone, Address, Orders Count, Spending, Pending)
 * Mode 2: Customer with Full Orders Breakdown (Orders Table per customer with items, amounts, status)
 */

export interface CustomerPDFItem {
  name: string;
  qty: number;
  price?: number;
  category?: string;
}

export interface CustomerPDFOrder {
  _id?: string;
  orderNumber: string;
  tokenNumber?: string;
  orderDate?: string | Date;
  deliveryDate?: string | Date;
  items?: CustomerPDFItem[];
  subtotal?: number;
  discount?: number;
  grandTotal?: number;
  totalAmount?: number;
  paidAmount?: number;
  advancePaid?: number;
  balanceDue?: number;
  pendingAmount?: number;
  paymentStatus?: string;
  status?: string;
}

export interface CustomerPDFCustomer {
  _id: string;
  name: string;
  mobile: string;
  phone?: string;
  address?: string;
  gender?: string;
  tags?: string[];
  totalSpending?: number;
  pendingAmount?: number;
  totalOrders?: number;
  lastVisit?: string | Date;
  createdAt?: string | Date;
  orders?: CustomerPDFOrder[];
}

export interface CustomerPDFOptions {
  mode: 'detailsOnly' | 'withOrders';
  title?: string;
  filterPeriodLabel?: string;
  searchQuery?: string;
  shopInfo?: {
    name?: string;
    tagline?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
}

const formatINR = (val: number | undefined | null): string => {
  const num = Number(val) || 0;
  return '₹' + num.toLocaleString('en-IN');
};

const formatDate = (d: string | Date | undefined | null): string => {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return String(d);
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return String(d);
  }
};

export function generateCustomerPDF(
  customersList: CustomerPDFCustomer[],
  options: CustomerPDFOptions
): void {
  const {
    mode = 'detailsOnly',
    title = mode === 'detailsOnly' ? 'Customer Details Directory' : 'Customer & Orders Detailed Dossier',
    filterPeriodLabel = 'All Time',
    searchQuery = '',
    shopInfo = {
      name: 'DARJI',
      tagline: 'Smart Tailor ERP',
      address: '80/LIG 1ST New Housing Board Colony, Shahdol (M.P.) 484001',
      phone: '+91 9479487828, +91 7000621972',
      email: 'darji.tailoring@gmail.com',
    },
  } = options;

  const totalCustomers = customersList.length;
  const totalSpendingSum = customersList.reduce((s, c) => s + (Number(c.totalSpending) || 0), 0);
  const totalPendingSum = customersList.reduce((s, c) => s + (Number(c.pendingAmount) || 0), 0);
  const totalOrdersSum = customersList.reduce((s, c) => s + (c.orders ? c.orders.length : (Number(c.totalOrders) || 0)), 0);

  const generationTimestamp = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  let contentHtml = '';

  if (mode === 'detailsOnly') {
    // ── MODE 1: CUSTOMER DETAILS ONLY TABLE ──
    contentHtml = `
      <div class="table-container">
        <table class="report-table">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">#</th>
              <th style="width: 180px;">Customer Name</th>
              <th style="width: 130px;">Mobile / Contact</th>
              <th>Full Address</th>
              <th style="width: 70px; text-align: center;">Orders</th>
              <th style="width: 100px; text-align: right;">Total Spent</th>
              <th style="width: 100px; text-align: right;">Pending Due</th>
            </tr>
          </thead>
          <tbody>
            ${customersList.length === 0 ? `
              <tr>
                <td colspan="7" style="text-align: center; padding: 24px; color: #64748b;">
                  No customers found matching the selected filter/search.
                </td>
              </tr>
            ` : customersList.map((c, idx) => `
              <tr>
                <td style="text-align: center; font-weight: 600; color: #64748b;">${idx + 1}</td>
                <td>
                  <strong style="color: #0f172a; font-size: 13px;">${c.name || 'Unnamed Customer'}</strong>
                </td>
                <td style="font-weight: 600; color: #1e293b;">
                  📞 ${c.mobile || c.phone || '—'}
                </td>
                <td style="color: #334155; font-size: 12px; line-height: 1.4;">
                  ${c.address || '—'}
                </td>
                <td style="text-align: center; font-weight: 700; color: #0284c7;">
                  ${c.orders ? c.orders.length : (c.totalOrders || 0)}
                </td>
                <td style="text-align: right; font-weight: 700; color: #059669;">
                  ${formatINR(c.totalSpending)}
                </td>
                <td style="text-align: right; font-weight: 700; color: ${(c.pendingAmount || 0) > 0 ? '#dc2626' : '#64748b'};">
                  ${(c.pendingAmount || 0) > 0 ? formatINR(c.pendingAmount) : '₹0'}
                </td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr class="summary-footer-row">
              <td colspan="4" style="text-align: right; font-weight: 800; font-size: 13px;">TOTALS (${totalCustomers} Customers):</td>
              <td style="text-align: center; font-weight: 800; color: #0284c7;">${totalOrdersSum}</td>
              <td style="text-align: right; font-weight: 800; color: #059669;">${formatINR(totalSpendingSum)}</td>
              <td style="text-align: right; font-weight: 800; color: ${totalPendingSum > 0 ? '#dc2626' : '#16a34a'};">${formatINR(totalPendingSum)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  } else {
    // ── MODE 2: CUSTOMERS WITH ALL ORDER DETAILS ──
    contentHtml = `
      <div class="customers-dossier">
        ${customersList.length === 0 ? `
          <div style="text-align: center; padding: 40px; color: #64748b; background: #fff; border-radius: 8px; border: 1px solid #e2e8f0;">
            No customer order data found for the selected filter/search.
          </div>
        ` : customersList.map((c, cIdx) => {
          const custOrders = c.orders || [];
          const custTotalSpent = custOrders.reduce((s, o) => s + (Number(o.grandTotal || o.totalAmount || o.subtotal) || 0), 0) || (c.totalSpending || 0);
          const custTotalPaid = custOrders.reduce((s, o) => s + (Number(o.paidAmount || o.advancePaid) || 0), 0);
          const custPending = custOrders.reduce((s, o) => s + (Number(o.pendingAmount !== undefined ? o.pendingAmount : (o.balanceDue !== undefined ? o.balanceDue : 0)) || 0), 0) || (c.pendingAmount || 0);

          return `
            <div class="customer-card ${cIdx > 0 ? 'page-break-inside-avoid' : ''}">
              <div class="customer-card-header">
                <div class="customer-card-identity">
                  <div class="customer-badge-num">#${cIdx + 1}</div>
                  <div>
                    <h3 class="customer-title">${c.name || 'Unnamed Customer'}</h3>
                    <p class="customer-contact">
                      <span>📞 <strong>${c.mobile || c.phone || '—'}</strong></span>
                      <span class="sep">•</span>
                      <span>📍 ${c.address || 'Address Not Provided'}</span>
                    </p>
                  </div>
                </div>
                <div class="customer-card-stats">
                  <div class="mini-stat">
                    <span class="stat-lbl">Orders</span>
                    <span class="stat-val" style="color: #0284c7;">${custOrders.length}</span>
                  </div>
                  <div class="mini-stat">
                    <span class="stat-lbl">Total Billed</span>
                    <span class="stat-val" style="color: #059669;">${formatINR(custTotalSpent)}</span>
                  </div>
                  <div class="mini-stat">
                    <span class="stat-lbl">Total Paid</span>
                    <span class="stat-val" style="color: #0d9488;">${formatINR(custTotalPaid)}</span>
                  </div>
                  <div class="mini-stat">
                    <span class="stat-lbl">Pending Due</span>
                    <span class="stat-val" style="color: ${custPending > 0 ? '#dc2626' : '#16a34a'};">${formatINR(custPending)}</span>
                  </div>
                </div>
              </div>

              <div class="orders-section">
                ${custOrders.length === 0 ? `
                  <div class="empty-orders-note">No orders recorded for this customer in selected period.</div>
                ` : `
                  <table class="orders-table">
                    <thead>
                      <tr>
                        <th style="width: 100px;">Token / Order</th>
                        <th style="width: 85px;">Order Date</th>
                        <th>Garment Items & Quantity</th>
                        <th style="width: 85px; text-align: right;">Total</th>
                        <th style="width: 85px; text-align: right;">Paid / Adv</th>
                        <th style="width: 85px; text-align: right;">Due</th>
                        <th style="width: 85px;">Delivery Date</th>
                        <th style="width: 75px; text-align: center;">Status</th>
                        <th style="width: 70px; text-align: center;">Payment</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${custOrders.map(o => {
                        const itemsList = Array.isArray(o.items) && o.items.length > 0
                          ? o.items.map(i => `${i.qty || 1}x ${i.name}`).join(', ')
                          : 'Custom Stitching';
                        const oTotal = Number(o.grandTotal || o.totalAmount || o.subtotal) || 0;
                        const oPaid = Number(o.paidAmount !== undefined ? o.paidAmount : (o.advancePaid || 0));
                        const oDue = Number(o.pendingAmount !== undefined ? o.pendingAmount : (o.balanceDue !== undefined ? o.balanceDue : Math.max(0, oTotal - oPaid)));
                        const pStatus = (o.paymentStatus || (oDue <= 0 ? 'paid' : oPaid > 0 ? 'partial' : 'unpaid')).toLowerCase();
                        const oStatus = (o.status || 'pending').toLowerCase();

                        return `
                          <tr>
                            <td>
                              <strong style="color: #0f172a; font-size: 12px;">${o.tokenNumber || '—'}</strong>
                              <div style="font-size: 10px; color: #64748b;">${o.orderNumber || ''}</div>
                            </td>
                            <td style="font-size: 11px; color: #334155;">${formatDate(o.orderDate)}</td>
                            <td style="font-size: 12px; color: #0f172a; line-height: 1.3;">
                              <strong>${itemsList}</strong>
                            </td>
                            <td style="text-align: right; font-weight: 700; color: #0f172a;">${formatINR(oTotal)}</td>
                            <td style="text-align: right; font-weight: 600; color: #059669;">${formatINR(oPaid)}</td>
                            <td style="text-align: right; font-weight: 700; color: ${oDue > 0 ? '#dc2626' : '#16a34a'};">${formatINR(oDue)}</td>
                            <td style="font-size: 11px; color: #334155;">${formatDate(o.deliveryDate)}</td>
                            <td style="text-align: center;">
                              <span class="status-pill status-${oStatus}">${oStatus}</span>
                            </td>
                            <td style="text-align: center;">
                              <span class="pay-pill pay-${pStatus}">${pStatus}</span>
                            </td>
                          </tr>
                        `;
                      }).join('')}
                    </tbody>
                  </table>
                `}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  const fullHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>${title} - ${shopInfo.name || 'DARJI'}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 10mm 10mm 12mm 10mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: #ffffff;
          color: #0f172a;
          margin: 0;
          padding: 0;
          font-size: 12px;
          line-height: 1.4;
        }

        /* Header Branding */
        .pdf-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #d97706;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .brand-block h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 900;
          letter-spacing: 1px;
          color: #0f172a;
        }
        .brand-block .tagline {
          margin: 2px 0 6px 0;
          font-size: 11px;
          font-weight: 600;
          color: #d97706;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .brand-contact {
          font-size: 11px;
          color: #475569;
          line-height: 1.35;
        }
        .meta-block {
          text-align: right;
        }
        .report-title-badge {
          display: inline-block;
          background: #0f172a;
          color: #ffffff;
          font-size: 13px;
          font-weight: 800;
          padding: 5px 12px;
          border-radius: 6px;
          letter-spacing: 0.3px;
          margin-bottom: 6px;
        }
        .meta-row {
          font-size: 11px;
          color: #475569;
          margin: 2px 0;
        }
        .meta-pill {
          display: inline-block;
          background: #fef3c7;
          color: #92400e;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
        }

        /* KPI Banner */
        .kpi-banner {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 16px;
        }
        .kpi-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 8px 12px;
        }
        .kpi-label {
          font-size: 10px;
          text-transform: uppercase;
          font-weight: 700;
          color: #64748b;
          letter-spacing: 0.4px;
        }
        .kpi-value {
          font-size: 17px;
          font-weight: 800;
          color: #0f172a;
          margin-top: 2px;
        }

        /* Table Styling */
        .table-container {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          overflow: hidden;
        }
        .report-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11.5px;
        }
        .report-table thead th {
          background: #0f172a;
          color: #ffffff;
          font-weight: 700;
          padding: 8px 10px;
          border: 1px solid #1e293b;
          font-size: 11px;
          letter-spacing: 0.3px;
        }
        .report-table tbody td {
          padding: 7px 10px;
          border-bottom: 1px solid #e2e8f0;
          vertical-align: middle;
        }
        .report-table tbody tr:nth-child(even) {
          background: #f8fafc;
        }
        .summary-footer-row td {
          background: #f1f5f9;
          border-top: 2px solid #cbd5e1;
          padding: 10px;
        }

        /* Mode 2: Dossier Cards */
        .customers-dossier {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .customer-card {
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          overflow: hidden;
          background: #ffffff;
          page-break-inside: avoid;
        }
        .customer-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          padding: 10px 14px;
        }
        .customer-card-identity {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .customer-badge-num {
          background: #0f172a;
          color: #ffffff;
          font-weight: 800;
          font-size: 12px;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .customer-title {
          margin: 0;
          font-size: 14px;
          font-weight: 800;
          color: #0f172a;
        }
        .customer-contact {
          margin: 2px 0 0 0;
          font-size: 11px;
          color: #475569;
        }
        .customer-contact .sep {
          margin: 0 5px;
          color: #cbd5e1;
        }
        .customer-card-stats {
          display: flex;
          gap: 12px;
        }
        .mini-stat {
          text-align: right;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          padding: 4px 8px;
          border-radius: 4px;
          min-width: 75px;
        }
        .stat-lbl {
          display: block;
          font-size: 9px;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 700;
        }
        .stat-val {
          font-size: 12px;
          font-weight: 800;
        }

        /* Nested Orders Table */
        .orders-section {
          padding: 10px 14px;
        }
        .orders-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }
        .orders-table thead th {
          background: #f1f5f9;
          color: #475569;
          font-weight: 700;
          padding: 6px 8px;
          border-bottom: 1px solid #cbd5e1;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .orders-table tbody td {
          padding: 6px 8px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }
        .orders-table tbody tr:last-child td {
          border-bottom: none;
        }
        .empty-orders-note {
          font-size: 11px;
          color: #64748b;
          font-style: italic;
          padding: 6px 0;
        }

        /* Status Pills */
        .status-pill {
          display: inline-block;
          font-size: 9.5px;
          font-weight: 700;
          text-transform: uppercase;
          padding: 2px 6px;
          border-radius: 4px;
          letter-spacing: 0.2px;
        }
        .status-completed, .status-ready { background: #dcfce7; color: #15803d; }
        .status-preparing, .status-stitching { background: #e0f2fe; color: #0369a1; }
        .status-pending { background: #fef3c7; color: #b45309; }
        .status-cancelled { background: #fee2e2; color: #b91c1c; }

        .pay-pill {
          display: inline-block;
          font-size: 9.5px;
          font-weight: 700;
          text-transform: uppercase;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .pay-paid { background: #dcfce7; color: #15803d; }
        .pay-partial { background: #fef3c7; color: #b45309; }
        .pay-unpaid { background: #fee2e2; color: #b91c1c; }

        /* Footer Stamp */
        .pdf-footer {
          margin-top: 24px;
          border-top: 1px solid #e2e8f0;
          padding-top: 8px;
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #64748b;
        }
        .pdf-footer strong {
          color: #0f172a;
        }

        @media print {
          body { background: #ffffff !important; }
          .customer-card { break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div class="pdf-header">
        <div class="brand-block">
          <h1>${shopInfo.name || 'DARJI'}</h1>
          <div class="tagline">${shopInfo.tagline || 'Smart Tailor ERP'}</div>
          <div class="brand-contact">
            📍 ${shopInfo.address || 'Tailoring Shop'}<br />
            📞 ${shopInfo.phone || ''}
          </div>
        </div>
        <div class="meta-block">
          <div class="report-title-badge">${title}</div>
          <div class="meta-row"><strong>Filter:</strong> <span class="meta-pill">${filterPeriodLabel}</span></div>
          ${searchQuery ? `<div class="meta-row"><strong>Search Query:</strong> "${searchQuery}"</div>` : ''}
          <div class="meta-row"><strong>Generated:</strong> ${generationTimestamp}</div>
        </div>
      </div>

      <!-- KPI Summary Banner -->
      <div class="kpi-banner">
        <div class="kpi-box">
          <div class="kpi-label">Filtered Customers</div>
          <div class="kpi-value" style="color: #0f172a;">${totalCustomers}</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-label">Associated Orders</div>
          <div class="kpi-value" style="color: #0284c7;">${totalOrdersSum}</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-label">Total Billed Volume</div>
          <div class="kpi-value" style="color: #059669;">${formatINR(totalSpendingSum)}</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-label">Total Balance Due</div>
          <div class="kpi-value" style="color: ${totalPendingSum > 0 ? '#dc2626' : '#16a34a'};">${formatINR(totalPendingSum)}</div>
        </div>
      </div>

      <!-- Main Report Content -->
      ${contentHtml}

      <!-- Footer -->
      <div class="pdf-footer">
        <div>Generated by <strong>${shopInfo.name || 'DARJI'} Smart Tailor ERP</strong> &bull; Confidential Customer Record</div>
        <div>Page 1 of 1 &bull; ${generationTimestamp}</div>
      </div>
    </body>
    </html>
  `;

  // Hidden Iframe Print / Save-as-PDF Trigger
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('title', 'CustomerPDFPrintFrame');

  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = win?.document;
  if (!doc || !win) return;

  doc.open();
  doc.write(fullHtml);
  doc.close();

  const triggerPrint = () => {
    try {
      win.focus();
      win.print();
    } catch (e) {
      console.warn('Iframe print error fallback:', e);
      window.print();
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1500);
    }
  };

  if (doc.readyState === 'complete') {
    setTimeout(triggerPrint, 200);
  } else {
    iframe.onload = () => setTimeout(triggerPrint, 200);
  }
}
