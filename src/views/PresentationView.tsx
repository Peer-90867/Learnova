import React, { useState, useEffect } from 'react';
import { ViewName } from '../App';
import Layout from '../components/Layout';
import { getCurrentUser, getCurrentDocumentId, getUploads, addUsage, getPresentations, setPresentations, Presentation, Slide, User } from '../store';
import { motion, AnimatePresence } from 'motion/react';
import { Presentation as PresentationIcon, ChevronLeft, ChevronRight, Play, Download, Loader2, Image as ImageIcon, Sparkles, RefreshCw, UploadCloud } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

interface Props {
  navigate: (view: ViewName) => void;
  user: User | null;
}

export default function PresentationView({ navigate, user }: Props) {
  const docId = getCurrentDocumentId();
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [generatingImages, setGeneratingImages] = useState<Record<number, boolean>>({});
  const [documentTitle, setDocumentTitle] = useState('');

  useEffect(() => {
    if (!user) return;
    const uploads = getUploads();
    const doc = uploads.find(u => u.id === docId);
    if (doc) {
      setDocumentTitle(doc.filename);
      const existing = getPresentations().find(p => p.uploadId === docId && p.userId === user.id);
      if (existing) {
        setPresentation(existing);
      }
    }
  }, [docId, user]);

  const generatePresentation = async () => {
    if (!user || !docId) return;
    setLoading(true);
    try {
      const uploads = getUploads();
      const doc = uploads.find(u => u.id === docId);
      if (!doc || !doc.content) throw new Error('Document content not found');

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: `Create a professional presentation based on the following content. Each slide should have a clear title and 3-5 bullet points.
        
        Content: ${doc.content}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              slides: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    content: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ["title", "content"]
                }
              }
            },
            required: ["title", "slides"]
          }
        }
      });

      const data = JSON.parse(response.text);
      const newPresentation: Presentation = {
        id: Date.now(),
        userId: user.id,
        uploadId: docId,
        title: data.title || doc.filename,
        slides: data.slides,
        createdAt: new Date().toISOString()
      };

      const allPresentations = getPresentations();
      allPresentations.push(newPresentation);
      setPresentations(allPresentations);
      setPresentation(newPresentation);
      addUsage('presentation');
    } catch (error) {
      console.error('Failed to generate presentation:', error);
      alert('Failed to generate presentation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateSlideImage = async (slideIndex: number) => {
    if (!presentation) return;
    setGeneratingImages(prev => ({ ...prev, [slideIndex]: true }));
    try {
      const slide = presentation.slides[slideIndex];
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { text: `A professional, high-quality illustration for a presentation slide titled "${slide.title}". The image should be clean, modern, and relevant to the following points: ${slide.content.join(', ')}. Style: Minimalist, corporate, 3D render or professional photography.` }
          ]
        },
        config: {
          imageConfig: { aspectRatio: "16:9" }
        }
      });

      let imageUrl = '';
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (imageUrl) {
        const updatedPresentation = { ...presentation };
        updatedPresentation.slides[slideIndex].imageUrl = imageUrl;
        
        const allPresentations = getPresentations();
        const index = allPresentations.findIndex(p => p.id === presentation.id);
        if (index !== -1) {
          allPresentations[index] = updatedPresentation;
          setPresentations(allPresentations);
        }
        setPresentation(updatedPresentation);
      }
    } catch (error) {
      console.error('Failed to generate slide image:', error);
    } finally {
      setGeneratingImages(prev => ({ ...prev, [slideIndex]: false }));
    }
  };

  const nextSlide = () => {
    if (presentation && currentSlide < presentation.slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  return (
    <Layout navigate={navigate} activeView="dashboard">
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center">
            <button 
              onClick={() => navigate('dashboard')}
              className="p-2 mr-4 bg-[#1A1830] rounded-xl border border-[rgba(124,58,237,0.2)] text-gray-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold flex items-center">
                <PresentationIcon className="w-8 h-8 mr-3 text-indigo-400" />
                Presentation Generator
              </h1>
              <p className="text-gray-400 mt-1">{documentTitle || 'Select a document to begin'}</p>
            </div>
          </div>

          {presentation && (
            <div className="flex gap-2">
              <button 
                onClick={() => navigate('upload')}
                className="flex items-center px-4 py-2 bg-[#1A1830] border border-[rgba(124,58,237,0.2)] rounded-xl text-sm text-gray-300 hover:text-white transition-colors"
              >
                <UploadCloud className="w-4 h-4 mr-2" /> Upload Another
              </button>
              <button 
                onClick={() => generatePresentation()}
                className="flex items-center px-4 py-2 bg-[#1A1830] border border-[rgba(124,58,237,0.2)] rounded-xl text-sm text-gray-300 hover:text-white transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" /> Regenerate
              </button>
              <button className="flex items-center px-4 py-2 bg-indigo-600 rounded-xl text-sm text-white hover:bg-indigo-700 transition-colors">
                <Download className="w-4 h-4 mr-2" /> Export PDF
              </button>
            </div>
          )}
        </div>

        {!presentation ? (
          <div className="glass-card rounded-3xl p-12 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6">
              <PresentationIcon className="w-10 h-10 text-indigo-400" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Transform your document into a presentation</h2>
            <p className="text-gray-400 max-w-md mb-8">
              Our AI will analyze your document and create a professional slide deck with key points and AI-generated visuals.
            </p>
            <button 
              onClick={generatePresentation}
              disabled={loading || !docId}
              className="flex items-center px-8 py-4 bg-indigo-600 rounded-2xl text-white font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  Analyzing Document...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-3" />
                  Generate Presentation
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Slide Preview */}
            <div className="lg:col-span-3 space-y-6">
              <div className="aspect-video bg-[#1A1830] rounded-3xl border border-[rgba(124,58,237,0.2)] overflow-hidden relative group shadow-2xl">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSlide}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="absolute inset-0 flex flex-col p-12"
                  >
                    <div className="flex-1 flex flex-col md:flex-row gap-8">
                      <div className="flex-1">
                        <h3 className="text-3xl md:text-4xl font-bold text-white mb-8 border-l-4 border-indigo-500 pl-6">
                          {presentation.slides[currentSlide].title}
                        </h3>
                        <ul className="space-y-4">
                          {presentation.slides[currentSlide].content.map((point, i) => (
                            <motion.li 
                              key={i}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.1 }}
                              className="flex items-start text-lg text-gray-300"
                            >
                              <span className="w-2 h-2 bg-indigo-500 rounded-full mt-2.5 mr-4 flex-shrink-0" />
                              {point}
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="w-full md:w-1/2 aspect-video md:aspect-auto bg-[#0F0E17] rounded-2xl border border-[rgba(124,58,237,0.1)] overflow-hidden relative">
                        {presentation.slides[currentSlide].imageUrl ? (
                          <img 
                            src={presentation.slides[currentSlide].imageUrl} 
                            alt="Slide visual" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                            <ImageIcon className="w-12 h-12 text-gray-700 mb-4" />
                            <p className="text-gray-500 text-sm mb-4">No visual generated for this slide</p>
                            <button 
                              onClick={() => generateSlideImage(currentSlide)}
                              disabled={generatingImages[currentSlide]}
                              className="flex items-center px-4 py-2 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 rounded-xl text-xs font-bold hover:bg-indigo-600/20 transition-colors"
                            >
                              {generatingImages[currentSlide] ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Sparkles className="w-4 h-4 mr-2" />
                              )}
                              Generate AI Visual
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-auto flex justify-between items-center pt-8 border-t border-[rgba(124,58,237,0.1)]">
                      <div className="text-sm text-gray-500 font-medium uppercase tracking-widest">
                        {presentation.title}
                      </div>
                      <div className="text-sm text-indigo-400 font-bold">
                        {currentSlide + 1} / {presentation.slides.length}
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Controls Overlay */}
                <div className="absolute inset-y-0 left-0 w-16 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={prevSlide}
                    disabled={currentSlide === 0}
                    className="p-3 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-indigo-600 transition-colors disabled:opacity-0"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                </div>
                <div className="absolute inset-y-0 right-0 w-16 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={nextSlide}
                    disabled={currentSlide === presentation.slides.length - 1}
                    className="p-3 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-indigo-600 transition-colors disabled:opacity-0"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="flex justify-center gap-4">
                <button 
                  onClick={prevSlide}
                  disabled={currentSlide === 0}
                  className="px-6 py-3 bg-[#1A1830] border border-[rgba(124,58,237,0.2)] rounded-2xl text-gray-400 hover:text-white transition-colors disabled:opacity-30"
                >
                  Previous
                </button>
                <button 
                  onClick={nextSlide}
                  disabled={currentSlide === presentation.slides.length - 1}
                  className="px-8 py-3 bg-indigo-600 rounded-2xl text-white font-bold hover:bg-indigo-700 transition-colors disabled:opacity-30"
                >
                  Next Slide
                </button>
              </div>
            </div>

            {/* Thumbnails Sidebar */}
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Slide Overview</h4>
              {presentation.slides.map((slide, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    currentSlide === index 
                      ? 'bg-indigo-600/20 border-indigo-500/50 shadow-lg shadow-indigo-500/10' 
                      : 'bg-[#1A1830] border-[rgba(124,58,237,0.1)] hover:border-[rgba(124,58,237,0.3)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Slide {index + 1}</span>
                    {slide.imageUrl && <ImageIcon className="w-3 h-3 text-emerald-400" />}
                  </div>
                  <div className="text-sm font-bold text-white truncate">{slide.title}</div>
                  <div className="text-[10px] text-gray-500 mt-1 truncate">{slide.content[0]}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
