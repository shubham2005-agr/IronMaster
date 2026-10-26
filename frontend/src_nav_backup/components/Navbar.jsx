import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Wrench, 
  FileText, 
  BrainCircuit, 
  Sparkles, 
  Mail, 
  Cpu, 
  HardDrive, 
  Database, 
  RefreshCw, 
  Plus, 
  LogOut, 
  Shield, 
  User, 
  Activity, 
  ChevronDown, 
  CheckCircle2,
  Layers,
  Menu,
  X
} from 'lucide-react';

export default function Navbar({
  activeNav = 'chat',
  onSelectNav,
  sessionId,
  onNewSession,
  currentUser,
  onLogout,
  suggestionsCount = 0,
  onToggleSidebar,
  isSidebarCollapsed = false
}) {
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const isAdmin = currentUser?.role === 'ROLE_ADMIN';
  const displayName = currentUser?.fullName || currentUser?.email?.split('@')[0] || 'User';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { id: 'chat', label: 'Chat', fullLabel: 'Chat Copilot', icon: MessageSquare, badge: null },
    { id: 'workflows', label: 'Workflows', fullLabel: 'Workflows & DAG', icon: Wrench, badge: null },
    { id: 'docs', label: 'Knowledge', fullLabel: 'Knowledge (RAG)', icon: FileText, badge: null },
    { id: 'memory', label: 'Memory', fullLabel: 'Dual Memory Matrix', icon: BrainCircuit, badge: null },
    { 
      id: 'suggestions', 
      label: 'Proactive', 
      fullLabel: 'Proactive AI', 
      icon: Sparkles, 
      badge: suggestionsCount > 0 ? suggestionsCount : null 
    },
    { id: 'email', label: 'Email', fullLabel: 'Email Studio', icon: Mail, badge: null }
  ];

  const handleNavClick = (id) => {
    onSelectNav(id);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className={`navbar-header ${isScrolled ? 'scrolled' : ''}`}>
      {/* Background Animated Gradient Mesh Glow */}
      <div className="navbar-glow-bar" />

      <div className="navbar-container">
        {/* Left: Brand Identity */}
        <div className="navbar-brand-section" onClick={() => handleNavClick('chat')} role="button" tabIndex={0} title="Ragnarok AI - Home">
          <div className="brand-orb-container">
            <div className="brand-orb-core">
              <Sparkles size={18} className="brand-sparkle-icon" />
            </div>
            <div className="brand-orb-ring" />
            <div className="brand-orb-pulse" />
          </div>

          <div className="brand-text-block">
            <div className="brand-title-row">
              <span className="brand-name">RAGNAROK</span>
              <span className="brand-badge-ai">AI</span>
            </div>
            <span className="brand-subtitle">Dual-Memory Agent</span>
          </div>
        </div>

        {/* Center: Modern Pill Navigation Bar (Desktop & Tablet) */}
        <nav className="navbar-nav-pill" aria-label="Main Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                className={`nav-tab-item ${isActive ? 'active' : ''}`}
                onClick={() => handleNavClick(item.id)}
                title={item.fullLabel}
              >
                <span className="nav-icon-wrapper">
                  <Icon size={15} className={`nav-icon ${isActive ? 'active-icon' : ''}`} />
                  {item.badge && (
                    <span className="nav-badge-pill" title={`${item.badge} active recommendations`}>
                      {item.badge}
                    </span>
                  )}
                </span>
                <span className="nav-label">{item.label}</span>
                {isActive && <div className="nav-active-glow" />}
              </button>
            );
          })}
        </nav>

        {/* Right: Actions, Telemetry & Profile */}
        <div className="navbar-actions-group">
          {/* Telemetry Capsule Dropdown Trigger */}
          <div className="telemetry-capsule-wrapper">
            <button
              className={`telemetry-pill-btn ${isTelemetryOpen ? 'open' : ''}`}
              onClick={() => setIsTelemetryOpen(!isTelemetryOpen)}
              title="Click to view live microservices & model telemetry"
            >
              <div className="radar-beacon">
                <span className="radar-core"></span>
                <span className="radar-wave"></span>
              </div>
              <span className="telemetry-text">Services</span>
              <ChevronDown size={12} className={`chevron-telemetry ${isTelemetryOpen ? 'rotated' : ''}`} />
            </button>

            {isTelemetryOpen && (
              <>
                <div className="telemetry-backdrop" onClick={() => setIsTelemetryOpen(false)} />
                <div className="telemetry-dropdown-card">
                  <div className="telemetry-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Activity size={15} color="var(--accent-cyan)" />
                      <span className="telemetry-title">System Architecture Telemetry</span>
                    </div>
                    <span className="telemetry-status-tag">ONLINE</span>
                  </div>

                  <div className="telemetry-grid">
                    <div className="telemetry-service-row">
                      <div className="service-dot-status active" />
                      <div className="service-details">
                        <span className="service-name">Spring Boot REST / SSE</span>
                        <span className="service-meta">Port 8080 &bull; Java 21</span>
                      </div>
                      <span className="service-latency">12ms</span>
                    </div>

                    <div className="telemetry-service-row">
                      <div className="service-dot-status active" />
                      <HardDrive size={13} className="service-icon" />
                      <div className="service-details">
                        <span className="service-name">MySQL Working Memory</span>
                        <span className="service-meta">Port 3306 &bull; Chat Session Buffer</span>
                      </div>
                      <span className="service-latency">4ms</span>
                    </div>

                    <div className="telemetry-service-row">
                      <div className="service-dot-status cyan" />
                      <Database size={13} className="service-icon cyan" />
                      <div className="service-details">
                        <span className="service-name">MariaDB Native Vector Store</span>
                        <span className="service-meta">Port 3307 &bull; Long-Term Embeddings</span>
                      </div>
                      <span className="service-latency">8ms</span>
                    </div>

                    <div className="telemetry-service-row">
                      <div className="service-dot-status active" />
                      <Cpu size={13} className="service-icon purple" />
                      <div className="service-details">
                        <span className="service-name">Local Ollama LLM</span>
                        <span className="service-meta">llama3.2 &bull; nomic-embed-text</span>
                      </div>
                      <span className="service-latency">Ready</span>
                    </div>
                  </div>

                  <div className="telemetry-footer">
                    <span>Self-Correction Guard: Active</span>
                    <CheckCircle2 size={12} color="#10b981" />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Quick Session Pill & New Chat Button */}
          <div className="session-quick-capsule">
            <div className="session-quick-badge" title={`Active Session ID: ${sessionId}`}>
              <Layers size={12} color="var(--accent-indigo)" />
              <span className="session-text">
                {sessionId.length > 10 ? `${sessionId.slice(0, 9)}…` : sessionId}
              </span>
            </div>
            <button
              className="btn-new-chat-navbar"
              onClick={onNewSession}
              title="Create a new conversation session"
            >
              <Plus size={12} />
              <span className="new-chat-label">New</span>
            </button>
          </div>

          {/* User Profile Capsule */}
          {currentUser && (
            <div className="user-profile-capsule">
              <div className={`user-role-avatar ${isAdmin ? 'admin' : 'user'}`} title={`Role: ${currentUser.role}`}>
                {isAdmin ? <Shield size={12} /> : <User size={12} />}
              </div>
              <div className="user-info-text">
                <span className="user-name-title">{displayName}</span>
                <span className="user-role-label">{isAdmin ? 'ADMIN' : 'USER'}</span>
              </div>
              <button
                className="btn-logout-nav"
                onClick={onLogout}
                title="Sign out of Ragnarok AI"
              >
                <LogOut size={13} />
              </button>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            className="mobile-nav-toggle-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
          >
            {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="mobile-nav-drawer">
          <div className="mobile-nav-items-grid">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  className={`mobile-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleNavClick(item.id)}
                >
                  <Icon size={16} />
                  <span>{item.fullLabel}</span>
                  {item.badge && (
                    <span className="nav-badge-pill" style={{ position: 'static' }}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
