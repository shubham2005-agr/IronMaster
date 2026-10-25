import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import AuthPage from './components/AuthPage';
import {
  sendChatMessage,
  streamChatMessage,
  getSessionHistory,
  createNewSession,
  clearSessionMessages,
  getUser,
  getCurrentUser,
  logoutUser
} from './api';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => getUser());
  const [sessionId, setSessionId] = useState('user1');
  const [messages, setMessages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingEnabled, setStreamingEnabled] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
    <>
      <Header
        sessionId={sessionId}
        setSessionId={setSessionId}
        onNewSession={handleNewSession}
        currentUser={currentUser}
        onLogout={handleLogout}
      />
      <div className="app-container">
        <Sidebar
          sessionId={sessionId}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
          onSendSuggestedPrompt={handleSendMessage}
          refreshTrigger={refreshTrigger}
          currentUser={currentUser}
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
        />
      </div>
    </>
  );
}
