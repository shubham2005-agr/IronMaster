// API Client for Ragnarok AI Agent Backend (Port 8080) with JWT & RBAC
const API_BASE = '/api';

// Storage keys
const TOKEN_KEY = 'ragnarok_jwt_token';
const USER_KEY = 'ragnarok_auth_user';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function setUser(user) {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

export function removeAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new CustomEvent('ragnarok_auth_changed', { detail: null }));
}

export function authHeaders(customHeaders = {}) {
  const token = getToken();
  const headers = { ...customHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchWithAuth(url, options = {}) {
  const headers = authHeaders(options.headers || {});
  const config = { ...options, headers };

  const response = await fetch(url, config);

  if (response.status === 401) {
    // Unauthorized: token might be expired or invalid
    removeAuth();
    throw new Error('Unauthorized: Session expired or invalid credentials. Please sign in again.');
  }

  return response;
}

// ----------------- Auth API -----------------

export async function loginUser(email, password) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Login failed. Please check your credentials.');
  }

  setToken(data.token);
  const user = {
    id: data.id,
    email: data.email,
    fullName: data.fullName,
    role: data.role,
  };
  setUser(user);
  window.dispatchEvent(new CustomEvent('ragnarok_auth_changed', { detail: user }));
  return data;
}

export async function registerUser(email, password, fullName, role = 'ROLE_USER') {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, fullName, role }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Registration failed.');
  }

  setToken(data.token);
  const user = {
    id: data.id,
    email: data.email,
    fullName: data.fullName,
    role: data.role,
  };
  setUser(user);
  window.dispatchEvent(new CustomEvent('ragnarok_auth_changed', { detail: user }));
  return data;
}

export async function getCurrentUser() {
  const response = await fetchWithAuth(`${API_BASE}/auth/me`);
  if (!response.ok) {
    throw new Error('Failed to fetch user profile');
  }
  const user = await response.json();
  setUser(user);
  return user;
}

export async function logoutUser() {
  try {
    await fetch(`${API_BASE}/auth/logout`, { method: 'POST' });
  } catch (e) {
    // ignore network errors on logout
  } finally {
    removeAuth();
  }
}

// ----------------- Chat & Memory API -----------------

export async function sendChatMessage(sessionId, message) {
  const response = await fetchWithAuth(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, message }),
  });
  if (!response.ok) {
    throw new Error(`Chat request failed: ${response.statusText}`);
  }
  return response.json();
}

