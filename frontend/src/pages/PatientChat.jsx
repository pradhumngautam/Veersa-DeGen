import React, { useState, useEffect, useRef } from 'react';
// We only need 'supabase' from this import
import { supabase } from '../lib/supabase'; 
import { useAuth } from '../contexts/AuthContext';
import './Dashboard.css';

// SVG Icon (unchanged)
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
  // No need for eventSourceRef

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

  // --- THIS IS THE FIXED (NON-STREAMING) FUNCTION ---
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
  	setLoading(true); // Show loading dots
  	setError(null);

  	try {
  	  // 1. Get the user's auth token
  	  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  	  if (sessionError) throw sessionError;
      if (!sessionData.session) throw new Error("No active session. Please log in again.");
  	  const token = sessionData.session.access_token;

      // 2. Call the (non-streaming) Edge Function
      const { data, error } = await supabase.functions.invoke('patient-chat', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        // body must be a string for .invoke()
        body: JSON.stringify({
          message: userMessage.content,
        }),
      });

  	  if (error) {
        // Try to parse the error message from the function
        try {
          const errJson = JSON.parse(error.message);
          throw new Error(errJson.error || error.message);
        } catch (e) {
          throw new Error(error.message);
        }
      }

  	  // 3. Add the model's response to state
  	  const modelResponse = {
  		role: 'model',
  		content: data.response,
  		created_at: new Date().toISOString(),
  	  };
  	  setMessages((prev) => [...prev, modelResponse]);

  	} catch (err) {
  	  console.error('handleSubmit error:', err);
  	  setError(err.message || 'Failed to get a response. Please try again.');
  	  // Remove the user's optimistic message on error
  	  setMessages((prev) => prev.slice(0, -1));
  	} finally {
  	  // This will now correctly run and stop the loading dots
  	  setLoading(false); 
  	}
  };

  // The rest of your component (return/JSX) is unchanged.
  return (
    <>
      <style>{`
        /* ... all your CSS is unchanged ... */
        .chat-container {
          display: flex;
          flex-direction: column;
          height: calc(100vh - 200px);
          background-color: #f9fafb;
          border-radius: 8px;
          overflow: hidden;
        }
        .chat-messages {
          flex-grow: 1;
          overflow-y: auto;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .chat-bubble {
          padding: 12px 16px;
          border-radius: 18px;
          max-width: 75%;
          word-wrap: break-word;
          line-height: 1.6;
        }
        .chat-bubble.user {
          background-color: #3b82f6;
          color: white;
          border-bottom-right-radius: 4px;
          align-self: flex-end;
        }
        .chat-bubble.model {
          background-color: #e5e7eb;
          color: #1f2937;
          border-bottom-left-radius: 4px;
          align-self: flex-start;
          white-space: pre-wrap; 
        }
        .chat-input-form {
          display: flex;
          padding: 16px;
          border-top: 1px solid #e5e7eb;
          background-color: #ffffff;
        }
        .chat-input {
          flex-grow: 1;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 10px 16px;
          font-size: 1rem;
          margin-right: 12px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .chat-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
        }
        .chat-send-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0 16px;
          cursor: pointer;
          transition: background-color 0.2s;
      	}
  	  .chat-send-btn:hover {
  		background-color: #2563eb;
  	  }
  	  .chat-send-btn:disabled {
  		background-color: #9ca3af;
  		cursor: not-allowed;
  	  }
  	  .loading-bubble {
  		display: flex;
  		align-items: center;
  		gap: 8px;
  		align-self: flex-start;
  	  }
  	  .loading-dot {
  		height: 8px;
  		width: 8px;
  		border-radius: 50%;
  		background-color: #9ca3af;
  		animation: bounce 1.4s infinite both;
  	  }
  	  .loading-dot:nth-child(2) {
  		animation-delay: -0.16s;
  	  }
  	  .loading-dot:nth-child(3) {
  		animation-delay: -0.32s;
  	  }
  	  @keyframes bounce {
  		0%, 80%, 100% {
  		  transform: scale(0);
  		} 40% {
  		  transform: scale(1.0);
  		}
  	  }
  	  .error-message {
  		color: #ef4444;
	text-align: center;
  		padding: 8px;
  	  }
  	`}</style>

  	<div className="dashboard-container">
  	  <aside className="dashboard-sidebar">
  		<div className="sidebar-header">
  		  <h2>Patient Portal</h2>
  		</div>
  		<nav className="sidebar-nav">
  		  <a href="/dashboard">Dashboard</a>
  		  <a href="/medical-records">Medical Records</a>
  		  <a href="/patient-chat" className="active">AI Assistant</a>
  		</nav>
  	  </aside>

  	  <main className="dashboard-main">
  		<header className="dashboard-header">
  		  <h1>AI Medical Assistant</h1>
  		</header>

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

  			  {/* Loading indicator */}
  			  {loading && (
  				<div className="loading-bubble">
  				  <div className="loading-dot"></div>
  				  <div className="loading-dot"></div>
  				  <div className="loading-dot"></div>
  				</div>
  			  )}

  			  {error && (
  				<div className="error-message">
Back-tick  				  <strong>Error:</strong> {error}
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
  	  </main>
  	</div>
    </>
  );
}