import React, { useState, useRef, useEffect } from 'react';
import useAppStore from '../../store';
import { PageHeader } from '../../components/UI';
import { Send, Sparkles, User } from 'lucide-react';

const MOCK_RESPONSES = [
  "Great question! **Binary Search Trees** allow O(log n) search, insert, and delete on average. The key property: every left child is smaller, every right child is larger. Want me to walk through the insertion algorithm step-by-step?",
  "Based on your ML score of 45%, I'd suggest starting with **linear regression fundamentals** before jumping into neural networks. Your DBMS strength (81%) shows you handle structured thinking well — apply that same approach to ML math.",
  "For placements at your target companies, focus on: **1)** Arrays + Strings (you're strong here), **2)** Graph problems (BFS/DFS — most common), **3)** DP (start with 1D, skip trees for now). You have ~3 weeks before campus season.",
  "Your CN score (63%) is recoverable. The most tested topics in placements are: OSI layers, TCP vs UDP, DNS resolution, and subnetting. Want a focused 5-day plan for CN specifically?",
];

let responseIdx = 0;

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
        {/* Render simple markdown bold */}
        {msg.content.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
          part.startsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <span key={i}>{part}</span>
        )}
      </div>
    </div>
  );
}

export default function Mentor() {
  const { chatMessages, addChatMessage } = useAppStore();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    addChatMessage({ role: 'user', content: text });
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200 + Math.random() * 800));
    const reply = MOCK_RESPONSES[responseIdx % MOCK_RESPONSES.length];
    responseIdx++;
    addChatMessage({ role: 'assistant', content: reply });
    setLoading(false);
  };

  const SUGGESTED = [
    'What should I study today?',
    'Explain BSTs with examples',
    'Give me a 7-day CN plan',
    'Which placement topics are most urgent?',
  ];

  return (
    <div className="fade-in-up" style={{ maxWidth: '760px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 102px)' }}>
      <PageHeader
        title="AI Mentor"
        subtitle="Context-aware academic tutor · knows your roadmap, marks, and weak spots"
      />

      {/* Context chip bar */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {['Weak: ML (45%)', 'Current: BST', 'Sem 6 CSE', 'Goal: Placements'].map((c, i) => (
          <span key={i} className="badge-blue" style={{ fontSize: '10px', padding: '3px 10px', borderRadius: '99px', fontWeight: '500' }}>{c}</span>
        ))}
      </div>

      {/* Chat window */}
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

        {/* Suggestions */}
        {chatMessages.length <= 1 && (
          <div style={{ padding: '0 20px 12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {SUGGESTED.map((s, i) => (
              <button key={i} onClick={() => { setInput(s); }} className="btn btn-ghost" style={{ fontSize: '11px', padding: '5px 12px' }}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
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
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
