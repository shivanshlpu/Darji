import { Construction } from 'lucide-react';

const placeholderStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '16px',
  padding: '80px 24px',
  textAlign: 'center',
  color: 'var(--text-tertiary)',
};

const titleStyle = {
  fontFamily: 'var(--font-heading)',
  fontSize: 'var(--text-2xl)',
  fontWeight: 600,
  color: 'var(--text-primary)',
};

const subtitleStyle = {
  fontSize: 'var(--text-sm)',
  color: 'var(--text-secondary)',
  maxWidth: '400px',
};

const badgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 16px',
  background: 'var(--bg-active)',
  color: 'var(--color-gold-600)',
  borderRadius: '999px',
  fontSize: 'var(--text-xs)',
  fontWeight: 600,
};

export function Billing() {
  return (
    <div style={placeholderStyle} className="animate-fade-in-up">
      <Construction size={48} strokeWidth={1.5} />
      <h2 style={titleStyle}>Billing & Invoices</h2>
      <p style={subtitleStyle}>GST-compliant invoicing with auto-numbering, PDF generation, and WhatsApp sharing. Coming in Phase 3.</p>
      <span style={badgeStyle}>📋 Phase 3 — Money Module</span>
    </div>
  );
}

export function Expenses() {
  return (
    <div style={placeholderStyle} className="animate-fade-in-up">
      <Construction size={48} strokeWidth={1.5} />
      <h2 style={titleStyle}>Expenses</h2>
      <p style={subtitleStyle}>Track shop, employee, material, and marketing expenses with receipt photos and recurring entries.</p>
      <span style={badgeStyle}>💰 Phase 3 — Money Module</span>
    </div>
  );
}

export function CashBook() {
  return (
    <div style={placeholderStyle} className="animate-fade-in-up">
      <Construction size={48} strokeWidth={1.5} />
      <h2 style={titleStyle}>Cash Book</h2>
      <p style={subtitleStyle}>Daily cash reconciliation with auto-calculated opening/closing balances and mismatch alerts.</p>
      <span style={badgeStyle}>📒 Phase 3 — Money Module</span>
    </div>
  );
}

export function Reports() {
  return (
    <div style={placeholderStyle} className="animate-fade-in-up">
      <Construction size={48} strokeWidth={1.5} />
      <h2 style={titleStyle}>Reports & Analytics</h2>
      <p style={subtitleStyle}>Sales, profit, expense, and customer analytics with PDF/Excel export. Coming in Phase 7.</p>
      <span style={badgeStyle}>📊 Phase 7 — Reports</span>
    </div>
  );
}

export function QueryAI() {
  return (
    <div style={placeholderStyle} className="animate-fade-in-up">
      <Construction size={48} strokeWidth={1.5} />
      <h2 style={titleStyle}>Query AI</h2>
      <p style={subtitleStyle}>Ask questions in Hindi/English like "aaj ka sales kitna hai?" — local, rule-based, zero API cost. Coming in Phase 6.</p>
      <span style={badgeStyle}>🤖 Phase 6 — Query AI</span>
    </div>
  );
}

export function SettingsPage() {
  return (
    <div style={placeholderStyle} className="animate-fade-in-up">
      <Construction size={48} strokeWidth={1.5} />
      <h2 style={titleStyle}>Settings</h2>
      <p style={subtitleStyle}>Shop profile, invoice settings, GST configuration, WhatsApp pairing, backup/restore, and user management.</p>
      <span style={badgeStyle}>⚙️ Phase 8 — Polish</span>
    </div>
  );
}
