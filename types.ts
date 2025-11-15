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
  SUB_TYPE?: 'MORNING_DRILL' | 'DEEP_DIVE' | 'ANALYSIS';
  isUserCreated?: boolean; 
}

export interface HomeworkData {
  ID: string;
  DAY: LocalizedString;
  CARD_TITLE: LocalizedString;
  SUBJECT_TAG: LocalizedString;
  FOCUS_DETAIL: LocalizedString;
  Q_RANGES: string;
  type: 'HOMEWORK';
  TIME?: string;
  isUserCreated?: boolean;
}

export interface ActivityData {
  ID: string;
  type: 'ACTIVITY';
  CARD_TITLE: LocalizedString;
  STATUS: number;
  DAY: LocalizedString;
  FOCUS_DETAIL: LocalizedString;
  SUBJECT_TAG: LocalizedString;
}

export type ScheduleItem = ScheduleCardData | HomeworkData | ActivityData;

export interface ResultData {
  ID: string;
  DATE: string;
  SCORE: string;
  MISTAKES: string[];
  FIXED_MISTAKES?: string[];
}

// FIX: Add ExamData interface to support exam-related features.
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
  questions_skipped?: number[];
}

export interface Config {
    SID: string;
    fullName: string;
    profilePhoto: string;
    WAKE: string;
    SCORE: string;
    WEAK: string[];
    UNACADEMY_SUB: boolean;
    settings: {
        accentColor: string;
        blurEnabled: boolean;
        mobileLayout: 'standard' | 'toolbar';
    };
}

export interface StudentData {
    CONFIG: Config;
    SCHEDULE_ITEMS: ScheduleItem[];
    RESULTS: ResultData[];
    DOUBTS: DoubtData[];
    STUDY_SESSIONS: StudySession[];
    // FIX: Add EXAMS property to align with mock data and application features.
    EXAMS: ExamData[];
}
