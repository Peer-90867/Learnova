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
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
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
  streak: number;
  lastActiveDate?: string;
  achievements: Achievement[];
  studyGoal?: number; // target hours per week
  dailyGoal?: number; // target tasks per day
  settings?: {
    flashcardDifficulty: 'easy' | 'medium' | 'hard';
    noteStyle: 'concise' | 'detailed' | 'bulleted';
    theme: 'light' | 'dark';
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
    return val ? JSON.parse(val) : defaultValue;
  } catch {
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
  } catch (e) {
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

  let newStreak = user.streak || 0;
  if (lastActive) {
    const lastDate = new Date(lastActive);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastActive === yesterdayStr) {
      newStreak += 1;
    } else {
      newStreak = 1;
    }
  } else {
    newStreak = 1;
  }

  const updatedUser = { ...user, streak: newStreak, lastActiveDate: today };
  setCurrentUser(updatedUser);
  
  const users = getUsers();
  setUsers(users.map(u => u.id === user.id ? updatedUser : u));
};

export const unlockAchievement = (achievementId: string) => {
  const user = getCurrentUser();
  if (!user) return;

  if (user.achievements.some(a => a.id === achievementId && a.unlockedAt)) return;

  const updatedAchievements = user.achievements.map(a => 
    a.id === achievementId ? { ...a, unlockedAt: new Date().toISOString() } : a
  );

  const updatedUser = { ...user, achievements: updatedAchievements };
  setCurrentUser(updatedUser);
  
  const users = getUsers();
  setUsers(users.map(u => u.id === user.id ? updatedUser : u));
};

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_upload', title: 'First Step', description: 'Upload your first document', icon: '🚀' },
  { id: 'streak_3', title: 'Consistent', description: 'Maintain a 3-day study streak', icon: '🔥' },
  { id: 'quiz_master', title: 'Quiz Master', description: 'Get 100% on a mock exam', icon: '🎯' },
  { id: 'focus_pro', title: 'Deep Focus', description: 'Complete 5 focus sessions', icon: '🧘' },
  { id: 'collaborator', title: 'Team Player', description: 'Join or create a study group', icon: '🤝' }
];

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
