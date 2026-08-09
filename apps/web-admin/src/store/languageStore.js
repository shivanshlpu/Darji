import { create } from 'zustand';

const translations = {
  en: {
    // Navigation
    dashboard: 'Dashboard',
    orders: 'Orders & Measurements',
    billing: 'Billing & Invoices',
    expenses: 'Shop Expenses',
    cashbook: 'Cash Book',
    reports: 'Sales & Financial Reports',
    queryAi: 'Query AI Assistant',
    settings: 'Settings',
    
    // Topbar & Toolbar
    searchPlaceholder: 'Search by order #, Token #, or customer name...',
    newOrderBtn: '+ New Custom Order & Token',
    
    // Dashboard Cards
    totalPendingTitle: 'Total Pending Payments',
    ordersDueTodayTitle: 'Orders Due Today',
    activeOrdersTitle: 'Active Orders in Shop',
    totalCustomersTitle: 'Total Customers',
    customersPendingBadge: 'Customers Pending',
    clickToView: 'Click to view',
    viewDueOrders: 'View due orders',
    activeSubtext: 'Preparing & Ready',
    manageCustomers: 'Manage customers',
    
    // Banners & Headings
    salesBannerTitle: 'Sales & Financial Reports',
    salesBannerText: 'Sales, total revenue, and operating ledgers have been organized on the dedicated Sales & Reports page.',
    viewSalesRevenue: 'View Sales & Revenue',
    weeklyOrderIntake: 'Weekly Order Intake',
    orderStatusBreakdown: 'Order Status Breakdown',
    recentOrders: 'Recent Active Orders',
    viewAll: 'View All',
    
    // Table Headers
    tokenHeader: 'TOKEN / ORDER',
    customerHeader: 'CUSTOMER',
    itemsHeader: 'ITEMS & DRESS',
    targetDateHeader: 'TARGET DATE',
    statusHeader: 'STATUS',
    balanceHeader: 'BALANCE DUE',
    actionsHeader: 'ACTIONS',
    
    // Status Chips
    allOrders: 'All Orders',
    dueTodayChip: 'Due Today',
    newOrdersChip: 'New Orders',
    preparingChip: 'Preparing (In Shop)',
    readyChip: 'Ready (Pickup)',
    completedChip: 'Completed',
    
    // Buttons & Actions
    generateBill: 'Generate & Issue Bill',
    markReady: 'Mark Ready (Send WA)',
    sendWaAlert: 'Send WA Alert',
    markComplete: 'Mark Complete & Handover',
    orderCompleted: 'Order Completed & Closed',
    viewProfile: 'View Profile',
    closeModal: 'Close',

    // Modals
    pendingModalTitle: 'Pending Payments Overview',
    pendingModalSub: 'customer(s) with uncollected dues',
    totalUncollected: 'TOTAL UNCOLLECTED DUES',
    pendingBalanceLabel: 'Pending Balance',
    whatsappBtn: 'WhatsApp',

    // Billing Page
    billingHeading: 'Invoices & Billing',
    billingSubheading: 'Digital invoices, automatic round-off, sequential numbering & WhatsApp sharing',
    selectOrderTitle: 'Select an Order to Generate Invoice',
    selectOrderSub: 'Choose an order from the left list to calculate discounts, and print or share the invoice PDF.',
    searchOrderPlaceholder: 'Search order #, Token # or customer...',
    printPdfBtn: 'Print / Save PDF',
    shareWaBtn: 'Share on WhatsApp',
    invoiceDetails: 'Invoice Details',
    billTo: 'Bill To',
    paymentSummary: 'Payment Summary',

    // Expenses Page
    expensesHeading: 'Shop Expenses',
    totalExpensesCard: 'Total Expenses',
    shopRentCard: 'Shop / Rent',
    salaryCard: 'Employee / Salary',
    materialCard: 'Material / Fabric',
    marketingCard: 'Marketing',
    miscCard: 'Miscellaneous',
    allCategories: 'All Categories',
    recordExpenseBtn: '+ Record Expense',
    dateCol: 'DATE',
    descCol: 'DESCRIPTION',
    catCol: 'CATEGORY',
    modeCol: 'MODE',
    recurringCol: 'RECURRING',
    amountCol: 'AMOUNT',

    // Cash Book Page
    cashbookHeading: 'Daily Cash Book',
    cashbookSubheading: 'Auto-calculated cash ledger, opening/closing balance & mismatch detection',
    openingCashCard: '1. Opening Cash (Carry Forward)',
    cashSalesTodayCard: '2. Cash Sales Today',
    cashExpensesTodayCard: '3. Cash Expenses Today',
    expectedClosingCashCard: '4. Expected Closing Cash',
    mismatchWarningTitle: 'Cash Mismatch Detected!',
    mismatchWarningSub: 'Expected cash in drawer differs from actual entered cash.',
    reconciliationHeading: 'Daily Cash Closure & Reconciliation',
    reconciliationSub: 'Count the physical cash in shop drawer at closing time and enter below.',
    actualCashLabel: 'Actual Physical Cash Count (₹) *',
    mismatchReasonLabel: 'Mismatch Reason / Explanation *',

    // Reports Page
    reportsHeading: 'Financial Reports & Business Analytics',
    reportsSubheading: 'Net profit calculations, margin analysis, expense distribution & exportable ledger summaries',
    today: 'Today',
    thisWeek: 'This Week',
    thisMonth: 'This Month',
    thisYear: 'This Year',
    customDate: 'Custom Date Range',
    allTime: 'All Time',
    exportPdf: 'Export PDF',
    exportExcel: 'Export Excel',
    totalRevenue: 'Total Revenue Collected',
    totalOperatingExpenses: 'Total Operating Expenses',
    netProfit: 'Net Profit (Sales - Expenses)',
    uncollectedPending: 'Uncollected Pending Payments',
    expenseCategoryBreakdown: 'Expense Category Breakdown',
    top5Customers: 'Top 5 High Value Customers',

    // Settings Page
    settingsHeading: 'Settings & Shop Configuration',
    shopProfileTab: 'Shop Profile & Branding',
    invoiceGstTab: 'Invoice & Bill Config',
    whatsappTab: 'WhatsApp Integration',
    offlineBackupTab: 'Offline & Backup',
    shopLogoLabel: 'SHOP LOGO (APPEARS ON TOP OF BILL)',
    signatureLabel: 'AUTHORIZED SIGNATURE (APPEARS AT BOTTOM OF BILL)',
    removeLogo: 'Remove Logo',
    removeSignature: 'Remove Signature',
    shopNameLabel: 'Shop Name *',
    gstinLabel: 'GSTIN Number (Optional)',
    phoneLabel: 'Phone Number',
    emailLabel: 'Email Address',
    addressLabel: 'Full Shop Address',
    termsLabel: 'Custom Terms & Conditions (One rule per line)',
    saveChangesBtn: 'Save Settings Changes',
  },
  hi: {
    // Navigation
    dashboard: 'डैशबोर्ड',
    orders: 'ऑर्डर्स और नाप',
    billing: 'बिलिंग और इनवॉइस',
    expenses: 'दुकान के खर्चे',
    cashbook: 'कैश बुक',
    reports: 'बिक्री और वित्तीय रिपोर्ट',
    queryAi: 'सवाल-जवाब AI असिस्टेंट',
    settings: 'सेटिंग्स',
    
    // Topbar & Toolbar
    searchPlaceholder: 'ऑर्डर #, टोकन # या ग्राहक नाम खोजें...',
    newOrderBtn: '+ नया कस्टम ऑर्डर व टोकन',
    
    // Dashboard Cards
    totalPendingTitle: 'कुल बकाया भुगतान',
    ordersDueTodayTitle: 'आज तैयार होने वाले ऑर्डर्स',
    activeOrdersTitle: 'दुकान में चालू ऑर्डर्स',
    totalCustomersTitle: 'कुल पंजीकृत ग्राहक',
    customersPendingBadge: 'ग्राहकों का बकाया',
    clickToView: 'सूची देखने के लिए क्लिक करें',
    viewDueOrders: 'आज के ऑर्डर्स देखें',
    activeSubtext: 'तैयारी व तैयार ऑर्डर्स',
    manageCustomers: 'ग्राहक देखें',
    
    // Banners & Headings
    salesBannerTitle: 'बिक्री और वित्तीय रिपोर्ट',
    salesBannerText: 'आपकी बिक्री, कुल कमाई और वित्तीय खाता बही को बिक्री और रिपोर्ट पेज पर देखा जा सकता है।',
    viewSalesRevenue: 'बिक्री और कमाई देखें',
    weeklyOrderIntake: 'साप्ताहिक नए ऑर्डर्स',
    orderStatusBreakdown: 'ऑर्डर स्थिति का विवरण',
    recentOrders: 'हाल के सक्रिय ऑर्डर्स',
    viewAll: 'सभी देखें',
    
    // Table Headers
    tokenHeader: 'टोकन / ऑर्डर #',
    customerHeader: 'ग्राहक का नाम',
    itemsHeader: 'कपड़े और कपड़े का विवरण',
    targetDateHeader: 'अनुमानित डिलीवरी तारीख',
    statusHeader: 'वर्तमान स्थिति',
    balanceHeader: 'बकाया राशि',
    actionsHeader: 'कार्रवाई (Actions)',
    
    // Status Chips
    allOrders: 'सभी ऑर्डर्स',
    dueTodayChip: 'आज डिलीवरी वाले',
    newOrdersChip: 'नए ऑर्डर्स',
    preparingChip: 'सिलाई/कटाई चालू',
    readyChip: 'तैयार (पिकअप हेतु)',
    completedChip: 'पूर्ण ऑर्डर्स',
    
    // Buttons & Actions
    generateBill: 'बिल जारी करें',
    markReady: 'तैयार मार्क करें (WA भेजें)',
    sendWaAlert: 'WhatsApp अलर्ट भेजें',
    markComplete: 'पूर्ण मार्क करें व सुपुर्द करें',
    orderCompleted: 'ऑर्डर पूर्ण व समाप्त',
    viewProfile: 'प्रोफाइल देखें',
    closeModal: 'बंद करें',

    // Modals
    pendingModalTitle: 'बकाया भुगतान का विवरण',
    pendingModalSub: 'ग्राहकों का भुगतान बकाया है',
    totalUncollected: 'कुल बकाया राशि',
    pendingBalanceLabel: 'बकाया राशि',
    whatsappBtn: 'WhatsApp रिमाइंड',

    // Billing Page
    billingHeading: 'इनवॉइस और बिलिंग',
    billingSubheading: 'डिजिटल इनवॉइस चालान, स्वचालित राउंड-ऑफ, नंबरिंग और व्हाट्सएप शेयरिंग',
    selectOrderTitle: 'इनवॉइस बनाने के लिए बाएं सूची से ऑर्डर चुनें',
    selectOrderSub: 'छूट, राउंड ऑफ देखने और पीडीएफ प्रिंट या व्हाट्सएप पर शेयर करने के लिए ऑर्डर पर क्लिक करें।',
    searchOrderPlaceholder: 'ऑर्डर #, टोकन # या ग्राहक नाम खोजें...',
    printPdfBtn: 'प्रिंट करें / PDF सेव करें',
    shareWaBtn: 'WhatsApp पर शेयर करें',
    invoiceDetails: 'इनवॉइस विवरण',
    billTo: 'ग्राहक विवरण (Bill To)',
    paymentSummary: 'भुगतान सारांश',

    // Expenses Page
    expensesHeading: 'दुकान के खर्चे',
    totalExpensesCard: 'कुल खर्चे',
    shopRentCard: 'दुकान / किराया',
    salaryCard: 'कर्मचारी / वेतन',
    materialCard: 'कपड़ा / सामग्री',
    marketingCard: 'प्रचार व विज्ञापन',
    miscCard: 'अन्य खर्चे',
    allCategories: 'सभी श्रेणियां',
    recordExpenseBtn: '+ नया खर्चा जोड़ें',
    dateCol: 'तारीख',
    descCol: 'विवरण',
    catCol: 'श्रेणी',
    modeCol: 'भुगतान माध्यम',
    recurringCol: 'आवर्ती (Recurring)',
    amountCol: 'राशि',

    // Cash Book Page
    cashbookHeading: 'दैनिक कैश बुक (कैश लेजर)',
    cashbookSubheading: 'स्वचालित नकद लेजर, प्रारंभिक/अंतिम नकद बैलेंस एवं गल्ला मिलान',
    openingCashCard: '1. प्रारंभिक नकद (पिछला शेष)',
    cashSalesTodayCard: '2. आज की नकद बिक्री',
    cashExpensesTodayCard: '3. आज के नकद खर्चे',
    expectedClosingCashCard: '4. अनुमानित अंतिम नकद',
    mismatchWarningTitle: 'कैश में अंतर पाया गया!',
    mismatchWarningSub: 'गल्ले का अनुमानित नकद और दर्ज नकद राशि में अंतर है।',
    reconciliationHeading: 'दैनिक कैश मिलान एवं बही बंद करें',
    reconciliationSub: 'दुकान बंद करते समय गल्ले में मौजूद नोटों को गिनकर नीचे दर्ज करें।',
    actualCashLabel: 'गल्ले में मौजूद वास्तविक नकद राशि (₹) *',
    mismatchReasonLabel: 'अंतर का कारण / विवरण *',

    // Reports Page
    reportsHeading: 'वित्तीय रिपोर्ट और व्यापार विश्लेषण',
    reportsSubheading: 'शुद्ध मुनाफा गणना, मार्जिन विश्लेषण, खर्च वितरण और निर्यातक खाता सारांश',
    today: 'आज',
    thisWeek: 'इस सप्ताह',
    thisMonth: 'इस महीने',
    thisYear: 'इस वर्ष',
    customDate: 'कस्टम तारीख',
    allTime: 'अब तक का',
    exportPdf: 'पीडीएफ डाउनलोड',
    exportExcel: 'एक्सेल डाउनलोड',
    totalRevenue: 'कुल प्राप्त आय',
    totalOperatingExpenses: 'कुल संचालन खर्चे',
    netProfit: 'शुद्ध लाभ (मुनाफा)',
    uncollectedPending: 'कुल बकाया राशि',
    expenseCategoryBreakdown: 'श्रेणी अनुसार खर्च विवरण',
    top5Customers: 'टॉप 5 सबसे बड़े ग्राहक',

    // Settings Page
    settingsHeading: 'दुकान प्रोफाइल व सेटिंग्स',
    shopProfileTab: 'दुकान प्रोफाइल व ब्रांडिंग',
    invoiceGstTab: 'इनवॉइस व बिल सेटिंग्स',
    whatsappTab: 'व्हाट्सएप इंटीग्रेशन',
    offlineBackupTab: 'ऑफलाइन व बैकअप',
    shopLogoLabel: 'दुकान का लोगो (बिल के ऊपर दिखेगा)',
    signatureLabel: 'अधिकृत हस्ताक्षर (बिल के नीचे दिखेगा)',
    removeLogo: 'लोगो हटाएं',
    removeSignature: 'हस्ताक्षर हटाएं',
    shopNameLabel: 'दुकान का नाम *',
    gstinLabel: 'जीएसटी नंबर (वैकल्पिक)',
    phoneLabel: 'फोन नंबर',
    emailLabel: 'ईमेल पता',
    addressLabel: 'दुकान का पूरा पता',
    termsLabel: 'नियम व शर्तें (प्रति पंक्ति एक नियम)',
    saveChangesBtn: 'सेटिंग्स बदलाव सुरक्षित करें',
  }
};

const savedLang = typeof window !== 'undefined' ? localStorage.getItem('darji_language') || 'en' : 'en';

const useLanguageStore = create((set, get) => ({
  language: savedLang,
  setLanguage: (lang) => {
    localStorage.setItem('darji_language', lang);
    set({ language: lang });
  },
  toggleLanguage: () => {
    const next = get().language === 'en' ? 'hi' : 'en';
    localStorage.setItem('darji_language', next);
    set({ language: next });
  },
  t: (key, fallback = '') => {
    const lang = get().language;
    return translations[lang]?.[key] || translations['en']?.[key] || fallback || key;
  }
}));

export default useLanguageStore;
