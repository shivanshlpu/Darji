import { create } from 'zustand';
import { api } from '../services/apiClient';

const storedUser = (() => {
  try {
    const item = localStorage.getItem('darji_user');
    if (!item) return null;
    const parsed = JSON.parse(item);
    const digits = String(parsed?.phone || '').replace(/\D/g, '').slice(-10);
    // Strictly ensure only the single authorized owner ID is stored
    if (digits !== '9479487828') {
      localStorage.removeItem('darji_user');
      localStorage.removeItem('darji_token');
      return null;
    }
    return parsed;
  } catch (e) {
    return null;
  }
})();

// One-Way SHA-256 Cryptographic Hash Helper (Irreversible, safe for public git)
async function hashSHA256(str) {
  try {
    const msgBuffer = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    return '';
  }
}

// Pre-computed irreversible SHA-256 hashes for authorized owner
const OWNER_PHONE_SHA256 = '8dfa48b9f613429714e27baf7bd3b5343b1a35e787510c548be1d95930a50640';
const OWNER_PASS_SHA256 = 'ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f';

const useAuthStore = create((set) => ({
  user: storedUser ? { ...storedUser, role: 'owner', permissions: ['all'] } : null,
  isAuthenticated: !!storedUser,
  isLoading: false,
  error: null,

  login: async (phone, password) => {
    set({ isLoading: true, error: null });

    const cleanDigits = String(phone || '').replace(/\D/g, '').slice(-10);
    const targetAdminPhone = '9479487828';

    // Strict check: Only 9479487828 is permitted. Deny anyone else immediately with zero hints.
    if (cleanDigits !== targetAdminPhone) {
      set({ isLoading: false, error: 'Invalid phone number or password' });
      return false;
    }

    try {
      const res = await api.login(phone, password);
      if (res && res.success) {
        localStorage.setItem('darji_token', res.token);
        localStorage.setItem('darji_user', JSON.stringify(res.user));
        set({ user: res.user, isAuthenticated: true, isLoading: false, error: null });
        return true;
      }
    } catch (err) {
      console.warn('Backend login unavailable or rejected:', err.message);
    }

    // Strict SHA-256 verification (no plaintext passwords anywhere in code)
    const customPassHash = localStorage.getItem('darji_custom_password_sha256');
    const envPassHash = import.meta.env.VITE_ADMIN_PASS_SHA256 || OWNER_PASS_SHA256;

    const typedPhoneHash = await hashSHA256(cleanDigits);
    const typedPassHash = await hashSHA256(password);

    const isPassHashMatch = (customPassHash && typedPassHash === customPassHash) || (typedPassHash === envPassHash) || (typedPassHash === OWNER_PASS_SHA256);
    const isPhoneHashMatch = typedPhoneHash === OWNER_PHONE_SHA256;

    if (isPhoneHashMatch && isPassHashMatch) {
      const user = {
        _id: '6a738b5276dab967966f9043',
        name: 'Shivansh Darji',
        phone: '9479487828',
        email: 'darjithetailoringshop@gmail.com',
        role: 'owner',
        permissions: ['all'],
        shopId: '6a738b5176dab967966f9041',
        shopName: 'Darji Premium Tailors',
      };
      set({ user, isAuthenticated: true, isLoading: false, error: null });
      localStorage.setItem('darji_user', JSON.stringify(user));
      return true;
    }

    // Deny access completely
    set({ isLoading: false, error: 'Invalid phone number or password' });
    return false;
  },

  updateProfile: (updatedFields) => {
    set((state) => {
      const updatedUser = {
        ...(state.user || {}),
        ...updatedFields,
      };
      try {
        localStorage.setItem('darji_user', JSON.stringify(updatedUser));
      } catch (e) {
        console.warn('Failed to persist user profile:', e);
      }
      return { user: updatedUser };
    });
    return { success: true };
  },

  updatePassword: async (currentPassword, newPassword) => {
    set({ isLoading: true, error: null });
    try {
      let res = null;
      if (api.updatePassword) {
        try {
          res = await api.updatePassword(currentPassword, newPassword);
        } catch (e) {
          console.warn('API updatePassword fallback:', e.message);
          // If offline, verify current password with SHA-256
          const currentTypedHash = await hashSHA256(currentPassword);
          const customPassHash = localStorage.getItem('darji_custom_password_sha256');
          const isCurrentMatch = (customPassHash && currentTypedHash === customPassHash) || (currentTypedHash === OWNER_PASS_SHA256);
          if (!isCurrentMatch) {
            set({ isLoading: false, error: 'Current password is incorrect' });
            return { success: false, message: 'Current password is incorrect' };
          }
        }
      }
      // Save new password's SHA-256 hash (never plain text!)
      const newPassHash = await hashSHA256(newPassword);
      localStorage.setItem('darji_custom_password_sha256', newPassHash);
      set({ isLoading: false });
      return { success: true, message: res?.message || 'Password updated successfully!' };
    } catch (err) {
      set({ isLoading: false, error: err.message || 'Failed to update password' });
      return { success: false, message: err.message || 'Failed to update password' };
    }
  },

  logout: () => {
    localStorage.removeItem('darji_user');
    localStorage.removeItem('darji_token');
    set({ user: null, isAuthenticated: false });
  },

  restoreSession: () => {
    const stored = localStorage.getItem('darji_user');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        const digits = String(user?.phone || '').replace(/\D/g, '').slice(-10);
        if (digits !== '9479487828') {
          localStorage.removeItem('darji_user');
          localStorage.removeItem('darji_token');
          set({ user: null, isAuthenticated: false });
          return;
        }
        set({ user: { ...user, role: 'owner', permissions: ['all'] }, isAuthenticated: true });
      } catch {
        localStorage.removeItem('darji_user');
        localStorage.removeItem('darji_token');
        set({ user: null, isAuthenticated: false });
      }
    }
  },

  hasPermission: () => true,
}));

export default useAuthStore;
