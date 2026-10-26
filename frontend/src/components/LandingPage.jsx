import React, { useState } from 'react';
import { 
  Play, 
  ArrowUpRight, 
  ChevronRight, 
  LockKeyhole, 
  ShieldCheck, 
  Circle, 
  Brain, 
  Zap, 
  Database, 
  Activity, 
  GitBranch, 
  Radio, 
  Command, 
  Sparkles, 
  Terminal, 
  Globe2 
} from 'lucide-react';

export function Logo() {
  return (
    <div className="brand-mark" data-testid="brand-logo">
      <span>R</span>
      <i />
    </div>
  );
}

export default function LandingPage({ onOpenConsole, onOpenAuth, currentUser }) {
  const [demoCommand, setDemoCommand] = useState('');
  const [demoMessages, setDemoMessages] = useState([
    { from: 'agent', text: 'Ragnarok core initialized. Local memories synced and ready.' }
  ]);

  const handleDemoSubmit = (e) => {
    e.preventDefault();
    if (!demoCommand.trim()) return;
    const cmd = demoCommand.trim();
    setDemoMessages(prev => [
      ...prev,
      { from: 'user', text: cmd },
      { from: 'agent', text: 'Processing locally with Ollama (Llama 3.2). Launch console to view real-time traces.' }
    ]);
    setDemoCommand('');
  };

  const activities = [
    { time: "09:41:22", title: "Weekly research digest assembled", detail: "7 sources · Memory / Research", color: "green", icon: Brain },
    { time: "09:38:04", title: "Notion workspace indexed", detail: "142 pages · Knowledge graph", color: "cyan", icon: Database },
    { time: "09:33:18", title: "Calendar conflict detected", detail: "2 events · Needs approval", color: "amber", icon: Activity },
    { time: "09:25:51", title: "GitHub pull request reviewed", detail: "PR #284 · Engineering", color: "purple", icon: GitBranch },
  ];

  const skills = [
    { name: "Research scout", type: "Web intelligence", status: "Ready", icon: Globe2 },
    { name: "Inbox zero", type: "Email triage", status: "Ready", icon: Zap },
    { name: "Morning brief", type: "Daily ritual · 08:00", status: "Active", icon: Radio },
  ];

  return (
    <div className="app-shell" id="top">
      {/* Top Navigation Bar */}
      <nav className="top-nav" data-testid="main-navigation">
        <a className="wordmark" href="#top" data-testid="brand-home-link">
          <Logo />
          <span>RAGNAROK <em>/ LOCAL INTELLIGENCE</em></span>
        </a>
        <div className="nav-links">
          <a href="#philosophy" data-testid="nav-philosophy-link">Philosophy</a>
          <a href="#capabilities" data-testid="nav-capabilities-link">Capabilities</a>
          <a href="#console-preview" data-testid="nav-console-link">Console</a>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {currentUser ? (
            <button className="nav-launch" onClick={onOpenConsole} data-testid="nav-launch-button">
              Command Center <ArrowUpRight size={15} />
            </button>
          ) : (
            <>
              <button className="quiet-link" onClick={onOpenAuth} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                Sign In
              </button>
              <button className="nav-launch" onClick={onOpenConsole} data-testid="nav-launch-button">
                Open console <ArrowUpRight size={15} />
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero" data-testid="hero-section">
        <div className="hero-copy">
          <div className="eyebrow hero-eyebrow">
            <span className="pulse-ring" /> THE PERSONAL AI THAT STAYS WITH YOU
          </div>
          <h1>
            Intelligence,<br />
            <span>sovereign by design.</span>
          </h1>
          <p className="hero-lede">
            Ragnarok is an always-on personal agent that remembers, reasons, and acts — without sending your life to the cloud.
          </p>
          <div className="hero-actions">
            <button className="primary-button" onClick={onOpenConsole} data-testid="hero-launch-button">
              <Play size={15} fill="currentColor" /> Enter the command center <ArrowUpRight size={16} />
            </button>
            <a href="#philosophy" className="quiet-link" data-testid="hero-learn-link">
              Why local intelligence? <ChevronRight size={14} />
            </a>
          </div>
          <div className="trust-row">
            <span><LockKeyhole size={14} /> LOCAL-FIRST</span>
            <span><ShieldCheck size={14} /> ENCRYPTED</span>
            <span><Circle size={7} fill="currentColor" /> ALWAYS-ON</span>
          </div>
        </div>

        {/* Hero Visual Art */}
        <div className="hero-art" aria-label="Abstract local intelligence visual" data-testid="hero-visual">
          <div className="art-grid" />
          <div className="sun-orb">
            <div className="orb-inner" />
          </div>
          <div className="art-ring ring-a" />
          <div className="art-ring ring-b" />
          <div className="art-label label-top">MEMORY / 2481</div>
          <div className="art-label label-right">
            NO CLOUD<br />
            <strong>CONNECTED</strong>
          </div>
          <div className="art-label label-bottom">
            YGGDRASIL NODE <span>●</span>
          </div>
          <div className="art-crosshair" />
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="statement" id="philosophy" data-testid="philosophy-section">
        <span className="section-number">01 — THE PREMISE</span>
        <div>
          <h2>Your data is not a<br /><em>byproduct.</em> It is yours.</h2>
          <p>
            Most AI assistants forget you the moment the window closes. Ragnarok is built differently — a private intelligence layer that lives in your hall, learns your patterns, and acts on your behalf.
          </p>
        </div>
        <div className="statement-stat">
          <strong>0</strong>
          <span>bytes sent<br />to the cloud</span>
        </div>
      </section>

      {/* Capabilities Section */}
      <section className="capabilities" id="capabilities" data-testid="capabilities-section">
        <div className="section-intro">
          <span className="section-number">02 — THE COMMAND DECK</span>
          <h2>A second mind,<br /><em>under your command.</em></h2>
        </div>
        <div className="capability-grid">
          <article>
            <span className="cap-number">01</span>
            <Brain size={20} />
            <h3>Persistent memory</h3>
            <p>Episodic and semantic context that gets sharper with every conversation.</p>
          </article>
          <article>
            <span className="cap-number">02</span>
            <Zap size={20} />
            <h3>Autonomous action</h3>
            <p>Turn an intention into a chain of work. Ragnarok handles the handoffs.</p>
          </article>
          <article>
            <span className="cap-number">03</span>
            <ShieldCheck size={20} />
            <h3>Radical privacy</h3>
            <p>Your keys, your hardware, your rules. Explicit approval for sensitive actions.</p>
          </article>
        </div>
      </section>

      {/* Interactive Console Preview Teaser */}
      <section className="console-wrap" id="console-preview" style={{ marginTop: '70px' }}>
        <div className="console-chrome">
          <div className="chrome-left">
            <span className="window-dots"><i /><i /><i /></span>
            <span className="console-title">
              <Command size={14} /> SOVEREIGN CONSOLE <small>v1.0 / local preview</small>
            </span>
          </div>
          <div className="console-status">
            <span className="status-pulse" />
            LOCAL CORE ONLINE
            <span className="status-divider" />
            <LockKeyhole size={13} /> ENCRYPTED
          </div>
        </div>

        <div className="console-main" style={{ padding: '28px 32px' }}>
          <div className="console-header">
            <div>
              <span className="eyebrow">LIVE TELEMETRY PREVIEW</span>
              <h2>Autonomous Command Center</h2>
              <p>Experience real-time dual-memory retrieval, tool execution, and local reasoning.</p>
            </div>
            <button className="primary-button" onClick={onOpenConsole} style={{ padding: '10px 16px' }}>
              Launch Full Deck <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="command-box">
            <div className="command-top">
              <span className="command-symbol"><Sparkles size={16} /></span>
              <span>ASK RAGNAROK (TRY DEMO PROMPT)</span>
              <kbd>⌘ K</kbd>
            </div>
            <form onSubmit={handleDemoSubmit}>
              <input 
                value={demoCommand} 
                onChange={(e) => setDemoCommand(e.target.value)} 
                placeholder="Ask Ragnarok anything or test a command..." 
              />
              <button type="submit" className="send-button" aria-label="Send">
                <Play size={14} fill="currentColor" />
              </button>
            </form>
            <div className="suggestions">
              <button type="button" onClick={() => setDemoCommand("Prepare my morning brief")}>
                Prepare my morning brief <ArrowUpRight size={12} />
              </button>
              <button type="button" onClick={() => setDemoCommand("Find this week's loose ends")}>
                Find this week&apos;s loose ends <ArrowUpRight size={12} />
              </button>
              <button type="button" onClick={() => setDemoCommand("Summarize project architecture")}>
                Summarize project architecture <ArrowUpRight size={12} />
              </button>
            </div>
          </div>

          {demoMessages.length > 0 && (
            <div className="message-stack">
              {demoMessages.slice(-3).map((m, idx) => (
                <div className={`command-message ${m.from}`} key={idx}>
                  <span>{m.from === 'agent' ? 'R' : 'YOU'}</span>
                  {m.text}
                </div>
              ))}
            </div>
          )}

          <div className="dashboard-grid">
            {/* Activity Panel */}
            <section className="panel activity-panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">LIVE TELEMETRY</span>
                  <h3>Activity stream</h3>
                </div>
                <span className="live-dot"><i /> LIVE</span>
              </div>
              <div className="activity-list">
                {activities.map(({ time, title, detail, color, icon: Icon }) => (
                  <div className="activity-item" key={title}>
                    <div className={`activity-icon ${color}`}>
                      <Icon size={15} />
                    </div>
                    <div className="activity-copy">
                      <strong>{title}</strong>
                      <span>{detail}</span>
                    </div>
                    <time>{time}</time>
                  </div>
                ))}
              </div>
            </section>

            {/* Skills Panel */}
            <section className="panel skills-panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">MODULAR CAPABILITIES</span>
                  <h3>Skills online</h3>
                </div>
              </div>
              {skills.map(({ name, type, status, icon: Icon }) => (
                <div className="skill-row" key={name}>
                  <div className="skill-icon"><Icon size={16} /></div>
                  <div>
                    <strong>{name}</strong>
                    <span>{type}</span>
                  </div>
                  <span className={`skill-status ${status === "Active" ? "active" : ""}`}>
                    <i />{status}
                  </span>
                </div>
              ))}
            </section>

            {/* Memory Core */}
            <section className="panel memory-panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">PERSISTENT CONTEXT</span>
                  <h3>Memory well</h3>
                </div>
                <Brain size={18} className="panel-icon" />
              </div>
              <div className="memory-visual">
                <div className="orbit orbit-one" />
                <div className="orbit orbit-two" />
                <div className="memory-core">
                  <Brain size={25} />
                  <span>2,481</span>
                  <small>memories</small>
                </div>
                <span className="node node-a">WORK</span>
                <span className="node node-b">PEOPLE</span>
                <span className="node node-c">IDEAS</span>
              </div>
              <div className="memory-footer">
                <span><i className="green-dot" /> ENCRYPTED & LOCAL</span>
                <button type="button" onClick={onOpenConsole}>
                  Open memory <ChevronRight size={14} />
                </button>
              </div>
            </section>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <a className="wordmark" href="#top" data-testid="footer-home-link">
          <Logo />
          <span>RAGNAROK <em>/ LOCAL INTELLIGENCE</em></span>
        </a>
        <span>BUILT FOR THE SOVEREIGN MIND <span className="footer-mark">✦</span></span>
        <span>© 2026 / LOCAL BY DEFAULT</span>
      </footer>
    </div>
  );
}

