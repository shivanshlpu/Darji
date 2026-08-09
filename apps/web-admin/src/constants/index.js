// Measurement categories with exact fields per customer slips
export const MEASUREMENT_CATEGORIES = {
  topWear: {
    label: 'Top Wear',
    icon: '👔',
    fields: [
      { key: 'fullLength', label: 'Full Length', unit: 'in' },
      { key: 'shoulder', label: 'Shoulder', unit: 'in' },
      { key: 'uChest', label: 'U. Chest', unit: 'in' },
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
  bottomWear: {
    label: 'Bottom Wear',
    icon: '👖',
    fields: [
      { key: 'fullLength', label: 'Full Length', unit: 'in' },
      { key: 'lowerWaistRound', label: 'Lower W.R.', unit: 'in' },
      { key: 'hipRound', label: 'Hip Round', unit: 'in' },
      { key: 'thighs', label: 'Thighs', unit: 'in' },
      { key: 'bottom', label: 'Bottom', unit: 'in' },
    ],
  },
  blouse: {
    label: 'Blouse',
    icon: '👚',
    fields: [
      { key: 'fullLength', label: 'Full Length', unit: 'in' },
      { key: 'shoulder', label: 'Shoulder', unit: 'in' },
      { key: 'uChest', label: 'U. Chest', unit: 'in' },
      { key: 'chest', label: 'Chest', unit: 'in' },
      { key: 'waistRound', label: 'Waist Round', unit: 'in' },
      { key: 'apexPoint', label: 'Apex Point', unit: 'in' },
      { key: 'underBust', label: 'Under Bust', unit: 'in' },
      { key: 'armHole', label: 'Arm Hole', unit: 'in' },
      { key: 'bicaps', label: 'Biceps', unit: 'in' },
      { key: 'sleeve', label: 'Sleeve', unit: 'in' },
      { key: 'frontCross', label: 'Front Cross', unit: 'in' },
      { key: 'backCross', label: 'Back Cross', unit: 'in' },
      { key: 'fNeckDeep', label: 'F. Neck Deep', unit: 'in' },
      { key: 'bNeckDeep', label: 'B. Neck Deep', unit: 'in' },
    ],
  },
  other: {
    label: 'Other',
    icon: '✨',
    fields: [
      { key: 'fullLength', label: 'Full Length', unit: 'in' },
      { key: 'chest', label: 'Chest / Bust', unit: 'in' },
      { key: 'waist', label: 'Waist Round', unit: 'in' },
      { key: 'hip', label: 'Hip Round', unit: 'in' },
      { key: 'shoulder', label: 'Shoulder', unit: 'in' },
      { key: 'sleeve', label: 'Sleeve', unit: 'in' },
      { key: 'customNotes', label: 'Custom Specs / Notes', unit: 'text' },
    ],
  },
};

// Safe helper for legacy category resolution without polluting Object.entries
const LEGACY_CATEGORY_MAP = {
  shirt: 'topWear',
  pant: 'bottomWear',
  suit: 'topWear',
  kurta: 'topWear',
  lehenga: 'bottomWear',
  sareeBlouse: 'blouse',
  coat: 'topWear',
};

export const getCategoryConfig = (catKey) => {
  if (!catKey) return MEASUREMENT_CATEGORIES.topWear;
  if (MEASUREMENT_CATEGORIES[catKey]) return MEASUREMENT_CATEGORIES[catKey];
  const legacyKey = LEGACY_CATEGORY_MAP[catKey];
  return MEASUREMENT_CATEGORIES[legacyKey] || MEASUREMENT_CATEGORIES.topWear;
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

export const PRIORITIES = {
  normal: { label: 'Normal', color: 'default' },
  urgent: { label: 'Urgent', color: 'warning' },
  vip: { label: 'VIP', color: 'gold' },
};

export const USER_ROLES = {
  owner: { label: 'Owner', permissions: ['all'] },
  staff: { label: 'Staff', permissions: ['customers', 'measurements', 'orders', 'payments'] },
};
