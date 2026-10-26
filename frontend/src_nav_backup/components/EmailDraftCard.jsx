import React, { useState } from 'react';
import { Mail, Send, Check, X, AlertCircle, Clock, ShieldCheck } from 'lucide-react';
import { sendManualEmail } from '../api';

export default function EmailDraftCard({ rawJson, sessionId }) {
  const [status, setStatus] = useState('PENDING'); // 'PENDING' | 'SENDING' | 'SENT' | 'CANCELLED' | 'ERROR'
  const [errorMessage, setErrorMessage] = useState('');
  const [sentTimestamp, setSentTimestamp] = useState('');

  let draftData = {
    to: '',
    subject: '(No Subject)',
    body: ''
  };

  try {
    const parsed = JSON.parse(rawJson);
    draftData = {
      to: parsed.to || '',
      subject: parsed.subject || '(No Subject)',
      body: parsed.body || ''
    };
  } catch (err) {
    // If not valid JSON, fallback
    return (
      <div className="code-block-wrapper">
        <pre className="code-pre">
          <code>{rawJson}</code>
        </pre>
      </div>
    );
  }

  const handleConfirmSend = async () => {
    if (!draftData.to) {
      setStatus('ERROR');
      setErrorMessage('Recipient email address is missing.');
      return;
    }

    setStatus('SENDING');
    setErrorMessage('');
    try {
      const res = await sendManualEmail(draftData.to, draftData.subject, draftData.body, sessionId);
      setStatus('SENT');
      setSentTimestamp(new Date().toLocaleTimeString());
    } catch (err) {
      setStatus('ERROR');
      setErrorMessage(err.message || 'Failed to dispatch email.');
    }
  };

  const handleCancel = () => {
    setStatus('CANCELLED');
  };

  return (
    <div className={`email-draft-card ${status.toLowerCase()}`}>
      <div className="email-draft-header">
        <div className="email-draft-title">
          <Mail size={16} color="#06b6d4" />
          <span>Interactive Email Dispatch</span>
        </div>
        <div className="email-draft-badge">
          {status === 'PENDING' && (
            <span className="badge-warning">
              <Clock size={11} /> Human Approval Required
            </span>
          )}
          {status === 'SENDING' && (
            <span className="badge-info">
              <div className="spinner-small" /> Transmitting...
            </span>
          )}
          {status === 'SENT' && (
            <span className="badge-success">
              <ShieldCheck size={12} /> Dispatched via Gmail SMTP
            </span>
          )}
          {status === 'CANCELLED' && (
            <span className="badge-muted">
              <X size={11} /> Cancelled
            </span>
          )}
          {status === 'ERROR' && (
            <span className="badge-danger">
              <AlertCircle size={11} /> Failed
            </span>
          )}
        </div>
      </div>

      <div className="email-draft-content">
        <div className="draft-field">
          <span className="draft-label">To:</span>
          <span className="draft-value recipient-chip">{draftData.to || '<missing recipient email>'}</span>
        </div>
        <div className="draft-field">
          <span className="draft-label">Subject:</span>
          <span className="draft-value subject-text">{draftData.subject}</span>
        </div>
        <div className="draft-field body-field">
          <span className="draft-label">Content:</span>
          <div className="draft-body-preview">{draftData.body}</div>
        </div>
      </div>

      {status === 'ERROR' && (
        <div className="draft-error-msg">
          <AlertCircle size={13} />
          <span>{errorMessage}</span>
        </div>
      )}

      {status === 'SENT' && (
        <div className="draft-success-msg">
          <Check size={14} color="#10b981" />
          <span>Email successfully sent from <strong>bookpdf247@gmail.com</strong> at {sentTimestamp}!</span>
        </div>
      )}

      {(status === 'PENDING' || status === 'ERROR') && (
        <div className="email-draft-actions">
          <button className="btn-cancel-draft" onClick={handleCancel}>
            <X size={13} /> Cancel
          </button>
          <button 
            className="btn-confirm-send" 
            onClick={handleConfirmSend}
            disabled={!draftData.to}
          >
            <Send size={13} />
            <span>Confirm & Send Email</span>
          </button>
        </div>
      )}
    </div>
  );
}
