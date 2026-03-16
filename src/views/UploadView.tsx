import React, { useState } from 'react';
import { ViewName } from '../App';
import Layout from '../components/Layout';
import { getCurrentUser, getUploads, setUploads, setCurrentUser, Upload, addUsage, User, setCurrentDocumentId } from '../store';
import { motion, AnimatePresence } from 'motion/react';
import { FileUp, Link as LinkIcon, Type, CheckCircle2, Loader2, UploadCloud, Layers, FileText, Lock, Sparkles, X, Eye, Search } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import Button from '../components/Button';

interface Props {
  navigate: (view: ViewName) => void;
  user: User | null;
}

export default function UploadView({ navigate, user }: Props) {
  const [activeTab, setActiveTab] = useState<'file' | 'url' | 'text'>('file');
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [urlContent, setUrlContent] = useState('');

  const validateUrl = (value: string) => {
    if (value && !/^https?:\/\/[^\s$.?#].[^\s]*$/.test(value)) {
      setUrlError('Invalid URL format');
    } else {
      setUrlError('');
    }
  };
  const [fetchError, setFetchError] = useState('');
  const [fetchSuccess, setFetchSuccess] = useState('');
  const [text, setText] = useState('');
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewTextContent, setPreviewTextContent] = useState<string>('');
  const [previewSearchQuery, setPreviewSearchQuery] = useState('');

  const [toggles, setToggles] = useState({
    flashcards: true,
    notes: true,
    quiz: false
  });

  const isReady = (activeTab === 'file' && selectedFiles.length > 0) || (activeTab === 'url' && !!urlContent) || (activeTab === 'text' && !!text);
  const showGenerationOptions = isReady;

  if (!user) return null;

  const isFree = user.plan === 'free';
  const uploadsUsed = user.uploadsUsed || 0;
  const uploadLimit = 3;
  const remainingUploads = uploadLimit - uploadsUsed;
  const atLimit = isFree && uploadsUsed >= uploadLimit;

  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');

  const validateAndAddFiles = (newFiles: FileList | File[]) => {
    const validFiles: File[] = [];
    let errorMessage = '';

    Array.from(newFiles).forEach(selectedFile => {
      // Check file size
      if (selectedFile.size > 2 * 1024 * 1024) {
        errorMessage = 'Some files were too large (Max 2MB).';
        return;
      }

      // Check file type
      const validTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'image/png',
        'image/jpeg'
      ];
      
      const fileExtension = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
      const validExtensions = ['.pdf', '.docx', '.txt', '.png', '.jpg', '.jpeg'];

      if (!validTypes.includes(selectedFile.type) && !validExtensions.includes(fileExtension)) {
        errorMessage = 'Some files had invalid types.';
        return;
      }

      validFiles.push(selectedFile);
    });

    if (errorMessage) setError(errorMessage);
    else setError('');

    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      validateAndAddFiles(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handlePreview = (file: File) => {
    setPreviewFile(file);
    setPreviewSearchQuery('');
    if (file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (e) => setPreviewTextContent(e.target?.result as string || '');
      reader.readAsText(file);
    } else {
      setPreviewTextContent('');
    }
  };

  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  const renderHighlightedText = (text: string, query: string) => {
    if (!query) return text;
    const escapedQuery = escapeRegExp(query);
    const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-indigo-500/50 text-white rounded px-1">{part}</mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const handleFetchUrl = async () => {
    if (!url) return;
    setLoading(true);
    setFetchError('');
    setFetchSuccess('');
    
    try {
      const response = await fetch('/api/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch URL content');
      }
      
      const data = await response.json();
      setUrlContent(data.content);
      setFetchSuccess('Content fetched successfully!');
    } catch (err) {
      setFetchError('Invalid URL or failed to fetch content.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (atLimit) return;
    if (activeTab === 'file' && selectedFiles.length === 0) return;
    if (activeTab === 'url' && !urlContent) return;
    if (activeTab === 'text' && !text) return;

    // Check limit for multiple files
    if (isFree && uploadsUsed + (activeTab === 'file' ? selectedFiles.length : 1) > uploadLimit) {
      setError(`You can only upload ${remainingUploads} more file(s) this month.`);
      return;
    }

    setLoading(true);
    setShowLoadingOverlay(true);
    setUploadProgress(0);
    setUploadStatusText('Initializing...');
    setError('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const currentUploads = getUploads();
      let lastUploadedId: number | null = null;
      let newUploadsCount = 0;

      const processContent = async (content: string, filename: string, type: string) => {
        const newUpload: Upload = {
          id: Date.now() + Math.random(),
          userId: user.id,
          filename,
          type,
          date: new Date().toISOString(),
          content
        };

        // Generate thumbnail
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
              parts: [
                {
                  text: `A professional thumbnail representing a ${type} document titled ${filename}`,
                },
              ],
            },
          });
          
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
              const base64EncodeString = part.inlineData.data;
              newUpload.thumbnail = `data:image/jpeg;base64,${base64EncodeString}`;
              break;
            }
          }
        } catch (err) {
          console.error('Failed to generate thumbnail', err);
        }

        return newUpload;
      };

      const newUploadObjects: Upload[] = [];

      if (activeTab === 'file') {
        const totalFiles = selectedFiles.length;
        for (let i = 0; i < totalFiles; i++) {
          const file = selectedFiles[i];
          setUploadStatusText(`Reading ${file.name}...`);
          
          const fileContent = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onprogress = (e) => {
              if (e.lengthComputable) {
                const fileProgress = e.loaded / e.total;
                const overallProgress = Math.round(((i + (fileProgress * 0.5)) / totalFiles) * 100);
                setUploadProgress(overallProgress);
              }
            };
            reader.onload = (e) => resolve(e.target?.result as string || '');
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(file);
          });
          
          setUploadStatusText(`Processing ${file.name}...`);
          const obj = await processContent(fileContent, file.name, 'file');
          
          setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
          
          newUploadObjects.push(obj);
          newUploadsCount++;
        }
      } else if (activeTab === 'text') {
        setUploadStatusText('Processing text...');
        setUploadProgress(50);
        const obj = await processContent(text, 'Pasted Text', 'text');
        setUploadProgress(100);
        newUploadObjects.push(obj);
        newUploadsCount++;
      } else if (activeTab === 'url') {
        setUploadStatusText('Processing URL...');
        setUploadProgress(50);
        const obj = await processContent(urlContent, url, 'url');
        setUploadProgress(100);
        newUploadObjects.push(obj);
        newUploadsCount++;
      }

      setUploads([...newUploadObjects, ...currentUploads]);
      addUsage('doc');
      lastUploadedId = newUploadObjects[0].id;

      const updatedUser = { ...user, uploadsUsed: uploadsUsed + newUploadsCount };
      setCurrentUser(updatedUser);
      
      const users = JSON.parse(localStorage.getItem('sf_users') || '[]');
      const userIndex = users.findIndex((u: any) => u && u.id === user.id);
      if (userIndex > -1) {
        users[userIndex] = updatedUser;
        localStorage.setItem('sf_users', JSON.stringify(users));
      }

      if (lastUploadedId) {
        setCurrentDocumentId(lastUploadedId);
      }

      await new Promise(resolve => setTimeout(resolve, 1500));

      setLoading(false);
      setShowLoadingOverlay(false);
      
      if (toggles.notes) {
        navigate('notes');
      } else {
        navigate('flashcards');
      }
    } catch (error: any) {
      console.error('Error processing upload:', error);
      setLoading(false);
      setShowLoadingOverlay(false);
      if (error?.message?.includes('429') || error?.status === 429 || error?.message?.includes('exceeded your current quota')) {
        setError('You have exceeded your Gemini API quota. Please check your plan and billing details at https://ai.google.dev/gemini-api/docs/rate-limits.');
      } else {
        setError('Failed to process the input. Please try again.');
      }
    }
  };

  return (
    <Layout navigate={navigate} activeView="upload">
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Upload Study Material</h1>
        <p className="text-gray-400 mb-8 text-sm md:text-base">Upload any document and let AI generate your study tools instantly</p>

        {/* Limit Bar */}
        {isFree && (
          <div className="bg-[#1A1830] border border-[rgba(124,58,237,0.2)] rounded-xl p-4 mb-8">
            <div className="flex justify-between text-xs md:text-sm mb-2">
              <span className="text-gray-400">Free Plan: <strong className="text-amber-400">{uploadsUsed} of {uploadLimit}</strong> uploads used this month</span>
            </div>
            <div className="w-full bg-[#0F0E17] rounded-full h-2">
              <div 
                className="bg-gradient-gold h-2 rounded-full transition-all duration-500" 
                style={{ width: `${(uploadsUsed / uploadLimit) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 bg-[#1A1830] p-1 rounded-xl w-full sm:w-fit border border-[rgba(124,58,237,0.2)]">
          <Button 
            onClick={() => setActiveTab('file')}
            variant={activeTab === 'file' ? 'primary' : 'ghost'}
            className="flex-1 sm:flex-none"
          >
            <FileUp className="w-4 h-4 mr-2" /> File
          </Button>
          <Button 
            onClick={() => setActiveTab('url')}
            variant={activeTab === 'url' ? 'primary' : 'ghost'}
            className="flex-1 sm:flex-none"
          >
            <LinkIcon className="w-4 h-4 mr-2" /> URL
          </Button>
          <Button 
            onClick={() => setActiveTab('text')}
            variant={activeTab === 'text' ? 'primary' : 'ghost'}
            className="flex-1 sm:flex-none"
          >
            <Type className="w-4 h-4 mr-2" /> Text
          </Button>
        </div>

        {/* Upload Area */}
        <div className="glass-card rounded-2xl p-8 mb-8 relative overflow-hidden">
          {atLimit && (
            <div className="absolute inset-0 z-10 backdrop-blur-sm bg-[#0F0E17]/80 flex flex-col items-center justify-center">
              <Lock className="w-12 h-12 text-amber-400 mb-4" />
              <h3 className="text-xl font-bold mb-2">Upload Limit Reached</h3>
              <p className="text-gray-400 mb-4">Upgrade to Pro for unlimited uploads.</p>
              <Button onClick={() => navigate('pricing')} variant="primary" className="bg-gradient-gold hover-glow">
                Upgrade Plan &rarr;
              </Button>
            </div>
          )}

          {activeTab === 'file' && (
            <div 
              className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center transition-all duration-300 cursor-pointer relative ${
                isDragging 
                  ? 'border-4 border-indigo-500 bg-indigo-500/20 scale-[1.02] shadow-xl shadow-indigo-500/20' 
                  : 'border-[rgba(124,58,237,0.4)] hover:bg-[#211F35]'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input 
                type="file" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileChange}
                accept=".pdf,.docx,.txt,.png,.jpg"
                multiple
              />
              <UploadCloud className={`w-16 h-16 mb-4 transition-all duration-300 ${isDragging ? 'text-indigo-200 scale-110' : 'text-indigo-400'}`} />
              <h3 className="text-lg font-bold mb-2">
                {isDragging ? 'Drop your files here' : 'Drag & Drop your files here'}
              </h3>
              <p className="text-gray-400 text-sm mb-6">or click to browse from your computer (Max 2MB per file)</p>
              
              {error && <p className="text-red-400 text-sm mb-4 font-medium bg-red-500/10 px-4 py-2 rounded-lg">{error}</p>}
              {selectedFiles.length > 0 && !error && <p className="text-emerald-400 text-sm mb-4 font-medium bg-emerald-500/10 px-4 py-2 rounded-lg">{selectedFiles.length} file(s) ready!</p>}
              
              {selectedFiles.length > 0 ? (
                <div className="space-y-2 w-full max-w-md">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="bg-[#1A1830] border border-indigo-500/30 px-4 py-3 rounded-xl flex items-center justify-between group/item">
                      <div className="flex items-center min-w-0">
                        <CheckCircle2 className="w-4 h-4 mr-3 text-emerald-400 flex-shrink-0" />
                        <span className="font-semibold text-white truncate text-sm" title={file.name}>{file.name}</span>
                        <span className="ml-3 text-[10px] text-gray-500 bg-[#0F0E17] px-2 py-0.5 rounded border border-[rgba(124,58,237,0.2)] uppercase">
                          {file.name.split('.').pop()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          onClick={(e) => { e.stopPropagation(); handlePreview(file); }}
                          variant="ghost"
                          size="sm"
                          className="p-1.5 text-gray-500 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-colors"
                          title="Preview File"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                          variant="ghost"
                          size="sm"
                          className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                          title="Remove File"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 text-center">
                    <span className="text-xs text-indigo-400 font-medium hover:text-indigo-300 transition-colors">
                      + Add more files
                    </span>
                  </div>
                </div>
              ) : (
                <div className={`border px-6 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                  isDragging ? 'bg-indigo-500 border-indigo-400' : 'bg-[#1A1830] border-[rgba(124,58,237,0.2)]'
                }`}>
                  Browse Files
                </div>
              )}
              
              <div className="flex gap-2 mt-6">
                <span className="text-xs font-mono bg-[#0F0E17] text-gray-500 px-2 py-1 rounded">PDF</span>
                <span className="text-xs font-mono bg-[#0F0E17] text-gray-500 px-2 py-1 rounded">DOCX</span>
                <span className="text-xs font-mono bg-[#0F0E17] text-gray-500 px-2 py-1 rounded">TXT</span>
                <span className="text-xs font-mono bg-[#0F0E17] text-gray-500 px-2 py-1 rounded">PNG</span>
                <span className="text-xs font-mono bg-[#0F0E17] text-gray-500 px-2 py-1 rounded">JPG</span>
              </div>
            </div>
          )}

          {activeTab === 'url' && (
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-400 mb-2">Paste URL</label>
              <div className="flex gap-2">
                <input 
                  type="url" 
                  value={url}
                  onChange={e => { setUrl(e.target.value); validateUrl(e.target.value); }}
                  placeholder="https://..."
                  className={`flex-1 bg-[#0F0E17] border ${urlError ? 'border-red-500' : 'border-[rgba(124,58,237,0.2)]'} rounded-xl px-4 py-4 text-white focus:outline-none focus:border-indigo-500 transition-colors`}
                />
                {urlError && <p className="text-red-400 text-xs mt-1">{urlError}</p>}
                <Button 
                  onClick={handleFetchUrl}
                  disabled={loading || !url}
                  variant="primary"
                  className="px-6 py-4"
                >
                  {loading ? 'Fetching...' : 'Fetch'}
                </Button>
              </div>
              {fetchError && <p className="text-red-400 text-sm mt-2">{fetchError}</p>}
              {fetchSuccess && <p className="text-emerald-400 text-sm mt-2">{fetchSuccess}</p>}
            </div>
          )}

          {activeTab === 'text' && (
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-400 mb-2">Paste Study Material Text</label>
              <textarea 
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Paste your notes, article, or textbook excerpt here..."
                rows={8}
                className="w-full bg-[#0F0E17] border border-[rgba(124,58,237,0.2)] rounded-xl px-4 py-4 text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none"
              ></textarea>
            </div>
          )}
        </div>

        {/* Generation Options */}
        {showGenerationOptions && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-6 mb-8"
          >
            <h3 className="text-lg font-bold mb-4">Generation Options</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Flashcard Difficulty</label>
                <select 
                  value={user.settings?.flashcardDifficulty || 'medium'}
                  onChange={(e) => {
                    const newSettings = { ...user.settings, flashcardDifficulty: e.target.value as any };
                    setCurrentUser({ ...user, settings: newSettings });
                  }}
                  className="w-full bg-[#0F0E17] border border-[rgba(124,58,237,0.2)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Note Style</label>
                <select 
                  value={user.settings?.noteStyle || 'detailed'}
                  onChange={(e) => {
                    const newSettings = { ...user.settings, noteStyle: e.target.value as any };
                    setCurrentUser({ ...user, settings: newSettings });
                  }}
                  className="w-full bg-[#0F0E17] border border-[rgba(124,58,237,0.2)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="concise">Concise</option>
                  <option value="detailed">Detailed</option>
                  <option value="bulleted">Bulleted</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Language</label>
                <select 
                  value={user.settings?.language || 'English'}
                  onChange={(e) => {
                    const newSettings = { ...user.settings, language: e.target.value };
                    setCurrentUser({ ...user, settings: newSettings as any });
                  }}
                  className="w-full bg-[#0F0E17] border border-[rgba(124,58,237,0.2)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="German">German</option>
                  <option value="Chinese">Chinese</option>
                  <option value="Japanese">Japanese</option>
                  <option value="Korean">Korean</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Tone</label>
                <select 
                  value={user.settings?.tone || 'Academic'}
                  onChange={(e) => {
                    const newSettings = { ...user.settings, tone: e.target.value };
                    setCurrentUser({ ...user, settings: newSettings as any });
                  }}
                  className="w-full bg-[#0F0E17] border border-[rgba(124,58,237,0.2)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="Academic">Academic</option>
                  <option value="Casual">Casual</option>
                  <option value="Humorous">Humorous</option>
                  <option value="Encouraging">Encouraging</option>
                  <option value="Socratic">Socratic</option>
                </select>
              </div>
            </div>

            <h3 className="text-lg font-bold mb-4">Generate Study Materials</h3>
            <div className="space-y-4">
              {Object.entries(toggles).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <div className="flex items-center text-gray-300 capitalize">
                    {key === 'flashcards' && <Layers className="w-4 h-4 mr-3 text-indigo-400" />}
                    {key === 'notes' && <FileText className="w-4 h-4 mr-3 text-purple-400" />}
                    {key === 'quiz' && <span className="w-4 h-4 mr-3 text-emerald-400 font-bold">?</span>}
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                  <Button 
                    onClick={() => setToggles(prev => ({ ...prev, [key]: !prev[key as keyof typeof toggles] }))}
                    variant="ghost"
                    className={`w-12 h-6 rounded-full relative transition-colors p-0 ${value ? 'bg-indigo-500' : 'bg-[#0F0E17] border border-[rgba(124,58,237,0.2)]'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${value ? 'translate-x-7' : 'translate-x-1'}`}></div>
                  </Button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <Button 
          onClick={handleUpload}
          disabled={loading || atLimit || !isReady}
          variant="primary"
          size="lg"
          className={`w-full bg-gradient-gold text-white rounded-xl px-4 py-4 font-bold text-lg flex justify-center items-center transition-all ${loading || atLimit || !isReady ? 'opacity-50 cursor-not-allowed' : 'hover-glow'}`}
        >
          {loading ? (
            <><Loader2 className="w-6 h-6 mr-2 animate-spin" /> Generating Magic...</>
          ) : (
            <>⚡ Generate Study Materials</>
          )}
        </Button>
      </div>

      {/* Loading Overlay */}
      <AnimatePresence>
        {showLoadingOverlay && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F0E17]/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#211F35] border border-[rgba(124,58,237,0.3)] p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4"
            >
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-indigo-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
                <div className="relative bg-[#0F0E17] p-4 rounded-full border border-indigo-500/50">
                  <Sparkles className="w-10 h-10 text-indigo-400 animate-pulse" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2 text-center">Generating Magic...</h3>
              <p className="text-gray-400 text-center text-sm mb-6">
                Analyzing your content and creating personalized study materials.
              </p>
              
              <div className="w-full bg-[#0F0E17] rounded-full h-2 mb-2 overflow-hidden">
                <motion.div 
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <div className="flex justify-between w-full text-xs text-gray-400 mt-1">
                <span className="truncate pr-2">{uploadStatusText}</span>
                <span>{uploadProgress}%</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0F0E17] border border-[rgba(124,58,237,0.3)] rounded-3xl p-6 w-full max-w-4xl shadow-2xl flex flex-col h-[80vh]"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white flex items-center truncate pr-4">
                  <Eye className="w-5 h-5 mr-2 text-indigo-400" />
                  Preview: {previewFile.name}
                </h3>
                {previewFile.type === 'text/plain' && (
                  <div className="relative flex-1 max-w-md mx-4">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Search in document..." 
                      value={previewSearchQuery}
                      onChange={(e) => setPreviewSearchQuery(e.target.value)}
                      className="w-full bg-[#1A1830] border border-[rgba(124,58,237,0.2)] rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                )}
                <Button 
                  onClick={() => { setPreviewFile(null); setPreviewSearchQuery(''); }}
                  variant="ghost"
                  size="sm"
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="flex-1 overflow-hidden bg-[#1A1830] rounded-xl border border-[rgba(124,58,237,0.2)] relative flex items-center justify-center">
                {previewFile.type === 'application/pdf' ? (
                  <iframe 
                    src={URL.createObjectURL(previewFile)} 
                    className="w-full h-full"
                    title="PDF Preview"
                  />
                ) : previewFile.type.startsWith('image/') ? (
                  <img 
                    src={URL.createObjectURL(previewFile)} 
                    alt="Preview" 
                    className="max-w-full max-h-full object-contain p-4"
                  />
                ) : previewFile.type === 'text/plain' ? (
                  <div className="w-full h-full overflow-auto p-6 text-gray-300 text-sm font-mono whitespace-pre-wrap text-left custom-scrollbar">
                    {previewTextContent ? renderHighlightedText(previewTextContent, previewSearchQuery) : 'Loading...'}
                  </div>
                ) : (
                  <div className="text-center p-8">
                    <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">Preview is not available for this file type.</p>
                    <p className="text-sm text-gray-500 mt-2">The file will still be processed correctly.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
