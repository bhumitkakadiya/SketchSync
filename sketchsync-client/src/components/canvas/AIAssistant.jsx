import { useState, useRef, useEffect } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { useRoomStore } from '../../store/roomStore';
import { aiService } from '../../services/aiService';
import { TOOLS } from '../../constants/tools';
import { SOCKET_EVENTS } from '../../constants/socketEvents';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

export default function AIAssistant({ socket, sessionId }) {
  const { isAIOpen, toggleAI, setColor, setBrushSize } = useCanvasStore();
  const { room } = useRoomStore();
  
  const [messages, setMessages] = useState([
    { id: '1', role: 'ai', content: 'Hi! I can answer questions or draw on the whiteboard for you. Try saying "draw a red circle".' }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isAIOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isAIOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isThinking) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { id: uuidv4(), role: 'user', content: userMessage }]);
    setIsThinking(true);

    try {
      const { data } = await aiService.chat(userMessage);
      const replyText = data.data.reply;

      // Extract JSON action blocks if any
      const jsonRegex = /```json\n([\s\S]*?)\n```/g;
      let match;
      let actions = [];
      let cleanText = replyText;

      while ((match = jsonRegex.exec(replyText)) !== null) {
        try {
          const parsed = JSON.parse(match[1]);
          if (parsed.actions) actions = [...actions, ...parsed.actions];
          cleanText = cleanText.replace(match[0], '').trim();
        } catch (e) {
          console.error('Failed to parse AI action JSON', e);
        }
      }

      setMessages(prev => [...prev, { id: uuidv4(), role: 'ai', content: cleanText }]);

      // Execute actions
      if (actions.length > 0 && socket) {
        executeActions(actions);
      }

    } catch (err) {
      toast.error('AI failed to respond');
      setMessages(prev => [...prev, { id: uuidv4(), role: 'ai', content: 'Sorry, I am having trouble connecting to my brain right now.' }]);
    } finally {
      setIsThinking(false);
    }
  };

  const executeActions = (actions) => {
    actions.forEach(action => {
      const strokeId = uuidv4();
      
      switch (action.type) {
        case 'DRAW_SHAPE':
          if (action.color) setColor(action.color);
          socket.emit(SOCKET_EVENTS.CANVAS_SHAPE, {
            strokeId,
            type: action.shape,
            startX: action.startX || 400,
            startY: action.startY || 400,
            endX: action.endX || 600,
            endY: action.endY || 600,
            color: action.color || '#3B82F6',
            brushSize: 4,
            sessionId
          });
          break;
        case 'CLEAR_BOARD':
          socket.emit(SOCKET_EVENTS.CANVAS_CLEAR);
          break;
        case 'ADD_PAGE':
          socket.emit('CANVAS:ADD_PAGE');
          break;
        case 'REMOVE_PAGE':
          socket.emit('CANVAS:REMOVE_PAGE');
          break;
        default:
          console.log('Unknown AI action', action);
      }
    });
  };

  if (!isAIOpen) return null;

  return (
    <div className="absolute right-4 md:right-8 top-24 bottom-24 w-80 bg-surface-0/95 backdrop-blur-xl border border-surface-200 rounded-2xl shadow-glass-lg flex flex-col z-20 animate-slide-up overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-surface-200 flex items-center justify-between bg-gradient-to-r from-brand-600/10 to-purple-600/10">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <h3 className="font-semibold text-surface-800">AI Assistant</h3>
        </div>
        <button onClick={toggleAI} className="text-surface-400 hover:text-surface-600">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.map(msg => (
          <div key={msg.id} className={`max-w-[85%] rounded-2xl px-4 py-2 ${msg.role === 'user' ? 'bg-brand-600 text-white self-end rounded-br-none' : 'bg-surface-100 text-surface-800 self-start rounded-bl-none border border-surface-200'}`}>
            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
          </div>
        ))}
        {isThinking && (
          <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-surface-100 text-surface-500 self-start rounded-bl-none border border-surface-200 flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" />
            <div className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
            <div className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '0.4s' }} />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-surface-200 bg-surface-50">
        <form onSubmit={handleSend} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me to draw something..."
            className="w-full bg-white border border-surface-200 rounded-xl pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all shadow-sm"
          />
          <button 
            type="submit"
            disabled={!input.trim() || isThinking}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg gradient-brand text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
