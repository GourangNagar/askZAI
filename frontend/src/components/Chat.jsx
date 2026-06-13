import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Bot, User } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8001`;

const Chat = ({ token }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const history = messages.slice(-4).map(m => `${m.role === 'user' ? 'User' : 'Zai'}: ${m.content}`);
      const res = await fetch(`${API_BASE_URL}/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ text: userMsg, source: "web", history })
      });
      const data = await res.json();

      if (res.ok) {
        setMessages(prev => [...prev, { role: 'bot', content: data.message }]);
      } else {
        setMessages(prev => [...prev, { role: 'bot', content: "Error: " + (data.message || "Something went wrong.") }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', content: "Network error. Make sure the backend is running." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="empty-state">No messages yet. Ask me a question or log an expense!</div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`message ${m.role}`}>
            <div className="message-bubble">{m.content}</div>
          </div>
        ))}
        {loading && (
          <div className="message bot">
            <div className="message-bubble"><div className="loader"></div></div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      <form className="chat-input-area" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="I spent $15 on lunch..."
          disabled={loading}
        />
        <button type="submit" className="primary-btn" disabled={loading} style={{ width: 'auto' }}>
          SEND
        </button>
      </form>
    </div>
  );
};

export default Chat;
