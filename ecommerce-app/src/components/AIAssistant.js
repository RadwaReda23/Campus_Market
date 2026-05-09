import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { askCampusAssistant } from '../aiService';
import './AIAssistant.css';

export default function AIAssistant() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([
    {
      id: '1',
      text: 'أهلاً بك! أنا المساعد الذكي لـ Campus Market 🤖\nإزاي أقدر أساعدك؟ (مثال: محتاج بالطو مقاس سمول، أو دورت على مفاتيحي الضايعة؟)',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    const replyText = await askCampusAssistant(userMsg.text);

    const botMsg = {
      id: (Date.now() + 1).toString(),
      text: replyText,
      sender: 'bot',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, botMsg]);
    setIsLoading(false);
  };

  return (
    <div className="ai-assistant-wrapper">
      {isOpen && (
        <div className="ai-chat-window">
          <div className="ai-chat-header">
            <h4>المساعد الذكي 🤖</h4>
            <button className="close-btn" onClick={() => setIsOpen(false)}>✕</button>
          </div>
          
          <div className="ai-chat-body">
            {messages.map((msg) => {
              const urlRegex = /(https?:\/\/[^\s]+)/g;
              return (
                <div key={msg.id} className={`ai-message ${msg.sender}`}>
                  <div className="ai-bubble">
                    {msg.text.split('\n').map((line, i) => {
                      const parts = line.split(urlRegex);
                      return (
                        <p key={i}>
                          {parts.map((part, j) => 
                            urlRegex.test(part) ? (
                              <span 
                                key={j} 
                                onClick={() => { 
                                  setIsOpen(false); 
                                  const qMatch = part.match(/q=([^&]*)/);
                                  const searchQuery = qMatch && qMatch[1] ? decodeURIComponent(qMatch[1]) : "";
                                  navigate(`/home?search=${encodeURIComponent(searchQuery)}`); 
                                }}
                                style={{color: '#c8a84b', textDecoration: 'underline', cursor: 'pointer', fontWeight: 'bold'}}
                              >
                                اضغط هنا لعرض المنتج
                              </span>
                            ) : part
                          )}
                        </p>
                      );
                    })}
                  </div>
                  <span className="ai-time">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}
            {isLoading && (
              <div className="ai-message bot">
                <div className="ai-bubble typing">يكتب...</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="ai-chat-input" onSubmit={handleSend}>
            <input
              type="text"
              placeholder="اكتب رسالتك..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isLoading}
            />
            <button type="submit" disabled={!inputText.trim() || isLoading}>إرسال</button>
          </form>
        </div>
      )}

      {!isOpen && (
        <button className="ai-fab" onClick={() => setIsOpen(true)}>
          <span className="ai-fab-icon">🤖</span>
        </button>
      )}
    </div>
  );
}
