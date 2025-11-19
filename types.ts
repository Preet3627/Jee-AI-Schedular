
export type Language = 'EN' | 'GU';

export interface LocalizedString {
  EN: string;
  GU: string;
}

export interface UiText {
  LANGUAGE: string;
  APP_TITLE: LocalizedString;
  CURRENT_STATUS_TITLE: LocalizedString;
  CURRENT_SCORE: LocalizedString;
  TARGET_SCORE: LocalizedString;
  WEAKNESS_TITLE: LocalizedString;
  SCHEDULE_TITLE: LocalizedString;
  ACTION_BUTTONS: {
    SET_ALARM: LocalizedString;
    COPY_CMD: LocalizedString;
  };
}

export interface ScheduleCardData {
  ID: string;
  DAY: LocalizedString;
  TIME: string;
  CARD_TITLE: LocalizedString;
  FOCUS_DETAIL: LocalizedString;
  SUBJECT_TAG: LocalizedString;
  UNACADEMY_QUERY?: string;
  ACTION_COMMAND?: string;
  type: 'ACTION';
  SUB_TYPE?: 'MORNING_DRILL' | 'DEEP_DIVE' | 'ANALYSIS' | 'FLASHCARD_REVIEW';
  isUserCreated?: boolean;
  isStarred?: boolean;
  googleEventId?: string;
  deckId?: string;
  date?: string; // For one-off events, format YYYY-MM-DD
}

export interface PracticeHistory {
  date: string; // ISO string
  attempted: number[];
  correct: number[];
  incorrect: number[];
  skipped: number[];
}

export interface HomeworkData {
  ID: string;
  DAY: LocalizedString;
  CARD_TITLE: LocalizedString;
  SUBJECT_TAG: LocalizedString;
  FOCUS_DETAIL: LocalizedString;
  Q_RANGES: string;
  type: 'HOMEWORK';
  category?: 'Level-1' | 'Level-2' | 'Classroom-Discussion' | 'PYQ' | 'Custom';
  TIME?: string;
  isUserCreated?: boolean;
  isStarred?: boolean;
  googleEventId?: string;
  answers?: Record<string, string>; // e.g., { "1": "A", "2": "12.5" }
  solutions?: Record<string, string>; // For AI-generated detailed solutions
  date?: string; // For one-off homework, format YYYY-MM-DD
  practiceHistory?: PracticeHistory[];
  flashcards?: { front: string; back: string }[]; // For AI-generated cards
}

export interface ActivityData {
  ID: string;
  type: 'ACTIVITY';
  CARD_TITLE: LocalizedString;
  STATUS: number;
  DAY: LocalizedString;
  FOCUS_DETAIL: LocalizedString;
  SUBJECT_TAG: LocalizedString;
  isStarred?: boolean;
}

export type ScheduleItem = ScheduleCardData | HomeworkData | ActivityData;

export interface ResultData {
  ID: string;
  DATE: string;
  SCORE: string; // e.g., "185/300"
  MISTAKES: string[]; // List of mistake topics or question numbers
  FIXED_MISTAKES?: string[];
  
  // New detailed analysis fields
  syllabus?: string;
  timings?: Record<number, number>; // { qNum: seconds }
  analysis?: {
    subjectTimings: Record<'PHYSICS' | 'CHEMISTRY' | 'MATHS' | 'OTHER', number>;
    chapterScores: Record<string, { correct: number; incorrect: number; accuracy: number }>;
    aiSuggestions: string;
    incorrectQuestionNumbers?: number[];
    suggestedFlashcards?: { front: string; back: string; }[];
  };
  detailedMistakes?: {
    qNumber: number;
    analysis: {
        topic: string;
        explanation: string;
    };
  }[];
}


export interface ExamData {
  ID: string;
  subject: 'PHYSICS' | 'CHEMISTRY' | 'MATHS' | 'FULL';
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  syllabus: string; // Comma-separated list of topics
}

export interface SolutionData {
  id: string;
  doubt_id: string;
  user_sid: string;
  solution: string;
  solution_image?: string; // Base64 image data
  created_at: string;
  solver_name: string;
  solver_photo: string;
}

