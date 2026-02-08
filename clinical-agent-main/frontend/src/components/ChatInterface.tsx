import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService, ChatMessage, ChatResponse, Citation, ChatHistory } from '../services/api';
import './ChatInterface.css';

const ChatInterface: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [sessions, setSessions] = useState<ChatHistory[]>([]);
  const [showSessionManager, setShowSessionManager] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (patientId) {
      const newSessionId = `session-${patientId}-${Date.now()}`;
      setSessionId(newSessionId);
      loadChatHistory(newSessionId);
      loadSessions();
    }
  }, [patientId]);

  useEffect(() => {
    if (messages.length > 0) {
      loadSessions();
    }
  }, [messages.length]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatHistory = async (sid: string) => {
    try {
      const history = await apiService.getChatHistory(sid);
      setMessages(history.messages);
      setSessionId(sid);
    } catch (err) {
      // Session doesn't exist yet, that's fine
      console.log('No existing chat history');
      setMessages([]);
    }
  };

  const loadSessions = async () => {
    try {
      const data = await apiService.listChatSessions();
      // Filter to show only sessions for this patient
      const patientSessions = data.sessions.filter(s => s.session_id.startsWith(`session-${patientId}-`));
      setSessions(patientSessions);
    } catch (err) {
      console.error('Error loading sessions:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || loading || !sessionId) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);
    setError(null);

    try {
      const response: ChatResponse = await apiService.sendChatMessage({
        session_id: sessionId,
        message: inputMessage,
        top_k: 5,
      });

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.answer,
        timestamp: new Date().toISOString(),
        citations: response.citations,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      await loadSessions();
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Failed to send message';
      setError(errorMessage);
      console.error('Error sending message:', err);
      
      // Remove the user message on error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = async () => {
    if (!sessionId) return;
    
    try {
      await apiService.deleteChatSession(sessionId);
      setMessages([]);
      const newSessionId = `session-${patientId}-${Date.now()}`;
      setSessionId(newSessionId);
      await loadSessions();
    } catch (err) {
      console.error('Error clearing chat:', err);
    }
  };

  const handleSwitchSession = async (sid: string) => {
    await loadChatHistory(sid);
    setShowSessionManager(false);
  };

  const handleDeleteSession = async (sid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this session?')) return;
    
    try {
      await apiService.deleteChatSession(sid);
      if (sid === sessionId) {
        setMessages([]);
        const newSessionId = `session-${patientId}-${Date.now()}`;
        setSessionId(newSessionId);
      }
      await loadSessions();
    } catch (err) {
      console.error('Error deleting session:', err);
    }
  };

  const handleNewSession = () => {
    const newSessionId = `session-${patientId}-${Date.now()}`;
    setSessionId(newSessionId);
    setMessages([]);
    setShowSessionManager(false);
  };

  const renderCitations = (citations?: Citation[]) => {
    if (!citations || citations.length === 0) return null;

    return (
      <div className="citations">
        <div className="citations-header">References:</div>
        {citations.map((citation, idx) => (
          <div key={idx} className="citation-item">
            <div className="citation-header">
              <span className="citation-source">{citation.source}</span>
              {citation.page && (
                <span className="citation-page">Page {citation.page}</span>
              )}
              {citation.section && (
                <span className="citation-section">{citation.section}</span>
              )}
            </div>
            <div className="citation-excerpt">{citation.excerpt}</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <button className="back-button" onClick={() => navigate('/')}>
          ← Back to Patients
        </button>
        <button 
          className="session-button" 
          onClick={() => setShowSessionManager(!showSessionManager)}
        >
          {showSessionManager ? '✕ Close' : '📋 Sessions'}
        </button>
        <div className="session-info">
          <span className="session-id-label">Session:</span>
          <span className="session-id-value">{sessionId || 'New'}</span>
        </div>
        {patientId && (
          <button
            className="assess-button"
            onClick={() => navigate(`/assess/${patientId}`)}
          >
            View Assessment
          </button>
        )}
        <button className="clear-button" onClick={handleClearChat}>
          Clear Chat
        </button>
        <h3>Chat with Clinical Decision Support</h3>
      </div>

      {showSessionManager && (
        <div className="session-manager">
          <div className="session-manager-header">
            <h4>Session Management (Patient: {patientId})</h4>
            <button className="new-session-button" onClick={handleNewSession}>
              + New Session
            </button>
          </div>

          <div className="sessions-list">
            <div className="sessions-list-header">
              <span>Patient Sessions ({sessions.length})</span>
              <button className="refresh-sessions-button" onClick={loadSessions}>
                🔄 Refresh
              </button>
            </div>
            {sessions.length === 0 ? (
              <div className="no-sessions">No sessions for this patient</div>
            ) : (
              <div className="sessions-items">
                {sessions.map((session) => (
                  <div
                    key={session.session_id}
                    className={`session-item ${session.session_id === sessionId ? 'active' : ''}`}
                    onClick={() => handleSwitchSession(session.session_id)}
                  >
                    <div className="session-item-header">
                      <span className="session-item-id">{session.session_id}</span>
                      <button
                        className="delete-session-button"
                        onClick={(e) => handleDeleteSession(session.session_id, e)}
                      >
                        🗑️
                      </button>
                    </div>
                    <div className="session-item-info">
                      <span className="session-message-count">
                        {session.messages.length} message{session.messages.length !== 1 ? 's' : ''}
                      </span>
                      <span className="session-date">
                        {new Date(session.last_updated).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="error-message">{error}</div>
      )}

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="welcome-message">
            <p>Welcome! Ask me questions about NG12 Cancer Guidelines.</p>
            <p className="welcome-hint">
              Try asking: "What symptoms trigger urgent lung cancer referral?"
            </p>
          </div>
        ) : (
          messages.map((message, idx) => (
            <div
              key={idx}
              className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
            >
              <div className="message-header">
                <span className="message-role">
                  {message.role === 'user' ? 'You' : 'Assistant'}
                </span>
                <span className="message-time">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="message-content">{message.content}</div>
              {message.role === 'assistant' && renderCitations(message.citations)}
            </div>
          ))
        )}
        {loading && (
          <div className="message assistant-message">
            <div className="message-content loading-indicator">
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <textarea
          className="chat-input"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your question about NG12 guidelines..."
          rows={2}
          disabled={loading}
        />
        <button
          className="send-button"
          onClick={handleSendMessage}
          disabled={!inputMessage.trim() || loading}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatInterface;

