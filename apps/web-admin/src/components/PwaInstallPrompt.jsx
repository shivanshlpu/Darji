import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import useLanguageStore from '../store/languageStore';
import './PwaInstallPrompt.css';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const { language } = useLanguageStore();

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsVisible(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User installed Darji Management App');
    }
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="pwa-install-banner animate-fade-in-down">
      <div className="pwa-install-banner__content">
        <img src="/icon-192.png" alt="Darji App" className="pwa-install-banner__icon" />
        <div className="pwa-install-banner__info">
          <h4>{language === 'hi' ? 'दरजी ऐप इंस्टॉल करें' : 'Install Darji Management App'}</h4>
          <p>{language === 'hi' ? 'अपने फोन की होम स्क्रीन पर जोड़ें' : 'Add to phone home screen for 1-tap fast access'}</p>
        </div>
      </div>
      <div className="pwa-install-banner__actions">
        <button type="button" className="pwa-install-banner__btn" onClick={handleInstallClick}>
          <Download size={14} /> {language === 'hi' ? 'इन्स्टॉल करें' : 'Install'}
        </button>
        <button type="button" className="pwa-install-banner__close" onClick={() => setIsVisible(false)}>
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