export interface DoubtData {
  id: string;
  user_sid: string;
  question: string;
  question_image?: string; // Base64 image data
  created_at: string;
  author_name: string;
  author_photo: string;
  solutions: SolutionData[];
  status?: 'active' | 'archived' | 'deleted';
}

export interface MessageData {
  id: number;
  sender_sid: string;
  recipient_sid: string;
  content: string;
  created_at: string;
}

export interface StudySession {
  date: string; // YYYY-MM-DD
  duration: number; // in seconds
  questions_solved: number;
  questions_skipped: number[];
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  track: string; // track number
  coverArt: string; // cover art ID from Ampache/WebDAV
  duration: string; // in seconds
  size: string; // in bytes
  coverArtUrl?: string; // dynamically added by the player context
  isLocal?: boolean;
  file?: File; // For local files using File System Access API
  path?: string; // For Nextcloud files
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
}

export interface FlashcardDeck {
  id: string;
  name: string;
  subject: string;
  cards: Flashcard[];
  chapter?: string;
  isLocked?: boolean;
}

export interface StudyMaterialItem {
    name: string;
    type: 'file' | 'folder';
    path: string;
    size: number;
    modified: string;
}

export interface PracticeQuestion {
  number: number;
  text: string;
  options: string[];
  type: 'MCQ' | 'NUM';
}

export interface CustomWidget {
  id: string;
  title: string;
  content: string; // Markdown content
}

export interface LocalPlaylist {
  id: string;
  name: string;
  trackIds: string[]; // For local files, this could be the file name or a generated ID
}

export type ActiveTab = 'dashboard' | 'schedule' | 'today' | 'planner' | 'exams' | 'performance' | 'doubts' | 'flashcards' | 'material';

export interface DashboardWidgetItem {
    id: string; // Corresponds to a key in the widgetConfig map
    wide?: boolean;
    translucent?: boolean;
    // Add position if needed for drag-and-drop
}

// The complete, normalized user data object used throughout the frontend
export interface Config {
    WAKE: string;
    SCORE: string;
    WEAK: string[];
    UNACADEMY_SUB: boolean;
    googleDriveFileId?: string;
    driveLastSync?: string;
    isCalendarSyncEnabled?: boolean;
    calendarLastSync?: string;
    geminiApiKey?: string; // This is stored encrypted on the backend ONLY.
    flashcardDecks?: FlashcardDeck[];
    pinnedMaterials?: string[]; // Array of item paths
    customWidgets?: CustomWidget[];
    localPlaylists?: LocalPlaylist[];
    settings: {
        accentColor: string;
        blurEnabled: boolean;
        mobileLayout: 'standard' | 'toolbar';
        forceOfflineMode: boolean; 
        perQuestionTime: number; // Default time in seconds per MCQ
        hasGeminiKey?: boolean; // A safe flag for the frontend
        showAiChatAssistant?: boolean;
        creditSaver?: boolean; // Use faster, cheaper AI models
        examType?: 'JEE' | 'NEET';
        theme?: 'default' | 'liquid-glass' | 'midnight';
        dashboardLayout?: DashboardWidgetItem[]; // Array of widget objects for customized layout
        dashboardFlashcardDeckIds?: string[];
        musicPlayerWidgetLayout?: 'minimal' | 'expanded';
        customDjDropUrl?: string; // URL for user-uploaded custom DJ drop
        widgetSettings?: Record<string, any>; 
    };
}

// The complete, normalized user data object used throughout the frontend
export interface StudentData {
    // Core user info from the `users` table
    id: number;
    sid: string;
    email: string;
    fullName: string;
    profilePhoto: string;
    isVerified: boolean;
    role: 'student' | 'admin';
    apiToken?: string; // Only sent once on generation
    last_seen?: string; // ISO timestamp for online status

    // Data from other tables, combined by the backend
    CONFIG: Config;
    SCHEDULE_ITEMS: ScheduleItem[];
    RESULTS: ResultData[];
    EXAMS: ExamData[];
    STUDY_SESSIONS: StudySession[];
    DOUBTS: DoubtData[];
}

