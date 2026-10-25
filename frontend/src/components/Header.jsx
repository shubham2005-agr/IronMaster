import React from 'react';
import { Cpu, Database, HardDrive, RefreshCw, Layers, Sparkles, LogOut, Shield, User } from 'lucide-react';

export default function Header({ sessionId, setSessionId, onNewSession, onResetSession, currentUser, onLogout }) {
  const isAdmin = currentUser?.role === 'ROLE_ADMIN';
  const displayName = currentUser?.fullName || currentUser?.email?.split('@')[0] || 'User';

  return (
    <header className="header">
      <div className="brand-section">
        <div className="brand-icon">
          <Sparkles size={22} />
        </div>
        <div className="brand-info">
          <h1>
            RAGNAROK <span className="brand-tag">v1.0 AI AGENT</span>
          </h1>
          <div className="brand-sub">Sovereign Dual-Memory Architecture (MySQL + MariaDB Vector)</div>
        </div>
      </div>

      <div className="system-status-pills">
        <div className="status-pill" title="Spring Boot REST & SSE Server">
          <div className="status-dot active"></div>
          <span>API :8080</span>
        </div>
        <div className="status-pill" title="MySQL Short-Term Message History">
          <div className="status-dot active"></div>
          <HardDrive size={13} />
          <span>MySQL :3306</span>
        </div>
        <div className="status-pill" title="MariaDB Native Vector Store">
          <div className="status-dot cyan"></div>
          <Database size={13} />
          <span>Vector :3307</span>
        </div>
        <div className="status-pill" title="Local Ollama Inference Engine">
          <div className="status-dot active"></div>
          <Cpu size={13} />
          <span>Llama 3.2</span>
        </div>
      </div>

      <div className="session-toolbar">
        <div className="session-badge">
          <Layers size={14} color="#6366f1" />
          Session: <span>{sessionId}</span>
        </div>
        <button
          className="btn-outline"
          onClick={onNewSession}
          title="Switch to a new conversation session"
        >
          <RefreshCw size={13} />
          New Session
        </button>

        {currentUser && (
          <div className="user-profile-widget">
            <div className={`user-role-badge ${isAdmin ? 'admin' : 'user'}`} title={`Role: ${currentUser.role}`}>
              {isAdmin ? <Shield size={12} /> : <User size={12} />}
              <span>{isAdmin ? 'ADMIN' : 'USER'}</span>
            </div>
            <div className="user-text-info" title={currentUser.email}>
              <span className="user-display-name">{displayName}</span>
            </div>
            <button
              className="btn-logout"
              onClick={onLogout}
              title="Logout of Ragnarok AI"
            >
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
