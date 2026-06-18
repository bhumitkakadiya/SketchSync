import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useCanvasStore } from '../../store/canvasStore';
import { useRoomStore } from '../../store/roomStore';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { roomService } from '../../services/roomService';
import toast from 'react-hot-toast';
import { TOOLS, TOOL_LIST, DEFAULT_COLORS } from '../../constants/tools';
import { SOCKET_EVENTS } from '../../constants/socketEvents';


function ToolButton({ tool, activeTool, setTool }) {
  const isActive = activeTool === tool.id;
  return (
    <button
      id={'tool-'+tool.id}
      title={tool.label + ' (' + tool.shortcut + ')'}
      onClick={() => setTool(tool.id)}
      className={`relative w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150 group ${isActive ? 'bg-brand-500 text-[color:var(--text-primary)] shadow-lg scale-105' : 'hover:scale-105'}`}
      style={{ color: isActive ? '#fff' : 'var(--text-secondary)' }}
    >
      {tool.icon}
    </button>
  );
}

function SectionLabel({ children }) {
  return <label className="text-[11px] font-bold mb-1.5 block uppercase tracking-[0.08em]" style={{ color: '#00C896' }}>{children}</label>;
}

export default function RightSidebar({ mainCanvasRef,  boardConfig, setBoardConfig, socket, sessionId, isOwner, onClearBoard, onEndSession, sendMessage  }) {
  const { id: roomId } = useParams();
  const [activeTab, setActiveTab] = useState('settings');
  const [panelOpen, setPanelOpen] = useState(false);
  const { user } = useAuthStore();
  const { activeUsers } = useRoomStore();

  const {
    selectedStrokeId, color, fillColor, opacity, activeTool, brushSize, eraserSize, strokeStyle, fontSize, fontFamily, textBold, textItalic,
    shadowColor, shadowBlur, shadowOffsetX, shadowOffsetY,
    setColor, setFillColor, setOpacity, setTool, setBrushSize, setEraserSize, setStrokeStyle, setFontSize, setFontFamily, setTextBold, setTextItalic,
    setShadowColor, setShadowBlur, setShadowOffsetX, setShadowOffsetY, undo, redo
  } = useCanvasStore();
  const [recentColors, setRecentColors] = useState([]);
  const fileInputRef = useRef(null);

  const applyColor = (c, isStroke = true) => {
    if (isStroke) {
      setColor(c);
      setRecentColors(prev => [c, ...prev.filter(x => x !== c)].slice(0, 5));
    } else {
      setFillColor(c);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      const canvas = mainCanvasRef?.current;
      const cx = canvas ? canvas.width / 2 - 100 : 200;
      const cy = canvas ? canvas.height / 2 - 100 : 200;
      const stroke = {
        type: 'image',
        startX: cx, startY: cy,
        base64, width: 200, height: 200,
        color: '#000000', brushSize: 1,
      };
      const data = { ...stroke, strokeId: Date.now().toString(), sessionId };
      if (socket) socket.emit(SOCKET_EVENTS.CANVAS_SHAPE, data);
      window.dispatchEvent(new CustomEvent('canvas:add-image', { detail: data }));
    };
    reader.readAsDataURL(file);
    e.target.value = null;
  };


  const { messages, unreadCount, markAsRead } = useChatStore();
  const [chatText, setChatText] = useState('');
  const messagesEndRef = useRef(null);

  // Auto-open properties if something is selected
  useEffect(() => {
    if (selectedStrokeId) {
      setActiveTab('properties');
      setPanelOpen(true);
    } else if (activeTab === 'properties') {
      setActiveTab('settings');
    }
  }, [selectedStrokeId]);

  // Handle chat auto-scroll & read state
  useEffect(() => {
    if (activeTab === 'chat' && panelOpen) {
      markAsRead();
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages, activeTab, panelOpen, markAsRead]);

  const handleKickUser = async (userId) => {
    if (!confirm('Are you sure you want to remove this user from the room?')) return;
    try {
      await roomService.kickMember(roomId, userId);
      toast.success('User removed');
    } catch (e) {
      toast.error('Failed to remove user');
    }
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (chatText.trim() && sendMessage) {
      sendMessage(roomId, chatText);
      setChatText('');
    }
  };

  const tabs = [];
  tabs.push({ 
    id: 'tools', 
    label: 'Drawing Tools',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
  });
  if (selectedStrokeId) {
    tabs.push({ 
      id: 'properties', 
      label: 'Element Properties',
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
    });
  }
  
  // New: Chat Tab
  tabs.push({ 
    id: 'chat', 
    label: 'Room Chat',
    badge: unreadCount > 0 ? unreadCount : null,
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
  });

  // New: Users Tab
  tabs.push({ 
    id: 'users', 
    label: 'Active Users',
    badge: activeUsers.length,
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
  });

  tabs.push({ 
    id: 'settings', 
    label: 'Board Settings',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
  });
  
  // New: Shortcuts Tab
  tabs.push({ 
    id: 'shortcuts', 
    label: 'Shortcuts',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg> // Keyboard
  });

  tabs.push({ 
    id: 'export', 
    label: 'Export & Share',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
  });
  
  if (isOwner) {
    tabs.push({ 
      id: 'admin', 
      label: 'Admin Controls',
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
    });
  }

  return (
    <div className="relative flex h-full z-40 pointer-events-auto">
      {panelOpen && (
        <div className="absolute right-[368px] top-1/2 -translate-y-1/2 z-50 flex justify-end items-center h-12 w-8 animate-in fade-in slide-in-from-right-4 duration-300">
          <button onClick={() => setPanelOpen(false)} className="w-6 h-12 rounded-l-xl flex items-center justify-center transition-all duration-300 shadow-md group hover:w-8" style={{ background: 'var(--toggle-bg)', border: '1px solid var(--toggle-border)', borderRight: 'none', color: '#00C896' }} title="Close Tools panel">
            <svg className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>
      )}
      {/* Sliding Popover Panel */}
      <div 
        className={`absolute right-12 top-4 bottom-4 rounded-xl flex flex-col overflow-hidden transition-all duration-300 shadow-2xl ${panelOpen ? 'w-80 opacity-100 translate-x-0' : 'w-0 opacity-0 translate-x-4 pointer-events-none'}`}
        style={{
          background: 'var(--room-sidebar-bg, rgba(12,12,18,0.95))',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--room-border)'
        }}
      >
        <div className="w-80 h-full flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 flex items-center bg-[color:var(--bg-hover)] border-b border-[color:var(--bg-border)] shrink-0">
            <h3 className="font-bold text-[13px] text-[color:var(--text-primary)]">
               {tabs.find(t => t.id === activeTab)?.label}
            </h3>
          </div>
          
          {/* Content Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
             
             
             {/* ── TOOLS TAB ── */}
             {activeTab === 'tools' && (
               <div className="p-4 space-y-5">

                 {/* Categorized Tool Grid */}
                 <div className="space-y-4">
                   <div>
                     <SectionLabel>Shape & Drawing</SectionLabel>
                     <div className="grid grid-cols-4 gap-2">
                       {TOOL_LIST.filter(t => t.category === 'draw' || t.category === 'shape').map(tool => (
                         <ToolButton key={tool.id} tool={tool} activeTool={activeTool} setTool={setTool} />
                       ))}
                     </div>
                   </div>
                   <div className="border-t border-[color:var(--bg-border)]"></div>
                   <div>
                     <SectionLabel>Text & Typography</SectionLabel>
                     <div className="grid grid-cols-4 gap-2">
                       {TOOL_LIST.filter(t => t.category === 'text').map(tool => (
                         <ToolButton key={tool.id} tool={tool} activeTool={activeTool} setTool={setTool} />
                       ))}
                     </div>
                   </div>
                   <div className="border-t border-[color:var(--bg-border)]"></div>
                   <div>
                     <SectionLabel>Media & Utilities</SectionLabel>
                     <div className="grid grid-cols-4 gap-2">
                       {TOOL_LIST.filter(t => t.category === 'media').map(tool => (
                         <ToolButton key={tool.id} tool={tool} activeTool={activeTool} setTool={setTool} />
                       ))}
                       {/* Image Tool */}
                       <button
                         onClick={() => fileInputRef.current?.click()}
                         title="Insert Image"
                         className="relative w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150 group hover:scale-105"
                         style={{ color: 'var(--text-secondary)' }}
                       >
                         <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                       </button>
                       <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                     </div>
                   </div>
                 </div>

                 {/* Dynamic Properties */}
                 {(() => {
                   const isShapeTool = [TOOLS.RECT, TOOLS.CIRCLE, TOOLS.TRIANGLE, TOOLS.DIAMOND, TOOLS.STAR].includes(activeTool);
                   const isTextTool = activeTool === TOOLS.TEXT;
                   const isDrawTool = [TOOLS.PEN, TOOLS.MARKER, TOOLS.HIGHLIGHTER].includes(activeTool);
                   const isLineArrow = [TOOLS.LINE, TOOLS.ARROW].includes(activeTool);
                   const isEraser = activeTool === TOOLS.ERASER;
                   
                   const showStrokeColor = isDrawTool || isShapeTool || isLineArrow || isTextTool;
                   const showFillColor = isShapeTool;
                   const showThickness = isDrawTool || isShapeTool || isLineArrow || isEraser;
                   const showOpacity = showStrokeColor || showFillColor;

                   return (
                     <>
                       {/* Colors */}
                       {showStrokeColor && (
                         <div>
                           <SectionLabel>{isTextTool ? 'Text Color' : 'Stroke Color'}</SectionLabel>
                           <div className="grid grid-cols-7 gap-2 mb-3 items-center">
                             {DEFAULT_COLORS.map(c => (
                               <button
                                 key={c} onClick={() => applyColor(c, true)}
                                 className={`w-6 h-6 rounded-full transition-all hover:scale-110 ${color === c ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-800 scale-110' : ''}`}
                                 style={{ backgroundColor: c, border: c === '#ffffff' ? '1px solid rgba(255,255,255,0.3)' : 'none' }}
                               />
                             ))}
                             <label className={`w-6 h-6 rounded-full cursor-pointer transition-all relative flex items-center justify-center shadow-sm hover:scale-110 ${(!DEFAULT_COLORS.includes(color) && color !== 'transparent') ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-800 scale-110' : ''}`} style={{ background: 'conic-gradient(from 90deg, #ff0000, #ff8000, #ffff00, #00ff00, #00ffff, #0000ff, #8000ff, #ff00ff, #ff0000)' }} title="Custom Color">
                                <svg className="w-3.5 h-3.5 text-white z-10" style={{ filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.5))' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                                <input type="color" value={color === 'transparent' ? '#000000' : color} onChange={(e) => applyColor(e.target.value, true)} className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-20" />
                              </label>
                           </div>
                         </div>
                       )}

                       {showFillColor && (
                         <div>
                           <SectionLabel>Fill Color</SectionLabel>
                           <div className="grid grid-cols-7 gap-2 mb-3 items-center">
                             <button
                               onClick={() => applyColor('transparent', false)}
                               className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 flex items-center justify-center ${fillColor === 'transparent' ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-800' : ''}`}
                               style={{ border: '2px solid rgba(255,255,255,0.3)', background: 'repeating-conic-gradient(#666 0% 25%, #999 0% 50%) 0 0 / 8px 8px' }}
                               title="Transparent"
                             />
                             {DEFAULT_COLORS.map(c => (
                               <button
                                 key={c} onClick={() => applyColor(c, false)}
                                 className={`w-6 h-6 rounded-full transition-all hover:scale-110 ${fillColor === c ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-800 scale-110' : ''}`}
                                 style={{ backgroundColor: c, border: c === '#ffffff' ? '1px solid rgba(255,255,255,0.3)' : 'none' }}
                               />
                             ))}
                             <label className={`w-6 h-6 rounded-full cursor-pointer transition-all relative flex items-center justify-center shadow-sm hover:scale-110 ${(!DEFAULT_COLORS.includes(fillColor) && fillColor !== 'transparent') ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-800 scale-110' : ''}`} style={{ background: 'conic-gradient(from 90deg, #ff0000, #ff8000, #ffff00, #00ff00, #00ffff, #0000ff, #8000ff, #ff00ff, #ff0000)' }} title="Custom Color">
                                <svg className="w-3.5 h-3.5 text-white z-10" style={{ filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.5))' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                                <input type="color" value={fillColor === 'transparent' ? '#ffffff' : fillColor} onChange={(e) => applyColor(e.target.value, false)} className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-20" />
                              </label>
                           </div>
                         </div>
                       )}

                       {/* Thickness */}
                       {showThickness && (
                         <div className="mb-3">
                           <SectionLabel>{isEraser ? 'Eraser Size' : 'Stroke Thickness'}: {isEraser ? eraserSize : brushSize}px</SectionLabel>
                           <input type="range" min="1" max="50" value={isEraser ? eraserSize : brushSize} onChange={e => isEraser ? setEraserSize(parseInt(e.target.value)) : setBrushSize(parseInt(e.target.value))} className="w-full accent-brand-500" />
                         </div>
                       )}

                       {/* Text Formatting */}
                       {isTextTool && (
                         <div className="mb-3">
                           <SectionLabel>Text Formatting</SectionLabel>
                           
                           {/* Font Size */}
                           <div className="flex items-center gap-2 mb-2">
                             <span className="text-xs text-gray-400 w-12">{fontSize || 24}px</span>
                             <input type="range" min="12" max="72" value={fontSize || 24} onChange={e => setFontSize(parseInt(e.target.value))} className="flex-1 accent-brand-500" />
                           </div>
                           
                           {/* Style Toggles */}
                           <div className="flex gap-2">
                             <button
                               onClick={() => setTextBold(!textBold)}
                               className={`flex-1 py-1.5 rounded-lg border transition-all font-serif font-bold ${textBold ? 'bg-brand-500 border-brand-500 text-white' : 'border-[color:var(--bg-border)] text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-hover)]'}`}
                             >
                               B
                             </button>
                             <button
                               onClick={() => setTextItalic(!textItalic)}
                               className={`flex-1 py-1.5 rounded-lg border transition-all font-serif italic ${textItalic ? 'bg-brand-500 border-brand-500 text-white' : 'border-[color:var(--bg-border)] text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-hover)]'}`}
                             >
                               I
                             </button>
                           </div>
                         </div>
                       )}

                       {/* Opacity */}
                       {showOpacity && (
                         <div className="mb-3">
                           <SectionLabel>Opacity: {Math.round((opacity || 1) * 100)}%</SectionLabel>
                           <input type="range" min="10" max="100" value={Math.round((opacity || 1) * 100)} onChange={e => setOpacity(parseInt(e.target.value) / 100)} className="w-full accent-brand-500" />
                         </div>
                       )}
                     </>
                   );
                 })()}
               </div>
             )}

             {/* ── CHAT TAB ── */}
             {activeTab === 'chat' && (
               <div className="flex flex-col h-full bg-[color:var(--bg-card)]">
                 <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                   {messages.length === 0 ? (
                     <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 opacity-70">
                       <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                       <p className="text-xs">No messages yet.<br/>Say hello to the room!</p>
                     </div>
                   ) : (
                     messages.map((msg) => {
                       const isMe = msg.userId === String(user?.id) || msg.userId === String(user?._id) || msg.username === user?.username;
                       return (
                         <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                           <span className="text-[10px] mb-1 opacity-70 text-[color:var(--text-secondary)]">{isMe ? 'You' : msg.displayName}</span>
                           <div className="px-3 py-2 rounded-2xl max-w-[85%] text-sm break-words shadow-sm"
                             style={{
                               backgroundColor: isMe ? msg.color : 'rgba(255,255,255,0.05)',
                               color: isMe ? '#fff' : 'var(--text-primary)',
                               borderBottomRightRadius: isMe ? '4px' : '16px',
                               borderBottomLeftRadius: !isMe ? '4px' : '16px',
                               border: isMe ? 'none' : '1px solid rgba(255,255,255,0.1)'
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
                 <form onSubmit={handleSendChat} className="p-3 border-t border-[color:var(--bg-border)] shrink-0 bg-[color:var(--bg-hover)]">
                   <div className="relative">
                     <input type="text" value={chatText} onChange={(e) => setChatText(e.target.value)} placeholder="Type a message..." className="w-full pl-3 pr-10 py-2 rounded-xl text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-brand-500 bg-[color:var(--bg-input)] text-[color:var(--text-primary)] border border-[color:var(--bg-border)]" />
                     <button type="submit" disabled={!chatText.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-brand-500 hover:bg-brand-500/10 disabled:opacity-50 transition-colors">
                       <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                     </button>
                   </div>
                 </form>
               </div>
             )}

             {/* ── USERS TAB ── */}
             {activeTab === 'users' && (
               <div className="p-4 space-y-4">
                 <SectionLabel>In This Room</SectionLabel>
                 <div className="rounded-xl overflow-hidden bg-[color:var(--bg-card)] border border-[color:var(--bg-border)]">
                   {activeUsers.map(u => {
                     const isMe = u.userId === user?._id?.toString() || u.userId === user?.id?.toString();
                     return (
                       <div key={u.userId} className="flex items-center justify-between text-xs py-2.5 px-3 border-b border-[color:var(--bg-border)] last:border-0 hover:bg-[color:var(--bg-hover)] transition-colors text-[color:var(--text-primary)]">
                         <div className="flex items-center gap-3 overflow-hidden">
                           <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] text-[color:var(--text-primary)] shadow-sm flex-shrink-0" style={{ backgroundColor: u.color }}>
                             {(u.displayName || u.username || '?')[0].toUpperCase()}
                           </div>
                           <span className="truncate font-medium">{u.displayName || u.username} {isMe && <span className="opacity-50 ml-1">(You)</span>}</span>
                         </div>
                         {isOwner && !isMe && (
                           <button onClick={() => handleKickUser(u.userId)} className="text-red-400 hover:text-red-300 p-1.5 hover:bg-red-500/10 rounded-lg transition-colors" title="Remove User">
                             <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                           </button>
                         )}
                       </div>
                     );
                   })}
                 </div>
               </div>
             )}

             {/* ── SHORTCUTS TAB ── */}
             {activeTab === 'shortcuts' && (
               <div className="p-4 space-y-4">
                 <SectionLabel>Keyboard Shortcuts</SectionLabel>
                 <div className="space-y-1">
                   {[
                     { label: 'Undo', key: 'Cmd/Ctrl + Z' },
                     { label: 'Redo', key: 'Cmd/Ctrl + Shift + Z' },
                     { label: 'Duplicate Selected', key: 'Cmd/Ctrl + D' },
                     { label: 'Delete Selected', key: 'Backspace / Del' },
                     { label: 'Pan Canvas', key: 'Space + Drag' },
                     { label: 'Zoom In/Out', key: 'Ctrl + Scroll' },
                     { label: 'Multiple Select', key: 'Shift + Click' },
                   ].map((sc, i) => (
                     <div key={i} className="flex items-center justify-between py-2 text-xs border-b border-[color:var(--bg-border)] last:border-0">
                       <span className="text-[color:var(--text-secondary)]">{sc.label}</span>
                       <kbd className="px-2 py-1 rounded-md bg-[color:var(--bg-input)] border border-[color:var(--bg-border)] text-brand-300 font-mono text-[10px]">{sc.key}</kbd>
                     </div>
                   ))}
                 </div>
               </div>
             )}

             {/* ── SETTINGS TAB ── */}
             {activeTab === 'settings' && (
               <div className="p-4 space-y-5">
                 <div className="flex gap-4">
                   <div className="flex-1">
                     <SectionLabel>Board Theme</SectionLabel>
                     <button onClick={() => setBoardConfig({ ...boardConfig, pageTheme: boardConfig.pageTheme === 'dark' ? 'light' : 'dark' })} className="w-full py-2 px-2 text-xs rounded-xl transition-all flex items-center justify-center gap-2 font-medium hover:scale-[1.02]" style={{ background: 'rgba(0,200,150,0.1)', border: '1px solid rgba(0,200,150,0.25)', color: '#00C896' }}>
                       <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22ZM12 20V4C16.4183 4 20 7.58172 20 12C20 16.4183 16.4183 20 12 20Z" /></svg>
                       {boardConfig.pageTheme === 'dark' ? 'Light Board' : 'Dark Board'}
                     </button>
                   </div>
                   <div className="flex-1">
                     <SectionLabel>Pattern</SectionLabel>
                     <div className="flex gap-1.5 h-[34px]">
                       {[
                         { id: 'none', icon: '◻' },
                         { id: 'dots', icon: '⁞' },
                         { id: 'grid', icon: '⊞' },
                       ].map(style => (
                         <button key={style.id} onClick={() => setBoardConfig({ ...boardConfig, bgStyle: style.id })} className="flex-1 rounded-xl transition-all flex items-center justify-center hover:scale-105" style={{ background: boardConfig.bgStyle === style.id ? 'rgba(0,200,150,0.2)' : 'rgba(255,255,255,0.05)', border: boardConfig.bgStyle === style.id ? '1px solid #00C896' : '1px solid rgba(255,255,255,0.1)', color: boardConfig.bgStyle === style.id ? '#00C896' : 'var(--text-secondary)' }}>
                           {style.icon}
                         </button>
                       ))}
                     </div>
                   </div>
                 </div>

                 <div>
                   <SectionLabel>Page Size</SectionLabel>
                   <select value={boardConfig.aspectRatio} onChange={(e) => setBoardConfig({ ...boardConfig, aspectRatio: e.target.value })} className="w-full text-xs rounded-xl px-3 py-2.5 outline-none transition-colors appearance-none cursor-pointer focus:border-brand-500 hover:border-brand-500 bg-[color:var(--bg-card)] text-[color:var(--text-primary)] border border-[color:var(--bg-border)]">
                     <option value="16/9">💻 Laptop (16:9)</option>
                     <option value="4/3">📺 Tablet (4:3)</option>
                     <option value="9/16">📱 Phone (9:16)</option>
                     <option value="1/1">🖼️ Square (1:1)</option>
                   </select>
                 </div>

                 <div className="space-y-1 pt-2 border-t border-[color:var(--bg-border)]">
                   {[
                     { id: 'snapToGrid', label: 'Grid Snapping' },
                     { id: 'readOnly', label: 'Read-Only Mode' },
                     { id: 'showCursors', label: 'Show Other Cursors', defaultOn: true },
                     { id: 'transparentExport', label: 'Transparent Export' }
                   ].map(toggle => {
                     const isOff = toggle.defaultOn ? boardConfig[toggle.id] === false : !boardConfig[toggle.id];
                     return (
                       <div key={toggle.id} className="flex items-center justify-between py-2 text-xs">
                         <span className="font-medium text-[color:var(--text-primary)]">{toggle.label}</span>
                         <button onClick={() => setBoardConfig({ ...boardConfig, [toggle.id]: isOff })} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${!isOff ? 'bg-[#00C896]' : 'bg-gray-600'}`}>
                           <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${!isOff ? 'translate-x-4' : 'translate-x-1'}`} />
                         </button>
                       </div>
                     )
                   })}
                 </div>
               </div>
             )}

             {/* ── PROPERTIES TAB ── */}
             {activeTab === 'properties' && selectedStrokeId && (
               <div className="p-4 space-y-5">
                 <div>
                   <SectionLabel>Stroke Color</SectionLabel>
                   <div className="flex items-center gap-3">
                     <input type="color" value={color === 'transparent' ? '#000000' : color} onChange={e => setColor(e.target.value)} className="w-9 h-9 rounded-xl cursor-pointer border border-white/20 bg-transparent shrink-0" />
                     <input type="text" value={color} onChange={e => /^#[0-9a-fA-F]{6}$/.test(e.target.value) && setColor(e.target.value)} className="flex-1 text-xs font-mono px-3 py-2 rounded-xl border border-[color:var(--bg-border)] outline-none bg-[color:var(--bg-card)] text-[color:var(--text-primary)]" placeholder="#000000" />
                   </div>
                 </div>
                 <div>
                   <SectionLabel>Fill Color</SectionLabel>
                   <div className="flex items-center gap-2">
                     <div className="relative w-9 h-9 shrink-0">
                       <input type="color" value={fillColor === 'transparent' ? '#ffffff' : fillColor} onChange={e => setFillColor(e.target.value)} className="w-9 h-9 rounded-xl cursor-pointer border border-white/20 bg-transparent absolute inset-0" />
                     </div>
                     <button onClick={() => setFillColor('transparent')} className={`px-3 py-2 text-xs font-medium rounded-xl border transition-all ${fillColor === 'transparent' ? 'bg-brand-500/20 border-brand-500 text-brand-300' : 'border-[color:var(--bg-border)] text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-hover)]'}`}>None</button>
                     <input type="text" value={fillColor} onChange={e => setFillColor(e.target.value)} className="flex-1 text-xs font-mono px-3 py-2 rounded-xl border border-[color:var(--bg-border)] outline-none bg-[color:var(--bg-card)] text-[color:var(--text-primary)] min-w-0" placeholder="transparent" />
                   </div>
                 </div>
                 <div>
                   <SectionLabel>Opacity — {Math.round(opacity * 100)}%</SectionLabel>
                   <input type="range" min="0.05" max="1" step="0.05" value={opacity} onChange={e => setOpacity(parseFloat(e.target.value))} className="w-full h-1.5 accent-brand-500 rounded-full bg-[color:var(--bg-hover)] appearance-none mt-2" />
                 </div>
                 <div className="pt-5 border-t border-[color:var(--bg-border)]">
                    <SectionLabel>Drop Shadow</SectionLabel>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <input type="color" value={shadowColor === 'transparent' ? '#000000' : shadowColor} onChange={e => setShadowColor(e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer border border-white/20 bg-transparent shrink-0" />
                        <button onClick={() => setShadowColor('transparent')} className={`px-2 py-1.5 text-[10px] font-medium rounded-lg border transition-all ${shadowColor === 'transparent' ? 'bg-brand-500/20 border-brand-500 text-brand-300' : 'border-[color:var(--bg-border)] text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-hover)]'}`}>None</button>
                      </div>
                      {shadowColor !== 'transparent' && (
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <span className="text-[10px] text-gray-500 block mb-1">Blur ({shadowBlur})</span>
                            <input type="range" min="0" max="50" value={shadowBlur} onChange={e => setShadowBlur(parseInt(e.target.value))} className="w-full h-1 accent-brand-500" />
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-500 block mb-1">X Offset ({shadowOffsetX})</span>
                            <input type="range" min="-50" max="50" value={shadowOffsetX} onChange={e => setShadowOffsetX(parseInt(e.target.value))} className="w-full h-1 accent-brand-500" />
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-500 block mb-1">Y Offset ({shadowOffsetY})</span>
                            <input type="range" min="-50" max="50" value={shadowOffsetY} onChange={e => setShadowOffsetY(parseInt(e.target.value))} className="w-full h-1 accent-brand-500" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="pt-5 border-t border-[color:var(--bg-border)]">
                    <SectionLabel>Arrange Layer</SectionLabel>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Forward', action: 'forward', icon: 'M5 15l7-7 7 7' },
                        { label: 'Backward', action: 'backward', icon: 'M19 9l-7 7-7-7' },
                        { label: 'To Front', action: 'front', icon: 'M4 6h16M4 12h16M4 18h7' },
                        { label: 'To Back', action: 'back', icon: 'M4 6h7M4 12h16M4 18h16' },
                      ].map(btn => (
                        <button key={btn.action} onClick={() => window.dispatchEvent(new CustomEvent('canvas:arrange', { detail: btn.action }))} className="py-2 text-[11px] font-medium rounded-xl transition-colors flex items-center justify-center gap-1.5 hover:bg-[color:var(--bg-hover)] bg-[color:var(--bg-hover)] border border-[color:var(--bg-border)] text-[color:var(--text-primary)] hover:text-[color:var(--text-primary)]">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d={btn.icon} /></svg>
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="pt-2 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button className="w-full py-2 text-xs font-medium rounded-xl transition-colors flex items-center justify-center gap-2 hover:bg-[color:var(--bg-hover)] text-[color:var(--text-primary)] border border-[color:var(--bg-border)] bg-[color:var(--bg-hover)]" onClick={() => window.dispatchEvent(new CustomEvent('canvas:duplicate-selected'))}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        Duplicate
                      </button>
                      <button className="w-full py-2 text-xs font-medium rounded-xl transition-colors flex items-center justify-center gap-2 hover:bg-[color:var(--bg-hover)] text-[color:var(--text-primary)] border border-[color:var(--bg-border)] bg-[color:var(--bg-hover)]" onClick={() => window.dispatchEvent(new CustomEvent('canvas:toggle-lock'))}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        Lock
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button className="w-full py-2 text-xs font-medium rounded-xl transition-colors flex items-center justify-center gap-2 hover:bg-[color:var(--bg-hover)] text-[color:var(--text-primary)] border border-[color:var(--bg-border)] bg-[color:var(--bg-hover)]" onClick={() => window.dispatchEvent(new CustomEvent('canvas:flip', { detail: 'horizontal' }))}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                        Flip H
                      </button>
                      <button className="w-full py-2 text-xs font-medium rounded-xl transition-colors flex items-center justify-center gap-2 hover:bg-[color:var(--bg-hover)] text-[color:var(--text-primary)] border border-[color:var(--bg-border)] bg-[color:var(--bg-hover)]" onClick={() => window.dispatchEvent(new CustomEvent('canvas:flip', { detail: 'vertical' }))}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 8l4-4 4 4m0 8l-4 4-4-4m4-12v16" /></svg>
                        Flip V
                      </button>
                    </div>
                    <button className="w-full py-2 text-xs font-medium rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2 mt-2" onClick={() => { if (!selectedStrokeId) return; window.dispatchEvent(new CustomEvent('canvas:delete-selected')); }}>
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                     Delete Element
                   </button>
                 </div>
               </div>
             )}

             {/* ── EXPORT TAB ── */}
             {activeTab === 'export' && (
               <div className="p-4 space-y-3">
                 <button onClick={() => window.dispatchEvent(new CustomEvent('canvas:export-png'))} className="w-full py-3 px-3 text-xs font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 bg-[#00C896] hover:bg-[#00B085] text-[color:var(--text-primary)] hover:scale-[1.02]">
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                   Download PNG Image
                 </button>
                 <button onClick={() => window.dispatchEvent(new CustomEvent('canvas:export-pdf'))} className="w-full py-3 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 border border-[#00C896]/30 text-[#00C896] hover:bg-[#00C896]/10 hover:scale-[1.02]">
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                   Download PDF Document
                 </button>
                 <div className="h-px w-full my-4 border-t border-[color:var(--bg-border)]" />
                 <button onClick={(e) => {
                   navigator.clipboard.writeText(window.location.href);
                   e.currentTarget.innerHTML = '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg> Copied!';
                   setTimeout(() => { e.currentTarget.innerHTML = '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg> Copy Share Link'; }, 2000);
                 }} className="w-full py-2.5 px-3 text-xs font-medium rounded-xl transition-all flex items-center justify-center gap-2 border border-[color:var(--bg-border)] hover:bg-[color:var(--bg-hover)] text-[color:var(--text-primary)]">
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                   Copy Share Link
                 </button>
                 <button onClick={() => window.dispatchEvent(new CustomEvent('canvas:save-snapshot'))} className="w-full py-2.5 px-3 text-xs font-medium rounded-xl transition-all flex items-center justify-center gap-2 border border-[color:var(--bg-border)] hover:bg-[color:var(--bg-hover)] text-[color:var(--text-primary)]">
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
                   Save to Cloud Sync
                 </button>
               </div>
             )}

             {/* ── ADMIN TAB ── */}
             {activeTab === 'admin' && isOwner && (
               <div className="p-4 space-y-4">
                 <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 space-y-3">
                   <h4 className="text-xs font-bold text-red-400 flex items-center gap-2">
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                     Danger Zone
                   </h4>
                   <p className="text-[10px] text-[color:var(--text-secondary)]">These actions affect all users in the room and cannot be reversed.</p>
                   
                   <button onClick={onClearBoard} className="w-full py-2.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 border border-red-500/40 text-red-400 hover:bg-red-500/10">
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                     Clear Board Completely
                   </button>
                   <button onClick={onEndSession} className="w-full py-2.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-[color:var(--text-primary)] shadow-lg shadow-red-500/20 hover:scale-[1.02]">
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" /></svg>
                     End Session / Delete Room
                   </button>
                 </div>
               </div>
             )}

          </div>
        </div>
      </div>

      {/* Thin Sidebar (Icons) */}
      <div 
        className="w-12 h-full flex-shrink-0 flex flex-col items-center py-4 gap-3 border-l shadow-2xl relative z-50"
        style={{
          background: 'var(--room-sidebar-bg, rgba(8,8,12,0.85))',
          backdropFilter: 'blur(20px)',
          borderColor: 'var(--room-border)'
        }}
      >
        {tabs.map(tab => (
           <button 
             key={tab.id}
             onClick={() => {
               if (activeTab === tab.id) setPanelOpen(!panelOpen);
               else { setActiveTab(tab.id); setPanelOpen(true); }
             }}
             className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all relative group ${activeTab === tab.id && panelOpen ? 'bg-brand-500/20 text-brand-400 shadow-[inset_0_0_0_1px_rgba(0,200,150,0.3)]' : 'text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-hover)] hover:text-[color:var(--text-primary)]'}`}
           >
             {tab.icon}
             
             {/* Badge for notifications */}
             {tab.badge ? (
               <div className="absolute -top-1 -right-1 bg-red-500 text-[color:var(--text-primary)] text-[9px] font-bold px-1.5 min-w-[16px] h-4 rounded-full flex items-center justify-center shadow-md">
                 {tab.badge > 99 ? '99+' : tab.badge}
               </div>
             ) : null}

             <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-[color:var(--bg-card)] border border-[color:var(--bg-border)] text-[color:var(--text-primary)] text-[11px] font-medium px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
               {tab.label}
             </div>
           </button>
        ))}
      </div>
    </div>
  );
}
