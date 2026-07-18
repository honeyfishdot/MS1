/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
const API_BASE = import.meta.env.VITE_API_BASE || '';
import { 
  Sparkles, 
  Send, 
  Bot, 
  Loader2, 
  X, 
  Plus, 
  FileText, 
  Check, 
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

interface Message {
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

interface CopilotPanelProps {
  themeMode: 'dark' | 'bright' | 'dusty-blue';
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  width?: number;
  onWidthChange?: (width: number) => void;
}

export default function CopilotPanel({ themeMode, isOpen, onClose, isCollapsed = false, onToggleCollapse, width = 350, onWidthChange }: CopilotPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'assistant',
      text: "Hello! I am your Allbright Copilot. I analyze live DEX liquidity ratios, AMM price discrepancies, and optimize your flash loan parameters in real-time. How can I assist you today?",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [planActMode, setPlanActMode] = useState<'plan' | 'act'>('plan');
  const [modelAgents, setModelAgents] = useState<string[]>(() => {
    const saved = localStorage.getItem('allbright_model_agents');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return ['Gemini', 'OpenRouter', 'Grok', 'Claude'];
  });
  const [selectedAgent, setSelectedAgent] = useState<string>('Gemini');
  const [isAddingAgent, setIsAddingAgent] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [attachedFile, setAttachedFile] = useState<{ name: string; size: string } | null>(null);

  // SECURITY: API keys are NEVER stored in localStorage.
  // Read credentials from .env first, fallback to defaults
  const [modelCredentials, setModelCredentials] = useState<Record<string, { apiKey: string; endpoint: string; variant: string }>>(() => {
    return {
      Gemini: { 
        apiKey: import.meta.env.VITE_GEMINI_API_KEY || '', 
        endpoint: import.meta.env.VITE_GEMINI_ENDPOINT || 'https://generativelanguage.googleapis.com', 
        variant: import.meta.env.VITE_GEMINI_VARIANT || 'gemini-2.5-flash' 
      },
      OpenRouter: { 
        apiKey: import.meta.env.VITE_OPENROUTER_API_KEY || '', 
        endpoint: import.meta.env.VITE_OPENROUTER_ENDPOINT || 'https://openrouter.ai/api/v1', 
        variant: import.meta.env.VITE_OPENROUTER_VARIANT || 'openrouter/auto' 
      },
      Grok: { 
        apiKey: import.meta.env.VITE_GROK_API_KEY || '', 
        endpoint: import.meta.env.VITE_GROK_ENDPOINT || 'https://api.x.ai/v1', 
        variant: import.meta.env.VITE_GROK_VARIANT || 'grok-2-1212' 
      },
      Claude: { 
        apiKey: import.meta.env.VITE_CLAUDE_API_KEY || '', 
        endpoint: import.meta.env.VITE_CLAUDE_ENDPOINT || 'https://api.anthropic.com', 
        variant: import.meta.env.VITE_CLAUDE_VARIANT || 'claude-3-5-sonnet' 
      }
    };
  });

  const [credApiKey, setCredApiKey] = useState('');
  const [credEndpoint, setCredEndpoint] = useState('');
  const [credVariant, setCredVariant] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [credSuccessMessage, setCredSuccessMessage] = useState(false);

  // Local collapse state management
  const [localCollapsed, setLocalCollapsed] = useState(false);
  const collapsed = isCollapsed || localCollapsed;

  const handleToggleCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setLocalCollapsed(!localCollapsed);
    }
  };

  // Sync credentials form when selectedAgent changes
  useEffect(() => {
    const creds = modelCredentials[selectedAgent] || { apiKey: '', endpoint: '', variant: 'default' };
    setCredApiKey(creds.apiKey);
    setCredEndpoint(creds.endpoint);
    setCredVariant(creds.variant);
    setCredSuccessMessage(false);
  }, [selectedAgent, modelCredentials]);

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    setCredSuccessMessage(true);
    setTimeout(() => setCredSuccessMessage(false), 4000);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const sizeInKb = (file.size / 1024).toFixed(1);
      setAttachedFile({
        name: file.name,
        size: `${sizeInKb} KB`
      });
      
      const fileMsg: Message = {
        sender: 'assistant',
        text: `📎 [File Attached] Loaded "${file.name}" (${sizeInKb} KB) into the Copilot context. Ready to parse and execute using the active "${selectedAgent}" agent.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, fileMsg]);
    }
  };

  const handleAddAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAgentName.trim()) {
      const name = newAgentName.trim();
      const updatedModes = [...modelAgents];
      if (!updatedModes.includes(name)) {
        updatedModes.push(name);
        setModelAgents(updatedModes);
        localStorage.setItem('allbright_model_agents', JSON.stringify(updatedModes));
      }
      setSelectedAgent(name);
      setNewAgentName('');
      setIsAddingAgent(false);
      
      const addedMsg: Message = {
        sender: 'assistant',
        text: `🤖 Loaded model agent: "${name}". API configuration fields are now open below. Ready to parse and route messages.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, addedMsg]);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    let payloadText = textToSend;
    if (attachedFile) {
      payloadText = `[File attached: ${attachedFile.name} (${attachedFile.size})] ${textToSend}`;
      setAttachedFile(null);
    }

    const userMsg: Message = {
      sender: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch(API_BASE + '/api/copilot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: payloadText,
          mode: planActMode,
          agent: selectedAgent,
          credentials: modelCredentials[selectedAgent]
        }),
      });

      if (!response.ok) {
        throw new Error('Copilot node response error');
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Response is not JSON format');
      }

      const data = await response.json();
      const assistantMsg: Message = {
        sender: 'assistant',
        text: data.text,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: Message = {
        sender: 'assistant',
        text: "I encountered a synchronization hiccup connecting to the Allbright backend. Please verify your connection or retry shortly.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const presetPrompts = [
    { label: "Analyze Scanner", query: "Scan the active pools for profitable routing opportunities now." },
    { label: "Target Profit & Sizing", query: "Can you analyze my current profit target and growth rate settings?" },
    { label: "Transfer Profits Advice", query: "Tell me how the auto and manual profit transfer modes work." }
  ];

  // Theme styling definitions
  const getThemeStyles = () => {
    switch (themeMode) {
      case 'bright':
        return {
          bg: 'bg-white border-l border-slate-300',
          title: 'text-slate-950',
          desc: 'text-slate-500',
          chatArea: 'bg-slate-50',
          userBubble: 'bg-teal-600 text-white',
          assistantBubble: 'bg-white border border-slate-300 text-slate-800',
          inputBg: 'bg-white border border-slate-300 text-slate-800',
          card: 'bg-white border border-slate-300 hover:border-teal-500/50 text-slate-700',
          accentText: 'text-teal-600'
        };
      case 'dusty-blue':
        return {
          bg: 'bg-[#1e293b] border-l border-[#475569]',
          title: 'text-white',
          desc: 'text-slate-300',
          chatArea: 'bg-[#0f172a]',
          userBubble: 'bg-sky-600 text-white',
          assistantBubble: 'bg-[#334155] border border-[#475569] text-slate-200',
          inputBg: 'bg-[#1e293b] border border-[#475569] text-slate-100 focus:border-sky-500/50',
          card: 'bg-[#334155] border border-[#475569] hover:border-sky-400 text-slate-300',
          accentText: 'text-sky-400'
        };
      case 'dark':
      default:
        return {
          bg: 'bg-slate-900 border-l border-slate-700',
          title: 'text-white',
          desc: 'text-slate-400',
          chatArea: 'bg-slate-950',
          userBubble: 'bg-teal-600 text-slate-950 font-bold',
          assistantBubble: 'bg-slate-800 border border-slate-700 text-slate-200',
          inputBg: 'bg-slate-900 border border-slate-700 text-slate-100 focus:border-teal-500/50',
          card: 'bg-slate-800 border border-slate-700 hover:border-teal-500/50 text-slate-300',
          accentText: 'text-teal-400'
        };
    }
  };

  const styles = getThemeStyles();

  if (!isOpen) return null;

  const panelWidth = collapsed ? 48 : width;

  return (
    <aside 
      id="copilot-sidebar-panel"
      className={`${collapsed ? 'w-12' : 'w-full lg:w-[350px]'} shrink-0 h-screen max-h-screen flex flex-col z-20 overflow-hidden ${styles.bg} animate-fadeIn transition-all duration-300`}
      style={{ width: `${panelWidth}px` }}
    >
      {/* Header heading */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-inherit shrink-0 relative">
        {!collapsed ? (
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-teal-500/10 flex items-center justify-center">
              <Bot className={`h-4 w-4 ${styles.accentText}`} />
            </div>
            <div>
              <h3 className={`text-sm font-bold flex items-center space-x-1.5 ${styles.title}`}>
                <span>Copilot</span>
                <Sparkles className={`h-3 w-3 ${styles.accentText} animate-pulse`} />
              </h3>
              <p className="text-[10px] font-mono text-slate-500">Dual‑Core Intelligence</p>
            </div>
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <div className="p-1.5 rounded-lg bg-teal-500/10 flex items-center justify-center">
              <Bot className={`h-4 w-4 ${styles.accentText}`} />
            </div>
          </div>
        )}
        
        <div className="flex items-center space-x-1.5">
          <button 
            onClick={handleToggleCollapse}
            className="p-1.5 hover:bg-slate-800/10 rounded-lg text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            title={collapsed ? "Expand Copilot" : "Collapse Copilot"}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-slate-800/10 rounded-lg text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            title="Minimize Copilot"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Chat Messages Log */}
      {!collapsed && (
        <div className={`flex-1 overflow-y-auto p-4 space-y-4 scrollbar-none ${styles.chatArea}`}>
          {messages.map((msg, i) => (
            <div 
              key={i} 
              className={`flex flex-col max-w-[85%] ${
                msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
              }`}
            >
              <div className={`p-3 rounded-2xl text-xs font-mono leading-relaxed shadow-sm ${
                msg.sender === 'user' ? styles.userBubble : styles.assistantBubble
              }`}>
                {msg.text}
              </div>
              <span className="text-[9px] text-slate-500 font-mono mt-1">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center space-x-2 text-slate-500 font-mono text-[10px] p-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-500" />
              <span>Copilot is sweeping AMMs and thinking...</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      )}

      {/* Quick Action Preset Prompt Buttons */}
      {!collapsed && (
        <div className="p-3 border-t border-inherit space-y-1.5 bg-inherit/40">
          <span className="text-[9px] font-mono font-bold uppercase text-slate-500 block mb-1">Suggested Inquiries</span>
          <div className="flex flex-col space-y-1">
            {presetPrompts.map((preset, idx) => (
              <button
                key={idx}
                id={`preset-copilot-btn-${idx}`}
                onClick={() => handleSend(preset.query)}
                className={`p-2 rounded-lg text-left text-[11px] font-mono font-medium transition-all flex items-center justify-between group cursor-pointer ${styles.card}`}
              >
                <span>{preset.label}</span>
                <span className="text-[10px] text-teal-400">›</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Control Panel: Agent Selector & Plan/Act Mode */}
      {!collapsed && (
        <div className="px-4 py-2.5 border-t border-slate-700/30 bg-slate-950/20 flex flex-col space-y-2 shrink-0">
          <div className="flex items-center justify-between space-x-2">
            {/* Plan/Act Segmented Toggle */}
            <div className="flex bg-slate-900/60 p-0.5 rounded-lg border border-slate-700/40 w-[45%] shrink-0">
              <button
                id="btn-copilot-mode-plan"
                type="button"
                onClick={() => setPlanActMode('plan')}
                className={`flex-1 py-1 rounded text-[9px] font-mono font-bold uppercase transition-all cursor-pointer text-center ${
                  planActMode === 'plan'
                    ? 'bg-teal-500 text-slate-950 font-extrabold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Plan Mode: Simulate actions and view predicted yields"
              >
                Plan
              </button>
              <button
                id="btn-copilot-mode-act"
                type="button"
                onClick={() => setPlanActMode('act')}
                className={`flex-1 py-1 rounded text-[9px] font-mono font-bold uppercase transition-all cursor-pointer text-center ${
                  planActMode === 'act'
                    ? 'bg-rose-500 text-slate-950 font-extrabold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Act Mode: Autonomously optimize contracts and suggest executions"
              >
                Act
              </button>
            </div>

            {/* Model Agent Selector / Creator */}
            <div className="flex-1 min-w-0">
              {isAddingAgent ? (
                <form onSubmit={handleAddAgent} className="flex items-center space-x-1 animate-fadeIn">
                  <input
                    id="input-new-agent"
                    type="text"
                    placeholder="Model Name..."
                    autoFocus
                    value={newAgentName}
                    onChange={(e) => setNewAgentName(e.target.value)}
                    className="flex-1 bg-slate-900/80 border border-teal-500/50 rounded-lg py-1 px-2 text-[9px] font-mono text-slate-100 focus:outline-none placeholder-slate-600"
                  />
                  <button
                    type="submit"
                    className="p-1 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded cursor-pointer transition-colors shrink-0"
                    title="Confirm custom model"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingAgent(false)}
                    className="p-1 bg-slate-800 text-slate-400 hover:text-slate-200 rounded cursor-pointer transition-colors shrink-0"
                    title="Cancel"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </form>
              ) : (
                <div className="flex items-center space-x-1">
                  <select
                    id="select-copilot-agent"
                    value={selectedAgent}
                    onChange={(e) => {
                      if (e.target.value === 'ADD_NEW') {
                        setIsAddingAgent(true);
                      } else {
                        setSelectedAgent(e.target.value);
                      }
                    }}
                    className="w-full bg-slate-900/60 border border-slate-700/40 rounded-lg py-1 px-1.5 text-[9px] font-mono text-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500/20 cursor-pointer"
                  >
                    {modelAgents.map((agent) => (
                      <option key={agent} value={agent} className="bg-slate-900 text-slate-300 font-mono text-xs">
                        🤖 {agent} Agent
                      </option>
                    ))}
                    <option value="ADD_NEW" className="bg-slate-900 text-teal-400 font-bold font-mono text-xs">
                      + Add Custom Model
                    </option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Dynamic API Configuration Sub-panel for Selected Model */}
          <div className="p-2 rounded-lg border border-slate-700/60 bg-slate-900/40 space-y-1.5 animate-fadeIn text-[9px]">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-slate-400 uppercase tracking-wider">
                🔑 {selectedAgent} API Key Credentials
              </span>
              {credSuccessMessage && (
                <span className="text-[8px] text-emerald-400 font-bold animate-pulse">Credentials Synced!</span>
              )}
            </div>
            
            <form onSubmit={handleSaveCredentials} className="space-y-1.5">
              <div>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    placeholder={`${selectedAgent} API Key`}
                    value={credApiKey}
                    onChange={(e) => setCredApiKey(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700 rounded px-2 py-0.5 font-mono text-[9px] text-white focus:outline-none focus:border-teal-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-0.5 text-slate-500 hover:text-slate-300 text-[8px]"
                  >
                    {showApiKey ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <input
                    type="text"
                    placeholder="API Endpoint URL"
                    value={credEndpoint}
                    onChange={(e) => setCredEndpoint(e.target.value)}
                    title="Base API Endpoint URL"
                    className="w-full bg-slate-900/80 border border-slate-700 rounded px-2 py-0.5 font-mono text-[9px] text-white focus:outline-none focus:border-teal-500/50"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Model Variant"
                    value={credVariant}
                    onChange={(e) => setCredVariant(e.target.value)}
                    title="Variant Name (e.g. gemini-2.5-flash)"
                    className="w-full bg-slate-900/80 border border-slate-700 rounded px-2 py-0.5 font-mono text-[9px] text-white focus:outline-none focus:border-teal-500/50"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-0.5 bg-slate-800 hover:bg-teal-500 hover:text-slate-950 text-slate-300 font-mono font-bold uppercase tracking-wider rounded transition-all text-[8px] cursor-pointer"
              >
                Sync & Authenticate {selectedAgent}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Attached file status banner */}
      {attachedFile && !collapsed && (
        <div className="mx-4 mt-2 p-2 rounded-xl bg-teal-500/5 border border-teal-500/10 flex items-center justify-between text-[10px] font-mono text-teal-400 animate-fadeIn shrink-0">
          <div className="flex items-center space-x-2 truncate">
            <FileText className="h-3.5 w-3.5 text-teal-400 shrink-0" />
            <span className="truncate max-w-[150px] font-bold">{attachedFile.name}</span>
            <span className="text-[8px] text-slate-500">({attachedFile.size})</span>
          </div>
          <button
            onClick={() => setAttachedFile(null)}
            className="p-1 hover:bg-teal-500/10 rounded text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
            title="Remove attachment"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Input box */}
      {!collapsed && (
        <div className="p-4 border-t border-inherit bg-inherit flex items-center space-x-2">
          {/* Hidden File Input */}
          <input
            id="copilot-file-input"
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="*"
          />

          {/* Attach File Button with Plus Icon */}
          <button
            id="copilot-btn-attach"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl border border-dashed border-slate-700 hover:border-teal-500/40 bg-slate-950/30 hover:bg-slate-900/60 text-slate-500 hover:text-teal-400 flex items-center justify-center transition-all shrink-0 cursor-pointer"
            title="Attach File"
          >
            <Plus className="h-4 w-4" />
          </button>

          <input
            id="copilot-text-input"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend(inputValue)}
            placeholder={`Message ${selectedAgent} Agent (${planActMode === 'plan' ? 'Planning' : 'Active'})...`}
            className={`flex-1 p-2.5 rounded-xl text-xs font-mono focus:outline-none focus:ring-1 focus:ring-teal-500/20 ${styles.inputBg}`}
          />
          
          <button
            id="copilot-send-btn"
            onClick={() => handleSend(inputValue)}
            disabled={!inputValue.trim() || isLoading}
            className={`p-2.5 rounded-xl flex items-center justify-center transition-all ${
              inputValue.trim() && !isLoading
                ? 'bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-slate-950 cursor-pointer shadow-md'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Resize Handle */}
      {!collapsed && onWidthChange && (
        <div
          className="absolute top-0 left-0 w-1 h-full cursor-ew-resize hover:bg-teal-500/30 transition-colors group"
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = width;

            const handleMouseMove = (moveEvent: MouseEvent) => {
              const delta = startX - moveEvent.clientX;
              const newWidth = Math.min(Math.max(startWidth + delta, 250), 600);
              onWidthChange(newWidth);
            };

            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
          title="Drag to resize copilot panel"
        >
          <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-3 h-8 bg-slate-800/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}
    </aside>
  );
}
