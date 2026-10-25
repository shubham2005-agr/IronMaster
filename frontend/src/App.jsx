import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import WorkspaceView from './components/WorkspaceView';
import AuthPage from './components/AuthPage';
import {
  sendChatMessage,
  streamChatMessage,
  getSessionHistory,
  createNewSession,
  clearSessionMessages,
  getUser,
  getCurrentUser,
  logoutUser,
  fetchSuggestions
} from './api';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => getUser());
  const [activeNav, setActiveNav] = useState('chat'); // 'chat' | 'workflows' | 'docs' | 'memory' | 'suggestions' | 'email'
  const [sessionId, setSessionId] = useState('user1');
  const [messages, setMessages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingEnabled, setStreamingEnabled] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [suggestionsCount, setSuggestionsCount] = useState(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const abortStreamRef = useRef(null);
  const assistantContentRef = useRef('');

  // Sync auth state via custom events
  useEffect(() => {
    const handleAuthChange = (e) => {
      setCurrentUser(e.detail);
    };
    window.addEventListener('ragnarok_auth_changed', handleAuthChange);

    // Verify token validity on load
    if (currentUser) {
      getCurrentUser().catch((err) => {
        console.warn('Token validation failed, signing out:', err.message);
        setCurrentUser(null);
      });
    }

    return () => {
      window.removeEventListener('ragnarok_auth_changed', handleAuthChange);
    };
  }, []);

  // Fetch pending suggestions for the navbar badge
  useEffect(() => {
    if (currentUser) {
      fetchSuggestions()
        .then((sugs) => {
          if (Array.isArray(sugs)) {
            setSuggestionsCount(sugs.length);
          }
        })
        .catch(() => {});
    }
  }, [currentUser, refreshTrigger]);

  // Load existing session history on initial load or session switch
  useEffect(() => {
    if (currentUser) {
      loadSessionContext(sessionId);
    }
  }, [sessionId, currentUser]);

  const loadSessionContext = async (sid) => {
    try {
      const records = await getSessionHistory(sid);
      if (records && records.length > 0) {
        setMessages(records.map(r => ({
          role: r.role,
          content: r.content,
          isStreaming: false
        })));
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.warn('No prior history loaded:', err.message);
      setMessages([]);
    }
  };

  const handleSelectSession = (sid) => {
    if (sid === sessionId) return;
    if (isGenerating) {
      handleStopGeneration();
    }
    setSessionId(sid);
    if (activeNav !== 'chat') {
      setActiveNav('chat');
    }
  };

  const handleNewSession = async () => {
    if (isGenerating) {
      handleStopGeneration();
    }
    const newId = `session-${Math.random().toString(36).substring(2, 7)}`;
    try {
      await createNewSession(newId, "New Chat");
    } catch (err) {
      console.warn('Could not register session in backend:', err.message);
    }
    setSessionId(newId);
    setMessages([]);
    setRefreshTrigger(prev => prev + 1);
    if (activeNav !== 'chat') {
      setActiveNav('chat');
    }
  };

  const handleClearChat = async () => {
    if (messages.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete all messages in chat session "${sessionId}"?`)) return;

    try {
      await clearSessionMessages(sessionId);
      setMessages([]);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Failed to clear chat from backend:', err);
      setMessages([]);
      setRefreshTrigger(prev => prev + 1);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setMessages([]);
  };

  const handleSendMessage = async (text) => {
    if (!text.trim() || isGenerating) return;

    // Switch back to chat view if triggered from a workspace prompt
    if (activeNav !== 'chat') {
      setActiveNav('chat');
    }

    const userMessage = { role: 'USER', content: text, isStreaming: false };
    setMessages((prev) => [...prev, userMessage]);
    setIsGenerating(true);

    if (streamingEnabled) {
      assistantContentRef.current = '';
      setMessages((prev) => [
        ...prev,
        { role: 'ASSISTANT', content: '', isStreaming: true }
      ]);

      const stopFn = streamChatMessage(sessionId, text, {
        onChunk: (chunk) => {
          assistantContentRef.current += chunk;
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (!last || !last.isStreaming) return prev;
            return [
              ...prev.slice(0, -1),
              { ...last, content: assistantContentRef.current }
            ];
          });
        },
        onComplete: () => {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (!last || !last.isStreaming) return prev;
            return [
              ...prev.slice(0, -1),
              { ...last, isStreaming: false }
            ];
          });
          setIsGenerating(false);
          abortStreamRef.current = null;
          setRefreshTrigger(prev => prev + 1);
        },
        onError: (err) => {
          console.error('Streaming error:', err);
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            const currentContent = last?.content || '';
            const errorNotice = currentContent
              ? `${currentContent}\n\n*[Stream disconnected: ${err.message}]*`
              : `⚠️ Neural network link error: ${err.message}`;
            return [
              ...prev.slice(0, -1),
              { role: 'ASSISTANT', content: errorNotice, isStreaming: false }
            ];
          });
          setIsGenerating(false);
          abortStreamRef.current = null;
          setRefreshTrigger(prev => prev + 1);
        }
      });

      abortStreamRef.current = stopFn;
    } else {
      try {
        setMessages((prev) => [
          ...prev,
          { role: 'ASSISTANT', content: '...', isStreaming: true }
        ]);
        const response = await sendChatMessage(sessionId, text);
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: 'ASSISTANT', content: response.response, isStreaming: false }
        ]);
      } catch (err) {
        console.error('Chat error:', err);
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: 'ASSISTANT', content: `⚠️ Error: ${err.message}`, isStreaming: false }
        ]);
      } finally {
        setIsGenerating(false);
        setRefreshTrigger(prev => prev + 1);
      }
    }
  };

  const handleStopGeneration = () => {
    if (abortStreamRef.current) {
      abortStreamRef.current();
      abortStreamRef.current = null;
    }
    setMessages(prev => {
      const last = prev[prev.length - 1];
      if (!last || !last.isStreaming) return prev;
      return [
        ...prev.slice(0, -1),
        { ...last, isStreaming: false }
      ];
    });
    setIsGenerating(false);
    setRefreshTrigger(prev => prev + 1);
  };

  // If unauthenticated, display the full-screen sovereign Login/Register page
  if (!currentUser) {
    return <AuthPage onAuthSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="ragnarok-app-shell">
      {/* Dynamic Animated Ambient Aurora Orbs */}
      <div className="ambient-aurora-container" aria-hidden="true">
        <div className="aurora-orb orb-1" />
        <div className="aurora-orb orb-2" />
        <div className="aurora-orb orb-3" />
      </div>

      {/* Modern Aesthetic Navigation Bar */}
      <Navbar
        activeNav={activeNav}
        onSelectNav={(navId) => setActiveNav(navId)}
        sessionId={sessionId}
        onNewSession={handleNewSession}
        currentUser={currentUser}
        onLogout={handleLogout}
        suggestionsCount={suggestionsCount}
        onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isSidebarCollapsed={isSidebarCollapsed}
      />

      {/* Main View Port: Either Chat Layout or Dedicated Workspace View */}
      <div className="main-viewport-content">
        {activeNav === 'chat' ? (
          <div className={`app-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            <Sidebar
              sessionId={sessionId}
              onSelectSession={handleSelectSession}
              onNewSession={handleNewSession}
              onSendSuggestedPrompt={handleSendMessage}
              refreshTrigger={refreshTrigger}
              currentUser={currentUser}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            />
            <ChatArea
              messages={messages}
              onSendMessage={handleSendMessage}
              isGenerating={isGenerating}
              onStopGeneration={handleStopGeneration}
              streamingEnabled={streamingEnabled}
              setStreamingEnabled={setStreamingEnabled}
              onClearChat={handleClearChat}
              sessionId={sessionId}
              isSidebarCollapsed={isSidebarCollapsed}
              onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            />
          </div>
        ) : (
          <WorkspaceView
            activeNav={activeNav}
            sessionId={sessionId}
            onNavigateToChat={() => setActiveNav('chat')}
            onSendChatMessage={handleSendMessage}
          />
        )}
      </div>
    </div>
  );
}
