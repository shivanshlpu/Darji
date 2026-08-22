import { useState, useRef, useEffect } from 'react';
import {
  User, Phone, Mail, Store, Shield, Camera, Upload, Trash2,
  Save, CheckCircle, X, Key, LogOut
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import useLanguageStore from '../store/languageStore';
import './ProfileModal.css';

export default function ProfileModal({ isOpen, onClose }) {
  const { user, updateProfile, updatePassword, logout } = useAuthStore();
  const { language } = useLanguageStore();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [shopName, setShopName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Password section state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState(null);
  const [passwordError, setPasswordError] = useState(null);

  const fileInputRef = useRef(null);

  // Sync state when modal opens or user changes
  useEffect(() => {
    if (isOpen && user) {
      setName(user.name || 'Arunav Darji');
      setPhone(user.phone || '9479487828');
      setEmail(user.email || 'darjithetailoringshop@gmail.com');
      setShopName(user.shopName || 'Darji Premium Tailors');
      setAvatarUrl(user.avatarUrl || '');
      setSuccessMsg(null);
      setErrorMsg(null);
      setPasswordMsg(null);
      setPasswordError(null);
      setShowPasswordSection(false);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  // Handle avatar image selection & compression
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPG, PNG, WebP)!');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setAvatarUrl(compressedDataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Full Name cannot be empty!');
      return;
    }

    if (!phone.trim()) {
      setErrorMsg('Phone Number cannot be empty!');
      return;
    }

    setIsSaving(true);

    try {
      const updatedUser = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        shopName: shopName.trim(),
        avatarUrl: avatarUrl || '',
      };

      updateProfile(updatedUser);
      setSuccessMsg(language === 'hi' ? '✨ प्रोफ़ाइल सफलतापूर्वक अपडेट हो गई!' : '✨ Profile updated successfully!');
      setTimeout(() => {
        setSuccessMsg(null);
      }, 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setPasswordMsg(null);
    setPasswordError(null);

    if (newPassword.length < 4) {
      setPasswordError(language === 'hi' ? 'नया पासवर्ड कम से कम 4 अक्षरों का होना चाहिए!' : 'New password must be at least 4 characters long!');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(language === 'hi' ? 'नया पासवर्ड और पुष्टि पासवर्ड मेल नहीं खाते!' : 'New password and confirm password do not match!');
      return;
    }

    const res = await updatePassword(currentPassword, newPassword);
    if (res.success) {
      setPasswordMsg(language === 'hi' ? 'पासवर्ड सफलता से अपडेट हो गया है!' : 'Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMsg(null), 3000);
    } else {
      setPasswordError(res.message || 'Failed to update password');
    }
  };

  const initial = name?.trim()?.charAt(0)?.toUpperCase() || 'A';

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal animate-scale-in" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="profile-modal__header">
          <div className="profile-modal__header-title">
            <User size={20} className="profile-modal__gold-icon" />
            <h3>{language === 'hi' ? 'प्रोफ़ाइल और खाता विवरण' : 'User Profile & Account'}</h3>
          </div>
          <button className="profile-modal__close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="profile-modal__body">
          {/* Avatar Hero Card */}
          <div className="profile-avatar-card">
            <div className="profile-avatar-container">
              {avatarUrl ? (
                <img src={avatarUrl} alt={name} className="profile-avatar-img" />
              ) : (
                <div className="profile-avatar-placeholder">
                  {initial}
                </div>
              )}

              <button
                type="button"
                className="profile-avatar-camera-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Upload Profile Photo"
              >
                <Camera size={16} />
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/*"
              style={{ display: 'none' }}
            />

            <div className="profile-avatar-info">
              <h4>{name || 'Arunav Darji'}</h4>
              <p className="profile-avatar-role">
                <Shield size={13} /> {user?.role === 'staff' ? 'Staff Member' : 'Shop Owner & Administrator'}
              </p>
              <div className="profile-avatar-btn-row">
                <button
                  type="button"
                  className="profile-btn-sm profile-btn-upload"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={13} /> {avatarUrl ? 'Change Photo' : 'Upload Photo'}
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    className="profile-btn-sm profile-btn-remove"
                    onClick={handleRemoveAvatar}
                  >
                    <Trash2 size={13} /> Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Success / Error Messages */}
          {successMsg && (
            <div className="profile-alert profile-alert--success">
              <CheckCircle size={16} /> {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="profile-alert profile-alert--error">
              <X size={16} /> {errorMsg}
            </div>
          )}

          {/* Profile Form */}
          <form onSubmit={handleSaveProfile} className="profile-form">
            <div className="profile-form-grid">
              <div className="profile-field">
                <label>
                  <User size={14} /> Full Name (आपका नाम) *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Arunav Darji"
                  required
                />
              </div>

              <div className="profile-field">
                <label>
                  <Phone size={14} /> Mobile Number (फ़ोन नंबर) *
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9479487828"
                  required
                />
              </div>

              <div className="profile-field">
                <label>
                  <Mail size={14} /> Email Address (ईमेल)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. darjithetailoringshop@gmail.com"
                />
              </div>

              <div className="profile-field">
                <label>
                  <Store size={14} /> Shop / Business Name (दुकान का नाम)
                </label>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="e.g. Darji Premium Tailors"
                />
              </div>
            </div>

            <div className="profile-actions">
              <button
                type="button"
                className="profile-btn profile-btn--secondary"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="profile-btn profile-btn--primary"
                disabled={isSaving}
              >
                <Save size={15} /> {isSaving ? 'Saving Changes...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>

          {/* Collapsible Change Password Section */}
          <div className="profile-security-box">
            <button
              type="button"
              className="profile-security-toggle"
              onClick={() => setShowPasswordSection(!showPasswordSection)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={16} color="#D97706" />
                <span>Change Password (पासवर्ड बदलें)</span>
              </div>
              <span className="profile-security-arrow">{showPasswordSection ? '▲' : '▼'}</span>
            </button>

            {showPasswordSection && (
              <form onSubmit={handlePasswordUpdate} className="profile-password-form animate-fade-in-down">
                {passwordMsg && (
                  <div className="profile-alert profile-alert--success">
                    <CheckCircle size={15} /> {passwordMsg}
                  </div>
                )}
                {passwordError && (
                  <div className="profile-alert profile-alert--error">
                    <X size={15} /> {passwordError}
                  </div>
                )}

                <div className="profile-field">
                  <label>Current Password (वर्तमान पासवर्ड)</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                </div>

                <div className="profile-field-row">
                  <div className="profile-field">
                    <label>New Password (नया पासवर्ड)</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 4 characters"
                      required
                    />
                  </div>
                  <div className="profile-field">
                    <label>Confirm Password (पुष्टि करें)</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="profile-btn profile-btn--gold" style={{ marginTop: '8px' }}>
                  <Key size={14} /> Update Password
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
