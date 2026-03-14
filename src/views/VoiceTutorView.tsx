import React, { useEffect, useRef, useState } from 'react';
import { ViewName } from '../App';
import Layout from '../components/Layout';
import { getCurrentUser, User } from '../store';
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { Mic, MicOff, Volume2, VolumeX, Loader2, Brain, X, Headphones, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  navigate: (view: ViewName) => void;
  user: User | null;
}

export default function VoiceTutorView({ navigate, user }: Props) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);

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
      
      // Connect to Gemini Live
      const sessionPromise = ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "You are a helpful and encouraging AI Study Tutor. Your goal is to help the student understand complex topics through conversation. Be concise, friendly, and ask guiding questions.",
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

  useEffect(() => {
    return () => stopSession();
  }, []);

  if (!user) return null;

  return (
    <Layout navigate={navigate} activeView="chat">
      <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center p-8 bg-[var(--color-bg)] relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="max-w-2xl w-full text-center z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="w-24 h-24 bg-gradient-primary rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-500/20">
              <Brain className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-4">AI Voice Tutor</h1>
            <p className="text-gray-400 text-lg">
              Experience real-time, low-latency voice learning. Ask questions, explain concepts, and get instant feedback.
            </p>
          </motion.div>

          <div className="glass-card rounded-[3rem] p-12 mb-12 relative overflow-hidden">
            <AnimatePresence mode="wait">
              {!isConnected ? (
                <motion.div
                  key="start"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center"
                >
                  <button
                    onClick={startSession}
                    disabled={isConnecting}
                    className="w-32 h-32 rounded-full bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center transition-all shadow-xl shadow-indigo-500/40 group relative"
                  >
                    {isConnecting ? (
                      <Loader2 className="w-12 h-12 text-white animate-spin" />
                    ) : (
                      <Mic className="w-12 h-12 text-white group-hover:scale-110 transition-transform" />
                    )}
                    <div className="absolute inset-0 rounded-full border-4 border-indigo-400/30 animate-ping" />
                  </button>
                  <p className="mt-8 text-indigo-400 font-bold uppercase tracking-widest text-sm">
                    {isConnecting ? 'Connecting to AI...' : 'Tap to Start Session'}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="active"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center"
                >
                  {/* Visualizer */}
                  <div className="flex items-center justify-center gap-1 h-24 mb-12">
                    {[...Array(12)].map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{
                          height: isSpeaking ? [20, 80, 20] : [10, 20, 10],
                        }}
                        transition={{
                          duration: 0.5,
                          repeat: Infinity,
                          delay: i * 0.05,
                        }}
                        className={`w-2 rounded-full ${isSpeaking ? 'bg-indigo-400' : 'bg-gray-600'}`}
                      />
                    ))}
                  </div>

                  <div className="flex gap-6">
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
                        isMuted ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      {isMuted ? <MicOff /> : <Mic />}
                    </button>
                    <button
                      onClick={stopSession}
                      className="w-16 h-16 rounded-2xl bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-all shadow-lg shadow-red-500/20"
                    >
                      <X />
                    </button>
                  </div>

                  <div className="mt-12 flex items-center text-sm font-bold text-emerald-400">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse" />
                    Live Connection Active
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="glass-card p-6 rounded-2xl">
              <div className="p-3 bg-indigo-500/10 rounded-xl w-fit mb-4">
                <Headphones className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="font-bold mb-2">Hands-Free</h3>
              <p className="text-xs text-gray-500 leading-relaxed">Study while doing other tasks. Just talk and listen.</p>
            </div>
            <div className="glass-card p-6 rounded-2xl">
              <div className="p-3 bg-purple-500/10 rounded-xl w-fit mb-4">
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="font-bold mb-2">Instant Feedback</h3>
              <p className="text-xs text-gray-500 leading-relaxed">Get corrections and explanations in real-time.</p>
            </div>
            <div className="glass-card p-6 rounded-2xl">
              <div className="p-3 bg-amber-500/10 rounded-xl w-fit mb-4">
                <Brain className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="font-bold mb-2">Deep Learning</h3>
              <p className="text-xs text-gray-500 leading-relaxed">Explain topics back to the AI to solidify your knowledge.</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
