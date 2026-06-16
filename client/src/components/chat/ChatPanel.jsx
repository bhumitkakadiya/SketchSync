import { useRef, useEffect, useState } from 'react';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';

export default function ChatPanel({ roomId, sendMessage }) {
  const { messages, isOpen, setIsOpen } = useChatStore();
  const { user } = useAuthStore();
  const [text, setText] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current && isOpen) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) {
      sendMessage(roomId, text);
      setText('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-4 bottom-24 w-80 max-h-[60vh] flex flex-col shadow-2xl rounded-2xl overflow-hidden z-40 border border-white/[0.06] animate-slide-up" style={{ background: 'var(--bg-card)' }}>
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between flex-shrink-0" style={{ background: 'var(--bg-surface)' }}>
        <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Room Chat</h3>
        <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded-md transition-colors" style={{ color: 'var(--text-secondary)' }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-black/5" style={{ minHeight: '200px' }}>
        {messages.length === 0 ? (
          <p className="text-center text-xs mt-4" style={{ color: 'var(--text-secondary)' }}>No messages yet. Say hello!</p>
        ) : (
          messages.map((msg) => {
            const isMe = 
              msg.userId === String(user?.id) || 
              msg.userId === String(user?._id) || 
              msg.username === user?.username;
              
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <span className="text-[10px] mb-1 opacity-70" style={{ color: 'var(--text-secondary)' }}>
                  {isMe ? 'You' : msg.displayName}
                </span>
                <div 
                  className={`px-3 py-2 rounded-2xl max-w-[85%] text-sm break-words`}
                  style={{
                    backgroundColor: isMe ? msg.color : 'var(--bg-primary)',
                    color: isMe ? '#fff' : 'var(--text-primary)',
                    borderBottomRightRadius: isMe ? '4px' : '16px',
                    borderBottomLeftRadius: !isMe ? '4px' : '16px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                  }}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t border-white/[0.06] flex-shrink-0" style={{ background: 'var(--bg-surface)' }}>
        <div className="relative">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            className="w-full pl-3 pr-10 py-2 rounded-xl text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-brand-500"
            style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--bg-border)' }}
          />
          <button 
            type="submit" 
            disabled={!text.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-brand-500 hover:bg-brand-500/10 disabled:opacity-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
