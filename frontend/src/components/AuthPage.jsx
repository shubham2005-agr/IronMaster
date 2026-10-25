import React, { useState } from 'react';
import { Shield, Lock, Mail, User, Sparkles, Key, CheckCircle, AlertCircle, ArrowRight, ShieldAlert } from 'lucide-react';
import { loginUser, registerUser } from '../api';

export default function AuthPage({ onAuthSuccess }) {
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
        setSuccessMsg('Account created successfully! Logging in...');
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
    <div className="auth-container">
      <div className="auth-card">
        {/* Brand Header */}
        <div className="auth-header">
          <div className="auth-logo-badge">
            <Shield size={28} className="shield-icon" />
            <Sparkles size={16} className="sparkle-accent" />
          </div>
          <h2>RAGNAROK AI</h2>
          <p className="auth-subtitle">Sovereign Dual-Memory Agent &bull; Spring Security &bull; JWT</p>
        </div>

        {/* Tab Switcher */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${!isRegister ? 'active' : ''}`}
            onClick={() => { setIsRegister(false); setErrorMsg(''); }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab ${isRegister ? 'active' : ''}`}
            onClick={() => { setIsRegister(true); setErrorMsg(''); }}
          >
            Create Account
          </button>
        </div>

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="auth-alert error">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="auth-alert success">
            <CheckCircle size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          {isRegister && (
            <div className="form-group">
              <label>Full Name</label>
              <div className="input-wrapper">
                <User size={16} className="input-icon" />
                <input
                  type="text"
                  placeholder="e.g. Harshit Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Email Address</label>
            <div className="input-wrapper">
              <Mail size={16} className="input-icon" />
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

          <div className="form-group">
            <label>Password</label>
            <div className="input-wrapper">
              <Lock size={16} className="input-icon" />
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
            <div className="form-group">
              <label>Role-Based Access (RBAC)</label>
              <div className="role-selector-pills">
                <button
                  type="button"
                  className={`role-pill ${role === 'ROLE_USER' ? 'selected' : ''}`}
                  onClick={() => setRole('ROLE_USER')}
                >
                  <User size={14} />
                  <span>Standard User</span>
                </button>
                <button
                  type="button"
                  className={`role-pill admin ${role === 'ROLE_ADMIN' ? 'selected' : ''}`}
                  onClick={() => setRole('ROLE_ADMIN')}
                >
                  <ShieldAlert size={14} />
                  <span>Administrator</span>
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn-auth-submit"
            disabled={isLoading}
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>{isRegister ? 'Register & Enter Workspace' : 'Sign In with JWT'}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Logins for Instant Testing */}
        <div className="demo-logins-section">
          <div className="demo-divider">
            <span>Instant Demo Accounts</span>
          </div>
          <div className="demo-buttons">
            <button
              type="button"
              className="btn-demo-login admin"
              onClick={() => handleQuickLogin('admin@ragnarok.ai', 'Admin@123')}
              disabled={isLoading}
            >
              <Key size={14} />
              <div className="demo-info">
                <strong>Admin Access</strong>
                <small>admin@ragnarok.ai</small>
              </div>
            </button>
            <button
              type="button"
              className="btn-demo-login user"
              onClick={() => handleQuickLogin('user@ragnarok.ai', 'User@123')}
              disabled={isLoading}
            >
              <User size={14} />
              <div className="demo-info">
                <strong>User Access</strong>
                <small>user@ragnarok.ai</small>
              </div>
            </button>
          </div>
        </div>

        {/* Footer Security Badges */}
        <div className="auth-footer-notes">
          <span>HS256 JWT Signed</span> &bull; <span>Stateless Spring Security 6</span> &bull; <span>Role Guarded</span>
        </div>
      </div>
    </div>
  );
}
