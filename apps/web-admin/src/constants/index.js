// Measurement categories with exact fields per customer slips and tailoring standards
export const MEASUREMENT_CATEGORIES = {
  suit: {
    label: 'Suit (Salwar / Pant / Palazzo)',
    icon: '👗',
    fields: [
      { key: 'fullLength', label: 'Full Length', unit: 'in' },
      { key: 'shoulder', label: 'Shoulder', unit: 'in' },
      { key: 'uChest', label: 'Upper Chest', unit: 'in' },
      { key: 'chest', label: 'Chest', unit: 'in' },
      { key: 'waistRound', label: 'Waist Round', unit: 'in' },
      { key: 'hipRound', label: 'Hip Round', unit: 'in' },
      { key: 'waistLength', label: 'Waist Length', unit: 'in' },
      { key: 'hipLength', label: 'Hip Length', unit: 'in' },
      { key: 'hemLine', label: 'Hem Line', unit: 'in' },
      { key: 'armHole', label: 'Arm Hole', unit: 'in' },
      { key: 'bicaps', label: 'Biceps', unit: 'in' },
      { key: 'sleeve', label: 'Sleeve', unit: 'in' },
      { key: 'bottomLength', label: 'Bottom Length', unit: 'in' },
      { key: 'lowerWaistRound', label: 'Lower W.R.', unit: 'in' },
      { key: 'thighs', label: 'Thighs', unit: 'in' },
      { key: 'bottom', label: 'Bottom / Mori', unit: 'in' },
    ],
  },
  kurti: {
    label: 'Kurti / Tops',
    icon: '👔',
    fields: [
      { key: 'fullLength', label: 'Full Length', unit: 'in' },
      { key: 'shoulder', label: 'Shoulder', unit: 'in' },
      { key: 'uChest', label: 'Upper Chest', unit: 'in' },
      { key: 'chest', label: 'Chest', unit: 'in' },
      { key: 'waistRound', label: 'Waist Round', unit: 'in' },
      { key: 'hipRound', label: 'Hip Round', unit: 'in' },
      { key: 'waistLength', label: 'Waist Length', unit: 'in' },
      { key: 'hipLength', label: 'Hip Length', unit: 'in' },
      { key: 'hemLine', label: 'Hem Line', unit: 'in' },
      { key: 'armHole', label: 'Arm Hole', unit: 'in' },
      { key: 'bicaps', label: 'Biceps', unit: 'in' },
      { key: 'sleeve', label: 'Sleeve', unit: 'in' },
    ],
  },
  blouse: {
    label: 'Blouse (Padded / Non-padded)',
    icon: '👚',
    fields: [
      { key: 'fullLength', label: 'Full Length', unit: 'in' },
      { key: 'shoulder', label: 'Shoulder', unit: 'in' },
      { key: 'uChest', label: 'Upper Chest', unit: 'in' },
      { key: 'chest', label: 'Chest', unit: 'in' },
      { key: 'waistRound', label: 'Waist Round', unit: 'in' },
      { key: 'apexPoint', label: 'Apex Point', unit: 'in' },
      { key: 'underBust', label: 'Under Bust', unit: 'in' },
      { key: 'armHole', label: 'Arm Hole', unit: 'in' },
      { key: 'bicaps', label: 'Biceps', unit: 'in' },
      { key: 'sleeve', label: 'Sleeve', unit: 'in' },
      { key: 'frontCross', label: 'Front Cross', unit: 'in' },
      { key: 'backCross', label: 'Back Cross', unit: 'in' },
      { key: 'fNeckDeep', label: 'Front Neck Depth', unit: 'in' },
      { key: 'bNeckDeep', label: 'Back Neck Depth', unit: 'in' },
    ],
  },
  saree: {
    label: 'Saree',
    icon: '🥻',
    fields: [
      { key: 'fullLength', label: 'Length', unit: 'in' },
      { key: 'waistRound', label: 'Petticoat Waist', unit: 'in' },
      { key: 'hipRound', label: 'Petticoat Hip', unit: 'in' },
      { key: 'customNotes', label: 'Fall / Pico / Drape Notes', unit: 'text' },
    ],
  },
  other: {
    label: 'Other Garment / Alteration',
    icon: '✨',
    fields: [
      { key: 'fullLength', label: 'Full Length', unit: 'in' },
      { key: 'shoulder', label: 'Shoulder', unit: 'in' },
      { key: 'chest', label: 'Chest / Bust', unit: 'in' },
      { key: 'waist', label: 'Waist Round', unit: 'in' },
      { key: 'hip', label: 'Hip Round', unit: 'in' },
      { key: 'sleeve', label: 'Sleeve', unit: 'in' },
      { key: 'customNotes', label: 'Custom Specs / Alteration Notes', unit: 'text' },
    ],
  },
};

