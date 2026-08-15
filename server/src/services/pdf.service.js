import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dancingScriptPath = path.join(__dirname, 'DancingScript.ttf');
let dancingScriptBase64 = '';
if (fs.existsSync(dancingScriptPath)) {
  try {
    dancingScriptBase64 = fs.readFileSync(dancingScriptPath).toString('base64');
  } catch (e) {
    console.warn('[PDF Service] DancingScript read error:', e.message);
  }
}

/**
 * Finds systemic Chrome or Edge browser executable path on host OS
 */
function getBrowserExecutablePath() {
  const paths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];

  for (const p of paths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

/**
 * Generates identical HTML string for PDF invoice matching app template 100%
 */
function buildInvoiceHTML(order = {}, shopInfo = {}) {
  const items = Array.isArray(order.items) && order.items.length > 0
    ? order.items
    : [{ name: order.garmentType || 'Custom Designer Suit', qty: order.quantity || 1, price: order.totalAmount || order.amount || 1200 }];

  const customerName = order.customerName || order.customer?.name || 'Customer';
  const customerPhone = order.customerMobile || order.customerPhone || order.customer?.phone || process.env.ADMIN_PHONE || '9000000000';
  const customerAddress = order.customerAddress || order.customer?.address || 'MEDICAL COLLEGE SDL';

  const invoiceNo = (order.invoiceNo || order.orderNumber || `INV-${order._id?.toString().slice(-6).toUpperCase() || '0001'}`).replace('ORD-', 'INV-');
  const tokenNo = order.tokenNumber || 'T-101';
  const invoiceDate = order.orderDate
    ? new Date(order.orderDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const subtotal = order.subtotal !== undefined
    ? Number(order.subtotal)
    : items.reduce((sum, item) => sum + ((Number(item.price || item.rate) || 0) * (Number(item.qty || item.quantity) || 1)), 0);

  const discount = Number(order.discount) || 0;
  const extraCharges = Number(order.extraCharges) || 0;
  const grandTotal = order.totalAmount || order.grandTotal || Math.max(0, subtotal - discount + extraCharges);
  const paidAmount = Number(order.paidAmount) || Number(order.advancePaid) || 0;
  const balanceDue = Math.max(0, grandTotal - paidAmount);

  const shopName = shopInfo.shopName || shopInfo.name || 'Darji';
  const shopPhone = shopInfo.phone || '+919479487828, +917000621972';
  const shopAddress = shopInfo.address || '80/LIG 1ST New Housing Board Colony, Shahdol (M.P.) 484001';
  const logoUrl = shopInfo.logoUrl || order.logoUrl || null;
  const signatureUrl = shopInfo.signatureUrl || order.signatureUrl || null;

  const formatAmount = (num) => (Number(num) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Render minimum 6 rows for sleek grid alignment
  const displayItems = [...items];
  while (displayItems.length < 6) {
    displayItems.push({ name: '', qty: '', price: '' });
  }

  const notesText = discount > 0
    ? `DISCOUNT APPLIED: ₹ ${formatAmount(discount)}`
    : 'GARMENTS NOT COLLECTED WITHIN 30 DAYS ARE NOT THE SHOP RESPONSIBILITY.';

  const shopEmail = shopInfo.email || 'darjithetailoringshop@gmail.com';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice #${invoiceNo}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    ${dancingScriptBase64 ? `
    @font-face {
      font-family: 'Dancing Script';
      font-style: normal;
      font-weight: 700;
      src: url('data:font/ttf;charset=utf-8;base64,${dancingScriptBase64}') format('truetype');
    }
    ` : ''}
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
    body { background-color: #FFFFFF; color: #1E293B; width: 210mm; min-height: 297mm; height: auto; margin: 0 auto; position: relative; display: flex; flex-direction: column; padding-bottom: 16px; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .items-table tr, .cust-card, .summary-grid, .footer-container { page-break-inside: avoid; break-inside: avoid; }
    
    .top-accent-bar { width: 100%; height: 18px; background: #0B1F3A; position: relative; margin-bottom: 24px; }
    .top-accent-yellow { position: absolute; right: 0; top: 0; height: 18px; width: 160px; background: #F59E0B; clip-path: polygon(25% 0%, 100% 0%, 100% 100%, 0% 100%); }

    .invoice-wrapper { padding: 0 36px; display: flex; flex-direction: column; gap: 20px; flex: 1; }

    .header-container { display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; }
    .brand-logo-circle { width: 85px; height: 85px; flex-shrink: 0; }
    .brand-title { font-size: 34px; font-weight: 900; color: #0B1F3A; letter-spacing: -0.5px; line-height: 1; }
    .brand-tagline { font-size: 13px; font-weight: 500; color: #475569; margin-top: 4px; }
    .brand-address-box { display: flex; align-items: flex-start; gap: 6px; margin-top: 8px; font-size: 11px; font-weight: 600; color: #334155; line-height: 1.4; }

    .header-divider { width: 1px; height: 85px; background: #CBD5E1; margin: 0 28px; }

    .header-inv-box { width: 220px; display: flex; flex-direction: column; }
    .inv-title { font-size: 32px; font-weight: 900; color: #0B1F3A; letter-spacing: 0.5px; line-height: 1; }
    .inv-yellow-bar { width: 55px; height: 4px; background: #F59E0B; border-radius: 2px; margin: 6px 0 16px 0; }
    
    .inv-meta-row { display: flex; align-items: center; font-size: 12px; color: #1E293B; margin-bottom: 6px; }
    .inv-meta-label { width: 110px; font-weight: 600; color: #334155; }
    .inv-meta-val { font-weight: 700; color: #0B1F3A; }

    .cust-card { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px 20px; }
    .cust-card-title { font-size: 12px; font-weight: 800; color: #F59E0B; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 12px; }
    .cust-field-grid { display: flex; flex-direction: column; gap: 6px; }
    .cust-field-row { display: flex; font-size: 12px; }
    .cust-label { width: 90px; font-weight: 800; color: #0B1F3A; }
    .cust-val { font-weight: 700; color: #334155; text-transform: uppercase; }

    .table-container { border: 1px solid #E2E8F0; border-radius: 10px; overflow: hidden; }
    .items-table { width: 100%; border-collapse: collapse; }
    .items-table th { background: #0B1F3A; color: #FFFFFF; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; padding: 12px 14px; text-align: center; border: none; }
    .items-table th.th-desc { text-align: left; padding-left: 20px; }
    .items-table td { padding: 12px 14px; font-size: 12px; color: #1E293B; border-right: 1px dashed #E2E8F0; border-bottom: 1px dashed #E2E8F0; height: 38px; }
    .td-sr { text-align: center; font-weight: 600; color: #475569; width: 70px; }
    .td-desc { text-align: left; font-weight: 700; padding-left: 20px; text-transform: uppercase; }
    .td-qty { text-align: center; font-weight: 600; width: 70px; }
    .td-price { text-align: center; font-weight: 600; width: 140px; }
    .td-total { text-align: center; font-weight: 700; width: 140px; }

    .summary-grid { display: flex; gap: 20px; align-items: stretch; }
    .notes-card { flex: 1; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; }
    .notes-title { font-size: 12px; font-weight: 800; color: #F59E0B; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 8px; }
    .notes-content { font-size: 12px; font-weight: 700; color: #334155; text-transform: uppercase; }

    .totals-card { width: 320px; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; }
    .tot-row { display: flex; justify-content: space-between; padding: 10px 16px; font-size: 13px; font-weight: 700; color: #1E293B; border-bottom: 1px solid #E2E8F0; }
    .tot-row-grand { background: #F59E0B; border-bottom: none; padding: 12px 16px; font-size: 14px; font-weight: 900; color: #000000; text-transform: uppercase; }

    .footer-container { display: flex; justify-content: space-between; align-items: center; margin-top: 24px; padding: 0 4px; }
    .thank-box { display: flex; flex-direction: column; align-items: flex-start; }
    .thank-title-row { display: flex; align-items: center; gap: 8px; }
    .heart-icon { width: 18px; height: 18px; fill: #F59E0B; flex-shrink: 0; }
    .thank-script { font-family: 'Dancing Script', 'Caveat', cursive; font-size: 28px; font-weight: 700; color: #0B1F3A; line-height: 1; }
    .thank-sub { font-size: 11px; font-weight: 600; color: #475569; margin-top: 4px; }

    .contact-col { display: flex; flex-direction: column; gap: 6px; padding: 0 24px; border-left: 1px solid #E2E8F0; border-right: 1px solid #E2E8F0; font-size: 11px; font-weight: 600; color: #334155; }

    .sig-box { display: flex; flex-direction: column; align-items: center; width: 150px; }
    .sig-img { height: 34px; width: auto; object-fit: contain; margin-bottom: 2px; }
    .sig-line { width: 100%; height: 1px; background: #CBD5E1; margin-bottom: 4px; margin-top: 30px; }
    .sig-label { font-size: 10px; font-weight: 700; color: #334155; }

    .bottom-accent-bar { position: relative; margin-top: auto; width: 100%; height: 14px; display: flex; overflow: hidden; page-break-inside: avoid; break-inside: avoid; }
    .bottom-accent-navy { width: 65%; background: #0B1F3A; clip-path: polygon(0 0, 100% 0, 94% 100%, 0 100%); }
    .bottom-accent-yellow { flex: 1; background: #F59E0B; }
  </style>
</head>
<body>
  <div class="top-accent-bar"><div class="top-accent-yellow"></div></div>

  <div class="invoice-wrapper">
    <div class="header-container">
      <div style="display: flex; align-items: center; gap: 16px;">
        ${logoUrl ? `<img src="${logoUrl}" style="max-width: 90px; max-height: 85px; object-fit: contain;">` : `
        <svg class="brand-logo-circle" viewBox="0 0 100 85" xmlns="http://www.w3.org/2000/svg">
          <path d="M 22 62 L 78 62 C 79 62 80 61 80 60 L 80 58 C 80 57 79 56 78 56 L 36 56 C 36 46 38 40 48 38 L 72 38 C 75 38 76 36 76 33 C 76 30 74 28 71 28 L 38 28 C 26 28 23 38 23 48 L 23 60 C 23 61 24 62 26 62 Z" fill="#0B1F3A"/>
          <circle cx="73" cy="33" r="7" fill="none" stroke="#0B1F3A" stroke-width="2.5"/>
          <circle cx="73" cy="33" r="2.5" fill="#0B1F3A"/>
          <line x1="31" y1="44" x2="31" y2="56" stroke="#0B1F3A" stroke-width="2.5"/>
          <rect x="16" y="62" width="68" height="4" rx="2" fill="#0B1F3A"/>
          <text x="50" y="78" font-family="'Inter', sans-serif" font-weight="900" font-size="12" fill="#0B1F3A" text-anchor="middle" letter-spacing="1.5">DARJI</text>
        </svg>
        `}
        <div>
          <h1 class="brand-title">${shopName.toUpperCase()}</h1>
          <div class="brand-tagline">Stitched to Perfection</div>
          <div class="brand-address-box">
            <div>${shopAddress}</div>
          </div>
        </div>
      </div>

      <div class="header-divider"></div>

      <div class="header-inv-box">
        <h2 class="inv-title">INVOICE</h2>
        <div class="inv-yellow-bar"></div>
        <div class="inv-meta-row"><span class="inv-meta-label">Invoice No.</span><span class="inv-meta-val">${invoiceNo}</span></div>
        <div class="inv-meta-row"><span class="inv-meta-label">Token No.</span><span class="inv-meta-val">${tokenNo}</span></div>
        <div class="inv-meta-row"><span class="inv-meta-label">Invoice Date</span><span class="inv-meta-val">${invoiceDate}</span></div>
      </div>
    </div>

    <div class="cust-card">
      <div class="cust-card-title">BILL TO</div>
      <div class="cust-field-grid">
        <div class="cust-field-row"><span class="cust-label">Name</span><span class="cust-val">${customerName}</span></div>
        <div class="cust-field-row"><span class="cust-label">Contact</span><span class="cust-val">+91 ${customerPhone}</span></div>
        <div class="cust-field-row"><span class="cust-label">Address</span><span class="cust-val">${customerAddress}</span></div>
      </div>
    </div>

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
              <td class="td-qty">${item.name ? (item.qty || item.quantity || 1) : ''}</td>
              <td class="td-price">${item.name ? formatAmount(item.price || item.rate || 0) : ''}</td>
              <td class="td-total">${item.name ? formatAmount((item.qty || item.quantity || 1) * (item.price || item.rate || 0)) : ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="summary-grid">
      <div class="notes-card">
        <div class="notes-title">NOTES</div>
        <div class="notes-content">${notesText}</div>
      </div>

      <div class="totals-card">
        <div class="tot-row"><span>Total Amount</span><span>₹ ${formatAmount(subtotal)}</span></div>
        ${discount > 0 ? `<div class="tot-row"><span>Discount</span><span>- ₹ ${formatAmount(discount)}</span></div>` : ''}
        ${extraCharges > 0 ? `<div class="tot-row"><span>Extra Charges</span><span>+ ₹ ${formatAmount(extraCharges)}</span></div>` : ''}
        <div class="tot-row tot-row-grand"><span>GRAND TOTAL</span><span>₹ ${formatAmount(grandTotal)}</span></div>
      </div>
    </div>

    ${(() => {
      const rawUrl = shopInfo.reviewLink || '';
      const linkUrl = rawUrl.trim() ? (/^https?:\/\//i.test(rawUrl.trim()) ? rawUrl.trim() : `https://${rawUrl.trim()}`) : '';
      const qrSrc = shopInfo.reviewQrUrl || (linkUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(linkUrl)}` : null);

      if (!linkUrl && !qrSrc) return '';

      const bannerContent = `
        <div style="display: flex; align-items: center; gap: 16px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px 16px; margin: 12px 0 4px 0; text-decoration: none;">
          ${qrSrc ? `<img src="${qrSrc}" alt="Google Review QR" style="width: 64px; height: 64px; object-fit: contain; border-radius: 6px; border: 1px solid #CBD5E1; background: #FFFFFF; padding: 2px; flex-shrink: 0;" />` : ''}
          <div style="display: flex; flex-direction: column; gap: 2px;">
            <span style="font-size: 11px; font-weight: 800; color: #D97706; letter-spacing: 0.3px;">⭐ RATE YOUR EXPERIENCE ON GOOGLE</span>
            <span style="font-size: 12px; font-weight: 700; color: #0B1F3A;">Scan QR Code or tap to leave us a 5-Star Review!</span>
            ${linkUrl ? `<span style="font-size: 11px; color: #2563EB; font-weight: 600; word-break: break-all; text-decoration: underline;">${linkUrl}</span>` : ''}
          </div>
        </div>
      `;

      if (linkUrl) {
        return `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; color: inherit; display: block; page-break-inside: avoid; break-inside: avoid;">${bannerContent}</a>`;
      }
      return `<div style="page-break-inside: avoid; break-inside: avoid;">${bannerContent}</div>`;
    })()}

    ${(() => {
      const rawTerms = shopInfo.termsAndConditions || shopInfo.terms;
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

    <div class="footer-container">
      <div class="thank-box">
        <div class="thank-title-row">
          <svg class="heart-icon" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          <span class="thank-script">Thank You</span>
        </div>
        <span class="thank-sub">For Your Business!</span>
      </div>
      <div class="contact-col">
        <div>📞 ${shopPhone}</div>
        <div>✉️ ${shopEmail}</div>
      </div>
      <div class="sig-box">
        ${signatureUrl ? `<img src="${signatureUrl}" class="sig-img">` : ''}
        <div class="sig-line"></div>
        <span class="sig-label">Authorized Signatory</span>
      </div>
    </div>
  </div>

  <div class="bottom-accent-bar">
    <div class="bottom-accent-navy"></div>
    <div class="bottom-accent-yellow"></div>
  </div>
</body>
</html>`;
}
export const generateInvoicePDF = async (order, shopInfo = {}) => {
  const htmlContent = buildInvoiceHTML(order, shopInfo);

  // Render pixel-perfect PDF using Chrome / Puppeteer with shop logos, signatures, feedback QR
  const exePath = getBrowserExecutablePath();
  if (exePath) {
    try {
      const puppeteerModule = await import('puppeteer-core');
      const puppeteer = puppeteerModule.default || puppeteerModule;
      const browser = await puppeteer.launch({
        executablePath: exePath,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none']
      });

      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'load', timeout: 5000 }).catch(() => {});

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
      });

      await browser.close();
      return Buffer.from(pdfBuffer);
    } catch (browserErr) {
      console.warn('[PDF Service] Puppeteer rendering failed, falling back to PDFKit:', browserErr.message);
    }
  }

  return generateInvoicePDFKit(order, shopInfo);
};

const generateInvoicePDFKit = async (order, shopInfo = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 0 });
      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // ── Resolve all data fields ──
      const items = Array.isArray(order.items) && order.items.length > 0
        ? order.items
        : [{ name: order.garmentType || 'Custom Garment', qty: order.quantity || 1, price: order.totalAmount || order.amount || 0 }];

      const customerName = order.customerName || order.customer?.name || 'Valued Customer';
      const customerPhone = order.customerMobile || order.customerPhone || order.customer?.phone || '';
      const customerAddress = order.customerAddress || order.customer?.address || '';

      const invoiceNo = (order.invoiceNo || order.invoiceNumber || order.orderNumber || `INV-${order._id?.toString().slice(-6).toUpperCase() || '0001'}`).replace('ORD-', 'INV-');
      const invoiceDate = order.orderDate
        ? new Date(order.orderDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

      const subtotal = order.subtotal !== undefined
        ? Number(order.subtotal)
        : items.reduce((sum, item) => sum + ((Number(item.price || item.rate) || 0) * (Number(item.qty || item.quantity) || 1)), 0);

      const discount = Number(order.discount) || 0;
      const extraCharges = Number(order.extraCharges) || 0;
      const grandTotal = Number(order.grandTotal || order.totalAmount || Math.max(0, subtotal - discount + extraCharges));
      const paidAmount = Number(order.paidAmount !== undefined ? order.paidAmount : (order.advancePaid !== undefined ? order.advancePaid : (order.paid !== undefined ? order.paid : (order.advance || 0))));
      const balanceDue = Number(order.balanceDue !== undefined ? order.balanceDue : (order.remaining !== undefined ? order.remaining : Math.max(0, grandTotal - paidAmount)));

      const shopName = shopInfo.shopName || shopInfo.name || 'Darji';
      const shopPhone = shopInfo.phone || '+919479487828, +917000621972';
      const shopAddress = shopInfo.address || '80/LIG 1ST New Housing Board Colony, Shahdol (M.P.) 484001';
      const shopEmail = shopInfo.email || 'darji.tailoring@gmail.com';

      const fmt = (num) => (Number(num) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const navy = '#0B1F3A';
      const gold = '#F59E0B';
      const goldDark = '#C9A24B';
      const darkText = '#1E293B';
      const lightText = '#475569';
      const borderColor = '#E2E8F0';
      const pageW = 595.28;
      const marginL = 40;
      const marginR = 40;
      const contentW = pageW - marginL - marginR;

      // ══════════════════════════════════════════════════
      //  TOP ACCENT BAR (Navy with Gold wedge on right)
      // ══════════════════════════════════════════════════
      doc.rect(0, 0, pageW, 16).fill(navy);
      doc.save();
      doc.moveTo(pageW - 140, 0).lineTo(pageW, 0).lineTo(pageW, 16).lineTo(pageW - 180, 16).closePath().fill(gold);
      doc.restore();

      // ══════════════════════════════════════════════════
      //  HEADER: Logo + Brand (left) | INVOICE block (right)
      // ══════════════════════════════════════════════════
      let y = 30;

      // ── Draw Shop Logo (Custom uploaded logo image or fallback vector sewing machine) ──
      const logoX = marginL;
      const logoY = y;
      const logoSize = 55;
      let hasLogoImg = false;

      if (shopInfo.logoUrl && typeof shopInfo.logoUrl === 'string' && shopInfo.logoUrl.startsWith('data:image/')) {
        try {
          const base64Data = shopInfo.logoUrl.replace(/^data:image\/\w+;base64,/, '');
          const logoBuf = Buffer.from(base64Data, 'base64');
          doc.image(logoBuf, logoX, logoY, { fit: [75, 60] });
          hasLogoImg = true;
        } catch (e) {
          console.warn('[PDFKit] Logo image draw warning:', e.message);
        }
      }

      if (!hasLogoImg) {
        // Circle background
        doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2).fill(navy);
        // Sewing machine body
        doc.save();
        const scale = logoSize / 100;
        const lx = logoX + (logoSize - 100 * scale) / 2;
        const ly = logoY + (logoSize - 100 * scale) / 2;
        // Machine body
        doc.moveTo(lx + 28 * scale, ly + 62 * scale)
          .lineTo(lx + 72 * scale, ly + 62 * scale)
          .quadraticCurveTo(lx + 74 * scale, ly + 62 * scale, lx + 74 * scale, ly + 60 * scale)
          .lineTo(lx + 74 * scale, ly + 58 * scale)
          .quadraticCurveTo(lx + 74 * scale, ly + 56 * scale, lx + 72 * scale, ly + 56 * scale)
          .lineTo(lx + 36 * scale, ly + 56 * scale)
          .quadraticCurveTo(lx + 36 * scale, ly + 48 * scale, lx + 38 * scale, ly + 42 * scale)
          .quadraticCurveTo(lx + 42 * scale, ly + 40 * scale, lx + 46 * scale, ly + 40 * scale)
          .lineTo(lx + 66 * scale, ly + 40 * scale)
          .quadraticCurveTo(lx + 70 * scale, ly + 40 * scale, lx + 70 * scale, ly + 35 * scale)
          .quadraticCurveTo(lx + 70 * scale, ly + 30 * scale, lx + 65 * scale, ly + 30 * scale)
          .lineTo(lx + 38 * scale, ly + 30 * scale)
          .quadraticCurveTo(lx + 25 * scale, ly + 30 * scale, lx + 25 * scale, ly + 48 * scale)
          .lineTo(lx + 25 * scale, ly + 60 * scale)
          .quadraticCurveTo(lx + 25 * scale, ly + 62 * scale, lx + 28 * scale, ly + 62 * scale)
          .closePath()
          .fill(goldDark);
        // Needle wheel
        doc.circle(lx + 67 * scale, ly + 35 * scale, 5 * scale).lineWidth(1.5 * scale).strokeColor(goldDark).stroke();
        doc.circle(lx + 67 * scale, ly + 35 * scale, 1.5 * scale).fill(goldDark);
        // Base plate
        doc.rect(lx + 20 * scale, ly + 64 * scale, 60 * scale, 3 * scale).fill(goldDark);
        // "DARJI" text below machine
        doc.fontSize(7 * scale).font('Helvetica-Bold').fillColor('#FFFFFF')
          .text('DARJI', lx + 25 * scale, ly + 72 * scale, { width: 50 * scale, align: 'center' });
        doc.restore();
      }

      // ── Brand Name + Tagline + Address ──
      const brandX = logoX + logoSize + 14;
      doc.fontSize(24).font('Helvetica-Bold').fillColor(navy).text(shopName, brandX, y + 2);
      doc.fontSize(10).font('Helvetica').fillColor(lightText).text('Stitched to Perfection', brandX, y + 28);
      // Address with pin icon (text)
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#334155').text('@ ', brandX, y + 44, { continued: true });
      doc.font('Helvetica').text(shopAddress, { width: 220 });

      // ── Divider Line ──
      const divX = 360;
      doc.moveTo(divX, y).lineTo(divX, y + 65).strokeColor(borderColor).lineWidth(1).stroke();

      // ── Invoice Title Block ──
      const invX = divX + 18;
      doc.fontSize(24).font('Helvetica-Bold').fillColor(navy).text('INVOICE', invX, y);
      doc.rect(invX, y + 28, 45, 3.5).fill(gold);

      // Invoice meta rows with icons
      const metaY = y + 38;
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#334155');
      doc.text('Invoice No.', invX, metaY);
      doc.font('Helvetica-Bold').fillColor(navy).text(invoiceNo, invX + 75, metaY);
      doc.font('Helvetica-Bold').fillColor('#334155').text('Invoice Date', invX, metaY + 16);
      doc.font('Helvetica-Bold').fillColor(navy).text(invoiceDate, invX + 75, metaY + 16);

      // ══════════════════════════════════════════════════
      //  BILL TO CARD
      // ══════════════════════════════════════════════════
      y = 108;
      const custCardH = 68;
      doc.roundedRect(marginL, y, contentW, custCardH, 8).strokeColor(borderColor).lineWidth(1).stroke();

      // "BILL TO" title with person icon
      doc.fontSize(10).font('Helvetica-Bold').fillColor(gold).text('BILL TO', marginL + 18, y + 10);

      // Name row
      const fieldLabelW = 60;
      const fieldValX = marginL + 18 + fieldLabelW + 8;
      doc.fontSize(10).font('Helvetica-Bold').fillColor(navy).text('Name', marginL + 18, y + 26);
      doc.font('Helvetica').fillColor(darkText).text(customerName.toUpperCase(), fieldValX, y + 26, { width: 180 });

      // Contact row
      doc.font('Helvetica-Bold').fillColor(navy).text('Contact', marginL + 18, y + 42);
      doc.font('Helvetica').fillColor(darkText).text(customerPhone || '', fieldValX, y + 42);

      // Address row (right column)
      if (customerAddress) {
        doc.font('Helvetica-Bold').fillColor(navy).text('Address', marginL + 18, y + 54);
        doc.font('Helvetica').fillColor(darkText).text(customerAddress.toUpperCase(), fieldValX, y + 54, { width: 400 });
      }

      // ══════════════════════════════════════════════════
      //  ITEMS TABLE
      // ══════════════════════════════════════════════════
      y = 188;
      const colWidths = { sr: 55, desc: 195, qty: 65, price: 100, total: 100 };
      const tableW = contentW;
      const headerH = 30;

      // Table header (navy background with rounded top corners)
      doc.roundedRect(marginL, y, tableW, headerH, 6).fill(navy);
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#FFFFFF');
      let cx = marginL;
      doc.text('SR.\nNO.', cx + 4, y + 5, { width: colWidths.sr, align: 'center', lineGap: -2 });
      cx += colWidths.sr;
      doc.text('DESCRIPTION', cx + 8, y + 10, { width: colWidths.desc });
      cx += colWidths.desc;
      doc.text('QTY', cx, y + 10, { width: colWidths.qty, align: 'center' });
      cx += colWidths.qty;
      doc.text('UNIT PRICE (Rs.)', cx, y + 10, { width: colWidths.price, align: 'center' });
      cx += colWidths.price;
      doc.text('TOTAL PRICE (Rs.)', cx, y + 10, { width: colWidths.total, align: 'center' });

      y += headerH;

      // Table rows (min 6 rows for consistent look)
      const rowH = 28;
      const minRows = Math.max(items.length, 6);
      for (let i = 0; i < minRows; i++) {
        const item = items[i];
        const bgColor = i % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
        doc.rect(marginL, y, tableW, rowH).fill(bgColor);
        // Row border
        doc.rect(marginL, y, tableW, rowH).strokeColor(borderColor).lineWidth(0.5).stroke();
        // Column separator dashed lines
        let sepX = marginL + colWidths.sr;
        for (let j = 0; j < 3; j++) {
          doc.moveTo(sepX, y).lineTo(sepX, y + rowH).strokeColor(borderColor).lineWidth(0.3).dash(3, { space: 2 }).stroke();
          doc.undash();
          sepX += [colWidths.desc, colWidths.qty, colWidths.price][j];
        }

        if (item && item.name) {
          const rate = Number(item.price || item.rate) || 0;
          const qty = Number(item.qty || item.quantity) || 1;
          cx = marginL;
          doc.fontSize(10).font('Helvetica').fillColor(lightText);
          doc.text(String(i + 1), cx + 4, y + 8, { width: colWidths.sr, align: 'center' });
          cx += colWidths.sr;
          doc.font('Helvetica-Bold').fillColor(darkText);
          doc.text((item.name || '').toUpperCase(), cx + 8, y + 8, { width: colWidths.desc - 10 });
          cx += colWidths.desc;
          doc.font('Helvetica').fillColor(darkText);
          doc.text(String(qty), cx, y + 8, { width: colWidths.qty, align: 'center' });
          cx += colWidths.qty;
          doc.text(fmt(rate), cx, y + 8, { width: colWidths.price, align: 'center' });
          cx += colWidths.price;
          doc.font('Helvetica-Bold');
          doc.text(fmt(rate * qty), cx, y + 8, { width: colWidths.total, align: 'center' });
        }
        y += rowH;
      }

      // ══════════════════════════════════════════════════
      //  NOTES CARD (left) + TOTALS CARD (right)
      // ══════════════════════════════════════════════════
      y += 14;

      // Calculate totals rows & height dynamically
      let totRowsCount = 2; // Subtotal + Grand Total
      if (discount > 0) totRowsCount++;
      if (extraCharges > 0) totRowsCount++;
      const totRowH = 22;
      const totalsCardH = Math.max(75, totRowsCount * totRowH + 6);
      const notesW = 230;
      const notesH = totalsCardH;

      // Notes card
      doc.roundedRect(marginL, y, notesW, notesH, 8).strokeColor(borderColor).lineWidth(1).stroke();
      doc.fontSize(9).font('Helvetica-Bold').fillColor(gold).text('NOTES', marginL + 16, y + 12);
      const notesText = discount > 0
        ? `DISCOUNT APPLIED: Rs. ${fmt(discount)}`
        : 'GARMENTS NOT COLLECTED WITHIN 30 DAYS ARE NOT THE SHOP RESPONSIBILITY.';
      doc.fontSize(9).font('Helvetica').fillColor('#334155').text(notesText, marginL + 16, y + 28, { width: notesW - 32 });

      // Totals card
      const totX = marginL + notesW + 18;
      const totW = contentW - notesW - 18;
      let totY = y;

      doc.roundedRect(totX, totY, totW, totalsCardH, 8).strokeColor(borderColor).lineWidth(1).stroke();

      // Subtotal (Total Amount)
      doc.fontSize(10).font('Helvetica-Bold').fillColor(darkText).text('Total Amount', totX + 12, totY + 7);
      doc.text(`Rs. ${fmt(subtotal)}`, totX + totW - 120, totY + 7, { width: 108, align: 'right' });
      totY += totRowH;

      // Discount (Only rendered if > 0)
      if (discount > 0) {
        doc.moveTo(totX + 8, totY).lineTo(totX + totW - 8, totY).strokeColor(borderColor).lineWidth(0.5).stroke();
        doc.fontSize(10).font('Helvetica').fillColor(darkText).text('Discount', totX + 12, totY + 4);
        doc.text(`- Rs. ${fmt(discount)}`, totX + totW - 120, totY + 4, { width: 108, align: 'right' });
        totY += totRowH;
      }

      // Extra Charges (Only rendered if > 0)
      if (extraCharges > 0) {
        doc.moveTo(totX + 8, totY).lineTo(totX + totW - 8, totY).strokeColor(borderColor).lineWidth(0.5).stroke();
        doc.fontSize(10).font('Helvetica').fillColor(darkText).text('Extra Charges', totX + 12, totY + 4);
        doc.text(`+ Rs. ${fmt(extraCharges)}`, totX + totW - 120, totY + 4, { width: 108, align: 'right' });
        totY += totRowH;
      }

      // Grand Total (gold bar)
      doc.rect(totX + 1, totY, totW - 2, totRowH + 4).fill(gold);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000').text('GRAND TOTAL', totX + 12, totY + 6);
      doc.text(`Rs. ${fmt(grandTotal)}`, totX + totW - 120, totY + 6, { width: 108, align: 'right' });

      y += totalsCardH + 12;

      // ══════════════════════════════════════════════════
      //  RATING LINK / GOOGLE REVIEW BANNER
      // ══════════════════════════════════════════════════
      const rawReviewUrl = shopInfo.reviewLink || '';
      const reviewUrl = rawReviewUrl.trim() ? (/^https?:\/\//i.test(rawReviewUrl.trim()) ? rawReviewUrl.trim() : `https://${rawReviewUrl.trim()}`) : '';
      const hasQrImg = shopInfo.reviewQrUrl && typeof shopInfo.reviewQrUrl === 'string' && shopInfo.reviewQrUrl.startsWith('data:image/');

      if (reviewUrl || hasQrImg) {
        const bannerH = 46;
        doc.roundedRect(marginL, y, contentW, bannerH, 6).fill('#F8FAFC');
        doc.roundedRect(marginL, y, contentW, bannerH, 6).strokeColor(borderColor).lineWidth(0.8).stroke();

        let textLeft = marginL + 12;
        if (hasQrImg) {
          try {
            const base64Data = shopInfo.reviewQrUrl.replace(/^data:image\/\w+;base64,/, '');
            const qrBuf = Buffer.from(base64Data, 'base64');
            doc.image(qrBuf, marginL + 8, y + 5, { fit: [36, 36] });
            textLeft = marginL + 52;
          } catch (e) {
            console.warn('[PDFKit] Review QR image draw warning:', e.message);
          }
        }

        doc.fontSize(9).font('Helvetica-Bold').fillColor('#D97706').text('* RATE YOUR EXPERIENCE ON GOOGLE', textLeft, y + 6);

        if (reviewUrl) {
          doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#2563EB').text(`Tap link or scan QR to leave us a 5-Star Review:  ${reviewUrl}`, textLeft, y + 20, {
            width: contentW - (textLeft - marginL) - 12,
            link: reviewUrl,
            underline: true,
          });

          // Add interactive clickable PDF link annotation over entire banner
          doc.link(marginL, y, contentW, bannerH, reviewUrl);
        } else {
          doc.fontSize(8.5).font('Helvetica').fillColor(navy).text('Scan QR Code to leave us a 5-Star Review!', textLeft, y + 20);
        }

        y += bannerH + 12;
      }

      // ══════════════════════════════════════════════════
      //  TERMS & CONDITIONS BLOCK
      // ══════════════════════════════════════════════════
      const rawTermsPdf = shopInfo.termsAndConditions || shopInfo.terms;
      let termsListPdf = Array.isArray(rawTermsPdf) && rawTermsPdf.length > 0
        ? rawTermsPdf
        : (typeof rawTermsPdf === 'string' && rawTermsPdf.trim() ? rawTermsPdf.split('\n').filter(t => t.trim()) : []);

      if (termsListPdf.length === 0) {
        termsListPdf = [
          '1. Garments not collected within 30 days are not the responsibility of the shop.',
          '2. Alterations are accepted within 7 days of delivery upon presentation of the original bill.',
          '3. Any disputes are subject to local jurisdiction only.',
        ];
      }

      const termsH = 16 + termsListPdf.length * 11;
      doc.roundedRect(marginL, y, contentW, termsH, 6).fill('#F8FAFC');
      doc.roundedRect(marginL, y, contentW, termsH, 6).strokeColor(borderColor).lineWidth(0.8).stroke();
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor(navy).text('TERMS & CONDITIONS', marginL + 12, y + 5);
      doc.fontSize(7.5).font('Helvetica').fillColor(lightText);
      let termY = y + 16;
      termsListPdf.forEach(t => {
        doc.text(`* ${t}`, marginL + 12, termY, { width: contentW - 24 });
        termY += 11;
      });

      y += termsH + 16;

      // ══════════════════════════════════════════════════
      //  FOOTER: Thank You + Contact + Signature
      // ══════════════════════════════════════════════════
      // ── Heart + "Thank You" ──
      const heartX = marginL;
      const heartY = y + 6;
      doc.save();
      doc.fillColor(gold);
      doc.moveTo(heartX, heartY + 4)
        .bezierCurveTo(heartX, heartY + 1, heartX + 4, heartY - 2, heartX + 7, heartY + 2)
        .bezierCurveTo(heartX + 10, heartY - 2, heartX + 14, heartY + 1, heartX + 14, heartY + 4)
        .bezierCurveTo(heartX + 14, heartY + 8, heartX + 7, heartY + 13, heartX + 7, heartY + 13)
        .bezierCurveTo(heartX + 7, heartY + 13, heartX, heartY + 8, heartX, heartY + 4)
        .fill();
      doc.restore();

      if (fs.existsSync(dancingScriptPath)) {
        try {
          doc.font(dancingScriptPath).fontSize(26).fillColor(navy).text('Thank You', marginL + 20, y);
        } catch (e) {
          doc.fontSize(22).font('Helvetica-Bold').fillColor(navy).text('Thank You', marginL + 20, y);
        }
      } else {
        doc.fontSize(22).font('Helvetica-Bold').fillColor(navy).text('Thank You', marginL + 20, y);
      }
      doc.fontSize(10).font('Helvetica').fillColor(lightText).text('For Your Business!', marginL, y + 28);

      // ── Contact Info (center column with left border) ──
      const contactX = 220;
      doc.moveTo(contactX - 10, y).lineTo(contactX - 10, y + 40).strokeColor(borderColor).lineWidth(1).stroke();
      doc.moveTo(contactX + 160, y).lineTo(contactX + 160, y + 40).strokeColor(borderColor).lineWidth(1).stroke();

      doc.fontSize(9).font('Helvetica-Bold').fillColor('#334155');
      doc.text('Tel: ', contactX, y + 6, { continued: true });
      doc.font('Helvetica').text(shopPhone);
      doc.font('Helvetica-Bold').text('Email: ', contactX, y + 22, { continued: true });
      doc.font('Helvetica').text(shopEmail);

      // ── Signature Block ──
      const sigX = 420;
      const sigW = pageW - marginR - sigX;
      let hasSigImg = false;

      if (shopInfo.signatureUrl && typeof shopInfo.signatureUrl === 'string' && shopInfo.signatureUrl.startsWith('data:image/')) {
        try {
          const base64Data = shopInfo.signatureUrl.replace(/^data:image\/\w+;base64,/, '');
          const sigBuf = Buffer.from(base64Data, 'base64');
          doc.image(sigBuf, sigX, y - 5, { fit: [130, 35] });
          hasSigImg = true;
        } catch (e) {
          console.warn('[PDFKit] Signature image draw warning:', e.message);
        }
      }

      if (!hasSigImg) {
        doc.save();
        doc.strokeColor(navy).lineWidth(2).lineCap('round');
        doc.moveTo(sigX + 10, y + 12)
          .quadraticCurveTo(sigX + 25, y - 5, sigX + 40, y + 10)
          .quadraticCurveTo(sigX + 55, y + 25, sigX + 70, y + 5)
          .quadraticCurveTo(sigX + 85, y - 10, sigX + 100, y + 12)
          .quadraticCurveTo(sigX + 110, y + 20, sigX + 120, y + 8)
          .stroke();
        doc.fontSize(9).font('Helvetica-Bold').fillColor(goldDark).text('Shivansh', sigX + 15, y + 18);
        doc.restore();
      }

      // Signature line
      doc.moveTo(sigX, y + 32).lineTo(sigX + sigW, y + 32).strokeColor(borderColor).lineWidth(1).stroke();
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#334155').text('Authorized Signatory', sigX, y + 36, { width: sigW, align: 'center' });

      // ══════════════════════════════════════════════════
      //  BOTTOM ACCENT BAR (Navy + Gold)
      // ══════════════════════════════════════════════════
      const bottomY = 842 - 14;
      doc.save();
      doc.moveTo(0, bottomY).lineTo(pageW * 0.65, bottomY).lineTo(pageW * 0.58, 842).lineTo(0, 842).closePath().fill(navy);
      doc.rect(pageW * 0.58, bottomY, pageW * 0.42, 14).fill(gold);
      doc.restore();

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
