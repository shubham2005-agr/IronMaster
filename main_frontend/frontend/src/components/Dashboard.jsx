import React, { useState, useEffect, useRef } from 'react';
import { 
  Network, 
  MessageSquare, 
  Brain, 
  Terminal, 
  Sparkles, 
  Compass, 
  Mail, 
  Database, 
  ShieldCheck, 
  Search, 
  Mic, 
  Send, 
  ArrowUpRight, 
  ChevronRight, 
  Plus, 
  Settings2, 
  Play, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  FileText, 
  Radio, 
  Activity, 
  Globe2, 
  GitBranch, 
  LockKeyhole,
  Zap,
  RotateCcw
} from 'lucide-react';
import Header from './Header';
import ChatArea from './ChatArea';
import EmailModal from './EmailModal';
import { 
  rememberMemory, 
  uploadKnowledgeDocument, 
  getSessionHistory, 
  clearSessionMemory,
  fetchSessions,
  deleteSession,
  fetchSkills,
  executeSkill,
  executeWorkflow,
  fetchWorkflowExecutions,
  retryWorkflow,
  fetchSuggestions,
  dismissSuggestion,
  acceptSuggestion,
  triggerAgentSweep,
  consolidateMemories,
  pruneMemories,
  sendManualEmail
} from '../api';

const DEFAULT_SKILLS = [
  {
    skillId: 'file_read',
    name: 'Read Workspace File',
    description: 'Safely reads a UTF-8 text or code file within the workspace boundary.',
    type: 'IO',
    defaultParam: '{"filePath": "pom.xml"}'
  },
  {
    skillId: 'file_write',
    name: 'Write Workspace File',
    description: 'Writes content or generates a new file safely inside the workspace boundary.',
    type: 'IO',
    defaultParam: '{"filePath": "sandbox_notes.txt", "content": "Hello from Sovereign Ragnarok Agent!"}'
  },
  {
    skillId: 'file_search',
    name: 'Search File Content',
    description: 'Searches for matching keywords or regex patterns in a workspace file and returns matching lines.',
    type: 'Search',
    defaultParam: '{"filePath": "pom.xml", "pattern": "spring"}'
  },
  {
    skillId: 'shell_command',
    name: 'Execute Sandboxed Shell Command',
    description: 'Executes an approved CLI command within the bounded workspace environment with timeout.',
    type: 'System',
    defaultParam: '{"command": "cmd.exe /c echo Hello Ragnarok Sandbox"}'
  },
  {
    skillId: 'knowledge_search',
    name: 'Search Vector Knowledge Store',
    description: 'Performs semantic similarity retrieval against uploaded documents, facts, and permanent memory.',
    type: 'RAG',
    defaultParam: '{"query": "agent architecture"}'
  },
  {
    skillId: 'email_send',
    name: 'Send SMTP Email Alert',
    description: 'Sends an email alert or notification to configured SMTP recipient.',
    type: 'Alert',
    defaultParam: '{"to": "admin@ragnarok.ai", "subject": "System Notice", "body": "Autonomous agent event alert"}'
  },
  {
    skillId: 'http_webhook',
    name: 'HTTP Webhook Caller',
    description: 'Sends an HTTP GET or POST request to an external or local webhook endpoint.',
    type: 'Webhook',
    defaultParam: '{"url": "http://localhost:8080/api/auth/me", "method": "GET"}'
  }
];