// Aliases for legacy category keys to prevent breaking saved orders or profile tabs
Object.defineProperty(MEASUREMENT_CATEGORIES, 'topWear', { get() { return MEASUREMENT_CATEGORIES.kurti; }, enumerable: false });
Object.defineProperty(MEASUREMENT_CATEGORIES, 'bottomWear', { get() { return MEASUREMENT_CATEGORIES.suit; }, enumerable: false });
Object.defineProperty(MEASUREMENT_CATEGORIES, 'ethnicFormal', { get() { return MEASUREMENT_CATEGORIES.suit; }, enumerable: false });

// Primary Garment Categories with Prices & Subtypes for Order Entry & Agent workflows
export const GARMENT_CATEGORIES = [
  {
    value: 'suit',
    label: 'Suit (Salwar / Pant / Palazzo)',
    shortLabel: 'Suit',
    defaultName: 'Suit',
    defaultPrice: 500,
    subtypes: ['Salwar', 'Pant', 'Palazzo'],
    defaultSubtype: 'Salwar',
  },
  {
    value: 'kurti',
    label: 'Kurti (Kurti / Tops)',
    shortLabel: 'Kurti',
    defaultName: 'Kurti',
    defaultPrice: 300,
    subtypes: ['Kurti', 'Tops'],
    defaultSubtype: 'Kurti',
  },
  {
    value: 'blouse',
    label: 'Blouse (Padded / Non-padded)',
    shortLabel: 'Blouse',
    defaultName: 'Blouse',
    defaultPrice: 400,
    subtypes: ['Padded', 'Non-padded'],
    defaultSubtype: 'Padded',
  },
  {
    value: 'saree',
    label: 'Saree',
    shortLabel: 'Saree',
    defaultName: 'Saree',
    defaultPrice: 0, // Unconfigured in existing app; user specifies price
    subtypes: ['Saree'],
    defaultSubtype: 'Saree',
  },
  {
    value: 'other',
    label: 'Other (Custom garment / Alteration)',
    shortLabel: 'Other',
    defaultName: 'Custom Garment',
    defaultPrice: 0, // Do not display a price for Other option
    subtypes: ['Custom Garment', 'Alteration'],
    defaultSubtype: 'Custom Garment',
  },
];

// Country Code Prefixes for flexible billing & communication
export const COUNTRY_PREFIXES = [
  { code: '+91', label: '🇮🇳 +91 (India)' },
  { code: '+1', label: '🇺🇸 +1 (USA / Canada)' },
  { code: '+971', label: '🇦🇪 +971 (UAE)' },
  { code: '+44', label: '🇬🇧 +44 (UK)' },
  { code: '+966', label: '🇸🇦 +966 (Saudi Arabia)' },
  { code: '+965', label: '🇰🇼 +965 (Kuwait)' },
  { code: '+974', label: '🇶🇦 +974 (Qatar)' },
  { code: '+61', label: '🇦🇺 +61 (Australia)' },
  { code: '+65', label: '🇸🇬 +65 (Singapore)' },
  { code: '+60', label: '🇲🇾 +60 (Malaysia)' },
  { code: '+977', label: '🇳🇵 +977 (Nepal)' },
];

