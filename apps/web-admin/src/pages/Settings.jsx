import { useState, useEffect } from 'react';
import {
  Store, FileText, Database, Shield, CheckCircle, Save, QrCode, MessageSquare, LogOut, Send, RefreshCw, Smartphone, Download, Image, Trash2, Upload, Plus, PhoneCall, SlidersHorizontal
} from 'lucide-react';
import PwaInstallPrompt from '../components/PwaInstallPrompt';
import useSettingsStore from '../store/settingsStore';
import useLanguageStore from '../store/languageStore';
import useAuthStore from '../store/authStore';
import { compressImage } from '../utils/imageCompressor';
import { apiClient } from '../services/apiClient';
import './Settings.css';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('shop');
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveErrorMsg, setSaveErrorMsg] = useState(null);
  const { t, language } = useLanguageStore();
  const { updatePassword } = useAuthStore();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState(null);
  const [passwordError, setPasswordError] = useState(null);

  // Live WhatsApp Test Message Sender State
  const [testMobile, setTestMobile] = useState('9009149694');
  const [testMsgText, setTestMsgText] = useState('Hello Shivansh! This is a live test message from Darji ERP.');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSendResult, setTestSendResult] = useState(null);

  // Clear App Data State
  const [isClearingData, setIsClearingData] = useState(false);
  const [clearSuccessMsg, setClearSuccessMsg] = useState(null);
  const [clearErrorMsg, setClearErrorMsg] = useState(null);



  const handleClearAppEntryData = async () => {
    const confirmMessage = language === 'hi'
      ? 'क्या आप निश्चित रूप से ऐप का सारा एंट्री डेटा (ग्राहकों, ऑर्डरों, बिलों, खर्चों और कैशबुक) मिटाना चाहते हैं?\n\nआपकी दुकान की प्रोफ़ाइल और लॉगिन सुरक्षित रहेंगे।'
      : 'Are you sure you want to clear all app entry data (customers, orders, invoices, expenses, cashbook)?\n\nYour shop profile and login credentials will be preserved.';

    if (!window.confirm(confirmMessage)) return;

    setIsClearingData(true);
    setClearSuccessMsg(null);
    setClearErrorMsg(null);

    try {
      await apiClient.clearEntryData();
      setClearSuccessMsg(
        language === 'hi'
          ? '✅ ऐप का सारा एंट्री डेटा सफलतापूर्वक साफ़ कर दिया गया है!'
          : '✅ All app entry data cleared successfully!'
      );
    } catch (err) {
      setClearErrorMsg(err.message || 'Failed to clear app entry data');
    } finally {
      setIsClearingData(false);
    }
  };

  const handleSendTestWhatsApp = async () => {
    if (!testMobile.trim() || !testMsgText.trim()) return;
    setIsSendingTest(true);
    setTestSendResult(null);
    try {
      const res = await apiClient.sendWhatsAppTest({
        mobile: testMobile.trim(),
        text: testMsgText.trim()
      });
      setTestSendResult({ success: true, messageId: res.messageId || 'WA_SENT' });
    } catch (err) {
      setTestSendResult({ success: false, error: err.message || 'Failed to send WhatsApp message' });
    } finally {
      setIsSendingTest(false);
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
      setPasswordMsg(language === 'hi' ? 'पासवर्ड सफलता से अपडेट हो गया है! अगली बार नए पासवर्ड से लॉगिन करें।' : 'Password updated successfully! Log in with your new password next time.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMsg(null), 4000);
    } else {
      setPasswordError(res.message);
    }
  };

  const {
    shopInfo,
    invoiceSettings,
    waConnected,
    waStatus,
    waSessionPhone,
    waQrToken,
    fetchWhatsAppStatus,
    disconnectWhatsApp,
    connectWhatsApp,
    generateNewQR,
    fetchSettingsFromDB,
    saveSettingsToDB,
    updateShopInfo,
    updateLogo,
    updateSignature,
    updateReviewQr,
    updateTerms,
    updateInvoiceSettings,
    toggleWaConnection,
  } = useSettingsStore();

  useEffect(() => {
    fetchSettingsFromDB();
    fetchWhatsAppStatus();
  }, []);

  // Poll WhatsApp status when on WhatsApp tab
  useEffect(() => {
    if (activeTab === 'whatsapp') {
      fetchWhatsAppStatus();
      const interval = setInterval(() => {
        fetchWhatsAppStatus();
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const [showQRModal, setShowQRModal] = useState(false);

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const compressedDataUrl = await compressImage(file, 250, 250, 0.75);
        updateLogo(compressedDataUrl);
      } catch (err) {
        console.error('Logo compression error:', err);
      }
    }
  };

  const handleSignatureUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const compressedDataUrl = await compressImage(file, 250, 150, 0.75);
        updateSignature(compressedDataUrl);
      } catch (err) {
        console.error('Signature compression error:', err);
      }
    }
  };

  const handleReviewQrUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      if (file.type && file.type.startsWith('image/')) {
        const compressedDataUrl = await compressImage(file, 300, 300, 0.85);
        updateReviewQr(compressedDataUrl);
      } else {
        const reader = new FileReader();
        reader.onload = (evt) => {
          if (evt.target?.result) {
            updateReviewQr(evt.target.result);
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error('Review QR compression error:', err);
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          updateReviewQr(evt.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const getPhoneList = () => {
    if (Array.isArray(shopInfo.phoneNumbers) && shopInfo.phoneNumbers.length > 0) {
      return shopInfo.phoneNumbers;
    }
    if (shopInfo.phone) {
      const parts = shopInfo.phone.split(',').map(s => s.trim()).filter(Boolean);
      if (parts.length > 0) return parts;
    }
    return ['+91 7828962210', '+91 7000621972'];
  };

  const handlePhoneItemChange = (index, value) => {
    const current = [...getPhoneList()];
    current[index] = value;
    const formattedStr = current.filter(Boolean).join(', ');
    updateShopInfo({ phoneNumbers: current, phone: formattedStr });
  };

  const handleAddPhoneField = () => {
    const current = [...getPhoneList(), ''];
    updateShopInfo({ phoneNumbers: current, phone: current.filter(Boolean).join(', ') });
  };

  const handleRemovePhoneField = (index) => {
    const current = getPhoneList().filter((_, i) => i !== index);
    const updated = current.length > 0 ? current : [''];
    updateShopInfo({ phoneNumbers: updated, phone: updated.filter(Boolean).join(', ') });
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveErrorMsg(null);
    setIsSaved(false);

    try {
      const res = await saveSettingsToDB();
      if (res && res.success) {
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 4000);
      } else {
        setSaveErrorMsg(res?.error || (language === 'hi' ? 'सेटिंग्स सुरक्षित करने में समस्या आई।' : 'Failed to save settings to server.'));
        setTimeout(() => setSaveErrorMsg(null), 5000);
      }
    } catch (err) {
      setSaveErrorMsg(err.message || 'Failed to save settings');
      setTimeout(() => setSaveErrorMsg(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="settings">
      <div className="settings__header">
        <div>
          <h2>{t('settingsHeading', 'ERP Settings & Configuration')}</h2>
          <p>{language === 'hi' ? 'दुकान का विवरण, बिल के लिए लोगो और हस्ताक्षर, नियम व शर्तें और व्हाट्सएप सेटिंग्स का प्रबंधन करें' : 'Manage shop details, upload logo & signature for bills, customize Terms & Conditions, and WhatsApp settings'}</p>
        </div>
      </div>

      <div className="settings__container">
        {/* Mobile Dropdown Selector (Visible on Phone Screens <= 768px) */}
        <div className="settings__mobile-dropdown-container">
          <label className="settings__mobile-dropdown-label">
            <SlidersHorizontal size={14} /> {language === 'hi' ? 'सेटिंग्स श्रेणी चुनें:' : 'Select Settings Category:'}
          </label>
          <select
            className="settings__mobile-select"
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
          >
            <option value="shop">🏬 {t('shopProfileTab', 'Shop Profile & Branding')}</option>
            <option value="invoice">📄 {t('invoiceGstTab', 'Invoice & GST Config')}</option>
            <option value="whatsapp">💬 {t('whatsappTab', 'WhatsApp Integration')}</option>
            <option value="security">🛡️ {language === 'hi' ? 'सुरक्षा व पासवर्ड' : 'Security & Password'}</option>
            <option value="pwa">📱 {language === 'hi' ? 'ऐप इंस्टॉल करें' : 'App Installation'}</option>
            <option value="reset">🗑️ {language === 'hi' ? 'डेटा साफ़ करें' : 'Clear App Data'}</option>
          </select>
        </div>

        {/* Sidebar Tabs (Visible on Desktop Screens > 768px) */}
        <div className="settings__tabs">
          <button className={`settings__tab ${activeTab === 'shop' ? 'active' : ''}`} onClick={() => setActiveTab('shop')}>
            <Store size={18} /> {t('shopProfileTab', 'Shop Profile & Branding')}
          </button>
          <button className={`settings__tab ${activeTab === 'invoice' ? 'active' : ''}`} onClick={() => setActiveTab('invoice')}>
            <FileText size={18} /> {t('invoiceGstTab', 'Invoice & GST Config')}
          </button>
          <button className={`settings__tab ${activeTab === 'whatsapp' ? 'active' : ''}`} onClick={() => setActiveTab('whatsapp')}>
            <MessageSquare size={18} /> {t('whatsappTab', 'WhatsApp Integration')}
          </button>
          <button className={`settings__tab ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}>
            <Shield size={18} /> {language === 'hi' ? 'सुरक्षा व पासवर्ड' : 'Security & Password'}
          </button>
          <button className={`settings__tab ${activeTab === 'pwa' ? 'active' : ''}`} onClick={() => setActiveTab('pwa')}>
            <Smartphone size={18} /> {language === 'hi' ? 'ऐप इंस्टॉल करें' : 'App Installation'}
          </button>
          <button className={`settings__tab ${activeTab === 'reset' ? 'active' : ''}`} onClick={() => setActiveTab('reset')} style={{ color: '#ef4444' }}>
            <Trash2 size={18} /> {language === 'hi' ? 'डेटा साफ़ करें' : 'Clear App Data'}
          </button>
        </div>

        {/* Tab Body */}
        <div className="settings__body">
          {activeTab === 'shop' && (
            <form onSubmit={handleSave} className="settings__card animate-fade-in">
              <h3>{t('shopProfileTab', 'Shop Profile & Branding')}</h3>
              <p className="settings__hint">{language === 'hi' ? 'बिल पर प्रिंट करने के लिए दुकान का लोगो, हस्ताक्षर, संपर्क नंबर, गूगल रिव्यू क्यूआर कोड व नियम सेट करें।' : 'Set your shop logo, signature, shop contact numbers, email, Google Review QR link, and Terms & Conditions for generated bills.'}</p>

              {/* Logo & Signature Upload Cards */}
              <div className="settings__branding-row">
                <div className="settings__upload-box">
                  <label className="settings__upload-label">{t('shopLogoLabel', 'SHOP LOGO (APPEARS ON TOP OF BILL)')}</label>
                  <div className="settings__preview-area">
                    {shopInfo.logoUrl ? (
                      <div className="settings__img-preview-container">
                        <img src={shopInfo.logoUrl} alt="Shop Logo" className="settings__img-preview" />
                        <button type="button" className="settings__remove-img-btn" onClick={() => updateLogo(null)}>
                          <Trash2 size={14} /> {t('removeLogo', 'Remove Logo')}
                        </button>
                      </div>
                    ) : (
                      <div className="settings__upload-placeholder">
                        <Image size={32} />
                        <span>{language === 'hi' ? 'कोई लोगो अपलोड नहीं है' : 'No logo uploaded'}</span>
                        <label className="modal__btn modal__btn--secondary upload-btn">
                          <Upload size={14} /> {language === 'hi' ? 'लोगो अपलोड करें' : 'Upload Logo'}
                          <input type="file" accept="image/*" onChange={handleLogoUpload} hidden />
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                <div className="settings__upload-box">
                  <label className="settings__upload-label">{t('signatureLabel', 'AUTHORIZED SIGNATURE (APPEARS AT BOTTOM OF BILL)')}</label>
                  <div className="settings__preview-area">
                    {shopInfo.signatureUrl ? (
                      <div className="settings__img-preview-container">
                        <img src={shopInfo.signatureUrl} alt="Signature" className="settings__img-preview settings__img-preview--sig" />
                        <button type="button" className="settings__remove-img-btn" onClick={() => updateSignature(null)}>
                          <Trash2 size={14} /> {t('removeSignature', 'Remove Signature')}
                        </button>
                      </div>
                    ) : (
                      <div className="settings__upload-placeholder">
                        <FileText size={32} />
                        <span>{language === 'hi' ? 'कोई हस्ताक्षर अपलोड नहीं है' : 'No signature uploaded'}</span>
                        <label className="modal__btn modal__btn--secondary upload-btn">
                          <Upload size={14} /> {language === 'hi' ? 'हस्ताक्षर अपलोड करें' : 'Upload Signature'}
                          <input type="file" accept="image/*" onChange={handleSignatureUpload} hidden />
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="settings__grid" style={{ marginTop: '1.5rem' }}>
                <div className="modal__field">
                  <label>{t('shopNameLabel', 'Shop Name *')}</label>
                  <input
                    type="text"
                    value={shopInfo.name || ''}
                    onChange={(e) => updateShopInfo({ name: e.target.value })}
                    required
                  />
                </div>
                <div className="modal__field">
                  <label>{t('emailLabel', 'Shop Email Address (Printed on Bill)')}</label>
                  <input
                    type="email"
                    placeholder="e.g. darji.tailoring@gmail.com"
                    value={shopInfo.email || ''}
                    onChange={(e) => updateShopInfo({ email: e.target.value })}
                  />
                </div>
              </div>

              {/* 📞 Multi-Phone Numbers for Bill Section */}
              <div style={{ background: 'var(--bg-active, #f8fafc)', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '16px 20px', margin: '16px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-navy-800, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <PhoneCall size={18} style={{ color: '#0284c7' }} /> Bill Contact Numbers (Add 2-3 Numbers to Print on Bill)
                  </h4>
                  <span style={{ fontSize: '12px', fontWeight: 600, background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '6px', border: '1px solid #bae6fd' }}>
                    Account Login Mobile: <strong>+91 90091 49694</strong>
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#475569', marginBottom: '14px' }}>
                  {language === 'hi'
                    ? 'अपनी दुकान के 2-3 मोबाइल/लैंडलाइन नंबर यहाँ अलग से जोड़ें जो बिल पर प्रिंट होंगे (लॉगिन नंबर से अलग)।'
                    : 'Add 2-3 separate contact numbers (e.g. Shop Mobile, Order Helpline, WhatsApp Support) to display on customer bills.'}
                </p>

                {getPhoneList().map((num, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <input
                      type="text"
                      placeholder={`Phone Number ${idx + 1} (e.g. +91 7828962210)`}
                      value={num}
                      onChange={(e) => handlePhoneItemChange(idx, e.target.value)}
                      style={{ flex: 1, padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                    />
                    {getPhoneList().length > 1 && (
                      <button
                        type="button"
                        style={{ padding: '8px 12px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}
                        onClick={() => handleRemovePhoneField(idx)}
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    )}
                  </div>
                ))}

                {getPhoneList().length < 5 && (
                  <button
                    type="button"
                    className="modal__btn modal__btn--secondary"
                    style={{ width: 'fit-content', marginTop: '4px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '8px 14px' }}
                    onClick={handleAddPhoneField}
                  >
                    <Plus size={15} /> + Add Another Phone Number
                  </button>
                )}
              </div>

              <div className="modal__field">
                <label>{t('addressLabel', 'Full Shop Address (Printed on Bill)')}</label>
                <textarea
                  value={shopInfo.address || ''}
                  onChange={(e) => updateShopInfo({ address: e.target.value })}
                  rows={2}
                  placeholder="Enter shop address..."
                />
              </div>

              {/* ⭐ Google Review Link & Review QR Code Section */}
              <div style={{ background: 'var(--bg-active, #f8fafc)', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '16px 20px', margin: '20px 0 10px 0' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-navy-800, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <QrCode size={18} style={{ color: '#d97706' }} /> ⭐ Google Review Link & Review QR Code (Printed on Bill)
                </h4>
                <p style={{ fontSize: '12px', color: '#475569', marginBottom: '14px' }}>
                  {language === 'hi'
                    ? 'अपनी दुकान के गूगल रिव्यू की लिंक और क्यूआर कोड यहाँ डालें। यह ग्राहकों को 5-स्टार रिव्यू देने के लिए बिल और व्हाट्सएप पर दिखेगा।'
                    : 'Add your Google Business review link and QR Code image. This will be printed on generated bills and sent via WhatsApp so customers can easily review your shop!'}
                </p>

                <div className="settings__grid">
                  <div className="modal__field">
                    <label>Google Business Review URL / Link</label>
                    <input
                      type="url"
                      placeholder="e.g. https://g.page/r/darji-tailors/review or https://maps.app.goo.gl/..."
                      value={shopInfo.reviewLink || ''}
                      onChange={(e) => updateShopInfo({ reviewLink: e.target.value })}
                    />
                    <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                      {shopInfo.reviewLink ? '✓ Automatic QR code will be generated for this link if no custom QR code image is uploaded.' : 'Enter URL to display clickable link on bill and auto-generate QR code.'}
                    </span>
                  </div>

                  <div className="modal__field">
                    <label>Upload Custom Review QR Code Image (Optional)</label>
                    {shopInfo.reviewQrUrl ? (
                      <div className="settings__img-preview-container" style={{ minHeight: '100px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <img src={shopInfo.reviewQrUrl} alt="Review QR" style={{ height: '80px', width: '80px', objectFit: 'contain', border: '1px solid #cbd5e1', borderRadius: '8px' }} />
                        <button type="button" className="settings__remove-img-btn" onClick={() => updateReviewQr(null)}>
                          <Trash2 size={14} /> Remove Review QR
                        </button>
                      </div>
                    ) : (
                      <label className="modal__btn modal__btn--secondary upload-btn" style={{ width: 'fit-content', cursor: 'pointer' }}>
                        <Upload size={14} /> Upload Review QR Code Image
                        <input type="file" accept="image/*,.pdf" onChange={handleReviewQrUpload} hidden />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal__field" style={{ marginTop: '1rem' }}>
                <label>{t('termsLabel', 'Custom Terms & Conditions (One rule per line)')}</label>
                <textarea
                  value={shopInfo.termsAndConditions}
                  onChange={(e) => updateTerms(e.target.value)}
                  rows={4}
                  placeholder={language === 'hi' ? 'ग्राहक के बिल पर प्रिंट होने वाले नियम व शर्तें दर्ज करें...' : 'Enter terms and conditions to print on every customer bill...'}
                />
              </div>

              <div className="settings__footer">
                {saveErrorMsg && <span className="settings__saved" style={{ background: '#fee2e2', color: '#dc2626', borderColor: '#fca5a5' }}>❌ {saveErrorMsg}</span>}
                {isSaved && <span className="settings__saved"><CheckCircle size={16} /> {language === 'hi' ? 'सेटिंग्स सफलतापूर्वक सुरक्षित हो गईं!' : 'Settings Saved Successfully!'}</span>}
                <button type="submit" className="modal__btn modal__btn--primary" disabled={isSaving}>
                  <Save size={16} /> {isSaving ? (language === 'hi' ? 'सेव हो रहा है...' : 'Saving...') : t('saveChangesBtn', 'Save Settings Changes')}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'invoice' && (
            <form onSubmit={handleSave} className="settings__card animate-fade-in">
              <h3>Invoice Generation Settings (Section 7.1)</h3>
              <p className="settings__hint">Sequential, non-reusable invoice number generator per Indian Tax law.</p>

              <div className="settings__grid">
                <div className="modal__field">
                  <label>Invoice Prefix</label>
                  <input
                    type="text"
                    value={invoiceSettings.prefix}
                    onChange={(e) => setInvoiceSettings({ ...invoiceSettings, prefix: e.target.value })}
                  />
                </div>

                <div className="modal__field">
                  <label>Reset Cycle (Financial Year Aligned)</label>
                  <select
                    value={invoiceSettings.resetCycle}
                    onChange={(e) => setInvoiceSettings({ ...invoiceSettings, resetCycle: e.target.value })}
                  >
                    <option value="yearly">Yearly (Resets on April 1st - India FY)</option>
                    <option value="monthly">Monthly (Resets 1st of every month)</option>
                  </select>
                </div>

                <div className="modal__field">
                  <label>Number Zero-Padding</label>
                  <input
                    type="number"
                    value={invoiceSettings.padding}
                    onChange={(e) => setInvoiceSettings({ ...invoiceSettings, padding: Number(e.target.value) })}
                    min="3"
                    max="8"
                  />
                </div>
              </div>

              <div className="settings__preview-box">
                <span>Live Generated Format Preview:</span>
                <strong>{invoiceSettings.prefix}-2026-{String(1).padStart(invoiceSettings.padding, '0')}</strong>
              </div>

              <div className="settings__footer">
                {saveErrorMsg && <span className="settings__saved" style={{ background: '#fee2e2', color: '#dc2626', borderColor: '#fca5a5' }}>❌ {saveErrorMsg}</span>}
                {isSaved && <span className="settings__saved"><CheckCircle size={16} /> {language === 'hi' ? 'सेटिंग्स सफलतापूर्वक सुरक्षित हो गईं!' : 'Settings Saved Successfully!'}</span>}
                <button type="submit" className="modal__btn modal__btn--primary" disabled={isSaving}>
                  <Save size={16} /> {isSaving ? (language === 'hi' ? 'सेव हो रहा है...' : 'Saving...') : 'Save Settings'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'whatsapp' && (
            <div className="settings__card animate-fade-in">
              <h3>{language === 'hi' ? 'व्हाट्सएप इंटीग्रेशन (Baileys Pure WebSocket Engine)' : 'WhatsApp Web Integration (Baileys Engine)'}</h3>
              <p className="settings__hint">
                {language === 'hi'
                  ? 'यह व्हाट्सएप सर्वर के साथ सीधे वेबसोकेट सॉकेट से जुड़ता है। नीचे दिए गए असली QR कोड को अपने फोन के WhatsApp (Linked Devices) से स्कैन करें।'
                  : 'Connects directly to WhatsApp servers over WebSockets (~35MB RAM). Scan the live QR code below using your phone (WhatsApp > Linked Devices > Link a Device).'}
              </p>

              {waConnected ? (
                <div className="settings__wa-connected-box">
                  <div className="settings__wa-status">
                    <div className="settings__wa-status-info">
                      <div className="settings__status-dot online" />
                      <div>
                        <h4>{language === 'hi' ? 'स्थिति: व्हाट्सएप जुड़ा हुआ है (सक्रिय)' : 'Status: Connected & Ready'}</h4>
                        <p>{language === 'hi' ? `सक्रिय व्हाट्सएप नंबर: ${waSessionPhone || 'व्हाट्सएप नंबर लिंक हो गया है'}` : `Active WhatsApp Number: ${waSessionPhone || 'WhatsApp Account Linked'}`}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="modal__btn modal__btn--secondary"
                      style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                      onClick={() => {
                        if (window.confirm(language === 'hi' ? 'क्या आप अपना व्हाट्सएप डिस्कनेक्ट करना चाहते हैं? नया QR जनरेट होगा।' : 'Are you sure you want to disconnect WhatsApp? A fresh QR code will be generated.')) {
                          disconnectWhatsApp();
                        }
                      }}
                    >
                      <LogOut size={16} /> {language === 'hi' ? 'व्हाट्सएप डिस्कनेक्ट करें' : 'Disconnect WhatsApp'}
                    </button>
                  </div>

                  <div className="settings__wa-rules" style={{ marginTop: '16px' }}>
                    <h4>{language === 'hi' ? 'सुरक्षा व स्वचालित सुविधाएँ:' : 'Active Features & Protections:'}</h4>
                    <ul>
                      <li>✅ {language === 'hi' ? 'ऑर्डर रेडी व्हाट्सएप अलर्ट्स स्वचालित रूप से भेजें' : 'Send automatic WhatsApp order ready notifications & bills'}</li>
                      <li>✅ {language === 'hi' ? 'आउटबाउंड कतार दर-सीमित (3 msg/sec with anti-ban delay)' : 'Outbound queue rate-limited to 3 msg/sec with anti-ban delay'}</li>
                      <li>✅ {language === 'hi' ? 'पपेटियर के बिना हल्का सॉकेट इंजन (~35MB RAM)' : 'Lightweight WebSocket engine (~35MB RAM, 0.1% CPU)'}</li>
                    </ul>
                  </div>

                  {/* Live WhatsApp Test Message Sender Box */}
                  <div className="settings__wa-test-box" style={{ marginTop: '20px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-navy-700)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Send size={16} /> {language === 'hi' ? 'व्हाट्सएप लाइव टेस्ट मैसेज भेजें:' : 'Send Live Test WhatsApp Message:'}
                    </h4>
                    <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '12px' }}>
                      Type your mobile number and test message below to verify live background WhatsApp delivery:
                    </p>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                      <input
                        type="text"
                        placeholder="Mobile Number (e.g. 9009149694)"
                        value={testMobile}
                        onChange={(e) => setTestMobile(e.target.value)}
                        style={{ width: '180px', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      />
                      <input
                        type="text"
                        placeholder="Type test message here..."
                        value={testMsgText}
                        onChange={(e) => setTestMsgText(e.target.value)}
                        style={{ flex: 1, minWidth: '220px', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      />
                      <button
                        type="button"
                        className="modal__btn modal__btn--primary"
                        style={{ padding: '8px 16px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        disabled={isSendingTest}
                        onClick={handleSendTestWhatsApp}
                      >
                        <Send size={14} /> {isSendingTest ? 'Sending...' : 'Send Test Message'}
                      </button>
                    </div>

                    {testSendResult && (
                      <div style={{ padding: '10px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, background: testSendResult.success ? '#dcfce7' : '#fee2e2', color: testSendResult.success ? '#166534' : '#991b1b', border: `1px solid ${testSendResult.success ? '#86efac' : '#fca5a5'}` }}>
                        {testSendResult.success ? `✅ Message sent successfully! ID: ${testSendResult.messageId || 'WA_SENT'}` : `❌ Failed: ${testSendResult.error}`}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="settings__wa-disconnected-box">
                  <div className="settings__wa-status">
                    <div className="settings__wa-status-info">
                      <div className="settings__status-dot offline" />
                      <div>
                        <h4>{language === 'hi' ? `स्थिति: ${waStatus === 'authenticating' ? 'क्यूआर कोड तैयार है (स्कैन की प्रतीक्षा)' : 'डिस्कनेक्टेड'}` : `Status: ${waStatus === 'authenticating' ? 'QR Code Ready (Waiting for Scan...)' : 'Disconnected'}`}</h4>
                        <p>{language === 'hi' ? 'अपने फोन से नीचे दिए गए व्हाट्सएप क्यूआर कोड को स्कैन करें' : 'Open WhatsApp on your phone > Linked Devices > Point camera at screen to pair'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="settings__qr-container" style={{ textAlign: 'center', margin: '20px 0', padding: '24px', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border-default)' }}>
                    <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-gold-500)', marginBottom: '16px' }}>
                      {language === 'hi' ? '📱 फोन में WhatsApp खोलें > तीन डॉट / सेटिंग्स > Linked Devices > Link a Device > स्कैन करें' : '📱 Open WhatsApp on Phone > Menu / Settings > Linked Devices > Link a Device > Scan QR Code'}
                    </p>
                    <div style={{ background: 'white', padding: '16px', display: 'inline-block', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
                      {waQrToken && waQrToken.startsWith('data:image') ? (
                        <img src={waQrToken} alt="WhatsApp Web Pairing QR Code" style={{ width: '220px', height: '220px', objectFit: 'contain', display: 'block' }} />
                      ) : (
                        <div style={{ width: '220px', height: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#0f172a', gap: '8px' }}>
                          <RefreshCw size={32} className="animate-spin" color="#c9a24b" />
                          <span style={{ fontSize: '12px', fontWeight: '600' }}>
                            {language === 'hi' ? 'क्यूआर जनरेट हो रहा है...' : 'Generating Live WhatsApp QR...'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="modal__btn modal__btn--secondary"
                        onClick={generateNewQR}
                      >
                        <RefreshCw size={14} /> {language === 'hi' ? 'क्यूआर कोड रिफ्रेश करें' : 'Refresh QR Code'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}



          {activeTab === 'security' && (
            <form onSubmit={handlePasswordUpdate} className="settings__card animate-fade-in">
              <h3>{language === 'hi' ? 'खाता सुरक्षा एवं पासवर्ड अपडेट' : 'Account Security & Password Update'}</h3>
              <p className="settings__hint">
                {language === 'hi'
                  ? 'अपना पासवर्ड यहां से बदलें। अगली बार नए पासवर्ड का उपयोग करके लॉगिन करें।'
                  : 'Change your account password directly here. Use your new password to sign in next time.'}
              </p>

              {passwordMsg && (
                <div className="settings__saved" style={{ marginBottom: '1rem' }}>
                  <CheckCircle size={16} /> {passwordMsg}
                </div>
              )}

              {passwordError && (
                <div style={{ color: 'var(--color-danger-500)', fontSize: '13px', marginBottom: '1rem', background: 'rgba(239,68,68,0.1)', padding: '8px 12px', borderRadius: '6px' }}>
                  ⚠️ {passwordError}
                </div>
              )}

              <div className="settings__grid" style={{ maxWidth: '500px' }}>
                <div className="modal__field">
                  <label>{language === 'hi' ? 'वर्तमान पासवर्ड *' : 'Current Password *'}</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>

                <div className="modal__field">
                  <label>{language === 'hi' ? 'नया पासवर्ड *' : 'New Password *'}</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>

                <div className="modal__field">
                  <label>{language === 'hi' ? 'नया पासवर्ड दोबारा दर्ज करें *' : 'Confirm New Password *'}</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="settings__footer" style={{ marginTop: '1.5rem' }}>
                <button type="submit" className="modal__btn modal__btn--primary">
                  <Save size={16} /> {language === 'hi' ? 'पासवर्ड अपडेट करें' : 'Update Password'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'pwa' && (
            <div className="settings__card animate-fade-in">
              <h3>{language === 'hi' ? 'दरजी ऐप इंस्टॉल करें (Desktop & Mobile Application)' : 'Install Darji Management App (PWA)'}</h3>
              <p className="settings__hint">
                {language === 'hi'
                  ? 'अपने मोबाइल या कंप्यूटर की होम स्क्रीन पर दरजी ऐप का 1-टैप फास्ट शॉर्टकट इंस्टॉल करें।'
                  : 'Add a 1-tap shortcut app to your phone home screen or desktop PC for fast access.'}
              </p>

              <div style={{ marginTop: '20px', padding: '24px', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border-default)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
                  <img src="/icon-192.png" alt="Darji App Icon" style={{ width: '60px', height: '60px', borderRadius: '14px', border: '2px solid var(--color-gold-500)' }} />
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--color-navy-700)' }}>Darji ERP Tailoring Management App</h4>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {language === 'hi' ? 'ऑफ़लाइन सिंक, त्वरित बिलिंग और 1-क्लिक एक्सेस के साथ' : 'Standalone Progressive Web App with 1-tap fast launch'}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="modal__btn modal__btn--primary"
                    style={{ padding: '12px 24px', fontSize: '14px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                    onClick={async () => {
                      if (window.deferredPwaPrompt) {
                        try {
                          window.deferredPwaPrompt.prompt();
                          const { outcome } = await window.deferredPwaPrompt.userChoice;
                          if (outcome === 'accepted') {
                            alert(language === 'hi' ? '✅ दरजी ऐप सफलतापूर्वक इंस्टॉल हो गया!' : '✅ Darji App installed successfully!');
                          }
                          window.deferredPwaPrompt = null;
                        } catch (e) {
                          console.warn('Install prompt error:', e);
                        }
                      } else {
                        alert(
                          language === 'hi'
                            ? '📱 ऐप इंस्टॉल करने के लिए:\n1. क्रोम/एज ब्राउज़र के ऊपर 3 डॉट्स (Menu) पर क्लिक करें।\n2. "Install Darji App" या "Add to Home Screen" चुनें।'
                            : '📱 To install on Desktop PC or Mobile Phone:\n1. Open the 3 dots menu in Chrome / Edge top-right corner.\n2. Click "Install Darji Management App" or "Add to Home screen".'
                        );
                      }
                    }}
                  >
                    <Download size={18} /> {language === 'hi' ? 'दरजी ऐप इंस्टॉल करें' : 'Install Darji App'}
                  </button>
                </div>

                <div style={{ background: 'rgba(201,162,75,0.08)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(201,162,75,0.2)' }}>
                  <h5 style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--color-gold-500)', fontWeight: 700 }}>
                    💡 {language === 'hi' ? 'इन्स्टॉलेशन निर्देश:' : 'Installation Quick Guide:'}
                  </h5>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    <li><strong>Android / Phone:</strong> {language === 'hi' ? 'ब्राउज़र मेनू (3 डॉट्स) > "Add to Home Screen" पर टैप करें।' : 'Open browser menu (3 dots) > Tap "Add to Home screen".'}</li>
                    <li><strong>Windows / Mac PC:</strong> {language === 'hi' ? 'Chrome/Edge एड्रेस बार में ⊕ (Install) बटन दबाएं।' : 'Click the ⊕ (Install) icon in your Chrome/Edge address bar.'}</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reset' && (
            <div className="settings__card animate-fade-in" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <Trash2 size={24} color="#ef4444" />
                <h3 style={{ margin: 0, color: '#ef4444' }}>
                  {language === 'hi' ? 'ऐप का सारा एंट्री डेटा साफ़ करें (Danger Zone)' : 'Clear App Entry Data (Danger Zone)'}
                </h3>
              </div>
              <p className="settings__hint" style={{ fontSize: '14px', lineHeight: '1.6' }}>
                {language === 'hi'
                  ? 'यह कार्रवाई आपकी दुकान के सभी एंट्री डेटा जैसे: ग्राहक विवरण, सिलाई नाप, ऑर्डर, बिल, भुगतान, खर्चे और कैशबुक की प्रविष्टियाँ साफ़ कर देगी। आपकी दुकान की प्रोफ़ाइल और लॉगिन आईडी/पासवर्ड सुरक्षित रहेंगे।'
                  : 'This action will delete all transactional entry data (customers, measurement history, orders, invoices, payments, expense records, cashbook entries, and logs). Your shop profile and admin login credentials will remain intact.'}
              </p>

              {clearSuccessMsg && (
                <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', marginBottom: '16px', fontWeight: 600 }}>
                  {clearSuccessMsg}
                </div>
              )}

              {clearErrorMsg && (
                <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', marginBottom: '16px', fontWeight: 600 }}>
                  ❌ {clearErrorMsg}
                </div>
              )}

              <div style={{ background: 'rgba(239,68,68,0.05)', padding: '20px', borderRadius: '10px', border: '1px border-dashed rgba(239,68,68,0.3)', marginTop: '20px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#ef4444' }}>
                  ⚠️ {language === 'hi' ? 'सावधानी:' : 'Warning:'}
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  <li>{language === 'hi' ? 'सभी ग्राहक और सिलाई नाप स्थायी रूप से मिटा दिए जाएंगे।' : 'All registered customers & saved measurement cards will be permanently removed.'}</li>
                  <li>{language === 'hi' ? 'सभी पेंडिंग एवं डिलीवर हुए ऑर्डर और जीएसटी बिल मिट जाएंगे।' : 'All pending & delivered orders, payment records, and invoices will be wiped.'}</li>
                  <li>{language === 'hi' ? 'दुकान की प्रोफ़ाइल, लोगो, नियम और आपका लॉगिन सुरक्षित रहेगा।' : 'Shop profile, logo, signature, settings & your admin login credentials will stay intact.'}</li>
                </ul>

                <div style={{ marginTop: '24px' }}>
                  <button
                    type="button"
                    className="modal__btn"
                    disabled={isClearingData}
                    onClick={handleClearAppEntryData}
                    style={{
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      padding: '12px 24px',
                      fontWeight: 700,
                      borderRadius: '8px',
                      cursor: isClearingData ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                    }}
                  >
                    <Trash2 size={18} />
                    {isClearingData
                      ? (language === 'hi' ? 'डेटा साफ़ किया जा रहा है...' : 'Clearing Entry Data...')
                      : (language === 'hi' ? 'सारा एंट्री डेटा साफ़ करें' : 'Clear All App Entry Data')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* WhatsApp QR Modal */}
      {showQRModal && (
        <div className="modal-overlay" onClick={() => setShowQRModal(false)}>
          <div className="modal animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>Pair Shop WhatsApp</h2>
              <button className="modal__close" onClick={() => setShowQRModal(false)}>✕</button>
            </div>
            <div className="modal__body" style={{ textAlign: 'center' }}>
              <p>Open WhatsApp on your shop phone &gt; Linked Devices &gt; Scan QR code:</p>
              <div style={{ margin: '24px auto', padding: '16px', background: 'white', display: 'inline-block', borderRadius: '12px' }}>
                <QrCode size={180} color="#0B1F3A" />
              </div>
              <p className="settings__hint">Using open-wa / Baileys WebSocket protocol for low-RAM background execution.</p>
              <div className="modal__actions">
                <button className="modal__btn modal__btn--primary" onClick={() => { setWaConnected(true); setShowQRModal(false); }}>
                  Simulate QR Scanned & Pair
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
