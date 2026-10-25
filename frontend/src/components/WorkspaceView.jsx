import React, { useState, useEffect } from 'react';
import {
  Wrench,
  FileText,
  BrainCircuit,
  Sparkles,
  Mail,
  Play,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Database,
  HardDrive,
  Cpu,
  Clock,
  ArrowRight,
  Send,
  Upload,
  Search,
  ExternalLink,
  Zap,
  Check,
  X,
  Shield,
  Activity,
  Layers,
  Sparkle
} from 'lucide-react';
import {
  rememberMemory,
  uploadKnowledgeDocument,
  getSessionHistory,
  clearSessionMemory,
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
  sendManualEmail,
  searchEpisodicMemory
} from '../api';

export default function WorkspaceView({
  activeNav,
  sessionId,
  onNavigateToChat,
  onSendChatMessage
}) {
  // ------------------ 1. WORKFLOWS STATE ------------------
  const [workflowGoal, setWorkflowGoal] = useState('');
  const [isPlanning, setIsPlanning] = useState(false);
  const [planningElapsed, setPlanningElapsed] = useState(0);
  const [planningStageMessage, setPlanningStageMessage] = useState('Initializing task planner...');
  const [currentPlan, setCurrentPlan] = useState(null);
  const [executions, setExecutions] = useState([]);
  const [isLoadingExecutions, setIsLoadingExecutions] = useState(false);
  const [skills, setSkills] = useState([]);

  // ------------------ 2. KNOWLEDGE / DOCS STATE ------------------
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadCategory, setUploadCategory] = useState('general');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [queryInput, setQueryInput] = useState('');
  const [isSearchingRag, setIsSearchingRag] = useState(false);
  const [ragResults, setRagResults] = useState([]);

  // ------------------ 3. MEMORY STATE ------------------
  const [memoryText, setMemoryText] = useState('');
  const [memoryCategory, setMemoryCategory] = useState('preference');
  const [isSavingMemory, setIsSavingMemory] = useState(false);
  const [memoryFeedback, setMemoryFeedback] = useState(null);
  const [searchMemoryQuery, setSearchMemoryQuery] = useState('');
  const [isSearchingMemory, setIsSearchingMemory] = useState(false);
  const [episodicResults, setEpisodicResults] = useState([]);
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [consolidationResult, setConsolidationResult] = useState(null);
  const [isPruning, setIsPruning] = useState(false);
  const [pruneResult, setPruneResult] = useState(null);
  const [bufferMessages, setBufferMessages] = useState([]);
  const [isLoadingBuffer, setIsLoadingBuffer] = useState(false);

  // ------------------ 4. SUGGESTIONS STATE ------------------
  const [suggestions, setSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isSweeping, setIsSweeping] = useState(false);
  const [sweepResult, setSweepResult] = useState(null);

  // ------------------ 5. EMAIL STUDIO STATE ------------------
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState(null);
  const [emailHistory, setEmailHistory] = useState([
    {
      to: 'team-lead@company.internal',
      subject: 'Weekly Sprint & AI Agent Architecture Report',
      time: '10:30 AM',
      status: 'DELIVERED'
    }
  ]);

  // Load context based on active view
  useEffect(() => {
    if (activeNav === 'workflows') {
      loadWorkflowsData();
    } else if (activeNav === 'suggestions') {
      loadSuggestions();
    } else if (activeNav === 'memory') {
      loadBufferData();
    }
  }, [activeNav, sessionId]);

  // Workflow processing timer
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
      }, 4000);
    } else {
      clearInterval(timer);
      clearInterval(messageCycle);
    }

    return () => {
      clearInterval(timer);
      clearInterval(messageCycle);
    };
  }, [isPlanning]);

  // Workflows handlers
  const loadWorkflowsData = async () => {
    setIsLoadingExecutions(true);
    try {
      const [skillsData, execsData] = await Promise.all([
        fetchSkills().catch(() => []),
        fetchWorkflowExecutions().catch(() => [])
      ]);
      setSkills(skillsData || []);
      setExecutions(execsData || []);
    } catch (e) {
      console.warn(e);
    } finally {
      setIsLoadingExecutions(false);
    }
  };

  const handlePlanAndExecute = async (e) => {
    if (e) e.preventDefault();
    if (!workflowGoal.trim() || isPlanning) return;

    setIsPlanning(true);
    setCurrentPlan(null);
    try {
      const result = await executeWorkflow(workflowGoal.trim());
      setCurrentPlan(result);
      loadWorkflowsData();
    } catch (err) {
      alert(`Workflow execution failed: ${err.message}`);
    } finally {
      setIsPlanning(false);
    }
  };

  const handleRetry = async (planId) => {
    try {
      await retryWorkflow(planId);
      loadWorkflowsData();
    } catch (err) {
      alert(`Retry error: ${err.message}`);
    }
  };

  // Knowledge / Docs Handlers
  const handleUploadFile = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadStatus(null);
    try {
      const res = await uploadKnowledgeDocument(selectedFile, uploadCategory);
      setUploadStatus({
        type: 'success',
        message: `Successfully indexed "${selectedFile.name}" into MariaDB Vector! ${res.chunksCount || res.chunks || 'Text parsed into chunks.'}`
      });
      setSelectedFile(null);
    } catch (err) {
      setUploadStatus({
        type: 'error',
        message: err.message || 'Upload & embedding creation failed.'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSearchRag = async (e) => {
    e.preventDefault();
    if (!queryInput.trim()) return;

    setIsSearchingRag(true);
    try {
      const res = await searchEpisodicMemory(queryInput.trim(), '', 5);
      setRagResults(res || []);
    } catch (err) {
      setRagResults([]);
    } finally {
      setIsSearchingRag(false);
    }
  };

  // Memory Handlers
  const loadBufferData = async () => {
    setIsLoadingBuffer(true);
    try {
      const history = await getSessionHistory(sessionId);
      setBufferMessages(history || []);
    } catch (err) {
      setBufferMessages([]);
    } finally {
      setIsLoadingBuffer(false);
    }
  };

  const handleSaveMemory = async (e) => {
    e.preventDefault();
    if (!memoryText.trim()) return;

    setIsSavingMemory(true);
    setMemoryFeedback(null);
    try {
      await rememberMemory(sessionId, memoryText.trim(), memoryCategory);
      setMemoryFeedback({
        type: 'success',
        text: 'Memory successfully committed to MariaDB Native Vector store!'
      });
      setMemoryText('');
    } catch (err) {
      setMemoryFeedback({ type: 'error', text: err.message });
    } finally {
      setIsSavingMemory(false);
    }
  };

  const handleSearchEpisodic = async (e) => {
    e.preventDefault();
    if (!searchMemoryQuery.trim()) return;

    setIsSearchingMemory(true);
    try {
      const res = await searchEpisodicMemory(searchMemoryQuery.trim(), '', 10);
      setEpisodicResults(res || []);
    } catch (err) {
      setEpisodicResults([]);
    } finally {
      setIsSearchingMemory(false);
    }
  };

  const handleConsolidate = async () => {
    setIsConsolidating(true);
    setConsolidationResult(null);
    try {
      const res = await consolidateMemories();
      setConsolidationResult(res.message || 'Consolidation successful: Episodic memories distilled into semantic profiles.');
    } catch (err) {
      setConsolidationResult(`Error: ${err.message}`);
    } finally {
      setIsConsolidating(false);
    }
  };

  const handlePrune = async () => {
    if (!window.confirm('Prune memories older than 30 days?')) return;
    setIsPruning(true);
    setPruneResult(null);
    try {
      const res = await pruneMemories(30);
      setPruneResult(res.message || 'Pruning complete.');
    } catch (err) {
      setPruneResult(`Error: ${err.message}`);
    } finally {
      setIsPruning(false);
    }
  };

  // Suggestions Handlers
  const loadSuggestions = async () => {
    setIsLoadingSuggestions(true);
    try {
      const res = await fetchSuggestions();
      setSuggestions(res || []);
    } catch (e) {
      setSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleAcceptSuggestion = async (s) => {
    try {
      await acceptSuggestion(s.id);
      setSuggestions(prev => prev.filter(item => item.id !== s.id));
      const promptText = s.actionPayload || s.suggestedPrompt || s.title || s.description;
      if (promptText && onSendChatMessage) {
        onNavigateToChat();
        onSendChatMessage(promptText);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDismissSuggestion = async (id) => {
    try {
      await dismissSuggestion(id);
      setSuggestions(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerSweep = async () => {
    setIsSweeping(true);
    setSweepResult(null);
    try {
      const res = await triggerAgentSweep();
      if (Array.isArray(res)) {
        setSuggestions(res);
        if (res.length > 0) {
          setSweepResult(`Sweep complete: ${res.length} actionable recommendation(s) generated from semantic memory.`);
        } else {
          setSweepResult('Sweep complete: Memory scanned. No pending deadlines or commitments detected. (Add tasks or notes in Memory to trigger autonomous cards)');
        }
      } else {
        setSweepResult(res?.message || 'Sweep complete.');
        loadSuggestions();
      }
    } catch (err) {
      setSweepResult(`Sweep error: ${err.message || err}`);
    } finally {
      setIsSweeping(false);
    }
  };

  // Email Studio Handlers
  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!emailTo.trim() || !emailBody.trim()) return;

    setIsSendingEmail(true);
    setEmailFeedback(null);
    try {
      await sendManualEmail(emailTo.trim(), emailSubject.trim() || '(No Subject)', emailBody.trim(), sessionId);
      setEmailFeedback({
        type: 'success',
        text: `Email dispatched to ${emailTo.trim()} via Gmail SMTP Server!`
      });
      setEmailHistory(prev => [
        {
          to: emailTo.trim(),
          subject: emailSubject.trim() || '(No Subject)',
          time: new Date().toLocaleTimeString(),
          status: 'DELIVERED'
        },
        ...prev
      ]);
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
    <div className="workspace-container">
      {/* Top Banner Navigation / Status */}
      <div className="workspace-header-bar">
        <div className="workspace-title-section">
          {activeNav === 'workflows' && (
            <>
              <div className="workspace-icon-box cyan">
                <Wrench size={22} />
              </div>
              <div>
                <h2>Autonomous Workflow Orchestrator & DAG Engine</h2>
                <p>Decompose complex objectives into multi-step DAG task graphs with self-reflecting error correction</p>
              </div>
            </>
          )}

          {activeNav === 'docs' && (
            <>
              <div className="workspace-icon-box emerald">
                <FileText size={22} />
              </div>
              <div>
                <h2>Knowledge Base & RAG Ingestion Center</h2>
                <p>Upload documents, ingest embeddings into MariaDB Vector, and test semantic similarity retrieval</p>
              </div>
            </>
          )}

          {activeNav === 'memory' && (
            <>
              <div className="workspace-icon-box purple">
                <BrainCircuit size={22} />
              </div>
              <div>
                <h2>Sovereign Dual-Memory Architecture Matrix</h2>
                <p>Sliding-window short-term buffer (MySQL) &amp; permanent 768-dim semantic memory (MariaDB Vector)</p>
              </div>
            </>
          )}

          {activeNav === 'suggestions' && (
            <>
              <div className="workspace-icon-box amber">
                <Sparkles size={22} />
              </div>
              <div>
                <h2>Proactive AI Contextual Insights &amp; Suggestions</h2>
                <p>Autonomous background sweeps, task recommendations, and proactive workflow triggers</p>
              </div>
            </>
          )}

          {activeNav === 'email' && (
            <>
              <div className="workspace-icon-box cyan">
                <Mail size={22} />
              </div>
              <div>
                <h2>Gmail SMTP Autonomous Dispatcher Studio</h2>
                <p>Human-in-the-loop email composition, AI drafts staging, and certified SMTP relay logs</p>
              </div>
            </>
          )}
        </div>

        <button className="btn-back-chat" onClick={onNavigateToChat}>
          <span>&larr; Return to Chat</span>
        </button>
      </div>

      {/* Main Workspace Body */}
      <div className="workspace-scroll-area">
        {/* ======================= 1. WORKFLOWS WORKSPACE ======================= */}
        {activeNav === 'workflows' && (
          <div className="workspace-grid-layout">
            <div className="workspace-card main-col">
              <div className="card-header-styled">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Zap size={18} color="var(--accent-cyan)" />
                  <h3>Plan &amp; Execute Autonomous Goal</h3>
                </div>
                <span className="badge-pill-cyan">Ollama Llama 3.2</span>
              </div>

              <form onSubmit={handlePlanAndExecute} className="workflow-form-expanded">
                <label className="form-label-bold">Specify High-Level Goal or Initiative</label>
                <div className="prompt-input-wrapper">
                  <textarea
                    className="form-textarea-large"
                    placeholder="e.g. Read sample_notes.txt, summarize key architectural points, and write the output into summary_report.txt"
                    value={workflowGoal}
                    onChange={(e) => setWorkflowGoal(e.target.value)}
                    rows={3}
                    disabled={isPlanning}
                  />
                  <div className="quick-goal-pills">
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quick templates:</span>
                    <button
                      type="button"
                      className="template-chip"
                      onClick={() => setWorkflowGoal('Read sample_notes.txt and save key summaries to dsa_summary.txt')}
                    >
                      Read notes &amp; summarize
                    </button>
                    <button
                      type="button"
                      className="template-chip"
                      onClick={() => setWorkflowGoal('Check system directory files and compile a file inventory report')}
                    >
                      Audit workspace files
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button type="submit" className="btn-primary-large" disabled={isPlanning || !workflowGoal.trim()}>
                    <Play size={16} />
                    {isPlanning ? 'Orchestrating Workflow Plan...' : 'Execute Autonomous Plan'}
                  </button>
                </div>
              </form>

              {isPlanning && (
                <div className="workflow-live-progress">
                  <div className="progress-top-row">
                    <div className="spinner-pill">
                      <RefreshCw size={14} className="spin" />
                      <span>Autonomous Execution Active</span>
                    </div>
                    <span className="elapsed-time">{planningElapsed}s elapsed</span>
                  </div>
                  <div className="stage-message-box">
                    <Sparkles size={16} color="var(--accent-amber)" />
                    <span>{planningStageMessage}</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" />
                  </div>
                </div>
              )}

              {/* Active Plan Graph Card */}
              {currentPlan && (
                <div className="active-plan-card">
                  <div className="plan-meta-header">
                    <div>
                      <span className="plan-label">ACTIVE DAG PLAN</span>
                      <h4 className="plan-id-text">{currentPlan.planId}</h4>
                    </div>
                    <span className={`status-tag ${(currentPlan.overallStatus || currentPlan.status || 'PENDING').toLowerCase()}`}>
                      {currentPlan.overallStatus || currentPlan.status || 'PENDING'}
                    </span>
                  </div>

                  <p className="plan-summary-p">{currentPlan.summary}</p>

                  <div className="dag-steps-flow">
                    {currentPlan.steps?.map((step, idx) => {
                      const stepStatus = step.status || 'PENDING';
                      return (
                        <div key={idx} className={`dag-step-box ${stepStatus.toLowerCase()}`}>
                          <div className="step-header">
                            <span className="step-number">{idx + 1}</span>
                            <span className="step-skill-id">{step.skillId}</span>
                            <span className={`step-badge-mini ${stepStatus.toLowerCase()}`}>{stepStatus}</span>
                          </div>
                          <p className="step-desc">{step.description}</p>
                          {step.output && (
                            <div className="step-output-box">
                              <span className="output-label">&gt; Output:</span>
                              <code>{step.output}</code>
                            </div>
                          )}
                          {step.error && (
                            <div className="step-output-box" style={{ color: '#f43f5e' }}>
                              <span className="output-label">&gt; Error:</span>
                              <code>{step.error}</code>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Registered Skills & Past Executions */}
            <div className="workspace-card side-col">
              <div className="card-header-styled">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={17} color="var(--accent-indigo)" />
                  <h3>Registered Skills</h3>
                </div>
                <span className="badge-pill-subtle">{skills.length} Loaded</span>
              </div>

              <div className="skills-roster-list">
                {skills.length === 0 ? (
                  <div className="empty-subtle">
                    <span>Loading skill schemas...</span>
                  </div>
                ) : (
                  skills.map((sk) => (
                    <div key={sk.id} className="skill-item-card">
                      <div className="skill-title-row">
                        <span className="skill-name">{sk.id}</span>
                        <span className="skill-cat-tag">Sandboxed</span>
                      </div>
                      <p className="skill-desc">{sk.description}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="card-header-styled" style={{ marginTop: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={16} color="var(--accent-cyan)" />
                  <h3>Execution History</h3>
                </div>
                <button className="icon-refresh-btn" onClick={loadWorkflowsData} title="Refresh history">
                  <RefreshCw size={13} className={isLoadingExecutions ? 'spin' : ''} />
                </button>
              </div>

              <div className="execution-history-list">
                {executions.length === 0 ? (
                  <div className="empty-subtle">No past workflow plans recorded yet.</div>
                ) : (
                  executions.map((ex) => {
                    const statusStr = ex.status || ex.overallStatus || 'PENDING';
                    return (
                      <div key={ex.planId || Math.random()} className="execution-history-item">
                        <div className="ex-top">
                          <span className="ex-id">{ex.planId || 'Plan'}</span>
                          <span className={`status-tag-mini ${statusStr.toLowerCase()}`}>{statusStr}</span>
                        </div>
                        <div className="ex-summary">{ex.summary || ex.goal || 'No description'}</div>
                        {statusStr === 'FAILED' && ex.planId && (
                          <button className="btn-retry-mini" onClick={() => handleRetry(ex.planId)}>
                            <RefreshCw size={11} /> Retry Plan
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================= 2. KNOWLEDGE / RAG WORKSPACE ======================= */}
        {activeNav === 'docs' && (
          <div className="workspace-grid-layout">
            <div className="workspace-card main-col">
              <div className="card-header-styled">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Upload size={18} color="var(--accent-emerald)" />
                  <h3>Document Ingestion &amp; Vectorization</h3>
                </div>
                <span className="badge-pill-cyan">nomic-embed-text (768 dims)</span>
              </div>

              <p className="section-instruction">
                Upload PDFs, Markdown documents, source code, or text notes. The ingestion engine automatically slices
                text into overlapping semantic chunks and generates vector embeddings stored directly in MariaDB Native
                Vector DB.
              </p>

              <form onSubmit={handleUploadFile} className="upload-form-pane">
                <div className="dropzone-box">
                  <Upload size={36} className="dropzone-icon" />
                  <div className="dropzone-text">
                    {selectedFile ? (
                      <span className="file-chosen-name">{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                    ) : (
                      <>
                        <span className="dropzone-primary">Click to select or drop a file here</span>
                        <span className="dropzone-secondary">Supported formats: .txt, .md, .pdf, .json, .csv</span>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    className="file-hidden-input"
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                    accept=".txt,.md,.pdf,.json,.csv,.java,.js,.html"
                  />
                </div>

                <div className="upload-controls-row">
                  <div className="category-select-group">
                    <label>Document Category:</label>
                    <select
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value)}
                      className="category-dropdown"
                    >
                      <option value="general">General Knowledge</option>
                      <option value="technical">Technical Specs / Architecture</option>
                      <option value="dsa">DSA &amp; Algorithms</option>
                      <option value="business">Business &amp; Operations</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="btn-primary-large"
                    disabled={!selectedFile || isUploading}
                  >
                    <Upload size={16} />
                    {isUploading ? 'Vectorizing into MariaDB...' : 'Ingest & Index File'}
                  </button>
                </div>
              </form>

              {uploadStatus && (
                <div className={`status-banner ${uploadStatus.type}`}>
                  {uploadStatus.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{uploadStatus.message}</span>
                </div>
              )}

              {/* RAG Query Sandbox */}
              <div className="rag-sandbox-section">
                <div className="card-header-styled" style={{ marginTop: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Search size={17} color="var(--accent-cyan)" />
                    <h3>Live Semantic Retrieval Sandbox</h3>
                  </div>
                  <span className="badge-pill-subtle">Cosine Similarity Test</span>
                </div>

                <form onSubmit={handleSearchRag} className="search-bar-row">
                  <input
                    type="text"
                    className="search-input-field"
                    placeholder="Ask a question against your uploaded documents..."
                    value={queryInput}
                    onChange={(e) => setQueryInput(e.target.value)}
                  />
                  <button type="submit" className="btn-search-rag" disabled={isSearchingRag || !queryInput.trim()}>
                    <Search size={14} />
                    {isSearchingRag ? 'Searching...' : 'Search Vector DB'}
                  </button>
                </form>

                <div className="rag-results-container">
                  {ragResults.length === 0 && !isSearchingRag && (
                    <div className="empty-subtle">Enter a search query to inspect nearest vector neighbors and similarity scores.</div>
                  )}

                  {ragResults.map((chunk, i) => (
                    <div key={i} className="rag-chunk-card">
                      <div className="chunk-header">
                        <span className="chunk-index">Chunk #{i + 1}</span>
                        {chunk.similarity && (
                          <span className="similarity-badge">
                            Score: {(chunk.similarity * 100).toFixed(1)}% match
                          </span>
                        )}
                      </div>
                      <div className="chunk-body">{chunk.content || chunk.text || JSON.stringify(chunk)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Knowledge Overview Sidebar */}
            <div className="workspace-card side-col">
              <div className="card-header-styled">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Database size={16} color="var(--accent-cyan)" />
                  <h3>Vector Store Status</h3>
                </div>
                <span className="badge-pill-cyan">Port 3307</span>
              </div>

              <div className="info-stat-card">
                <div className="stat-label">Vector Storage Engine</div>
                <div className="stat-value">MariaDB 11.4+ VEC</div>
                <div className="stat-sub">Distance Metric: Cosine (COSINE_DISTANCE)</div>
              </div>

              <div className="info-stat-card">
                <div className="stat-label">Embedding Dimensions</div>
                <div className="stat-value">768 Dim Float32</div>
                <div className="stat-sub">Model: nomic-embed-text via Ollama</div>
              </div>

              <div className="info-stat-card">
                <div className="stat-label">Dynamic Auto-Watch Folder</div>
                <div className="stat-value">watch_folder/</div>
                <div className="stat-sub">Files added to this directory are auto-indexed</div>
              </div>
            </div>
          </div>
        )}

        {/* ======================= 3. DUAL-MEMORY MATRIX WORKSPACE ======================= */}
        {activeNav === 'memory' && (
          <div className="workspace-grid-layout">
            <div className="workspace-card main-col">
              <div className="card-header-styled">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BrainCircuit size={18} color="var(--accent-purple)" />
                  <h3>Episodic &amp; Semantic Memory Matrix</h3>
                </div>
                <span className="badge-pill-cyan">Dual Persistence</span>
              </div>

              {/* Memory Add Form */}
              <form onSubmit={handleSaveMemory} className="memory-add-form">
                <label className="form-label-bold">Store Long-Term Fact or User Preference</label>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <input
                    type="text"
                    className="search-input-field"
                    placeholder="e.g. User prefers Java 21 with Spring Boot, or User timezone is IST"
                    value={memoryText}
                    onChange={(e) => setMemoryText(e.target.value)}
                  />
                  <select
                    value={memoryCategory}
                    onChange={(e) => setMemoryCategory(e.target.value)}
                    className="category-dropdown"
                    style={{ width: '150px' }}
                  >
                    <option value="preference">Preference</option>
                    <option value="fact">Fact</option>
                    <option value="goal">Goal</option>
                    <option value="profile">Profile</option>
                  </select>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn-primary" disabled={isSavingMemory || !memoryText.trim()}>
                    <Sparkles size={14} />
                    {isSavingMemory ? 'Vectorizing Memory...' : 'Commit to Vector Memory'}
                  </button>
                </div>
              </form>

              {memoryFeedback && (
                <div className={`status-banner ${memoryFeedback.type}`} style={{ marginTop: '12px' }}>
                  {memoryFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{memoryFeedback.text}</span>
                </div>
              )}

              {/* Memory Search */}
              <div style={{ marginTop: '24px' }}>
                <div className="card-header-styled">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Search size={16} color="var(--accent-cyan)" />
                    <h3>Semantic Memory Recall Query</h3>
                  </div>
                  <span className="badge-pill-subtle">Episodic Recall</span>
                </div>

                <form onSubmit={handleSearchEpisodic} className="search-bar-row">
                  <input
                    type="text"
                    className="search-input-field"
                    placeholder="Search past memories by semantic meaning..."
                    value={searchMemoryQuery}
                    onChange={(e) => setSearchMemoryQuery(e.target.value)}
                  />
                  <button type="submit" className="btn-search-rag" disabled={isSearchingMemory || !searchMemoryQuery.trim()}>
                    <Search size={14} />
                    {isSearchingMemory ? 'Searching...' : 'Recall Memory'}
                  </button>
                </form>

                <div className="rag-results-container">
                  {episodicResults.length === 0 && !isSearchingMemory && (
                    <div className="empty-subtle">Query the semantic memory to inspect past facts and retrieved context.</div>
                  )}

                  {episodicResults.map((mem, i) => (
                    <div key={i} className="rag-chunk-card">
                      <div className="chunk-header">
                        <span className="chunk-index">Memory #{mem.id || i + 1}</span>
                        <span className="category-pill">{mem.category || 'general'}</span>
                      </div>
                      <div className="chunk-body">{mem.content || mem.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Dual-Memory Engine Status & Actions */}
            <div className="workspace-card side-col">
              <div className="card-header-styled">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <HardDrive size={16} color="var(--accent-indigo)" />
                  <h3>Dual-Tier Memory Control</h3>
                </div>
              </div>

              <div className="memory-tier-card">
                <div className="tier-header">
                  <HardDrive size={15} color="#6366f1" />
                  <span className="tier-name">Short-Term Working Memory</span>
                </div>
                <div className="tier-desc">MySQL :3306 &bull; Session Sliding Window ({bufferMessages.length} active messages in current chat)</div>
              </div>

              <div className="memory-tier-card">
                <div className="tier-header">
                  <Database size={15} color="#06b6d4" />
                  <span className="tier-name">Long-Term Semantic Memory</span>
                </div>
                <div className="tier-desc">MariaDB :3307 &bull; Native Vector Hashing with 768-dim embeddings</div>
              </div>

              <div className="memory-actions-block">
                <button
                  className="btn-outline-action"
                  onClick={handleConsolidate}
                  disabled={isConsolidating}
                  title="Consolidate episodic short-term chat logs into semantic memory profiles"
                >
                  <Sparkles size={14} color="var(--accent-cyan)" />
                  {isConsolidating ? 'Consolidating...' : 'Trigger Memory Consolidation'}
                </button>

                {consolidationResult && (
                  <div className="action-feedback-note">{consolidationResult}</div>
                )}

                <button
                  className="btn-outline-action danger"
                  onClick={handlePrune}
                  disabled={isPruning}
                  title="Prune stale low-relevance memories older than 30 days"
                >
                  <Trash2 size={14} />
                  {isPruning ? 'Pruning...' : 'Prune Stale Memories (>30d)'}
                </button>

                {pruneResult && (
                  <div className="action-feedback-note">{pruneResult}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================= 4. PROACTIVE AI WORKSPACE ======================= */}
        {activeNav === 'suggestions' && (
          <div className="workspace-grid-layout">
            <div className="workspace-card main-col">
              <div className="card-header-styled">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} color="var(--accent-amber)" />
                  <h3>Contextual Proactive Recommendations</h3>
                </div>
                <button className="btn-sweep" onClick={handleTriggerSweep} disabled={isSweeping}>
                  <RefreshCw size={13} className={isSweeping ? 'spin' : ''} />
                  {isSweeping ? 'Analyzing Context...' : 'Run Autonomous Sweep'}
                </button>
              </div>

              {sweepResult && (
                <div className="status-banner success" style={{ marginBottom: '16px' }}>
                  <CheckCircle2 size={16} />
                  <span>{sweepResult}</span>
                </div>
              )}

              <p className="section-instruction">
                The agent periodically inspects working context, recent documents, and task goals to formulate proactive
                recommendations before you even ask.
              </p>

              <div className="suggestions-grid">
                {suggestions.length === 0 ? (
                  <div className="empty-state-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '36px 20px', background: 'rgba(18, 26, 44, 0.45)', borderRadius: '14px', border: '1px dashed rgba(245, 158, 11, 0.3)' }}>
                    <Sparkles size={40} color="var(--accent-amber)" style={{ margin: '0 auto 12px' }} />
                    <h4 style={{ fontSize: '1.05rem', color: '#fff', marginBottom: '6px' }}>No Pending Proactive Suggestions</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', maxWidth: '440px', margin: '0 auto 16px' }}>
                      The proactive agent scans long-term memory for deadlines and initiatives. Click below to trigger an autonomous contextual sweep.
                    </p>
                    <button
                      type="button"
                      className="btn-sweep"
                      style={{ margin: '0 auto' }}
                      onClick={handleTriggerSweep}
                      disabled={isSweeping}
                    >
                      <RefreshCw size={14} className={isSweeping ? 'spin' : ''} />
                      {isSweeping ? 'Analyzing Semantic Memory...' : 'Run Autonomous Sweep'}
                    </button>
                  </div>
                ) : (
                  suggestions.map((s) => {
                    const promptText = s.actionPayload || s.suggestedPrompt || s.title;
                    const priority = s.priority || (s.actionType === 'WORKFLOW' ? 'HIGH' : 'MEDIUM');
                    return (
                      <div key={s.id} className="suggestion-card-premium">
                        <div className="suggestion-header-row">
                          <span className={`priority-pill ${priority.toLowerCase()}`}>
                            {priority} PRIORITY
                          </span>
                          <div className="suggestion-action-btns">
                            <button
                              className="btn-dismiss-sug"
                              onClick={() => handleDismissSuggestion(s.id)}
                              title="Dismiss suggestion"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>

                        <h4 className="suggestion-title">{s.title || 'Recommended Action'}</h4>
                        <p className="suggestion-body">{s.description || s.content}</p>

                        {promptText && (
                          <div className="suggested-prompt-box">
                            <span className="prompt-label">Prepared Action / Prompt:</span>
                            <span className="prompt-content">"{promptText}"</span>
                          </div>
                        )}

                        <div className="suggestion-footer">
                          <button
                            className="btn-accept-sug"
                            onClick={() => handleAcceptSuggestion(s)}
                          >
                            <Play size={13} />
                            <span>Accept &amp; Run in Chat</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Side Column: Proactivity Engine Metrics */}
            <div className="workspace-card side-col">
              <div className="card-header-styled">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={16} color="var(--accent-amber)" />
                  <h3>Proactivity Engine</h3>
                </div>
              </div>

              <div className="info-stat-card">
                <div className="stat-label">Evaluation Mode</div>
                <div className="stat-value">Autonomous Context Sweep</div>
                <div className="stat-sub">Triggered on message thresholds or on-demand</div>
              </div>

              <div className="info-stat-card">
                <div className="stat-label">Confidence Gate</div>
                <div className="stat-value">&ge; 0.75 Relevance</div>
                <div className="stat-sub">Filters out noise and repetitive prompts</div>
              </div>
            </div>
          </div>
        )}

        {/* ======================= 5. EMAIL STUDIO WORKSPACE ======================= */}
        {activeNav === 'email' && (
          <div className="workspace-grid-layout">
            <div className="workspace-card main-col">
              <div className="card-header-styled">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mail size={18} color="var(--accent-cyan)" />
                  <h3>Gmail SMTP Dispatcher Studio</h3>
                </div>
                <span className="badge-pill-cyan">TLS :587 Verified</span>
              </div>

              <form onSubmit={handleSendEmail} className="email-composer-form">
                <div className="form-row-group">
                  <div className="form-group flex-1">
                    <label className="form-label">Recipient Email (To:)</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="e.g. client@organization.com"
                      value={emailTo}
                      onChange={(e) => setEmailTo(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group flex-1">
                    <label className="form-label">Email Subject</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Project Delivery & Architecture Status"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Email Body (Markdown supported)</label>
                  <textarea
                    className="form-input form-textarea-large"
                    placeholder="Type or paste email contents here..."
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    rows={8}
                    required
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="submit"
                    className="btn-primary-large"
                    disabled={isSendingEmail || !emailTo.trim() || !emailBody.trim()}
                  >
                    <Send size={15} />
                    {isSendingEmail ? 'Dispatching via SMTP...' : 'Send Live Email'}
                  </button>
                </div>
              </form>

              {emailFeedback && (
                <div className={`status-banner ${emailFeedback.type}`} style={{ marginTop: '16px' }}>
                  {emailFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{emailFeedback.text}</span>
                </div>
              )}
            </div>

            {/* Email Preview & Logs */}
            <div className="workspace-card side-col">
              <div className="card-header-styled">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={16} color="var(--accent-emerald)" />
                  <h3>Live Render Preview</h3>
                </div>
              </div>

              <div className="email-preview-pane">
                <div className="preview-field">
                  <span className="field-label">To:</span>
                  <span className="field-val">{emailTo || '(recipient)'}</span>
                </div>
                <div className="preview-field">
                  <span className="field-label">Subject:</span>
                  <span className="field-val">{emailSubject || '(no subject)'}</span>
                </div>
                <div className="preview-divider" />
                <div className="preview-body-content">
                  {emailBody ? (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{emailBody}</div>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      Start composing on the left to see live email rendering.
                    </span>
                  )}
                </div>
              </div>

              <div className="card-header-styled" style={{ marginTop: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={15} color="var(--accent-indigo)" />
                  <h3>Recent Dispatches</h3>
                </div>
              </div>

              <div className="email-history-list">
                {emailHistory.map((item, idx) => (
                  <div key={idx} className="email-log-item">
                    <div className="log-top">
                      <span className="log-to">{item.to}</span>
                      <span className="log-status-badge">{item.status}</span>
                    </div>
                    <div className="log-subject">{item.subject}</div>
                    <div className="log-time">{item.time}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
