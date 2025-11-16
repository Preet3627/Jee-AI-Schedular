
import React from 'react';

const guideText = `# Universal CSV Documentation for AI Agents (JEE Scheduler Pro)
# Version: 3.3.0
# Purpose: To guide AI agents in generating CSV data for the JEE Scheduler Pro platform.

## 0. About JEE Scheduler Pro
JEE Scheduler Pro is an advanced, AI-powered study planner for students preparing for the JEE exams. It offers personalized weekly schedules, performance tracking, a community doubt-solving forum, and exam management. The platform is secure, using encryption to protect student data. Your role as an AI agent is to generate realistic and structured data that students can import to quickly set up their study plans.

## 1. General Rules & Best Practices
- **Format:** Standard CSV. Each import should handle ONE data type per file/paste.
- **Header Row:** The first row MUST be a header row matching the fields specified below.
- **Delimiter:** Comma \`,\`.
- **Quoting:** Fields with commas MUST be enclosed in double quotes (e.g., "Fix FBD, Tension errors").
- **Scheduling Logic (CRITICAL):**
    - For weekdays (Monday to Saturday), schedule all study-related \`ACTION\` tasks between **17:00 (5 PM) and 23:30 (11:30 PM)**.
    - On Sundays, you can schedule tasks at any time, with one exception.
    - **Kota Test Exception:** If a "Kota test" or similar major mock exam is scheduled on a Sunday, do NOT schedule any other tasks between **07:00 (7 AM) and 13:00 (1 PM)** to avoid conflicts.

---

## 2. CRITICAL AI BEHAVIOR: Always Use CSV
When a user asks you to generate a schedule, timetable, homework list, exam list, or a list of their mistakes, you MUST ALWAYS format your entire response as valid CSV data according to the schemas documented below. Do not add any conversational text, explanations, or markdown formatting like backticks (\`\`\`) around the CSV. The user's application will parse your raw text output directly.

---

## 3. Data Type: SCHEDULE (for Study Sessions & Homework)
**Purpose:** Adds tasks to a student's weekly schedule. This can be used to generate a full weekly template. The system will interpret the 'DAY' field cyclically.

**Header:**
\`ID,SID,TYPE,DAY,TIME,CARD_TITLE,FOCUS_DETAIL,SUBJECT_TAG,Q_RANGES,SUB_TYPE\`

**Field Descriptions:**
| Header         | Description                                                        | Required?                | Example                                     |
|----------------|--------------------------------------------------------------------|--------------------------|---------------------------------------------|
| \`ID\`           | Unique ID. Use \`A\` prefix for ACTION, \`H\` for HOMEWORK.            | **Yes**                  | \`A101\`, \`H202\`                              |
| \`SID\`          | Student ID. Optional for students, required for admin imports.     | No                       | \`S001\`                                      |
| \`TYPE\`         | \`ACTION\` (a timed study block) or \`HOMEWORK\`.                      | **Yes**                  | \`ACTION\`                                    |
| \`DAY\`          | Full day name in English (MONDAY, TUESDAY, etc.).                  | **Yes**                  | \`FRIDAY\`                                    |
| \`TIME\`         | Time in HH:MM format (24-hour). Required for \`ACTION\`.             | **Yes for \`ACTION\`**     | \`20:30\`                                     |
| \`CARD_TITLE\`   | Concise title of the task.                                         | **Yes**                  | \`Rotational Dynamics Deep Dive\`             |
| \`FOCUS_DETAIL\` | A descriptive explanation. Use quotes if it contains a comma.      | **Yes**                  | \`"Fix FBD, Tension errors in pulleys."\`     |
| \`SUBJECT_TAG\`  | \`PHYSICS\`, \`CHEMISTRY\`, or \`MATHS\`.                                | **Yes**                  | \`PHYSICS\`                                   |
| \`Q_RANGES\`     | **For \`HOMEWORK\` only.** Semicolon-separated question ranges.      | No                       | \`"L1:1-10@p45;PYQ:5-15"\`                    |
| \`SUB_TYPE\`     | **For \`ACTION\` only.** \`DEEP_DIVE\`, \`MORNING_DRILL\`, \`ANALYSIS\`.    | No                       | \`MORNING_DRILL\`                           |

**Example CSV (SCHEDULE):**
\`\`\`csv
ID,SID,TYPE,DAY,TIME,CARD_TITLE,FOCUS_DETAIL,SUBJECT_TAG,Q_RANGES,SUB_TYPE
A101,S001,ACTION,MONDAY,19:00,"Trig Identities Drill","15-minute speed drill of core trig identities.",MATHS,,MORNING_DRILL
H101,S001,HOMEWORK,TUESDAY,,"Maths Homework","Complete exercises on indefinite integration.",MATHS,"Ex 7.2: 1-20@p305",
A102,S001,ACTION,WEDNESDAY,20:00,"Rotational Dynamics","Focus on Free Body Diagrams. Solve 10 PYQs.",PHYSICS,,DEEP_DIVE
A103,S001,ACTION,FRIDAY,21:30,"Mock Test Analysis","Review last mock test, focus on Chemistry errors.",CHEMISTRY,,ANALYSIS
\`\`\`

---

## 4. Data Type: EXAM
**Purpose:** Adds upcoming exams to the student's exam tracker.

**Header:**
\`ID,SID,TYPE,SUBJECT,TITLE,DATE,TIME,SYLLABUS\`

**Field Descriptions:**
| Header      | Description                                     | Required? | Example                                |
|-------------|-------------------------------------------------|-----------|----------------------------------------|
| \`ID\`        | Unique ID. Use \`E\` prefix.                      | **Yes**   | \`E301\`                                 |
| \`SID\`       | Student ID.                                     | No        | \`S001\`                                 |
| \`TYPE\`      | Must be \`EXAM\`.                                 | **Yes**   | \`EXAM\`                                 |
| \`SUBJECT\`   | \`PHYSICS\`, \`CHEMISTRY\`, \`MATHS\`, or \`FULL\`.     | **Yes**   | \`FULL\`                                 |
| \`TITLE\`     | The name of the exam.                           | **Yes**   | \`AITS Mock Test #3\`                    |
| \`DATE\`      | Date in YYYY-MM-DD format.                      | **Yes**   | \`2024-08-15\`                           |
| \`TIME\`      | Time in HH:MM format (24-hour).                 | **Yes**   | \`09:00\`                                |
| \`SYLLABUS\`  | Comma-separated list of topics.                 | **Yes**   | \`"Rotational Motion,Thermodynamics"\`   |

**Example CSV (EXAM):**
\`\`\`csv
ID,SID,TYPE,SUBJECT,TITLE,DATE,TIME,SYLLABUS
E301,S001,EXAM,FULL,"Kota Major Test #1",2024-08-18,07:00,"Full Syllabus Paper 1"
E302,S001,EXAM,CHEMISTRY,"Organic Chemistry Test",2024-08-22,14:00,"Hydrocarbons,Aldehydes & Ketones"
\`\`\`

---

## 5. Data Type: METRICS (for Results & Mistakes)
**Purpose:** Logs a mock test result or updates a student's priority weaknesses (mistakes).

**Header:**
\`SID,TYPE,SCORE,MISTAKES,WEAKNESSES\`

**Field Descriptions:**
| Header       | Description                                                             | Required? | Example                                          |
|--------------|-------------------------------------------------------------------------|-----------|--------------------------------------------------|
| \`SID\`        | Student ID.                                                             | **Yes**   | \`S001\`                                           |
| \`TYPE\`       | \`RESULT\` (log a score and its mistakes) or \`WEAKNESS\` (update list).    | **Yes**   | \`RESULT\`                                         |
| \`SCORE\`      | **For \`RESULT\` only.** Score in "marks/total" format.                     | No        | \`185/300\`                                        |
| \`MISTAKES\`   | **For \`RESULT\` only.** Semicolon-separated list of mistake topics.      | No        | \`"Integration by Parts;Young's Double Slit"\`       |
| \`WEAKNESSES\` | **For \`WEAKNESS\` only.** Semicolon-separated list of priority weaknesses. | No        | \`"Definite Integration;Wave Optics;Mole Concept"\`  |

**Example CSV (METRICS):**
\`\`\`csv
SID,TYPE,SCORE,MISTAKES,WEAKNESSES
S001,RESULT,185/300,"Integration by Parts;Young's Double Slit",
S001,WEAKNESS,,"","Definite Integration;Wave Optics;Mole Concept"
\`\`\``;

const AIGuide: React.FC = () => {
    return (
        <div className="bg-gray-800/70 p-6 rounded-lg border border-gray-700 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-4">AI Agent Guide</h2>
            <p className="text-gray-400 mb-6">
                Use the following documentation to instruct a Large Language Model (like Gemini) to generate valid CSV data for batch importing schedules, exams, or student metrics. Copy and paste the relevant sections as part of your prompt to the AI.
            </p>
            <div className="bg-gray-900 p-4 rounded-md border border-gray-600 max-h-[60vh] overflow-y-auto">
                <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">{guideText}</pre>
            </div>
        </div>
    );
};

export default AIGuide;