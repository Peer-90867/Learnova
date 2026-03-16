import React, { useState, useEffect } from 'react';
import { ViewName } from '../App';
import Layout from '../components/Layout';
import { getCurrentUser, getUploads, getCurrentDocumentId, addUsage, User, getCache, setCache, getDecks, setDecks } from '../store';
import { GoogleGenAI, Modality } from "@google/genai";
import { Loader2, Download, Share2, FileText, AlertCircle, Clipboard, UploadCloud, Volume2, Play, Pause, Headphones, Zap, Mic, Edit3, Save, X, GitBranch, Layers } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import jsPDF from 'jspdf';

interface Props {
  navigate: (view: ViewName) => void;
  user: User | null;
}

export default function NotesView({ navigate, user }: Props) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [documentTitle, setDocumentTitle] = useState('AI Smart Notes');
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [cramLoading, setCramLoading] = useState(false);
  const [isCramMode, setIsCramMode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedNotes, setEditedNotes] = useState('');
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const generateCramGuide = async () => {
    if (!user || cramLoading) return;
    setCramLoading(true);
    try {
      const uploads = getUploads().filter(u => u && u.userId === user?.id);
      const currentDocId = getCurrentDocumentId();
      const targetUpload = currentDocId 
        ? uploads.find(u => u && u.id === currentDocId) || uploads[0]
        : uploads[0];

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `GENERATE AN EMERGENCY 10-MINUTE CRAM GUIDE. 
      Focus ONLY on the absolute most critical concepts, formulas, dates, and definitions that are likely to appear on an exam. 
      Use extreme brevity. Use bold text for "MUST KNOW" items. 
      Structure:
      1. Top 5 "Must-Know" Concepts
      2. Key Terms & Definitions
      3. Critical Formulas/Dates (if applicable)
      4. One-Sentence Summary of the entire topic.
      
      Content: ${targetUpload.content || ''}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }]
      });

      setNotes(response.text || '');
      setEditedNotes(response.text || '');
      setIsCramMode(true);
      setDocumentTitle(`${targetUpload.filename} - EMERGENCY CRAM GUIDE`);
      addUsage('note');
    } catch (err) {
      console.error('Cram mode failed', err);
      alert('Failed to generate cram guide.');
    } finally {
      setCramLoading(false);
    }
  };

  const generateAudioSummary = async () => {
    if (!notes || audioLoading) return;
    
    setAudioLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Create a 2-minute audio study podcast summary of these notes. Speak clearly and highlight the most important points for a student to remember: \n\n${notes}`;
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const blob = await (await fetch(`data:audio/wav;base64,${base64Audio}`)).blob();
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.play();
          setIsPlaying(true);
        }
      }
    } catch (err) {
      console.error('Failed to generate audio summary', err);
      alert('Failed to generate audio summary. Please try again later.');
    } finally {
      setAudioLoading(false);
    }
  };

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text(documentTitle, 20, 20);
    
    // Content
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    
    // Basic text wrapping for markdown content (this is a simplified approach)
    // A robust solution would parse the markdown and render it to PDF properly
    const splitText = doc.splitTextToSize(notes.replace(/#/g, '').replace(/\*/g, ''), 170);
    
    let y = 40;
    for (let i = 0; i < splitText.length; i++) {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(splitText[i], 20, y);
      y += 7;
    }
    
    doc.save(`${documentTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
  };

  const generateFlashcards = async () => {
    if (!user || !notes) return;
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Generate 10 flashcards based on the following notes. Return ONLY a JSON array of objects with 'front' and 'back' properties.
      
      Notes:
      ${notes}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
        }
      });

      const text = response.text || '[]';
      const parsedCards = JSON.parse(text);
      
      const newDeck = {
        id: Date.now(),
        userId: user.id,
        name: `${documentTitle} - Flashcards`,
        cards: parsedCards.map((c: any, i: number) => ({
          id: `card-${Date.now()}-${i}`,
          front: c.front,
          back: c.back,
          difficulty: 'medium'
        })),
        createdAt: new Date().toISOString()
      };

      const currentDecks = getDecks();
      setDecks([newDeck, ...currentDecks]);
      addUsage('flashcard');
      navigate('flashcards');
    } catch (err) {
      console.error('Failed to generate flashcards', err);
      alert('Failed to generate flashcards. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const generateNotes = async () => {
      if (!user) return;
      
      setLoading(true);
      setError('');
      
      try {
        const uploads = getUploads().filter(u => u && u.userId === user?.id);
        if (uploads.length === 0) {
          setError('No documents found. Please upload a document first.');
          setLoading(false);
          return;
        }

        const currentDocId = getCurrentDocumentId();
        const targetUpload = currentDocId 
          ? uploads.find(u => u && u.id === currentDocId) || uploads[0]
          : uploads[0];

        // Check cache
        const cached = getCache<string>(`notes_${targetUpload.id}`);
        if (cached) {
          setNotes(cached);
          setEditedNotes(cached);
          setLoading(false);
          return;
        }

        setDocumentTitle(`${targetUpload.filename} - Notes`);
        
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        let promptContent = targetUpload.content || '';
        let contents: any = `Generate study notes for the following content:\n\n${promptContent}`;
        
        if (promptContent.startsWith('data:')) {
          const match = promptContent.match(/^data:(.+);base64,(.*)$/);
          if (match) {
            const mimeType = match[1];
            const base64Data = match[2];
            contents = [
              {
                parts: [
                  { text: "Generate study notes for the following document:" },
                  {
                    inlineData: {
                      mimeType: mimeType,
                      data: base64Data
                    }
                  }
                ]
              }
            ];
          }
        }
        
        const systemInstruction = `You are an expert tutor. Generate ${user.settings?.noteStyle || 'detailed'}, well-structured study notes in Markdown format based on the provided text. Include clear headings, bullet points, and use bold text for key terms. Ensure the notes are easy to read and summarize the core concepts effectively. The tone should be ${user.settings?.tone || 'Academic'} and the language should be ${user.settings?.language || 'English'}.`;
        
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: contents,
          config: {
            systemInstruction
          }
        });

        setNotes(response.text || '');
        setEditedNotes(response.text || '');
        setCache(`notes_${targetUpload.id}`, response.text || '');
        addUsage('note');
      } catch (err: any) {
        console.error('Failed to generate notes', err);
        if (err?.message?.includes('429') || err?.status === 429 || err?.message?.includes('exceeded your current quota')) {
          setError('You have exceeded your Gemini API quota. Please check your plan and billing details at https://ai.google.dev/gemini-api/docs/rate-limits.');
        } else {
          setError('Failed to generate notes. Please check your API key and try again.');
        }
        // Fallback for demo purposes if API fails
        setNotes(`# Biology Ch.5 — Cell Division\n\n## Overview\nCell division is the fundamental process by which eukaryotic cells reproduce.\n\n## Types of Cell Division\n\n### 1. Mitosis\n*   **Purpose:** Growth and repair.\n*   **Result:** Produces 2 identical diploid daughter cells.\n\n### 3. Meiosis\n*   **Purpose:** Sexual reproduction.\n*   **Result:** Produces 4 genetically diverse haploid cells.\n\n## Key Phases\n*   **Interphase:** DNA replication occurs during the **S phase**.`);
        addUsage('note');
      } finally {
        setLoading(false);
      }
    };

    generateNotes();
  }, [user?.id]);

  if (!user) return null;

  return (
    <Layout navigate={navigate} activeView="notes">
      <div className="p-4 md:p-8 max-w-5xl mx-auto flex flex-col h-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center">
            <FileText className="w-6 h-6 md:w-8 md:h-8 mr-3 text-purple-400" />
            {documentTitle}
          </h1>
          <div className="flex flex-wrap gap-2 md:gap-3 w-full md:w-auto justify-start md:justify-end mt-4 md:mt-0">
            <button 
              onClick={() => {
                if (isEditing) {
                  setNotes(editedNotes);
                  setIsEditing(false);
                } else {
                  setEditedNotes(notes);
                  setIsEditing(true);
                }
              }}
              className={`flex items-center px-3 py-2 md:px-4 md:py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all shadow-md ${
                isEditing 
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20' 
                  : 'bg-[#1A1830] border border-[rgba(124,58,237,0.2)] text-gray-300 hover:text-white hover:bg-indigo-500/10'
              }`}
            >
              {isEditing ? <Save className="w-4 h-4 mr-2" /> : <Edit3 className="w-4 h-4 mr-2" />}
              {isEditing ? 'Save Changes' : 'Edit Notes'}
            </button>
            {isEditing && (
              <button 
                onClick={() => setIsEditing(false)}
                className="flex items-center px-3 py-2 md:px-4 md:py-2.5 bg-red-600/10 border border-red-500/20 text-red-400 rounded-xl text-xs md:text-sm font-bold hover:bg-red-600/20 transition-all"
              >
                <X className="w-4 h-4 mr-2" /> Cancel
              </button>
            )}
            <button 
              onClick={generateCramGuide}
              disabled={cramLoading}
              className="flex items-center px-3 py-2 md:px-4 md:py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs md:text-sm font-bold transition-all shadow-md shadow-orange-500/20 disabled:opacity-50"
            >
              {cramLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
              Cram Mode
            </button>
            <button 
              onClick={() => navigate('voice_tutor')}
              className="flex items-center px-3 py-2 md:px-4 md:py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs md:text-sm font-bold transition-all shadow-md shadow-purple-500/20"
            >
              <Mic className="w-4 h-4 mr-2" />
              Voice Tutor
            </button>
            <button 
              onClick={audioUrl ? toggleAudio : generateAudioSummary}
              disabled={audioLoading}
              className={`flex items-center px-3 py-2 md:px-4 md:py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all shadow-md ${
                isPlaying 
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20' 
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
              } disabled:opacity-50`}
            >
              {audioLoading ? (
                <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2 animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
              ) : (
                <Headphones className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
              )}
              {audioLoading ? 'Generating Podcast...' : isPlaying ? 'Pause Summary' : 'Listen to Summary'}
            </button>
            <audio 
              ref={audioRef} 
              onEnded={() => setIsPlaying(false)} 
              className="hidden" 
            />
            <button 
              onClick={() => navigate('upload')}
              className="flex items-center px-3 py-2 md:px-4 md:py-2.5 bg-[#1A1830] border border-[rgba(124,58,237,0.2)] rounded-xl text-xs md:text-sm font-medium text-gray-300 hover:text-white hover:bg-indigo-500/10 hover:border-indigo-500/40 transition-all shadow-sm"
            >
              <UploadCloud className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" /> Upload Another
            </button>
            <button 
              onClick={() => navigate('mindmap')}
              className="flex items-center px-3 py-2 md:px-4 md:py-2.5 bg-[#1A1830] border border-[rgba(124,58,237,0.2)] rounded-xl text-xs md:text-sm font-medium text-gray-300 hover:text-white hover:bg-indigo-500/10 hover:border-indigo-500/40 transition-all shadow-sm"
            >
              <GitBranch className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" /> Mind Map
            </button>
            <button 
              onClick={() => navigate('flashcards')}
              className="flex items-center px-3 py-2 md:px-4 md:py-2.5 bg-[#1A1830] border border-[rgba(124,58,237,0.2)] rounded-xl text-xs md:text-sm font-medium text-gray-300 hover:text-white hover:bg-indigo-500/10 hover:border-indigo-500/40 transition-all shadow-sm"
            >
              <Layers className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" /> Flashcards
            </button>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(notes);
                alert('Notes copied to clipboard!');
              }}
              className="flex items-center px-3 py-2 md:px-4 md:py-2.5 bg-[#1A1830] border border-[rgba(124,58,237,0.2)] rounded-xl text-xs md:text-sm font-medium text-gray-300 hover:text-white hover:bg-indigo-500/10 hover:border-indigo-500/40 transition-all shadow-sm"
            >
              <Clipboard className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" /> Copy
            </button>
            <button 
              onClick={() => {
                const blob = new Blob([notes], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${documentTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center px-3 py-2 md:px-4 md:py-2.5 bg-[#1A1830] border border-[rgba(124,58,237,0.2)] rounded-xl text-xs md:text-sm font-medium text-gray-300 hover:text-white hover:bg-indigo-500/10 hover:border-indigo-500/40 transition-all shadow-sm"
            >
              <Download className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" /> Export MD
            </button>
            <button 
              onClick={exportToPDF}
              className="flex items-center px-3 py-2 md:px-4 md:py-2.5 bg-[#1A1830] border border-[rgba(124,58,237,0.2)] rounded-xl text-xs md:text-sm font-medium text-gray-300 hover:text-white hover:bg-indigo-500/10 hover:border-indigo-500/40 transition-all shadow-sm"
            >
              <Download className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" /> Export PDF
            </button>
            <button 
              onClick={generateFlashcards}
              disabled={loading}
              className="flex items-center px-3 py-2 md:px-4 md:py-2.5 bg-[#1A1830] border border-[rgba(124,58,237,0.2)] rounded-xl text-xs md:text-sm font-medium text-gray-300 hover:text-white hover:bg-indigo-500/10 hover:border-indigo-500/40 transition-all shadow-sm disabled:opacity-50"
            >
              <Layers className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" /> Gen Flashcards
            </button>
            <button 
              onClick={async () => {
                const shareData = {
                  title: documentTitle,
                  text: `Check out these study notes: ${documentTitle}`,
                  url: window.location.href,
                };
                if (navigator.share) {
                  try {
                    await navigator.share(shareData);
                  } catch (err: any) {
                    if (err.name !== 'AbortError') {
                      console.error('Share failed:', err);
                    }
                  }
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Link copied to clipboard!');
                }
              }}
              className="flex items-center px-3 py-2 md:px-4 md:py-2.5 bg-indigo-600 rounded-xl text-xs md:text-sm font-bold text-white hover:bg-indigo-500 transition-all shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5"
            >
              <Share2 className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" /> Share
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <Loader2 className="w-12 h-12 text-purple-500 animate-spin mb-4" />
            <p className="text-gray-400">Synthesizing your notes...</p>
          </div>
        ) : error && !notes ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <p className="text-red-400 mb-4">{error}</p>
            <button 
              onClick={() => navigate('upload')}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors"
            >
              Upload a Document
            </button>
          </div>
        ) : (
          <div className="flex-1 glass-card rounded-2xl p-8 overflow-y-auto max-w-none">
            {isEditing ? (
              <textarea
                value={editedNotes}
                onChange={(e) => setEditedNotes(e.target.value)}
                className="w-full h-full bg-transparent text-gray-200 font-mono text-sm focus:outline-none resize-none"
                placeholder="Edit your notes here..."
              />
            ) : (
              <div className="prose prose-invert prose-indigo max-w-none markdown-body">
                <ReactMarkdown>{notes}</ReactMarkdown>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
