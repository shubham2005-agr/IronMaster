import React, { useState } from 'react';
import { 
  LockKeyhole, 
  Mail, 
  User, 
  Sparkles, 
  Key, 
  CheckCircle, 
  AlertCircle, 
  ArrowRight, 
  ShieldAlert, 
  ArrowLeft,
  ShieldCheck
} from 'lucide-react';
import { loginUser, registerUser } from '../api';
import { Logo } from './LandingPage';

export default function AuthPage({ onAuthSuccess, onBackToHome }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('ROLE_USER');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      if (isRegister) {
        const res = await registerUser(email, password, fullName, role);
        setSuccessMsg('Account created successfully! Authenticating into sovereign console...');
        setTimeout(() => {
          onAuthSuccess(res);
        }, 600);
      } else {
        const res = await loginUser(email, password);
        onAuthSuccess(res);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setErrorMsg('');
    setIsLoading(true);
    try {
      const res = await loginUser(demoEmail, demoPassword);
      onAuthSuccess(res);
    } catch (err) {
      setErrorMsg(err.message || 'Quick login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-shell" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Top Header with Back to Home button */}
      <header className="top-nav" style={{ width: '100%' }}>
        <a className="wordmark" href="#top" onClick={(e) => { e.preventDefault(); onBackToHome(); }}>
          <Logo />
          <span>RAGNAROK <em>/ LOCAL INTELLIGENCE</em></span>
        </a>
        <button 
          className="quiet-link" 
          onClick={onBackToHome}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={14} />
          <span>Return to Landing</span>
        </button>
      </header>

      {/* Center Auth Card */}
      <div className="auth-outer-wrap" style={{ flex: 1, display: 'grid', placeItems: 'center', padding: '40px 20px' }}>
        <div className="auth-card-sovereign">
          {/* Brand Header */}
          <div className="auth-card-header">
            <div className="brand-mark" style={{ margin: '0 auto 12px' }}>
              <span>R</span>
              <i />
            </div>
            <span className="eyebrow" style={{ color: 'var(--cyan)' }}>SECURE AUTHENTICATION GATEWAY</span>
            <h2>{isRegister ? 'Create Sovereign Account' : 'Welcome to Ragnarok'}</h2>
            <p>Access your local neural agent, episodic memory, and autonomous task runner.</p>
          </div>

          {/* Tab Switcher */}
          <div className="auth-tab-row">
            <button
              type="button"
              className={!isRegister ? 'auth-tab-btn active' : 'auth-tab-btn'}
              onClick={() => { setIsRegister(false); setErrorMsg(''); }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={isRegister ? 'auth-tab-btn active' : 'auth-tab-btn'}
              onClick={() => { setIsRegister(true); setErrorMsg(''); }}
            >
              Create Account
            </button>
          </div>

          {/* Feedback Alerts */}
          {errorMsg && (
            <div className="auth-alert error">
              <AlertCircle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="auth-alert success">
              <CheckCircle size={15} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="auth-form-body">
            {isRegister && (
              <div className="auth-input-group">
                <label>FULL NAME</label>
                <div className="auth-input-field">
                  <User size={15} />
                  <input
                    type="text"
                    placeholder="e.g. Alex Orlov"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}

            <div className="auth-input-group">
              <label>EMAIL ADDRESS</label>
              <div className="auth-input-field">
                <Mail size={15} />
                <input
                  type="email"
                  placeholder="name@ragnarok.ai"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="auth-input-group">
              <label>PASSWORD</label>
              <div className="auth-input-field">
                <LockKeyhole size={15} />
                <input
                  type="password"
                  placeholder="••••••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            {isRegister && (
              <div className="auth-input-group">
                <label>ROLE-BASED ACCESS CONTROL (RBAC)</label>
                <div className="role-selector-row">
                  <button
                    type="button"
                    className={`role-select-btn ${role === 'ROLE_USER' ? 'selected' : ''}`}
                    onClick={() => setRole('ROLE_USER')}
                  >
                    <User size={13} />
                    <span>Standard User</span>
                  </button>
                  <button
                    type="button"
                    className={`role-select-btn admin ${role === 'ROLE_ADMIN' ? 'selected' : ''}`}
                    onClick={() => setRole('ROLE_ADMIN')}
                  >
                    <ShieldAlert size={13} />
                    <span>Administrator</span>
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="primary-button"
              style={{ width: '100%', justifyContent: 'center', marginTop: '14px', padding: '14px' }}
              disabled={isLoading}
            >
              {isLoading ? (
                <span>Authenticating with Core...</span>
              ) : (
                <>
                  <span>{isRegister ? 'Register & Enter Console' : 'Sign In with JWT'}</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Logins for Instant Testing */}
          <div className="auth-demo-box">
            <div className="auth-demo-title">
              <span>INSTANT ONE-CLICK TEST LOGINS</span>
            </div>
            <div className="auth-demo-grid">
              <button
                type="button"
                className="auth-demo-btn"
                onClick={() => handleQuickLogin('admin@ragnarok.ai', 'Admin@123')}
                disabled={isLoading}
              >
                <Key size={14} style={{ color: 'var(--orange)' }} />
                <div>
                  <strong>Admin Access</strong>
                  <small>admin@ragnarok.ai</small>
                </div>
              </button>
              <button
                type="button"
                className="auth-demo-btn"
                onClick={() => handleQuickLogin('user@ragnarok.ai', 'User@123')}
                disabled={isLoading}
              >
                <User size={14} style={{ color: 'var(--cyan)' }} />
                <div>
                  <strong>User Access</strong>
                  <small>user@ragnarok.ai</small>
                </div>
              </button>
            </div>
          </div>

          {/* Footer Security Badges */}
          <div className="auth-security-footer">
            <span><LockKeyhole size={11} /> HS256 JWT Signed</span>
            <span><ShieldCheck size={11} /> Stateless Spring Security 6</span>
            <span><Sparkles size={11} /> Local Ollama Agent</span>
          </div>
        </div>
      </div>
    </div>
  );
}
