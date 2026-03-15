import React, { useState, useEffect, useRef } from 'react';
import { ViewName } from '../App';
import Layout from '../components/Layout';
import { getCurrentDocumentId, getUploads, setUploads, addUsage, User, Message, Upload } from '../store';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, ChevronLeft, Loader2, Bot, User as UserIcon, Trash2, Sparkles, GraduationCap, Brain, Zap, Coffee, Book, Download } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';

interface Persona {
  id: string;
  name: string;
  description: string;
  instruction: string;
  icon: React.ReactNode;
  color: string;
}

const PERSONAS: Persona[] = [
  {
    id: 'assistant',
    name: 'Academic Assistant',
    description: 'Balanced, professional, and helpful study partner.',
    instruction: 'You are an expert academic assistant. Answer questions based on the provided document content. Keep answers structured and easy to read using Markdown.',
    icon: <Bot className="w-4 h-4" />,
    color: 'text-indigo-400'
  },
  {
    id: 'socratic',
    name: 'Socratic Tutor',
    description: 'Asks guiding questions to help you find the answer.',
    instruction: 'You are a Socratic Tutor. Instead of giving direct answers, ask guiding questions that help the student arrive at the answer themselves based on the document. Encourage critical thinking.',
    icon: <Brain className="w-4 h-4" />,
    color: 'text-emerald-400'
  },
  {
    id: 'coach',
    name: 'Exam Coach',
    description: 'Focuses on key concepts and potential exam questions.',
    instruction: 'You are an Exam Coach. Focus on identifying the most important concepts for an exam, suggesting potential test questions, and providing memory techniques (mnemonics) based on the document.',
    icon: <Zap className="w-4 h-4" />,
    color: 'text-amber-400'
  },
  {
    id: 'explainer',
    name: 'Creative Explainer',
    description: 'Uses analogies and simple language for complex topics.',
    instruction: 'You are a Creative Explainer. Use simple language, vivid analogies, and storytelling to explain complex concepts from the document. Make it fun and easy to understand.',
    icon: <Coffee className="w-4 h-4" />,
    color: 'text-pink-400'
  },
  {
    id: 'professor',
    name: 'Strict Professor',
    description: 'Formal, rigorous, and focuses on academic precision.',
    instruction: 'You are a Strict Professor. Be formal, rigorous, and focus on academic precision. Cite specific parts of the document and maintain high academic standards in your explanations.',
    icon: <GraduationCap className="w-4 h-4" />,
    color: 'text-blue-400'
  }
];

interface Props {
  navigate: (view: ViewName) => void;
  user: User | null;
}

