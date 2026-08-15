import { create } from 'zustand';
import { api } from '../services/apiClient';

const DEFAULT_TERMS = [
  '1. Garments not collected within 30 days are not the responsibility of the shop.',
  '2. Alterations are accepted within 7 days of delivery upon presentation of the original bill.',
  '3. Any disputes are subject to local jurisdiction only.',
  '4. Customer will receive a WhatsApp notification once the job is ready for pickup.',
];

const getSavedLocalSettings = () => {
  try {
    const cached = localStorage.getItem('darji_shop_settings');
    if (cached) return JSON.parse(cached);
  } catch (e) {
    // Ignore JSON parse errors
  }
  return null;
};

const localCache = getSavedLocalSettings();

const useSettingsStore = create((set, get) => ({
  shopInfo: localCache?.shopInfo || {
    name: 'Darji Premium Tailors',
    phone: '+919479487828, +917000621972',
    phoneNumbers: ['+919479487828', '+917000621972'],
    email: 'darjithetailoringshop@gmail.com',
    gstNumber: '24AAACD1234E1Z9',
    address: '80/LIG 1ST New Housing Board Colony, Shahdol (M.P.) 484001',
    currency: 'INR (₹)',
    logoUrl: null,
    signatureUrl: null,
    reviewLink: 'https://g.page/r/CVIGyGz2VDeQEBM/review',
    reviewQrUrl: null,
    termsAndConditions: DEFAULT_TERMS.join('\n'),
  },

  invoiceSettings: localCache?.invoiceSettings || {
    prefix: 'INV',
    resetCycle: 'yearly',
    padding: 6,
  },

  waConnected: false,
  waStatus: 'disconnected',
  waSessionPhone: '',
  waQrToken: null,
  isSyncing: false,

  fetchWhatsAppStatus: async () => {
    try {
      const res = await api.getWhatsAppStatus();
      if (res.success && res.data) {
        const { status, qrCode, phone } = res.data;
        set({
          waStatus: status,
          waConnected: status === 'connected',
          waQrToken: qrCode || null,
          ...(phone ? { waSessionPhone: phone } : {}),
        });
      }
    } catch (err) {
      console.warn('[WhatsApp Store] Fetch status fallback:', err.message);
    }
  },

  disconnectWhatsApp: async () => {
    try {
      set({ waConnected: false, waStatus: 'disconnected', waQrToken: null });
      await api.disconnectWhatsApp();
      setTimeout(() => get().fetchWhatsAppStatus(), 1500);
    } catch (err) {
      console.warn('[WhatsApp Store] Disconnect fallback:', err.message);
    }
  },

  connectWhatsApp: async (phone) => {
    try {
      await api.reconnectWhatsApp();
      setTimeout(() => get().fetchWhatsAppStatus(), 1000);
    } catch (err) {
      console.warn('[WhatsApp Store] Reconnect fallback:', err.message);
    }
  },

  generateNewQR: async () => {
    try {
      await api.reconnectWhatsApp();
      setTimeout(() => get().fetchWhatsAppStatus(), 1000);
    } catch (err) {
      console.warn('[WhatsApp Store] Generate QR fallback:', err.message);
    }
  },

  toggleWaConnection: () => set((state) => ({
    waConnected: !state.waConnected,
  })),

  fetchSettingsFromDB: async () => {
    try {
      const res = await api.getShopSettings();
      if (res.success && res.data) {
        const data = res.data;
        const phoneNumbers = Array.isArray(data.phoneNumbers) && data.phoneNumbers.length > 0
          ? data.phoneNumbers
          : (data.phone ? data.phone.split(',').map(p => p.trim()).filter(Boolean) : ['+919479487828', '+917000621972']);

        const shopInfo = {
          name: data.name || 'Darji Premium Tailors',
          phone: phoneNumbers.join(', ') || data.phone || '+919479487828, +917000621972',
          phoneNumbers,
          email: data.email || 'darji.tailoring@gmail.com',
          gstNumber: data.gstNumber || '24AAACD1234E1Z9',
          address: data.address || '80/LIG 1ST New Housing Board Colony, Shahdol (M.P.) 484001',
          currency: data.currency || 'INR (₹)',
          logoUrl: data.logoUrl || null,
          signatureUrl: data.signatureUrl || null,
          reviewLink: data.reviewLink || 'https://g.page/r/CVIGyGz2VDeQEBM/review',
          reviewQrUrl: data.reviewQrUrl || null,
          termsAndConditions: Array.isArray(data.termsAndConditions)
            ? data.termsAndConditions.join('\n')
            : (data.termsAndConditions || DEFAULT_TERMS.join('\n')),
        };
        const invoiceSettings = data.invoiceSettings || {
          prefix: 'INV',
          resetCycle: 'yearly',
          padding: 6,
        };

        set({ shopInfo, invoiceSettings });
        localStorage.setItem('darji_shop_settings', JSON.stringify({ shopInfo, invoiceSettings }));
      }
    } catch (err) {
      console.warn('[Settings Store] Fetch fallback:', err.message);
    }
  },

  saveSettingsToDB: async () => {
    const { shopInfo, invoiceSettings } = get();
    set({ isSyncing: true });
    try {
      const termsArray = typeof shopInfo.termsAndConditions === 'string'
        ? shopInfo.termsAndConditions.split('\n').filter(t => t.trim())
        : shopInfo.termsAndConditions;

      const phoneNumbers = Array.isArray(shopInfo.phoneNumbers) && shopInfo.phoneNumbers.length > 0
        ? shopInfo.phoneNumbers.filter(Boolean)
        : (shopInfo.phone ? shopInfo.phone.split(',').map(p => p.trim()).filter(Boolean) : []);

      const rawReview = (shopInfo.reviewLink || '').trim();
      const reviewLink = rawReview ? (/^https?:\/\//i.test(rawReview) ? rawReview : `https://${rawReview}`) : '';

      const payload = {
        name: shopInfo.name,
        phone: phoneNumbers.join(', ') || shopInfo.phone,
        phoneNumbers,
        email: shopInfo.email,
        gstNumber: shopInfo.gstNumber,
        address: shopInfo.address,
        currency: shopInfo.currency,
        logoUrl: shopInfo.logoUrl,
        signatureUrl: shopInfo.signatureUrl,
        reviewLink,
        reviewQrUrl: shopInfo.reviewQrUrl,
        termsAndConditions: termsArray,
        invoiceSettings,
      };

      const res = await api.updateShopSettings(payload);
      if (res && res.success) {
        localStorage.setItem('darji_shop_settings', JSON.stringify({ shopInfo, invoiceSettings }));
        return { success: true, data: res.data };
      }
      return { success: false, error: res?.message || 'Failed to update settings' };
    } catch (err) {
      console.warn('[Settings Store] Save fallback:', err.message);
      return { success: false, error: err.message || 'Server connection error' };
    } finally {
      set({ isSyncing: false });
    }
  },

  updateShopInfo: (updates) => {
    set((state) => {
      const newShopInfo = { ...state.shopInfo, ...updates };
      const newState = { shopInfo: newShopInfo };
      localStorage.setItem('darji_shop_settings', JSON.stringify({ shopInfo: newShopInfo, invoiceSettings: state.invoiceSettings }));
      return newState;
    });
  },

  updateLogo: (logoUrl) => {
    set((state) => {
      const newShopInfo = { ...state.shopInfo, logoUrl };
      localStorage.setItem('darji_shop_settings', JSON.stringify({ shopInfo: newShopInfo, invoiceSettings: state.invoiceSettings }));
      return { shopInfo: newShopInfo };
    });
    get().saveSettingsToDB();
  },

  updateSignature: (signatureUrl) => {
    set((state) => {
      const newShopInfo = { ...state.shopInfo, signatureUrl };
      localStorage.setItem('darji_shop_settings', JSON.stringify({ shopInfo: newShopInfo, invoiceSettings: state.invoiceSettings }));
      return { shopInfo: newShopInfo };
    });
    get().saveSettingsToDB();
  },

  updateReviewQr: (reviewQrUrl) => {
    set((state) => {
      const newShopInfo = { ...state.shopInfo, reviewQrUrl };
      localStorage.setItem('darji_shop_settings', JSON.stringify({ shopInfo: newShopInfo, invoiceSettings: state.invoiceSettings }));
      return { shopInfo: newShopInfo };
    });
    get().saveSettingsToDB();
  },

  updateTerms: (termsAndConditions) => {
    set((state) => {
      const newShopInfo = { ...state.shopInfo, termsAndConditions };
      localStorage.setItem('darji_shop_settings', JSON.stringify({ shopInfo: newShopInfo, invoiceSettings: state.invoiceSettings }));
      return { shopInfo: newShopInfo };
    });
  },

  updateInvoiceSettings: (updates) => {
    set((state) => {
      const newInvoiceSettings = { ...state.invoiceSettings, ...updates };
      localStorage.setItem('darji_shop_settings', JSON.stringify({ shopInfo: state.shopInfo, invoiceSettings: newInvoiceSettings }));
      return { invoiceSettings: newInvoiceSettings };
    });
  },
}));

export default useSettingsStore;
