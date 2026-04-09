import React, { useState, useRef, useEffect } from 'react';
import useAppStore from '../../store';
import { PageHeader } from '../../components/UI';
import { Send, Sparkles, User } from 'lucide-react';

function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{ display: 'flex', gap: '10px', flexDirection: isUser ? 'row-reverse' : 'row', marginBottom: '16px' }}>
      <div style={{
        width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
        background: isUser ? 'rgba(79,142,247,0.2)' : 'rgba(139,92,246,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {isUser ? <User size={13} color="#4f8ef7" /> : <Sparkles size={13} color="#8b5cf6" />}
      </div>
      <div className={isUser ? 'chat-user' : 'chat-ai'} style={{ maxWidth: '75%', padding: '10px 14px', fontSize: '13px', lineHeight: '1.6', color: 'var(--text-primary)' }}>
        {msg.content.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
          part.startsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <span key={i}>{part}</span>
        )}
      </div>
    </div>
  );
}

export default function Mentor() {
  const { chatMessages, addChatMessage, marks, roadmapNodes, riskScore } = useAppStore();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chatMessages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    addChatMessage({ role: 'user', content: text });
    setLoading(true);

    try {
      const history = chatMessages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }));

      const data = await fetch('http://localhost:8000/api/mentor/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ message: text, conversation_history: history }),
      }).then(r => r.json());

      addChatMessage({ role: 'assistant', content: data.reply || 'Sorry, I could not generate a response.' });
    } catch (err) {
      addChatMessage({ role: 'assistant', content: 'Connection error. Please check the backend is running.' });
    } finally {
      setLoading(false);
    }
  };

  const weakSubjects = marks
    ?.filter(m => m.max_score > 0 && (m.score / m.max_score) < 0.6)
    .map(m => `${m.subject} (${Math.round((m.score / m.max_score) * 100)}%)`) || [];

  const currentNode = roadmapNodes?.find(n => n.status === 'in_progress')?.title;

  const SUGGESTED = [
    'What should I study today?',
    currentNode ? `Explain ${currentNode} with examples` : 'Give me a study plan',
    weakSubjects[0] ? `Help me improve in ${weakSubjects[0].split(' ')[0]}` : 'Which topics are most urgent?',
    'Give me 5 practice problems',
  ];

  return (
    <div className="fade-in-up" style={{ maxWidth: '760px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 102px)' }}>
      <PageHeader
        title="AI Mentor"
        subtitle="Context-aware academic tutor · knows your roadmap, marks, and weak spots"
      />

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {weakSubjects.slice(0, 2).map((s, i) => (
          <span key={i} className="badge-red" style={{ fontSize: '10px', padding: '3px 10px', borderRadius: '99px', fontWeight: '500' }}>Weak: {s}</span>
        ))}
        {currentNode && <span className="badge-blue" style={{ fontSize: '10px', padding: '3px 10px', borderRadius: '99px', fontWeight: '500' }}>Current: {currentNode}</span>}
        {riskScore && <span className="badge-yellow" style={{ fontSize: '10px', padding: '3px 10px', borderRadius: '99px', fontWeight: '500' }}>Risk: {riskScore.level}</span>}
      </div>

      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {chatMessages.map((msg, i) => <Message key={i} msg={msg} />)}
          {loading && (
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={13} color="#8b5cf6" />
              </div>
              <div className="chat-ai" style={{ padding: '12px 14px', display: 'flex', gap: '5px', alignItems: 'center' }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#8b5cf6', opacity: 0.7, animation: `bounce 1s infinite ${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {chatMessages.length <= 1 && (
          <div style={{ padding: '0 20px 12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {SUGGESTED.map((s, i) => (
              <button key={i} onClick={() => setInput(s)} className="btn btn-ghost" style={{ fontSize: '11px', padding: '5px 12px' }}>{s}</button>
            ))}
          </div>
        )}

        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px' }}>
          <input
            className="input"
            placeholder="Ask anything about your studies..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" onClick={send} disabled={loading || !input.trim()} style={{ padding: '8px 14px' }}>
            <Send size={14} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }
      `}</style>
    </div>
  );
}