// Helper to look up garment configuration
export const getGarmentConfig = (catKey) => {
  const cleanKey = String(catKey || '').trim();
  const directMatch = GARMENT_CATEGORIES.find(g => g.value === cleanKey);
  if (directMatch) return directMatch;
  const legacyKey = LEGACY_CATEGORY_MAP[cleanKey];
  return GARMENT_CATEGORIES.find(g => g.value === legacyKey) || GARMENT_CATEGORIES[0];
};

// Helper to get default garment price (Suit: 500, Kurti: 300, Blouse: 400, Saree: 0, Other: 0)
export const getGarmentDefaultPrice = (catKey) => {
  const g = getGarmentConfig(catKey);
  return g ? g.defaultPrice : 0;
};

// Safe helper for legacy category resolution without polluting Object.entries
export const LEGACY_CATEGORY_MAP = {
  topWear: 'kurti',
  bottomWear: 'suit',
  ethnicFormal: 'suit',
  shirt: 'kurti',
  pant: 'suit',
  suit: 'suit',
  kurti: 'kurti',
  blouse: 'blouse',
  saree: 'saree',
  sareeBlouse: 'blouse',
  coat: 'suit',
  blazer: 'suit',
  trouser: 'suit',
  pajama: 'suit',
  other: 'other',
};

export const getCategoryConfig = (catKey) => {
  if (!catKey) return MEASUREMENT_CATEGORIES.suit;
  if (MEASUREMENT_CATEGORIES[catKey]) return MEASUREMENT_CATEGORIES[catKey];
  const legacyKey = LEGACY_CATEGORY_MAP[catKey];
  return (legacyKey && MEASUREMENT_CATEGORIES[legacyKey]) || MEASUREMENT_CATEGORIES.suit;
};

// Streamlined Order Statuses per user requirement
export const ORDER_STATUSES = {
  pending: { label: 'New Order', color: 'warning', next: ['preparing', 'ready', 'cancelled'] },
  preparing: { label: 'Preparing', color: 'info', next: ['ready', 'completed', 'cancelled'] },
  cutting: { label: 'Preparing', color: 'info', next: ['ready', 'completed', 'cancelled'] },
  stitching: { label: 'Preparing', color: 'info', next: ['ready', 'completed', 'cancelled'] },
  trial: { label: 'Preparing', color: 'info', next: ['ready', 'completed', 'cancelled'] },
  ready: { label: 'Ready', color: 'warning', next: ['completed', 'cancelled'] },
  completed: { label: 'Completed', color: 'success', next: [] },
  delivered: { label: 'Completed', color: 'success', next: [] },
  cancelled: { label: 'Cancelled', color: 'danger', next: [] },
};

export const PAYMENT_MODES = ['cash', 'upi', 'card', 'bankTransfer'];
export const PAYMENT_TYPES = ['advance', 'partial', 'final'];

export const PAYMENT_STATUSES = {
  unpaid: { label: 'Unpaid', color: 'danger' },
  partial: { label: 'Partial', color: 'warning' },
  paid: { label: 'Paid', color: 'success' },
};

export const EXPENSE_CATEGORIES = [
  { value: 'shop', label: 'Shop / Rent' },
  { value: 'employee', label: 'Employee / Salary' },
  { value: 'material', label: 'Material / Fabric' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'misc', label: 'Miscellaneous' },
];

export const INCOME_CATEGORIES = [
  { value: 'small_tasks', label: 'Small Tasks / Alterations' },
  { value: 'youtube', label: 'YouTube / Online Income' },
  { value: 'scrap', label: 'Fabric Scrap / Waste Sale' },
  { value: 'commission', label: 'Commission / Referral' },
  { value: 'other_income', label: 'Other Extra Income' },
];

export const TRANSACTION_TYPES = [
  { value: 'expense', label: 'Expense (खर्च)' },
  { value: 'income', label: 'Extra Income (अतिरिक्त आय)' },
];

export const PRIORITIES = {
  normal: { label: 'Normal', color: 'default' },
  urgent: { label: 'Urgent', color: 'warning' },
  vip: { label: 'VIP', color: 'gold' },
};

export const USER_ROLES = {
  owner: { label: 'Owner', permissions: ['all'] },
  staff: { label: 'Staff', permissions: ['customers', 'measurements', 'orders', 'payments'] },
};
