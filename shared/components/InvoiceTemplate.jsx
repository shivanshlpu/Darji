import React from 'react';
import '../styles/invoice.css';

export const InvoiceTemplate = ({ invoice }) => {
  if (!invoice) return null;

  const items = invoice.items || [];
  const customer = invoice.customer || { name: '', phone: '', address: '' };

  const subtotal = invoice.subtotal !== undefined ? Math.round(invoice.subtotal) : items.reduce((acc, item) => acc + (item?.qty || 0) * (item?.price || 0), 0);
  const discount = Math.round(invoice.discount || 0);
  const tax = invoice.tax || 0;
  const extraCharges = Math.round(invoice.extraCharges || 0);
  const grandTotal = invoice.grandTotal !== undefined ? Math.round(invoice.grandTotal) : Math.max(0, Math.round(subtotal - discount + tax + extraCharges));

  const formattedInvoiceNo = (invoice.invoiceNumber || '').replace(/[^0-9]/g, '') || invoice.invoiceNumber || '';
  const formattedDate = invoice.date || '';

  const paidAmount = invoice.paidAmount !== undefined ? Math.round(invoice.paidAmount) : (invoice.paid !== undefined ? Math.round(invoice.paid) : 0);
  const balanceDue = invoice.balanceDue !== undefined ? Math.round(invoice.balanceDue) : (invoice.remaining !== undefined ? Math.round(invoice.remaining) : Math.max(0, grandTotal - paidAmount));
  const isFullyPaid = balanceDue <= 0 && grandTotal > 0;
  const paymentStatusText = isFullyPaid ? 'FULL PAID' : (paidAmount > 0 ? `PARTIALLY PAID (₹${paidAmount})` : 'UNPAID');

  const formatAmount = (num) => (num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Generate at least 6 table rows to show gridlines matching sample image
  const displayItems = [...items];
  const minRows = 6;
  while (displayItems.length < minRows) {
    displayItems.push({ name: '', qty: 0, price: 0 });
  }

  const notesText = invoice.discountPercent && invoice.discountPercent > 0
    ? `DISCOUNT ${invoice.discountPercent}%`
    : (discount > 0 ? `DISCOUNT APPLIED: ₹ ${formatAmount(discount)}` : (invoice.notes || 'GARMENTS NOT COLLECTED WITHIN 30 DAYS ARE NOT THE SHOP RESPONSIBILITY.'));

  const displayTitle = (invoice.shopName || 'Darji')
    .replace(/premium tailors/gi, '')
    .replace(/tailors/gi, '')
    .trim() || 'Darji';

  return (
    <div className="darji-target-invoice-container" id="printable-bill">
      {/* Decorative Top Accent Bar */}
      <div className="target-top-accent-bar">
        <div className="target-top-accent-yellow"></div>
      </div>

      <div className="target-invoice-wrapper">
        {/* Header Section */}
        <div className="target-header-container">
          <div className="target-header-brand-box">
            {invoice.logoUrl ? (
              <img src={invoice.logoUrl} className="target-brand-logo-img" alt={displayTitle} style={{ background: 'transparent', borderRadius: 0 }} />
            ) : (
              /* Sewing Machine Vector SVG Logo (Clean transparent background) */
              <svg className="target-brand-logo-circle" viewBox="0 0 100 85" xmlns="http://www.w3.org/2000/svg" style={{ background: 'transparent' }}>
                <path d="M 22 62 L 78 62 C 79 62 80 61 80 60 L 80 58 C 80 57 79 56 78 56 L 36 56 C 36 46 38 40 48 38 L 72 38 C 75 38 76 36 76 33 C 76 30 74 28 71 28 L 38 28 C 26 28 23 38 23 48 L 23 60 C 23 61 24 62 26 62 Z" fill="#0B1F3A"/>
                <circle cx="73" cy="33" r="7" fill="none" stroke="#0B1F3A" strokeWidth="2.5"/>
                <circle cx="73" cy="33" r="2.5" fill="#0B1F3A"/>
                <line x1="31" y1="44" x2="31" y2="56" stroke="#0B1F3A" strokeWidth="2.5"/>
                <rect x="16" y="62" width="68" height="4" rx="2" fill="#0B1F3A"/>
                <text x="50" y="78" fontFamily="'Inter', sans-serif" fontWeight="900" fontSize="12" fill="#0B1F3A" textAnchor="middle" letterSpacing="1.5">DARJI</text>
              </svg>
            )}

            <div className="target-brand-text-box">
              <h1 className="target-brand-title">{displayTitle}</h1>
              <span className="target-brand-tagline">{invoice.tagline || 'Stitched to Perfection'}</span>
              <div className="target-brand-address-box">
                <svg className="target-pin-icon" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                <div>
                  {invoice.address || '80/LIG 1ST New Housing Board Colony, Shahdol (M.P.) 484001'}
                </div>
              </div>
            </div>
          </div>

          <div className="target-header-divider"></div>

          <div className="target-header-inv-box">
            <h2 className="target-inv-title">INVOICE</h2>
            <div className="target-inv-yellow-bar"></div>
            
            <div className="target-inv-meta-row">
              <div className="target-inv-meta-label">
                <svg className="target-meta-icon" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                Invoice No.
              </div>
              <div className="target-inv-meta-val">{formattedInvoiceNo}</div>
            </div>

            <div className="target-inv-meta-row">
              <div className="target-inv-meta-label">
                <svg className="target-meta-icon" viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/></svg>
                Invoice Date
              </div>
              <div className="target-inv-meta-val">{formattedDate}</div>
            </div>
          </div>
        </div>

        {/* Customer BILL TO Card */}
        <div className="target-cust-card">
          <div className="target-cust-card-title">
            <svg style={{ width: '14px', height: '14px', fill: '#F59E0B' }} viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            BILL TO
          </div>
          <div className="target-cust-field-grid">
            <div className="target-cust-field-row">
              <span className="target-cust-label">Name</span>
              <span className="target-cust-val">{customer.name}</span>
            </div>
            <div className="target-cust-field-row">
              <span className="target-cust-label">Contact</span>
              <span className="target-cust-val">{customer.phone || customer.mobile || ''}</span>
            </div>
            <div className="target-cust-field-row">
              <span className="target-cust-label">Address</span>
              <span className="target-cust-val">{customer.address || customer.city || '—'}</span>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="target-table-container">
          <table className="target-items-table">
            <thead>
              <tr>
                <th style={{ width: '70px' }}>SR. NO.</th>
                <th className="th-desc">DESCRIPTION</th>
                <th style={{ width: '70px' }}>QTY</th>
                <th style={{ width: '140px' }}>UNIT PRICE (₹)</th>
                <th style={{ width: '140px' }}>TOTAL PRICE (₹)</th>
              </tr>
            </thead>
            <tbody>
              {displayItems.map((item, idx) => (
                <tr key={idx}>
                  <td className="td-sr">{item?.name ? idx + 1 : ''}</td>
                  <td className="td-desc">{item?.name ? item.name : ''}</td>
                  <td className="td-qty">{item?.name ? item.qty : ''}</td>
                  <td className="td-price">{item?.name ? formatAmount(item.price) : ''}</td>
                  <td className="td-total">{item?.name ? formatAmount((item.qty || 0) * (item.price || 0)) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Grid */}
        <div className="target-summary-grid">
          <div className="target-notes-card">
            <div className="target-notes-title">
              <svg style={{ width: '14px', height: '14px', fill: '#F59E0B' }} viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
              NOTES
            </div>
            <div className="target-notes-content">
              {notesText}
            </div>
          </div>

          <div className="target-totals-card">
            <div className="target-tot-row">
              <span>Total Amount</span>
              <span>₹ {formatAmount(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="target-tot-row">
                <span>Discount</span>
                <span style={{ color: '#D97706', fontWeight: 700 }}>- ₹ {formatAmount(discount)}</span>
              </div>
            )}
            {extraCharges > 0 && (
              <div className="target-tot-row">
                <span>Extra Charges</span>
                <span>+ ₹ {formatAmount(extraCharges)}</span>
              </div>
            )}
            <div className="target-tot-row target-tot-row-grand">
              <span>GRAND TOTAL</span>
              <span>₹ {formatAmount(grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* ⭐ Google Review QR & Link Banner (If Present) */}
        {(() => {
          const rawUrl = invoice.reviewLink || '';
          const linkUrl = rawUrl.trim() ? (/^https?:\/\//i.test(rawUrl.trim()) ? rawUrl.trim() : `https://${rawUrl.trim()}`) : '';
          const qrSrc = invoice.reviewQrUrl || (linkUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(linkUrl)}` : null);

          if (!linkUrl && !qrSrc) return null;

          const banner = (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '10px 16px', margin: '12px 0 4px 0', textDecoration: 'none' }}>
              {qrSrc && (
                <img
                  src={qrSrc}
                  alt="Google Review QR"
                  style={{ width: '64px', height: '64px', objectFit: 'contain', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', padding: '2px', flexShrink: 0 }}
                />
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#D97706', letterSpacing: '0.3px' }}>⭐ RATE YOUR EXPERIENCE ON GOOGLE</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0B1F3A' }}>Scan QR Code or tap to leave us a 5-Star Review!</span>
                {linkUrl && (
                  <span style={{ fontSize: '11px', color: '#2563EB', fontWeight: 600, wordBreak: 'break-all', textDecoration: 'underline' }}>
                    {linkUrl}
                  </span>
                )}
              </div>
            </div>
          );

          if (linkUrl) {
            return (
              <a href={linkUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                {banner}
              </a>
            );
          }
          return banner;
        })()}

        {/* ⭐ Terms & Conditions Banner */}
        {(() => {
          const rawTerms = invoice.termsAndConditions || invoice.terms;
          const termsList = Array.isArray(rawTerms)
            ? rawTerms
            : (typeof rawTerms === 'string' ? rawTerms.split('\n').filter(t => t.trim()) : []);

          if (termsList.length === 0) return null;

          return (
            <div style={{ marginTop: '10px', padding: '8px 12px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#0B1F3A', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>
                TERMS & CONDITIONS
              </div>
              <ul style={{ margin: 0, paddingLeft: '14px', fontSize: '9.5px', color: '#475569', lineHeight: '1.45' }}>
                {termsList.map((term, i) => (
                  <li key={i}>{term}</li>
                ))}
              </ul>
            </div>
          );
        })()}

        {/* Footer Section */}
        <div className="target-footer-container">
          <div className="target-thank-box">
            <div className="target-thank-title-row">
              <svg className="target-heart-icon" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
              <span className="target-thank-script">Thank You</span>
            </div>
            <span className="target-thank-sub">For Your Business!</span>
          </div>

          <div className="target-contact-col">
            <div className="target-contact-item">
              <svg className="target-contact-icon" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
              {invoice.phone || '+919479487828, +917000621972'}
            </div>
            <div className="target-contact-item">
              <svg className="target-contact-icon" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
              {invoice.email || 'darji.tailoring@gmail.com'}
            </div>
          </div>

          <div className="target-sig-box">
            {invoice.signatureUrl ? (
              <img src={invoice.signatureUrl} className="target-sig-img" alt="Signature" />
            ) : (
              <div className="target-sig-placeholder"></div>
            )}
            <div className="target-sig-line"></div>
            <span className="target-sig-label">Authorized Signatory</span>
          </div>
        </div>
      </div>

      {/* Bottom Decorative Accent Bar */}
      <div className="target-bottom-accent-bar">
        <div className="target-bottom-accent-navy"></div>
        <div className="target-bottom-accent-yellow"></div>
      </div>
    </div>
  );
};