export default function Dashboard({ 
  sessionId, 
  setSessionId, 
  onNewSession, 
  currentUser, 
  onLogout,
  onReturnToLanding,
  messages,
  onSendMessage,
  isGenerating,
  onStopGeneration,
  streamingEnabled,
  setStreamingEnabled,
  onClearChat,
  refreshTrigger
}) {
  const [activeTab, setActiveTab] = useState('overview'); // overview | chat | memory | tasks | skills | suggestions | email | docs
  const [commandInput, setCommandInput] = useState('');
  const [commandFeedback, setCommandFeedback] = useState([]);
  const [serviceOn, setServiceOn] = useState({ notion: true, github: true, slack: false });
  const [taskRunning, setTaskRunning] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Workflow state
  const [workflowGoal, setWorkflowGoal] = useState('');
  const [isPlanning, setIsPlanning] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [workflowExecutions, setWorkflowExecutions] = useState([]);

  // Skills state
  const [skillsList, setSkillsList] = useState([]);
  const [skillParams, setSkillParams] = useState({});
  const [skillExecutionResult, setSkillExecutionResult] = useState(null);
  const [executingSkillName, setExecutingSkillName] = useState(null);

  // Memory state
  const [memoryText, setMemoryText] = useState('');
  const [memoryCategory, setMemoryCategory] = useState('general');
  const [memoryFeedback, setMemoryFeedback] = useState(null);
  const [isSavingMemory, setIsSavingMemory] = useState(false);
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [consolidationResult, setConsolidationResult] = useState(null);
  const [bufferHistory, setBufferHistory] = useState([]);

  // Suggestions state
  const [suggestions, setSuggestions] = useState([]);
  const [isSweeping, setIsSweeping] = useState(false);

  // Email state
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState(null);

  // Docs state
  const [selectedFile, setSelectedFile] = useState(null);
  const [docCategory, setDocCategory] = useState('general');
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState(null);
  const [uploadHistory, setUploadHistory] = useState([]);

  // Sessions list
  const [sessions, setSessions] = useState([]);

  // Load telemetry data on tab change or refresh
  useEffect(() => {
    loadSessionsList();
    if (activeTab === 'overview' || activeTab === 'skills') {
      loadSkillsData();
      loadExecutionsData();
    }
    if (activeTab === 'memory') {
      loadBufferData();
    }
    if (activeTab === 'suggestions') {
      loadSuggestionsData();
    }
  }, [activeTab, refreshTrigger, sessionId]);

  const loadSessionsList = async () => {
    try {
      const data = await fetchSessions();
      setSessions(data || []);
    } catch (err) {
      console.warn('Sessions load:', err.message);
    }
  };

  const loadSkillsData = async () => {
    try {
      const list = await fetchSkills();
      setSkillsList(list || []);
    } catch (err) {
      console.warn('Skills load:', err.message);
    }
  };

  const loadExecutionsData = async () => {
    try {
      const execs = await fetchWorkflowExecutions();
      setWorkflowExecutions(execs || []);
    } catch (err) {
      console.warn('Executions load:', err.message);
    }
  };

  const loadSuggestionsData = async () => {
    try {
      const data = await fetchSuggestions();
      setSuggestions(data || []);
    } catch (err) {
      console.warn('Suggestions load:', err.message);
    }
  };

  const loadBufferData = async () => {
    try {
      const hist = await getSessionHistory(sessionId);
      setBufferHistory(hist || []);
    } catch (err) {
      console.warn('Buffer load:', err.message);
    }
  };

  // Handle command box submit
  const handleCommandSubmit = (e) => {
    e.preventDefault();
    if (!commandInput.trim()) return;
    const text = commandInput.trim();
    setCommandInput('');

    // If on chat tab or user asks something, forward to chat
    if (activeTab === 'chat') {
      onSendMessage(text);
      return;
    }

    // Otherwise record in command stack and trigger local reflection
    setTaskRunning(true);
    setCommandFeedback(prev => [
      ...prev,
      { from: 'user', text },
      { from: 'agent', text: `Analyzing command locally: "${text}". Dispatched to sovereign core.` }
    ]);

    // Send to agent as well
    onSendMessage(text);

    setTimeout(() => {
      setTaskRunning(false);
    }, 1500);
  };

  // Quick suggestion click
  const handleSuggestionClick = (prompt) => {
    setCommandInput(prompt);
    setActiveTab('chat');
    onSendMessage(prompt);
  };

  // Workflow execute
  const handleRunWorkflow = async (e) => {
    e.preventDefault();
    if (!workflowGoal.trim() || isPlanning) return;
    setIsPlanning(true);
    setCurrentPlan(null);
    try {
      const plan = await executeWorkflow(workflowGoal.trim());
      setCurrentPlan(plan);
      setWorkflowGoal('');
      loadExecutionsData();
    } catch (err) {
      alert(`Workflow error: ${err.message}`);
    } finally {
      setIsPlanning(false);
    }
  };

  // Skill manual execute
  const handleExecuteSkill = async (targetSkill) => {
    const sObj = typeof targetSkill === 'object' ? targetSkill : { skillId: targetSkill, name: targetSkill };
    const skillId = sObj.skillId || sObj.id || sObj.name;
    const skillName = sObj.name || skillId;
    setExecutingSkillName(skillId);
    setSkillExecutionResult(null);

    try {
      let rawParam = (skillParams[skillId] ?? skillParams[skillName] ?? '').trim();
      if (!rawParam && sObj.defaultParam) {
        rawParam = sObj.defaultParam;
      }

      let params = {};
      if (rawParam) {
        if (rawParam.startsWith('{') && rawParam.endsWith('}')) {
          try {
            params = JSON.parse(rawParam);
          } catch (pe) {
            throw new Error(`Invalid JSON parameters: ${pe.message}`);
          }
        } else {
          // Plain string fallback: auto-assign to standard parameter
          const norm = (skillId || '').toLowerCase();
          if (norm.includes('read')) {
            params = { filePath: rawParam };
          } else if (norm.includes('command') || norm.includes('shell')) {
            params = { command: rawParam };
          } else if (norm.includes('search') && !norm.includes('knowledge')) {
            params = { filePath: 'pom.xml', pattern: rawParam };
          } else if (norm.includes('knowledge')) {
            params = { query: rawParam };
          } else if (norm.includes('webhook') || norm.includes('http')) {
            params = { url: rawParam, method: 'GET' };
          } else if (norm.includes('email')) {
            params = { to: 'admin@ragnarok.ai', subject: 'Agent Alert', body: rawParam };
          } else {
            params = { input: rawParam };
          }
        }
      } else {
        // Safe default arguments if input is empty
        const norm = (skillId || '').toLowerCase();
        if (norm.includes('read')) params = { filePath: 'pom.xml' };
        else if (norm.includes('command') || norm.includes('shell')) params = { command: 'cmd.exe /c echo Hello Ragnarok Sandbox' };
        else if (norm.includes('search') && !norm.includes('knowledge')) params = { filePath: 'pom.xml', pattern: 'spring' };
        else if (norm.includes('knowledge')) params = { query: 'agent' };
        else if (norm.includes('email')) params = { to: 'admin@ragnarok.ai', subject: 'Catalog Test', body: 'Testing Skill Catalog' };
        else if (norm.includes('webhook') || norm.includes('http')) params = { url: 'http://localhost:8080/api/auth/me', method: 'GET' };
      }

      const res = await executeSkill(skillId, params);
      setSkillExecutionResult({
        skill: skillName,
        skillId: skillId,
        success: res.success !== false && !res.error,
        result: res.output ?? res.result ?? (res.error ? `Error: ${res.error}` : JSON.stringify(res, null, 2))
      });
    } catch (err) {
      setSkillExecutionResult({
        skill: skillName,
        skillId: skillId,
        success: false,
        result: err.message
      });
    } finally {
      setExecutingSkillName(null);
    }
  };

  // Save memory
  const handleSaveMemory = async (e) => {
    e.preventDefault();
    if (!memoryText.trim() || isSavingMemory) return;
    setIsSavingMemory(true);
    setMemoryFeedback(null);
    try {
      const res = await rememberMemory(sessionId, memoryText.trim(), memoryCategory);
      setMemoryFeedback({ type: 'success', text: res.status || 'Fact embedded into MariaDB Vector!' });
      setMemoryText('');
      loadBufferData();
    } catch (err) {
      setMemoryFeedback({ type: 'error', text: err.message });
    } finally {
      setIsSavingMemory(false);
    }
  };

  // Consolidate memory
  const handleConsolidate = async () => {
    setIsConsolidating(true);
    setConsolidationResult(null);
    try {
      const res = await consolidateMemories();
      setConsolidationResult(res);
      loadBufferData();
    } catch (err) {
      setConsolidationResult({ status: 'Error', message: err.message });
    } finally {
      setIsConsolidating(false);
    }
  };

  // Prune memory
  const handlePrune = async () => {
    if (!window.confirm('Prune episodic messages older than 30 days from MySQL?')) return;
    try {
      const res = await pruneMemories(30);
      alert(res.status || 'Pruned successfully');
      loadBufferData();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // Upload file
  const handleUploadFile = async (e) => {
    e.preventDefault();
    if (!selectedFile || isUploadingDoc) return;
    setIsUploadingDoc(true);
    setUploadFeedback(null);
    try {
      const res = await uploadKnowledgeDocument(selectedFile, docCategory);
      setUploadFeedback({
        type: 'success',
        text: `Indexed "${res.fileName}" into ${res.indexedChunks} semantic chunks in MariaDB Vector!`
      });
      setUploadHistory(prev => [{
        name: res.fileName,
        chunks: res.indexedChunks,
        time: new Date().toLocaleTimeString(),
        category: docCategory
      }, ...prev]);
      setSelectedFile(null);
    } catch (err) {
      setUploadFeedback({ type: 'error', text: err.message });
    } finally {
      setIsUploadingDoc(false);
    }
  };

  // Send manual email
  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!emailTo.trim() || !emailSubject.trim() || !emailBody.trim()) return;
    setIsSendingEmail(true);
    setEmailFeedback(null);
    try {
      const res = await sendManualEmail(emailTo, emailSubject, emailBody);
      setEmailFeedback({ type: 'success', text: res.status || 'Email dispatched successfully!' });
      setEmailTo('');
      setEmailSubject('');
      setEmailBody('');
    } catch (err) {
      setEmailFeedback({ type: 'error', text: err.message });
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Trigger agent sweep
  const handleTriggerSweep = async () => {
    setIsSweeping(true);
    try {
      const cards = await triggerAgentSweep();
      if (Array.isArray(cards) && cards.length > 0) {
        setSuggestions(cards);
      } else {
        await loadSuggestionsData();
      }
    } catch (err) {
      alert(`Sweep error: ${err.message}`);
    } finally {
      setIsSweeping(false);
    }
  };

  const handleAcceptSuggestion = async (card) => {
    try {
      await acceptSuggestion(card.id);
      setSuggestions(prev => prev.filter(c => c.id !== card.id));
      const actionText = card.actionPayload || card.title;
      if (actionText) {
        onSendMessage(actionText);
        setActiveTab('chat');
      }
    } catch (err) {
      alert(`Accept suggestion error: ${err.message}`);
    }
  };

  const handleDismissSuggestion = async (id) => {
    try {
      await dismissSuggestion(id);
      setSuggestions(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      alert(`Dismiss suggestion error: ${err.message}`);
    }
  };

  const displayName = currentUser?.fullName || currentUser?.email?.split('@')[0] || 'Alex Orlov';
  const userInitials = displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'AO';
  const isAdmin = currentUser?.role === 'ROLE_ADMIN';
  const connectedServicesCount = Object.values(serviceOn).filter(Boolean).length;

  const activities = [
    { time: "09:41:22", title: "Weekly research digest assembled", detail: "7 sources · Memory / Research", color: "green", icon: Brain },
    { time: "09:38:04", title: "Notion workspace indexed", detail: "142 pages · Knowledge graph", color: "cyan", icon: Database },
    { time: "09:33:18", title: "Calendar conflict detected", detail: "2 events · Needs approval", color: "amber", icon: Activity },
    { time: "09:25:51", title: "GitHub pull request reviewed", detail: "PR #284 · Engineering", color: "purple", icon: GitBranch },
  ];

  const defaultSkills = [
    { name: "Research scout", type: "Web intelligence", status: "Ready", icon: Globe2 },
    { name: "Inbox zero", type: "Email triage", status: "Ready", icon: Zap },
    { name: "Morning brief", type: "Daily ritual · 08:00", status: "Active", icon: Radio },
  ];

  return (
    <div className="console-wrap" id="dashboard" data-testid="dashboard-console">
      {/* Top Chrome Bar */}
      <Header 
        sessionId={sessionId}
        onNewSession={onNewSession}
        currentUser={currentUser}
        onLogout={onLogout}
        onReturnToLanding={onReturnToLanding}
      />

      {/* Main Console Layout */}
      <div className="console-layout">
        {/* Left Console Sidebar */}
        <aside className="console-sidebar">
          {/* User Profile */}
          <div className="side-profile">
            <div className="avatar">{userInitials}</div>
            <div>
              <strong>{displayName}</strong>
              <span>{isAdmin ? 'Owner / root access' : 'Standard User'}</span>
            </div>
            <button 
              type="button" 
              onClick={() => setIsHelpOpen(true)}
              aria-label="Profile settings"
            >
              <Settings2 size={15} />
            </button>
          </div>

          {/* Nav Label */}
          <div className="side-label">COMMAND DECK</div>

          {/* Nav Tabs */}
          <div className="side-tabs">
            {[
              { id: 'overview', label: 'Overview', icon: Network },
              { id: 'chat', label: 'AI Chat & Console', icon: MessageSquare, badge: messages.length ? `${messages.length}` : null },
              { id: 'memory', label: 'Memory well', icon: Brain },
              { id: 'tasks', label: 'Tasks & runs', icon: Terminal, badge: '3' },
              { id: 'skills', label: 'Skills catalog', icon: Sparkles },
              { id: 'suggestions', label: 'Proactive agent', icon: Compass, badge: suggestions.length ? `${suggestions.length}` : null },
              { id: 'email', label: 'Email dispatch', icon: Mail },
              { id: 'docs', label: 'Knowledge docs', icon: Database },
            ].map(({ id, label, icon: Icon, badge }) => (
              <button
                key={id}
                type="button"
                className={activeTab === id ? "side-tab active" : "side-tab"}
                onClick={() => setActiveTab(id)}
              >
                <Icon size={16} />
                <span>{label}</span>
                {badge && <b>{badge}</b>}
              </button>
            ))}
          </div>

          {/* Sidebar Footer */}
          <div className="side-footer">
            <ShieldCheck size={16} />
            <div>
              <strong>Sovereign mode</strong>
              <span>Nothing leaves this hall.</span>
            </div>
          </div>
        </aside>

        {/* Main Console Deck */}
        <main className="console-main">
          {/* Deck Header */}
          <div className="console-header">
            <div>
              <span className="eyebrow">
                {activeTab === 'overview' 
                  ? 'THURSDAY / 09:42 · TELEMETRY' 
                  : `COMMAND DECK / ${activeTab.toUpperCase()}`}
              </span>
              <h2>
                {activeTab === 'overview' && `Good morning, ${displayName.split(' ')[0]}.`}
                {activeTab === 'chat' && 'Interactive Agent Console.'}
                {activeTab === 'memory' && 'The sovereign memory well.'}
                {activeTab === 'tasks' && 'Autonomous DAG orchestration.'}
                {activeTab === 'skills' && 'Modular skill definitions.'}
                {activeTab === 'suggestions' && 'Proactive agent signals.'}
                {activeTab === 'email' && 'Autonomous email dispatch.'}
                {activeTab === 'docs' && 'Knowledge graph & vector embeddings.'}
              </h2>
              <p>
                {activeTab === 'overview' && 'Ragnarok is watching the horizon. What should we move forward?'}
                {activeTab === 'chat' && 'Live SSE streaming link to local Ollama (Llama 3.2) inference engine.'}
                {activeTab === 'memory' && 'Dual-storage architecture: MySQL short-term buffer & MariaDB native vector store.'}
                {activeTab === 'tasks' && 'Decompose complex natural language instructions into multi-step DAG task graphs.'}
                {activeTab === 'skills' && 'Built-in sandboxed tools for file reading, execution, webhooks, and knowledge retrieval.'}
                {activeTab === 'suggestions' && 'Real-time background sweep suggestions waiting for your sovereign approval.'}
                {activeTab === 'email' && 'Review AI-generated email drafts or dispatch directly via SMTP.'}
                {activeTab === 'docs' && 'Ingest TXT, MD, or PDF documents into chunked vector embeddings.'}
              </p>
            </div>
            <button 
              type="button" 
              className="icon-button" 
              onClick={() => setActiveTab('chat')} 
              title="Search / Jump to chat"
            >
              <Search size={16} />
            </button>
          </div>

          {/* Command Box (Ask Ragnarok) */}
          <div className={taskRunning ? "command-box running" : "command-box"}>
            <div className="command-top">
              <span className="command-symbol"><Sparkles size={16} /></span>
              <span>{taskRunning ? "EXECUTING LOCALLY IN CORE" : "ASK RAGNAROK"}</span>
              <kbd>⌘ K</kbd>
            </div>
            <form onSubmit={handleCommandSubmit}>
              <input 
                value={commandInput} 
                onChange={(e) => setCommandInput(e.target.value)} 
                placeholder="What should we make happen?" 
              />
              <button 
                type="button" 
                className="mic-button" 
                title="Voice command input (demo)"
                onClick={() => alert("Voice transcription hook online.")}
              >
                <Mic size={16} />
              </button>
              <button type="submit" className="send-button" aria-label="Send">
                <Send size={15} />
              </button>
            </form>
            <div className="suggestions">
              <button type="button" onClick={() => handleSuggestionClick("Prepare my morning brief")}>
                Prepare my morning brief <ArrowUpRight size={11} />
              </button>
              <button type="button" onClick={() => handleSuggestionClick("Find the loose ends from this week")}>
                Find this week&apos;s loose ends <ArrowUpRight size={11} />
              </button>
              <button type="button" onClick={() => handleSuggestionClick("Send an email summarizing project progress")}>
                Draft progress email <ArrowUpRight size={11} />
              </button>
            </div>
          </div>

          {/* Quick command stack feedback if on overview */}
          {activeTab === 'overview' && commandFeedback.length > 0 && (
            <div className="message-stack">
              {commandFeedback.slice(-2).map((msg, idx) => (
                <div className={`command-message ${msg.from}`} key={idx}>
                  <span>{msg.from === 'agent' ? 'R' : 'YOU'}</span>
                  {msg.text}
                </div>
              ))}
            </div>
          )}

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="dashboard-grid">
              {/* Activity Stream */}
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
                <button 
                  type="button" 
                  className="text-action" 
                  onClick={() => setActiveTab('tasks')}
                >
                  View execution history <ChevronRight size={14} />
                </button>
              </section>

              {/* Skills Online */}
              <section className="panel skills-panel">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">MODULAR CAPABILITIES</span>
                    <h3>Skills online</h3>
                  </div>
                  <button 
                    type="button" 
                    className="plus-button" 
                    onClick={() => setActiveTab('skills')} 
                    title="Explore Skills"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                {(skillsList.length > 0 ? skillsList.slice(0, 3) : defaultSkills).map((s) => {
                  const Icon = s.icon || Sparkles;
                  return (
                    <div className="skill-row" key={s.name}>
                      <div className="skill-icon"><Icon size={15} /></div>
                      <div>
                        <strong>{s.name}</strong>
                        <span>{s.type || s.description || 'Agent Tool'}</span>
                      </div>
                      <span className={`skill-status ${s.status === "Active" || !s.status ? "active" : ""}`}>
                        <i />{s.status || 'Ready'}
                      </span>
                    </div>
                  );
                })}
                <button 
                  type="button" 
                  className="outline-action" 
                  onClick={() => setActiveTab('skills')}
                >
                  Manage all skills <ArrowUpRight size={13} />
                </button>
              </section>

              {/* Connected Realms / Services */}
              <section className="panel services-panel">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">CONNECTED REALMS</span>
                    <h3>Your services</h3>
                  </div>
                  <span className="service-count">{connectedServicesCount} / 3</span>
                </div>
                {[
                  { id: "notion", label: "Notion", desc: "Knowledge base", icon: Database },
                  { id: "github", label: "GitHub", desc: "Code & projects", icon: GitBranch },
                  { id: "slack", label: "Slack", desc: "Team signals", icon: Radio },
                ].map(({ id, label, desc, icon: Icon }) => (
                  <div className="service-row" key={id}>
                    <div className="service-logo"><Icon size={15} /></div>
                    <div>
                      <strong>{label}</strong>
                      <span>{desc}</span>
                    </div>
                    <button 
                      type="button" 
                      className={`toggle ${serviceOn[id] ? "on" : ""}`} 
                      onClick={() => setServiceOn(st => ({ ...st, [id]: !st[id] }))}
                    >
                      <i />
                    </button>
                  </div>
                ))}
              </section>

              {/* Memory Well Visual */}
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
                  <button type="button" onClick={() => setActiveTab('memory')}>
                    Open memory <ChevronRight size={14} />
                  </button>
                </div>
              </section>
            </div>
          )}

          {/* TAB 2: AI CHAT */}
          {activeTab === 'chat' && (
            <div className="console-chat-wrapper">
              <ChatArea 
                messages={messages}
                onSendMessage={onSendMessage}
                isGenerating={isGenerating}
                onStopGeneration={onStopGeneration}
                streamingEnabled={streamingEnabled}
                setStreamingEnabled={setStreamingEnabled}
                onClearChat={onClearChat}
                sessionId={sessionId}
              />
            </div>
          )}

          {/* TAB 3: MEMORY WELL */}
          {activeTab === 'memory' && (
            <div className="view-panel">
              <div className="panel">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">MEMORY EMBEDDING ENGINE</span>
                    <h3>Embed New Memory Fact</h3>
                  </div>
                  <span className="badge-tag cyan">MariaDB Vector 3307</span>
                </div>
                <form onSubmit={handleSaveMemory} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <textarea
                    rows={3}
                    placeholder="e.g. Alex prefers markdown summaries and dark mode UI themes..."
                    value={memoryText}
                    onChange={(e) => setMemoryText(e.target.value)}
                    style={{ background: '#090b0e', border: '1px solid #282f38', color: '#eef5f3', padding: '10px', borderRadius: '3px', outline: 'none' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {['general', 'preference', 'project', 'profile'].map(cat => (
                        <button
                          key={cat}
                          type="button"
                          className={memoryCategory === cat ? 'badge-tag cyan' : 'badge-tag'}
                          onClick={() => setMemoryCategory(cat)}
                          style={{ cursor: 'pointer' }}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                    <button type="submit" className="primary-button" disabled={isSavingMemory} style={{ padding: '8px 14px' }}>
                      {isSavingMemory ? 'Embedding...' : 'Commit to Vector Store'}
                    </button>
                  </div>
                </form>
                {memoryFeedback && (
                  <div className={`auth-alert ${memoryFeedback.type}`} style={{ marginTop: '12px' }}>
                    <span>{memoryFeedback.text}</span>
                  </div>
                )}
              </div>

              {/* Maintenance & Consolidation */}
              <div className="panel">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">DUAL-MEMORY MAINTENANCE</span>
                    <h3>Consolidation & Pruning</h3>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button 
                    type="button" 
                    className="outline-action" 
                    onClick={handleConsolidate} 
                    disabled={isConsolidating}
                  >
                    <RefreshCw size={13} className={isConsolidating ? "spin" : ""} />
                    {isConsolidating ? "Consolidating with Llama 3.2..." : "Consolidate MySQL to Vector"}
                  </button>
                  <button 
                    type="button" 
                    className="outline-action" 
                    onClick={handlePrune} 
                    style={{ borderColor: 'rgba(255,112,69,0.3)', color: '#ff9171' }}
                  >
                    <Trash2 size={13} />
                    Prune Messages Older Than 30 Days
                  </button>
                </div>
                {consolidationResult && (
                  <div className="auth-alert success" style={{ marginTop: '12px' }}>
                    <span>Consolidation complete: {JSON.stringify(consolidationResult)}</span>
                  </div>
                )}
              </div>

              {/* Buffer History */}
              <div className="panel">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">SHORT-TERM CONVERSATION BUFFER</span>
                    <h3>Session Messages ({sessionId})</h3>
                  </div>
                </div>
                {bufferHistory.length === 0 ? (
                  <p style={{ color: '#687483', fontSize: '12px' }}>No messages recorded yet in this session.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                    {bufferHistory.map((m, idx) => (
                      <div key={idx} style={{ background: '#0a0d11', padding: '8px 12px', borderLeft: `2px solid ${m.role === 'USER' ? 'var(--orange)' : 'var(--cyan)'}`, borderRadius: '2px', fontSize: '12px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#6a7888', marginRight: '8px' }}>[{m.role}]</span>
                        <span style={{ color: '#cfd7e1' }}>{m.content}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: TASKS & RUNS (WORKFLOW PLANNER) */}
          {activeTab === 'tasks' && (
            <div className="view-panel">
              <div className="panel">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">DAG WORKFLOW ORCHESTRATOR</span>
                    <h3>Decompose & Execute Goal</h3>
                  </div>
                  <span className="badge-tag green">Ollama Llama 3.2</span>
                </div>
                <form onSubmit={handleRunWorkflow} style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="e.g. Scan project files, summarize findings, and write report..."
                    value={workflowGoal}
                    onChange={(e) => setWorkflowGoal(e.target.value)}
                    style={{ flex: 1, background: '#090b0e', border: '1px solid #282f38', color: '#eef5f3', padding: '10px 14px', borderRadius: '3px', outline: 'none' }}
                  />
                  <button type="submit" className="primary-button" disabled={isPlanning}>
                    {isPlanning ? 'Orchestrating...' : 'Plan & Run'}
                  </button>
                </form>
              </div>

              {/* Current Active Plan */}
              {currentPlan && (
                <div className="panel" style={{ borderLeft: '3px solid var(--cyan)' }}>
                  <div className="panel-heading">
                    <div>
                      <span className="eyebrow">ACTIVE EXECUTION PLAN</span>
                      <h3>{currentPlan.goal}</h3>
                    </div>
                    <span className={`badge-tag ${currentPlan.status === 'COMPLETED' ? 'green' : 'cyan'}`}>
                      {currentPlan.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                    {currentPlan.steps?.map((step, idx) => (
                      <div key={idx} style={{ background: '#0a0d11', padding: '10px', borderRadius: '3px', border: '1px solid #1f252e' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <strong style={{ fontSize: '12px', color: 'var(--cyan)' }}>Step {step.stepNumber}: {step.skillName}</strong>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: step.status === 'COMPLETED' ? 'var(--green)' : '#99a6b5' }}>
                            {step.status}
                          </span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#9faab7' }}>{step.description}</p>
                        {step.result && (
                          <pre style={{ marginTop: '6px', background: '#050709', padding: '6px', fontSize: '11px', color: '#89e3cf', overflowX: 'auto', borderRadius: '2px' }}>
                            {step.result}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Workflow Execution Records */}
              <div className="panel">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">EXECUTION ARCHIVE</span>
                    <h3>Recent Workflow Runs</h3>
                  </div>
                </div>
                {workflowExecutions.length === 0 ? (
                  <p style={{ color: '#687483', fontSize: '12px' }}>No previous workflow executions recorded.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {workflowExecutions.slice(0, 5).map((rec) => (
                      <div key={rec.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0a0d11', padding: '10px 14px', borderRadius: '3px', border: '1px solid #1f252e' }}>
                        <div>
                          <strong style={{ fontSize: '12px', color: '#e1e8ef' }}>{rec.goal}</strong>
                          <div style={{ fontSize: '10px', color: '#687483', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                            ID: {rec.id} · Steps: {rec.stepCount} · {new Date(rec.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span className={`badge-tag ${rec.status === 'COMPLETED' ? 'green' : 'orange'}`}>
                            {rec.status}
                          </span>
                          {rec.status === 'FAILED' && (
                            <button 
                              type="button" 
                              onClick={() => retryWorkflow(rec.id).then(loadExecutionsData)}
                              className="icon-button"
                              title="Retry workflow"
                            >
                              <RotateCcw size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: SKILLS CATALOG */}
          {activeTab === 'skills' && (
            <div className="view-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', color: '#fff', fontWeight: 600 }}>Active Agent Skill Catalog</h3>
                  <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#8899a6' }}>
                    Sandboxed tools executable manually or orchestrated autonomously by the DAG workflow engine.
                  </p>
                </div>
                <button
                  type="button"
                  className="outline-action"
                  onClick={loadSkillsData}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0, padding: '4px 10px', fontSize: '11px' }}
                >
                  <RefreshCw size={12} />
                  Refresh Catalog
                </button>
              </div>

              <div className="card-grid">
                {(skillsList.length > 0 ? skillsList : DEFAULT_SKILLS).map((s) => {
                  const sId = s.skillId || s.id || s.name;
                  const sName = s.name || sId;
                  const currentVal = skillParams[sId] ?? skillParams[sName] ?? '';
                  const sampleVal = s.defaultParam || (
                    sId.includes('read') ? '{"filePath": "pom.xml"}' :
                    sId.includes('write') ? '{"filePath": "sandbox_notes.txt", "content": "Sample"}' :
                    sId.includes('search') && !sId.includes('knowledge') ? '{"filePath": "pom.xml", "pattern": "spring"}' :
                    sId.includes('shell') ? '{"command": "cmd.exe /c echo Hello"}' :
                    sId.includes('knowledge') ? '{"query": "architecture"}' :
                    sId.includes('email') ? '{"to": "admin@ragnarok.ai", "subject": "Notice", "body": "Alert"}' :
                    '{"url": "http://localhost:8080/api/auth/me"}'
                  );

                  return (
                    <div className="deck-card" key={sId}>
                      <div className="deck-card-header">
                        <div>
                          <h4 style={{ margin: 0 }}>{sName}</h4>
                          <code style={{ fontSize: '10px', color: '#7dd3fc', opacity: 0.85 }}>{sId}</code>
                        </div>
                        <span className="badge-tag cyan">{s.type || (sId.includes('file') ? 'IO' : sId.includes('shell') ? 'System' : sId.includes('knowledge') ? 'RAG' : sId.includes('email') ? 'Alert' : 'Tool')}</span>
                      </div>
                      <p style={{ minHeight: '34px', fontSize: '12px', color: '#94a3b8' }}>
                        {s.description || 'Autonomous capability callable in DAG execution chains.'}
                      </p>
                      
                      <div style={{ marginTop: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '10px', color: '#8899a6', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Parameters (JSON or Value):
                          </span>
                          <button
                            type="button"
                            onClick={() => setSkillParams(p => ({ ...p, [sId]: sampleVal, [sName]: sampleVal }))}
                            style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '10px', cursor: 'pointer', padding: 0 }}
                          >
                            Fill Sample
                          </button>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="text"
                            placeholder={sampleVal}
                            value={currentVal}
                            onChange={(e) => setSkillParams(p => ({ ...p, [sId]: e.target.value, [sName]: e.target.value }))}
                            style={{ flex: 1, background: '#07090c', border: '1px solid #232a33', color: '#cad5e2', fontSize: '11px', padding: '5px 8px', borderRadius: '3px', outline: 'none' }}
                          />
                          <button
                            type="button"
                            className="outline-action"
                            style={{ margin: 0, padding: '5px 12px', fontSize: '11px', fontWeight: 600 }}
                            onClick={() => handleExecuteSkill(s)}
                            disabled={executingSkillName === sId}
                          >
                            {executingSkillName === sId ? 'Running...' : 'Execute'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {skillExecutionResult && (
                <div className="panel" style={{ marginTop: '16px' }}>
                  <div className="panel-heading">
                    <div>
                      <span className="eyebrow">SKILL OUTPUT TRACE</span>
                      <h3>Result for {skillExecutionResult.skill} ({skillExecutionResult.skillId})</h3>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`badge-tag ${skillExecutionResult.success ? 'green' : 'orange'}`}>
                        {skillExecutionResult.success ? 'Success' : 'Error'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSkillExecutionResult(null)}
                        style={{ background: 'none', border: 'none', color: '#8899a6', fontSize: '11px', cursor: 'pointer' }}
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <pre style={{ background: '#050709', padding: '12px', borderRadius: '4px', color: skillExecutionResult.success ? '#9ff5e1' : '#fca5a5', fontSize: '12px', overflowX: 'auto', maxHeight: '320px', lineHeight: '1.45', border: '1px solid #1a222d' }}>
                    {typeof skillExecutionResult.result === 'object' ? JSON.stringify(skillExecutionResult.result, null, 2) : skillExecutionResult.result}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: PROACTIVE AGENT */}
          {activeTab === 'suggestions' && (
            <div className="view-panel">
              <div className="panel">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">BACKGROUND SWEEP ENGINE</span>
                    <h3>Autonomous Recommendations</h3>
                  </div>
                  <button 
                    type="button" 
                    className="outline-action" 
                    onClick={handleTriggerSweep} 
                    disabled={isSweeping}
                    style={{ margin: 0 }}
                  >
                    <RefreshCw size={12} className={isSweeping ? "spin" : ""} />
                    {isSweeping ? 'Sweeping System...' : 'Trigger Proactive Sweep'}
                  </button>
                </div>
                {suggestions.length === 0 ? (
                  <p style={{ color: '#687483', fontSize: '12px' }}>No pending suggestions. Trigger a sweep to evaluate loose ends.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                    {suggestions.map((card) => (
                      <div key={card.id} style={{ background: '#0a0d11', padding: '12px 14px', borderRadius: '3px', border: '1px solid #1f252e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ fontSize: '13px', color: '#eef5f7' }}>{card.title}</strong>
                          <p style={{ fontSize: '11px', color: '#8895a4', margin: '4px 0 0' }}>{card.description}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            className="primary-button"
                            style={{ padding: '6px 12px', fontSize: '10px' }}
                            onClick={() => handleAcceptSuggestion(card)}
                          >
                            Accept & Run
                          </button>
                          <button
                            type="button"
                            className="outline-action"
                            style={{ margin: 0, padding: '6px 10px', fontSize: '10px' }}
                            onClick={() => handleDismissSuggestion(card.id)}
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 7: EMAIL DISPATCH */}
          {activeTab === 'email' && (
            <div className="view-panel">
              <div className="panel">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">SMTP DISPATCH CENTER</span>
                    <h3>Send Manual Email</h3>
                  </div>
                  <span className="badge-tag cyan">SMTP Gateway</span>
                </div>
                <form onSubmit={handleSendEmail} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input
                    type="email"
                    placeholder="Recipient email (e.g. colleague@example.com)"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    required
                    style={{ background: '#090b0e', border: '1px solid #282f38', color: '#eef5f3', padding: '10px', borderRadius: '3px', outline: 'none' }}
                  />
                  <input
                    type="text"
                    placeholder="Subject line"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    required
                    style={{ background: '#090b0e', border: '1px solid #282f38', color: '#eef5f3', padding: '10px', borderRadius: '3px', outline: 'none' }}
                  />
                  <textarea
                    rows={4}
                    placeholder="Message content..."
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    required
                    style={{ background: '#090b0e', border: '1px solid #282f38', color: '#eef5f3', padding: '10px', borderRadius: '3px', outline: 'none' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="primary-button" disabled={isSendingEmail}>
                      {isSendingEmail ? 'Dispatching...' : 'Dispatch Email'}
                    </button>
                  </div>
                </form>
                {emailFeedback && (
                  <div className={`auth-alert ${emailFeedback.type}`} style={{ marginTop: '12px' }}>
                    <span>{emailFeedback.text}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 8: KNOWLEDGE DOCS */}
          {activeTab === 'docs' && (
            <div className="view-panel">
              <div className="panel">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">RAG INGESTION PIPELINE</span>
                    <h3>Upload & Embed Documents</h3>
                  </div>
                  <span className="badge-tag green">MariaDB Vector 3307</span>
                </div>
                <form onSubmit={handleUploadFile} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ border: '2px dashed #28303a', padding: '24px', textAlign: 'center', borderRadius: '4px', background: '#0a0d11' }}>
                    <input
                      type="file"
                      accept=".txt,.md,.pdf"
                      onChange={(e) => setSelectedFile(e.target.files[0])}
                      style={{ color: '#8896a6', fontSize: '12px' }}
                    />
                    <p style={{ color: '#556170', fontSize: '11px', marginTop: '8px' }}>
                      Supports TXT, Markdown (.md), and PDF documentation files.
                    </p>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {['general', 'architecture', 'personal', 'engineering'].map(c => (
                        <button
                          key={c}
                          type="button"
                          className={docCategory === c ? 'badge-tag cyan' : 'badge-tag'}
                          onClick={() => setDocCategory(c)}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                    <button type="submit" className="primary-button" disabled={!selectedFile || isUploadingDoc}>
                      {isUploadingDoc ? 'Chunking & Ingesting...' : 'Upload & Embed'}
                    </button>
                  </div>
                </form>
                {uploadFeedback && (
                  <div className={`auth-alert ${uploadFeedback.type}`} style={{ marginTop: '12px' }}>
                    <span>{uploadFeedback.text}</span>
                  </div>
                )}
              </div>

              {/* Upload History */}
              {uploadHistory.length > 0 && (
                <div className="panel">
                  <div className="panel-heading">
                    <div>
                      <span className="eyebrow">INGESTION HISTORY</span>
                      <h3>Indexed Knowledge Sources</h3>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {uploadHistory.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', background: '#090c0f', padding: '8px 12px', borderRadius: '3px', border: '1px solid #1c222a', fontSize: '12px' }}>
                        <div>
                          <strong style={{ color: '#eef3f7' }}>{item.name}</strong>
                          <span style={{ color: '#687483', marginLeft: '8px', fontSize: '10px' }}>({item.category})</span>
                        </div>
                        <span className="badge-tag cyan">{item.chunks} chunks · {item.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Console Bottom Tip */}
          <div className="console-bottom">
            <span>
              <span className="keyboard-light" /> 
              Tip: Ragnarok sovereign agent runs 100% locally with private hardware memory.
            </span>
            <button type="button" onClick={() => setIsHelpOpen(true)}>
              Need help?
            </button>
          </div>
        </main>
      </div>

      {/* Help & System Architecture Modal */}
      {isHelpOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'grid', placeItems: 'center', padding: '20px' }}>
          <div className="panel" style={{ maxWidth: '500px', width: '100%', background: '#0f1217', border: '1px solid #303943', boxShadow: '0 20px 80px rgba(0,0,0,0.8)' }}>
            <div className="panel-heading">
              <div>
                <span className="eyebrow">SYSTEM DIRECTIVE</span>
                <h3>Ragnarok Architecture</h3>
              </div>
              <button 
                type="button" 
                className="icon-button" 
                onClick={() => setIsHelpOpen(false)}
              >
                ✕
              </button>
            </div>
            <div style={{ fontSize: '13px', color: '#9aa5b2', lineHeight: '1.7', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p>
                <strong>Dual-Memory:</strong> MySQL (:3306) holds episodic session dialogue. MariaDB Native Vector (:3307) embeds long-term semantic knowledge chunks.
              </p>
              <p>
                <strong>Local LLM:</strong> Spring AI coordinates local Ollama Llama 3.2 for chat streaming and DAG workflow decomposition.
              </p>
              <p>
                <strong>Sovereign Privacy:</strong> Zero cloud telemetry. Everything stays inside this hall.
              </p>
            </div>
            <button 
              type="button" 
              className="primary-button" 
              style={{ width: '100%', justifyContent: 'center', marginTop: '18px' }}
              onClick={() => setIsHelpOpen(false)}
            >
              Close Manual
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

