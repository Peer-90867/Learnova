export interface Flashcard {
  id: string;
  front: string;
  back: string;
  difficulty: 'easy' | 'medium' | 'hard';
  status?: 'hard' | 'ok' | 'easy';
  // SRS Fields
  nextReviewDate?: string;
  interval?: number; // in days
  easeFactor?: number;
  repetitions?: number;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface Quiz {
  id: number;
  userId: number;
  uploadId: number;
  title: string;
  questions: QuizQuestion[];
  score?: number;
  createdAt: string;
}

export interface Todo {
  id: number;
  userId: number;
  text: string;
  completed: boolean;
  dueDate?: string;
  createdAt: string;
  priority?: 'low' | 'medium' | 'high';
  category?: string;
}

export interface Deck {
  id: number;
  userId: number;
  name: string;
  cards: Flashcard[];
  createdAt: string;
}

export interface StudySet {
  id: number;
  userId: number;
  name: string;
  uploadIds: number[];
}

export interface Slide {
  title: string;
  content: string[];
  imageUrl?: string;
}

export interface Presentation {
  id: number;
  userId: number;
  uploadId: number;
  title: string;
  slides: Slide[];
  createdAt: string;
}

export interface Usage {
  userId: number;
  type: 'flashcard' | 'note' | 'chat' | 'doc' | 'presentation' | 'quiz' | 'mindmap' | 'focus' | 'planner';
  date: string;
  duration?: number; // for focus sessions
}

export interface MindMapNode {
  id: string;
  text: string;
  children: MindMapNode[];
  collapsed?: boolean;
}

export interface MindMap {
  id: number;
  userId: number;
  uploadId: number;
  title: string;
  root: MindMapNode;
  createdAt: string;
}

export interface FocusSession {
  id: number;
  userId: number;
  duration: number; // in minutes
  type: 'pomodoro' | 'short-break' | 'long-break';
  date: string;
}

export interface PlannedTask {
  id: number;
  userId: number;
  title: string;
  date: string;
  type: 'study' | 'review' | 'exam' | 'quiz';
  completed: boolean;
}

export interface ChatMessage {
  id: string;
  userId: number;
  userName: string;
  text: string;
  timestamp: string;
}

export interface StudyGroup {
  id: number;
  name: string;
  description: string;
  ownerId: number;
  members: number[]; // user IDs
  sharedUploadIds: number[];
  createdAt: string;
  subject?: string;
  password?: string;
  chatHistory: ChatMessage[];
  collaborativeDocument: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  password?: string;
  plan: 'free' | 'pro' | 'team';
  subscriptionStatus: 'none' | 'pending' | 'active' | 'rejected';
  uploadsUsed: number;
  createdAt: string;
  lastActiveDate?: string;
  studyGoal?: number; // target hours per week
  dailyGoal?: number; // target tasks per day
  settings?: {
    flashcardDifficulty: 'easy' | 'medium' | 'hard';
    noteStyle: 'concise' | 'detailed' | 'bulleted';
    theme: 'light' | 'dark';
    language?: string;
    tone?: string;
  };
}

export interface Message {
  role: 'user' | 'model';
  content: string;
  personaId?: string;
}

export interface Upload {
  id: number;
  userId: number;
  filename: string;
  type: string;
  date: string;
  content?: string;
  chatHistory?: Message[];
  thumbnail?: string;
}

export interface Subscription {
  id: number;
  userId: number;
  userEmail: string;
  userName: string;
  plan: string;
  amount: number;
  transactionId: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  rejectionReason?: string;
}

export const getStore = <T>(key: string, defaultValue: T): T => {
  try {
    const val = localStorage.getItem(key);
    if (!val) return defaultValue;
    const parsed = JSON.parse(val);
    if (parsed === undefined || parsed === null) return defaultValue;
    return parsed;
  } catch (e) {
    console.error(`Error parsing store for key ${key}:`, e);
    return defaultValue;
  }
};

export const getCache = <T>(key: string): T | null => {
  try {
    const val = localStorage.getItem(`sf_cache_${key}`);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
};

export const setCache = <T>(key: string, value: T) => {
  try {
    localStorage.setItem(`sf_cache_${key}`, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to save to cache', e);
  }
};

export const setStore = <T>(key: string, value: T) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e: any) {
    if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      console.warn(`LocalStorage quota exceeded for key ${key}, attempting to clear space...`);
      try {
        // 1. Clear cache first
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith('sf_cache_')) localStorage.removeItem(k);
        });

        // 2. If still failing, clear usage history
        localStorage.removeItem('sf_usage');

        // 3. If still failing, clear half of presentations
        const presentations = getPresentations();
        if (presentations.length > 1) {
          const keptPresentations = presentations.slice(Math.floor(presentations.length / 2));
          localStorage.setItem('sf_presentations', JSON.stringify(keptPresentations));
        }

        // 4. If still failing and key is sf_uploads, remove oldest upload
        if (key === 'sf_uploads' && Array.isArray(value) && value.length > 1) {
          const uploads = value as Upload[];
          // Remove the oldest upload
          const trimmedUploads = uploads.slice(1);
          localStorage.setItem('sf_uploads', JSON.stringify(trimmedUploads));
          return;
        }

        // Try saving the original request again
        localStorage.setItem(key, JSON.stringify(value));
        return;
      } catch (retryError) {
        console.error('Failed to clear space in localStorage', retryError);
      }
    }
    console.error('Failed to save to localStorage', e);
  }
};

