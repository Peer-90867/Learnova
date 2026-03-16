import React, { useEffect, useRef, useState } from 'react';
import { ViewName } from '../App';
import Layout from '../components/Layout';
import { getCurrentUser, User } from '../store';
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { Mic, MicOff, Volume2, VolumeX, Loader2, Brain, X, Headphones, Sparkles, Settings2, MessageSquareText, GraduationCap, Lightbulb, ShieldAlert, Baby, Languages, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  navigate: (view: ViewName) => void;
  user: User | null;
}

const VOICES = [
  { id: 'Zephyr', name: 'Zephyr (Energetic)' },
  { id: 'Puck', name: 'Puck (Friendly)' },
  { id: 'Charon', name: 'Charon (Calm)' },
  { id: 'Kore', name: 'Kore (Clear)' },
  { id: 'Fenrir', name: 'Fenrir (Deep)' },
];

const PERSONAS = [
  { id: 'tutor', name: 'Friendly Tutor', icon: GraduationCap, color: 'text-indigo-400', prompt: 'You are a helpful and encouraging AI Study Tutor. Your goal is to help the student understand complex topics through conversation. Be concise, friendly, and ask guiding questions.' },
  { id: 'socratic', name: 'Socratic Method', icon: Lightbulb, color: 'text-amber-400', prompt: 'You are a Socratic tutor. Never give direct answers. Instead, ask probing questions that guide the student to discover the answer themselves.' },
  { id: 'examiner', name: 'Strict Examiner', icon: ShieldAlert, color: 'text-red-400', prompt: 'You are a strict examiner conducting an oral exam. Ask difficult questions, evaluate the answers critically, and point out any flaws in reasoning.' },
  { id: 'eli5', name: 'Explain Like I\'m 5', icon: Baby, color: 'text-emerald-400', prompt: 'You are an expert at explaining complex concepts simply. Use analogies, simple language, and avoid jargon. Assume the user has no prior knowledge.' },
];

