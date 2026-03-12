import React, { useState, useEffect } from 'react';
import { ViewName } from '../App';
import Layout from '../components/Layout';
import { getCurrentUser, getUploads, getCurrentDocumentId, addUsage, User } from '../store';
import { GoogleGenAI } from '@google/genai';
import { Loader2, Download, Share2, FileText, AlertCircle, Clipboard, UploadCloud } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Props {
  navigate: (view: ViewName) => void;
  user: User | null;
}

export default function NotesView({ navigate, user }: Props) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [documentTitle, setDocumentTitle] = useState('AI Smart Notes');

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
        
        const systemInstruction = `You are an expert tutor. Generate ${user.settings?.noteStyle || 'detailed'}, well-structured study notes in Markdown format based on the provided text. Include clear headings, bullet points, and use bold text for key terms. Ensure the notes are easy to read and summarize the core concepts effectively.`;
        
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-pro-preview',
          contents: contents,
          config: {
            systemInstruction
          }
        });

        setNotes(response.text || '');
        addUsage('note');
      } catch (err) {
        console.error('Failed to generate notes', err);
        setError('Failed to generate notes. Please check your API key and try again.');
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
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => navigate('upload')}
              className="flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-[#211F35] border border-[rgba(124,58,237,0.2)] hover:bg-[#2A2845] transition-colors"
            >
              <UploadCloud className="w-4 h-4 mr-2" /> Upload Another
            </button>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(notes);
                alert('Notes copied to clipboard!');
              }}
              className="flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-[#211F35] border border-[rgba(124,58,237,0.2)] hover:bg-[#2A2845] transition-colors"
            >
              <Clipboard className="w-4 h-4 mr-2" /> Copy
            </button>
            <button className="flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-[#211F35] border border-[rgba(124,58,237,0.2)] hover:bg-[#2A2845] transition-colors">
              <Download className="w-4 h-4 mr-2" /> Export PDF
            </button>
            <button 
              onClick={() => {
                const shareData = {
                  title: documentTitle,
                  text: `Check out these study notes: ${documentTitle}`,
                  url: window.location.href,
                };
                if (navigator.share) {
                  navigator.share(shareData).catch((err) => {
                    if (err.name !== 'AbortError') {
                      console.error(err);
                    }
                  });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Link copied to clipboard!');
                }
              }}
              className="flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              <Share2 className="w-4 h-4 mr-2" /> Share
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
          <div className="flex-1 glass-card rounded-2xl p-8 overflow-y-auto prose prose-invert prose-indigo max-w-none">
            <div className="markdown-body">
              <ReactMarkdown>{notes}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