export function streamChatMessage(sessionId, message, { onChunk, onComplete, onError }) {
  const token = getToken();
  const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
  const url = `${API_BASE}/chat/stream?sessionId=${encodeURIComponent(sessionId)}&message=${encodeURIComponent(message)}${tokenParam}`;
  const controller = new AbortController();

  let isCompleted = false;
  let idleTimer = null;
  let hasReceivedData = false;

  const completeStream = () => {
    if (isCompleted) return;
    isCompleted = true;
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
    try {
      controller.abort();
    } catch (e) {
      // Ignore abort errors
    }
    onComplete();
  };

  const resetIdleTimer = () => {
    if (idleTimer) clearTimeout(idleTimer);
    // If tokens were received and server goes completely silent for 2200ms, auto-complete
    idleTimer = setTimeout(() => {
      if (!isCompleted && hasReceivedData) {
        completeStream();
      }
    }, 2200);
  };

  fetch(url, {
    signal: controller.signal,
    headers: authHeaders({ 'Accept': 'text/event-stream' })
  })
    .then(async (response) => {
      if (response.status === 401) {
        removeAuth();
        throw new Error('Unauthorized');
      }
      if (!response.ok) {
        throw new Error(`Streaming failed with status: ${response.status}`);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      const processEvent = (eventBlock) => {
        if (!eventBlock || isCompleted) return;
        const lines = eventBlock.split(/\r?\n/);
        const dataLines = [];
        for (const line of lines) {
          if (line.startsWith('data:')) {
            // Spring WebFlux writes "data:" + chunk without adding extra space after colon
            // Preserving everything after "data:" ensures leading spaces in tokens are NOT stripped
            dataLines.push(line.slice(5));
          }
        }
        if (dataLines.length > 0) {
          const fullData = dataLines.join('\n');
          if (!fullData) return;

          // Check for [DONE] termination sentinel
          if (fullData.trim() === '[DONE]') {
            completeStream();
            return;
          }

          if (fullData.includes('[DONE]')) {
            const [before] = fullData.split('[DONE]');
            if (before) {
              onChunk(before);
            }
            completeStream();
            return;
          }

          hasReceivedData = true;
          resetIdleTimer();

          if (fullData.startsWith('{') && fullData.endsWith('}')) {
            try {
              const parsed = JSON.parse(fullData);
              const textContent = parsed.content ?? parsed.chunk ?? parsed.message ?? fullData;
              if (textContent === '[DONE]') {
                completeStream();
                return;
              }
              onChunk(textContent);
              return;
            } catch (e) {
              // Not JSON, continue to treat as raw text
            }
          }
          onChunk(fullData);
        }
      };

      let buffer = '';

      while (!isCompleted) {
        let readResult;
        try {
          readResult = await reader.read();
        } catch (err) {
          if (isCompleted || err.name === 'AbortError') {
            break;
          }
          throw err;
        }

        const { value, done } = readResult;
        if (done || isCompleted) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() ?? '';

        for (const event of events) {
          processEvent(event);
          if (isCompleted) break;
        }
      }

      if (!isCompleted) {
        if (buffer) {
          processEvent(buffer);
        }
        completeStream();
      }
    })
    .catch((err) => {
      if (idleTimer) clearTimeout(idleTimer);
      if (err.name !== 'AbortError' && !isCompleted) {
        onError(err);
      }
    });

  return () => {
    if (idleTimer) clearTimeout(idleTimer);
    isCompleted = true;
    try {
      controller.abort();
    } catch (e) {}
  };
}

export async function rememberMemory(sessionId, text, category = 'preference') {
  const response = await fetchWithAuth(`${API_BASE}/memory/remember`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, text, category }),
  });
  if (!response.ok) {
    throw new Error(`Failed to store memory: ${response.statusText}`);
  }
  return response.json();
}

export async function uploadKnowledgeDocument(file, category = 'general') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', category);

  const response = await fetchWithAuth(`${API_BASE}/knowledge/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    throw new Error(`Failed to upload document: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchSessions() {
  const response = await fetchWithAuth(`${API_BASE}/sessions`);
  if (!response.ok) {
    throw new Error(`Failed to fetch sessions: ${response.statusText}`);
  }
  return response.json();
}

export async function createNewSession(sessionId, title) {
  const response = await fetchWithAuth(`${API_BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, title }),
  });
  if (!response.ok) {
    throw new Error(`Failed to create session: ${response.statusText}`);
  }
  return response.json();
}

export async function updateSessionTitle(sessionId, title) {
  const response = await fetchWithAuth(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}/title`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!response.ok) {
    throw new Error(`Failed to update session title: ${response.statusText}`);
  }
  return response.json();
}

export async function deleteSession(sessionId) {
  const response = await fetchWithAuth(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete session: ${response.statusText}`);
  }
  return response.json();
}

export async function getSessionHistory(sessionId) {
  const response = await fetchWithAuth(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}/messages`);
  if (!response.ok) {
    throw new Error(`Failed to fetch session messages: ${response.statusText}`);
  }
  return response.json();
}

export async function clearSessionMemory(sessionId) {
  const response = await fetchWithAuth(`${API_BASE}/memory/session/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to clear session memory: ${response.statusText}`);
  }
  return response.json();
}

export async function clearSessionMessages(sessionId) {
  const response = await fetchWithAuth(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}/messages`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to clear session messages: ${response.statusText}`);
  }
  return response.json();
}

// FR1.1 Episodic Memory Search
export async function searchEpisodicMemory(query = '', conversationId = '', limit = 20) {
  const params = new URLSearchParams();
  if (query) params.append('query', query);
  if (conversationId) params.append('conversationId', conversationId);
  params.append('limit', limit);
  const response = await fetchWithAuth(`${API_BASE}/memory/episodic?${params.toString()}`);
  if (!response.ok) throw new Error('Failed to search episodic memory');
  return response.json();
}

