import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Plus, 
  BrainCircuit, 
  FileText, 
  History, 
  Upload, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Database,
  RefreshCw,
  Clock,
  Wrench,
  Sparkles,
  Play,
  Check,
  X,
  Compass,
  ArrowRight,
  Mail,
  Send
} from 'lucide-react';
import { 
  rememberMemory, 
  uploadKnowledgeDocument, 
  getSessionHistory, 
  clearSessionMemory,
  fetchSessions,
  deleteSession,
  fetchSkills,
  executeSkill,
  generateWorkflowPlan,
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

export default function Sidebar({ 
  sessionId, 
  onSelectSession, 
  onNewSession, 
  onSendSuggestedPrompt,
  refreshTrigger 
}) {
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' | 'skills' | 'suggestions' | 'docs' | 'memory' | 'history' | 'email'

  // Multi-chat sessions state
  const [sessions, setSessions] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // Email state
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState(null);
  const [emailLogs, setEmailLogs] = useState([]);

  // Skills & Workflow state
  const [skills, setSkills] = useState([]);
  const [workflowGoal, setWorkflowGoal] = useState('');
  const [isPlanning, setIsPlanning] = useState(false);
  const [planningElapsed, setPlanningElapsed] = useState(0);
  const [planningStageMessage, setPlanningStageMessage] = useState('Initializing task planner...');
  const [currentPlan, setCurrentPlan] = useState(null);
  const [workflowExecutions, setWorkflowExecutions] = useState([]);

  // Timer effect for workflow processing animation
  useEffect(() => {
    let timer = null;
    let messageCycle = null;

    if (isPlanning) {
      setPlanningElapsed(0);
      const stageMessages = [
        "Decomposing goal into DAG task graph with Ollama (llama3.2)...",
        "Formulating parameters matching registered skill schemas...",
        "Executing sandboxed skills (FileRead, FileWrite, ShellCommand)...",
        "Validating step execution outputs & checking error reflection...",
        "Committing execution state & checkpoints to MySQL..."
      ];
      let msgIdx = 0;
      setPlanningStageMessage(stageMessages[0]);

      timer = setInterval(() => {
        setPlanningElapsed(prev => prev + 1);
      }, 1000);

      messageCycle = setInterval(() => {
        msgIdx = (msgIdx + 1) % stageMessages.length;
        setPlanningStageMessage(stageMessages[msgIdx]);
      }, 3000);
    } else {
      setPlanningElapsed(0);
    }

    return () => {
      if (timer) clearInterval(timer);
      if (messageCycle) clearInterval(messageCycle);
    };
  }, [isPlanning]);

  // Proactive suggestions state
  const [suggestions, setSuggestions] = useState([]);
  const [isSweeping, setIsSweeping] = useState(false);

  // Memory & Consolidation state
  const [memoryText, setMemoryText] = useState('');
  const [memoryCategory, setMemoryCategory] = useState('preference');
  const [isSavingMemory, setIsSavingMemory] = useState(false);
  const [memoryFeedback, setMemoryFeedback] = useState(null);
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [consolidationResult, setConsolidationResult] = useState(null);

  // Document upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [docCategory, setDocCategory] = useState('general');
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState(null);
  const [uploadHistory, setUploadHistory] = useState([]);

  // Short-term buffer state
  const [bufferMessages, setBufferMessages] = useState([]);
  const [isLoadingBuffer, setIsLoadingBuffer] = useState(false);
  const [isClearingBuffer, setIsClearingBuffer] = useState(false);

  // Fetch sessions on mount and when refreshTrigger fires
  useEffect(() => {
    loadSessions();
  }, [refreshTrigger, sessionId]);

  // Load contextual data based on active tab
  useEffect(() => {
    if (activeTab === 'skills') {
      loadSkills();
      loadExecutions();
    } else if (activeTab === 'suggestions') {
      loadSuggestions();
    } else if (activeTab === 'history') {
      loadBufferHistory();
    }
  }, [activeTab, sessionId, refreshTrigger]);

  const loadSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const data = await fetchSessions();
      setSessions(data || []);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const loadSkills = async () => {
    try {
      const list = await fetchSkills();
      setSkills(list || []);
    } catch (err) {
      console.error('Failed to load skills:', err);
    }
  };

  const loadExecutions = async () => {
    try {
      const execs = await fetchWorkflowExecutions();
      setWorkflowExecutions(execs || []);
    } catch (err) {
      console.error('Failed to load executions:', err);
    }
  };

  const loadSuggestions = async () => {
    try {
      const list = await fetchSuggestions();
      setSuggestions(list || []);
    } catch (err) {
      console.error('Failed to load suggestions:', err);
    }
  };

  const loadBufferHistory = async () => {
    setIsLoadingBuffer(true);
    try {
      const records = await getSessionHistory(sessionId);
      setBufferMessages(records || []);
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setIsLoadingBuffer(false);
    }
  };

  const handleDeleteSession = async (e, sid) => {
    e.stopPropagation();
    e.preventDefault();
    if (!window.confirm(`Delete chat session "${sid}" and all its history?`)) return;

    try {
      await deleteSession(sid);
      setSessions(prev => prev.filter(s => s.sessionId !== sid));
      if (sid === sessionId) {
        onNewSession();
      } else {
        loadSessions();
      }
    } catch (err) {
      console.error('Delete session error:', err);
      alert(`Error deleting session: ${err.message}`);
      loadSessions();
    }
  };

  const handleSaveMemory = async (e) => {
    e.preventDefault();
    if (!memoryText.trim()) return;

    setIsSavingMemory(true);
    setMemoryFeedback(null);
    try {
      const res = await rememberMemory(sessionId, memoryText.trim(), memoryCategory);
      setMemoryFeedback({ type: 'success', text: res.status || 'Fact embedded into MariaDB Vector!' });
      setMemoryText('');
    } catch (err) {
      setMemoryFeedback({ type: 'error', text: err.message });
    } finally {
      setIsSavingMemory(false);
    }
  };

  const handleConsolidateMemories = async () => {
    setIsConsolidating(true);
    setConsolidationResult(null);
    try {
      const res = await consolidateMemories();
      setConsolidationResult(res);
    } catch (err) {
      setConsolidationResult({ status: 'Error', message: err.message });
    } finally {
      setIsConsolidating(false);
    }
  };

  const handlePruneMemories = async () => {
    if (!window.confirm('Prune episodic chat messages older than 30 days from MySQL?')) return;
    try {
      const res = await pruneMemories(30);
      alert(res.status || 'Pruned successfully');
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

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

  const handlePlanAndExecuteWorkflow = async (e) => {
    e.preventDefault();
    if (!workflowGoal.trim()) return;

    setIsPlanning(true);
    setCurrentPlan(null);
    try {
      const plan = await executeWorkflow(workflowGoal.trim());
      setCurrentPlan(plan);
      loadExecutions();
      setWorkflowGoal('');
    } catch (err) {
      alert(`Workflow execution error: ${err.message}`);
    } finally {
      setIsPlanning(false);
    }
  };

  const handleTriggerSweep = async () => {
    setIsSweeping(true);
    try {
      const newCards = await triggerAgentSweep();
      setSuggestions(newCards || []);
    } catch (err) {
      alert(`Sweep failed: ${err.message}`);
    } finally {
      setIsSweeping(false);
    }
  };

  const handleAcceptSuggestion = async (card) => {
    try {
      await acceptSuggestion(card.id);
      setSuggestions(prev => prev.filter(c => c.id !== card.id));
      if (onSendSuggestedPrompt) {
        onSendSuggestedPrompt(card.actionPayload || card.title);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDismissSuggestion = async (id) => {
    try {
      await dismissSuggestion(id);
      setSuggestions(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearCurrentSession = async () => {
    if (!window.confirm(`Wipe short-term message buffer for session "${sessionId}"?`)) return;

    setIsClearingBuffer(true);
    try {
      await clearSessionMemory(sessionId);
      setBufferMessages([]);
      loadSessions();
    } catch (err) {
      alert(`Error clearing session: ${err.message}`);
    } finally {
      setIsClearingBuffer(false);
    }
  };

  const formatTimestamp = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const handleSidebarSendEmail = async (e) => {
    e.preventDefault();
    if (!emailTo.trim() || !emailBody.trim()) return;

    setIsSendingEmail(true);
    setEmailFeedback(null);
    try {
      const res = await sendManualEmail(emailTo.trim(), emailSubject.trim() || '(No Subject)', emailBody.trim(), sessionId);
      setEmailFeedback({
        type: 'success',
        text: `Email dispatched to ${emailTo.trim()} via Gmail SMTP!`
      });
      setEmailLogs(prev => [{
        to: emailTo.trim(),
        subject: emailSubject.trim() || '(No Subject)',
        time: new Date().toLocaleTimeString(),
        status: 'SUCCESS'
      }, ...prev]);
      setEmailTo('');
      setEmailSubject('');
      setEmailBody('');
    } catch (err) {
      setEmailFeedback({ type: 'error', text: err.message || 'Failed to dispatch email' });
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <aside className="sidebar">
      {/* Tab Navigation */}
      <div className="sidebar-tabs" style={{ flexWrap: 'wrap' }}>
        <button
          className={`sidebar-tab-btn ${activeTab === 'chats' ? 'active' : ''}`}
          onClick={() => setActiveTab('chats')}
          title="Multi-chat session list"
        >
          <MessageSquare size={13} />
          Chats ({sessions.length})
        </button>
        <button
          className={`sidebar-tab-btn ${activeTab === 'skills' ? 'active' : ''}`}
          onClick={() => setActiveTab('skills')}
          title="FR2/FR3 Modular Skills and Autonomous Workflows"
        >
          <Wrench size={13} />
          Workflows
        </button>
        <button
          className={`sidebar-tab-btn ${activeTab === 'email' ? 'active' : ''}`}
          onClick={() => setActiveTab('email')}
          title="Manual Email Dispatcher & Gmail SMTP"
        >
          <Mail size={13} color="var(--accent-cyan)" />
          Email
        </button>
        <button
          className={`sidebar-tab-btn ${activeTab === 'suggestions' ? 'active' : ''}`}
          onClick={() => setActiveTab('suggestions')}
          title="FR4.2 Proactive Suggestions"
        >
          <Sparkles size={13} color="var(--accent-cyan)" />
          Suggestions {suggestions.length > 0 && `(${suggestions.length})`}
        </button>
        <button
          className={`sidebar-tab-btn ${activeTab === 'docs' ? 'active' : ''}`}
          onClick={() => setActiveTab('docs')}
          title="RAG Document Ingestion"
        >
          <FileText size={13} />
          Docs
        </button>
        <button
          className={`sidebar-tab-btn ${activeTab === 'memory' ? 'active' : ''}`}
          onClick={() => setActiveTab('memory')}
          title="FR1 Persistent & Semantic Memory"
        >
          <BrainCircuit size={13} />
          Memory
        </button>
        <button
          className={`sidebar-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
          title="MySQL Conversational Buffer"
        >
          <History size={13} />
          Buffer
        </button>
      </div>

      <div className="sidebar-content">
        {/* Tab 1: Multi-Chat Session List */}
        {activeTab === 'chats' && (
          <div>
            <button className="new-chat-btn" onClick={onNewSession}>
              <Plus size={16} />
              New Chat Session
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                PREVIOUS SESSIONS
              </span>
              <button 
                className="session-action-btn" 
                onClick={loadSessions} 
                title="Refresh sessions list"
              >
                <RefreshCw size={12} className={isLoadingSessions ? 'spin' : ''} />
              </button>
            </div>

            <div className="sessions-container">
              {sessions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 10px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  No saved sessions. Click "New Chat Session" to start one!
                </div>
              ) : (
                sessions.map((s) => (
                  <div
                    key={s.id || s.sessionId}
                    className={`session-item ${s.sessionId === sessionId ? 'active' : ''}`}
                    onClick={() => onSelectSession(s.sessionId)}
                  >
                    <div className="session-item-left">
                      <div className="session-item-title" title={s.title || s.sessionId}>
                        <MessageSquare size={13} color={s.sessionId === sessionId ? 'var(--accent-cyan)' : 'var(--accent-indigo)'} />
                        <span>{s.title || s.sessionId}</span>
                      </div>
                      <div className="session-item-meta">
                        <Clock size={10} />
                        <span>{formatTimestamp(s.updatedAt || s.createdAt)}</span>
                        {s.sessionId === sessionId && (
                          <span style={{ marginLeft: '4px', color: 'var(--accent-cyan)', fontWeight: 600 }}>Active</span>
                        )}
                      </div>
                    </div>

                    <button
                      className="session-delete-btn"
                      onClick={(e) => handleDeleteSession(e, s.sessionId)}
                      title="Delete session"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Workflows & Modular Skills (FR2 & FR3) */}
        {activeTab === 'skills' && (
          <div>
            <div className="sidebar-section-header">
              <Wrench size={16} color="var(--accent-cyan)" />
              <h3>Autonomous Workflow Orchestrator</h3>
            </div>
            <p className="sidebar-desc">
              Break down high-level goals into multi-step DAG task plans with self-correcting error reflection.
            </p>

            <form onSubmit={handlePlanAndExecuteWorkflow} style={{ marginBottom: '16px' }}>
              <div className="form-group">
                <label className="form-label">Goal or Initiative</label>
                <textarea
                  className="form-input form-textarea"
                  placeholder="e.g. Read sample_notes.txt and summarize key architecture into new file summary.txt"
                  value={workflowGoal}
                  onChange={(e) => setWorkflowGoal(e.target.value)}
                  rows={2}
                  disabled={isPlanning}
                />
              </div>

              <button type="submit" className="btn-primary" disabled={isPlanning || !workflowGoal.trim()}>
                <Play size={14} />
                {isPlanning ? 'Planning & Executing (Ollama)...' : 'Plan & Execute Goal'}
              </button>
            </form>

            {isPlanning && (
              <div className="workflow-processing-card">
                <div className="processing-header">
                  <div className="processing-badge">
                    <RefreshCw size={14} className="spin" color="var(--accent-cyan)" />
                    <span>Workflow Orchestrator Running</span>
                  </div>
                  <span className="processing-timer">{planningElapsed}s elapsed</span>
                </div>
                <div className="processing-message">
                  <Sparkles size={14} color="var(--accent-amber)" />
                  <span>{planningStageMessage}</span>
                </div>
                <div className="progress-bar-container">
                  <div className="progress-bar-fill"></div>
                </div>
                <div className="processing-steps-hint">
                  <div>• Decomposing goal into DAG task graph with Ollama (llama3.2)</div>
                  <div>• Dispatching to sandboxed tool executor (30s timeout guard)</div>
                  <div>• Evaluating execution outputs & reflection checkpoints</div>
                </div>
              </div>
            )}

            {currentPlan && (
              <div style={{ background: 'rgba(6, 182, 212, 0.08)', border: '1px solid var(--accent-cyan)', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#fff' }}>Plan: {currentPlan.planId}</span>
                  <span className={`workflow-step-badge ${currentPlan.overallStatus.toLowerCase()}`}>
                    {currentPlan.overallStatus}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  {currentPlan.summary}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {currentPlan.steps.map((st, i) => (
                    <div key={i} style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>{st.stepId} ({st.skillId})</span>
                        <span className={`workflow-step-badge ${st.status.toLowerCase()}`}>{st.status}</span>
                      </div>
                      <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>{st.description}</div>
                      {st.output && (
                        <div style={{ color: '#10b981', marginTop: '4px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
                          ✓ Out: {st.output.slice(0, 120)}...
                        </div>
                      )}
                      {st.error && (
                        <div style={{ color: '#f43f5e', marginTop: '4px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
                          ✕ Err: {st.error.slice(0, 140)}...
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {currentPlan.overallStatus === 'FAILED' && (
                  <button
                    className="btn-outline"
                    style={{ width: '100%', marginTop: '10px', fontSize: '0.75rem', borderColor: 'var(--accent-rose)', color: 'var(--accent-rose)' }}
                    onClick={async () => {
                      setIsPlanning(true);
                      try {
                        const updated = await retryWorkflow(currentPlan.planId);
                        setCurrentPlan(updated);
                        loadExecutions();
                      } catch (err) {
                        alert(`Retry error: ${err.message}`);
                      } finally {
                        setIsPlanning(false);
                      }
                    }}
                    disabled={isPlanning}
                  >
                    <RefreshCw size={12} className={isPlanning ? 'spin' : ''} />
                    Retry / Self-Correct Workflow
                  </button>
                )}
              </div>
            )}

            <div style={{ marginTop: '16px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                REGISTERED AGENT SKILLS ({skills.length})
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                {skills.map((sk) => (
                  <div key={sk.skillId} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.8rem', color: '#fff' }}>{sk.name}</span>
                      <code style={{ fontSize: '0.68rem', color: 'var(--accent-indigo)' }}>{sk.skillId}</code>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                      {sk.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Proactive Suggestions (FR4.2) */}
        {activeTab === 'suggestions' && (
          <div>
            <div className="sidebar-section-header">
              <Sparkles size={16} color="var(--accent-cyan)" />
              <h3>Contextual Proactivity</h3>
            </div>
            <p className="sidebar-desc">
              Ragnarok autonomously correlates long-term project commitments and generates actionable suggestions.
            </p>

            <button 
              className="btn-outline" 
              style={{ width: '100%', marginBottom: '14px' }} 
              onClick={handleTriggerSweep}
              disabled={isSweeping}
            >
              <RefreshCw size={13} className={isSweeping ? 'spin' : ''} />
              {isSweeping ? 'Sweeping Semantic Memory...' : 'Trigger Proactive Sweep'}
            </button>

            {suggestions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 10px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                No pending suggestions. Click "Trigger Proactive Sweep" to analyze memory commitments!
              </div>
            ) : (
              suggestions.map((card) => (
                <div key={card.id} className="suggestion-card">
                  <div className="suggestion-title">
                    <Compass size={14} color="var(--accent-cyan)" />
                    <span>{card.title}</span>
                  </div>
                  <div className="suggestion-desc">{card.description}</div>
                  <div className="suggestion-actions">
                    <button 
                      className="btn-primary" 
                      style={{ padding: '6px 12px', fontSize: '0.75rem', flex: 1 }}
                      onClick={() => handleAcceptSuggestion(card)}
                    >
                      <span>Accept / Execute</span>
                      <ArrowRight size={12} />
                    </button>
                    <button 
                      className="btn-outline" 
                      style={{ padding: '6px 10px' }}
                      onClick={() => handleDismissSuggestion(card.id)}
                      title="Dismiss"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 4: Document Ingestion (RAG) */}
        {activeTab === 'docs' && (
          <div>
            <div className="sidebar-section-header">
              <Upload size={16} color="var(--accent-cyan)" />
              <h3>Ingest RAG Documents</h3>
            </div>
            <p className="sidebar-desc">
              Upload documents (PDF, TXT, MD). Chunks are embedded with <code>nomic-embed-text</code> and stored into MariaDB Vector.
            </p>

            <form onSubmit={handleFileUpload}>
              <div className="form-group">
                <label className="form-label">Select Document</label>
                <div 
                  className={`file-dropzone ${selectedFile ? 'has-file' : ''}`}
                  onClick={() => document.getElementById('file-upload-input').click()}
                >
                  <FileText size={24} color={selectedFile ? 'var(--accent-emerald)' : 'var(--text-muted)'} />
                  <span style={{ fontSize: '0.8rem', color: selectedFile ? '#fff' : 'var(--text-secondary)' }}>
                    {selectedFile ? selectedFile.name : 'Click to select PDF, TXT or MD'}
                  </span>
                  <input 
                    id="file-upload-input" 
                    type="file" 
                    accept=".pdf,.txt,.md" 
                    style={{ display: 'none' }}
                    onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select 
                  className="form-input" 
                  value={docCategory} 
                  onChange={(e) => setDocCategory(e.target.value)}
                >
                  <option value="general">General Knowledge</option>
                  <option value="algorithms">Algorithms & Data Structures</option>
                  <option value="architecture">Architecture & Systems</option>
                  <option value="personal">Personal Notes</option>
                </select>
              </div>

              <button 
                type="submit" 
                className="btn-primary" 
                disabled={!selectedFile || isUploadingDoc}
              >
                {isUploadingDoc ? 'Chunking & Embedding...' : 'Ingest Document to MariaDB Vector'}
              </button>
            </form>

            {uploadFeedback && (
              <div className={`feedback-alert ${uploadFeedback.type === 'success' ? 'success' : 'error'}`} style={{ marginTop: '14px' }}>
                {uploadFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{uploadFeedback.text}</span>
              </div>
            )}

            {uploadHistory.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>RECENTLY INDEXED</span>
                <div className="item-list" style={{ marginTop: '8px' }}>
                  {uploadHistory.map((h, i) => (
                    <div key={i} className="history-item">
                      <div className="history-item-header">
                        <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{h.name}</span>
                        <span>{h.time}</span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {h.chunks} semantic chunks | Category: {h.category}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Long-Term Memory & Consolidation (FR1) */}
        {activeTab === 'memory' && (
          <div>
            <div className="sidebar-section-header">
              <BrainCircuit size={16} color="var(--accent-indigo)" />
              <h3>Persistent Semantic Memory</h3>
            </div>
            <p className="sidebar-desc">
              Store durable facts, preferences, or rules into MariaDB Vector (Port 3307).
            </p>

            <form onSubmit={handleSaveMemory}>
              <div className="form-group">
                <label className="form-label">Permanent Fact or Preference</label>
                <textarea 
                  className="form-input form-textarea" 
                  placeholder="e.g. Always format complex algorithms with Big-O time complexity and code examples."
                  rows={3}
                  value={memoryText}
                  onChange={(e) => setMemoryText(e.target.value)}
                  disabled={isSavingMemory}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select 
                  className="form-input" 
                  value={memoryCategory} 
                  onChange={(e) => setMemoryCategory(e.target.value)}
                >
                  <option value="preference">User Preference</option>
                  <option value="personal_fact">Personal Fact</option>
                  <option value="project_rule">Project Directive</option>
                </select>
              </div>

              <button 
                type="submit" 
                className="btn-primary" 
                disabled={!memoryText.trim() || isSavingMemory}
              >
                {isSavingMemory ? 'Embedding Fact...' : 'Embed into Semantic Memory'}
              </button>
            </form>

            {memoryFeedback && (
              <div className={`feedback-alert ${memoryFeedback.type === 'success' ? 'success' : 'error'}`} style={{ marginTop: '14px' }}>
                {memoryFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{memoryFeedback.text}</span>
              </div>
            )}

            {/* FR1.3 Consolidation & Pruning Controls */}
            <div style={{ marginTop: '22px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                THE NORNS: CONSOLIDATION & FORGETTING
              </span>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '6px 0 10px' }}>
                Extract permanent user facts from episodic logs into semantic memory and prune aged logs.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button 
                  className="btn-outline" 
                  onClick={handleConsolidateMemories}
                  disabled={isConsolidating}
                  style={{ width: '100%' }}
                >
                  <RefreshCw size={13} className={isConsolidating ? 'spin' : ''} />
                  {isConsolidating ? 'Extracting Facts with Ollama...' : 'Consolidate Episodic Memories'}
                </button>

                <button 
                  className="btn-outline btn-danger" 
                  onClick={handlePruneMemories}
                  style={{ width: '100%' }}
                >
                  <Trash2 size={13} />
                  Prune Chat Logs (&gt; 30 Days)
                </button>
              </div>

              {consolidationResult && (
                <div style={{ marginTop: '10px', background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '6px', fontSize: '0.75rem' }}>
                  <div style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{consolidationResult.status}</div>
                  <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Extracted items: {consolidationResult.extractedFactsCount || 0}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 6: Short-Term Conversational Buffer */}
        {activeTab === 'history' && (
          <div>
            <div className="sidebar-section-header">
              <History size={16} color="var(--accent-rose)" />
              <h3>MySQL Operational Buffer</h3>
            </div>
            <p className="sidebar-desc">
              Inspecting short-term conversational context for session <code>{sessionId}</code>.
            </p>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button 
                className="btn-outline" 
                onClick={loadBufferHistory}
                disabled={isLoadingBuffer}
                style={{ flex: 1 }}
              >
                <RefreshCw size={13} className={isLoadingBuffer ? 'spin' : ''} />
                Refresh
              </button>
              <button 
                className="btn-outline btn-danger" 
                onClick={handleClearCurrentSession}
                disabled={isClearingBuffer}
                title="Wipe MySQL message buffer for this session"
              >
                <Trash2 size={13} />
                Wipe Buffer
              </button>
            </div>

            {bufferMessages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 10px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                No messages saved in MySQL buffer for session "{sessionId}".
              </div>
            ) : (
              <div className="item-list">
                {bufferMessages.map((msg, i) => (
                  <div key={msg.id || i} className="history-item">
                    <div className="history-item-header">
                      <span className={`role-badge ${msg.role.toLowerCase()}`}>{msg.role}</span>
                      <span>{formatTimestamp(msg.timestamp)}</span>
                    </div>
                    <div style={{ color: 'var(--text-main)', marginTop: '4px', whiteSpace: 'pre-wrap' }}>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 7: Email Dispatcher */}
        {activeTab === 'email' && (
          <div>
            <div className="section-header">
              <Mail size={15} color="var(--accent-cyan)" />
              <span>Gmail SMTP Dispatcher</span>
            </div>

            <div style={{
              background: 'rgba(6, 182, 212, 0.08)',
              border: '1px solid rgba(6, 182, 212, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 12px',
              fontSize: '0.78rem',
              color: 'var(--text-secondary)',
              marginBottom: '16px',
              lineHeight: '1.4'
            }}>
              <div><strong>Sender:</strong> <span style={{ color: '#38bdf8' }}>bookpdf247@gmail.com</span></div>
              <div style={{ fontSize: '0.72rem', marginTop: '3px', color: 'var(--text-muted)' }}>
                Host: smtp.gmail.com:587 | TLS Verified
              </div>
            </div>

            {emailFeedback && (
              <div className={`status-banner ${emailFeedback.type}`} style={{ marginBottom: '12px' }}>
                {emailFeedback.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
                <span>{emailFeedback.text}</span>
              </div>
            )}

            <form onSubmit={handleSidebarSendEmail} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label>Recipient Email *</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="recipient@example.com"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  required
                  disabled={isSendingEmail}
                />
              </div>

              <div className="form-group">
                <label>Subject</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Subject title..."
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  disabled={isSendingEmail}
                />
              </div>

              <div className="form-group">
                <label>Message Content *</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  placeholder="Type email body here..."
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  required
                  disabled={isSendingEmail}
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={isSendingEmail || !emailTo.trim() || !emailBody.trim()}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {isSendingEmail ? (
                  <>
                    <div className="spinner-small" />
                    <span>Transmitting...</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Dispatch Email</span>
                  </>
                )}
              </button>
            </form>

            {emailLogs.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  RECENT SENT LOGS
                </span>
                <div className="item-list" style={{ marginTop: '8px' }}>
                  {emailLogs.map((log, i) => (
                    <div key={i} className="history-item" style={{ fontSize: '0.75rem' }}>
                      <div className="history-item-header">
                        <span style={{ color: '#10b981', fontWeight: 600 }}>Sent to: {log.to}</span>
                        <span>{log.time}</span>
                      </div>
                      <div style={{ color: 'var(--text-main)', marginTop: '2px' }}>
                        Subject: {log.subject}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
