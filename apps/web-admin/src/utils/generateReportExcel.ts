import type { ReportPDFData } from './generateReportPDF';

export function exportReportExcel(data: ReportPDFData) {
  const shopName = data.shopInfo?.name || 'DARJI TAILORS';
  const fileName = `Darji_Sales_Report_${data.dateRangeStr.replace(/\s+/g, '_')}.xls`;

  const htmlContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Sales & Financial Report</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 12px; color: #1E293B; }
        .title-header { font-size: 18px; font-weight: bold; color: #0B1F3A; text-align: left; padding: 10px 0; }
        .subtitle { font-size: 12px; color: #64748B; margin-bottom: 15px; }
        
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        th { background-color: #0B1F3A; color: #FFFFFF; font-weight: bold; border: 1px solid #09172B; padding: 8px 12px; text-align: left; }
        th.gold-th { background-color: #C9A24B; color: #0B1F3A; }
        td { border: 1px solid #CBD5E1; padding: 6px 12px; font-size: 11px; }
        tr:nth-child(even) { background-color: #F8FAFC; }
        
        .section-title { font-size: 14px; font-weight: bold; color: #0B1F3A; margin-top: 15px; margin-bottom: 8px; border-bottom: 2px solid #C9A24B; padding-bottom: 4px; }
        .amount { text-align: right; font-weight: 600; }
        .paid { color: #16A34A; }
        .pending { color: #DC2626; font-weight: bold; }
        .total-row { background-color: #E2E8F0; font-weight: bold; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="title-header">${shopName} — Sales & Financial Report</div>
      <div class="subtitle">Date Range: <b>${data.dateRangeStr}</b> (${data.periodLabel}) | Generated: ${new Date().toLocaleDateString('en-IN')}</div>

      <div class="section-title">📊 EXECUTIVE FINANCIAL SUMMARY</div>
      <table>
        <thead>
          <tr>
            <th class="gold-th">Metric</th>
            <th class="gold-th" style="text-align: right;">Amount (INR ₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Total Order Revenue Collected</td><td class="amount paid">₹ ${data.stats.totalSales.toLocaleString('en-IN')}</td></tr>
          <tr><td>Extra Shop Income (Tasks / YouTube / Scrap)</td><td class="amount paid">+ ₹ ${(data.stats.totalExtraIncome || 0).toLocaleString('en-IN')}</td></tr>
          <tr><td>Total Gross Revenue (Sales + Extra Income)</td><td class="amount paid">₹ ${(data.stats.totalGrossRevenue || (data.stats.totalSales + (data.stats.totalExtraIncome || 0))).toLocaleString('en-IN')}</td></tr>
          <tr><td>Total Billed Amount (Orders)</td><td class="amount">₹ ${data.stats.totalBilled.toLocaleString('en-IN')}</td></tr>
          <tr><td>Total Discounts Given</td><td class="amount" style="color: #D97706;">₹ ${(data.stats.totalDiscounts || 0).toLocaleString('en-IN')}</td></tr>
          <tr><td>Total Operating Expenses</td><td class="amount pending">₹ ${data.stats.totalExp.toLocaleString('en-IN')}</td></tr>
          <tr class="total-row"><td>Net Profit (Gross Revenue - Expenses)</td><td class="amount" style="color: ${data.stats.netProfit >= 0 ? '#16A34A' : '#DC2626'}">₹ ${data.stats.netProfit.toLocaleString('en-IN')}</td></tr>
          <tr><td>Profit Margin (%)</td><td class="amount">${data.stats.marginPct}%</td></tr>
          <tr><td>Uncollected Outstanding Dues</td><td class="amount pending">₹ ${data.stats.totalPending.toLocaleString('en-IN')}</td></tr>
        </tbody>
      </table>

      ${(data.paymentsLedger && data.paymentsLedger.length > 0) ? `
      <div class="section-title">💰 CUSTOMER PAYMENT COLLECTIONS LEDGER (${data.paymentsLedger.length} Payments Collected)</div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Payment Date & Time</th>
            <th>Order #</th>
            <th>Token #</th>
            <th>Customer Name</th>
            <th>Mode</th>
            <th>Type</th>
            <th style="text-align: right;">Amount Paid (₹)</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${data.paymentsLedger.map((p, idx) => `
            <tr>
              <td>${idx + 1}</td>
              <td>${p.date}</td>
              <td><b>${p.orderNumber}</b></td>
              <td>${p.tokenNumber || '-'}</td>
              <td>${p.customerName} ${p.customerMobile ? `(${p.customerMobile})` : ''}</td>
              <td><b>${p.mode.toUpperCase()}</b></td>
              <td>${p.type}</td>
              <td class="amount paid">+ ₹ ${p.amount.toLocaleString('en-IN')}</td>
              <td>${p.notes || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ` : ''}

      ${(data.discountsLedger && data.discountsLedger.length > 0) ? `
      <div class="section-title">🏷️ CUSTOMER DISCOUNT LEDGER (${data.discountsLedger.length} Discounted Orders)</div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Order #</th>
            <th>Token #</th>
            <th>Customer Name</th>
            <th>Date (DD-MM-YYYY)</th>
            <th style="text-align: right;">Subtotal (₹)</th>
            <th style="text-align: right;">Discount (₹)</th>
            <th style="text-align: right;">Grand Total (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${data.discountsLedger.map((d, idx) => `
            <tr>
              <td>${idx + 1}</td>
              <td><b>${d.orderNumber}</b></td>
              <td>${d.tokenNumber || '-'}</td>
              <td>${d.customerName} ${d.customerMobile ? `(${d.customerMobile})` : ''}</td>
              <td>${d.date}</td>
              <td class="amount">₹ ${d.subtotal.toLocaleString('en-IN')}</td>
              <td class="amount" style="color: #D97706;">- ₹ ${d.discount.toLocaleString('en-IN')} ${d.discountType === 'percent' ? `(${d.discountValue}%)` : ''}</td>
              <td class="amount paid">₹ ${d.grandTotal.toLocaleString('en-IN')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ` : ''}

      <div class="section-title">📋 ORDERS & SALES LEDGER (${data.orders.length} Orders)</div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Order #</th>
            <th>Token #</th>
            <th>Customer Name</th>
            <th>Date (DD-MM-YYYY)</th>
            <th style="text-align: right;">Total Amount (₹)</th>
            <th style="text-align: right;">Paid / Advance (₹)</th>
            <th style="text-align: right;">Balance Due (₹)</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${data.orders.map((o, idx) => `
            <tr>
              <td>${idx + 1}</td>
              <td><b>${o.orderNumber}</b></td>
              <td>${o.tokenNumber || '-'}</td>
              <td>${o.customerName}</td>
              <td>${o.date}</td>
              <td class="amount">₹ ${o.grandTotal.toLocaleString('en-IN')}</td>
              <td class="amount paid">₹ ${o.paidAmount.toLocaleString('en-IN')}</td>
              <td class="amount ${o.pendingAmount > 0 ? 'pending' : ''}">₹ ${o.pendingAmount.toLocaleString('en-IN')}</td>
              <td><b>${o.status.toUpperCase()}</b></td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="section-title">💸 EXPENSES LEDGER (${data.expenses.length} Entries)</div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Date (DD-MM-YYYY)</th>
            <th>Description</th>
            <th>Category</th>
            <th>Payment Mode</th>
            <th style="text-align: right;">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${data.expenses.map((e, idx) => `
            <tr>
              <td>${idx + 1}</td>
              <td>${e.date}</td>
              <td>${e.description}</td>
              <td>${e.category}</td>
              <td>${e.paymentMode.toUpperCase()}</td>
              <td class="amount pending">₹ ${e.amount.toLocaleString('en-IN')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportExpensesExcel(expenses: any[], shopName: string = 'DARJI TAILORS') {
  const fileName = `Darji_Expenses_Income_Ledger_${new Date().toISOString().slice(0, 10)}.xls`;

  const htmlContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 12px; color: #1E293B; }
        .title-header { font-size: 18px; font-weight: bold; color: #0B1F3A; text-align: left; padding: 10px 0; }
        table { border-collapse: collapse; width: 100%; margin-top: 10px; }
        th { background-color: #0B1F3A; color: #FFFFFF; font-weight: bold; border: 1px solid #09172B; padding: 8px 12px; text-align: left; }
        td { border: 1px solid #CBD5E1; padding: 6px 12px; font-size: 11px; }
        tr:nth-child(even) { background-color: #F8FAFC; }
        .amount-expense { text-align: right; font-weight: bold; color: #DC2626; }
        .amount-income { text-align: right; font-weight: bold; color: #16A34A; }
      </style>
    </head>
    <body>
      <div class="title-header">${shopName} — Shop Expenses & Extra Income Ledger</div>
      <div>Exported: ${new Date().toLocaleDateString('en-IN')}</div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Date</th>
            <th>Type</th>
            <th>Description</th>
            <th>Category</th>
            <th>Payment Mode</th>
            <th style="text-align: right;">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${expenses.map((e, idx) => {
            const isIncome = e.type === 'income';
            return `
            <tr>
              <td>${idx + 1}</td>
              <td>${e.date ? new Date(e.date).toLocaleDateString('en-IN') : '-'}</td>
              <td><b>${isIncome ? 'EXTRA INCOME' : 'EXPENSE'}</b></td>
              <td>${e.description || '-'}</td>
              <td>${(e.category || '-').toUpperCase()}</td>
              <td>${(e.paymentMode || 'cash').toUpperCase()}</td>
              <td class="${isIncome ? 'amount-income' : 'amount-expense'}">${isIncome ? '+' : '-'} ₹ ${(e.amount || 0).toLocaleString('en-IN')}</td>
            </tr>
          `;
          }).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