// FR1.3 Memory Consolidation & Pruning
export async function consolidateMemories() {
  const response = await fetchWithAuth(`${API_BASE}/memory/consolidate`, { method: 'POST' });
  if (!response.ok) throw new Error('Consolidation failed');
  return response.json();
}

export async function pruneMemories(days = 30) {
  const response = await fetchWithAuth(`${API_BASE}/memory/prune?days=${days}`, { method: 'POST' });
  if (!response.ok) throw new Error('Pruning failed');
  return response.json();
}

// FR2: Skills API
export async function fetchSkills() {
  const response = await fetchWithAuth(`${API_BASE}/skills`);
  if (!response.ok) throw new Error('Failed to fetch skills');
  return response.json();
}

export async function executeSkill(skillId, parameters = {}) {
  const response = await fetchWithAuth(`${API_BASE}/skills/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ skillId, parameters }),
  });
  if (!response.ok) throw new Error('Skill execution failed');
  return response.json();
}

// FR3: Autonomous Workflow API
export async function generateWorkflowPlan(goal) {
  const response = await fetchWithAuth(`${API_BASE}/workflow/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal }),
  });
  if (!response.ok) throw new Error('Failed to generate workflow plan');
  return response.json();
}

export async function executeWorkflow(goal) {
  const response = await fetchWithAuth(`${API_BASE}/workflow/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal }),
  });
  if (!response.ok) throw new Error('Workflow execution failed');
  return response.json();
}

export async function fetchWorkflowExecutions() {
  const response = await fetchWithAuth(`${API_BASE}/workflow/executions`);
  if (!response.ok) throw new Error('Failed to fetch executions');
  return response.json();
}

export async function retryWorkflow(planId) {
  const response = await fetchWithAuth(`${API_BASE}/workflow/executions/${encodeURIComponent(planId)}/retry`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to retry workflow');
  return response.json();
}

// FR4: Contextual Proactivity Suggestions
export async function fetchSuggestions() {
  const response = await fetchWithAuth(`${API_BASE}/suggestions`);
  if (!response.ok) throw new Error('Failed to fetch suggestions');
  return response.json();
}

export async function dismissSuggestion(id) {
  const response = await fetchWithAuth(`${API_BASE}/suggestions/${id}/dismiss`, { method: 'POST' });
  if (!response.ok) throw new Error('Failed to dismiss suggestion');
  return response.json();
}

export async function acceptSuggestion(id) {
  const response = await fetchWithAuth(`${API_BASE}/suggestions/${id}/accept`, { method: 'POST' });
  if (!response.ok) throw new Error('Failed to accept suggestion');
  return response.json();
}

export async function triggerAgentSweep() {
  const response = await fetchWithAuth(`${API_BASE}/agent/sweep`, { method: 'POST' });
  if (!response.ok) throw new Error('Failed to run agent sweep');
  return response.json();
}

// ----------------- Email Service API -----------------

export async function sendManualEmail(to, subject, body, sessionId = '') {
  const response = await fetchWithAuth(`${API_BASE}/email/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, subject, body, sessionId }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to send email');
  }
  return data;
}

export async function stageEmailDraft(to, subject, body, sessionId = '') {
  const response = await fetchWithAuth(`${API_BASE}/email/draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, subject, body, sessionId }),
  });
  if (!response.ok) throw new Error('Failed to create email draft');
  return response.json();
}

export async function confirmEmailDraft(draftId) {
  const response = await fetchWithAuth(`${API_BASE}/email/confirm/${encodeURIComponent(draftId)}`, {
    method: 'POST',
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Confirmation failed');
  }
  return data;
}

export async function cancelEmailDraft(draftId) {
  const response = await fetchWithAuth(`${API_BASE}/email/cancel/${encodeURIComponent(draftId)}`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to cancel draft');
  return response.json();
}

export async function getPendingEmailDraft(sessionId) {
  const response = await fetchWithAuth(`${API_BASE}/email/session/${encodeURIComponent(sessionId)}/pending`);
  if (response.status === 204) return null;
  if (!response.ok) return null;
  return response.json();
}

export async function getEmailConfig() {
  const response = await fetchWithAuth(`${API_BASE}/email/config`);
  if (!response.ok) throw new Error('Failed to fetch email configuration');
  return response.json();
}

