export interface InvoiceCustomer {
  name: string;
  phone: string;
  address: string;
}

export interface InvoiceItem {
  name: string;
  category?: string;
  qty: number;
  price: number;
  measurements?: Record<string, string>;
}

export interface InvoiceData {
  invoiceNumber: string;
  tokenNumber?: string;
  date: string;
  customer: InvoiceCustomer;
  items: InvoiceItem[];
  subtotal?: number;
  discount?: number;
  discountPercent?: number;
  discountType?: 'percent' | 'amount';
  tax?: number;
  extraCharges?: number;
  paidAmount?: number;
  balanceDue?: number;
  grandTotal?: number;
  notes?: string;
  paymentStatus: 'PAID' | 'UNPAID' | 'PARTIAL' | string;
  shopName?: string;
  tagline?: string;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string | null;
  reviewLink?: string;
  reviewQrUrl?: string | null;
  termsAndConditions?: string | string[];
  terms?: string | string[];
}

export function generateInvoiceHTML(data: InvoiceData): string {
  const items = data.items || [];
  const customer = data.customer || { name: '', phone: '', address: '' };

  const subtotal = data.subtotal ?? items.reduce((acc, item) => acc + (item?.qty || 0) * (item?.price || 0), 0);
  const discount = data.discount || 0;
  const tax = data.tax || 0;
  const extraCharges = data.extraCharges || 0;
  const grandTotal = data.grandTotal ?? Math.round(subtotal - discount + tax + extraCharges);

  const formattedInvoiceNo = (data.invoiceNumber || '').replace(/[^0-9]/g, '') || data.invoiceNumber || '';
  const formattedDate = data.date || '';

  // Format currency with 2 decimals like target image (e.g. 450.00)
  const formatAmount = (num: number) => (num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Generate at least 6 table rows to show gridlines matching sample image
  const displayItems = [...items];
  const minRows = 6;
  while (displayItems.length < minRows) {
    displayItems.push({ name: '', qty: 0, price: 0 });
  }

  const notesText = data.discountPercent && data.discountPercent > 0
    ? `DISCOUNT ${data.discountPercent}%`
    : data.notes || 'GARMENTS NOT COLLECTED WITHIN 30 DAYS ARE NOT THE SHOP RESPONSIBILITY.';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice #${formattedInvoiceNo}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    body {
      background-color: #FFFFFF;
      color: #1E293B;
      width: 210mm;
      min-height: 297mm;
      height: auto;
      margin: 0 auto;
      position: relative;
      display: flex;
      flex-direction: column;
      padding: 0 0 16px 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .items-table tr, .cust-card, .summary-grid, .footer-container {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    
    /* Decorative Top & Bottom Accent Bars */
    .top-accent-bar {
      width: 100%;
      height: 18px;
      display: flex;
      background: #0B1F3A;
      position: relative;
      margin-bottom: 24px;
    }
    .top-accent-yellow {
      position: absolute;
      right: 0;
      top: 0;
      height: 18px;
      width: 160px;
      background: #F59E0B;
      clip-path: polygon(25% 0%, 100% 0%, 100% 100%, 0% 100%);
    }

    .invoice-wrapper {
      padding: 0 36px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      flex: 1;
    }

    /* Header Section */
    .header-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 8px;
    }
    .header-brand-box {
      display: flex;
      align-items: center;
      gap: 16px;
      flex: 1;
    }
    .brand-logo-circle {
      width: 90px;
      height: 90px;
      flex-shrink: 0;
    }
    .brand-logo-img {
      max-width: 100px;
      max-height: 90px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .brand-text-box {
      display: flex;
      flex-direction: column;
    }
    .brand-title {
      font-size: 34px;
      font-weight: 900;
      color: #0B1F3A;
      letter-spacing: -0.5px;
      line-height: 1;
    }
    .brand-tagline {
      font-size: 13px;
      font-weight: 500;
      color: #475569;
      margin-top: 4px;
    }
    .brand-address-box {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      margin-top: 8px;
      font-size: 11px;
      font-weight: 600;
      color: #334155;
      line-height: 1.4;
    }
    .pin-icon {
      width: 12px;
      height: 12px;
      margin-top: 2px;
      fill: #0B1F3A;
      flex-shrink: 0;
    }

    .header-divider {
      width: 1px;
      height: 85px;
      background: #CBD5E1;
      margin: 0 28px;
    }

    .header-inv-box {
      width: 220px;
      display: flex;
      flex-direction: column;
    }
    .inv-title {
      font-size: 32px;
      font-weight: 900;
      color: #0B1F3A;
      letter-spacing: 0.5px;
      line-height: 1;
    }
    .inv-yellow-bar {
      width: 55px;
      height: 4px;
      background: #F59E0B;
      border-radius: 2px;
      margin: 6px 0 16px 0;
    }
    .inv-meta-row {
      display: flex;
      align-items: center;
      font-size: 12px;
      color: #1E293B;
      margin-bottom: 6px;
    }
    .inv-meta-label {
      display: flex;
      align-items: center;
      gap: 6px;
      width: 110px;
      font-weight: 600;
      color: #334155;
    }
    .inv-meta-val {
      font-weight: 700;
      color: #0B1F3A;
    }
    .meta-icon {
      width: 14px;
      height: 14px;
      fill: #F59E0B;
    }

    /* Customer Card */
    .cust-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 16px 20px;
    }
    .cust-card-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 800;
      color: #F59E0B;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 12px;
    }
    .cust-field-grid {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .cust-field-row {
      display: flex;
      font-size: 12px;
    }
    .cust-label {
      width: 90px;
      font-weight: 800;
      color: #0B1F3A;
    }
    .cust-val {
      font-weight: 700;
      color: #334155;
      text-transform: uppercase;
    }

    /* Items Table */
    .table-container {
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      overflow: hidden;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
    }
    .items-table th {
      background: #0B1F3A;
      color: #FFFFFF;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      padding: 12px 14px;
      text-align: center;
      border: none;
    }
    .items-table th.th-desc {
      text-align: left;
      padding-left: 20px;
    }
    .items-table td {
      padding: 12px 14px;
      font-size: 12px;
      color: #1E293B;
      border-right: 1px dashed #E2E8F0;
      border-bottom: 1px dashed #E2E8F0;
      height: 38px;
    }
    .items-table tr:last-child td {
      border-bottom: none;
    }
    .items-table td:last-child {
      border-right: none;
    }
    .td-sr { text-align: center; font-weight: 600; color: #475569; width: 70px; }
    .td-desc { text-align: left; font-weight: 700; padding-left: 20px; text-transform: uppercase; }
    .td-qty { text-align: center; font-weight: 600; width: 70px; }
    .td-price { text-align: center; font-weight: 600; width: 140px; }
    .td-total { text-align: center; font-weight: 700; width: 140px; }

    /* Summary Grid */
    .summary-grid {
      display: flex;
      gap: 20px;
      align-items: stretch;
    }
    .notes-card {
      flex: 1;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 16px;
    }
    .notes-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 800;
      color: #F59E0B;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .notes-content {
      font-size: 12px;
      font-weight: 700;
      color: #334155;
      text-transform: uppercase;
    }

    .totals-card {
      width: 320px;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .tot-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 16px;
      font-size: 13px;
      font-weight: 700;
      color: #1E293B;
      border-bottom: 1px solid #E2E8F0;
    }
    .tot-row-grand {
      background: #F59E0B;
      border-bottom: none;
      padding: 12px 16px;
      font-size: 14px;
      font-weight: 900;
      color: #000000;
      text-transform: uppercase;
    }

    /* Footer Section */
    .footer-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 24px;
      padding: 0 4px;
    }
    .thank-box {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .thank-title-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .heart-icon {
      width: 16px;
      height: 16px;
      fill: #F59E0B;
    }
    .thank-script {
      font-family: 'Dancing Script', cursive;
      font-size: 26px;
      font-weight: 700;
      color: #0B1F3A;
    }
    .thank-sub {
      font-size: 11px;
      font-weight: 600;
      color: #475569;
    }

    .contact-col {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 0 24px;
      border-left: 1px solid #E2E8F0;
      border-right: 1px solid #E2E8F0;
    }
    .contact-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      font-weight: 600;
      color: #334155;
    }
    .contact-icon {
      width: 12px;
      height: 12px;
      fill: #0B1F3A;
    }

    .sig-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 150px;
    }
    .sig-img {
      height: 34px;
      width: auto;
      object-fit: contain;
      margin-bottom: 2px;
    }
    .sig-script {
      font-family: 'Dancing Script', cursive;
      font-size: 20px;
      color: #0B1F3A;
      font-weight: 700;
      margin-bottom: 2px;
    }
    .sig-placeholder {
      height: 34px;
      width: 100%;
    }
    .sig-line {
      width: 100%;
      height: 1px;
      background: #CBD5E1;
      margin-bottom: 4px;
    }
    .sig-label {
      font-size: 10px;
      font-weight: 700;
      color: #334155;
    }

    .bottom-accent-bar {
      position: relative;
      margin-top: auto;
      width: 100%;
      height: 14px;
      display: flex;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .bottom-accent-navy {
      width: 65%;
      background: #0B1F3A;
      clip-path: polygon(0 0, 100% 0, 94% 100%, 0 100%);
    }
    .bottom-accent-yellow {
      flex: 1;
      background: #F59E0B;
    }
  </style>
</head>
<body>
  <!-- Top Corner Decorative Accent Bar -->
  <div class="top-accent-bar">
    <div class="top-accent-yellow"></div>
  </div>

  <div class="invoice-wrapper">
    <!-- Header Section -->
    <div class="header-container">
      <div class="header-brand-box">
        ${data.logoUrl ? `<img src="${data.logoUrl}" class="brand-logo-img" alt="${data.shopName || 'Logo'}" style="background: transparent; border-radius: 0;">` : `
        <!-- Sewing Machine Vector SVG Logo (Clean transparent background) -->
        <svg class="brand-logo-circle" viewBox="0 0 100 85" xmlns="http://www.w3.org/2000/svg" style="background: transparent;">
          <path d="M 22 62 L 78 62 C 79 62 80 61 80 60 L 80 58 C 80 57 79 56 78 56 L 36 56 C 36 46 38 40 48 38 L 72 38 C 75 38 76 36 76 33 C 76 30 74 28 71 28 L 38 28 C 26 28 23 38 23 48 L 23 60 C 23 61 24 62 26 62 Z" fill="#0B1F3A"/>
          <circle cx="73" cy="33" r="7" fill="none" stroke="#0B1F3A" stroke-width="2.5"/>
          <circle cx="73" cy="33" r="2.5" fill="#0B1F3A"/>
          <line x1="31" y1="44" x2="31" y2="56" stroke="#0B1F3A" stroke-width="2.5"/>
          <rect x="16" y="62" width="68" height="4" rx="2" fill="#0B1F3A"/>
          <text x="50" y="78" font-family="'Inter', sans-serif" font-weight="900" font-size="12" fill="#0B1F3A" text-anchor="middle" letter-spacing="1.5">DARJI</text>
        </svg>
        `}

        <div class="brand-text-box">
          <h1 class="brand-title">${(data.shopName || 'Darji').replace(/premium tailors/gi, '').replace(/tailors/gi, '').trim() || 'Darji'}</h1>
          <span class="brand-tagline">${data.tagline || 'Stitched to Perfection'}</span>
          <div class="brand-address-box">
            <svg class="pin-icon" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
            <div>
              ${data.address || '80/LIG 1ST New Housing Board Colony, Shahdol (M.P.) 484001'}
            </div>
          </div>
        </div>
      </div>

      <div class="header-divider"></div>

      <div class="header-inv-box">
        <h2 class="inv-title">INVOICE</h2>
        <div class="inv-yellow-bar"></div>
        
        <div class="inv-meta-row">
          <div class="inv-meta-label">
            <svg class="meta-icon" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
            Invoice No.
          </div>
          <div class="inv-meta-val">${formattedInvoiceNo}</div>
        </div>

        <div class="inv-meta-row">
          <div class="inv-meta-label">
            <svg class="meta-icon" viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/></svg>
            Invoice Date
          </div>
          <div class="inv-meta-val">${formattedDate}</div>
        </div>
      </div>
    </div>

    <!-- Customer BILL TO Card -->
    <div class="cust-card">
      <div class="cust-card-title">
        <svg style="width:14px; height:14px; fill:#F59E0B;" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
        BILL TO
      </div>
      <div class="cust-field-grid">
        <div class="cust-field-row">
          <span class="cust-label">Name</span>
          <span class="cust-val">${customer.name}</span>
        </div>
        <div class="cust-field-row">
          <span class="cust-label">Contact</span>
          <span class="cust-val">${customer.phone || (customer as any).mobile || ''}</span>
        </div>
        <div class="cust-field-row">
          <span class="cust-label">Address</span>
          <span class="cust-val">${customer.address || (customer as any).city || '—'}</span>
        </div>
      </div>
    </div>

    <!-- Items Table -->
    <div class="table-container">
      <table class="items-table">
        <thead>
          <tr>
            <th style="width:70px;">SR. NO.</th>
            <th class="th-desc">DESCRIPTION</th>
            <th style="width:70px;">QTY</th>
            <th style="width:140px;">UNIT PRICE (₹)</th>
            <th style="width:140px;">TOTAL PRICE (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${displayItems.map((item, idx) => `
            <tr>
              <td class="td-sr">${item.name ? idx + 1 : ''}</td>
              <td class="td-desc">${item.name ? item.name : ''}</td>
              <td class="td-qty">${item.name ? item.qty : ''}</td>
              <td class="td-price">${item.name ? formatAmount(item.price) : ''}</td>
              <td class="td-total">${item.name ? formatAmount(item.qty * item.price) : ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Summary Grid -->
    <div class="summary-grid">
      <div class="notes-card">
        <div class="notes-title">
          <svg style="width:14px; height:14px; fill:#F59E0B;" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
          NOTES
        </div>
        <div class="notes-content">
          ${notesText}
        </div>
      </div>

      <div class="totals-card">
        <div class="tot-row">
          <span>Total Amount</span>
          <span>₹ ${formatAmount(subtotal)}</span>
        </div>
        ${discount > 0 ? `
        <div class="tot-row">
          <span>Discount</span>
          <span>- ₹ ${formatAmount(discount)}</span>
        </div>` : ''}
        ${extraCharges > 0 ? `
        <div class="tot-row">
          <span>Extra Charges</span>
          <span>+ ₹ ${formatAmount(extraCharges)}</span>
        </div>` : ''}
        <div class="tot-row tot-row-grand">
          <span>GRAND TOTAL</span>
          <span>₹ ${formatAmount(grandTotal)}</span>
        </div>
      </div>
    </div>

    ${(data.reviewLink || data.reviewQrUrl) ? `
    <!-- ⭐ Google Review QR Banner -->
    <div style="display: flex; align-items: center; gap: 16px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px 16px; margin: 12px 0 4px 0;">
      <img src="${data.reviewQrUrl || `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(data.reviewLink || '')}`}" alt="Google Review QR" style="width: 64px; height: 64px; object-fit: contain; border-radius: 6px; border: 1px solid #CBD5E1; background: #FFFFFF; padding: 2px;" />
      <div style="display: flex; flex-direction: column; gap: 2px;">
        <span style="font-size: 11px; font-weight: 800; color: #D97706; letter-spacing: 0.3px;">⭐ RATE YOUR EXPERIENCE ON GOOGLE</span>
        <span style="font-size: 12px; font-weight: 700; color: #0B1F3A;">Scan QR Code or visit link to leave us a 5-Star Review!</span>
        ${data.reviewLink ? `<a href="${data.reviewLink}" target="_blank" style="font-size: 11px; color: #2563EB; font-weight: 600; word-break: break-all; text-decoration: underline;">${data.reviewLink}</a>` : ''}
      </div>
    </div>
    ` : ''}

    ${(() => {
      const rawTerms = data.termsAndConditions || data.terms;
      let termsList = Array.isArray(rawTerms) && rawTerms.length > 0
        ? rawTerms
        : (typeof rawTerms === 'string' && rawTerms.trim() ? rawTerms.split('\n').filter(t => t.trim()) : []);

      if (termsList.length === 0) {
        termsList = [
          '1. Garments not collected within 30 days are not the responsibility of the shop.',
          '2. Alterations are accepted within 7 days of delivery upon presentation of the original bill.',
          '3. Any disputes are subject to local jurisdiction only.',
        ];
      }

      return `
      <!-- Terms & Conditions Section -->
      <div style="margin-top: 10px; padding: 8px 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px;">
        <div style="font-size: 10px; font-weight: 800; color: #0B1F3A; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">
          TERMS & CONDITIONS
        </div>
        <ul style="margin: 0; padding-left: 14px; font-size: 9.5px; color: #475569; line-height: 1.45;">
          ${termsList.map(term => `<li>${term}</li>`).join('')}
        </ul>
      </div>
      `;
    })()}

    <!-- Footer Section -->
    <div class="footer-container">
      <div class="thank-box">
        <div class="thank-title-row">
          <svg class="heart-icon" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          <span class="thank-script">Thank You</span>
        </div>
        <span class="thank-sub">For Your Business!</span>
      </div>

      <div class="contact-col">
        <div class="contact-item">
          <svg class="contact-icon" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
          ${data.phone || '+91 7828962210, +91 7000621972'}
        </div>
        <div class="contact-item">
          <svg class="contact-icon" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
          ${data.email || 'darji.tailoring@gmail.com'}
        </div>
      </div>

      <div class="sig-box">
        ${data.signatureUrl ? `<img src="${data.signatureUrl}" class="sig-img" alt="Signature">` : `<div class="sig-placeholder"></div>`}
        <div class="sig-line"></div>
        <span class="sig-label">Authorized Signatory</span>
      </div>
    </div>
  </div>

  <!-- Bottom Accent Bar -->
  <div class="bottom-accent-bar">
    <div class="bottom-accent-navy"></div>
    <div class="bottom-accent-yellow"></div>
  </div>
</body>
</html>`;
}

// React Native Print & Share Utilities (expo-print & expo-sharing ready)
export async function shareInvoicePDF(invoiceData: InvoiceData): Promise<void> {
  try {
    const html = generateInvoiceHTML(invoiceData);
    // Safe dynamic import to prevent web bundler (Vite) from failing to resolve native Expo modules
    const importModule = new Function('name', 'return import(name)');
    const Print = await importModule('expo-print');
    const Sharing = await importModule('expo-sharing');

    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri);
  } catch (err) {
    console.error('Invoice Share Failed (Native only):', err);
  }
}

// Failsafe Cross-Browser & Cross-Device (Desktop & Mobile) Print Trigger
export function printInvoiceHTML(data: InvoiceData): void {
  const htmlContent = generateInvoiceHTML(data);

  // Create temporary hidden printing iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) return;

  doc.open();
  doc.write(htmlContent);
  doc.close();

  // Trigger print after iframe content loads
  const triggerPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.warn('Iframe print fallback triggered:', e);
      window.print();
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }
  };

  if (iframe.contentWindow?.document.readyState === 'complete') {
    setTimeout(triggerPrint, 250);
  } else {
    iframe.onload = () => setTimeout(triggerPrint, 250);
  }
}

