import { UiText, StudentData } from '../types';
import { generateAvatar } from '../utils/generateAvatar';

export const uiTextData: UiText = {
  "LANGUAGE": "EN_GU",
  "APP_TITLE": {"EN": "JEE Scheduler Pro", "GU": "JEE શેડ્યૂલર પ્રો"},
  "CURRENT_STATUS_TITLE": {"EN": "PERFORMANCE METRICS", "GU": "પર્ફોર્મન્સ મેટ્રિક્સ"},
  "CURRENT_SCORE": {"EN": "Last Mock Score:", "GU": "છેલ્લા મોકનો સ્કોર:"},
  "TARGET_SCORE": {"EN": "Target Rank Improvement:", "GU": "લક્ષ્ય રેન્ક સુધારો:"},
  "WEAKNESS_TITLE": {"EN": "PRIORITY WEAKNESSES", "GU": "પ્રાધાન્યતા નબળાઈઓ"},
  "SCHEDULE_TITLE": {"EN": "OPTIMIZED WEEKLY SCHEDULE", "GU": "ઑપ્ટિમાઇઝ્ડ સાપ્તાહિક શેડ્યૂલ"},
  "ACTION_BUTTONS": {
    "SET_ALARM": {"EN": "SET PWA NOTIFICATION", "GU": "PWA સૂચના સેટ કરો"},
    "COPY_CMD": {"EN": "Copy Command for Assistant", "GU": "આસિસ્ટન્ટ માટે કમાન્ડ કૉપી કરો"}
  }
};

