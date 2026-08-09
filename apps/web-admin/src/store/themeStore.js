import { create } from 'zustand';

const useThemeStore = create((set, get) => ({
  theme: localStorage.getItem('darji_theme') || 'light',

  toggleTheme: () => {
    const newTheme = get().theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('darji_theme', newTheme);
    set({ theme: newTheme });
  },

  initTheme: () => {
    const saved = localStorage.getItem('darji_theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    set({ theme: saved });
  },
}));

export default useThemeStore;
