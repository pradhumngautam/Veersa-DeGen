import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase'; 
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import './Dashboard.css';

// SVG Icon
const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" height="1.2em" width="1.2em">
    <path d="M3.4 20.4l17.4-7.4c.8-.4.8-1.6 0-2L3.4 3.6c-.6-.2-1.2.2-1.2.9l.6 6.1c0 .6.5 1.1 1.1 1.1h6.1c.6 0 1.1.5 1.1 1.1s-.5 1.1-1.1 1.1H4l-.6 6.1c0 .7.6 1.1 1.2.9z" />
  </svg>
);

export default function PatientChat() {
  const { userProfile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  async function fetchHistory() {
    if (!userProfile?.profile?.id) return;
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('ai_chat_logs')
        .select('role, content, created_at')
        .eq('patient_id', userProfile.profile.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      setError('Failed to fetch chat history.');
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHistory();
  }, [userProfile]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || loading) return;

    const userMessage = {
      role: 'user',
      content: newMessage.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setNewMessage('');
    setLoading(true);
    setError(null);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session) throw new Error("No active session. Please log in again.");
      const token = sessionData.session.access_token;

      const { data, error } = await supabase.functions.invoke('patient-chat', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
        }),
      });

      if (error) {
        try {
          const errJson = JSON.parse(error.message);
          throw new Error(errJson.error || error.message);
        } catch (e) {
          throw new Error(error.message);
        }
      }

      const modelResponse = {
        role: 'model',
        content: data.response,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, modelResponse]);

    } catch (err) {
      console.error('handleSubmit error:', err);
      setError(err.message || 'Failed to get a response. Please try again.');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false); 
    }
  };

  return (
    <Layout>
      <div className="dashboard-wrapper">
        <div className="dashboard-content">
          <div className="card chat-container">
            <div className="chat-messages">
              <div className="chat-bubble model">
                Hello! I'm your AI assistant. I can help answer questions based on your uploaded medical records. How can I help today?
              </div>

              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`chat-bubble ${msg.role === 'user' ? 'user' : 'model'}`}
                >
                  {msg.content}
                </div>
              ))}

              {loading && (
                <div className="loading-bubble">
                  <div className="loading-dot"></div>
                  <div className="loading-dot"></div>
                  <div className="loading-dot"></div>
                </div>
              )}

              {error && (
                <div className="error-message">
                  <strong>Error:</strong> {error}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-form" onSubmit={handleSubmit}>
              <input
                type="text"
                className="chat-input"
                placeholder="Ask about your records..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={loading}
              />
              <button
                type="submit"
                className="chat-send-btn"
                disabled={!newMessage.trim() || loading}
              >
                <SendIcon />
              </button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