export const studentDatabase: StudentData[] = [
    {
        CONFIG: {
            SID: "S001",
            fullName: "Rohan Shah",
            profilePhoto: generateAvatar("Rohan Shah"),
            WAKE: "0530",
            SCORE: "147/300",
            WEAK: ["Trig Identities", "FBD in Rotation", "P-Block Reactions"],
            UNACADEMY_SUB: true,
            googleId: '',
            googleDriveFileId: '',
            driveLastSync: '',
            settings: { 
                accentColor: '#0891b2', 
                blurEnabled: true, 
                mobileLayout: 'standard', 
                forceOfflineMode: false, 
                googleClientId: '59869142203-8qna4rfo93rrv9uiok3bes28pfu5k1l1.apps.googleusercontent.com',
                geminiApiKey: '',
                perQuestionTime: 180
            }
        },
        SCHEDULE_ITEMS: [
            {
                "ID": "A001",
                "DAY": {"EN": "THURSDAY", "GU": "ગુરુવાર"},
                "TIME": "20:30",
                "CARD_TITLE": {"EN": "ROTATIONAL DYNAMICS DEEP DIVE", "GU": "રોટેશનલ ડાયનેમિક્સ ડીપ ડાઇવ"},
                "FOCUS_DETAIL": {"EN": "Fix FBD/Tension errors in System of Particles.", "GU": "સિસ્ટમ ઓફ પાર્ટિકલ્સમાં FBD/તણાવની ભૂલો સુધારો."},
                "SUBJECT_TAG": {"EN": "PHYSICS", "GU": "ભૌતિક વિજ્ઞાન"},
                "UNACADEMY_QUERY": "JEE Moment of Inertia PYQ and FBD analysis",
                "ACTION_COMMAND": "Set a reminder for tonight at 8:30 PM: 'System of Particles/Rotation FBD deep dive'.",
                "type": "ACTION",
                "SUB_TYPE": "DEEP_DIVE"
            },
            {
                "ID": "H001",
                "DAY": {"EN": "THURSDAY", "GU": "ગુરુવાર"},
                "TIME": "21:00",
                "CARD_TITLE": {"EN": "CHEMISTRY HOMEWORK", "GU": "રસાયણ વિજ્ઞાન હોમવર્ક"},
                "FOCUS_DETAIL": {"EN": "Complete NCERT questions for P-Block Elements.", "GU": "P-બ્લોક તત્વો માટે NCERT પ્રશ્નો પૂર્ણ કરો."},
                "Q_RANGES": "In-text:1-5;Exercises:10-15@p75",
                "SUBJECT_TAG": {"EN": "HOMEWORK", "GU": "હોમવર્ક"},
                "type": "HOMEWORK"
            },
            {
                "ID": "AC01",
                "type": "ACTIVITY",
                "CARD_TITLE": { "EN": "Mock Test Series Progress", "GU": "મોક ટેસ્ટ સિરીઝની પ્રગતિ" },
                "STATUS": 60,
                "DAY": { "EN": "Ongoing", "GU": "ચાલુ" },
                "FOCUS_DETAIL": { "EN": "Progress in the current test series.", "GU": "વર્તમાન ટેસ્ટ શ્રેણીમાં પ્રગતિ." },
                "SUBJECT_TAG": { "EN": "ASSESSMENT", "GU": "મૂલ્યાંકન" }
            }
        ],
        RESULTS: [
            {
                ID: "R001",
                DATE: "2024-07-20",
                SCORE: "147/300",
                MISTAKES: ["FBD/Tension", "Trig Identities", "Redox Balancing"],
                FIXED_MISTAKES: ["Redox Balancing"]
            }
        ],
        EXAMS: [],
        STUDY_SESSIONS: [
            { date: '2024-07-24', duration: 3600, questions_solved: 20, questions_skipped: [] },
            { date: '2024-07-25', duration: 2700, questions_solved: 15, questions_skipped: [] }
        ],
// FIX: Add missing DOUBTS property to align with StudentData interface.
        DOUBTS: []
    },
    {
        CONFIG: {
            SID: "S002",
            fullName: "Priya Patel",
            profilePhoto: generateAvatar("Priya Patel"),
            WAKE: "0600",
            SCORE: "182/300",
            WEAK: ["Definite Integration", "Wave Optics", "Mole Concept"],
            UNACADEMY_SUB: false,
            googleId: '',
            googleDriveFileId: '',
            driveLastSync: '',
            settings: { 
                accentColor: '#7c3aed', 
                blurEnabled: true, 
                mobileLayout: 'standard', 
                forceOfflineMode: false, 
                googleClientId: '59869142203-8qna4rfo93rrv9uiok3bes28pfu5k1l1.apps.googleusercontent.com',
                geminiApiKey: '',
                perQuestionTime: 180
            }
        },
        SCHEDULE_ITEMS: [
            {
                "ID": "A003",
                "DAY": {"EN": "THURSDAY", "GU": "ગુરુવાર"},
                "TIME": "19:00",
                "CARD_TITLE": {"EN": "DEFINITE INTEGRATION PRACTICE", "GU": "નિશ્ચિત સંકલન પ્રેક્ટિસ"},
                "FOCUS_DETAIL": {"EN": "Solve 20 PYQs focusing on properties of definite integrals.", "GU": "નિશ્ચિત સંકલનના ગુણધર્મો પર ધ્યાન કેન્દ્રિત કરીને 20 PYQ ઉકેલો."},
                "SUBJECT_TAG": {"EN": "MATHS", "GU": "ગણિત"},
                "UNACADEMY_QUERY": "JEE Definite Integration PYQs properties Free Lecture",
                "ACTION_COMMAND": "Set a reminder for tonight at 7:00 PM: 'Practice Definite Integration PYQs'.",
                "type": "ACTION",
                "SUB_TYPE": "DEEP_DIVE"
            },
             {
                "ID": "AC02",
                "type": "ACTIVITY",
                "CARD_TITLE": { "EN": "Revision Camp", "GU": "પુનરાવર્તન કેમ્પ" },
                "STATUS": 85,
                "DAY": { "EN": "Ongoing", "GU": "ચાલુ" },
                "FOCUS_DETAIL": { "EN": "Completing revision milestones.", "GU": "પુનરાવર્તન માઇલસ્ટોન્સ પૂર્ણ કરી રહ્યા છીએ." },
                "SUBJECT_TAG": { "EN": "REVISION", "GU": "પુનરાવર્તન" }
            }
        ],
        RESULTS: [
             {
                ID: "R002",
                DATE: "2024-07-20",
                SCORE: "182/300",
                MISTAKES: ["Integration by Parts", "Young's Double Slit"],
                FIXED_MISTAKES: []
            }
        ],
        EXAMS: [],
        STUDY_SESSIONS: [],
// FIX: Add missing DOUBTS property to align with StudentData interface.
        DOUBTS: []
    }
];