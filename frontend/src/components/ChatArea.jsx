import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Send, 
  Sparkles, 
  User, 
  Bot, 
  Zap, 
  Radio, 
  Trash2, 
  Copy, 
  Check, 
  StopCircle, 
  FileText,
  Mail,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import EmailDraftCard from './EmailDraftCard';
import EmailModal from './EmailModal';

export default function ChatArea({ 
  messages, 
  onSendMessage, 
  isGenerating, 
  onStopGeneration,
  streamingEnabled, 
  setStreamingEnabled,
  onClearChat,
  sessionId,
  isSidebarCollapsed,
  onToggleSidebar
}) {
  const [input, setInput] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [copiedCodeKey, setCopiedCodeKey] = useState(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isGenerating) return;
    const text = input.trim();
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    onSendMessage(text);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputResize = (e) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
  };

  const handleCopyMessage = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCopyCode = (codeStr, codeKey) => {
    navigator.clipboard.writeText(codeStr);
    setCopiedCodeKey(codeKey);
    setTimeout(() => setCopiedCodeKey(null), 2000);
  };

  const quickPrompts = [
    "Send an email summarizing project progress",
    "What key topics or algorithms are in the uploaded document?",
    "Summarize our conversation flow so far in this session."
  ];

  return (
    <main className="chat-container">
      {/* Top Bar inside Chat */}
      <div className="chat-header-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onToggleSidebar && (
            <button
              className="btn-toggle-sidebar"
              onClick={onToggleSidebar}
              title={isSidebarCollapsed ? "Show sessions sidebar" : "Hide sessions sidebar"}
            >
              {isSidebarCollapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
              <span className="toggle-sidebar-label">{isSidebarCollapsed ? "Sessions" : "Hide"}</span>
            </button>
          )}

          <div className="stream-toggle-wrapper">
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={streamingEnabled} 
                onChange={(e) => setStreamingEnabled(e.target.checked)} 
              />
              <span className="slider"></span>
            </label>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Radio size={14} color={streamingEnabled ? '#06b6d4' : '#64748b'} />
              Real-Time SSE Streaming {streamingEnabled ? '(Active)' : '(Off)'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            className="btn-outline btn-email" 
            onClick={() => setIsEmailModalOpen(true)}
            title="Compose and manually send an email via Gmail SMTP"
            style={{ borderColor: 'rgba(6, 182, 212, 0.4)', color: '#38bdf8' }}
          >
            <Mail size={13} color="#06b6d4" />
            Send Email
          </button>

          <button 
            className="btn-outline btn-danger" 
            onClick={onClearChat}
            title="Delete all chat messages for this session from database"
          >
            <Trash2 size={13} />
            Delete Chat
          </button>
        </div>
      </div>

      {/* Message Feed */}
      <div className="message-feed">
        {messages.length === 0 ? (
          <div className="empty-chat-state">
            <div className="empty-chat-icon">
              <Sparkles size={32} />
            </div>
            <h2>Ragnarok Sovereign Agent</h2>
            <p>
              Equipped with a MySQL sliding-window conversational buffer, MariaDB Vector semantic retrieval,
              integrated Gmail SMTP email service, and autonomous skill orchestration.
            </p>

            <div className="prompt-suggestions">
              {quickPrompts.map((prompt, idx) => (
                <button 
                  key={idx} 
                  className="prompt-chip" 
                  onClick={() => onSendMessage(prompt)}
                >
                  <span>"{prompt}"</span>
                  <Zap size={14} color="#06b6d4" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isUser = (msg.role || '').toUpperCase() === 'USER';
            return (
              <div key={idx} className={`message-row ${isUser ? 'user' : 'assistant'}`}>
                <div className={`avatar ${isUser ? 'user-avatar' : 'ai-avatar'}`}>
                  {isUser ? <User size={18} /> : <Bot size={18} />}
                </div>
                <div className="message-bubble">
                  {isUser ? (
                    <div className="user-text-content">{msg.content}</div>
                  ) : (
                    <div className="markdown-body">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ node, inline, className, children, ...props }) {
                            const match = /language-([\w-]+)/.exec(className || '');
                            const codeString = String(children).replace(/\n$/, '');
                            const codeKey = `${idx}-${codeString.slice(0, 15)}`;

                            // Interactive Human-in-the-Loop Email Draft Card
                            if (match && match[1] === 'email-draft') {
                              return <EmailDraftCard rawJson={codeString} sessionId={sessionId} />;
                            }

                            if (!inline && (match || codeString.includes('\n'))) {
                              return (
                                <div className="code-block-wrapper">
                                  <div className="code-block-header">
                                    <span className="code-lang-tag">
                                      <FileText size={11} style={{ marginRight: '4px' }} />
                                      {match ? match[1] : 'code'}
                                    </span>
                                    <button
                                      className="code-copy-btn"
                                      onClick={() => handleCopyCode(codeString, codeKey)}
                                      title="Copy code"
                                    >
                                      {copiedCodeKey === codeKey ? (
                                        <>
                                          <Check size={12} color="#10b981" />
                                          <span style={{ color: '#10b981' }}>Copied</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy size={12} />
                                          <span>Copy</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                  <pre className="code-pre">
                                    <code className={className} {...props}>
                                      {children}
                                    </code>
                                  </pre>
                                </div>
                              );
                            }
                            return (
                              <code className="inline-code" {...props}>
                                {children}
                              </code>
                            );
                          },
                          blockquote({ node, children }) {
                            return <blockquote className="markdown-blockquote">{children}</blockquote>;
                          },
                          table({ node, children }) {
                            return (
                              <div className="table-responsive">
                                <table className="markdown-table">{children}</table>
                              </div>
                            );
                          }
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}

                  {msg.isStreaming && <span className="stream-cursor"></span>}

                  {!isUser && !msg.isStreaming && msg.content && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                      <button
                        onClick={() => handleCopyMessage(msg.content, idx)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '6px',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: '4px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.72rem',
                          transition: 'all 0.15s ease'
                        }}
                        title="Copy entire response"
                      >
                        {copiedIndex === idx ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                        {copiedIndex === idx ? 'Copied Full Response' : 'Copy'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="chat-input-bar">
        <div className="input-box-wrapper">
          <textarea
            ref={textareaRef}
            className="chat-textarea"
            placeholder="Type prompt to Ragnarok Agent... (Enter to send, Shift+Enter for new line)"
            rows={1}
            value={input}
            onChange={handleInputResize}
            onKeyDown={handleKeyDown}
            disabled={isGenerating}
          />

          {isGenerating ? (
            <button 
              className="send-btn" 
              style={{ background: 'var(--accent-rose)' }}
              onClick={onStopGeneration}
              title="Stop response generation"
            >
              <StopCircle size={18} />
            </button>
          ) : (
            <button 
              className="send-btn" 
              onClick={handleSend}
              disabled={!input.trim()}
              title="Send message"
            >
              <Send size={18} />
            </button>
          )}
        </div>

        <div className="input-footer">
          <span>Ollama Model: <strong>llama3.2</strong> | Embedding: <strong>nomic-embed-text</strong></span>
          <span>Dual Memory: MySQL (3306) + MariaDB Vector (3307)</span>
        </div>
      </div>

      <EmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        sessionId={sessionId}
      />
    </main>
  );
}