export interface PlannerViewProps {
  items: ScheduleItem[];
  onEdit: (item: ScheduleItem, event?: React.MouseEvent<HTMLButtonElement | HTMLDivElement, MouseEvent>) => void;
}

export interface ExamTypeSelectionModalProps {
  onSelect: (examType: 'JEE' | 'NEET') => void;
  onClose: () => void;
  animationOrigin?: { x: string, y: string };
}

export interface CreateEditTaskModalProps {
  task: ScheduleItem | null;
  viewOnly?: boolean;
  onClose: () => void;
  onSave: (task: ScheduleItem) => void;
  decks: FlashcardDeck[];
  animationOrigin?: { x: string, y: string };
}

export interface AIParserModalProps {
  onClose: () => void;
  onDataReady: (data: any) => void;
  onPracticeTestReady: (data: any) => void;
  onOpenGuide: (event?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  examType?: 'JEE' | 'NEET';
  animationOrigin?: { x: string, y: string };
}

export interface CustomPracticeModalProps {
  onClose: () => void;
  onSessionComplete: (duration: number, questions_solved: number, questions_skipped: number[]) => void;
  initialTask?: HomeworkData | null;
  aiPracticeTest?: { questions: PracticeQuestion[], answers: Record<string, string> } | null;
  aiInitialTopic?: string | null;
  defaultPerQuestionTime: number;
  onLogResult: (result: ResultData) => void;
  onUpdateWeaknesses: (weaknesses: string[]) => void; 
  student: StudentData;
  onSaveTask: (task: ScheduleItem) => void;
  animationOrigin?: { x: string, y: string };
}

export interface SettingsModalProps {
  settings: Config['settings'];
  decks: FlashcardDeck[];
  driveLastSync?: string;
  isCalendarSyncEnabled?: boolean;
  calendarLastSync?: string;
  onClose: () => void;
  onSave: (settings: Partial<Config['settings'] & { geminiApiKey?: string; isCalendarSyncEnabled?: boolean; customDjDropFile?: File; }>, newCustomWidgets: CustomWidget[]) => void;
  onExportToIcs: () => void;
  googleAuthStatus: 'signed_in' | 'signed_out' | 'loading' | 'unconfigured';
  onGoogleSignIn: (event?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void; 
  onGoogleSignOut: (event?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void; 
  onBackupToDrive: () => void;
  onRestoreFromDrive: () => void;
  onApiKeySet: () => void;
  onOpenAssistantGuide: (event?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void; 
  onOpenAiGuide: (event?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void; 
  onClearAllSchedule: () => void;
  studentCustomWidgets: CustomWidget[];
  onSaveCustomWidgets: (widget: CustomWidget) => void;
  animationOrigin?: { x: string, y: string };
}

export interface EditWeaknessesModalProps {
  currentWeaknesses: string[];
  onClose: () => void;
  onSave: (weaknesses: string[]) => void;
  animationOrigin?: { x: string, y: string };
}

export interface LogResultModalProps {
  onClose: () => void;
  onSave: (result: ResultData) => void;
  initialScore?: string;
  initialMistakes?: string;
  animationOrigin?: { x: string, y: string };
}

export interface CreateEditExamModalProps {
  exam: ExamData | null;
  onClose: () => void;
  onSave: (exam: ExamData) => void;
  animationOrigin?: { x: string, y: string };
}

export interface AIMistakeAnalysisModalProps {
  onClose: () => void;
  onSaveWeakness: (weakness: string) => void;
  animationOrigin?: { x: string, y: string };
}

export interface AIDoubtSolverModalProps {
  onClose: () => void;
  animationOrigin?: { x: string, y: string };
}

export interface AIChatPopupProps {
  history: { role: string; parts: { text: string }[] }[];
  onSendMessage: (prompt: string, imageBase64?: string) => void;
  onClose: () => void;
  isLoading: boolean;
  animationOrigin?: { x: string, y: string };
}

export interface TestAnalysisReportProps {
  result: ResultData;
  onAnalyzeMistake: (questionNumber: number) => void;
}

export interface MoveTasksModalProps {
  onClose: () => void;
  onConfirm: (newDate: string) => void;
  selectedCount: number;
  animationOrigin?: { x: string, y: string };
}

export interface MusicLibraryModalProps {
  onClose: () => void;
  animationOrigin?: { x: string, y: string };
}

export interface CreateEditDeckModalProps {
  deck: FlashcardDeck | null;
  onClose: () => void;
  onSave: (deck: FlashcardDeck) => void;
  animationOrigin?: { x: string, y: string };
}

export interface AIGenerateFlashcardsModalProps {
  student: StudentData;
  onClose: () => void;
  onSaveDeck: (deck: FlashcardDeck) => void;
  animationOrigin?: { x: string, y: string };
}

export interface DeckViewModalProps {
  deck: FlashcardDeck;
  onClose: () => void;
  onAddCard: (event?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  onEditCard: (card: Flashcard, event?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  onDeleteCard: (cardId: string) => void;
  onStartReview: (event?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  animationOrigin?: { x: string, y: string };
}

export interface CreateEditFlashcardModalProps {
  card: Flashcard | null;
  deckId: string;
  onClose: () => void;
  onSave: (deckId: string, card: Flashcard) => void;
  animationOrigin?: { x: string, y: string };
}

export interface FlashcardReviewModalProps {
  deck: FlashcardDeck;
  onClose: () => void;
  animationOrigin?: { x: string, y: string };
}

export interface FileViewerModalProps {
  file: StudyMaterialItem | null;
  onClose: () => void;
  animationOrigin?: { x: string, y: string };
}

export interface GoogleAssistantGuideModalProps {
  onClose: () => void;
  animationOrigin?: { x: string, y: string };
}

export interface DeepLinkConfirmationModalProps {
  data: {
    schedules?: any[];
    exams?: any[];
    results?: any[];
    weaknesses?: string[];
  };
  onClose: () => void;
  onConfirm: () => void;
  animationOrigin?: { x: string, y: string };
}

export interface AIGuideModalProps {
  onClose: () => void;
  examType?: 'JEE' | 'NEET';
  animationOrigin?: { x: string, y: string };
}

export interface MessagingModalProps {
  student: StudentData;
  onClose: () => void;
  isDemoMode: boolean;
  animationOrigin?: { x: string, y: string };
}

export interface AIGenerateAnswerKeyModalProps {
  onClose: () => void;
  onKeyGenerated: (keyText: string) => void;
  animationOrigin?: { x: string, y: string };
}

export interface SpecificMistakeAnalysisModalProps {
  questionNumber: number;
  onClose: () => void;
  onSaveWeakness: (weakness: string) => void;
  animationOrigin?: { x: string, y: string };
}
export interface GlobalMusicVisualizerProps {
  // No explicit props needed if it pulls from context
}

export interface MusicPlayerWidgetProps {
  onOpenLibrary: (event?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  layout?: 'minimal' | 'expanded';
}

export interface PersistentMusicPlayerProps {
  // No explicit props needed if it pulls from context
}

export interface FullScreenMusicPlayerProps {
  // No explicit props needed if it pulls from context
}

export interface ReloadPromptProps {
  // No explicit props needed
}

export interface TodayPlannerProps {
  items: ScheduleItem[];
  onEdit: (item: ScheduleItem, event?: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
}

export interface CustomWidgetComponentProps {
  title: string;
  content: string;
}

export interface CountdownWidgetProps {
  items: ScheduleItem[];
  onClick?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
}

export interface MotivationalQuoteWidgetProps {
  quote: string;
}

export interface HomeworkWidgetProps {
  items: ScheduleItem[];
  onStartPractice: (homework: HomeworkData, event?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

export interface SubjectAllocationWidgetProps {
  items: ScheduleItem[];
}

export interface ScoreTrendWidgetProps {
  results: ResultData[];
}

export interface ReadingHoursWidgetProps {
  student: StudentData;
}

export interface DailyInsightWidgetProps {
  weaknesses: string[];
  exams: ExamData[];
}

export interface AchievementsWidgetProps {
  student: StudentData;
  allDoubts: DoubtData[];
}

export interface ActivityTrackerProps {
  activities: ActivityData[];
}
