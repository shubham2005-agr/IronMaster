import React from 'react';
import { 
  Command, 
  LockKeyhole, 
  RefreshCw, 
  Layers, 
  LogOut, 
  Shield, 
  User
} from 'lucide-react';

export default function Header({ 
  sessionId, 
  onNewSession, 
  currentUser, 
  onLogout, 
  onReturnToLanding,
  isBackendConnected = true
}) {
  const isAdmin = currentUser?.role === 'ROLE_ADMIN';
  const displayName = currentUser?.fullName || currentUser?.email?.split('@')[0] || 'Alex Orlov';

  return (
    <div className="console-chrome">
      <div className="chrome-left">
        <span className="window-dots">
          <i />
          <i />
          <i />
        </span>
        <span className="console-title">
          <Command size={14} /> SOVEREIGN CONSOLE <small>v1.0 / local</small>
        </span>
      </div>

      <div className="console-status" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span className={isBackendConnected ? "status-pulse" : "status-pulse offline"} />
        <span>{isBackendConnected ? "LOCAL CORE ONLINE" : "DEMO / OFFLINE"}</span>
        <span className="status-divider" />
        <span className="system-telemetry-badge">API :8080</span>
        <span className="system-telemetry-badge">MySQL :3306</span>
        <span className="system-telemetry-badge">Vector :3307</span>
        <span className="system-telemetry-badge">Ollama 3.2</span>
        <span className="status-divider" />
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#8895a5' }}>
          <LockKeyhole size={12} /> ENCRYPTED
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Session Badge & New Session */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#14181f', padding: '4px 8px', borderRadius: '3px', border: '1px solid #272d36', fontSize: '9px', fontFamily: 'var(--font-mono)' }}>
          <Layers size={12} style={{ color: 'var(--cyan)' }} />
          <span style={{ color: '#818e9d' }}>Session:</span>
          <strong style={{ color: '#dce3eb' }}>{sessionId}</strong>
        </div>
        <button
          type="button"
          onClick={onNewSession}
          className="icon-button"
          style={{ width: '26px', height: '24px' }}
          title="Create New Chat Session"
        >
          <RefreshCw size={12} />
        </button>

        <span className="status-divider" />

        {/* Logout */}
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="quiet-link"
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer', 
              fontSize: '10px', 
              color: '#97a3b1',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 6px',
              borderRadius: '3px',
              transition: 'all 0.15s ease'
            }}
            title="Sign Out / Logout"
          >
            <LogOut size={12} />
            <span>Logout</span>
          </button>
        )}

        {/* User Pill */}
        {currentUser && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '4px' }}>
            <span style={{ 
              fontSize: '8px', 
              fontFamily: 'var(--font-mono)', 
              padding: '2px 5px', 
              borderRadius: '2px', 
              background: isAdmin ? 'var(--orange-dim)' : 'var(--cyan-dim)', 
              color: isAdmin ? 'var(--orange)' : 'var(--cyan)',
              border: `1px solid ${isAdmin ? 'rgba(255,112,69,0.3)' : 'rgba(140,241,229,0.3)'}`
            }}>
              {isAdmin ? 'ADMIN' : 'USER'}
            </span>
            <span className="chrome-user-name" style={{ fontSize: '11px', color: '#cfd7df', fontWeight: '500' }}>
              {displayName}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