export default function VoiceTutorView({ navigate, user }: Props) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('Zephyr');
  const [selectedPersona, setSelectedPersona] = useState('tutor');
  const [showSettings, setShowSettings] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [textInput, setTextInput] = useState('');
  
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showTranscript && transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript, showTranscript]);

  const startSession = async () => {
    if (isConnecting || isConnected) return;
    setIsConnecting(true);
    setTranscript([]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // Initialize Audio Context
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      
      // Request Microphone
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
      
      const personaPrompt = PERSONAS.find(p => p.id === selectedPersona)?.prompt || PERSONAS[0].prompt;
      const language = user.settings?.language || 'English';
      const tone = user.settings?.tone || 'Friendly';
      const fullPrompt = `${personaPrompt}\n\nIMPORTANT: You must speak and respond in ${language}. Your tone should be ${tone}.`;

      // Connect to Gemini Live
      const sessionPromise = ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } },
          },
          systemInstruction: fullPrompt,
          // Enable transcription
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setIsConnecting(false);
            console.log("Live session opened");
            
            // Start sending audio
            const processor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            source.connect(processor);
            processor.connect(audioContextRef.current!.destination);
            
            processor.onaudioprocess = (e) => {
              if (isMuted) return;
              const inputData = e.inputBuffer.getChannelData(0);
              // Convert Float32 to Int16
              const pcmData = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
              }
              
              const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
              sessionPromise.then(session => {
                session.sendRealtimeInput({
                  media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                });
              });
            };
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio Output
            if (message.serverContent?.modelTurn?.parts) {
              const part = message.serverContent.modelTurn.parts[0];
              if (part.inlineData) {
                const base64Audio = part.inlineData.data;
                const binaryString = atob(base64Audio);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }
                const pcmData = new Int16Array(bytes.buffer);
                audioQueueRef.current.push(pcmData);
                if (!isPlayingRef.current) {
                  playNextChunk();
                }
              }
            }
            
            // Handle Transcriptions
            if (message.serverContent?.modelTurn?.parts) {
              const textParts = message.serverContent.modelTurn.parts.filter(p => p.text);
              if (textParts.length > 0) {
                const text = textParts.map(p => p.text).join(' ');
                setTranscript(prev => [...prev, { role: 'ai', text }]);
              }
            }

            // The Live API docs say outputAudioTranscription and inputAudioTranscription
            // might come in different fields depending on the exact implementation,
            // but typically modelTurn contains the AI's text if output transcription is enabled.
            // Let's also check for any other text fields if they exist.
            
            if (message.serverContent?.interrupted) {
              audioQueueRef.current = [];
              isPlayingRef.current = false;
              setIsSpeaking(false);
            }
          },
          onclose: () => {
            stopSession();
          },
          onerror: (err) => {
            console.error("Live error:", err);
            stopSession();
          }
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Failed to start voice tutor:", err);
      alert("Failed to access microphone or connect to AI. Please ensure you have granted microphone permissions.");
      setIsConnecting(false);
    }
  };

  const playNextChunk = async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setIsSpeaking(false);
      return;
    }

    isPlayingRef.current = true;
    setIsSpeaking(true);
    const pcmData = audioQueueRef.current.shift()!;
    
    const audioBuffer = audioContextRef.current!.createBuffer(1, pcmData.length, 16000);
    const channelData = audioBuffer.getChannelData(0);
    for (let i = 0; i < pcmData.length; i++) {
      channelData[i] = pcmData[i] / 0x7FFF;
    }

    const source = audioContextRef.current!.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current!.destination);
    source.onended = playNextChunk;
    source.start();
  };

  const stopSession = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    setIsSpeaking(false);
    audioQueueRef.current = [];
  };

  const sendTextMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || !sessionRef.current) return;
    
    const message = textInput.trim();
    setTextInput('');
    setTranscript(prev => [...prev, { role: 'user', text: message }]);
    
    sessionRef.current.sendClientContent({
      turns: [{ role: 'user', parts: [{ text: message }] }],
      turnComplete: true
    });
  };

  useEffect(() => {
    return () => stopSession();
  }, []);

  if (!user) return null;

  return (
    <Layout navigate={navigate} activeView="voice_tutor">
      <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center p-4 md:p-8 bg-[var(--color-bg)] relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="max-w-4xl w-full z-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Interface */}
          <div className="lg:col-span-2 text-center flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-primary rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-500/20">
                <Brain className="w-10 h-10 md:w-12 md:h-12 text-white" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-4">AI Voice Tutor</h1>
              <p className="text-gray-400 text-sm md:text-lg max-w-lg mx-auto">
                Experience real-time, low-latency voice learning. Ask questions, explain concepts, and get instant feedback.
              </p>
            </motion.div>

            <div className="glass-card rounded-[3rem] p-8 md:p-12 mb-8 relative overflow-hidden w-full max-w-md mx-auto border border-white/10 shadow-2xl">
              <AnimatePresence mode="wait">
                {!isConnected ? (
                  <motion.div
                    key="start"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    className="flex flex-col items-center"
                  >
                    <button
                      onClick={startSession}
                      disabled={isConnecting}
                      className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center transition-all shadow-2xl shadow-indigo-500/40 group relative"
                    >
                      {isConnecting ? (
                        <Loader2 className="w-12 h-12 md:w-16 md:h-16 text-white animate-spin" />
                      ) : (
                        <Mic className="w-12 h-12 md:w-16 md:h-16 text-white group-hover:scale-110 transition-transform" />
                      )}
                      <div className="absolute inset-0 rounded-full border-4 border-indigo-400/30 animate-ping" />
                      <div className="absolute -inset-4 rounded-full border border-indigo-500/10 animate-pulse" />
                    </button>
                    <p className="mt-10 text-indigo-400 font-black uppercase tracking-[0.3em] text-[10px] md:text-xs">
                      {isConnecting ? 'Establishing Neural Link...' : 'Tap to Start Learning'}
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="active"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    className="flex flex-col items-center"
                  >
                    {/* Visualizer */}
                    <div className="flex items-center justify-center gap-1.5 h-32 mb-12">
                      {[...Array(24)].map((_, i) => (
                        <motion.div
                          key={i}
                          animate={{
                            height: isSpeaking ? [15, Math.random() * 80 + 20, 15] : [5, 15, 5],
                            opacity: isSpeaking ? [0.5, 1, 0.5] : 0.3,
                          }}
                          transition={{
                            duration: 0.4,
                            repeat: Infinity,
                            delay: i * 0.02,
                          }}
                          className={`w-1.5 rounded-full ${isSpeaking ? 'bg-gradient-to-t from-indigo-600 to-purple-400' : 'bg-gray-600'}`}
                        />
                      ))}
                    </div>

                    <div className="flex gap-6 md:gap-8">
                      <button
                        onClick={() => setIsMuted(!isMuted)}
                        className={`w-16 h-16 md:w-20 md:h-20 rounded-3xl flex items-center justify-center transition-all ${
                          isMuted ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/5'
                        }`}
                      >
                        {isMuted ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                      </button>
                      <button
                        onClick={stopSession}
                        className="w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-all shadow-2xl shadow-red-500/30 group"
                      >
                        <X className="w-8 h-8 group-hover:rotate-90 transition-transform" />
                      </button>
                    </div>

                    <div className="mt-10 flex items-center text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-emerald-400">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full mr-3 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                      Neural Link Active
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="flex gap-4 mb-8">
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className={`flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-colors ${showSettings ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
              >
                <Settings2 className="w-4 h-4 mr-2" />
                Settings
              </button>
              <button 
                onClick={() => setShowTranscript(!showTranscript)}
                className={`flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-colors ${showTranscript ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
              >
                <MessageSquareText className="w-4 h-4 mr-2" />
                Transcript
              </button>
            </div>
          </div>

          {/* Side Panels (Settings & Transcript) */}
          <div className="flex flex-col gap-6">
            
            {/* Settings Panel */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="glass-card p-6 rounded-2xl overflow-hidden"
                >
                  <h3 className="font-bold mb-4 flex items-center">
                    <Settings2 className="w-4 h-4 mr-2 text-indigo-400" />
                    Tutor Settings
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-2">Voice</label>
                      <div className="grid grid-cols-1 gap-2">
                        {VOICES.map(voice => (
                          <button
                            key={voice.id}
                            onClick={() => setSelectedVoice(voice.id)}
                            disabled={isConnected}
                            className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                              selectedVoice === voice.id 
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' 
                                : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'
                            } ${isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {voice.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Persona</label>
                      <div className="grid grid-cols-1 gap-2">
                        {PERSONAS.map(persona => {
                          const Icon = persona.icon;
                          return (
                            <button
                              key={persona.id}
                              onClick={() => setSelectedPersona(persona.id)}
                              disabled={isConnected}
                              className={`flex items-center px-4 py-3 rounded-xl text-sm transition-all group ${
                                selectedPersona === persona.id 
                                  ? 'bg-white/10 text-white border border-white/20 shadow-lg' 
                                  : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'
                              } ${isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <div className={`p-2 rounded-lg mr-3 transition-colors ${selectedPersona === persona.id ? 'bg-indigo-500/20' : 'bg-white/5 group-hover:bg-white/10'}`}>
                                <Icon className={`w-4 h-4 ${selectedPersona === persona.id ? persona.color : 'text-gray-500'}`} />
                              </div>
                              <span className="font-medium">{persona.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {isConnected && (
                      <p className="text-xs text-amber-400 mt-2">
                        Disconnect to change settings.
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Transcript Panel */}
            <AnimatePresence>
              {showTranscript && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="glass-card p-6 rounded-2xl flex flex-col flex-1 min-h-[300px] max-h-[500px]"
                >
                  <h3 className="font-bold mb-4 flex items-center shrink-0">
                    <MessageSquareText className="w-4 h-4 mr-2 text-purple-400" />
                    Live Transcript
                  </h3>
                  
                  <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                    {transcript.length === 0 ? (
                      <div className="text-center text-gray-500 text-sm mt-10">
                        Transcript will appear here once the session starts.
                      </div>
                    ) : (
                      transcript.map((msg, idx) => (
                        <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                          <div className={`text-xs font-medium mb-1 ${msg.role === 'user' ? 'text-indigo-400' : 'text-purple-400'}`}>
                            {msg.role === 'user' ? 'You' : 'Tutor'}
                          </div>
                          <div className={`px-3 py-2 rounded-xl text-sm max-w-[90%] ${
                            msg.role === 'user' 
                              ? 'bg-indigo-600/20 text-indigo-100 border border-indigo-500/20 rounded-tr-none' 
                              : 'bg-white/5 text-gray-300 border border-white/10 rounded-tl-none'
                          }`}>
                            {msg.text}
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={transcriptEndRef} />
                  </div>
                  
                  {isConnected && (
                    <form onSubmit={sendTextMessage} className="mt-4 flex gap-2">
                      <input
                        type="text"
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
                      />
                      <button
                        type="submit"
                        disabled={!textInput.trim()}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                      >
                        Send
                      </button>
                    </form>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Features (if neither settings nor transcript are shown, or just below them) */}
            {!showSettings && !showTranscript && (
              <div className="grid grid-cols-1 gap-4">
                <div className="glass-card p-5 rounded-2xl">
                  <div className="p-2 bg-indigo-500/10 rounded-lg w-fit mb-3">
                    <Headphones className="w-4 h-4 text-indigo-400" />
                  </div>
                  <h3 className="font-bold text-sm mb-1">Hands-Free</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">Study while doing other tasks. Just talk and listen.</p>
                </div>
                <div className="glass-card p-5 rounded-2xl">
                  <div className="p-2 bg-purple-500/10 rounded-lg w-fit mb-3">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                  </div>
                  <h3 className="font-bold text-sm mb-1">Instant Feedback</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">Get corrections and explanations in real-time.</p>
                </div>
                <div className="glass-card p-5 rounded-2xl">
                  <div className="p-2 bg-amber-500/10 rounded-lg w-fit mb-3">
                    <Brain className="w-4 h-4 text-amber-400" />
                  </div>
                  <h3 className="font-bold text-sm mb-1">Deep Learning</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">Explain topics back to the AI to solidify your knowledge.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
