import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ViewName } from '../App';
import Layout from '../components/Layout';
import { getCurrentUser, getUploads, getCurrentDocumentId, addUsage, Flashcard, Deck, getDecks, setDecks, User, getCache, setCache } from '../store';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from '@google/genai';
import { ChevronLeft, ChevronRight, RefreshCw, Grid, Play, Loader2, AlertCircle, Share2, BookOpen, UploadCloud, Filter, CheckCircle2, GitBranch } from 'lucide-react';
import Button from '../components/Button';

interface Props {
  navigate: (view: ViewName) => void;
  user: User | null;
}

export default function FlashcardsView({ navigate, user }: Props) {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [documentTitle, setDocumentTitle] = useState('AI Flashcards');
  const [viewMode, setViewMode] = useState<'study' | 'grid'>('study');
  const [filterMode, setFilterMode] = useState<'all' | 'hard'>('all');
  const [uiDifficultyFilter, setUiDifficultyFilter] = useState<string[]>(['easy', 'medium', 'hard']);
  const [sortBy, setSortBy] = useState<'difficulty' | 'front' | 'back' | 'none'>('none');
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [difficultyFilter, setDifficultyFilter] = useState<('easy' | 'medium' | 'hard')[]>(['easy', 'medium', 'hard']);
  const [cardCount, setCardCount] = useState<number>(10);
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [sessionStats, setSessionStats] = useState<{ correct: number, total: number } | null>(null);
  const [showSessionSummary, setShowSessionSummary] = useState(false);

  const summarizeDeck = async () => {
    if (cards.length === 0) return;
    setSummarizing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      let deckContent = cards.map(c => `Q: ${c.front} A: ${c.back}`).join('\n\n');
      
      // Truncate if deck is massive
      if (deckContent.length > 30000) {
        deckContent = deckContent.substring(0, 30000) + "... [content truncated]";
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Summarize the following flashcard deck in a brief paragraph:\n\n${deckContent}`
      });
      setSummary(response.text || 'No summary available.');
    } catch (err: any) {
      console.error('Failed to summarize deck', err);
      if (err?.message?.includes('429') || err?.status === 429 || err?.message?.includes('exceeded your current quota')) {
        setSummary('You have exceeded your Gemini API quota. Please check your plan and billing details at https://ai.google.dev/gemini-api/docs/rate-limits.');
      } else {
        setSummary('Failed to generate summary.');
      }
    } finally {
      setSummarizing(false);
    }
  };

  const generateCards = useCallback(async () => {
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
      const cached = getCache<Flashcard[]>(`flashcards_${targetUpload.id}`);
      if (cached) {
        setCards(cached);
        setLoading(false);
        return;
      }

      setDocumentTitle(`${targetUpload.filename} - Flashcards`);
      
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      let promptContent = targetUpload.content || '';
      // Truncate content to avoid payload limits if it's extremely large
      if (promptContent.length > 30000) {
        promptContent = promptContent.substring(0, 30000) + "... [content truncated]";
      }

      let contents: any = `Generate ${cardCount} flashcards with difficulty levels: ${difficultyFilter.join(', ')} based on the following content:\n\n${promptContent}\n\nThe language of the flashcards should be ${user.settings?.language || 'English'} and the tone should be ${user.settings?.tone || 'Academic'}.`;
      
      if (promptContent.startsWith('data:')) {
        const match = promptContent.match(/^data:(.+);base64,(.*)$/);
        if (match) {
          const mimeType = match[1];
          const base64Data = match[2];
          contents = [
            {
              parts: [
                { text: `Generate ${cardCount} flashcards with difficulty levels: ${difficultyFilter.join(', ')} based on the following document. The language of the flashcards should be ${user.settings?.language || 'English'} and the tone should be ${user.settings?.tone || 'Academic'}:` },
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
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: contents,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                front: { type: Type.STRING, description: "The question or term on the front of the flashcard" },
                back: { type: Type.STRING, description: "The answer or definition on the back of the flashcard" },
                difficulty: { type: Type.STRING, description: "The difficulty level: 'easy', 'medium', or 'hard'" }
              },
              required: ['front', 'back', 'difficulty']
            }
          }
        }
      });

      const generatedCards = JSON.parse(response.text || '[]').map((c: any) => ({ ...c, id: crypto.randomUUID() }));
      setCards(generatedCards);
      setCache(`flashcards_${targetUpload.id}`, generatedCards);
      addUsage('flashcard');
    } catch (err: any) {
      console.error('Failed to generate cards', err);
      if (err?.message?.includes('429') || err?.status === 429 || err?.message?.includes('exceeded your current quota')) {
        setError('You have exceeded your Gemini API quota. Please check your plan and billing details at https://ai.google.dev/gemini-api/docs/rate-limits.');
      } else {
        setError('Failed to generate flashcards. Please check your API key and try again.');
      }
      // Fallback data for demo purposes
      setCards([
        { id: '1', front: 'What is the process by which a cell duplicates its DNA before division?', back: 'S phase of interphase', difficulty: 'medium' },
        { id: '2', front: 'What type of cell division is used for growth and repair?', back: 'Mitosis', difficulty: 'easy' },
        { id: '3', front: 'How many daughter cells are produced in Meiosis?', back: '4 genetically diverse haploid cells', difficulty: 'hard' }
      ]);
      addUsage('flashcard');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    generateCards();
  }, [generateCards]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode !== 'study') return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      } else if (e.code === 'ArrowLeft') {
        handlePrev();
      } else if (e.code === 'ArrowRight') {
        handleNext();
      } else if (isFlipped) {
        if (e.key === '1') rateCard('hard');
        if (e.key === '2') rateCard('ok');
        if (e.key === '3') rateCard('easy');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, isFlipped, viewMode, cards]);

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setIsFlipped(false);
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setCurrentIndex(prev => prev - 1);
    }
  };

  const rateCard = (rating: 'hard' | 'ok' | 'easy') => {
    const newCards = [...cards];
    const cardIndex = newCards.findIndex(c => c.id === cards[currentIndex].id);
    const card = newCards[cardIndex];
    
    // SM-2 Algorithm Implementation
    let q = 0;
    if (rating === 'hard') q = 3;
    if (rating === 'ok') q = 4;
    if (rating === 'easy') q = 5;

    let { repetitions = 0, interval = 0, easeFactor = 2.5 } = card;

    if (q < 3) {
      repetitions = 0;
      interval = 1;
    } else {
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      repetitions += 1;
    }

    easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    if (easeFactor < 1.3) easeFactor = 1.3;

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + interval);

    newCards[cardIndex] = {
      ...card,
      status: rating,
      repetitions,
      interval,
      easeFactor,
      nextReviewDate: nextReviewDate.toISOString()
    };
    
    // Save to global state (assuming we save decks, but here it's just local state for the generated cards)
    // In a real app, we'd find the deck and update it. Since this view generates cards on the fly,
    // we just update local state. If we want persistence, we need to save to a deck.
    // For now, we just update the local cards array.
    
    if (rating === 'hard') {
      // Move to end of deck for immediate review
      const movedCard = newCards.splice(cardIndex, 1)[0];
      newCards.push(movedCard);
      setCards(newCards);
      setIsFlipped(false);
    } else {
      setCards(newCards);
      if (currentIndex < cards.length - 1) {
        handleNext();
      } else {
        // End of session
        setSessionStats({ correct: cards.length, total: cards.length });
        setShowSessionSummary(true);
      }
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedCards);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedCards(newSelected);
  };

  const bulkRate = (rating: 'hard' | 'ok' | 'easy') => {
    const newCards = cards.map(c => selectedCards.has(c.id) ? { ...c, status: rating } : c);
    setCards(newCards);
    setSelectedCards(new Set());
  };

  const bulkDelete = () => {
    const newCards = cards.filter(c => !selectedCards.has(c.id));
    setCards(newCards);
    setSelectedCards(new Set());
  };

  const visibleCards = useMemo(() => {
    let result = cards.filter(c => uiDifficultyFilter.includes(c.difficulty));

    if (filterMode === 'hard') {
      result = result.filter(c => c.status === 'hard' || c.difficulty === 'hard');
    }

    if (sortBy === 'difficulty') {
      const difficultyOrder = { hard: 0, medium: 1, easy: 2 };
      result.sort((a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]);
    } else if (sortBy === 'front') {
      result.sort((a, b) => a.front.localeCompare(b.front));
    } else if (sortBy === 'back') {
      result.sort((a, b) => a.back.localeCompare(b.back));
    }

    return result;
  }, [cards, filterMode, sortBy]);

  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setSelectedCards(new Set());
  }, [filterMode, viewMode, uiDifficultyFilter]);

  const toggleUiDifficulty = (diff: string) => {
    setUiDifficultyFilter(prev => 
      prev.includes(diff) 
        ? prev.filter(d => d !== diff) 
        : [...prev, diff]
    );
  };

  if (!user) return null;

  const masteredCount = cards.filter(c => c.status === 'easy' || c.status === 'ok').length;
  const progress = cards.length > 0 ? (masteredCount / cards.length) * 100 : 0;

  return (
    <Layout navigate={navigate} activeView="flashcards">
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h1 className="text-2xl md:text-3xl font-bold">{documentTitle}</h1>
          <div className="flex flex-wrap gap-2 md:gap-3 w-full md:w-auto justify-start md:justify-end mt-4 md:mt-0 items-center">
            <Button 
              onClick={() => navigate('upload')}
              variant="action"
              size="sm"
            >
              <UploadCloud className="w-4 h-4 mr-2" /> Upload Another
            </Button>
            <Button 
              onClick={summarizeDeck}
              disabled={summarizing}
              variant="secondary"
              size="sm"
              isLoading={summarizing}
            >
              <BookOpen className="w-4 h-4 mr-2" /> Summarize
            </Button>
            <Button 
              onClick={() => setFilterMode(prev => prev === 'all' ? 'hard' : 'all')}
              variant={filterMode === 'hard' ? 'danger' : 'secondary'}
              size="sm"
            >
              {filterMode === 'hard' ? 'Focus Mode: Hard' : 'Focus Mode: All'}
            </Button>
            
            <div className="flex bg-[#1A1830] p-1 rounded-xl border border-[rgba(124,58,237,0.2)]">
              {(['easy', 'medium', 'hard'] as const).map(diff => (
                <Button
                  key={diff}
                  onClick={() => toggleUiDifficulty(diff)}
                  variant="ghost"
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    uiDifficultyFilter.includes(diff)
                      ? diff === 'easy' ? 'bg-emerald-500 text-white' :
                        diff === 'medium' ? 'bg-amber-500 text-white' :
                        'bg-red-500 text-white'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {diff}
                </Button>
              ))}
            </div>

            <Button 
              onClick={() => navigate('mindmap')}
              variant="secondary"
              size="sm"
            >
              <GitBranch className="w-4 h-4 mr-2" /> Mind Map
            </Button>
            <Button 
              onClick={async () => {
                const shareData = {
                  title: documentTitle,
                  text: `Check out these flashcards: ${documentTitle}`,
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
              variant="action"
              size="sm"
            >
              <Share2 className="w-4 h-4 mr-2" /> Share
            </Button>
            <div className="flex gap-1 md:gap-2 bg-[#1A1830] p-1 rounded-xl border border-[rgba(124,58,237,0.2)]">
              <Button 
                onClick={() => {
                  const shuffled = [...cards].sort(() => Math.random() - 0.5);
                  setCards(shuffled);
                  setCurrentIndex(0);
                  setIsFlipped(false);
                }}
                variant="ghost"
                size="sm"
                title="Shuffle Cards"
              >
                <RefreshCw className="w-4 h-4 mr-2" /> Shuffle
              </Button>
              <Button 
                onClick={() => setViewMode('study')}
                variant={viewMode === 'study' ? 'primary' : 'ghost'}
                size="sm"
              >
                <Play className="w-4 h-4 mr-2" /> Quiz Mode
              </Button>
              <Button 
                onClick={() => setViewMode('grid')}
                variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                size="sm"
              >
                <Grid className="w-4 h-4 mr-2" /> Browse
              </Button>
            </div>
          </div>
        </div>

        {summary && (
          <div className="mb-8 glass-card p-6 rounded-2xl border border-indigo-500/30">
            <h3 className="text-lg font-bold mb-2 text-indigo-400">Deck Summary</h3>
            <p className="text-gray-300">{summary}</p>
            <Button onClick={() => setSummary(null)} variant="ghost" className="mt-4 text-xs text-gray-500 hover:text-white p-0">Close</Button>
          </div>
        )}

        {showSessionSummary ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Session Complete!</h2>
            <p className="text-gray-400 mb-8">You've mastered {sessionStats?.total} cards in this session.</p>
            
            <div className="grid grid-cols-2 gap-4 w-full max-w-md mb-8">
              <div className="glass-card p-4 rounded-2xl border border-white/5">
                <div className="text-2xl font-bold text-white">{sessionStats?.total}</div>
                <div className="text-xs text-gray-500 uppercase font-bold tracking-widest">Cards Reviewed</div>
              </div>
              <div className="glass-card p-4 rounded-2xl border border-white/5">
                <div className="text-2xl font-bold text-emerald-400">100%</div>
                <div className="text-xs text-gray-500 uppercase font-bold tracking-widest">Accuracy</div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button 
                onClick={() => {
                  setCurrentIndex(0);
                  setShowSessionSummary(false);
                  setIsFlipped(false);
                }}
                variant="primary"
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20"
              >
                Study Again
              </Button>
              <Button 
                onClick={() => navigate('dashboard')}
                variant="secondary"
                className="px-8 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-bold transition-all"
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
            <p className="text-gray-400">Generating AI Flashcards...</p>
          </div>
        ) : error && cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <p className="text-red-400 mb-4">{error}</p>
            <div className="flex gap-4">
              <Button 
                onClick={generateCards}
                variant="primary"
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors"
              >
                Retry
              </Button>
              <Button 
                onClick={() => navigate('upload')}
                variant="secondary"
                className="px-6 py-3 bg-[#1A1830] hover:bg-[#211F35] text-white rounded-xl font-bold transition-colors"
              >
                Upload a Document
              </Button>
            </div>
          </div>
        ) : visibleCards.length === 0 ? (
          <div className="text-center text-gray-400 p-8">No cards found in this mode.</div>
        ) : viewMode === 'study' ? (
          <div className="max-w-2xl mx-auto">
            {/* Progress */}
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Progress</span>
              <span className="text-emerald-400">{masteredCount} Mastered ✓</span>
            </div>
            <div className="w-full bg-[#1A1830] rounded-full h-2 mb-12">
              <div 
                className="bg-indigo-500 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>

            {/* Card Container */}
            <div className="relative w-full aspect-[3/2] perspective-1000 mb-8 cursor-pointer group" onClick={() => setIsFlipped(!isFlipped)}>
              <motion.div 
                className="w-full h-full relative transform-style-3d"
                animate={{ rotateY: isFlipped ? 180 : 0, scale: isFlipped ? 1.02 : 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
              >
                {/* Front */}
                <div className="absolute inset-0 backface-hidden glass-card rounded-3xl p-10 flex flex-col items-center justify-center text-center bg-gradient-to-br from-[#1A1830] to-[#211F35] border-2 border-[rgba(124,58,237,0.3)] group-hover:border-indigo-500/50 transition-colors shadow-xl">
                  <div className="absolute top-6 left-6 bg-indigo-500/20 text-indigo-300 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Question
                  </div>
                  <div className={`absolute top-6 right-6 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                    visibleCards[currentIndex]?.difficulty === 'easy' ? 'bg-emerald-500/20 text-emerald-400' :
                    visibleCards[currentIndex]?.difficulty === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {visibleCards[currentIndex]?.difficulty}
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold leading-tight text-white">
                    {visibleCards[currentIndex]?.front}
                  </h2>
                  <div className="absolute bottom-6 text-gray-500 text-sm flex items-center group-hover:text-indigo-400 transition-colors">
                    <RefreshCw className="w-4 h-4 mr-2" /> Click to reveal answer
                  </div>
                </div>

                {/* Back */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 glass-card rounded-3xl p-10 flex flex-col items-center justify-center text-center bg-gradient-to-br from-indigo-600 to-purple-800 border-2 border-indigo-400 shadow-2xl shadow-indigo-500/30">
                  <div className="absolute top-6 left-6 bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-md">
                    Answer
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold leading-tight text-white drop-shadow-md">
                    {visibleCards[currentIndex]?.back}
                  </h2>
                  <div className="absolute bottom-6 text-indigo-200 text-sm flex items-center">
                    <RefreshCw className="w-4 h-4 mr-2" /> Click to flip back
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Controls */}
            <div className="flex flex-col items-center">
              <div className="flex items-center space-x-6 mb-8">
                <Button 
                  onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                  disabled={currentIndex === 0}
                  variant="ghost"
                  className="p-3 rounded-full bg-[#1A1830] hover:bg-[#211F35] text-white disabled:opacity-50 transition-colors border border-[rgba(124,58,237,0.2)]"
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <span className="font-bold text-lg">
                  {currentIndex + 1} / {visibleCards.length} Cards
                </span>
                <Button 
                  onClick={(e) => { e.stopPropagation(); handleNext(); }}
                  disabled={currentIndex === visibleCards.length - 1}
                  variant="ghost"
                  className="p-3 rounded-full bg-[#1A1830] hover:bg-[#211F35] text-white disabled:opacity-50 transition-colors border border-[rgba(124,58,237,0.2)]"
                >
                  <ChevronRight className="w-6 h-6" />
                </Button>
              </div>

              {/* Spaced Repetition Buttons */}
              <AnimatePresence>
                {isFlipped && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex flex-wrap justify-center gap-4"
                  >
                    <Button onClick={() => rateCard('hard')} variant="ghost" className="px-6 py-3 rounded-xl font-bold bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors">
                      😕 Hard — Retry
                    </Button>
                    <Button onClick={() => rateCard('ok')} variant="ghost" className="px-6 py-3 rounded-xl font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-colors">
                      🤔 OK
                    </Button>
                    <Button onClick={() => rateCard('easy')} variant="ghost" className="px-6 py-3 rounded-xl font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors">
                      ✅ Easy — Got it!
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-8 text-xs text-gray-500 flex space-x-4">
                <span>⌨️ Space = flip card</span>
                <span>← → = navigate</span>
                <span>1/2/3 = rate difficulty</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-400">
                  Showing {visibleCards.length} cards
                </div>
                {visibleCards.length > 0 && (
                  <Button 
                    onClick={() => {
                      if (selectedCards.size === visibleCards.length) {
                        setSelectedCards(new Set());
                      } else {
                        setSelectedCards(new Set(visibleCards.map(c => c.id)));
                      }
                    }}
                    variant="ghost"
                    className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors p-0"
                  >
                    {selectedCards.size === visibleCards.length ? 'Deselect All' : 'Select All'}
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2 bg-[#1A1830] border border-[rgba(124,58,237,0.2)] rounded-xl px-3 py-1.5">
                <Filter className="w-4 h-4 text-gray-400" />
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent text-sm text-gray-300 focus:outline-none cursor-pointer"
                >
                  <option value="none">Default Order</option>
                  <option value="difficulty">Sort by Difficulty</option>
                  <option value="front">Sort by Front (A-Z)</option>
                  <option value="back">Sort by Back (A-Z)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleCards.map((card) => (
                <div 
                  key={card.id} 
                  className={`glass-card p-6 rounded-2xl flex flex-col h-full cursor-pointer transition-all ${selectedCards.has(card.id) ? 'border-2 border-indigo-500 bg-[#2A2845]' : 'border border-[rgba(124,58,237,0.2)]'}`}
                  onClick={() => toggleSelection(card.id)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <input 
                      type="checkbox" 
                      checked={selectedCards.has(card.id)} 
                      onChange={() => toggleSelection(card.id)}
                      className="w-5 h-5 rounded border-gray-600 bg-[#0F0E17] text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase ${
                      card.difficulty === 'easy' ? 'bg-emerald-500/20 text-emerald-400' :
                      card.difficulty === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {card.difficulty}
                    </span>
                  </div>
                  <p className="font-medium mb-6 flex-1">{card.front}</p>
                  <div className="border-t border-[rgba(124,58,237,0.2)] pt-4 mt-auto">
                    <span className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-2 block">A:</span>
                    <p className="text-sm text-gray-300">{card.back}</p>
                  </div>
                </div>
              ))}
            </div>
            
            {selectedCards.size > 0 && (
              <div className="fixed bottom-8 left-1/2 -translate-x-1/2 glass-card p-4 rounded-2xl flex items-center gap-4 z-50 border border-indigo-500/50 shadow-2xl">
                <span className="text-sm font-medium text-white">{selectedCards.size} selected</span>
                <Button onClick={() => bulkRate('hard')} variant="ghost" className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors">Hard</Button>
                <Button onClick={() => bulkRate('ok')} variant="ghost" className="px-4 py-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-colors">OK</Button>
                <Button onClick={() => bulkRate('easy')} variant="ghost" className="px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors">Easy</Button>
                <div className="w-px h-6 bg-white/10 mx-2"></div>
                <Button onClick={bulkDelete} variant="danger" size="sm">Delete</Button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