export default function ChatView({ navigate, user }: Props) {
  const docId = getCurrentDocumentId();
  const [upload, setUpload] = useState<Upload | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<Persona>(PERSONAS[0]);
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ja', name: 'Japanese' },
  ];

  useEffect(() => {
    if (!user || !docId) return;
    const uploads = getUploads();
    const doc = uploads.find(u => u.id === docId && u.userId === user.id);
    if (doc) {
      setUpload(doc);
      setMessages(doc.chatHistory || []);
    }
  }, [docId, user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading || !upload || !user) return;

    const userMessage: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      let docContent = upload.content || "No content available.";
      if (docContent.length > 30000) {
        docContent = docContent.substring(0, 30000) + "... [content truncated]";
      }

      const persona = selectedPersona;
      const chat = ai.chats.create({
        model: "gemini-3.1-pro-preview",
        config: {
          systemInstruction: `${persona.instruction}
          
          If the answer is not in the document, say so politely but try to provide general knowledge if relevant.
          ${useWebSearch ? 'You have access to Google Search. Use it to find the latest information or alternative explanations if the document is insufficient.' : ''}
          
          Document Content:
          ${docContent}`,
          tools: useWebSearch ? [{ googleSearch: {} }] : undefined,
        },
      });

      // Convert history to Gemini format if needed, but for now we just send the new message
      // with the system instruction containing the full context.
      const response = await chat.sendMessage({ message: input });
      
      const modelMessage: Message = { 
        role: 'model', 
        content: await translateMessage(response.text || "I'm sorry, I couldn't generate a response.", targetLanguage),
        personaId: persona.id
      };
      const finalMessages = [...newMessages, modelMessage];
      
      setMessages(finalMessages);
      
      // Save to store
      const allUploads = getUploads();
      const index = allUploads.findIndex(u => u.id === upload.id);
      if (index !== -1) {
        allUploads[index].chatHistory = finalMessages;
        setUploads(allUploads);
      }
      
      addUsage('chat');
    } catch (error: any) {
      console.error('Chat error:', error);
      if (error?.message?.includes('429') || error?.status === 429 || error?.message?.includes('exceeded your current quota')) {
        setMessages([...newMessages, { role: 'model', content: "You have exceeded your Gemini API quota. Please check your plan and billing details at https://ai.google.dev/gemini-api/docs/rate-limits." }]);
      } else {
        setMessages([...newMessages, { role: 'model', content: "Sorry, I encountered an error. Please check your connection and try again." }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const confirmClearChat = () => {
    setShowClearConfirm(true);
  };

  const executeClearChat = () => {
    if (!upload) return;
    setMessages([]);
    const allUploads = getUploads();
    const index = allUploads.findIndex(u => u.id === upload.id);
    if (index !== -1) {
      allUploads[index].chatHistory = [];
      setUploads(allUploads);
    }
    setShowClearConfirm(false);
  };

  const cancelClearChat = () => {
    setShowClearConfirm(false);
  };

  const translateMessage = async (text: string, targetLang: string) => {
    if (targetLang === 'en') return text;
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-preview",
        contents: `Translate the following text to ${LANGUAGES.find(l => l.code === targetLang)?.name || targetLang}. Only return the translated text, nothing else.\n\nText: ${text}`,
      });
      return response.text || text;
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  };

  if (!user || !upload) return null;

  return (
    <Layout navigate={navigate} activeView="dashboard">
      <div className="h-[calc(100vh-120px)] max-w-5xl mx-auto flex flex-col p-4 md:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center">
            <button 
              onClick={() => navigate('dashboard')}
              className="p-2 mr-4 bg-[#1A1830] rounded-xl border border-[rgba(124,58,237,0.2)] text-gray-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold flex items-center">
                <MessageSquare className="w-6 h-6 mr-3 text-indigo-400" />
                Chat with Document
              </h1>
              <p className="text-xs text-gray-400 truncate max-w-[200px] md:max-w-md">{upload.filename}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
             <button
              onClick={() => setUseWebSearch(!useWebSearch)}
              className={`flex items-center px-3 py-2 rounded-xl border transition-all text-xs font-bold ${
                useWebSearch 
                  ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' 
                  : 'bg-[#1A1830] border-[rgba(124,58,237,0.2)] text-gray-500 hover:text-gray-300'
              }`}
              title="Enable Web Search Grounding"
            >
              <Sparkles className={`w-3.5 h-3.5 mr-1.5 ${useWebSearch ? 'animate-pulse' : ''}`} />
              Web Search
            </button>
            <div className="flex-1 md:flex-none relative">
              <select 
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="w-full md:w-auto bg-[#1A1830] border border-[rgba(124,58,237,0.2)] rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors appearance-none pr-10"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 md:flex-none relative">
              <select 
                value={selectedPersona.id}
                onChange={(e) => {
                  const p = PERSONAS.find(p => p.id === e.target.value);
                  if (p) setSelectedPersona(p);
                }}
                className="w-full md:w-auto bg-[#1A1830] border border-[rgba(124,58,237,0.2)] rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors appearance-none pr-10"
              >
                {PERSONAS.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <button 
              onClick={() => {
                const chatText = messages.map(m => `${m.role === 'user' ? 'You' : 'AI'}: ${m.content}`).join('\n\n');
                const blob = new Blob([chatText], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${upload.filename.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_chat.txt`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="p-2 text-gray-500 hover:text-indigo-400 transition-colors"
              title="Export Chat"
            >
              <Download className="w-5 h-5" />
            </button>
            <button 
              onClick={confirmClearChat}
              className="p-2 text-gray-500 hover:text-red-400 transition-colors"
              title="Clear Chat"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 glass-card rounded-3xl overflow-hidden flex flex-col mb-4">
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar"
          >
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className={`w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mb-4 ${selectedPersona.color}`}>
                  <div className="scale-[2]">
                    {selectedPersona.icon}
                  </div>
                </div>
                <h3 className="text-lg font-bold mb-2">Ask {selectedPersona.name}</h3>
                <p className="text-gray-400 text-sm max-w-xs mb-4">
                  {selectedPersona.description}
                </p>
                <div className="flex flex-wrap justify-center gap-2 max-w-sm">
                  {selectedPersona.id === 'socratic' ? (
                    <span className="text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20">Guiding Questions</span>
                  ) : selectedPersona.id === 'coach' ? (
                    <span className="text-xs bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full border border-amber-500/20">Exam Prep</span>
                  ) : selectedPersona.id === 'explainer' ? (
                    <span className="text-xs bg-pink-500/10 text-pink-400 px-3 py-1 rounded-full border border-pink-500/20">Simple Analogies</span>
                  ) : (
                    <span className="text-xs bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/20">Academic Support</span>
                  )}
                </div>
              </div>
            )}

            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      msg.role === 'user' ? 'ml-3 bg-indigo-600' : 'mr-3 bg-[#211F35] border border-[rgba(124,58,237,0.2)]'
                    }`}>
                      {msg.role === 'user' ? (
                        <UserIcon className="w-4 h-4 text-white" />
                      ) : (
                        <div className={PERSONAS.find(p => p.id === msg.personaId)?.color || 'text-indigo-400'}>
                          {PERSONAS.find(p => p.id === msg.personaId)?.icon || <Bot className="w-4 h-4" />}
                        </div>
                      )}
                    </div>
                    <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-indigo-600 text-white rounded-tr-none' 
                        : 'bg-[#1A1830] border border-[rgba(124,58,237,0.1)] text-gray-200 rounded-tl-none group relative'
                    }`}>
                      <div className="markdown-body">
                        <Markdown>{msg.content}</Markdown>
                      </div>
                      {msg.role === 'model' && (
                        <div className="absolute -bottom-3 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-[#211F35] border border-[rgba(124,58,237,0.2)] rounded-lg p-1 shadow-lg">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(msg.content);
                              // Could add a toast here
                            }}
                            className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                            title="Copy message"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                          </button>
                          {i === messages.length - 1 && (
                            <button
                              onClick={() => {
                                const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
                                if (lastUserMessage) {
                                  // Remove the last AI message
                                  setMessages(messages.slice(0, -1));
                                  setInput(lastUserMessage.content);
                                  // We don't auto-send here to let user edit, or we could auto-send.
                                  // Let's just populate the input.
                                }
                              }}
                              className="p-1 text-gray-400 hover:text-indigo-400 hover:bg-white/10 rounded transition-colors"
                              title="Regenerate response"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="flex max-w-[85%] flex-row">
                  <motion.div 
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mr-3 bg-[#211F35] border border-[rgba(124,58,237,0.2)]"
                  >
                    <div className={selectedPersona.color}>
                      {selectedPersona.icon}
                    </div>
                  </motion.div>
                  <div className="bg-[#1A1830] border border-[rgba(124,58,237,0.1)] p-4 rounded-2xl rounded-tl-none flex items-center space-x-2">
                    <div className="flex space-x-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          animate={{ y: [0, -5, 0] }}
                          transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            delay: i * 0.1,
                            ease: "easeInOut"
                          }}
                          className="w-1.5 h-1.5 bg-indigo-400 rounded-full"
                        />
                      ))}
                    </div>
                    <motion.span 
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="text-xs text-gray-400 font-medium ml-2"
                    >
                      AI is processing...
                    </motion.span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Input Area */}
          <form 
            onSubmit={handleSend}
            className="p-4 bg-[#1A1830] border-t border-[rgba(124,58,237,0.1)] flex gap-3"
          >
            <input 
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
              placeholder={loading ? "AI is thinking..." : "Ask a question about this document..."}
              className={`flex-1 bg-[#0F0E17] border border-[rgba(124,58,237,0.2)] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            <button 
              type="submit"
              disabled={!input.trim() || loading}
              className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[48px]"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </form>
        </div>
        
        <div className="flex items-center justify-center text-[10px] text-gray-500 uppercase tracking-widest">
          <Sparkles className="w-3 h-3 mr-2 text-indigo-400" /> Powered by Gemini AI
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#1A1830] border border-[rgba(124,58,237,0.2)] rounded-3xl p-6 max-w-sm w-full shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-2">Clear Chat History</h3>
              <p className="text-gray-400 mb-6">Are you sure you want to clear the chat history? This action cannot be undone.</p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={cancelClearChat}
                  className="px-4 py-2 rounded-xl text-gray-300 hover:bg-white/5 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={executeClearChat}
                  className="px-4 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors font-medium"
                >
                  Clear
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
