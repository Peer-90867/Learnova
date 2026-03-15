import React, { useState, useEffect } from 'react';
import { ViewName } from '../App';
import Layout from '../components/Layout';
import { getCurrentUser, getCurrentDocumentId, getUploads, addUsage, getPresentations, setPresentations, Presentation, Slide, User, getCache, setCache } from '../store';
import { motion, AnimatePresence } from 'motion/react';
import { Presentation as PresentationIcon, ChevronLeft, ChevronRight, Play, Download, Loader2, Image as ImageIcon, Sparkles, RefreshCw, UploadCloud, Plus, Copy, CheckCircle2, X, Share2, Save, Trash2 } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { jsPDF } from 'jspdf';

interface Props {
  navigate: (view: ViewName) => void;
  user: User | null;
}

export default function PresentationView({ navigate, user }: Props) {
  const docId = getCurrentDocumentId();
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPresenting, setIsPresenting] = useState(false);
  const [generatingImages, setGeneratingImages] = useState<Record<number, boolean>>({});
  const [documentTitle, setDocumentTitle] = useState('');
  const [showAddSlideModal, setShowAddSlideModal] = useState(false);
  const [newSlideTitle, setNewSlideTitle] = useState('');
  const [newSlideContent, setNewSlideContent] = useState('');
  const [isAddingBullet, setIsAddingBullet] = useState(false);
  const [newBulletText, setNewBulletText] = useState('');

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

      // Check cache
      const cached = getCache<Presentation>(`presentation_${doc.id}`);
      if (cached) {
        setPresentation(cached);
        setLoading(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: `Create a comprehensive, professional presentation based on the following content. 
        The presentation should have at least 6-10 slides depending on the depth of the content.
        Each slide should have a clear, engaging title and 3-5 concise, impactful bullet points.
        Include an introduction slide, several body slides covering key themes, and a conclusion/summary slide.
        
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
      setCache(`presentation_${docId}`, newPresentation);
      addUsage('presentation');
    } catch (error: any) {
      console.error('Failed to generate presentation:', error);
      if (error?.message?.includes('429') || error?.status === 429 || error?.message?.includes('exceeded your current quota')) {
        alert('You have exceeded your Gemini API quota. Please check your plan and billing details at https://ai.google.dev/gemini-api/docs/rate-limits.');
      } else {
        alert('Failed to generate presentation. Please try again.');
      }
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
    } catch (error: any) {
      console.error('Failed to generate slide image:', error);
      if (error?.message?.includes('429') || error?.status === 429 || error?.message?.includes('exceeded your current quota')) {
        alert('You have exceeded your Gemini API quota. Please check your plan and billing details at https://ai.google.dev/gemini-api/docs/rate-limits.');
      } else {
        alert('Failed to generate slide image. Please try again.');
      }
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPresenting) return;
      if (e.key === 'ArrowRight' || e.key === ' ') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === 'Escape') setIsPresenting(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPresenting, currentSlide, presentation]);

  const handleAddSlide = () => {
    if (!presentation || !newSlideTitle.trim()) return;
    
    const contentPoints = newSlideContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
      
    const newSlide: Slide = {
      title: newSlideTitle,
      content: contentPoints.length > 0 ? contentPoints : ['New point']
    };
    
    const updatedPresentation = { ...presentation };
    updatedPresentation.slides = [...updatedPresentation.slides, newSlide];
    
    const allPresentations = getPresentations();
    const index = allPresentations.findIndex(p => p.id === presentation.id);
    if (index !== -1) {
      allPresentations[index] = updatedPresentation;
      setPresentations(allPresentations);
    }
    
    setPresentation(updatedPresentation);
    setCurrentSlide(updatedPresentation.slides.length - 1);
    
    // Reset and close
    setNewSlideTitle('');
    setNewSlideContent('');
    setShowAddSlideModal(false);
  };

  const handleDuplicateSlide = () => {
    if (!presentation) return;
    const currentSlideData = presentation.slides[currentSlide];
    const newSlide: Slide = {
      title: currentSlideData.title + ' (Copy)',
      content: [...currentSlideData.content],
      imageUrl: currentSlideData.imageUrl
    };
    
    const updatedPresentation = { ...presentation };
    updatedPresentation.slides = [
      ...updatedPresentation.slides.slice(0, currentSlide + 1),
      newSlide,
      ...updatedPresentation.slides.slice(currentSlide + 1)
    ];
    
    const allPresentations = getPresentations();
    const index = allPresentations.findIndex(p => p.id === presentation.id);
    if (index !== -1) {
      allPresentations[index] = updatedPresentation;
      setPresentations(allPresentations);
    }
    
    setPresentation(updatedPresentation);
    setCurrentSlide(currentSlide + 1);
  };

  const handleAddBullet = () => {
    if (!presentation || !newBulletText.trim()) return;
    
    const updatedPresentation = { ...presentation };
    const updatedSlides = [...updatedPresentation.slides];
    const updatedSlide = { ...updatedSlides[currentSlide] };
    
    updatedSlide.content = [...updatedSlide.content, newBulletText.trim()];
    updatedSlides[currentSlide] = updatedSlide;
    updatedPresentation.slides = updatedSlides;
    
    const allPresentations = getPresentations();
    const index = allPresentations.findIndex(p => p.id === presentation.id);
    if (index !== -1) {
      allPresentations[index] = updatedPresentation;
      setPresentations(allPresentations);
    }
    
    setPresentation(updatedPresentation);
    setNewBulletText('');
    setIsAddingBullet(false);
  };

  const exportToPDF = () => {
    if (!presentation) return;
    
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    presentation.slides.forEach((slide, index) => {
      if (index > 0) {
        doc.addPage();
      }
      
      // Background
      doc.setFillColor(15, 14, 23); // #0F0E17
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      
      // Title
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text(slide.title, 20, 30);
      
      // Content
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(200, 200, 200);
      
      let yPos = 50;
      slide.content.forEach(point => {
        // Bullet point
        doc.setFillColor(99, 102, 241); // indigo-500
        doc.circle(22, yPos - 1.5, 1.5, 'F');
        
        // Text with wrapping
        // If there's an image, wrap text earlier
        const textWidth = slide.imageUrl ? pageWidth - 150 : pageWidth - 50;
        const splitText = doc.splitTextToSize(point, textWidth);
        doc.text(splitText, 28, yPos);
        yPos += 10 * splitText.length;
      });
      
      // Image (if exists)
      if (slide.imageUrl) {
        try {
          // Add image to the right side
          // Image dimensions: 16:9 aspect ratio
          const imgWidth = 110;
          const imgHeight = imgWidth * (9/16);
          doc.addImage(slide.imageUrl, 'PNG', pageWidth - imgWidth - 20, 40, imgWidth, imgHeight);
        } catch (e) {
          console.error('Failed to add image to PDF', e);
        }
      }
      
      // Footer
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`${presentation.title} - Slide ${index + 1}`, 20, pageHeight - 10);
    });
    
    doc.save(`${presentation.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
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
            <div className="flex flex-wrap gap-2 md:gap-3 w-full md:w-auto justify-start md:justify-end mt-4 md:mt-0">
              <button 
                onClick={() => navigate('upload')}
                className="flex items-center px-3 py-2 md:px-4 md:py-2.5 bg-[#1A1830] border border-[rgba(124,58,237,0.2)] rounded-xl text-xs md:text-sm font-medium text-gray-300 hover:text-white hover:bg-indigo-500/10 hover:border-indigo-500/40 transition-all shadow-sm"
              >
                <UploadCloud className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" /> Upload Another
              </button>
              <button 
                onClick={() => generatePresentation()}
                className="flex items-center px-3 py-2 md:px-4 md:py-2.5 bg-[#1A1830] border border-[rgba(124,58,237,0.2)] rounded-xl text-xs md:text-sm font-medium text-gray-300 hover:text-white hover:bg-indigo-500/10 hover:border-indigo-500/40 transition-all shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" /> Regenerate
              </button>
              <button 
                onClick={() => setShowAddSlideModal(true)}
                className="flex items-center px-3 py-2 md:px-4 md:py-2.5 bg-[#1A1830] border border-[rgba(124,58,237,0.2)] rounded-xl text-xs md:text-sm font-medium text-gray-300 hover:text-white hover:bg-indigo-500/10 hover:border-indigo-500/40 transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" /> Add Slide
              </button>
              <button 
                onClick={handleDuplicateSlide}
                className="flex items-center px-3 py-2 md:px-4 md:py-2.5 bg-[#1A1830] border border-[rgba(124,58,237,0.2)] rounded-xl text-xs md:text-sm font-medium text-gray-300 hover:text-white hover:bg-indigo-500/10 hover:border-indigo-500/40 transition-all shadow-sm"
              >
                <Copy className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" /> Duplicate
              </button>
              <button 
                onClick={() => {
                  if (!presentation || presentation.slides.length <= 1) return;
                  if (confirm('Are you sure you want to delete this slide?')) {
                    const updatedPresentation = { ...presentation };
                    updatedPresentation.slides = presentation.slides.filter((_, i) => i !== currentSlide);
                    
                    const allPresentations = getPresentations();
                    const index = allPresentations.findIndex(p => p.id === presentation.id);
                    if (index !== -1) {
                      allPresentations[index] = updatedPresentation;
                      setPresentations(allPresentations);
                    }
                    
                    setPresentation(updatedPresentation);
                    if (currentSlide >= updatedPresentation.slides.length) {
                      setCurrentSlide(updatedPresentation.slides.length - 1);
                    }
                  }
                }}
                className="flex items-center px-3 py-2 md:px-4 md:py-2.5 bg-[#1A1830] border border-[rgba(124,58,237,0.2)] rounded-xl text-xs md:text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 hover:border-red-500/40 transition-all shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" /> Delete
              </button>
              <button 
                onClick={() => {
                  if (presentation) {
                    const allPresentations = getPresentations();
                    const index = allPresentations.findIndex(p => p.id === presentation.id);
                    if (index !== -1) {
                      allPresentations[index] = presentation;
                      setPresentations(allPresentations);
                      alert('Presentation saved!');
                    }
                  }
                }}
                className="flex items-center px-3 py-2 md:px-4 md:py-2.5 bg-[#1A1830] border border-[rgba(124,58,237,0.2)] rounded-xl text-xs md:text-sm font-medium text-gray-300 hover:text-white hover:bg-indigo-500/10 hover:border-indigo-500/40 transition-all shadow-sm"
              >
                <Save className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" /> Save
              </button>
              <button 
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: presentation.title,
                      text: 'Check out this presentation generated by CramLab!',
                      url: window.location.href,
                    }).catch(console.error);
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    alert('Link copied to clipboard!');
                  }
                }}
                className="flex items-center px-3 py-2 md:px-4 md:py-2.5 bg-[#1A1830] border border-[rgba(124,58,237,0.2)] rounded-xl text-xs md:text-sm font-medium text-gray-300 hover:text-white hover:bg-indigo-500/10 hover:border-indigo-500/40 transition-all shadow-sm"
              >
                <Share2 className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" /> Share
              </button>
              <button 
                onClick={() => generateSlideImage(currentSlide)}
                disabled={generatingImages[currentSlide]}
                className="flex items-center px-3 py-2 md:px-4 md:py-2.5 bg-indigo-600/10 border border-indigo-500/30 rounded-xl text-xs md:text-sm font-medium text-indigo-400 hover:bg-indigo-600/20 hover:border-indigo-500/50 transition-all disabled:opacity-50 shadow-sm"
              >
                {generatingImages[currentSlide] ? (
                  <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
                )}
                Generate Visual
              </button>
              <button 
                onClick={() => setIsPresenting(true)}
                className="flex items-center px-3 py-2 md:px-4 md:py-2.5 bg-indigo-600 rounded-xl text-xs md:text-sm font-bold text-white hover:bg-indigo-500 transition-all shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5"
              >
                <Play className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" /> Present
              </button>
              <button 
                onClick={exportToPDF}
                className="flex items-center px-3 py-2 md:px-4 md:py-2.5 bg-indigo-600 rounded-xl text-xs md:text-sm font-bold text-white hover:bg-indigo-500 transition-all shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5"
              >
                <Download className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" /> Export PDF
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
              <div 
                onClick={() => setIsPresenting(true)}
                className="aspect-video bg-[#1A1830] rounded-3xl border border-[rgba(124,58,237,0.2)] overflow-hidden relative group shadow-2xl cursor-pointer"
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSlide}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
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
                        
                        {isAddingBullet ? (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center mt-6"
                          >
                            <input 
                              type="text" 
                              value={newBulletText} 
                              onChange={e => setNewBulletText(e.target.value)}
                              className="flex-1 bg-[#0F0E17] border border-indigo-500/50 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-indigo-400"
                              placeholder="Enter new bullet point..."
                              autoFocus
                              onKeyDown={e => { 
                                if (e.key === 'Enter') handleAddBullet(); 
                                if (e.key === 'Escape') setIsAddingBullet(false); 
                              }}
                            />
                            <button onClick={handleAddBullet} className="ml-2 p-2 bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors">
                              <CheckCircle2 className="w-5 h-5 text-white" />
                            </button>
                            <button onClick={() => setIsAddingBullet(false)} className="ml-2 p-2 bg-red-500/10 rounded-xl hover:bg-red-500/20 transition-colors">
                              <X className="w-5 h-5 text-red-400" />
                            </button>
                          </motion.div>
                        ) : (
                          <button 
                            onClick={() => setIsAddingBullet(true)} 
                            className="mt-6 flex items-center text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                          >
                            <Plus className="w-4 h-4 mr-1" /> Add bullet point
                          </button>
                        )}
                      </div>
                      
                      <div className="w-full md:w-1/2 aspect-video md:aspect-auto bg-[#0F0E17] rounded-2xl border border-[rgba(124,58,237,0.1)] overflow-hidden relative">
                        {presentation.slides[currentSlide].imageUrl ? (
                          <div className="relative w-full h-full group/img">
                            <img 
                              src={presentation.slides[currentSlide].imageUrl} 
                              alt="Slide visual" 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                              <button 
                                onClick={() => generateSlideImage(currentSlide)}
                                disabled={generatingImages[currentSlide]}
                                className="flex items-center px-4 py-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-xl text-xs font-bold text-white hover:bg-white/30 transition-colors"
                              >
                                {generatingImages[currentSlide] ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-4 h-4 mr-2" />
                                )}
                                Regenerate Visual
                              </button>
                            </div>
                          </div>
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

        {/* Add Slide Modal */}
        <AnimatePresence>
          {showAddSlideModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#0F0E17] border border-[rgba(124,58,237,0.3)] rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl"
              >
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                  <Plus className="w-6 h-6 mr-2 text-indigo-400" />
                  Add New Slide
                </h3>
                
                <div className="space-y-4 mb-8">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Slide Title</label>
                    <input 
                      type="text" 
                      value={newSlideTitle}
                      onChange={e => setNewSlideTitle(e.target.value)}
                      placeholder="e.g., Key Takeaways"
                      className="w-full bg-[#1A1830] border border-[rgba(124,58,237,0.2)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Content (One point per line)</label>
                    <textarea 
                      value={newSlideContent}
                      onChange={e => setNewSlideContent(e.target.value)}
                      placeholder="Point 1&#10;Point 2&#10;Point 3"
                      rows={5}
                      className="w-full bg-[#1A1830] border border-[rgba(124,58,237,0.2)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-4">
                  <button 
                    onClick={() => setShowAddSlideModal(false)}
                    className="px-6 py-3 rounded-xl font-bold text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAddSlide}
                    disabled={!newSlideTitle.trim()}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
                  >
                    Add Slide
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Full Screen Present Mode */}
        <AnimatePresence>
          {isPresenting && presentation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-[#0F0E17] flex flex-col"
            >
              {/* Presenter Header */}
              <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10 bg-gradient-to-b from-black/60 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300">
                <div className="flex items-center">
                  <PresentationIcon className="w-6 h-6 mr-3 text-indigo-400" />
                  <h2 className="text-xl font-bold text-white">{presentation.title}</h2>
                </div>
                <button 
                  onClick={() => setIsPresenting(false)}
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Slide Content */}
              <div className="flex-1 flex items-center justify-center p-4 md:p-8 lg:p-12 overflow-hidden relative group">
                {/* Side Navigation Buttons (Desktop) */}
                <div className="hidden md:flex absolute inset-y-0 left-4 items-center z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={prevSlide}
                    disabled={currentSlide === 0}
                    className="p-4 bg-white/10 hover:bg-indigo-600 rounded-full text-white backdrop-blur-md border border-white/10 transition-all disabled:opacity-0"
                  >
                    <ChevronLeft className="w-8 h-8" />
                  </button>
                </div>
                <div className="hidden md:flex absolute inset-y-0 right-4 items-center z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={nextSlide}
                    disabled={currentSlide === presentation.slides.length - 1}
                    className="p-4 bg-white/10 hover:bg-indigo-600 rounded-full text-white backdrop-blur-md border border-white/10 transition-all disabled:opacity-0"
                  >
                    <ChevronRight className="w-8 h-8" />
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSlide}
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="w-full h-full max-w-7xl max-h-full bg-[#1A1830] rounded-2xl md:rounded-[2rem] border border-white/5 shadow-2xl overflow-hidden flex flex-col md:flex-row aspect-video"
                  >
                    <div className="flex-1 p-6 md:p-12 lg:p-16 flex flex-col justify-center overflow-y-auto custom-scrollbar">
                      <motion.h3 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-2xl md:text-4xl lg:text-6xl font-black text-white mb-6 md:mb-10 leading-tight"
                      >
                        {presentation.slides[currentSlide].title}
                      </motion.h3>
                      <ul className="space-y-3 md:space-y-5">
                        {presentation.slides[currentSlide].content.map((point, i) => (
                          <motion.li 
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 + i * 0.1 }}
                            className="flex items-start text-base md:text-xl lg:text-2xl text-gray-300 font-medium"
                          >
                            <span className="w-2 h-2 md:w-3 md:h-3 bg-indigo-500 rounded-full mt-2 md:mt-3 mr-4 md:mr-6 flex-shrink-0 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                            {point}
                          </motion.li>
                        ))}
                      </ul>
                    </div>

                    {presentation.slides[currentSlide].imageUrl && (
                      <div className="w-full md:w-1/2 h-48 md:h-auto relative bg-black/20">
                        <img 
                          src={presentation.slides[currentSlide].imageUrl} 
                          alt="Slide visual" 
                          className="w-full h-full object-cover md:object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-[#1A1830] via-transparent to-transparent hidden md:block" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#1A1830] via-transparent to-transparent md:hidden" />
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Presenter Footer */}
              <div className="p-4 md:p-8 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-0 bg-gradient-to-t from-black/40 to-transparent">
                <div className="flex gap-3 md:gap-4 order-2 md:order-1">
                  <button 
                    onClick={prevSlide}
                    disabled={currentSlide === 0}
                    className="p-3 md:p-4 bg-white/5 hover:bg-white/10 rounded-xl md:rounded-2xl text-white transition-colors disabled:opacity-20"
                  >
                    <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                  </button>
                  <button 
                    onClick={nextSlide}
                    disabled={currentSlide === presentation.slides.length - 1}
                    className="p-3 md:p-4 bg-white/5 hover:bg-white/10 rounded-xl md:rounded-2xl text-white transition-colors disabled:opacity-20"
                  >
                    <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
                  </button>
                </div>
                
                <div className="flex items-center gap-4 md:gap-6 order-1 md:order-2 w-full md:w-auto">
                  <div className="h-1.5 flex-1 md:w-96 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-indigo-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${((currentSlide + 1) / presentation.slides.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-white font-bold text-base md:text-lg tabular-nums whitespace-nowrap">
                    {currentSlide + 1} <span className="text-white/40 mx-1">/</span> {presentation.slides.length}
                  </span>
                </div>

                <div className="hidden lg:block order-3 text-white/40 text-[10px] font-medium tracking-widest uppercase">
                  CramLab Presentation Mode
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
