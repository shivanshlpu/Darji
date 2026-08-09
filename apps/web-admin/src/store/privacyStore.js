import { create } from 'zustand';

const getInitialPrivacyState = () => {
  try {
    const saved = localStorage.getItem('darji_hide_financials');
    return saved !== null ? JSON.parse(saved) : false;
  } catch (e) {
    return false;
  }
};

const usePrivacyStore = create((set, get) => ({
  isAmountHidden: getInitialPrivacyState(),

  toggleAmountHidden: () => {
    set((state) => {
      const nextState = !state.isAmountHidden;
      try {
        localStorage.setItem('darji_hide_financials', JSON.stringify(nextState));
      } catch (e) {}
      return { isAmountHidden: nextState };
    });
  },

  formatAmount: (amount) => {
    const { isAmountHidden } = get();
    if (isAmountHidden) {
      return '₹ ••••••';
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  },
}));

export default usePrivacyStore;
