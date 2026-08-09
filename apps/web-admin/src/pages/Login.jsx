import { useState } from 'react';
import { Scissors, Eye, EyeOff, Phone, Lock, ArrowRight } from 'lucide-react';
import useAuthStore from '../store/authStore';
import './Login.css';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading, error } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login(phone, password);
  };

  return (
    <div className="login">
      {/* Decorative background */}
      <div className="login__bg">
        <div className="login__bg-pattern" />
        <div className="login__bg-gradient" />
      </div>

      <div className="login__container">
        {/* Left - Branding */}
        <div className="login__branding">
          <div className="login__brand-content">
            <div className="login__logo-wrapper">
              <div className="login__logo">
                <Scissors size={36} strokeWidth={2} />
              </div>
              <div className="login__logo-glow" />
            </div>
            <h1 className="login__brand-title">DARJI</h1>
            <p className="login__brand-subtitle">Smart Tailor Business Management</p>
            <div className="login__brand-features">
              <div className="login__feature">
                <span className="login__feature-icon">📊</span>
                <span>Complete business analytics</span>
              </div>
              <div className="login__feature">
                <span className="login__feature-icon">📱</span>
                <span>Works offline, syncs online</span>
              </div>
              <div className="login__feature">
                <span className="login__feature-icon">🧵</span>
                <span>Measurement versioning</span>
              </div>
              <div className="login__feature">
                <span className="login__feature-icon">📋</span>
                <span>Digital invoicing & billing</span>
              </div>
            </div>
          </div>
          <p className="login__copyright">© 2026 DARJI · Premium Tailor ERP</p>
        </div>

        {/* Right - Login Form */}
        <div className="login__form-section">
          <div className="login__form-card animate-scale-in">
            <div className="login__form-header">
              <h2>Welcome Back</h2>
              <p>Sign in to your DARJI account</p>
            </div>

            <form onSubmit={handleSubmit} className="login__form">
              <div className="login__field">
                <label className="login__label">Phone Number</label>
                <div className="login__input-wrapper">
                  <Phone size={18} className="login__input-icon" />
                  <input
                    id="login-phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="login__input"
                    required
                  />
                </div>
              </div>

              <div className="login__field">
                <label className="login__label">Password</label>
                <div className="login__input-wrapper">
                  <Lock size={18} className="login__input-icon" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="login__input"
                    required
                  />
                  <button
                    type="button"
                    className="login__input-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="login__error animate-fade-in">
                  <span>⚠️</span> {error}
                </div>
              )}

              <button
                type="submit"
                className="login__submit"
                disabled={isLoading || !phone || !password}
              >
                {isLoading ? (
                  <span className="login__spinner" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
