import React, { useState, useEffect } from 'react';
import { ViewName } from '../App';
import Layout from '../components/Layout';
import { getCurrentUser, getUploads, getCurrentDocumentId, addUsage, User, Quiz, QuizQuestion, setQuizzes, getQuizzes } from '../store';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from '@google/genai';
import { Loader2, AlertCircle, CheckCircle2, XCircle, ChevronRight, RefreshCw, FileText, Target, Download } from 'lucide-react';
import jsPDF from 'jspdf';

interface Props {
  navigate: (view: ViewName) => void;
  user: User | null;
}

export default function QuizView({ navigate, user }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [isReviewing, setIsReviewing] = useState(false);
  const [documentTitle, setDocumentTitle] = useState('Mock Exam');
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [showConfig, setShowConfig] = useState(true);

  const generateQuiz = async () => {
    if (!user) return;
    
    setLoading(true);
    setError('');
    setShowConfig(false);
    
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

      setDocumentTitle(`${targetUpload.filename} - Mock Exam`);
      
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      let promptContent = targetUpload.content || '';
      let basePrompt = `Generate a ${questionCount}-question multiple choice mock exam based on the following content. 
      Difficulty level: ${difficulty}. 
      Make the questions appropriate for the specified difficulty. 
      Easy: Basic recall and definitions. 
      Medium: Application of concepts and understanding relationships. 
      Hard: Complex analysis, synthesis of information, and critical evaluation.
      The language of the quiz should be ${user.settings?.language || 'English'} and the tone should be ${user.settings?.tone || 'Academic'}.`;

      let contents: any = `${basePrompt}\n\nContent:\n${promptContent}`;
      
      if (promptContent.startsWith('data:')) {
        const match = promptContent.match(/^data:(.+);base64,(.*)$/);
        if (match) {
          const mimeType = match[1];
          const base64Data = match[2];
          contents = [
            {
              parts: [
                { text: basePrompt },
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
                question: { type: Type.STRING, description: "The multiple choice question" },
                options: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING },
                  description: "Exactly 4 possible answers" 
                },
                correctAnswer: { type: Type.INTEGER, description: "The index (0-3) of the correct option in the options array" },
                explanation: { type: Type.STRING, description: "A brief explanation of why the answer is correct" }
              },
              required: ['question', 'options', 'correctAnswer', 'explanation']
            }
          }
        }
      });

      const generatedQuestions: QuizQuestion[] = JSON.parse(response.text || '[]');
      
      const newQuiz: Quiz = {
        id: Date.now(),
        userId: user.id,
        uploadId: targetUpload.id,
        title: `${targetUpload.filename} Quiz`,
        questions: generatedQuestions,
        createdAt: new Date().toISOString()
      };

      setQuiz(newQuiz);
      setCurrentQuestionIndex(0);
      setSelectedOption(null);
      setShowExplanation(false);
      setScore(0);
      setQuizFinished(false);
      
      // Save to history
      const allQuizzes = getQuizzes();
      setQuizzes([newQuiz, ...allQuizzes]);
      
      addUsage('doc'); // Reusing 'doc' usage type or we could add 'quiz'
    } catch (err: any) {
      console.error('Failed to generate quiz', err);
      if (err?.message?.includes('429') || err?.status === 429 || err?.message?.includes('exceeded your current quota')) {
        setError('You have exceeded your Gemini API quota. Please check your plan and billing details at https://ai.google.dev/gemini-api/docs/rate-limits.');
      } else {
        setError('Failed to generate quiz. Please check your API key and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Show config first
    setShowConfig(true);
    setQuiz(null);
  }, [user?.id]);

  const handleOptionSelect = (index: number) => {
    if (showExplanation) return; // Prevent changing answer after submission
    setSelectedOption(index);
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null || !quiz) return;
    
    const isCorrect = selectedOption === quiz.questions[currentQuestionIndex].correctAnswer;
    if (isCorrect) {
      setScore(prev => prev + 1);
    }
    
    setUserAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[currentQuestionIndex] = selectedOption;
      return newAnswers;
    });
    
    setShowExplanation(true);
  };

  const handleNextQuestion = () => {
    if (!quiz) return;
    
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
      setShowExplanation(false);
    } else {
      setQuizFinished(true);
      // Update saved quiz score
      const allQuizzes = getQuizzes();
      const updatedQuizzes = allQuizzes.map(q => 
        q.id === quiz.id ? { ...q, score: score + (selectedOption === quiz.questions[currentQuestionIndex].correctAnswer ? 1 : 0) } : q
      );
      setQuizzes(updatedQuizzes);
    }
  };

  const startReview = () => {
    setIsReviewing(true);
    setCurrentQuestionIndex(0);
    setQuizFinished(false);
    setShowExplanation(true);
    setSelectedOption(userAnswers[0]);
  };

  const handleNextReviewQuestion = () => {
    if (!quiz) return;
    if (currentQuestionIndex < quiz.questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setSelectedOption(userAnswers[nextIndex]);
    } else {
      setIsReviewing(false);
      setQuizFinished(true);
    }
  };

  const handlePrevReviewQuestion = () => {
    if (!quiz) return;
    if (currentQuestionIndex > 0) {
      const prevIndex = currentQuestionIndex - 1;
      setCurrentQuestionIndex(prevIndex);
      setSelectedOption(userAnswers[prevIndex]);
    }
  };

  const exportToPDF = () => {
    if (!quiz) return;
    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text(documentTitle, 20, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    
    let y = 40;
    quiz.questions.forEach((q, i) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      
      const questionLines = doc.splitTextToSize(`${i + 1}. ${q.question}`, 170);
      doc.text(questionLines, 20, y);
      y += questionLines.length * 7 + 2;
      
      q.options.forEach((opt, j) => {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        const optionLines = doc.splitTextToSize(`   ${String.fromCharCode(65 + j)}. ${opt}`, 170);
        doc.text(optionLines, 20, y);
        y += optionLines.length * 7;
      });
      
      y += 10;
    });
    
    doc.save(`${documentTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
  };

  if (!user) return null;

  return (
    <Layout navigate={navigate} activeView="dashboard">
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center">
              <Target className="w-8 h-8 mr-3 text-indigo-400" />
              {documentTitle}
            </h1>
            <p className="text-gray-400 mt-1">Test your knowledge with AI-generated questions</p>
          </div>
          <button 
            onClick={() => {
              setShowConfig(true);
              setQuiz(null);
              setQuizFinished(false);
            }}
            disabled={loading}
            className="flex items-center px-4 py-2.5 bg-[#1A1830] border border-[rgba(124,58,237,0.2)] rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-indigo-500/10 hover:border-indigo-500/40 transition-all shadow-sm disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />} 
            New Quiz Settings
          </button>
        </div>

        {showConfig && !loading && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-3xl p-8 md:p-12 border border-[rgba(124,58,237,0.2)]"
          >
            <div className="flex items-center mb-8">
              <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center mr-4">
                <Target className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Configure Your Mock Exam</h2>
                <p className="text-gray-400">Customize the quiz to match your study goals</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
              <div>
                <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Number of Questions</label>
                <div className="grid grid-cols-4 gap-2">
                  {[3, 5, 10, 15].map(count => (
                    <button
                      key={count}
                      onClick={() => setQuestionCount(count)}
                      className={`py-3 rounded-xl border transition-all ${
                        questionCount === count 
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                          : 'bg-[#1A1830] border-[rgba(124,58,237,0.1)] text-gray-400 hover:border-indigo-500/50'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Difficulty Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['easy', 'medium', 'hard'] as const).map(level => (
                    <button
                      key={level}
                      onClick={() => setDifficulty(level)}
                      className={`py-3 rounded-xl border transition-all capitalize ${
                        difficulty === level 
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                          : 'bg-[#1A1830] border-[rgba(124,58,237,0.1)] text-gray-400 hover:border-indigo-500/50'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button 
              onClick={generateQuiz}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-lg transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Generate Quiz
            </button>
          </motion.div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 glass-card rounded-3xl border border-[rgba(124,58,237,0.2)]">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
            <p className="text-gray-400 font-medium">Analyzing document and generating questions...</p>
          </div>
        ) : error && !quiz ? (
          <div className="flex flex-col items-center justify-center h-64 text-center glass-card rounded-3xl border border-red-500/20">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <p className="text-red-400 mb-4">{error}</p>
            <button 
              onClick={() => navigate('upload')}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors"
            >
              Upload a Document
            </button>
          </div>
        ) : quiz && !quizFinished ? (
          <div className="glass-card rounded-3xl p-6 md:p-10 border border-[rgba(124,58,237,0.2)] relative overflow-hidden">
            {/* Progress Bar */}
            <div className="absolute top-0 left-0 w-full h-1 bg-[#1A1830]">
              <div 
                className="h-full bg-indigo-500 transition-all duration-300"
                style={{ width: `${((currentQuestionIndex) / quiz.questions.length) * 100}%` }}
              />
            </div>

            <div className="flex justify-between items-center mb-8">
              <span className="text-sm font-bold text-indigo-400 uppercase tracking-wider">
                {isReviewing ? 'Reviewing ' : ''}Question {currentQuestionIndex + 1} of {quiz.questions.length}
              </span>
              <span className="text-sm font-medium text-gray-400">
                Score: {score}
              </span>
            </div>

            <h2 className="text-xl md:text-2xl font-bold text-white mb-8 leading-relaxed">
              {quiz.questions[currentQuestionIndex].question}
            </h2>

            <div className="space-y-4 mb-8">
              {quiz.questions[currentQuestionIndex].options.map((option, index) => {
                const isSelected = selectedOption === index;
                const isCorrect = index === quiz.questions[currentQuestionIndex].correctAnswer;
                
                let buttonClass = "w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center justify-between ";
                
                if (!showExplanation) {
                  buttonClass += isSelected 
                    ? "bg-indigo-600/20 border-indigo-500 text-white" 
                    : "bg-[#1A1830] border-[rgba(124,58,237,0.2)] text-gray-300 hover:bg-[#211F35] hover:border-indigo-500/50";
                } else {
                  if (isCorrect) {
                    buttonClass += "bg-emerald-500/20 border-emerald-500 text-emerald-100";
                  } else if (isSelected && !isCorrect) {
                    buttonClass += "bg-red-500/20 border-red-500 text-red-100";
                  } else {
                    buttonClass += "bg-[#1A1830] border-[rgba(124,58,237,0.1)] text-gray-500 opacity-50";
                  }
                }

                return (
                  <button
                    key={index}
                    onClick={() => handleOptionSelect(index)}
                    disabled={showExplanation || isReviewing}
                    className={buttonClass}
                  >
                    <span className="flex-1">{option}</span>
                    {showExplanation && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400 ml-3 flex-shrink-0" />}
                    {showExplanation && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-400 ml-3 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>

            <AnimatePresence>
              {showExplanation && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-8 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20"
                >
                  <h4 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-2">Explanation</h4>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {quiz.questions[currentQuestionIndex].explanation}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex justify-end gap-4">
              {isReviewing ? (
                <>
                  <button
                    onClick={handlePrevReviewQuestion}
                    disabled={currentQuestionIndex === 0}
                    className="px-8 py-3 bg-[#1A1830] border border-[rgba(124,58,237,0.2)] text-gray-300 hover:text-white rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center"
                  >
                    Previous
                  </button>
                  <button
                    onClick={handleNextReviewQuestion}
                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-indigo-500/20 flex items-center"
                  >
                    {currentQuestionIndex < quiz.questions.length - 1 ? 'Next' : 'Finish Review'}
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </button>
                </>
              ) : !showExplanation ? (
                <button
                  onClick={handleSubmitAnswer}
                  disabled={selectedOption === null}
                  className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
                >
                  Check Answer
                </button>
              ) : (
                <button
                  onClick={handleNextQuestion}
                  className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-indigo-500/20 flex items-center"
                >
                  {currentQuestionIndex < quiz.questions.length - 1 ? 'Next Question' : 'See Results'}
                  <ChevronRight className="w-5 h-5 ml-2" />
                </button>
              )}
            </div>
          </div>
        ) : quizFinished && quiz ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-3xl p-8 md:p-12 border border-[rgba(124,58,237,0.2)] text-center"
          >
            <div className="w-24 h-24 mx-auto bg-indigo-500/20 rounded-full flex items-center justify-center mb-6 border-4 border-indigo-500/30">
              <span className="text-4xl font-bold text-indigo-400">{Math.round((score / quiz.questions.length) * 100)}%</span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Quiz Completed!</h2>
            <p className="text-gray-400 mb-8">
              You scored {score} out of {quiz.questions.length} correct.
            </p>
            
            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4">
              <button 
                onClick={startReview}
                className="px-8 py-3 bg-[#211F35] hover:bg-[#2A2845] text-white rounded-xl font-bold transition-colors border border-[rgba(124,58,237,0.2)] flex items-center justify-center"
              >
                <FileText className="w-5 h-5 mr-2" /> Review Answers
              </button>
              <button 
                onClick={exportToPDF}
                className="px-8 py-3 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-xl font-bold transition-colors border border-purple-500/30 flex items-center justify-center"
              >
                <Download className="w-5 h-5 mr-2" /> Export to PDF
              </button>
              <button 
                onClick={() => {
                  setShowConfig(true);
                  setQuiz(null);
                  setQuizFinished(false);
                }}
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-indigo-500/20 flex items-center justify-center"
              >
                <RefreshCw className="w-5 h-5 mr-2" /> Try Another Quiz
              </button>
              <button 
                onClick={() => navigate('dashboard')}
                className="px-8 py-3 bg-[#211F35] hover:bg-[#2A2845] text-white rounded-xl font-bold transition-colors border border-[rgba(124,58,237,0.2)]"
              >
                Back to Dashboard
              </button>
            </div>
          </motion.div>
        ) : null}
      </div>
    </Layout>
  );
}