export const getCurrentUser = (): User | null => getStore<User | null>('sf_current_user', null);
export const setCurrentUser = (user: User | null) => {
  setStore('sf_current_user', user);
  window.dispatchEvent(new Event('user-updated'));
};

export const getUsers = (): User[] => getStore<User[]>('sf_users', []);
export const setUsers = (users: User[]) => setStore('sf_users', users);

export const getUploads = (): Upload[] => getStore<Upload[]>('sf_uploads', []);
export const setUploads = (uploads: Upload[]) => setStore('sf_uploads', uploads);

export const getDecks = (): Deck[] => getStore<Deck[]>('sf_decks', []);
export const setDecks = (decks: Deck[]) => setStore('sf_decks', decks);

export const getStudySets = (): StudySet[] => getStore<StudySet[]>('sf_study_sets', []);
export const setStudySets = (studySets: StudySet[]) => setStore('sf_study_sets', studySets);

export const getUsage = (): Usage[] => getStore<Usage[]>('sf_usage', []);
export const setUsage = (usage: Usage[]) => setStore('sf_usage', usage);
export const addUsage = (type: Usage['type']) => {
  const user = getCurrentUser();
  if (!user) return;
  const usage = getUsage();
  usage.push({ userId: user.id, type, date: new Date().toISOString() });
  setUsage(usage);
};

export const getSubscriptions = (): Subscription[] => getStore<Subscription[]>('sf_subscriptions', []);
export const setSubscriptions = (subs: Subscription[]) => setStore('sf_subscriptions', subs);

export const getPresentations = (): Presentation[] => getStore<Presentation[]>('sf_presentations', []);
export const setPresentations = (presentations: Presentation[]) => setStore('sf_presentations', presentations);

export const getTodos = (): Todo[] => getStore<Todo[]>('sf_todos', []);
export const setTodos = (todos: Todo[]) => setStore('sf_todos', todos);

export const getQuizzes = (): Quiz[] => getStore<Quiz[]>('sf_quizzes', []);
export const setQuizzes = (quizzes: Quiz[]) => setStore('sf_quizzes', quizzes);

export const getMindMaps = (): MindMap[] => getStore<MindMap[]>('sf_mindmaps', []);
export const setMindMaps = (maps: MindMap[]) => setStore('sf_mindmaps', maps);

export const getFocusSessions = (): FocusSession[] => getStore<FocusSession[]>('sf_focus_sessions', []);
export const setFocusSessions = (sessions: FocusSession[]) => setStore('sf_focus_sessions', sessions);

export const getPlannedTasks = (): PlannedTask[] => getStore<PlannedTask[]>('sf_planned_tasks', []);
export const setPlannedTasks = (tasks: PlannedTask[]) => setStore('sf_planned_tasks', tasks);

export const getStudyGroups = (): StudyGroup[] => getStore<StudyGroup[]>('sf_study_groups', []);
export const setStudyGroups = (groups: StudyGroup[]) => setStore('sf_study_groups', groups);

export const getCurrentDocumentId = (): number | null => getStore<number | null>('sf_current_document_id', null);
export const setCurrentDocumentId = (id: number | null) => setStore('sf_current_document_id', id);

export const getTheme = (): 'light' | 'dark' => getStore<'light' | 'dark'>('sf_theme', 'dark');
export const setTheme = (theme: 'light' | 'dark') => {
  setStore('sf_theme', theme);
  document.documentElement.classList.toggle('light', theme === 'light');
  window.dispatchEvent(new Event('theme-updated'));
};

export const updateStreak = () => {
  const user = getCurrentUser();
  if (!user) return;

  const today = new Date().toISOString().split('T')[0];
  const lastActive = user.lastActiveDate;

  if (lastActive === today) return;

  const updatedUser = { ...user, lastActiveDate: today };
  setCurrentUser(updatedUser);
  
  const users = getUsers();
  setUsers(users.map(u => u.id === user.id ? updatedUser : u));
};

export const isAdmin = (): boolean => {
  try {
    return sessionStorage.getItem('sf_admin') === 'true';
  } catch {
    return false;
  }
};
export const setAdmin = (status: boolean) => {
  try {
    sessionStorage.setItem('sf_admin', status ? 'true' : 'false');
  } catch {}
};