// Generates 100% exact PDF base64 string from generateInvoiceHTML using browser renderer
export async function generateInvoicePDFBlob(data: InvoiceData): Promise<string> {
  const htmlContent = generateInvoiceHTML(data);
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.zIndex = '-9999';
  container.style.opacity = '0.01';
  container.style.pointerEvents = 'none';
  container.style.width = '210mm';
  container.innerHTML = htmlContent;
  document.body.appendChild(container);

  try {
    const html2pdfModule = await import('html2pdf.js');
    const html2pdf = (html2pdfModule.default || html2pdfModule) as any;
    const opt = {
      margin: 0,
      filename: `Invoice_${data.invoiceNumber || '0001'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    const pdfBase64 = await html2pdf().from(container).set(opt).output('datauristring');
    return pdfBase64 || '';
  } catch (err) {
    console.error('generateInvoicePDFBlob error:', err);
    return '';
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

export interface SalesReportData {
  startDate: string;
  endDate: string;
  totalSales: number;
  totalOrders: number;
  paidAmount: number;
  pendingAmount: number;
  totalExpenses: number;
  netProfit: number;
  shopInfo?: {
    name?: string;
    phone?: string;
    address?: string;
    email?: string;
    logoUrl?: string | null;
  };
  ordersList?: Array<{
    orderNumber: string;
    tokenNumber?: string;
    customerName: string;
    date: string;
    grandTotal: number;
    paidAmount: number;
    status: string;
  }>;
}

// Client-side zero-server-load PDF Report printing generator
export function printSalesReportHTML(data: SalesReportData): void {
  const shopName = data.shopInfo?.name || 'DARJI';
  const shopPhone = data.shopInfo?.phone || '+91 7828962210, +91 7000621972';
  const shopAddress = data.shopInfo?.address || '80/LIG 1ST New Housing Board Colony, Shahdol (M.P.) 484001';

  const formatAmt = (num: number) => (Number(num) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Sales & Financial Report (${data.startDate} to ${data.endDate})</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    body { font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #0F172A; padding: 16px; background: #FFFFFF; }
    .report-header { display: flex; justify-content: space-between; border-bottom: 2px solid #0B1F3A; padding-bottom: 12px; margin-bottom: 20px; }
    .shop-title { font-size: 24px; font-weight: 900; color: #0B1F3A; text-transform: uppercase; letter-spacing: -0.5px; }
    .report-title { font-size: 18px; font-weight: 800; color: #D97706; text-align: right; letter-spacing: 0.5px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
    .card { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 16px; }
    .card-label { font-size: 10px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; }
    .card-val { font-size: 18px; font-weight: 800; color: #0B1F3A; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 11px; }
    th { background: #0B1F3A; color: white; text-align: left; padding: 8px 10px; font-size: 10px; font-weight: 800; text-transform: uppercase; }
    td { padding: 8px 10px; border-bottom: 1px dashed #CBD5E1; color: #334155; font-weight: 600; }
    .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #64748B; border-top: 1px solid #E2E8F0; padding-top: 12px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="report-header">
    <div>
      <div class="shop-title">${shopName}</div>
      <div style="font-size: 11px; color: #475569; margin-top: 4px; font-weight: 600;">${shopAddress} | Phone: ${shopPhone}</div>
    </div>
    <div>
      <div class="report-title">SALES & FINANCIAL REPORT</div>
      <div style="font-size: 11px; color: #475569; text-align: right; margin-top: 4px; font-weight: 700;">Period: ${data.startDate} to ${data.endDate}</div>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-label">Total Revenue</div>
      <div class="card-val">₹ ${formatAmt(data.totalSales)}</div>
    </div>
    <div class="card">
      <div class="card-label">Total Orders Placed</div>
      <div class="card-val">${data.totalOrders}</div>
    </div>
    <div class="card">
      <div class="card-label">Total Paid Collection</div>
      <div class="card-val" style="color: #166534;">₹ ${formatAmt(data.paidAmount)}</div>
    </div>
    <div class="card">
      <div class="card-label">Pending Balance</div>
      <div class="card-val" style="color: #991B1B;">₹ ${formatAmt(data.pendingAmount)}</div>
    </div>
    <div class="card">
      <div class="card-label">Total Operating Expenses</div>
      <div class="card-val" style="color: #C2410C;">₹ ${formatAmt(data.totalExpenses)}</div>
    </div>
    <div class="card">
      <div class="card-label">Net Operating Profit</div>
      <div class="card-val" style="color: #0369A1;">₹ ${formatAmt(data.netProfit)}</div>
    </div>
  </div>

  ${data.ordersList && data.ordersList.length > 0 ? `
  <h3 style="font-size: 13px; font-weight: 800; color: #0B1F3A; margin-bottom: 6px; text-transform: uppercase;">Orders Breakdown (${data.ordersList.length}):</h3>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Token / Order #</th>
        <th>Customer</th>
        <th>Total (₹)</th>
        <th>Paid (₹)</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${data.ordersList.map(o => `
        <tr>
          <td>${o.date}</td>
          <td><strong>${o.tokenNumber || ''}</strong> ${o.orderNumber}</td>
          <td>${o.customerName}</td>
          <td>₹ ${formatAmt(o.grandTotal)}</td>
          <td>₹ ${formatAmt(o.paidAmount)}</td>
          <td>${o.status.toUpperCase()}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  ` : ''}

  <div class="footer">
    Report generated on ${new Date().toLocaleString('en-IN')} by ${shopName} ERP System. Confidential.
  </div>
</body>
</html>`;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) return;

  doc.open();
  doc.write(html);
  doc.close();

  const triggerPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.warn('Print iframe error:', e);
    }
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 2000);
  };

  if (iframe.contentWindow?.document.readyState === 'complete') {
    setTimeout(triggerPrint, 250);
  } else {
    iframe.onload = () => setTimeout(triggerPrint, 250);
  }
}

